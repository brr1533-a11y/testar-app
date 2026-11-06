// 4.21.1 · Open Finance: a conta da Pluggy fica presa ao primeiro grupo que a registra. Outro grupo não pode registrar o mesmo
// código nem ler o extrato com ele (as credenciais do servidor leem qualquer conta conectada). Revisão de segurança da 4.21.
const test = require('node:test'), a = require('node:assert/strict'), { startServer } = require('./support/server.cjs');
const CONTA = 'a658c848-e475-457b-8565-d1fffba127c4';

test('outro grupo não registra a conta do banco de um grupo nem lê o extrato dela', async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' });
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    // Grupo A (1001, do servidor de teste)
    const ceoA = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const fazendaA = (await call('/api/state', ceoA)).json.state.farms[0].id;
    // Grupo B, criado pelo Super Admin no plano Profissional (tem Conciliação bancária)
    const admin = (await call('/api/platform/auth/login', '', { email: 'admin@example.invalid', password: s.password })).json.token;
    const criado = await call('/api/platform/groups', admin, { groupName: 'Grupo B · teste Open Finance', ceoName: 'CEO B', ceoEmail: 'ceob@example.invalid', ceoUser: 'ceob', ceoPassword: s.password, plan: 'pro', activities: ['coffee'] });
    a.equal(criado.status, 200, JSON.stringify(criado.json));
    const codigoB = criado.json.group.code;
    let ceoB = (await call('/api/auth/login', '', { groupCode: codigoB, username: 'ceob', password: s.password })).json?.token;
    a.ok(ceoB, 'CEO do grupo B entra');
    const novaSenha = 'Ceo#Grupo' + Date.now().toString().slice(-5);
    const troca = await call('/api/auth/change-password', ceoB, { currentPassword: s.password, newPassword: novaSenha });
    if (troca.status === 200) ceoB = (await call('/api/auth/login', '', { groupCode: codigoB, username: 'ceob', password: novaSenha })).json.token;
    const fazendaB = (await call('/api/state', ceoB)).json.state.farms[0].id;

    // A registra a conta; B tenta registrar a mesma conta: recusado.
    a.equal((await call('/api/expansion/openfinance/account', ceoA, { farmId: fazendaA, accountId: CONTA })).status, 200);
    const tentativa = await call('/api/expansion/openfinance/account', ceoB, { farmId: fazendaB, accountId: CONTA.toUpperCase() });
    a.equal(tentativa.status, 409, 'mesma conta (mesmo em maiúsculas) não entra em outro grupo');
    a.match(tentativa.json.error, /outro grupo/);
    // B não ficou com a conta guardada: a busca diz que não há conta.
    a.equal((await call('/api/expansion/openfinance/transactions?farmId=' + fazendaB, ceoB)).json.account, false);
    // A troca para outra conta: a primeira fica livre e B consegue registrá-la.
    a.equal((await call('/api/expansion/openfinance/account', ceoA, { farmId: fazendaA, accountId: 'b658c848-e475-457b-8565-d1fffba127c4' })).status, 200);
    a.equal((await call('/api/expansion/openfinance/account', ceoB, { farmId: fazendaB, accountId: CONTA })).status, 200, 'conta liberada por A pode ser usada por B');
    // E agora A não consegue voltar para ela.
    a.equal((await call('/api/expansion/openfinance/account', ceoA, { farmId: fazendaA, accountId: CONTA })).status, 409);
  } finally { await s.stop(); }
});
