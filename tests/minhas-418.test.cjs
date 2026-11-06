// 4.18: contas recorrentes, cenário "e se eu vender agora" no fluxo de caixa e validade dos insumos.
const test = require('node:test'), a = require('node:assert/strict'), R = require('../expansao-domain.js'), M = require('../melhorias-domain.js');
const T = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()), day = n => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(Date.now() + n * 86400000));
function farm() { const f = { id: 'f1', name: 'Fazenda', tractors: [], implements: [], talhoes: [], agriculture: { cycles: [{ id: 'c1', activity: 'coffee', crop: 'Café arábica', name: 'Safra', areaHa: 10, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: '2026-01-01' }], harvests: [], sales: [] }, cattle: { lots: [], paddocks: [] }, finances: [], stock: [], management: { payables: [] }, operations: { stockUses: [] } }; R.init(f); return f; }
const bill = o => ({ id: 'b1', activity: 'coffee', date: T, notes: '', archived: false, supplier: 'Energisa', description: 'Energia', amount: 850, dayOfMonth: 10, costCenter: 'geral', start: '2026-01-01', active: true, ...o });

test('conta recorrente: validação de valor, dia, início e centro de custo', () => {
  const f = farm(); f.expansion.recurringBills.push(bill()); R.validateFarm(f);
  for (const bad of [{ amount: 0 }, { dayOfMonth: 32 }, { dayOfMonth: 1.5 }, { start: 'ontem' }, { end: '2025-01-01' }, { supplier: ' ' }, { costCenter: 'cycle:outra' }, { costCenter: 'lot:x' }]) {
    const g = farm(); g.expansion.recurringBills.push(bill(bad)); a.throws(() => R.validateFarm(g), /recorrente/, JSON.stringify(bad));
  }
  const g = farm(); g.expansion.recurringBills.push(bill({ costCenter: 'cycle:c1' })); R.validateFarm(g);
});

