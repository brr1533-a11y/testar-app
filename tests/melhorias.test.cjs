// Melhorias 2027: regras de meação, Funrural, financiamentos, fluxo de caixa, arrendamento, prestadores, animais,
// leite, módulos, comparação anônima, comparador com XML importado, previsão do tempo, backup e exclusão a pedido.
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), zlib = require('node:zlib');
const R = require('../expansao-domain.js'), M = require('../melhorias-domain.js');
const iso = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10), T = iso(0);
const rec = (o) => ({ activity: 'coffee', date: T, notes: '', archived: false, ...o });
function farm() {
  const f = { id: 'f1', name: 'Boa Vista', talhoes: [{ id: 't1', name: 'Talhão 1', areaHa: 4 }, { id: 't2', name: 'Talhão 2', areaHa: 6 }], agriculture: { cycles: [{ id: 'c1', activity: 'coffee', crop: 'Café arábica', name: 'Safra 26', areaHa: 10, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: '2026-01-01', plotIds: ['t1', 't2'] }], harvests: [], sales: [] }, cattle: { lots: [{ id: 'l1', name: 'Lote 1', heads: 3 }], paddocks: [], weighings: [] }, finances: [], management: { payables: [], salesContracts: [] }, operations: {} };
  R.init(f); return f;
}

test('meação: produção dos talhões, parte do parceiro, custos e acerto em sacas e dinheiro', () => {
  const f = farm();
  f.agriculture.harvests.push({ id: 'h1', cycleId: 'c1', plotId: 't1', date: '2026-06-10', netKg: 6000 }, { id: 'h2', cycleId: 'c1', plotId: 't2', date: '2026-06-11', netKg: 3000 }, { id: 'h3', cycleId: 'c1', date: '2026-06-12', netKg: 600 });
  f.expansion.partnerships.push(rec({ id: 'p1', partner: 'José Meeiro', plotIds: ['t1'], cycleId: 'c1', productionShare: 50, costShare: 50, start: '2026-01-01' }));
  f.expansion.partnerEntries.push(rec({ id: 'e1', partnershipId: 'p1', kind: 'custo', amount: 1000, date: '2026-03-01' }), rec({ id: 'e2', partnershipId: 'p1', kind: 'adiantamento', amount: 300, date: '2026-04-01' }), rec({ id: 'e3', partnershipId: 'p1', kind: 'entrega', bags: 20, date: '2026-07-01' }), rec({ id: 'e4', partnershipId: 'p1', kind: 'venda', bags: 10, amount: 15000, date: '2026-07-02' }));
  R.validateFarm(f);
  const r = M.partnershipReport(f, f.expansion.partnerships[0], R);
  // Talhão 1: 6000 kg = 100 sc; a colheita sem talhão (600 kg) entra pela área (4 de 10 ha) = 4 sc.
  a.equal(r.producedBags, 104); a.equal(r.partnerBags, 52); a.equal(r.ownerBags, 52);
  a.equal(r.partnerCost, 500); a.equal(r.bagsBalance, 22); a.equal(r.money, 15000 - 500 - 300);
  a.match(r.text, /Faltam entregar 22 sacas/); a.match(r.text, /A fazenda deve R\$ 14\.200,00/);
});

test('meação: talhão em duas parcerias no mesmo período e percentual inválido são recusados', () => {
  const f = farm();
  f.expansion.partnerships.push(rec({ id: 'p1', partner: 'A', plotIds: ['t1'], productionShare: 50, start: '2026-01-01' }), rec({ id: 'p2', partner: 'B', plotIds: ['t1', 't2'], productionShare: 40, start: '2026-05-01', end: '2026-12-31' }));
  a.throws(() => R.validateFarm(f), /outra parceria/);
  f.expansion.partnerships[1].plotIds = ['t2']; R.validateFarm(f);
  f.expansion.partnerships[1].productionShare = 120; a.throws(() => R.validateFarm(f), /percentuais/);
});

