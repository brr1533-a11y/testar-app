const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../carencia-domain.js');
const H = require('../maodeobra-domain.js');
const { startServer } = require('./support/server.cjs');

const iso = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
// Banho concluído há 10 dias no talhão t1: produto A com 30 dias de carência e 24 h de reentrada, produto B com 15 dias.
const applied = new Date(Date.now() - 10 * 86400000).toISOString();
const farm = () => ({ id: 'f', name: 'Fazenda', talhoes: [{ id: 't1', name: 'Talhão 1' }, { id: 't2', name: 'Talhão 2' }], management: { payables: [] },
  banho: { products: [{ id: 'pa', name: 'Produto A', unit: 'L', graceDays: 30, reentryHours: 24 }, { id: 'pb', name: 'Produto B', unit: 'L', graceDays: 15 }],
    orders: [{ id: 'o1', title: 'Banho broca', status: 'completed', completedAt: applied, talhaoIds: ['t1'], products: [{ productId: 'pa', name: 'Produto A', unit: 'L', quantity: 2, graceDays: 30, reentryHours: 24 }, { productId: 'pb', name: 'Produto B', unit: 'L', quantity: 1, graceDays: 15 }] }] },
  agriculture: { cycles: [], harvests: [], sales: [] },
  labor: { workers: [{ id: 'ana', name: 'Ana', role: 'panhador', active: true }], plotRates: [{ id: 'r1', plotId: 't1', ratePerBag: 10, validFrom: '2020-01-01' }], entries: [], adjustments: [], closings: [] } });
const ceo = { role: 'ceo', name: 'CEO' }, adm = { role: 'adm', name: 'ADM' }, fiscal = { role: 'contribuinte', name: 'Fiscal' };

test('carência: a maior carência do banho vale; colheita bloqueada até a data e livre depois ou antes da aplicação', () => {
  const f = farm(), harvestFrom = C.addDays(applied, 30);
  assert.equal(C.windows(f)[0].harvestFrom, harvestFrom);
  assert.equal(C.windows(f)[0].reentryUntil, new Date(Date.parse(applied) + 24 * 3600_000).toISOString());
  assert.equal(C.harvestBlock(f, 't1', iso(0)).harvestFrom, harvestFrom);
  assert.equal(C.harvestBlock(f, 't1', harvestFrom), null);
  assert.equal(C.harvestBlock(f, 't1', iso(12)), null);
  assert.equal(C.harvestBlock(f, 't2', iso(0)), null);
  const st = C.plotStatus(f);
  assert.equal(st.length, 1); assert.equal(st[0].harvestFrom, harvestFrom); assert.equal(st[0].reentryUntil, undefined); // 24 h já passaram
});

test('carência: banho não concluído ou produto sem carência não bloqueia; o valor gravado na ordem vale mais que o atual', () => {
  const f = farm(); f.banho.orders[0].status = 'released';
  assert.equal(C.harvestBlock(f, 't1', iso(0)), null);
  const g = farm(); g.banho.products[0].graceDays = 1; // mudar o produto depois não mexe no banho já montado
  assert.equal(C.harvestBlock(g, 't1', iso(0)).harvestFrom, C.addDays(applied, 30));
  const h = farm(); h.banho.orders[0].products = [{ productId: 'pb', name: 'Produto B', unit: 'L', quantity: 1, graceDays: 0 }];
  assert.equal(C.windows(h).length, 0);
});

test('visão do fiscal: janelas prontas por talhão, sem as ordens de banho, e o aviso funciona igual', () => {
  const f = farm(), plots = C.forFiscalPlots(f);
  const seen = { talhoes: f.talhoes.map(t => ({ id: t.id, name: t.name, ...(plots[t.id] ? { carencia: plots[t.id] } : {}) })), banho: { products: [], orders: [] } };
  assert.equal(C.harvestBlock(seen, 't1', iso(0)).harvestFrom, C.addDays(applied, 30));
  assert.equal(C.harvestBlock(seen, 't2', iso(0)), null);
});

