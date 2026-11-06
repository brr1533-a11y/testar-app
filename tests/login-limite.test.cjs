// 4.23 · Limite de tentativas de login vale também numa rajada (antes só contava depois do bcrypt: 129 de 500 conferidas),
// e quem acerta a senha não gasta o limite da rede (escritório com várias pessoas na mesma internet).
const test = require('node:test'), a = require('node:assert/strict'), { startServer } = require('./support/server.cjs');

test('rajada de senhas erradas: no máximo 30 conferidas por rede; acertos não gastam o limite', async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' });
  try {
    const login = (username, password) => fetch(s.url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupCode: '1001', username, password }) }).then(r => r.status);
    // 40 logins certos seguidos: todos entram (acertos devolvem a contagem).
    for (let i = 0; i < 40; i++) a.equal(await login('testceo', s.password), 200, 'login certo ' + (i + 1));
    // Senha certa depois de alguns erros ainda entra.
    for (let i = 0; i < 3; i++) a.equal(await login('testceo', 'Errada#123'), 401);
    a.equal(await login('testceo', s.password), 200);
    // Rajada de 60 senhas erradas com usuários diferentes (para bater no limite da rede, 30).
    const r = await Promise.all(Array.from({ length: 60 }, (_, i) => login('naoexiste' + i, 'Errada#123')));
    const conferidas = r.filter(x => x === 401).length, bloqueadas = r.filter(x => x === 429).length;
    a.ok(conferidas <= 30, `no máximo 30 conferidas (foram ${conferidas})`);
    a.equal(conferidas + bloqueadas, 60);
  } finally { await s.stop(); }
});
