// 4.18: checklist do trator (validação e aviso ao escritório).
const test = require('node:test'), a = require('node:assert/strict'), R = require('../expansao-domain.js');
const T = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()), past = n => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(Date.now() - n * 86400000));
function farm() { const f = { id: 'f1', name: 'Fazenda', tractors: [{ id: 'tr1', name: 'Trator Azul' }], implements: [], talhoes: [], agriculture: { cycles: [], harvests: [], sales: [] }, cattle: { lots: [], paddocks: [] } }; R.init(f); return f; }
const log = o => ({ id: 'c' + Math.random().toString(36).slice(2, 8), activity: 'coffee', date: T, notes: '', archived: false, kind: 'checklist', equipmentId: 'tr1', checks: [{ item: 'Pneus', ok: true }, { item: 'Óleo do motor', ok: true }], ...o });

test('checklist do trator: precisa de equipamento da fazenda e itens válidos', () => {
  const f = farm(); f.expansion.fieldLogs.push(log()); R.validateFarm(f);
  for (const bad of [{ equipmentId: 'outro' }, { checks: [] }, { checks: [{ item: '', ok: true }] }, { checks: [{ item: 'Pneus', ok: 'sim' }] }, { checks: Array.from({ length: 21 }, (_, i) => ({ item: 'x' + i, ok: true })) }, { date: '2999-01-01' }]) {
    const g = farm(); g.expansion.fieldLogs.push(log(bad)); a.throws(() => R.validateFarm(g), /inválido|não encontrado/, JSON.stringify(bad));
  }
});

test('checklist com problema avisa o escritório; o último checklist do equipamento manda', () => {
  const f = farm();
  f.expansion.fieldLogs.push(log({ id: 'old', date: past(3), checks: [{ item: 'Pneus', ok: false }] }));
  let al = R.alerts(f, null).filter(x => x.id.startsWith('checklist:'));
  a.equal(al.length, 1); a.match(al[0].title, /Trator Azul: Pneus/); a.equal(al[0].page, 'campo-completo'); a.equal(al[0].severity, 'high');
  // Um checklist novo, tudo certo, encerra o aviso.
  f.expansion.fieldLogs.push(log({ id: 'new', date: T }));
  a.equal(R.alerts(f, null).filter(x => x.id.startsWith('checklist:')).length, 0);
  // Checklist com problema de mais de 14 dias não avisa mais.
  const g = farm(); g.expansion.fieldLogs.push(log({ date: past(20), checks: [{ item: 'Freios', ok: false }] }));
  a.equal(R.alerts(g, null).filter(x => x.id.startsWith('checklist:')).length, 0);
});

const M = require('../melhorias-domain.js');
function custos() {
  const f = farm(); f.agriculture.cycles = [{ id: 'c1', activity: 'coffee', crop: 'Café arábica', name: 'Safra 26', areaHa: 10, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: '2026-01-01' }];
  f.stock = [{ id: 's1', activity: 'coffee', item: 'Adubo 20-05-20', unit: 'sc', quantity: 40, min: 5, unitCost: 180 }]; f.finances = []; f.operations = { stockUses: [] }; f.management = { payables: [] };
  return f;
}

test('centro de custo: Geral, safra ou lote, coerente com cycleId/lotId; recusa o que não bate', () => {
  const f = custos();
  f.finances.push({ id: 'a', activity: 'coffee', type: 'saida', value: 10, date: T, costCenter: 'geral' }, { id: 'b', activity: 'coffee', type: 'saida', value: 10, date: T, costCenter: 'cycle:c1', cycleId: 'c1', supplier: 'Agro Loja' });
  M.validateCosts(f);
  for (const bad of [{ costCenter: 'cycle:c1' }, { costCenter: 'cycle:zz', cycleId: 'zz' }, { costCenter: 'geral', cycleId: 'c1' }, { costCenter: 'lot:l1', lotId: 'l1' }, { costCenter: 'outro' }, { costCenter: 'geral', type: 'entrada' }, { supplier: 'x'.repeat(121), costCenter: 'geral' }]) {
    const g = custos(); g.finances.push({ id: 'z', activity: 'coffee', type: 'saida', value: 1, date: T, ...bad }); a.throws(() => M.validateCosts(g), /inválid|Fornecedor|só vale|não pode/, JSON.stringify(bad));
  }
});