test('Funrural: pessoa física, jurídica e folha; comprador desconta ou produtor recolhe', () => {
  const f = farm();
  f.agriculture.harvests.push({ id: 'h1', cycleId: 'c1', plotId: 't1', date: '2026-06-10', netKg: 6000 });
  f.agriculture.sales.push({ id: 's1', cycleId: 'c1', date: '2026-07-01', kg: 600, bagKg: 60, pricePerKg: 25, buyer: 'Cooperativa' });
  f.management.salesContracts.push({ id: 'k1', activity: 'coffee', buyer: 'Exportadora', product: 'Café', quantityKg: 1200, pricePerKg: 30, deliveryStart: '2026-08-01', deliveryEnd: '2026-09-30', status: 'open', deliveries: [{ id: 'd1', kg: 600 }] });
  let r = M.funruralReport(f);
  a.equal(r.rates.regime, 'pf'); a.equal(r.gross, 15000 + 18000);
  const sale = r.rows.find(x => x.kind === 'venda');
  a.deepEqual([sale.funrural, sale.rat, sale.senar, sale.total, sale.net, sale.toCollect], [180, 15, 30, 225, 14775, 0]);
  f.expansion.taxSettings.push(rec({ id: 'tx', regime: 'pj', buyerWithholds: false }));
  R.validateFarm(f); r = M.funruralReport(f);
  a.equal(r.rows.find(x => x.kind === 'venda').total, 307.5); a.equal(r.toCollect, 676.5);
  f.expansion.taxSettings[0].regime = 'folha'; a.equal(M.funruralReport(f).rows[0].total, 30);
  f.expansion.taxSettings.push(rec({ id: 'tx2', regime: 'pf' })); a.throws(() => R.validateFarm(f), /único regime/);
});

test('financiamento: Price, SAC, pagamento único, parcelas pagas e atrasadas', () => {
  const base = { id: 'L', name: 'Custeio', kind: 'custeio', principal: 100000, annualRate: 10, installments: 4, periodMonths: 12, date: '2025-01-15', due: '2026-01-15' };
  const price = M.loanSchedule({ ...base, system: 'price' }, [], '2026-06-01');
  a.equal(price.rows.length, 4); a.equal(Math.round(price.rows.reduce((n, r) => n + r.amortization, 0) * 100) / 100, 100000);
  a.equal(price.rows.at(-1).balance, 0);
  a.ok(Math.abs(price.rows[1].amount - price.rows[2].amount) < 1, 'Price: parcelas iguais depois da primeira');
  const sac = M.loanSchedule({ ...base, system: 'sac' }, [{ installment: 1, amount: 35000 }], '2026-06-01');
  a.deepEqual(sac.rows.map(r => r.amortization), [25000, 25000, 25000, 25000]);
  a.equal(sac.rows[0].status, 'paga'); a.equal(sac.rows[1].status, 'a vencer'); a.equal(sac.next.n, 2);
  const late = M.loanSchedule({ ...base, system: 'sac' }, [], '2026-06-01'); a.equal(late.overdue.length, 1);
  const unica = M.loanSchedule({ ...base, system: 'unica', kind: 'cpr', cprBags: 120, due: '2026-01-15' }, [], '2025-06-01');
  a.equal(unica.rows.length, 1); a.equal(unica.rows[0].bags, 120); a.ok(Math.abs(unica.rows[0].interest - 10000) < 1);
  const f = farm(); f.expansion.loans.push(rec({ ...base, system: 'price', date: iso(-400), due: iso(10) })); R.validateFarm(f);
  a.ok(R.alerts(f, null).some(x => x.page === 'financiamentos' && /vence em 10 dias/.test(x.title)));
  f.expansion.loans[0].due = iso(-500); a.throws(() => R.validateFarm(f), /primeiro vencimento/);
});

