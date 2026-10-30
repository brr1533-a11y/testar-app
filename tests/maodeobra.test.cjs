const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../maodeobra-domain.js');
const { startServer } = require('./support/server.cjs');

const iso = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
// Semana fechável: a segunda-feira de duas semanas atrás.
const week = H.weekStart(iso(14)), day = (n = 0) => { const d = new Date(week + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const farm = () => ({ id: 'f', talhoes: [{ id: 'carregado', name: 'Talhão carregado' }, { id: 'fraco', name: 'Talhão fraco' }], management: { payables: [] },
  labor: { workers: [{ id: 'ana', name: 'Ana', role: 'panhador', cpf: '52998224725', pix: 'ana@pix', dailyRate: 90, active: true }, { id: 'beto', name: 'Beto', role: 'panhador', dailyRate: 80, active: true }],
    plotRates: [{ id: 'r1', plotId: 'carregado', ratePerBag: 12.5, validFrom: '2020-01-01' }, { id: 'r2', plotId: 'fraco', ratePerBag: 15, validFrom: '2020-01-01' }], entries: [], adjustments: [], closings: [] } });
const ceo = { role: 'ceo', name: 'CEO', labor: 'manager' };
const run = (b, mutate, user = ceo) => { const a = structuredClone(b); mutate(a.farms[0]); H.prepare(b, a, user); return a; };

test('fechamento: sacos × valor + diárias − adiantamentos − descontos, em centavos; saldo negativo passa para a semana seguinte', () => {
  const s = { farms: [farm()] };
  let a = run(s, f => {
    f.labor.entries.push({ id: 'e1', date: day(0), plotId: 'carregado', workerId: 'ana', kind: 'saco', bags: 10.5 }, { id: 'e2', date: day(1), plotId: 'fraco', workerId: 'ana', kind: 'saco', bags: 3 }, { id: 'e3', date: day(2), plotId: 'fraco', workerId: 'ana', kind: 'diaria' }, { id: 'e4', date: day(2), plotId: 'fraco', workerId: 'beto', kind: 'diaria' });
    f.labor.adjustments.push({ id: 'a1', date: day(1), workerId: 'ana', kind: 'adiantamento', amount: 50, reason: 'Vale' }, { id: 'a2', date: day(1), workerId: 'ana', kind: 'desconto', amount: 10.35, reason: 'Peneira' }, { id: 'a3', date: day(1), workerId: 'beto', kind: 'adiantamento', amount: 200, reason: 'Vale' });
  });
  const c = H.computeClosing(a.farms[0].labor, week);
  const ana = c.lines.find(l => l.workerId === 'ana'), beto = c.lines.find(l => l.workerId === 'beto');
  // Ana: 10,5 × 12,50 = 131,25; 3 × 15 = 45; diária 90 → 266,25 − 50 − 10,35 = 205,90
  assert.equal(ana.bags, 13.5); assert.equal(ana.bagsValue, 176.25); assert.equal(ana.daysValue, 90); assert.equal(ana.total, 205.9);
  // Beto: diária 80 − vale 200 → recebe 0 e fica devendo 120 para a semana seguinte
  assert.equal(beto.total, 0); assert.equal(beto.newDebt, 120);
  assert.equal(c.total, 205.9);
  a = run(a, f => f.labor.closings.push({ id: 'c1', weekStart: week, weekEnd: H.weekEnd(week), lines: [] }));
  const next = H.weekStart(day(7));
  a.farms[0].labor.entries.push({ id: 'e5', date: next, plotId: 'fraco', workerId: 'beto', kind: 'saco', bags: 10, rate: 15 });
  const c2 = H.computeClosing(a.farms[0].labor, next);
  assert.equal(c2.lines[0].previousDebt, 120); assert.equal(c2.lines[0].total, 30); // 150 − 120
  assert.match(H.receiptText('Fazenda', c, ana), /A receber: R\$ 205,90/);
});

test('o valor do saco fica congelado no apontamento; mudar o valor do talhão não mexe no que já foi lançado', () => {
  let s = run({ farms: [farm()] }, f => f.labor.entries.push({ id: 'e1', date: day(0), plotId: 'carregado', workerId: 'ana', kind: 'saco', bags: 2 }));
  assert.equal(s.farms[0].labor.entries[0].rate, 12.5);
  s = run(s, f => f.labor.plotRates.push({ id: 'r3', plotId: 'carregado', ratePerBag: 14, validFrom: day(1) }));
  s = run(s, f => f.labor.entries.push({ id: 'e2', date: day(1), plotId: 'carregado', workerId: 'ana', kind: 'saco', bags: 2 }, { id: 'e0', date: day(0), plotId: 'carregado', workerId: 'beto', kind: 'saco', bags: 1, rate: 999 }));
  const e = id => s.farms[0].labor.entries.find(x => x.id === id);
  assert.equal(e('e1').rate, 12.5); assert.equal(e('e2').rate, 14);
  assert.equal(e('e0').rate, 12.5); // valor mandado pela tela é ignorado; vale o do talhão na data
});

test('fechar a semana trava os lançamentos e gera uma conta a pagar por pessoa, sem duplicar nem deixar alterar o valor', () => {
  let s = run({ farms: [farm()] }, f => f.labor.entries.push({ id: 'e1', date: day(0), plotId: 'carregado', workerId: 'ana', kind: 'saco', bags: 4 }, { id: 'e2', date: day(0), plotId: 'carregado', workerId: 'beto', kind: 'saco', bags: 2 }));
  s = run(s, f => f.labor.closings.push({ id: 'c1', weekStart: week, weekEnd: H.weekEnd(week), lines: [{ workerId: 'ana', total: 999999 }] }));
  const pay = s.farms[0].management.payables;
  assert.deepEqual(pay.map(p => [p.supplier, p.amount, p.status]), [['Ana', 50, 'open'], ['Beto', 25, 'open']]);
  assert.equal(s.farms[0].labor.closings[0].total, 75); // recalculado pelo servidor
  s = run(s, () => {});
  assert.equal(s.farms[0].management.payables.length, 2);
  // Apontamento que chega depois do fechamento não reabre a semana: vai para revisão e para a semana de acerto.
  const late = run(s, f => f.labor.entries.push({ id: 'e9', date: day(3), plotId: 'carregado', workerId: 'ana', kind: 'saco', bags: 1 })).farms[0].labor.entries.find(e => e.id === 'e9');
  assert.equal(late.lateStatus, 'pending'); assert.equal(late.late.closedWeek, week); assert.ok(late.late.settleWeek > week);
  assert.throws(() => run(s, f => { f.labor.closings = []; }), /não pode ser apagado/);
  assert.throws(() => run(s, f => { f.management.payables[0].amount = 1; }), /não pode ter valor/);
  assert.throws(() => run(s, f => f.labor.closings.push({ id: 'c2', weekStart: week, weekEnd: H.weekEnd(week), lines: [] })), /já foi fechada/);
});

test('fiscal: lança sacos e diárias e inclui pessoa nova (só nome e função), mas não cria valores, adiantamentos ou fechamentos, nem corrige o lançamento de outro', () => {
  const fiscal = { role: 'contribuinte', function: H.FISCAL, name: 'Fiscal', labor: 'fiscal' };
  const s = { farms: [farm()] };
  const a = run(s, f => {
    f.labor.entries.push({ id: 'e1', date: day(0), plotId: 'fraco', workerId: 'ana', kind: 'saco', bags: 5 });
    f.labor.workers.push({ id: 'x', name: 'Intruso', role: 'panhador', active: true });
    f.labor.adjustments.push({ id: 'a', date: day(0), workerId: 'ana', kind: 'desconto', amount: 1, reason: 'x' });
    f.labor.closings.push({ id: 'c', weekStart: week, weekEnd: H.weekEnd(week), lines: [] });
  }, fiscal);
  const L = a.farms[0].labor;
  assert.equal(L.entries[0].rate, 15); assert.equal(L.entries[0].recordedBy, 'Fiscal');
  assert.equal(L.workers.length, 3); assert.equal(L.workers[2].pendingData, true); assert.equal(L.adjustments.length, 0); assert.equal(L.closings.length, 0);
  assert.throws(() => run(a, f => { f.labor.entries[0].bags = 50; }, { ...fiscal, name: 'Outro fiscal' }), /próprios apontamentos/);
  // A visão do fiscal não tem CPF, Pix, valores nem adiantamentos.
  const seen = H.forFiscal(a.farms[0].labor);
  // Só marcas de "tem valor", nunca os valores (Etapa 2: o app avisa o fiscal na hora o que fica pendente).
  assert.deepEqual(Object.keys(seen.workers[0]).sort(), ['active', 'hasDaily', 'id', 'name', 'role']);
  assert.equal('rate' in seen.entries[0], false); assert.ok(seen.plotRates.every(r => !('ratePerBag' in r))); assert.deepEqual(seen.adjustments, []);
});

test('API: fiscal de colheita só recebe a tela de apontamento e o CEO fecha a semana com conta a pagar', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const api = async (path, token, body, method) => { const r = await fetch(s.url + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); let json = null; try { json = await r.json(); } catch {} return { status: r.status, json }; };
  const put = async (token, mutate) => { const st = await api('/api/state', token); mutate(st.json.state); return api('/api/state', token, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
  const ceo = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  let farmId;
  assert.equal((await put(ceo, st => { const f = st.farms[0]; farmId = f.id; f.talhoes = [{ id: 'carregado', name: 'Talhão carregado' }, { id: 'fraco', name: 'Talhão fraco' }]; f.labor = farm().labor; f.finances ||= []; })).status, 200);
  assert.equal((await api('/api/users', ceo, { username: 'fiscal1', name: 'Fiscal 1', email: 'f1@example.invalid', password: s.password, role: 'contribuinte', function: H.FISCAL, allowedFarmId: farmId, allowedActivity: 'coffee' })).status, 200);
  const t1 = (await api('/api/auth/login', '', { groupCode: '1001', username: 'fiscal1', password: s.password })).json.token;
  await api('/api/auth/change-password', t1, { currentPassword: s.password, newPassword: s.password + 'x1' });
  const fis = (await api('/api/auth/login', '', { groupCode: '1001', username: 'fiscal1', password: s.password + 'x1' })).json.token;
  const seen = (await api('/api/state', fis)).json.state.farms[0];
  assert.equal(seen.labor.workers[0].cpf, undefined); assert.equal(seen.labor.workers[0].pix, undefined); assert.ok(seen.labor.plotRates.every(r => !('ratePerBag' in r)));
  assert.deepEqual(seen.finances, []); assert.deepEqual(seen.agriculture.cycles, []); assert.deepEqual(seen.tractors, []);
  assert.equal((await put(fis, st => st.farms[0].labor.entries.push({ id: 'ap1', date: day(0), plotId: 'carregado', workerId: 'ana', kind: 'saco', bags: 8 }, { id: 'ap2', date: day(0), plotId: 'carregado', workerId: 'beto', kind: 'diaria' }))).status, 200);
  let full = (await api('/api/state', ceo)).json.state.farms[0];
  assert.deepEqual(full.labor.entries.map(e => [e.id, e.rate, e.recordedBy]), [['ap1', 12.5, 'Fiscal 1'], ['ap2', 80, 'Fiscal 1']]);
  assert.equal((await put(ceo, st => st.farms[0].labor.closings.push({ id: 'fc1', weekStart: week, weekEnd: H.weekEnd(week), lines: [] }))).status, 200);
  full = (await api('/api/state', ceo)).json.state.farms[0];
  assert.deepEqual(full.management.payables.filter(p => p.laborClosingId).map(p => [p.supplier, p.amount]).sort(), [['Ana', 100], ['Beto', 80]]);
  // Depois do fechamento o fiscal continua salvando; o lançamento na semana paga vai para revisão do escritório.
  assert.equal((await put(fis, st => st.farms[0].labor.entries.push({ id: 'ap3', date: day(1), plotId: 'carregado', workerId: 'ana', kind: 'saco', bags: 1 }))).status, 200);
  const ap3 = (await api('/api/state', ceo)).json.state.farms[0].labor.entries.find(e => e.id === 'ap3');
  assert.equal(ap3.lateStatus, 'pending'); assert.equal(ap3.late.closedWeek, week);
});

test('fiscal cadastra pessoa nova só com nome e função; apontamento sem valor trava o fechamento até o escritório definir', () => {
  const fiscal = { role: 'contribuinte', function: H.FISCAL, name: 'Fiscal', labor: 'fiscal' };
  let s = run({ farms: [farm()] }, f => {
    f.labor.workers.push({ id: 'nova', name: '  Rita  ', role: 'diarista', cpf: '52998224725', pix: 'x', dailyRate: 500, active: true });
    f.labor.workers[0].name = 'Ana Trocada';
    f.labor.entries.push({ id: 'd1', date: day(0), plotId: 'fraco', workerId: 'nova', kind: 'diaria' });
  }, fiscal);
  const rita = s.farms[0].labor.workers.find(w => w.id === 'nova');
  assert.deepEqual([rita.name, rita.role, rita.pendingData, rita.cpf, rita.dailyRate], ['Rita', 'diarista', true, undefined, undefined]);
  assert.equal(s.farms[0].labor.workers.find(w => w.id === 'ana').name, 'Ana'); // pessoa existente não muda
  assert.equal(s.farms[0].labor.entries[0].rate, null); // sem diária: apontamento aceito, sem valor
  assert.equal(H.pendingRates(s.farms[0].labor, week).length, 1);
  assert.throws(() => run(s, f => f.labor.closings.push({ id: 'c1', weekStart: week, weekEnd: H.weekEnd(week), lines: [] })), /sem valor nesta semana \(Rita\)/);
  // O escritório completa a diária: o valor entra no apontamento e a semana fecha.
  s = run(s, f => { Object.assign(f.labor.workers.find(w => w.id === 'nova'), { dailyRate: 100, pendingData: false }); });
  assert.equal(s.farms[0].labor.entries[0].rate, 100);
  s = run(s, f => f.labor.closings.push({ id: 'c1', weekStart: week, weekEnd: H.weekEnd(week), lines: [] }));
  assert.deepEqual(s.farms[0].management.payables.map(p => [p.supplier, p.amount]), [['Rita', 100]]);
  assert.throws(() => run({ farms: [farm()] }, f => f.labor.workers.push({ id: 'semnome', name: ' ', role: 'panhador' }), fiscal), /nome e a função/);
});
