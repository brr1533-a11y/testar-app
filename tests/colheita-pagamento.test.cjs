const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../pix-brcode.js');
const H = require('../maodeobra-domain.js');
const { startServer } = require('./support/server.cjs');

const iso = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const week = H.weekStart(iso(14)), day = (n = 0) => { const d = new Date(week + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const farm = () => ({ id: 'f', talhoes: [{ id: 't1', name: 'T1' }, { id: 't2', name: 'T2' }], management: { payables: [] },
  labor: { workers: [{ id: 'ana', name: 'Ana Souza', role: 'safrista', cpf: '52998224725', pix: '52998224725', dailyRate: 90, active: true }, { id: 'beto', name: 'Beto', role: 'diarista', pix: 'beto@pix.com', dailyRate: 80, active: true }, { id: 'cida', name: 'Cida', role: 'panhador', active: true }],
    plotRates: [{ id: 'r1', plotId: 't1', ratePerBag: 10, validFrom: '2020-01-01' }, { id: 'r2', plotId: 't2', ratePerBag: 10, validFrom: '2020-01-01' }], entries: [], adjustments: [], closings: [] } });
const ceo = { role: 'ceo', name: 'CEO', labor: 'manager' };
const as = name => ({ role: 'contribuinte', name, labor: 'fiscal' });
const run = (b, mutate, user = ceo) => { const a = structuredClone(b); mutate(a.farms[0]); H.prepare(b, a, user); return a; };
const parse = code => { const out = {}; let i = 0; while (i < code.length) { const id = code.slice(i, i + 2), n = Number(code.slice(i + 2, i + 4)); out[id] = code.slice(i + 4, i + 4 + n); i += 4 + n; } return out; };

// ---------- Pix copia e cola ----------
test('Pix: o código de verificação segue o padrão (valor de referência e exemplo oficial do Banco Central)', () => {
  assert.equal(P.crc16('123456789'), '29B1');
  assert.equal(P.crc16('00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304'), '1D3D');
});

test('Pix: copia e cola com chave, valor, nome e cidade nos campos certos; o fim confere com o resto', () => {
  const code = P.payload({ pixKey: '52998224725', name: 'Ana Souza Conceição', city: 'Três Pontas', amount: 132.5, txid: 'COL-2026/10' });
  const f = parse(code);
  assert.equal(f['00'], '01'); assert.equal(f['53'], '986'); assert.equal(f['58'], 'BR');
  assert.equal(f['54'], '132.50'); assert.equal(f['59'], 'ANA SOUZA CONCEICAO'); assert.equal(f['60'], 'TRES PONTAS');
  assert.equal(parse(f['26'])['00'], 'br.gov.bcb.pix'); assert.equal(parse(f['26'])['01'], '52998224725');
  assert.equal(parse(f['62'])['05'], 'COL202610');
  assert.equal(code.slice(-4), P.crc16(code.slice(0, -4)));
});

test('Pix: reconhece CPF, celular, e-mail, CNPJ e chave aleatória; recusa chave inválida e valor zero', () => {
  assert.deepEqual(P.key('529.982.247-25'), { type: 'CPF', value: '52998224725' });
  assert.deepEqual(P.key('(35) 99999-0001'), { type: 'celular', value: '+5535999990001' });
  assert.deepEqual(P.key('Ana@Pix.com'), { type: 'e-mail', value: 'ana@pix.com' });
  assert.deepEqual(P.key('12.345.678/0001-95'), { type: 'CNPJ', value: '12345678000195' });
  assert.equal(P.key('123e4567-e12b-12d1-a456-426655440000').type, 'aleatória');
  assert.equal(P.key('abc'), null); assert.equal(P.key(''), null);
  assert.throws(() => P.payload({ pixKey: 'abc', name: 'X', amount: 10 }), /Chave Pix/);
  assert.throws(() => P.payload({ pixKey: 'ana@pix.com', name: 'X', amount: 0 }), /Valor/);
});

test('lista de pagamento do fechamento: só quem tem a receber, com a chave cadastrada e o valor do fechamento', () => {
  let s = run({ farms: [farm()] }, f => f.labor.entries.push({ id: 'a', date: day(1), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 10 }, { id: 'b', date: day(1), plotId: 't1', workerId: 'beto', kind: 'diaria' }));
  s = run(s, f => f.labor.adjustments.push({ id: 'v', date: day(1), workerId: 'beto', kind: 'adiantamento', amount: 80, reason: 'vale' }));
  s = run(s, f => f.labor.closings.push({ id: 'c1', weekStart: week, weekEnd: H.weekEnd(week), lines: [] }));
  const L = s.farms[0].labor, list = H.paymentList(L, L.closings[0]);
  assert.deepEqual(list, [{ workerId: 'ana', name: 'Ana Souza', cpf: '52998224725', pix: '52998224725', amount: 100 }]); // Beto: 80 − 80 de vale = 0
});

// ---------- Dados para o contador ----------
test('dados para o contador: por pessoa, o que foi fechado no período (dias, sacos, diárias, vales, líquido)', () => {
  let s = run({ farms: [farm()] }, f => f.labor.entries.push(
    { id: 'a1', date: day(0), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 6 }, { id: 'a2', date: day(2), plotId: 't2', workerId: 'ana', kind: 'saco', bags: 4 },
    { id: 'a3', date: day(2), plotId: 't2', workerId: 'ana', kind: 'diaria' }, { id: 'c1', date: day(3), plotId: 't1', workerId: 'cida', kind: 'saco', bags: 2 }));
  s = run(s, f => f.labor.adjustments.push({ id: 'd', date: day(2), workerId: 'ana', kind: 'desconto', amount: 15, reason: 'ferramenta' }));
  s = run(s, f => f.labor.closings.push({ id: 'k1', weekStart: week, weekEnd: H.weekEnd(week), lines: [] }));
  const rows = H.accountantRows(s.farms[0].labor, week, week);
  const ana = rows.find(r => r.name === 'Ana Souza');
  assert.deepEqual({ cpf: ana.cpf, role: ana.role, firstDay: ana.firstDay, lastDay: ana.lastDay, days: ana.days, bags: ana.bags, dailies: ana.dailies, bagsValue: ana.bagsValue, dailiesValue: ana.dailiesValue, discounts: ana.discounts, net: ana.net },
    { cpf: '52998224725', role: 'Safrista', firstDay: day(0), lastDay: day(2), days: 2, bags: 10, dailies: 1, bagsValue: 100, dailiesValue: 90, discounts: 15, net: 175 });
  assert.equal(rows.find(r => r.name === 'Cida').cpf, ''); // sem CPF: a tela avisa
  assert.equal(H.accountantRows(s.farms[0].labor, H.weekStart(iso(0)), iso(0)).length, 0); // período sem fechamento
});

// ---------- Duplicidade offline ----------
test('duplicidade: mesma pessoa no mesmo dia por dois celulares (fiscais diferentes) trava o fechamento até o escritório resolver', () => {
  let s = run({ farms: [farm()] }, f => f.labor.entries.push({ id: 'x1', date: day(1), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 5 }), as('Fiscal Norte'));
  s = run(s, f => f.labor.entries.push({ id: 'x2', date: day(1), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 5 }), as('Fiscal Sul'));
  const g = H.duplicateGroups(s.farms[0].labor);
  assert.equal(g.length, 1); assert.deepEqual(g[0].entries.map(e => e.id), ['x1', 'x2']);
  assert.throws(() => run(s, f => f.labor.closings.push({ id: 'k', weekStart: week, weekEnd: H.weekEnd(week), lines: [] })), /repetidos/);
  // Estornar o repetido resolve.
  const fixed = run(s, f => { const e = f.labor.entries.find(x => x.id === 'x2'); e.voided = true; e.voidReason = 'repetido'; });
  assert.equal(H.duplicateGroups(fixed.farms[0].labor).length, 0);
  assert.equal(run(fixed, f => f.labor.closings.push({ id: 'k', weekStart: week, weekEnd: H.weekEnd(week), lines: [] })).farms[0].labor.closings[0].lines[0].bags, 5);
});

test('duplicidade: o escritório pode confirmar que são diferentes (os dois são pagos); o fiscal não pode', () => {
  let s = run({ farms: [farm()] }, f => f.labor.entries.push({ id: 'm', date: day(1), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 3 }), as('Fiscal Norte'));
  s = run(s, f => f.labor.entries.push({ id: 't', date: day(1), plotId: 't2', workerId: 'ana', kind: 'saco', bags: 4 }), as('Fiscal Sul'));
  assert.throws(() => run(s, f => f.labor.entries.forEach(e => { e.dupOk = true; }), as('Fiscal Sul')), /próprios/); // o do outro fiscal
  assert.throws(() => run(s, f => { f.labor.entries.find(e => e.id === 't').dupOk = true; }, as('Fiscal Sul')), /escritório/); // nem o próprio
  s = run(s, f => f.labor.entries.forEach(e => { e.dupOk = true; }));
  assert.equal(H.duplicateGroups(s.farms[0].labor).length, 0);
  assert.equal(s.farms[0].labor.entries[0].dupOkBy, 'CEO');
  const k = run(s, f => f.labor.closings.push({ id: 'k', weekStart: week, weekEnd: H.weekEnd(week), lines: [] }));
  assert.equal(k.farms[0].labor.closings[0].lines[0].bags, 7);
});

test('duplicidade: duas diárias no mesmo dia contam, mesmo pelo mesmo fiscal; sacos do mesmo fiscal em talhões diferentes não', () => {
  let s = run({ farms: [farm()] }, f => f.labor.entries.push({ id: 'd1', date: day(1), plotId: 't1', workerId: 'beto', kind: 'diaria' }, { id: 'd2', date: day(1), plotId: 't2', workerId: 'beto', kind: 'diaria' }), as('Fiscal Norte'));
  assert.equal(H.duplicateGroups(s.farms[0].labor).length, 1);
  s = run({ farms: [farm()] }, f => f.labor.entries.push({ id: 's1', date: day(1), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 3 }, { id: 's2', date: day(1), plotId: 't2', workerId: 'ana', kind: 'saco', bags: 2 }), as('Fiscal Norte'));
  assert.equal(H.duplicateGroups(s.farms[0].labor).length, 0);
});

test('API: dois celulares de fiscais diferentes enviam a mesma pessoa no mesmo dia → o servidor aponta a duplicidade e trava o fechamento', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const put = async (tk, mut) => { const st = await call('/api/state', tk); mut(st.json.state); return call('/api/state', tk, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
  const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  const fid = (await call('/api/state', ceo)).json.state.farms[0].id;
  assert.equal((await put(ceo, st => { const f = st.farms[0]; f.talhoes = farm().talhoes; f.labor = farm().labor; })).status, 200);
  const fiscal = async (u, pw) => { await call('/api/users', ceo, { username: u, name: u, email: u + '@example.invalid', password: s.password, role: 'contribuinte', function: 'Fiscal de colheita', allowedFarmId: fid, allowedActivity: 'coffee' }); let tk = (await call('/api/auth/login', '', { groupCode: '1001', username: u, password: s.password })).json.token; await call('/api/auth/change-password', tk, { currentPassword: s.password, newPassword: pw }); return (await call('/api/auth/login', '', { groupCode: '1001', username: u, password: pw })).json.token; };
  const norte = await fiscal('norte', 'Turma#Norte58'), sul = await fiscal('sul', 'Turma#Sul73');
  // Cada celular, sem saber do outro, manda a Ana no mesmo dia.
  assert.equal((await put(norte, st => st.farms[0].labor.entries.push({ id: 'n1', date: day(1), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 6 }))).status, 200);
  assert.equal((await put(sul, st => st.farms[0].labor.entries.push({ id: 's1', date: day(1), plotId: 't1', workerId: 'ana', kind: 'saco', bags: 6 }))).status, 200);
  const L = (await call('/api/state', ceo)).json.state.farms[0].labor;
  assert.deepEqual(H.duplicateGroups(L).map(g => g.entries.map(e => e.recordedBy)), [['norte', 'sul']]);
  const r = await put(ceo, st => st.farms[0].labor.closings.push({ id: 'k', weekStart: week, weekEnd: H.weekEnd(week), lines: [] }));
  assert.equal(r.status, 422); assert.match(r.json.error, /repetidos/);
});