test('arrendamento: pagamento anual entra no custo da safra; terra cedida é receita no fluxo', () => {
  const f = farm();
  f.expansion.leases.push(rec({ id: 'a1', direction: 'tomado', party: 'Sr. Antônio', areaHa: 5, unit: 'sacas', perHa: 8, bagPrice: 1500, start: '2024-03-10', dueMonth: 7, cycleId: 'c1' }), rec({ id: 'a2', direction: 'cedido', party: 'Vizinho', areaHa: 2, unit: 'reais', perHa: 1200, start: '2025-01-05' }));
  R.validateFarm(f);
  a.equal(M.leaseYearValue(f.expansion.leases[0]), 60000); a.equal(M.leaseYearValue(f.expansion.leases[1]), 2400);
  a.deepEqual(M.leaseDueDates(f.expansion.leases[0], '2024-01-01', '2026-12-31'), ['2024-07-10', '2025-07-10', '2026-07-10']);
  const rows = R.costSources(f).filter(r => r.key.startsWith('lease:'));
  a.ok(rows.length >= 2 && rows.every(r => r.amount === 60000 && r.cycleId === 'c1' && r.date <= T));
  const flow = M.cashFlow(f, { months: 12 });
  a.ok(flow.rows.flatMap(r => r.items).some(i => i.kind === 'arrendamento' && i.amount === 2400));
  a.ok(flow.rows.flatMap(r => r.items).some(i => i.kind === 'arrendamento' && i.amount === -60000));
});

test('prestadores: custo entra na safra e a colheita terceirizada é comparada com a manual', () => {
  const f = farm();
  f.agriculture.harvests.push({ id: 'h1', cycleId: 'c1', plotId: 't1', date: '2026-06-10', netKg: 18000 });
  f.expansion.contractors.push(rec({ id: 'k1', provider: 'Colheita Mecânica', service: 'colheita', unit: 'ha', quantity: 10, price: 2400, cycleId: 'c1', paid: false }));
  f.laborCostSources = [{ key: 'labor:x', activity: 'coffee', date: '2026-06-20', cycleId: 'c1', lotId: '', amount: 9000, category: 'mao-de-obra', label: 'Fechamento' }];
  R.validateFarm(f);
  a.ok(R.costSources(f).some(r => r.key === 'contractor:k1' && r.amount === 24000 && r.category === 'mao-de-obra'));
  const cmp = M.contractorComparison(f, { laborClosingCosts: () => f.laborCostSources });
  // 300 sc em 10 ha = 30 sc/ha; R$ 2.400/ha = R$ 80/sc; manual R$ 9.000 / 300 sc = R$ 30/sc.
  a.equal(cmp[0].hiredPerBag, 80); a.equal(cmp[0].manualPerBag, 30); a.equal(cmp[0].difference, 50);
  a.ok(M.cashFlow(f).rows[0].items.some(i => i.kind === 'prestador' && i.amount === -24000));
});

test('fluxo de caixa: saldo de hoje, contas, contratos com Funrural, parcelas, salários e primeiro mês negativo', () => {
  const f = farm();
  f.finances.push({ id: 'x1', type: 'entrada', value: 10000, date: iso(-10) }, { id: 'x2', type: 'saida', value: 4000, date: iso(-5) });
  f.management.payables.push({ id: 'p1', supplier: 'Loja', description: 'Adubo', amount: 9000, dueDate: iso(20), status: 'open' }, { id: 'p2', supplier: 'Loja', description: 'Pago', amount: 50, dueDate: iso(5), status: 'paid' });
  f.management.salesContracts.push({ id: 'k', activity: 'coffee', buyer: 'Expo', quantityKg: 600, pricePerKg: 20, deliveryStart: iso(40), deliveryEnd: iso(70), status: 'open', deliveries: [] });
  f.expansion.yearWorkers.push(rec({ id: 'w1', name: 'Fixo', kind: 'fixo', monthlyRate: 2000, active: true }));
  const r = M.cashFlow(f, { months: 6 });
  a.equal(r.opening, 6000);
  const items = r.rows.flatMap(x => x.items);
  a.ok(items.some(i => i.kind === 'conta' && i.amount === -9000)); a.ok(!items.some(i => /Pago/.test(i.label)));
  a.ok(items.some(i => i.kind === 'contrato' && i.amount === 11820), 'contrato líquido de Funrural (1,5%)');
  a.ok(items.filter(i => i.kind === 'salario').length >= 5);
  a.ok(r.firstNegative, 'caixa fica negativo'); a.equal(r.rows.at(-1).balance, Math.round((r.opening + r.rows.reduce((n, x) => n + x.net, 0)) * 100) / 100);
});

