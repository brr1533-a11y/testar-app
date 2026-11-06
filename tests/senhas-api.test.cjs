// 4.23 · Rotas de senha (antes sem teste): recuperação por código com 5 tentativas, sessões antigas encerradas ao trocar,
// e troca da senha de outra pessoa só pelo CEO. (A rota aceita um pedido de código por pessoa por minuto.)
const test = require('node:test'), a = require('node:assert/strict'), { startServer } = require('./support/server.cjs');

test('recuperação de senha: código troca a senha e derruba a sessão antiga; 5 erros queimam o código; ADM não troca senha alheia', async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' });
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const pede = async (username, email) => { const antes = s.logs().length; a.equal((await call('/api/auth/password-reset/request', '', { groupCode: '1001', username, email })).status, 200);
      const re = new RegExp('recuperação para ' + username + ' \\(Grupo 1001\\): (\\d{6})');
      for (let i = 0; i < 60; i++) { const m = s.logs().slice(antes).match(re); if (m) return m[1]; await new Promise(r => setTimeout(r, 50)); } throw Error('código não apareceu no log para ' + username); };
    const confirma = (username, email, code, newPassword) => call('/api/auth/password-reset/confirm', '', { groupCode: '1001', username, email, code, newPassword });

    let ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    a.equal((await call('/api/users', ceo, { username: 'adm7', name: 'ADM', email: 'adm7@example.invalid', password: s.password, role: 'adm' })).status, 200);
    const eu = (await call('/api/state', ceo)).json.state.users.find(u => u.username === 'testceo');
    a.ok(eu.email, 'o CEO tem e-mail de recuperação');

    // CEO: código certo (depois de 4 erros) troca a senha e encerra a sessão aberta antes.
    const nova = 'Nova#Senha' + Date.now().toString().slice(-6), c1 = await pede('testceo', eu.email), errado = c1 === '000000' ? '111111' : '000000';
    for (let i = 0; i < 4; i++) a.equal((await confirma('testceo', eu.email, errado, nova)).status, 400);
    a.equal((await confirma('testceo', eu.email, c1, nova)).status, 200, 'na 5ª tentativa o código certo ainda vale');
    a.equal((await call('/api/state', ceo)).status, 401, 'a sessão aberta antes da troca é encerrada');
    a.equal((await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).status, 401, 'senha antiga não entra');
    ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: nova })).json.token;
    a.ok(ceo, 'senha nova entra');

    // ADM: 5 códigos errados queimam o código; depois nem o certo vale.
    const c2 = await pede('adm7', 'adm7@example.invalid'), errado2 = c2 === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) a.equal((await confirma('adm7', 'adm7@example.invalid', errado2, 'Outra#Senha123')).status, 400);
    a.equal((await confirma('adm7', 'adm7@example.invalid', c2, 'Outra#Senha123')).status, 400, 'código queimado depois de 5 erros');

    // ADM não troca a senha de outra pessoa.
    let adm = (await call('/api/auth/login', '', { groupCode: '1001', username: 'adm7', password: s.password })).json.token;
    await call('/api/auth/change-password', adm, { currentPassword: s.password, newPassword: 'Adm#Campo582' });
    adm = (await call('/api/auth/login', '', { groupCode: '1001', username: 'adm7', password: 'Adm#Campo582' })).json.token;
    a.equal((await call('/api/users/' + eu.id + '/password', adm, { password: 'Tomei#Conta123' }, 'PATCH')).status, 403);
  } finally { await s.stop(); }
});
