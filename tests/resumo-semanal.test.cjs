// 4.21 · Resumo da semana no celular (push): o que vence em 7 dias, colheita dos últimos 7 dias, caixa e estoque mínimo.
const test = require('node:test'), a = require('node:assert/strict'), X = require('../expansao-domain.js'), M = require('../melhorias-domain.js');
const SEG = '2026-11-09', addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
function farm() {
  const f = { id: 'f1', name: 'Fazenda Boa Vista', tractors: [], implements: [], talhoes: [], cattle: { lots: [], paddocks: [] },
    agriculture: { cycles: [{ id: 'c1', activity: 'coffee', crop: 'Café arábica', name: 'Café 26', areaHa: 10, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: '2026-01-01' }],
      harvests: [{ id: 'h1', cycleId: 'c1', date: addDays(SEG, -2), netKg: 6000 }, { id: 'h2', cycleId: 'c1', date: addDays(SEG, -20), netKg: 9000 }], sales: [] },
    finances: [{ id: 'e', activity: 'coffee', type: 'entrada', value: 100000, date: addDays(SEG, -30), description: 'Venda' }],
    management: { payables: [{ id: 'p1', activity: 'coffee', supplier: 'Agro', description: 'Adubo', amount: 1200, dueDate: addDays(SEG, 3), status: 'open' }, { id: 'p2', activity: 'coffee', supplier: 'Posto', description: 'Diesel', amount: 800, dueDate: addDays(SEG, 20), status: 'open' }] },
    stock: [{ id: 's1', activity: 'coffee', item: 'Adubo', unit: 'sc', quantity: 2, min: 5 }] };
  X.init(f); return f;
}

test('resumo da semana: contas dos próximos 7 dias, colheita dos últimos 7, caixa e estoque mínimo', () => {
  const r = M.weeklySummary(farm(), SEG);
  a.equal(r.weekStart, SEG); a.equal(r.dueCount, 1); a.equal(r.dueAmount, 1200); a.equal(r.bags, 100); a.equal(r.lowStock, 1); a.equal(r.firstNegative, null);
  a.match(r.title, /1 conta\(s\) vencem \(R\$ 1\.200,00\)/); a.match(r.title, /100 sc colhidas/); a.match(r.title, /caixa positivo nos próximos 6 meses/);
  a.doesNotMatch(r.push, /R\$/, 'o push não mostra valores na tela bloqueada'); a.match(r.push, /^Resumo da semana: 1 conta\(s\) vencem · 100 sc colhidas/);
});

test('o aviso do resumo aparece de segunda a quarta, só para o CEO, uma vez por semana e a partir das 7h', () => {
  const f = farm(), pega = on => M.alerts(f, on).find(x => x.id.startsWith('weekly:'));
  for (const [on, tem] of [[SEG, true], [addDays(SEG, 1), true], [addDays(SEG, 2), true], [addDays(SEG, 3), false], [addDays(SEG, 6), false]]) a.equal(Boolean(pega(on)), tem, on);
  const w = pega(SEG); a.equal(w.role, 'ceo'); a.equal(w.pushAfterHour, 7); a.equal(w.id, 'weekly:' + SEG); a.equal(pega(addDays(SEG, 2)).id, w.id, 'mesmo código na semana: o push sai uma vez');
  a.equal(M.alertLink(w), '/app?abrir=resumo-dono');
});

test('caixa que fica negativo aparece no resumo', () => {
  const f = farm(); f.finances = []; f.management.payables.push({ id: 'p3', activity: 'coffee', supplier: 'Banco', description: 'Parcela', amount: 50000, dueDate: addDays(SEG, 40), status: 'open' });
  const r = M.weeklySummary(f, SEG); a.ok(r.firstNegative); a.match(r.push, /caixa fica negativo em [a-z]{3}\/\d{2}/);
});