test('animais: brinco e SISBOV únicos, eventos, pesagem, lactação, intervalo entre partos e secagem', () => {
  const f = farm(), cow = (o) => rec({ activity: 'cattle', ...o });
  f.expansion.animals.push(cow({ id: 'a1', tag: 'BR-01', sex: 'F', birth: '2020-01-01', lotId: 'l1', status: 'ativo', sisbov: '105000000000001', breed: 'Girolando', origin: 'Própria' }), cow({ id: 'a2', tag: 'BR-02', sex: 'F', birth: '2020-02-01', status: 'ativo' }));
  f.expansion.animalEvents.push(cow({ id: 'v1', animalId: 'a1', kind: 'parto', date: '2025-01-10' }), cow({ id: 'v2', animalId: 'a1', kind: 'parto', date: iso(-100) }), cow({ id: 'v3', animalId: 'a1', kind: 'pesagem', weightKg: 480, date: iso(-30) }), cow({ id: 'v4', animalId: 'a1', kind: 'pesagem', weightKg: 495, date: iso(-10) }), cow({ id: 'v5', animalId: 'a2', kind: 'parto', date: iso(-200) }), cow({ id: 'v6', animalId: 'a2', kind: 'cobertura', date: iso(-120) }), cow({ id: 'v7', animalId: 'a2', kind: 'prenhez', date: iso(-80) }));
  R.validateFarm(f);
  const w = M.animalWeight(f, 'a1'); a.equal(w.last.weightKg, 495); a.equal(w.gainDay, 0.75);
  const milk = M.milkIndicators(f), c1 = milk.find(m => m.tag === 'BR-01'), c2 = milk.find(m => m.tag === 'BR-02');
  a.equal(c1.del, 100); a.equal(c1.calvings, 2); a.ok(c1.iep > 300); a.equal(c1.dryOff, iso(205));
  a.equal(c2.expectedCalving, iso(163)); a.equal(c2.dryOff, iso(103)); a.equal(c2.pregnant, true);
  const sis = M.sisbovRows(f); a.deepEqual(sis.find(s => s.tag === 'BR-01').missing, []); a.ok(sis.find(s => s.tag === 'BR-02').missing.includes('número SISBOV'));
  f.expansion.animals.push(cow({ id: 'a3', tag: 'br-01', sex: 'M' })); a.throws(() => R.validateFarm(f), /Brinco repetido/);
  f.expansion.animals[2].tag = 'BR-03'; f.expansion.animals[2].sisbov = '123'; a.throws(() => R.validateFarm(f), /15 dígitos/);
  f.expansion.animals[2].sisbov = ''; f.expansion.animalEvents.push(cow({ id: 'v8', animalId: 'a3', kind: 'parto', date: iso(-1) })); a.throws(() => R.validateFarm(f), /só para fêmeas/);
});

test('balança: arquivo brinco;peso com cabeçalho, vírgula decimal e brinco desconhecido', () => {
  const r = M.parseScale('Brinco;Peso\nBR-01;495,5\nbr-02\t402\nXX;300\nBR-01;abc', [{ id: 'a1', tag: 'BR-01' }, { id: 'a2', tag: 'BR-02' }]);
  a.deepEqual(r.ok.map(x => [x.animalId, x.weightKg]), [['a1', 495.5], ['a2', 402]]);
  a.equal(r.errors.length, 2); a.match(r.errors.join(), /XX não cadastrado/);
});

