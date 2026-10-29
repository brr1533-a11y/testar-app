const { test } = require('node:test');
const assert = require('node:assert/strict');
const A = require('../adm-access.js');
const { startServer } = require('./support/server.cjs');

test('padrão do ADM igual ao de antes; página tirada trava o que ela grava', () => {
  assert.equal(A.can({}, 'estoque'), true); assert.equal(A.can({}, 'financeiro'), false); assert.equal(A.can({}, 'gestao'), true);
  assert.equal(A.can({}, 'perfil'), true); assert.equal(A.financeVisible({}), false);
  assert.deepEqual([...A.lockedParts({}).farm], ['talhoes']);
  const st = { admAccess: { pages: ['dashboard', 'financeiro', 'contratos', 'usuarios'] } };
  assert.deepEqual(A.pagesFor(st), ['dashboard', 'financeiro', 'contratos']); // "usuarios" nunca é do ADM
  assert.equal(A.financeVisible(st), true); assert.deepEqual(A.mgmtKeys(st), ['salesContracts']);
  const lock = A.lockedParts(st);
  assert.ok(lock.farm.has('stock') && lock.farm.has('cattle') && lock.ops.has('tasks') && lock.mgmt.has('quotes'));
  assert.equal(A.can(st, 'gestao'), true); assert.equal(A.can({ admAccess: { pages: ['estoque'] } }, 'gestao'), false);
});

test('API: CEO libera e tira páginas do ADM; o servidor segue a escolha ao enviar e ao gravar', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const api = async (path, token, body, method) => { const r = await fetch(s.url + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); let json = null; try { json = await r.json(); } catch {} return { status: r.status, json }; };
  const put = async (token, mutate) => { const st = await api('/api/state', token); mutate(st.json.state); return api('/api/state', token, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
  const ceo = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  assert.equal((await put(ceo, st => { const f = st.farms[0]; f.stock = [{ id: 'st1', activity: 'coffee', item: 'Adubo', unit: 'saco', quantity: 10, min: 2 }]; f.finances = [{ id: 'fin1', activity: 'coffee', type: 'entrada', category: 'Venda', description: 'Venda', date: '2026-01-02', value: 5000 }]; })).status, 200);
  assert.equal((await api('/api/users', ceo, { username: 'testadm', name: 'ADM', email: 'adm@example.invalid', password: s.password, role: 'adm' })).status, 200);
  const t1 = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testadm', password: s.password })).json.token;
  await api('/api/auth/change-password', t1, { currentPassword: s.password, newPassword: s.password + 'x1' });
  const adm = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testadm', password: s.password + 'x1' })).json.token;

  // Padrão: ADM mexe no estoque, não vê o balanço.
  assert.equal((await api('/api/state', adm)).json.state.farms[0].finances.length, 0);
  assert.equal((await put(adm, st => { st.farms[0].stock[0].quantity = 9; })).status, 200);

  // CEO libera o Balanço e tira o Estoque; "usuarios" é descartado.
  assert.equal((await put(ceo, st => { st.admAccess = { pages: ['dashboard', 'financeiro', 'usuarios'] }; })).status, 200);
  const saved = (await api('/api/state', ceo)).json.state.admAccess;
  assert.deepEqual(saved.pages, ['dashboard', 'financeiro']); assert.ok(saved.updatedAt);
  const seen = (await api('/api/state', adm)).json.state;
  assert.equal(seen.farms[0].finances[0].value, 5000);
  assert.equal((await put(adm, st => { st.farms[0].stock[0].quantity = 1; st.admAccess = { pages: A.IDS }; })).status, 200);
  const after = (await api('/api/state', ceo)).json.state;
  assert.equal(after.farms[0].stock[0].quantity, 9); // estoque tirado: mudança do ADM descartada
  assert.deepEqual(after.admAccess.pages, ['dashboard', 'financeiro']); // ADM não muda as próprias permissões

  // Tirando o Balanço de novo, os valores somem para o ADM.
  assert.equal((await put(ceo, st => { st.admAccess = { pages: A.DEFAULTS }; })).status, 200);
  assert.equal((await api('/api/state', adm)).json.state.farms[0].finances.length, 0);
});
