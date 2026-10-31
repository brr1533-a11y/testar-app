const { test } = require('node:test');
const assert = require('node:assert/strict');
const X = require('../expansao-domain');
const H = require('../maodeobra-domain');
const { startServer } = require('./support/server.cjs');

const iso = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10), week = H.weekStart(iso(14)), date = H.weekEnd(week);
const ceo = { id: 'ceo', role: 'ceo', username: 'ceo', name: 'CEO', labor: 'manager' };
function farm() { return { id: 'f', name: 'Fazenda de teste', talhoes: [{ id: 't', name: 'Talhão', areaHa: 1 }, { id: 't2', name: 'Talhão 2', areaHa: 1 }], stock: [], finances: [], management: { payables: [] }, operations: { expenses: [], stockUses: [] }, agriculture: { cycles: [{ id: 'c', activity: 'coffee', name: 'Café', crop: 'Café arábica', plotIds: ['t', 't2'], startDate: '2020-01-01', stage: 'Em colheita', plannedCost: 0, areaHa: 2, bagKg: 60 }], harvests: [{ id: 'h', cycleId: 'c', date, netKg: 60 }], sales: [] }, labor: { workers: [{ id: 'w', name: 'Pessoa', role: 'panhador', active: true }], plotRates: [{ id: 'r', plotId: 't', ratePerBag: 10, validFrom: '2020-01-01' }, { id: 'r2', plotId: 't2', ratePerBag: 10, validFrom: '2020-01-01' }], entries: [], adjustments: [], closings: [] } }; }
const run = (state, mutate, user = ceo) => { const next = structuredClone(state); mutate(next.farms[0]); H.prepare(state, next, user); return next; };

// ---------- 1. Vale aparece no Financeiro sozinho e não conta duas vezes ----------
test('vale lançado na Mão de obra vira saída no Financeiro, uma vez só, e o custo da colheita continua o trabalho bruto', () => {
  let s = run({ users: [ceo], farms: [farm()] }, f => { f.labor.entries.push({ id: 'e', date, plotId: 't', workerId: 'w', kind: 'saco', bags: 20 }); f.labor.adjustments.push({ id: 'vale', date, workerId: 'w', kind: 'adiantamento', amount: 100, reason: 'mercado' }, { id: 'desc', date, workerId: 'w', kind: 'desconto', amount: 15, reason: 'ferramenta' }); });
  const fin = s.farms[0].finances;
  assert.equal(fin.length, 1, 'desconto não é dinheiro: não vai para o Financeiro');
  assert.deepEqual({ type: fin[0].type, value: fin[0].value, category: fin[0].category, source: fin[0].sourceLaborAdjustmentId, date: fin[0].date }, { type: 'saida', value: 100, category: 'Vale da colheita', source: 'vale', date });
  s = run(s, f => { f.labor.entries[0].bags = 20; }); // nova gravação não duplica
  assert.equal(s.farms[0].finances.length, 1);
  s = run(s, f => f.labor.closings.push({ id: 'k', weekStart: week }));
  // Trabalho R$ 200, vale R$ 100, desconto R$ 15: custo R$ 200; conta a pagar R$ 85; saída do vale no caixa R$ 100.
  assert.equal(X.unitCosts(s.farms[0], 'coffee')[0].cost, 200);
  assert.equal(s.farms[0].management.payables[0].amount, 85);
  assert.ok(!X.costSources(s.farms[0]).some(r => r.key === 'finance:laborvale_vale'));
});

test('vale estornado devolve o dinheiro no Financeiro (entrada) e nada disso vira custo', () => {
  let s = run({ users: [ceo], farms: [farm()] }, f => f.labor.adjustments.push({ id: 'vale', date: iso(1), workerId: 'w', kind: 'adiantamento', amount: 50, reason: 'vale' }));
  s = run(s, f => { const a = f.labor.adjustments[0]; a.voided = true; a.voidReason = 'lançado errado'; });
  assert.deepEqual(s.farms[0].finances.map(x => [x.type, x.value, x.sourceLaborAdjustmentId]), [['saida', 50, 'vale'], ['entrada', 50, 'vale']]);
  assert.equal(X.costSources(s.farms[0]).filter(r => r.key.startsWith('finance:')).length, 0);
});