test('módulos: só some do menu o que está escondido em todas as fazendas; páginas essenciais ficam', () => {
  const f1 = farm(), f2 = farm(); f2.id = 'f2';
  f1.expansion.moduleSettings.push(rec({ id: 'm1', hidden: ['mao-de-obra', 'parcerias', 'usuarios'] }));
  f2.expansion.moduleSettings.push(rec({ id: 'm2', hidden: ['mao-de-obra'] }));
  a.deepEqual([...M.hiddenPages([f1])].sort(), ['mao-de-obra', 'parcerias']);
  a.deepEqual([...M.hiddenPages([f1, f2])], ['mao-de-obra']);
  f1.expansion.moduleSettings[0].hidden.push('modulos'); a.throws(() => R.validateFarm(f1), /módulos inválida/);
});

test('comparação anônima: exige três fazendas de três grupos e não revela fazendas', () => {
  const rows = [1, 2, 3].map(n => ({ activity: 'coffee', uf: 'MG', bagsHa: 20 + n * 5, costBag: 500 + n * 50, groupKey: 'g' + n, farmKey: 'g' + n + ':f' }));
  a.equal(M.benchmark(rows.slice(0, 2), { activity: 'coffee', uf: 'MG' }).available, false);
  a.equal(M.benchmark(rows.map(r => ({ ...r, groupKey: 'g1' })), { activity: 'coffee', uf: 'MG' }).available, false);
  const r = M.benchmark(rows, { activity: 'coffee', uf: 'MG' });
  a.equal(r.bagsHa.median, 30); a.equal(r.costBag.median, 600); a.doesNotMatch(JSON.stringify(r), /g1|g2/);
});

test('comparador: nota importada por XML entra com chave válida, sem repetir a mesma nota e com um voto por fazenda', () => {
  const key = '3126101234567800019055001000000123100000001';
  let s = 0, w = 2; for (let i = 42; i >= 0; i--) { s += Number(key[i]) * w; w = w === 9 ? 2 : w + 1; } const dv = s % 11 < 2 ? 0 : 11 - s % 11, valid = key + dv;
  a.equal(R.nfeKeyValid(valid), true); a.equal(R.nfeKeyValid(key + ((dv + 1) % 10)), false);
  const base = { consent: true, uf: 'MG', city: 'Alfenas', productCode: 'Adubo', activeIngredient: '', baseUnit: 'kg', date: '2026-10-10', packageQuantity: 50 };
  const q = { uf: 'MG', city: 'Alfenas', productCode: 'Adubo', baseUnit: 'kg', window: 30, on: '2026-10-20' };
  const rows = [
    { ...base, imported: true, invoiceKey: valid, itemIndex: 0, unitPrice: 100, groupKey: 'g1', farmKey: 'g1:f' },
    { ...base, imported: true, invoiceKey: valid, itemIndex: 0, unitPrice: 100, groupKey: 'g2', farmKey: 'g2:f' }, // mesma nota em outro Grupo: conta uma vez
    { ...base, verified: true, unitPrice: 200, groupKey: 'g3', farmKey: 'g3:f' },
    { ...base, imported: true, invoiceKey: '1'.repeat(44), itemIndex: 0, unitPrice: 999, groupKey: 'g4', farmKey: 'g4:f' } // chave inválida
  ];
  a.equal(R.collective(rows, q).available, false, 'só duas fazendas valem');
  rows.push({ ...base, verified: true, unitPrice: 300, groupKey: 'g5', farmKey: 'g5:f' }, ...Array.from({ length: 20 }, () => ({ ...base, verified: true, unitPrice: 5000, groupKey: 'g5', farmKey: 'g5:f' })));
  const r = R.collective(rows, q);
  a.equal(r.available, true); a.equal(r.importedSamples, 1); a.match(r.note, /XML/);
  // Fazendas: 2, 4 e 100 por kg (a g5 tem 21 compras, mas vale um voto: mediana dela = 100).
  a.equal(r.median, 4); a.equal(r.max, 100);
});

