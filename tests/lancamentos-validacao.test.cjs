// 4.24 · O servidor recusa lixo no Financeiro, despesas, Estoque e Talhões (casos do "usuário bagunceiro"),
// mas não trava o grupo por causa de dado antigo que já estava gravado.
const test = require('node:test'), a = require('node:assert/strict'), { startServer } = require('./support/server.cjs');
const L = require('../lancamentos-domain.js');

test('regras: valor, data, tipo, descrição, id repetido, estoque e talhão', () => {
  const fin = o => ({ id: 'f1', activity: 'coffee', type: 'saida', value: 100, date: '2026-11-01', description: 'Adubo', ...o });
  const st = farm => ({ farms: [{ id: 'x', ...farm }] }), ok = farm => L.prepare(st({}), st(farm)), ruim = farm => a.throws(() => ok(farm), e => e.statusCode === 422, JSON.stringify(farm).slice(0, 120));
  ok({ finances: [fin()] });
  for (const o of [{ value: -500 }, { value: 'abc' }, { value: 1e300 }, { value: 0 }, { type: 'roubo' }, { date: '202620-01-01' }, { date: '2026-02-31' }, { date: '1900-01-01' }, { date: '2999-12-31' }, { description: 'x'.repeat(300001) }, { description: '     ' }]) ruim({ finances: [fin(o)] });
  ruim({ finances: [fin({ id: 'dup' }), fin({ id: 'dup', value: 5 })] });
  ruim({ stock: [{ id: 's', item: '   ', unit: '   ', quantity: 1 }] });
  ruim({ stock: [{ id: 's', item: 'Adubo', unit: 'sc', quantity: 1, min: -1 }] });
  ruim({ stock: [{ id: 's', item: 'Adubo', unit: 'sc', quantity: 1, unitCost: -3 }] });
  ok({ stock: [{ id: 's', item: 'Adubo', unit: 'sc', quantity: -5 }] }); // banho com falta deixa saldo negativo (anotado)
  ruim({ talhoes: [{ id: 't', name: 'T1', areaHa: -12 }] });
  ruim({ operations: { expenses: [{ id: 'e', amount: 1e300, date: '1900-01-01' }] } });
  // Dado antigo fora da regra continua gravando quando não muda.
  const antigo = { farms: [{ id: 'x', finances: [fin({ id: 'velho', description: '' })] }] };
  L.prepare(antigo, { farms: [{ id: 'x', finances: [fin({ id: 'velho', description: '' }), fin({ id: 'novo' })] }] });
});

test('API: lixo no Financeiro recebe 422 (o ADM passa pela mesma conferência); lançamento certo grava', async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' });
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const put = async (tk, mut) => { const st = await call('/api/state', tk); mut(st.json.state.farms[0]); return call('/api/state', tk, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const r = await put(ceo, f => { f.finances = [...(f.finances || []), { id: 'neg', activity: 'coffee', type: 'entrada', value: -99999, date: '2999-01-01', description: 'x' }]; });
    a.equal(r.status, 422); a.match(r.json.error, /Financeiro/);
    a.equal((await put(ceo, f => { f.finances = [...(f.finances || []), { id: 'bom', activity: 'coffee', type: 'entrada', value: 1500, date: '2026-11-01', description: 'Venda de café' }]; })).status, 200);
  } finally { await s.stop(); }
});