test('API: vale lançado pelo CEO aparece no Financeiro, criado pelo servidor', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const put = async (tk, mut) => { const st = await call('/api/state', tk); mut(st.json.state); return call('/api/state', tk, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
  const tk = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  let r = await put(tk, st => { const f = st.farms[0]; f.talhoes = farm().talhoes; f.labor = farm().labor; });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  r = await put(tk, st => st.farms[0].labor.adjustments.push({ id: 'vale1', date: iso(1), workerId: 'w', kind: 'adiantamento', amount: 120, reason: 'mercado' }));
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const fin = (await call('/api/state', tk)).json.state.farms[0].finances.filter(x => x.sourceLaborAdjustmentId === 'vale1');
  assert.deepEqual(fin.map(x => [x.type, x.value, x.category]), [['saida', 120, 'Vale da colheita']]);
});

// ---------- 2. Banho antigo: preço da época ----------
function legacyBath() {
  const f = farm();
  f.stock = [{ id: 'stock', activity: 'coffee', item: 'Produto', unit: 'L', unitCost: 150, quantity: 10 }];
  f.banho = { orders: [{ id: 'o', title: 'Banho antigo', status: 'completed', completedAt: iso(30) + 'T12:00:00Z', stockDeducted: true, stockDeductedItems: ['Produto 2 L'], talhaoIds: ['t'], products: [{ productId: 'p', name: 'Produto', quantity: 2, unit: 'L' }] }] };
  f.banho.orders[0].stockCostSnapshot = X.bathCostSnapshot(f, f.banho.orders[0], { estimated: true }); // estimado pelo preço de hoje (R$ 150)
  return f;
}
test('banho antigo estimado: informar o preço da época troca o valor, tira a marca de estimado e o estoque atual não muda', () => {
  const f = legacyBath(), o = f.banho.orders[0];
  assert.equal(o.stockCostSnapshot.total, 300); assert.equal(o.stockCostSnapshot.estimated, true);
  o.stockCostSnapshot = X.informBathPrice(f, o, [{ productIndex: 0, unitCost: 90 }], 'CEO', '2026-10-30T12:00:00.000Z');
  assert.deepEqual({ total: o.stockCostSnapshot.total, estimated: o.stockCostSnapshot.estimated, by: o.stockCostSnapshot.priceInformedBy, before: o.stockCostSnapshot.previousEstimate }, { total: 180, estimated: false, by: 'CEO', before: 300 });
  assert.equal(f.stock[0].unitCost, 150);
  assert.equal(X.unitCosts(f, 'coffee')[0].cost, 180);
  assert.throws(() => X.informBathPrice(f, o, [{ productIndex: 0, unitCost: 10 }], 'CEO'), /já tem o preço/); // só uma vez, e só em estimado
  const g = legacyBath();
  assert.throws(() => X.informBathPrice(g, g.banho.orders[0], [{ productIndex: 0, unitCost: -5 }], 'CEO'), /Confira os preços/);
});

test('API: preço da época só para quem vê dinheiro; banho com preço da baixa não pode ser alterado', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const put = async (tk, mut) => { const st = await call('/api/state', tk); mut(st.json.state); return call('/api/state', tk, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
  const tk = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  const fid = (await call('/api/state', tk)).json.state.farms[0].id;
  // Banho novo concluído agora: o servidor grava o preço da baixa (não estimado).
  let r = await put(tk, st => { const f = st.farms[0]; f.talhoes = [{ id: 't', name: 'T' }]; f.stock = [{ id: 'stock', activity: 'coffee', item: 'Produto', category: 'Defensivo', unit: 'L', quantity: 10, min: 0, unitCost: 100 }]; f.banho = { products: [{ id: 'p', name: 'Produto', unit: 'L', active: true }], orders: [{ id: 'o', title: 'Banho', status: 'completed', completedAt: new Date().toISOString(), talhaoIds: ['t'], talhaoNames: ['T'], products: [{ productId: 'p', name: 'Produto', unit: 'L', quantity: 2 }], createdAt: new Date().toISOString() }] }; });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const snap = (await call('/api/state', tk)).json.state.farms[0].banho.orders[0].stockCostSnapshot;
  assert.equal(snap.total, 200); assert.equal(snap.estimated, false);
  r = await call('/api/banho/preco-epoca', tk, { farmId: fid, orderId: 'o', prices: [{ productIndex: 0, unitCost: 1 }] });
  assert.equal(r.status, 409);
  // Quem não vê dinheiro não usa a rota.
  await call('/api/users', tk, { username: 'trat', name: 'Trat', email: 'trat@example.invalid', password: s.password, role: 'contribuinte', function: 'Tratorista', allowedFarmId: fid, allowedActivity: 'coffee' });
  let ct = (await call('/api/auth/login', '', { groupCode: '1001', username: 'trat', password: s.password })).json.token;
  await call('/api/auth/change-password', ct, { currentPassword: s.password, newPassword: 'Trator#Verde58' });
  ct = (await call('/api/auth/login', '', { groupCode: '1001', username: 'trat', password: 'Trator#Verde58' })).json.token;
  assert.equal((await call('/api/banho/preco-epoca', ct, { farmId: fid, orderId: 'o', prices: [] })).status, 403);
});

// ---------- 3. Autoria antiga: o escritório define quem lançou ----------
const joaoA = { id: 'f1', username: 'joao.a', name: 'João', role: 'contribuinte' }, joaoB = { id: 'f2', username: 'joao.b', name: 'João', role: 'contribuinte' };
function legacy() { const f = farm(); f.labor.entries.push({ id: 'old1', date, plotId: 't', workerId: 'w', kind: 'saco', bags: 3, recordedBy: 'João', rate: 10 }, { id: 'old2', date, plotId: 't2', workerId: 'w', kind: 'saco', bags: 2, recordedBy: 'João', rate: 10 }); return { users: [ceo, joaoA, joaoB], farms: [f] }; }

test('autoria antiga: "João" ambíguo só vira possível repetido no mesmo talhão; em talhões diferentes, não', () => {
  const s = run(legacy(), () => {});
  assert.ok(s.farms[0].labor.entries.every(e => e.recordedByAmbiguous));
  assert.equal(H.duplicateGroups(s.farms[0].labor).length, 0); // talhões diferentes no mesmo dia: trabalho normal
  const same = legacy(); same.farms[0].labor.entries[1].plotId = 't';
  assert.equal(H.duplicateGroups(run(same, () => {}).farms[0].labor).length, 1);
});

test('autoria antiga: o escritório escolhe um dos Joãos; fica registrado; fiscal não pode; usuário de outro nome é recusado', () => {
  let s = run(legacy(), () => {});
  assert.throws(() => run(s, f => { f.labor.entries[0].recordedById = 'f1'; }, { ...joaoA, labor: 'fiscal' }), /escritório/);
  assert.throws(() => run(s, f => { f.labor.entries[0].recordedById = 'ceo'; }), /Escolha um dos usuários/);
  s = run(s, f => { f.labor.entries[0].recordedById = 'f2'; });
  const e = s.farms[0].labor.entries[0];
  assert.deepEqual({ id: e.recordedById, user: e.recordedByUsername, amb: e.recordedByAmbiguous, by: e.authorSetBy }, { id: 'f2', user: 'joao.b', amb: undefined, by: 'CEO' });
  assert.equal(s.farms[0].labor.entries[1].recordedByAmbiguous, true); // o outro continua para conferir
  // Depois de definido, o João B corrige o próprio lançamento; o João A não.
  assert.throws(() => run(s, f => { f.labor.entries[0].bags = 4; }, { ...joaoA, labor: 'fiscal' }), /próprios/);
  assert.equal(run(s, f => { f.labor.entries[0].bags = 4; }, { ...joaoB, labor: 'fiscal' }).farms[0].labor.entries[0].bags, 4);
});