test('previsão do tempo: Open-Meteo pelo município e UF, com resumo em português e janela seca', async () => {
  const calls = [], fake = async url => { calls.push(url); return { ok: true, json: async () => url.includes('geocoding') ? { results: [{ name: 'Alfenas', admin1: 'Minas Gerais', latitude: -21.4, longitude: -45.9 }, { name: 'Alfenas', admin1: 'Bahia', latitude: 0, longitude: 0 }] } : { daily: { time: ['2026-11-01', '2026-11-02', '2026-11-03'], temperature_2m_max: [30, 28, 29], temperature_2m_min: [18, 17, 19], precipitation_sum: [12.4, 0, 0.2], precipitation_probability_max: [90, 10, 20] } } }; };
  const w = require('../clima-openmeteo.js').create({ fetcher: fake }), r = await w.forecast({ uf: 'MG', city: 'Alfenas' });
  a.equal(r.place, 'Alfenas/MG'); a.match(calls[1], /latitude=-21\.4/); a.equal(r.days.length, 3);
  a.match(r.summary, /12,6 mm/); a.match(r.summary, /Dias mais secos: 02\/11, 03\/11/);
  await w.forecast({ uf: 'MG', city: 'alfenas' }); a.equal(calls.length, 2, 'segunda consulta vem do cache');
  await a.rejects(() => w.forecast({ uf: 'XX', city: 'Alfenas' }), /UF e o município/);
});

test('ADM que consulta custos recebe arrendamentos e prestadores (mesmo custo do CEO), mas não financiamentos', () => {
  const f = farm(); f.expansion.leases.push(rec({ id: 'a1', direction: 'tomado', party: 'X', areaHa: 1, unit: 'reais', perHa: 100, start: '2025-01-01', cycleId: 'c1' })); f.expansion.contractors.push(rec({ id: 'k1', provider: 'P', service: 'outro', unit: 'total', quantity: 1, price: 50 })); f.expansion.loans.push(rec({ id: 'l1', name: 'L', kind: 'outro', principal: 10, due: T }));
  const state = { farms: [f] }, adm = { role: 'adm' }, seen = R.project({ farms: [JSON.parse(JSON.stringify(f))] }, state, adm, ['custos-unidade']).farms[0];
  a.equal(seen.expansion.leases.length, 1); a.equal(seen.expansion.contractors.length, 1); a.equal(seen.expansion.loans.length, 0);
  a.equal(R.unitCosts(seen, 'coffee')[0].cost, R.unitCosts(f, 'coffee')[0].cost);
});

// Servidor das melhorias com um armazenamento em memória: backup + teste de restauração e exclusão vencida.
function fakeServer(groups, config = {}) {
  const routes = {}, store = {
    listGroups: async () => groups.map(g => JSON.parse(JSON.stringify(g))), getConfig: async k => config[k] ?? null, setConfig: async (k, v) => { if (v == null) delete config[k]; else config[k] = v; },
    listFiles: async () => [], deleteFiles: async () => {}, deleteGroup: async id => { const i = groups.findIndex(g => g.id === id); if (i >= 0) groups.splice(i, 1); }
  };
  const app = new Proxy({}, { get: (_, m) => (p, ...h) => { routes[m + ' ' + p] = h.at(-1); } }), noop = (q, r, n) => n && n();
  const api = require('../melhorias-server.js')({ app, auth: noop, requireRole: () => noop, store, AdmAccess: { pagesFor: () => [] }, bcrypt: {}, rateHit: () => true, platformAuth: noop, cancelSubscriptionBeforeGroupDeletion: async () => {}, sanitizeState: s => s, recordPlatformAudit: async () => {}, SEED_GROUP_SLUG: 'seed', SEED_GROUP_CODE: '1001' });
  return { api, routes, config };
}