test('sugestão de centro de custo pelo último gasto do mesmo fornecedor (sem acento e maiúscula)', () => {
  const f = custos();
  f.finances.push({ id: 'a', activity: 'coffee', type: 'saida', value: 1, date: '2026-05-01', supplier: 'Agro Lója', costCenter: 'geral' }, { id: 'b', activity: 'coffee', type: 'saida', value: 1, date: '2026-06-01', supplier: 'AGRO LOJA', costCenter: 'cycle:c1', cycleId: 'c1' });
  a.deepEqual(M.suggestCostCenter(f, 'agro loja', 'coffee'), { costCenter: 'cycle:c1', date: '2026-06-01' });
  a.equal(M.suggestCostCenter(f, 'Outra Loja', 'coffee'), null);
  a.equal(M.suggestCostCenter(f, 'agro loja', 'cattle'), null, 'outra atividade não sugere');
  f.agriculture.cycles[0].archived = true; a.deepEqual(M.suggestCostCenter(f, 'agro loja', 'coffee'), { costCenter: 'geral', date: '2026-05-01' }, 'safra arquivada não é sugerida');
});

test('baixa da ordem de serviço: um consumo por insumo, id fixo, não repete', () => {
  const f = custos(), order = { id: 'os1', activity: 'coffee', title: 'Adubar talhão 1', cycleId: 'c1', inputs: [{ stockId: 's1', quantity: 4 }] };
  f.expansion.workOrders.push({ ...order, date: T, assignee: 'u1', due: T, notes: '', archived: false }); M.validateCosts(f);
  const uses = M.orderStockUses(f, order, T);
  a.deepEqual(uses.map(u => [u.id, u.stockId, u.quantity, u.cycleId, u.workOrderId]), [['os_os1_s1', 's1', 4, 'c1', 'os1']]);
  f.operations.stockUses.push(...uses); a.deepEqual(M.orderStockUses(f, order, T), [], 'segunda baixa não gera nada');
  const g = custos(); g.expansion.workOrders.push({ ...order, date: T, assignee: 'u1', due: T, notes: '', archived: false, inputs: [{ stockId: 's1', quantity: 1 }, { stockId: 's1', quantity: 2 }] }); a.throws(() => M.validateCosts(g), /repetido/);
  const h = custos(); h.expansion.workOrders.push({ ...order, date: T, assignee: 'u1', due: T, notes: '', archived: false, inputs: [{ stockId: 'nao', quantity: 1 }] }); a.throws(() => M.validateCosts(h), /inválido/);
});

test('mínimo sugerido pelo consumo de 90 dias; só vale com saldo conferido nos últimos 30 dias', () => {
  const f = custos(), item = f.stock[0];
  f.operations.stockUses.push({ id: 'u1', stockId: 's1', quantity: 9, date: past(10) }, { id: 'u2', stockId: 's1', quantity: 9, date: past(50) }, { id: 'u3', stockId: 's1', quantity: 100, date: past(120) });
  let m = M.suggestedMin(f, item, T);
  a.equal(m.used90, 18); a.equal(m.perMonth, 6); a.equal(m.suggested, 6); a.equal(m.countedRecently, false);
  item.countedAt = new Date().toISOString(); m = M.suggestedMin(f, item, T); a.equal(m.countedRecently, true);
  item.countedAt = past(40) + 'T10:00:00.000Z'; a.equal(M.suggestedMin(f, item, T).countedRecently, false);
  a.equal(M.suggestedMin(custos(), item, T).suggested, null, 'sem consumo não sugere');
});

test('alerta de parcela sem caixa previsto (só CEO) e pedido de compra aguardando, com endereço para decidir', () => {
  const ahead = n => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(Date.now() + n * 86400000));
  const f = custos();
  f.finances.push({ id: 'e1', activity: 'coffee', type: 'entrada', value: 10000, date: past(5) });
  f.expansion.loans.push({ id: 'l1', activity: 'coffee', date: past(300), notes: '', archived: false, name: 'Custeio', kind: 'custeio', principal: 4000, annualRate: 0, installments: 1, periodMonths: 12, system: 'unica', due: ahead(10) });
  a.equal(M.cashGapAlerts(f).length, 0, 'com caixa suficiente não avisa');
  f.management.payables.push({ id: 'p1', supplier: 'Loja', description: 'Defensivo', amount: 9000, dueDate: ahead(3), status: 'open' });
  const gap = M.cashGapAlerts(f);
  a.equal(gap.length, 1); a.equal(gap[0].role, 'ceo'); a.equal(gap[0].severity, 'high');
  a.match(gap[0].title, /Parcela Custeio \(1\) de R\$ 4\.000,00 vence em .* e o caixa previsto não cobre: faltam R\$ 3\.000,00/);
  a.doesNotMatch(gap[0].push, /\d/, 'o texto do push não leva valores');
  a.equal(M.alertLink(gap[0]), '/app?abrir=fluxo-caixa'); a.equal(M.alertLink(gap[0], 'f2'), '/app?abrir=fluxo-caixa&fazenda=f2');
  f.management.purchaseOrders = [{ id: 'po1', status: 'pending', supplier: 'Agro Loja', items: [{ name: 'Adubo', quantity: 10, unit: 'sc', unitPrice: 180 }] }, { id: 'po2', status: 'approved', items: [{ name: 'X', quantity: 1, unit: 'un' }] }];
  const po = M.purchaseAlerts(f);
  a.equal(po.length, 1); a.match(po[0].title, /Adubo · Agro Loja · R\$ 1\.800,00/); a.equal(M.alertLink(po[0]), '/app?abrir=pedidos-compra&item=po1');
  a.ok(R.alerts(f, null).some(x => x.id === 'po:po1') && R.alerts(f, null).some(x => x.id.startsWith('loan-cash:')));
});

