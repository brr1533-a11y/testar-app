const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../maodeobra-domain.js');

const iso = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const farm = () => ({ id: 'f', talhoes: [{ id: 'carregado', name: 'Talhão carregado' }, { id: 'novo', name: 'Talhão novo' }], management: { payables: [] },
  labor: { workers: [{ id: 'ana', name: 'Ana', role: 'panhador', dailyRate: 90, active: true }, { id: 'caio', name: 'Caio', role: 'diarista', active: true }],
    plotRates: [{ id: 'r1', plotId: 'carregado', ratePerBag: 12.5, validFrom: '2020-01-01' }], entries: [], adjustments: [], closings: [] } });
const ceo = { role: 'ceo', name: 'CEO', labor: 'manager' }, fiscal = { role: 'contribuinte', name: 'Fiscal', labor: 'fiscal' };
const run = (b, mutate, user = ceo) => { const a = structuredClone(b); mutate(a.farms[0]); H.prepare(b, a, user); return a; };

test('diária padrão: vale para quem não tem diária no cadastro; quem tem continua com a própria', () => {
  let s = run({ farms: [farm()] }, f => { f.labor.settings = { defaultDailyRate: 70 }; });
  s = run(s, f => f.labor.entries.push({ id: 'd1', date: iso(1), plotId: 'carregado', workerId: 'caio', kind: 'diaria' }, { id: 'd2', date: iso(1), plotId: 'carregado', workerId: 'ana', kind: 'diaria' }));
  const L = s.farms[0].labor;
  assert.equal(L.entries.find(e => e.id === 'd1').rate, 70);
  assert.equal(L.entries.find(e => e.id === 'd2').rate, 90);
});

test('diárias pendentes recebem a diária padrão quando o escritório define', () => {
  let s = run({ farms: [farm()] }, f => f.labor.entries.push({ id: 'd1', date: iso(1), plotId: 'carregado', workerId: 'caio', kind: 'diaria' }));
  assert.equal(s.farms[0].labor.entries[0].rate ?? null, null);
  assert.equal(H.pendingSummary(s.farms[0].labor).workers[0].workerId, 'caio');
  s = run(s, f => { f.labor.settings.defaultDailyRate = 75; });
  assert.equal(s.farms[0].labor.entries[0].rate, 75);
  assert.equal(H.pendingSummary(s.farms[0].labor).total, 0);
});

test('o fiscal recebe só marcas de "tem valor" (sem valores) e o app sabe o que vai ficar pendente', () => {
  const base = farm(); base.labor.settings = { defaultDailyRate: 70 };
  const v = H.forFiscal(base.labor);
  assert.ok(!JSON.stringify(v).includes('12.5') && !JSON.stringify(v).includes('70') && !JSON.stringify(v).includes('90'));
  assert.deepEqual(v.plotRates, [{ id: 'r1', plotId: 'carregado', validFrom: '2020-01-01' }]);
  assert.equal(v.workers.find(w => w.id === 'ana').hasDaily, true);
  assert.equal(v.settings.hasDefaultDaily, true);
  assert.equal(H.hasRate(v, { kind: 'saco', plotId: 'carregado', workerId: 'ana', date: iso(1) }), true);
  assert.equal(H.hasRate(v, { kind: 'saco', plotId: 'novo', workerId: 'ana', date: iso(1) }), false);
  assert.equal(H.hasRate(v, { kind: 'diaria', plotId: 'novo', workerId: 'caio', date: iso(1) }), true);
  assert.equal(H.hasRate(H.forFiscal(farm().labor), { kind: 'diaria', workerId: 'caio', date: iso(1) }), false);
});

test('o fiscal não muda a diária padrão nem os valores dos talhões', () => {
  const b = { farms: [farm()] }; b.farms[0].labor.settings = { defaultDailyRate: 70 };
  const s = run(b, f => { f.labor.settings = { defaultDailyRate: 500 }; f.labor.plotRates = []; f.labor.entries.push({ id: 'e1', date: iso(1), plotId: 'carregado', workerId: 'ana', kind: 'saco', bags: 3 }); }, fiscal);
  const L = s.farms[0].labor;
  assert.equal(L.settings.defaultDailyRate, 70);
  assert.equal(L.plotRates.length, 1);
  assert.equal(L.entries[0].rate, 12.5);
});

test('pendências do escritório: agrupadas por talhão (desde o primeiro apontamento) e somem ao definir o valor desde aquela data', () => {
  let s = run({ farms: [farm()] }, f => f.labor.entries.push(
    { id: 'a', date: iso(3), plotId: 'novo', workerId: 'ana', kind: 'saco', bags: 2 },
    { id: 'b', date: iso(1), plotId: 'novo', workerId: 'ana', kind: 'saco', bags: 4 },
    { id: 'c', date: iso(1), plotId: 'carregado', workerId: 'ana', kind: 'saco', bags: 1 }));
  const p = H.pendingSummary(s.farms[0].labor);
  assert.equal(p.total, 2);
  assert.deepEqual(p.plots, [{ plotId: 'novo', count: 2, from: iso(3) }]);
  s = run(s, f => f.labor.plotRates.push({ id: 'r2', plotId: 'novo', ratePerBag: 14, validFrom: p.plots[0].from }));
  assert.deepEqual(s.farms[0].labor.entries.map(e => e.rate), [14, 14, 12.5]);
  assert.equal(H.pendingSummary(s.farms[0].labor).total, 0);
});

test('diária padrão inválida é recusada', () => {
  assert.throws(() => run({ farms: [farm()] }, f => { f.labor.settings = { defaultDailyRate: -5 }; }), /Diária padrão/);
});