test('backup: grava compactado, restaura em memória e confere; arquivo corrompido falha no teste', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rural-backup-')); process.env.BACKUP_DIR = dir; process.env.BACKUP_HOURS = '0'; process.env.BACKUP_KEY = 'chave-de-teste';
  try {
    const f = farm(), { api, config } = fakeServer([{ id: 'g1', slug: 'g', code: '2001', name: 'Grupo', status: 'active', state: { farms: [f], coffeeQualities: [] } }]);
    const entry = await api.runBackup('teste');
    a.equal(entry.test.ok, true); a.equal(entry.test.groups, 1); a.equal(entry.test.farms, 1); a.equal(entry.encrypted, true);
    const file = path.join(dir, entry.file), raw = fs.readFileSync(file);
    a.equal(raw.subarray(0, 4).toString(), 'GRB1'); a.throws(() => zlib.gunzipSync(raw), 'cifrado: não abre sem a chave');
    a.equal(config.backupLog.length, 1);
    fs.writeFileSync(file, Buffer.concat([raw.subarray(0, 40), Buffer.from('estragado')]));
    a.throws(() => api.restoreTest(file));
  } finally { delete process.env.BACKUP_DIR; delete process.env.BACKUP_KEY; fs.rmSync(dir, { recursive: true, force: true }); }
});

test('exclusão a pedido: só apaga depois do prazo e nunca o Grupo inicial', async () => {
  process.env.BACKUP_HOURS = '0';
  const groups = [{ id: 'g1', slug: 'a', code: '3001', name: 'A', state: {} }, { id: 'g2', slug: 'b', code: '3002', name: 'B', state: {} }, { id: 'g3', slug: 'seed', code: '1001', name: 'Inicial', state: {} }];
  const past = new Date(Date.now() - 1000).toISOString(), future = new Date(Date.now() + 86400000).toISOString();
  const { api, config } = fakeServer(groups, { 'deletionRequest:g1': { executeAfter: past, requestedAt: past }, 'deletionRequest:g2': { executeAfter: future, requestedAt: past }, 'deletionRequest:g3': { executeAfter: past, requestedAt: past } });
  await api.runDeletions();
  a.deepEqual(groups.map(g => g.id), ['g2', 'g3']); a.equal(config['deletionRequest:g1'], undefined); a.equal(config.deletionLog.length, 1);
});

test('prestadores: cada lado usa as sacas dos próprios talhões (turma × máquina)', () => {
  const f = farm();
  f.agriculture.harvests.push({ id: 'h1', cycleId: 'c1', plotId: 't1', date: '2026-06-10', netKg: 18000 }, { id: 'h2', cycleId: 'c1', plotId: 't2', date: '2026-06-12', netKg: 3000 });
  f.labor = { entries: [{ id: 'e1', plotId: 't2', date: '2026-06-12' }, { id: 'e2', plotId: 't1', date: '2026-06-12', voided: true }] };
  f.expansion.contractors.push(rec({ id: 'k1', provider: 'Máquina', service: 'colheita', unit: 'ha', quantity: 4, price: 2900, cycleId: 'c1', plotId: 't1' }));
  const c = M.contractorComparison(f, { laborClosingCosts: () => [{ cycleId: 'c1', amount: 1050 }] })[0];
  // Turma: R$ 1.050 / 50 sc do talhão 2 = R$ 21. Máquina: talhão 1 com 300 sc em 4 ha = 75 sc/ha; R$ 2.900 / 75 = R$ 38,67.
  a.equal(c.manualBags, 50); a.equal(c.manualPerBag, 21); a.equal(c.hiredPerBag, 38.67); a.equal(c.difference, 17.67);
});