test('conta recorrente gera uma conta por mês com id fixo, respeita o fim e o último dia do mês', () => {
  const f = farm(); f.expansion.recurringBills.push(bill({ dayOfMonth: 31, start: '2026-01-15', end: '2026-04-30', costCenter: 'cycle:c1' }));
  const due = M.recurringDue(f, '2026-01-01', '2026-12-31');
  a.deepEqual(due.map(d => d.dueDate), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  a.equal(due[1].id, 'rec_b1_202602'); a.equal(due[1].cycleId, 'c1'); a.equal(due[1].status, 'open');
  // Dia antes do início não conta; pausada não gera nada.
  const g = farm(); g.expansion.recurringBills.push(bill({ dayOfMonth: 5, start: '2026-01-15' }));
  a.equal(M.recurringDue(g, '2026-01-01', '2026-02-28')[0].dueDate, '2026-02-05');
  g.expansion.recurringBills[0].active = false; a.equal(M.recurringDue(g, '2026-01-01', '2026-12-31').length, 0);
});

test('fluxo de caixa prevê as recorrentes não lançadas sem contar duas vezes as já lançadas', () => {
  const f = farm(); f.expansion.recurringBills.push(bill({ dayOfMonth: Number(day(3).slice(8)), start: '2020-01-01' }));
  const items = M.cashFlow(f, { months: 3, on: T }).rows.flatMap(r => r.items).filter(i => i.kind === 'recorrente');
  a.ok(items.length >= 2, 'próximos meses previstos');
  const first = M.recurringDue(f, T, day(40))[0];
  f.management.payables.push({ ...first, amount: 850 });
  const after = M.cashFlow(f, { months: 3, on: T }).rows.flatMap(r => r.items).filter(i => i.kind === 'recorrente');
  a.equal(after.length, items.length - 1, 'a lançada sai da previsão de recorrentes');
});

test('cenário "e se eu vender agora" entra no fluxo como entrada hoje', () => {
  const f = farm(); f.management.payables.push({ id: 'p1', activity: 'coffee', supplier: 'Banco', description: 'Parcela', amount: 5000, dueDate: day(5), status: 'open' });
  const base = M.cashFlow(f, { months: 2, on: T }), sc = M.cashFlow(f, { months: 2, on: T, extra: [{ amount: 6000, label: 'Venda de 5 sacas' }] });
  a.equal(Math.round(sc.lowest.balance - base.lowest.balance), 6000);
  a.ok(sc.rows.flatMap(r => r.items).some(i => i.kind === 'cenario' && /Venda de 5 sacas/.test(i.label)));
});

test('alerta de contas recorrentes do mês ainda não lançadas, só para o CEO', () => {
  const f = farm(); f.expansion.recurringBills.push(bill({ dayOfMonth: Number(T.slice(8)), start: '2020-01-01' }));
  const al = M.alerts(f, T).find(x => x.id.startsWith('recurring:'));
  a.ok(al); a.equal(al.role, 'ceo'); a.match(al.title, /Energisa/);
  f.management.payables.push({ ...M.recurringPending(f, T)[0] });
  a.ok(!M.alerts(f, T).some(x => x.id.startsWith('recurring:')), 'lançada, o aviso some');
});

test('validade dos insumos: vencido e vencendo avisam; sem saldo ou longe do vencimento não', () => {
  const f = farm(); f.stock = [
    { id: 's1', activity: 'coffee', item: 'Fungicida', unit: 'L', quantity: 10, expires: day(-2), batch: 'L2291' },
    { id: 's2', activity: 'coffee', item: 'Inseticida', unit: 'L', quantity: 4, expires: day(5) },
    { id: 's3', activity: 'coffee', item: 'Herbicida', unit: 'L', quantity: 4, expires: day(25) },
    { id: 's4', activity: 'coffee', item: 'Adubo', unit: 'sc', quantity: 4, expires: day(90) },
    { id: 's5', activity: 'coffee', item: 'Vacina', unit: 'dose', quantity: 0, expires: day(-10) }];
  R.validateFarm(f);
  const al = M.alerts(f, T).filter(x => x.id.startsWith('expires:'));
  a.deepEqual(al.map(x => x.id.split(':')[1]), ['s1', 's2', 's3']);
  a.match(al[0].title, /Fungicida \(lote L2291\) está vencido/); a.equal(al[0].severity, 'high'); a.equal(al[2].severity, 'attention');
  const g = farm(); g.stock = [{ id: 's1', item: 'X', unit: 'L', quantity: 1, expires: '31/12/2026' }]; a.throws(() => R.validateFarm(g), /Validade/);
});

test('aviso de recorrentes muda de código quando muda a conta pendente (antes usava só o tamanho do texto)', () => {
  const pend = ids => { const f = farm(); for (const id of ids) f.expansion.recurringBills.push(bill({ id, dayOfMonth: Number(T.slice(8)), start: '2020-01-01' })); return M.alerts(f, T).find(x => x.id.startsWith('recurring:'))?.id; };
  const a1 = pend(['luz']), a2 = pend(['gas']);
  a.ok(a1 && a2); a.notEqual(a1, a2, 'luz e gas têm o mesmo tamanho, mas são contas diferentes');
  a.equal(pend(['b1', 'a1']), pend(['a1', 'b1']), 'a ordem do cadastro não muda o código');
});

test('fluxo de caixa: salário do fixo já lançado no mês não é projetado de novo (contava em dobro)', () => {
  const f = farm(), prox = M.addMonths(T.slice(0, 7) + '-01', 1).slice(0, 7);
  f.expansion.yearWorkers = [{ id: 'w', activity: 'coffee', date: T, notes: '', archived: false, name: 'Zé', kind: 'fixo', monthlyRate: 3000, active: true }];
  const mes = () => M.cashFlow(f, { months: 3, on: T }).rows.find(r => r.month === prox);
  a.equal(mes().outflow, 3000, 'só a projeção');
  f.expansion.yearWork = [{ id: 'y1', activity: 'coffee', date: prox + '-01', notes: '', archived: false, workerId: 'w', kind: 'mensal', units: 1, amount: 3000 }];
  f.management.payables.push({ id: 'yearwork_y1', activity: 'coffee', supplier: 'Zé', description: 'Trabalho da equipe', amount: 3000, dueDate: prox + '-01', status: 'open', annualWorkId: 'y1', workerId: 'w' });
  a.equal(mes().outflow, 3000, 'conta lançada substitui a projeção');
});
