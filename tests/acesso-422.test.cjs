// 4.22 · Esqueci o código do Grupo (resposta igual para todo e-mail) e erro de JSON sem mensagem técnica.
const test = require('node:test'), a = require('node:assert/strict'), { startServer } = require('./support/server.cjs');

test('esqueci o código do Grupo: mesma resposta para e-mail cadastrado ou não; e-mail inválido recusado', async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' });
  try {
    const post = async (p, body, raw) => { const r = await fetch(s.url + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ?? JSON.stringify(body) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const ceo = (await post('/api/auth/login', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const st = await fetch(s.url + '/api/state', { headers: { Authorization: 'Bearer ' + ceo } }).then(r => r.json());
    const email = st.state.users.find(u => u.role === 'ceo').email;
    const cadastrado = await post('/api/auth/group-code-reminder', { email }), desconhecido = await post('/api/auth/group-code-reminder', { email: 'ninguem@example.invalid' });
    a.equal(cadastrado.status, 200); a.equal(desconhecido.status, 200);
    a.equal(cadastrado.json.message, desconhecido.json.message, 'não revela se o e-mail existe');
    a.equal((await post('/api/auth/group-code-reminder', { email: 'nao-e-email' })).status, 400);
    // JSON malformado: 400 com mensagem simples, sem o texto técnico do leitor de JSON.
    const ruim = await post('/api/auth/login', null, '{bad json');
    a.equal(ruim.status, 400); a.equal(ruim.json.error, 'Dados enviados em formato inválido.');
  } finally { await s.stop(); }
});
