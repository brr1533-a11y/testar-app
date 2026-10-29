const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../evolucao-domain.js');
const F = require('../campo-domain.js');
const O = require('../operacao-domain.js');
const G = require('../gestao-domain.js');
const A = require('../adm-access.js');

// Fazenda mínima com safra, colheita, venda, talhão, piquete, lote e trator.
const base = () => ({ users: [{ id: 'u', role: 'ceo' }], farms: [{ id: 'f', talhoes: [{ id: 'p', name: 'Talhão' }], tractors: [{ id: 't', name: 'Trator' }], implements: [], stock: [], finances: [],
  cattle: { lots: [{ id: 'l', name: 'Matrizes', heads: 10 }], weighings: [], paddocks: [{ id: 'pq', name: 'Piquete 1' }], healthEvents: [] },
  agriculture: { cycles: [{ id: 'c', activity: 'coffee', name: 'Safra', crop: 'Café arábica', areaHa: 10, bagKg: 60, startDate: '2020-01-01', stage: 'Em colheita', plannedCost: 0 }], harvests: [{ id: 'h', cycleId: 'c', netKg: 600, date: '2020-02-01' }], sales: [{ id: 'sale', cycleId: 'c', date: '2020-03-01', kg: 300, pricePerKg: 2 }] } }] });
const common = (v = {}) => ({ id: 'r', date: '2020-02-01', activity: 'coffee', archived: false, notes: '', ...v });
const ceo = { role: 'ceo', username: 'ceo' };

test('rastreabilidade (do V1): lote não repete colheita nem excede a venda', () => {
  const f = base().farms[0];
  M.init(f).traceLots.push(common({ code: 'L01', cycleId: 'c', harvestIds: ['h'], stage: 'Colheita', allocations: [{ saleId: 'sale', kg: 300 }] }));
  M.validateFarm(f);
  assert.deepEqual(M.traceStats(f, f.management.traceLots[0]), { kg: 600, sold: 300, balance: 300 });
  f.management.traceLots[0].allocations[0].kg = 301;
  assert.throws(() => M.validateFarm(f), /volume/);
});

test('manutenção, combustível e mapa (do V1) validam equipamento, horímetro e área', () => {
  const f = base().farms[0], mg = M.init(f);
  mg.maintenance.push(common({ title: 'Troca de óleo', equipmentId: 't', dueDate: '2020-03-01', status: 'scheduled', cost: 300, nextMeter: 500 }));
  mg.fuel.push(common({ id: 'fu', equipmentId: 't', litres: 80, pricePerLitre: 6.2, meter: 480 }));
  mg.mapAreas.push(common({ id: 'm', name: 'Talhão', plotId: 'p', points: [[10, 10], [40, 10], [25, 40]] }));
  M.validateFarm(f);
  mg.fuel[0].equipmentId = 'outro';
  assert.throws(() => M.validateFarm(f), /Abastecimento/);
  mg.fuel[0].equipmentId = 't'; mg.mapAreas[0].points.pop();
  assert.throws(() => M.validateFarm(f), /três pontos/);
  // Só estas quatro áreas ficaram no módulo do V1; compras, contas, extrato e XML são da gestão da versão 23.
  assert.deepEqual(M.KEYS, ['maintenance', 'fuel', 'traceLots', 'mapAreas']);
});

test('parto com nascidos vivos dá entrada no lote uma única vez, sem despesa (do V1)', () => {
  const b = base(), a = structuredClone(b), f = a.farms[0];
  f.field = { reproduction: [{ id: 'pt', activity: 'cattle', type: 'parto', date: '2020-02-10', lotId: 'l', heads: 2, births: 2 }] };
  F.applyBirths(b, a); O.prepare(b, a, ceo);
  assert.equal(a.farms[0].cattle.lots[0].heads, 12);
  assert.equal(a.farms[0].finances.length, 0);
  const again = structuredClone(a);
  F.applyBirths(again, a); O.prepare(again, a, ceo);
  assert.equal(a.farms[0].cattle.lots[0].heads, 12);
  assert.equal(a.farms[0].operations.cattleMoves.filter(m => m.id === 'birth_pt').length, 1);
});

test('alçada (do V1): ADM aprova pedido até o limite; acima ou sem preço, só o CEO', () => {
  assert.equal(A.approvalLimit({}), 0);
  assert.equal(A.approvalLimit({ admAccess: { approvalLimit: 1000 } }), 1000);
  const order = (price, id = 'o1') => ({ id, activity: 'coffee', date: '2020-01-01', items: [{ name: 'Adubo', quantity: 10, unit: 'saco', ...(price ? { unitPrice: price } : {}) }], justification: 'Repor', status: 'pending', requestedBy: 'ADM' });
  const run = (o, limit) => {
    const b = { farms: [{ id: 'f', stock: [], finances: [], management: { purchaseOrders: [o] } }] };
    const a = structuredClone(b); a.farms[0].management.purchaseOrders[0].status = 'approved';
    return () => G.prepare(b, a, { role: 'adm', name: 'ADM', approvalLimit: limit });
  };
  assert.doesNotThrow(run(order(90), 1000));            // R$ 900
  assert.throws(run(order(150), 1000), /aprovação do CEO/); // R$ 1.500
  assert.throws(run(order(null), 1000), /aprovação do CEO/); // sem preço
  assert.throws(run(order(10), 0), /aprovação do CEO/);    // sem alçada
  assert.equal(G.orderTotal(order(90)), 900);
});
