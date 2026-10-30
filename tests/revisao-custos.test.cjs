const { test } = require('node:test');
const assert = require('node:assert/strict');
const X = require('../expansao-domain.js');
const M = require('../gestao-domain.js');

const iso = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const farm = () => ({ id: 'f', name: 'F', talhoes: [{ id: 't1', name: 'T1', areaHa: 6 }, { id: 't2', name: 'T2', areaHa: 4 }],
  agriculture: { cycles: [{ id: 'c1', activity: 'coffee', crop: 'Café arábica', name: 'Café', areaHa: 10, bagKg: 60, stage: 'Em colheita', startDate: iso(100), plotIds: ['t1', 't2'] }],
    harvests: [{ id: 'h1', cycleId: 'c1', date: iso(20), plotId: 't1', netKg: 6000 }], sales: [{ id: 's1', cycleId: 'c1', date: iso(5), kg: 1200, pricePerKg: 30 }] },
  operations: { expenses: [], stockUses: [] }, management: { payables: [] }, finances: [], stock: [], expansion: {} });
const market = { coffee: { front: { available: true, brlPerSaca: 1800 } } };
const cost = f => X.unitCosts(f, 'coffee')[0].cost;

test('compra para o estoque não entra no custo; o consumo do insumo entra uma vez só', () => {
  const f = farm();
  f.management.payables.push({ id: 'p1', activity: 'coffee', amount: 1000, dueDate: iso(30), status: 'paid', toStock: true, description: 'Compra adubo' });
  f.finances.push({ id: 'x1', activity: 'coffee', type: 'saida', value: 400, date: iso(30), toStock: true, description: 'Defensivo à vista' });
  f.operations.stockUses.push({ id: 'u1', activity: 'coffee', cycleId: 'c1', date: iso(25), cost: 1000, itemName: 'Adubo' });
  assert.equal(cost(f), 1000);
  assert.ok(!X.costSources(f).some(s => s.key === 'payable:p1' || s.key === 'finance:x1'));
  // Custo direto continua contando normalmente.
  f.management.payables.push({ id: 'p2', activity: 'coffee', cycleId: 'c1', amount: 250, dueDate: iso(10), status: 'open', description: 'Frete' });
  assert.equal(cost(f), 1250);
});

test('compra para o estoque não aceita rateio na safra (o servidor recusa)', () => {
  const f = farm(); f.management.payables.push({ id: 'p1', activity: 'coffee', supplier: 'Loja', description: 'Adubo', amount: 1000, dueDate: iso(1), status: 'open', toStock: true, cycleId: 'c1' });
  assert.throws(() => M.validateFarm(f), /estoque/);
});

test('sem custo lançado, a cobertura diz "sem custos" em vez de "0 sacas"', () => {
  const f = farm(), r = X.commercial(f, f.agriculture.cycles[0], market);
  assert.equal(r.noCost, true); assert.equal(r.breakEvenBags, null);
  f.operations.expenses.push({ id: 'e1', activity: 'coffee', cycleId: 'c1', date: iso(3), amount: 54000, description: 'Colheita mecânica' });
  const s = X.commercial(f, f.agriculture.cycles[0], market);
  assert.equal(s.noCost, false); assert.equal(s.breakEvenBags, 10); // (54.000 − 36.000 vendidos) / R$ 1.800 = 10 sc
});

