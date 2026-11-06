// 4.23 · Banho concluído baixa o estoque pelos lotes do mesmo produto: primeiro os com saldo, o que vence antes primeiro.
// Antes pegava o primeiro item do nome (um lote vencido e vazio ficava negativo e o lote bom seguia cheio).
const test = require('node:test'), assert = require('node:assert/strict'), { startServer } = require('./support/server.cjs');

test('banho de 10 L com lote A vazio (vencido) e lote B com 20 L: sai do B; falta fica anotada', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const put = async (tk, mut) => { const st = await call('/api/state', tk); mut(st.json.state); return call('/api/state', tk, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
  const tk = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  const ordem = (id, qty) => ({ id, title: 'Banho ' + id, status: 'completed', completedAt: new Date().toISOString(), talhaoIds: ['t'], talhaoNames: ['T'], products: [{ productId: 'p', name: 'Óleo-mineral', unit: 'L', quantity: qty }], createdAt: new Date().toISOString() });
  let r = await put(tk, st => { const f = st.farms[0]; f.talhoes = [{ id: 't', name: 'T' }];
    f.stock = [{ id: 'A', activity: 'coffee', item: 'Óleo mineral', category: 'Defensivo', unit: 'L', quantity: 0, min: 0, unitCost: 90, expires: '2026-01-01', batch: 'A1' },
               { id: 'B', activity: 'coffee', item: 'Oleo mineral', category: 'Defensivo', unit: 'L', quantity: 20, min: 0, unitCost: 100, expires: '2027-06-01', batch: 'B2' }];
    f.banho = { products: [{ id: 'p', name: 'Óleo-mineral', unit: 'L', active: true }], orders: [ordem('o1', 10)] }; });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  let f = (await call('/api/state', tk)).json.state.farms[0], q = id => f.stock.find(x => x.id === id).quantity;
  assert.equal(q('A'), 0, 'lote vazio não fica negativo'); assert.equal(q('B'), 10, 'sai do lote com saldo');
  // Segundo banho de 15 L: só há 10 no B; os 5 que faltam ficam negativos no primeiro lote e anotados.
  r = await put(tk, st => { st.farms[0].banho.orders.push(ordem('o2', 15)); });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  f = (await call('/api/state', tk)).json.state.farms[0];
  assert.equal(q('A') + q('B'), -5, 'total do produto: 20 - 10 - 15');
  assert.match(f.banho.orders.find(o => o.id === 'o2').stockDeductedItems.join(' '), /faltou 5 L/);
});
