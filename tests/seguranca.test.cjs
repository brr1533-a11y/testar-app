const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { startServer } = require('./support/server.cjs');

const client = s => {
  const api = async (path, token, body, method, headers = {}) => { const r = await fetch(s.url + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) }); let json = null; try { json = await r.json(); } catch {} return { status: r.status, json }; };
  const put = async (token, mutate) => { const st = await api('/api/state', token); mutate(st.json.state); return api('/api/state', token, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
  return { api, put };
};

test('senhas: sequência vazada recusada; um estranho não bloqueia o CEO de outra rede', async t => {
  const s = await startServer(); t.after(() => s.stop()); const { api } = client(s);
  const ip = n => ({ 'X-Forwarded-For': '203.0.113.' + n });
  const ceo = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password }, null, ip(1))).json.token;
  const weak = await api('/api/auth/change-password', ceo, { currentPassword: s.password, newPassword: '05091722@@Qualquer' }, null, ip(1));
  assert.equal(weak.status, 400);
  for (let i = 0; i < 9; i++) await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: 'errada' + i }, null, ip(66));
  assert.equal((await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password }, null, ip(66))).status, 429);
  assert.equal((await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password }, null, ip(2))).status, 200);
});

test('gravações ao mesmo tempo não se apagam e gravação sem versão é recusada', async t => {
  const s = await startServer(); t.after(() => s.stop()); const { api } = client(s);
  const ceo = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  const jobs = [];
  for (let i = 1; i <= 6; i++) jobs.push(api('/api/auth/register-request', '', { groupCode: '1001', name: 'F' + i, username: 'func' + i, email: `f${i}@example.invalid`, password: s.password, function: 'Campo' }, null, { 'X-Forwarded-For': '198.51.100.' + i }));
  for (let i = 1; i <= 4; i++) jobs.push(api('/api/users', ceo, { name: 'U' + i, username: 'user' + i, email: `u${i}@example.invalid`, password: s.password, role: 'contribuinte', function: 'Campo' }));
  await Promise.all(jobs);
  const st = (await api('/api/state', ceo)).json.state;
  assert.equal(st.pendingRegistrations.filter(r => /^func/.test(r.username)).length, 6);
  assert.equal(st.users.filter(u => /^user\d$/.test(u.username)).length, 4);
  assert.equal((await api('/api/state', ceo, { state: st }, 'PUT')).status, 400);
});

test('webhook do Mercado Pago só com assinatura válida', async t => {
  const secret = crypto.randomBytes(16).toString('hex');
  const s = await startServer({ MERCADOPAGO_WEBHOOK_SECRET: secret }); t.after(() => s.stop());
  const id = '2c938084abc', reqId = 'req-1', ts = String(Date.now());
  const sig = v1 => ({ 'Content-Type': 'application/json', 'x-request-id': reqId, 'x-signature': `ts=${ts},v1=${v1}` });
  const url = `${s.url}/api/webhooks/mercadopago?data.id=${id}&type=subscription_preapproval`;
  assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  assert.equal((await fetch(url, { method: 'POST', headers: sig('0'.repeat(64)), body: '{}' })).status, 401);
  const good = crypto.createHmac('sha256', secret).update(`id:${id};request-id:${reqId};ts:${ts};`).digest('hex');
  assert.equal((await fetch(url, { method: 'POST', headers: sig(good), body: '{}' })).status, 200);
  assert.equal((await fetch(`${s.url}/api/public/purchases/abc/status`)).status, 404);
});

test('ADM não vê preço de venda nem custo da produção, e não reescreve vendas gravadas', async t => {
  const s = await startServer(); t.after(() => s.stop()); const { api, put } = client(s);
  const ceo = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  assert.equal((await put(ceo, st => { st.farms[0].agriculture = { cycles: [{ id: 'c1', activity: 'grains', crop: 'Soja', name: 'Soja', areaHa: 10, bagKg: 60, plannedCost: 5000, stage: 'Em colheita', startDate: '2020-01-01' }], harvests: [{ id: 'h1', cycleId: 'c1', date: '2020-02-01', netKg: 1000 }], sales: [{ id: 's1', cycleId: 'c1', date: '2020-02-02', kg: 100, pricePerKg: 2.5, buyer: 'X' }] }; })).status, 200);
  assert.equal((await api('/api/users', ceo, { username: 'testadm', name: 'ADM', email: 'adm@example.invalid', password: s.password, role: 'adm' })).status, 200);
  const t1 = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testadm', password: s.password })).json.token;
  await api('/api/auth/change-password', t1, { currentPassword: s.password, newPassword: s.password + 'x1' });
  const adm = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testadm', password: s.password + 'x1' })).json.token;
  const seen = (await api('/api/state', adm)).json.state.farms[0].agriculture;
  assert.equal('pricePerKg' in seen.sales[0], false); assert.equal('plannedCost' in seen.cycles[0], false);
  assert.equal((await put(adm, st => { const a = st.farms[0].agriculture; a.sales[0].kg = 999; a.cycles[0].plannedCost = 1; a.cycles[0].stage = 'Encerrada'; })).status, 200);
  const kept = (await api('/api/state', ceo)).json.state.farms[0].agriculture;
  assert.equal(kept.sales[0].kg, 100); assert.equal(kept.sales[0].pricePerKg, 2.5); assert.equal(kept.cycles[0].plannedCost, 5000); assert.equal(kept.cycles[0].stage, 'Encerrada');
});
