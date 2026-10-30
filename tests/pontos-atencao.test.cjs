const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../maodeobra-domain.js');
const { startServer } = require('./support/server.cjs');

const iso = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const week = H.weekStart(iso(14)), day = (n = 0) => { const d = new Date(week + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const farm = () => ({ id: 'f', talhoes: [{ id: 't1', name: 'T1' }], management: { payables: [] },
  labor: { workers: [{ id: 'ana', name: 'Ana', role: 'panhador', dailyRate: 90, active: true }], plotRates: [{ id: 'r1', plotId: 't1', ratePerBag: 10, validFrom: '2020-01-01' }], entries: [], adjustments: [], closings: [] } });
const ceo = { role: 'ceo', name: 'CEO', labor: 'manager' }, fiscal = { role: 'contribuinte', name: 'Fiscal', labor: 'fiscal' };
const run = (b, mutate, user = ceo) => { const a = structuredClone(b); mutate(a.farms[0]); H.prepare(b, a, user); return a; };
const closeWeek = (s, w, id) => run(s, f => f.labor.closings.push({ id, weekStart: w, weekEnd: H.weekEnd(w), lines: [] }));

test('apontamento atrasado: semana paga não reabre; o escritório aprova e ele entra no próximo pagamento como acerto', () => {
  let s = run({ farms: [farm()] }, f => f.labor.entries.push({ id: 'a', date: day(1), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 4 }));
  s = closeWeek(s, week, 'c1');
  const paid = structuredClone(s.farms[0].labor.closings[0]);
  // O fiscal estava sem internet: envia 3 sacos daquela semana depois do fechamento.
  s = run(s, f => f.labor.entries.push({ id: 'b', date: day(2), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 3 }), fiscal);
  const b = s.farms[0].labor.entries.find(e => e.id === 'b');
  assert.equal(b.lateStatus, 'pending'); assert.equal(b.rate, 10); // valor do dia da colheita
  assert.deepEqual(s.farms[0].labor.closings[0], paid); // a semana paga não muda
  const settle = b.late.settleWeek;
  // Enquanto não for revisado, não entra no pagamento e trava o fechamento da semana de acerto.
  assert.equal(H.computeClosing(s.farms[0].labor, settle).lines.length, 0);
  assert.throws(() => closeWeek(s, settle, 'c2'), /atrasados/);
  // Fiscal não aprova.
  assert.throws(() => run(s, f => { f.labor.entries.find(e => e.id === 'b').lateStatus = 'approved'; }, fiscal), /escritório/);
  s = run(s, f => { f.labor.entries.find(e => e.id === 'b').lateStatus = 'approved'; });
  const prev = H.computeClosing(s.farms[0].labor, settle);
  assert.equal(prev.lines[0].bags, 3); assert.equal(prev.lines[0].bagsValue, 30); assert.equal(prev.lines[0].lateBags, 3);
  s = closeWeek(s, settle, 'c2');
  assert.equal(s.farms[0].management.payables.find(p => p.laborClosingId === 'c2').amount, 30);
});

test('apontamento atrasado recusado vira estorno com motivo e não entra em pagamento nenhum', () => {
  let s = closeWeek(run({ farms: [farm()] }, f => f.labor.entries.push({ id: 'a', date: day(1), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 4 })), week, 'c1');
  s = run(s, f => f.labor.entries.push({ id: 'b', date: day(2), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 3 }), fiscal);
  s = run(s, f => { f.labor.entries.find(e => e.id === 'b').lateStatus = 'rejected'; });
  const b = s.farms[0].labor.entries.find(e => e.id === 'b');
  assert.equal(b.voided, true); assert.match(b.voidReason, /atrasado/); assert.equal(b.lateReviewedBy, 'CEO');
  assert.equal(H.lateOpen(s.farms[0].labor).length, 0);
  assert.equal(H.computeClosing(s.farms[0].labor, b.late.settleWeek).lines.length, 0);
});

test('o aparelho não consegue marcar sozinho um apontamento como atrasado aprovado', () => {
  const s = run({ farms: [farm()] }, f => f.labor.entries.push({ id: 'x', date: day(1), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 2, late: { closedWeek: '2020-01-06', settleWeek: '2020-01-13' }, lateStatus: 'approved' }), fiscal);
  const x = s.farms[0].labor.entries[0];
  assert.equal(x.late, undefined); assert.equal(x.lateStatus, undefined);
});

test('aparelho do modo de campo: registro, desconexão pelo CEO encerra as sessões e o aparelho fica sabendo', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  const st = (await call('/api/state', ceo)).json, groupId = st.group?.id || (await call('/api/account', ceo)).json?.group?.id, fid = st.state.farms[0].id;
  await call('/api/users', ceo, { username: 'fiscal9', name: 'Fiscal Nove', email: 'f9@example.invalid', password: s.password, role: 'contribuinte', function: 'Fiscal de colheita', allowedFarmId: fid, allowedActivity: 'coffee' });
  let tk = (await call('/api/auth/login', '', { groupCode: '1001', username: 'fiscal9', password: s.password })).json.token;
  await call('/api/auth/change-password', tk, { currentPassword: s.password, newPassword: 'Colheita#Boa82x' });
  tk = (await call('/api/auth/login', '', { groupCode: '1001', username: 'fiscal9', password: 'Colheita#Boa82x' })).json.token;
  const dev = 'a'.repeat(32);
  assert.equal((await call('/api/field-devices', tk, { id: 'curto', label: 'x' })).status, 400);
  assert.equal((await call('/api/field-devices', tk, { id: dev, label: 'Android' })).status, 200);
  assert.equal((await call('/api/field-devices', tk, null)).status, 403); // só CEO/ADM vê a lista
  const list = (await call('/api/field-devices', ceo)).json.devices;
  assert.equal(list.length, 1); assert.equal(list[0].userName, 'Fiscal Nove');
  assert.ok(groupId, 'grupo do estado'); assert.equal((await call('/api/field-devices/status', '', { id: dev, groupId })).json.revoked, false);
  assert.equal((await call('/api/field-devices/' + dev + '/revoke', tk, {})).status, 403);
  assert.equal((await call('/api/field-devices/' + dev + '/revoke', ceo, {})).status, 200);
  assert.equal((await call('/api/field-devices/status', '', { id: dev, groupId })).json.revoked, true);
  assert.equal((await call('/api/state', tk)).status, 401); // sessão da pessoa encerrada
  const tk2 = (await call('/api/auth/login', '', { groupCode: '1001', username: 'fiscal9', password: 'Colheita#Boa82x' })).json.token;
  assert.equal((await call('/api/field-devices', tk2, { id: dev, label: 'Android' })).json.revoked, true); // o aparelho desconectado não volta
  assert.ok((await call('/api/state', ceo)).json.state.audit.some(a => a.action === 'desconectou'));
});

test('tratorista conclui o banho com a quantidade real por talhão: o estoque baixa o real e o talhão fora da ordem é ignorado', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const put = async (tk, mut) => { const st = await call('/api/state', tk); mut(st.json.state); return call('/api/state', tk, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
  const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  const fid = (await call('/api/state', ceo)).json.state.farms[0].id;
  let r = await put(ceo, st => { const f = st.farms[0]; f.talhoes = [{ id: 't1', name: 'T1' }, { id: 't2', name: 'T2' }];
    f.stock = [{ id: 'st', activity: 'coffee', item: 'Inseticida X', category: 'Defensivo', unit: 'L', quantity: 10, min: 0, unitCost: 100 }];
    f.banho = { products: [{ id: 'p', name: 'Inseticida X', unit: 'L', active: true }], orders: [{ id: 'o1', title: 'Banho', status: 'released', talhaoIds: ['t1', 't2'], talhaoNames: ['T1', 'T2'], products: [{ productId: 'p', name: 'Inseticida X', unit: 'L', quantity: 3 }], createdAt: new Date().toISOString() }] }; });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  await call('/api/users', ceo, { username: 'trat1', name: 'Trator', email: 't1@example.invalid', password: s.password, role: 'contribuinte', function: 'Tratorista', allowedFarmId: fid, allowedActivity: 'coffee' });
  let tk = (await call('/api/auth/login', '', { groupCode: '1001', username: 'trat1', password: s.password })).json.token;
  await call('/api/auth/change-password', tk, { currentPassword: s.password, newPassword: 'Trator#Verde58' });
  tk = (await call('/api/auth/login', '', { groupCode: '1001', username: 'trat1', password: 'Trator#Verde58' })).json.token;
  r = await put(tk, st => { const o = st.farms[0].banho.orders[0]; Object.assign(o, { status: 'completed', completedAt: new Date().toISOString(), completedBy: 'trat1', usage: [{ plotId: 't1', productId: 'p', quantity: 0.5 }, { plotId: 't2', productId: 'p', quantity: 2 }, { plotId: 'outro', productId: 'p', quantity: 50 }] }); });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const f = (await call('/api/state', ceo)).json.state.farms[0];
  assert.equal(f.banho.orders[0].status, 'completed');
  assert.deepEqual(f.banho.orders[0].usage.map(u => u.plotId), ['t1', 't2']);
  assert.equal(f.stock[0].quantity, 7.5);
});

test('senhas comuns recusadas mesmo dentro da regra; senha forte passa', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const api = async (p, token, body) => { const r = await fetch(s.url + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json() }; };
  const token = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  for (const weak of ['Fazenda@123', 'Senha@2026', 'Café#1234', 'Admin@1111']) {
    const r = await api('/api/auth/change-password', token, { currentPassword: s.password, newPassword: weak });
    assert.equal(r.status, 400, weak); assert.match(r.json.error, /comum/, weak);
  }
  assert.equal((await api('/api/auth/change-password', token, { currentPassword: s.password, newPassword: 'Fazenda@8391' })).status, 200);
});

test('Super Admin com senha fora da regra só entra para trocar; depois a senha nova vale e a antiga não', async t => {
  const old = 'admin-antigo-2024';
  const s = await startServer({ PLATFORM_ADMIN_PASSWORD: old }); t.after(() => s.stop());
  const call = async (p, token, body, method = 'POST') => { const r = await fetch(s.url + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const login = await call('/api/platform/auth/login', '', { email: 'admin@example.invalid', password: old });
  assert.equal(login.status, 200); assert.equal(login.json.mustChangePassword, true);
  assert.equal((await call('/api/platform/groups', login.json.token, null, 'GET')).status, 428);
  assert.equal((await call('/api/platform/auth/change-password', login.json.token, { currentPassword: old, newPassword: 'Fazenda@123' })).status, 400);
  assert.equal((await call('/api/platform/auth/change-password', login.json.token, { currentPassword: old, newPassword: 'Painel#Seguro82' })).status, 200);
  assert.equal((await call('/api/platform/groups', login.json.token, null, 'GET')).status, 200);
  assert.equal((await call('/api/platform/auth/login', '', { email: 'admin@example.invalid', password: old })).status, 401);
  const again = await call('/api/platform/auth/login', '', { email: 'admin@example.invalid', password: 'Painel#Seguro82' });
  assert.equal(again.status, 200); assert.equal(again.json.mustChangePassword, false);
});