test('notificação só abre endereços do próprio app', () => {
  const sw = require('../gerar-worker.cjs').build(require('node:path').resolve(__dirname, '..'));
  const rule = sw.match(/data:\{url:\/(.+?)\/\.test/)[1], re = new RegExp(rule);
  for (const ok of ['/app', '/app?abrir=pedidos-compra&item=po1', '/app?abrir=fluxo-caixa']) a.ok(re.test(ok), ok);
  for (const bad of ['https://mal.example/app', '//mal.example/app', '/app?abrir=x"><script>', '/platform', 'javascript:alert(1)']) a.ok(!re.test(bad), bad);
});

test('fechamento do mês: pendências e custos sem rateio separados entre Geral escolhido e sem destino', () => {
  const f = custos(), m = T.slice(0, 7), d = m + '-01';
  f.finances.push(
    { id: 'in', activity: 'coffee', type: 'entrada', value: 5000, date: d },
    { id: 'g', activity: 'coffee', type: 'saida', value: 300, date: d, costCenter: 'geral', description: 'Energia' },
    { id: 'c', activity: 'coffee', type: 'saida', value: 700, date: d, costCenter: 'cycle:c1', cycleId: 'c1', description: 'Adubo' },
    { id: 'n', activity: 'coffee', type: 'saida', value: 200, date: d, description: 'Sem destino' });
  f.management.payables.push({ id: 'p', supplier: 'Loja', description: 'Peça', amount: 90, dueDate: '2020-01-15', status: 'open' }); // vencida há tempo: pendência, mas fora dos custos do mês
  f.stock[0].quantity = 3;
  f.expansion.fieldLogs.push(log({ date: d, checks: [{ item: 'Freios', ok: false }] }));
  const r = M.monthClose(f, m, R, T);
  a.deepEqual([r.income, r.spend, r.result], [5000, 1200, 3800]);
  a.equal(r.general, 300); a.equal(r.noTargetTotal, 200); a.deepEqual(r.noTarget.map(x => x.label), ['Sem destino']);
  a.deepEqual(r.costs, [{ name: 'Safra · Safra 26', amount: 700 }]);
  const kinds = r.pendencies.map(p => p.kind);
  for (const k of ['Conta vencida', 'Estoque no mínimo', 'Checklist com problema', 'Saídas sem centro de custo']) a.ok(kinds.includes(k), k + ' em ' + kinds.join(','));
  a.match(r.pendencies.find(p => p.kind === 'Saídas sem centro de custo').text, /1 lançamento/);
});

test('margem por hectare: mesmo período, cultura e critério; Geral rateado pela área só quando pedido', () => {
  const mk = (id, area, kg, price, direct, general) => { const f = custos(); f.id = id; f.name = 'Fazenda ' + id; f.agriculture.cycles[0].areaHa = area;
    f.agriculture.harvests = [{ id: 'h' + id, cycleId: 'c1', date: '2026-06-01', netKg: kg }]; f.agriculture.sales = [{ id: 's' + id, cycleId: 'c1', date: '2026-07-01', kg, pricePerKg: price }, { id: 'old' + id, cycleId: 'c1', date: '2025-07-01', kg: 600, pricePerKg: 30 }];
    f.finances.push({ id: 'd' + id, activity: 'coffee', type: 'saida', value: direct, date: '2026-05-01', costCenter: 'cycle:c1', cycleId: 'c1' }, { id: 'g' + id, activity: 'coffee', type: 'saida', value: general, date: '2026-05-01', costCenter: 'geral' }); return f; };
  const A = mk('A', 10, 6000, 30, 60000, 10000), B = mk('B', 20, 9000, 30, 150000, 0);
  const q = { from: '2026-01-01', to: '2026-12-31', crop: 'Café arábica' };
  let r = M.marginReport([A, B], R, q);
  a.deepEqual(r.map(x => [x.farm, x.revenue, x.cost, x.marginHa]), [['Fazenda A', 180000, 60000, 12000], ['Fazenda B', 270000, 150000, 6000]]);
  r = M.marginReport([A, B], R, { ...q, general: true });
  a.deepEqual(r.map(x => [x.farm, x.general, x.marginHa]), [['Fazenda A', 10000, 11000], ['Fazenda B', 0, 6000]]);
  a.equal(M.marginReport([A], R, { ...q, crop: 'Soja' }).length, 0, 'outra cultura fica fora');
});
