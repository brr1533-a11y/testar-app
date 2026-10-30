const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../medicamentos-domain.js');
const FieldOps = require('../campo-domain.js');

const iso = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
// Vaca V1 (lote L1) tratada há 2 dias com antibiótico: 30 dias de abate, 4 de leite. Lote L2 vacinado sem carência.
const farm = () => ({ id: 'f', name: 'Fazenda', cattle: { lots: [{ id: 'L1', name: 'Leiteiras' }, { id: 'L2', name: 'Recria' }] },
  operations: { cattleMoves: [] },
  field: { medicines: [{ id: 'atb', activity: 'cattle', name: 'Antibiótico X', slaughterDays: 30, milkDays: 4 }, { id: 'vac', activity: 'cattle', name: 'Aftosa', slaughterDays: 0, milkDays: 0 }],
    dairyCows: [{ id: 'V1', activity: 'cattle', tag: '101', status: 'lactacao', lotId: 'L1' }, { id: 'V2', activity: 'cattle', tag: '102', status: 'lactacao', lotId: 'L1' }],
    vaccines: [{ id: 'a1', activity: 'cattle', name: 'Antibiótico X', medicineId: 'atb', slaughterDays: 30, milkDays: 4, cowId: 'V1', lotId: '', dueDate: iso(2), doneDate: iso(2) },
      { id: 'a2', activity: 'cattle', name: 'Aftosa', medicineId: 'vac', lotId: 'L2', dueDate: iso(1), doneDate: iso(1) }],
    milk: [], gta: [], postHarvest: [], pests: [], seasons: [], reproduction: [] } });

test('leite: só a vaca tratada fica em carência, do dia da aplicação até o dia anterior à liberação', () => {
  const f = farm();
  assert.equal(M.milkBlock(f, { cowId: 'V1', date: iso(0) }).milkFree, M.addDays(iso(2), 4));
  assert.equal(M.milkBlock(f, { cowId: 'V1', date: iso(3) }), null); // antes da aplicação
  assert.equal(M.milkBlock(f, { cowId: 'V1', date: M.addDays(iso(2), 4) }), null); // dia da liberação
  assert.equal(M.milkBlock(f, { cowId: 'V2', date: iso(0) }), null);
  assert.equal(M.milkBlock(f, { lotId: 'L1', date: iso(0) }), null); // vaca tratada não condena o tanque do lote inteiro
});

test('leite: aplicação no lote vale para as vacas do lote e para a ordenha do lote', () => {
  const f = farm(); f.field.vaccines.push({ id: 'a3', activity: 'cattle', name: 'Antibiótico X', medicineId: 'atb', milkDays: 4, slaughterDays: 30, lotId: 'L1', dueDate: iso(1), doneDate: iso(1) });
  assert.ok(M.milkBlock(f, { cowId: 'V2', date: iso(0) }));
  assert.ok(M.milkBlock(f, { lotId: 'L1', date: iso(0) }));
  assert.equal(M.milkBlock(f, { lotId: 'L2', date: iso(0) }), null);
});

test('servidor marca as ordenhas em carência como descarte (o aparelho não escolhe) e elas saem da produção entregue', () => {
  const before = { farms: [farm()] }, after = structuredClone(before);
  after.farms[0].field.milk.push({ id: 'm1', activity: 'cattle', date: iso(0), cowId: 'V1', liters: 12 }, { id: 'm2', activity: 'cattle', date: iso(0), cowId: 'V2', liters: 15, discard: { until: '2099-01-01', name: 'falso' } });
  M.stamp(before, after);
  const [m1, m2] = after.farms[0].field.milk;
  assert.equal(m1.discard.name, 'Antibiótico X'); assert.equal(m2.discard, undefined);
  assert.deepEqual(M.milkTotals(after.farms[0].field, iso(0)), { delivered: 15, discarded: 12 });
  assert.equal(FieldOps.milkSummary(after.farms[0].field, iso(0)).today, 15);
});

test('abate: venda e GTA para abate de lote em carência ganham alerta; outras finalidades e lotes livres não', () => {
  const f = farm(); f.field.vaccines.push({ id: 'a3', activity: 'cattle', name: 'Vermífugo Y', slaughterDays: 35, milkDays: 0, lotId: 'L2', dueDate: iso(5), doneDate: iso(5) });
  assert.equal(M.slaughterBlock(f, 'L2', iso(0)).slaughterFree, M.addDays(iso(5), 35));
  assert.equal(M.slaughterBlock(f, 'L1', iso(0)), null); // a aplicação na vaca não bloqueia o lote
  const before = { farms: [f] }, after = structuredClone(before);
  after.farms[0].operations.cattleMoves.push({ id: 's1', kind: 'sale', lotId: 'L2', date: iso(0), heads: 3 }, { id: 's2', kind: 'transfer', lotId: 'L2', date: iso(0), heads: 1 });
  after.farms[0].field.gta.push({ id: 'g1', purpose: 'Abate', lotId: 'L2', date: iso(0) }, { id: 'g2', purpose: 'Recria', lotId: 'L2', date: iso(0) });
  M.stamp(before, after);
  const F = after.farms[0];
  assert.equal(F.operations.cattleMoves[0].withdrawalAlert.name, 'Vermífugo Y'); assert.equal(F.operations.cattleMoves[1].withdrawalAlert, undefined);
  assert.ok(F.field.gta[0].withdrawalAlert); assert.equal(F.field.gta[1].withdrawalAlert, undefined);
  // O alerta gravado não pode ser apagado depois.
  const later = structuredClone(after); delete later.farms[0].field.gta[0].withdrawalAlert; M.stamp(after, later);
  assert.ok(later.farms[0].field.gta[0].withdrawalAlert);
});

test('o valor gravado na aplicação vale mais que o do produto; carência inválida é recusada', () => {
  const f = farm(); f.field.medicines[0].milkDays = 1;
  assert.ok(M.milkBlock(f, { cowId: 'V1', date: iso(0) }));
  f.field.medicines[0].milkDays = 500;
  assert.throws(() => M.validateFarm(f), /carências/);
  const g = farm(); g.field.vaccines[0].cowId = 'nao-existe';
  assert.throws(() => M.validateFarm(g), /vaca/);
});

test('status do dia: vacas com leite para descarte e lotes que não podem ir para abate', () => {
  const st = M.status(farm(), iso(0));
  assert.equal(st.milk.length, 1); assert.equal(st.milk[0].cowId, 'V1');
  assert.equal(st.slaughter.length, 0); // a carência de abate da vaca não aparece como lote
});