test('mão de obra da colheita: a conta do fechamento entra como mão de obra, dividida pelas safras dos talhões apontados', () => {
  const f = farm(), week = iso(14);
  f.agriculture.cycles.push({ id: 'c2', activity: 'coffee', crop: 'Café arábica', name: 'Café novo', areaHa: 4, bagKg: 60, stage: 'Em colheita', startDate: iso(100), plotIds: ['t2'] });
  f.agriculture.cycles[0].plotIds = ['t1'];
  f.labor = { closings: [{ id: 'k1', weekStart: week, weekEnd: iso(8), lines: [] }],
    entries: [{ id: 'a', workerId: 'w', plotId: 't1', date: iso(12), kind: 'saco', bags: 6, rate: 10 }, { id: 'b', workerId: 'w', plotId: 't2', date: iso(11), kind: 'diaria', rate: 40 }, { id: 'c', workerId: 'w', plotId: 't2', date: iso(10), kind: 'saco', bags: 9, rate: 10, voided: true }] };
  f.management.payables.push({ id: 'labor_k1_w', activity: 'coffee', amount: 90, dueDate: iso(7), status: 'open', laborClosingId: 'k1', workerId: 'w', description: 'Colheita' });
  const rows = X.costSources(f).filter(s => s.key.startsWith('payable:labor_k1_w'));
  assert.deepEqual(rows.map(r => [r.cycleId, r.amount, r.category]).sort(), [['c1', 54, 'mao-de-obra'], ['c2', 36, 'mao-de-obra']]); // 60 : 40 do valor apontado
  assert.equal(X.costLines(f, { activity: 'coffee', targetType: 'cycle', targetId: 'c1' }).reduce((n, r) => n + r.amount, 0), 54);
  // Uma safra só: mantém a chave original (o rateio manual antigo continua valendo).
  f.agriculture.cycles[1].plotIds = ['t1']; f.agriculture.cycles[1].archived = true; f.agriculture.cycles[0].plotIds = ['t1', 't2'];
  assert.deepEqual(X.costSources(f).filter(s => s.key.startsWith('payable:labor_k1_w')).map(r => [r.key, r.amount]), [['payable:labor_k1_w', 90]]);
});

test('banho concluído entra como insumo pelo custo do estoque, dividido pela área dos talhões; banho sem baixa não entra', () => {
  const f = farm();
  f.stock = [{ id: 's', activity: 'coffee', item: 'Inseticida X', unit: 'Litros', quantity: 7, unitCost: 120 }];
  f.banho = { orders: [{ id: 'o1', title: 'Banho broca', status: 'completed', completedAt: new Date(Date.now() - 2 * 86400000).toISOString(), stockDeducted: true, stockDeductedItems: ['Inseticida X 3 L'], talhaoIds: ['t1', 't2'], products: [{ name: 'Inseticida X', quantity: 3, unit: 'L' }] },
    { id: 'o2', title: 'Banho liberado', status: 'released', talhaoIds: ['t1'], products: [{ name: 'Inseticida X', quantity: 5, unit: 'L' }] }] };
  const rows = X.costSources(f).filter(s => s.key.startsWith('bath:'));
  assert.equal(rows.length, 1); assert.equal(rows[0].amount, 360); assert.equal(rows[0].category, 'insumos'); assert.equal(rows[0].cycleId, 'c1');
  assert.equal(cost(f), 360);
  // Produto que o servidor não achou no estoque (não baixou) não vira custo.
  f.banho.orders[0].stockDeductedItems = [];
  assert.equal(cost(f), 0);
});

test('orçamento: mão de obra da colheita e banho caem nas categorias certas', () => {
  const f = farm();
  f.stock = [{ id: 's', activity: 'coffee', item: 'Adubo foliar', unit: 'kg', quantity: 10, unitCost: 50 }];
  f.banho = { orders: [{ id: 'o1', status: 'completed', completedAt: new Date().toISOString(), stockDeducted: true, talhaoIds: ['t1'], products: [{ name: 'Adubo foliar', quantity: 2, unit: 'kg' }] }] };
  f.labor = { closings: [{ id: 'k1', weekStart: iso(14), weekEnd: iso(8), lines: [] }], entries: [{ id: 'a', workerId: 'w', plotId: 't1', date: iso(12), kind: 'saco', bags: 5, rate: 10 }] };
  f.management.payables.push({ id: 'labor_k1_w', activity: 'coffee', amount: 50, dueDate: iso(7), status: 'open', laborClosingId: 'k1', workerId: 'w', description: 'Colheita' });
  const r = X.budgetReport(f, { cycleId: 'c1', lines: [{ category: 'insumos', amount: 200 }, { category: 'mao-de-obra', amount: 100 }] }, market);
  const cat = Object.fromEntries(r.categories.map(c => [c.category, c.actual]));
  assert.equal(cat.insumos, 100); assert.equal(cat['mao-de-obra'], 50); assert.equal(cat.outros, 0);
});