test('servidor: alerta gravado na colheita nova (o celular não escolhe), só CEO/ADM decide e a decisão vai para o histórico', () => {
  const before = { farms: [farm()] };
  const a = structuredClone(before);
  a.farms[0].labor.entries.push({ id: 'e1', date: iso(0), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 3 }, { id: 'e2', date: iso(0), plotId: 't2', workerId: 'ana', kind: 'saco', bags: 1, graceAlert: { harvestFrom: '2099-01-01', order: 'falso' } });
  a.farms[0].agriculture.harvests.push({ id: 'h1', date: iso(0), plotId: 't1', netKg: 600 });
  assert.equal(C.stamp(before, a, fiscal).length, 0);
  const [e1, e2] = a.farms[0].labor.entries;
  assert.equal(e1.graceAlert.harvestFrom, C.addDays(applied, 30)); assert.equal(e1.graceAlert.order, 'Banho broca');
  assert.equal(e2.graceAlert, undefined);
  assert.equal(C.pendingDecisions(a.farms[0]).length, 2);
  // Contribuinte não decide; o alerta não pode ser apagado.
  const b = structuredClone(a); b.farms[0].labor.entries[0].graceDecision = { status: 'allowed', note: 'x' };
  assert.throws(() => C.stamp(a, b, fiscal), /Só o CEO ou o ADM/);
  const c = structuredClone(a); delete c.farms[0].labor.entries[0].graceAlert; C.stamp(a, c, adm);
  assert.ok(c.farms[0].labor.entries[0].graceAlert);
  // ADM permite: autor e hora do servidor, linha no histórico; depois não muda mais.
  const d = structuredClone(a); d.farms[0].labor.entries[0].graceDecision = { status: 'allowed', note: 'Só bordadura', by: 'falso' };
  const audit = C.stamp(a, d, adm, '2026-01-01T00:00:00.000Z');
  assert.deepEqual(d.farms[0].labor.entries[0].graceDecision, { status: 'allowed', note: 'Só bordadura', by: 'ADM', at: '2026-01-01T00:00:00.000Z' });
  assert.equal(audit.length, 1); assert.match(audit[0].label, /Talhão 1/); assert.equal(audit[0].action, 'permitiu colheita na carência');
  const e = structuredClone(d); e.farms[0].labor.entries[0].graceDecision = { status: 'allowed', note: 'outro' }; C.stamp(d, e, ceo);
  assert.equal(e.farms[0].labor.entries[0].graceDecision.note, 'Só bordadura');
});

test('mão de obra: semana com colheita na carência sem decisão não fecha; com decisão fecha', () => {
  const f = farm(), week = H.weekStart(iso(14)), day = H.weekEnd(week);
  f.labor.entries.push({ id: 'e1', date: day, plotId: 't1', workerId: 'ana', kind: 'saco', bags: 2, rate: 10, graceAlert: { harvestFrom: '2099-01-01', order: 'Banho' } });
  const close = farm0 => { const b = { farms: [farm0] }, a = structuredClone(b); a.farms[0].labor.closings.push({ id: 'c1', weekStart: week, weekEnd: H.weekEnd(week), lines: [] }); H.prepare(b, a, { role: 'ceo', name: 'CEO', labor: 'manager' }); return a; };
  assert.throws(() => close(structuredClone(f)), /carência/);
  f.labor.entries[0].graceDecision = { status: 'allowed', note: 'ok', by: 'CEO', at: 'x' };
  assert.equal(close(f).farms[0].labor.closings[0].lines.length, 1);
});

test('produto com carência ou reentrada fora da faixa é recusado', () => {
  const f = farm(); f.banho.products[0].graceDays = 400;
  assert.throws(() => C.validateProducts(f), /Carência/);
  f.banho.products[0].graceDays = 2.5;
  assert.throws(() => C.validateProducts(f), /Carência/);
});

test('API: colheita da safra no talhão em carência ganha o alerta e a decisão do CEO entra no histórico', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const api = async (path, token, body, method) => { const r = await fetch(s.url + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const put = async (token, mutate) => { const st = await api('/api/state', token); mutate(st.json.state); return api('/api/state', token, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
  const token = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  const base = farm();
  let r = await put(token, st => { const f = st.farms[0]; f.talhoes = base.talhoes; f.banho = base.banho; f.agriculture = { cycles: [{ id: 'c1', activity: 'coffee', crop: 'Café arábica', name: 'Café 26', areaHa: 10, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: iso(60), plotIds: ['t1'], plotId: 't1' }], harvests: [], sales: [] }; });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  r = await put(token, st => st.farms[0].agriculture.harvests.push({ id: 'h1', cycleId: 'c1', date: iso(0), plotId: 't1', netKg: 600 }));
  assert.equal(r.status, 200, JSON.stringify(r.json));
  let h = (await api('/api/state', token)).json.state.farms[0].agriculture.harvests[0];
  assert.equal(h.graceAlert.order, 'Banho broca'); assert.equal(h.graceDecision, undefined);
  r = await put(token, st => { st.farms[0].agriculture.harvests[0].graceDecision = { status: 'allowed', note: 'Colheita fora da área tratada' }; });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const st = (await api('/api/state', token)).json.state;
  h = st.farms[0].agriculture.harvests[0];
  assert.equal(h.graceDecision.note, 'Colheita fora da área tratada'); assert.ok(h.graceDecision.by);
  assert.ok(st.audit.some(a => a.action === 'permitiu colheita na carência'));
});
