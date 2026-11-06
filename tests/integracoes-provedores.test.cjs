// 4.21 · WhatsApp (Meta Cloud API) e Open Finance (Pluggy) ligam sozinhos com as chaves no servidor; sem chave, nada muda.
// O "fetch" é trocado por um falso: nenhum teste chama a internet.
const test = require('node:test'), a = require('node:assert/strict');
const P = require('../integracoes-provedores.js');
const fresh = () => { delete require.cache[require.resolve('../integracoes-etapas.js')]; return require('../integracoes-etapas.js'); };
const resp = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json });

test('sem chaves, nenhum provedor liga', () => {
  const I = fresh(); a.deepEqual(P.configure(I, {}, () => { throw Error('não deve chamar'); }), []);
  a.equal(I.ready('whatsapp'), false); a.equal(I.ready('openfinance'), false); a.throws(() => I.get('openfinance'), /Open Finance/);
});

test('WhatsApp: modelo aprovado com fazenda e aviso, telefone só com dígitos', async () => {
  const I = fresh(), calls = [];
  P.configure(I, { WHATSAPP_TOKEN: 'tk-teste', WHATSAPP_PHONE_ID: '123456' }, async (url, opt) => { calls.push({ url, opt }); return resp(200, { messages: [{ id: 'wamid.1' }] }); });
  a.equal(I.ready('whatsapp'), true);
  const r = await I.get('whatsapp').send({ phone: '+55 (35) 99999-0000', template: 'rural_alert', parameters: { farm: 'Fazenda Boa Vista', message: 'Resumo da semana: 1 conta vence.' }, idempotencyKey: 'ev1' });
  a.equal(r.id, 'wamid.1');
  a.equal(calls[0].url, 'https://graph.facebook.com/v21.0/123456/messages');
  a.equal(calls[0].opt.headers.Authorization, 'Bearer tk-teste');
  const body = JSON.parse(calls[0].opt.body);
  a.equal(body.to, '5535999990000'); a.equal(body.type, 'template'); a.equal(body.template.name, 'rural_alert'); a.equal(body.template.language.code, 'pt_BR');
  a.deepEqual(body.template.components[0].parameters.map(p => p.text), ['Fazenda Boa Vista', 'Resumo da semana: 1 conta vence.']);
  await a.rejects(I.get('whatsapp').send({ phone: '9999', parameters: {} }), /Telefone do WhatsApp inválido/);
});

test('WhatsApp: recusa da Meta vira mensagem clara', async () => {
  const I = fresh(); P.configure(I, { WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_ID: '1' }, async () => resp(400, { error: { message: 'Template name does not exist' } }));
  await a.rejects(I.get('whatsapp').send({ phone: '5535999990000', parameters: {} }), /WhatsApp recusou o envio: Template name does not exist/);
});

test('Open Finance: chave da Pluggy reaproveitada; saídas negativas; formato do extrato OFX', async () => {
  const I = fresh(), urls = []; let auths = 0;
  P.configure(I, { PLUGGY_CLIENT_ID: 'id', PLUGGY_CLIENT_SECRET: 'sec' }, async (url, opt) => {
    urls.push(url);
    if (url.endsWith('/auth')) { auths++; a.deepEqual(JSON.parse(opt.body), { clientId: 'id', clientSecret: 'sec' }); return resp(200, { apiKey: 'k1' }); }
    a.equal(opt.headers['X-API-KEY'], 'k1');
    return resp(200, { page: 1, totalPages: 1, results: [
      { id: 't1', date: '2026-11-03T10:00:00.000Z', description: 'PIX RECEBIDO COOPERATIVA', amount: 1500, type: 'CREDIT' },
      { id: 't2', date: '2026-11-04T10:00:00.000Z', description: 'BOLETO AGRO LOJA', amount: 820.5, type: 'DEBIT' },
      { id: 't3', date: '2026-11-04T10:00:00.000Z', description: 'TARIFA', amount: -12.9, type: 'DEBIT' }] });
  });
  const acc = 'a658c848-e475-457b-8565-d1fffba127c4', of = I.get('openfinance');
  const rows = await of.transactions({ accountId: acc, from: '2026-10-06', to: '2026-11-05' });
  a.deepEqual(rows, [
    { date: '2026-11-03', description: 'PIX RECEBIDO COOPERATIVA', amount: 1500, fitid: 'pluggy:t1' },
    { date: '2026-11-04', description: 'BOLETO AGRO LOJA', amount: -820.5, fitid: 'pluggy:t2' },
    { date: '2026-11-04', description: 'TARIFA', amount: -12.9, fitid: 'pluggy:t3' }]);
  await of.transactions({ accountId: acc, from: '2026-10-06', to: '2026-11-05' });
  a.equal(auths, 1, 'a chave da Pluggy vale 2 horas: não pede de novo');
  a.match(urls[1], /\/transactions\?accountId=a658c848-e475-457b-8565-d1fffba127c4&from=2026-10-06&to=2026-11-05&pageSize=500&page=1$/);
  await a.rejects(of.transactions({ accountId: 'x', from: '2026-10-06', to: '2026-11-05' }), /código da conta/);
});

test('API do Open Finance: só o CEO; sem chave diz "não configurado"; conta inválida recusada', async () => {
  const { startServer } = require('./support/server.cjs');
  const s = await startServer({ PRICE_WATCH_HOURS: '0' });
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const farmId = (await call('/api/state', ceo)).json.state.farms[0].id;
    a.equal((await call('/api/expansion/capabilities', ceo)).json.openfinance, false);
    a.deepEqual((await call('/api/expansion/openfinance/transactions?farmId=' + farmId, ceo)).json, { configured: false, account: false, rows: [] });
    a.equal((await call('/api/expansion/openfinance/account', ceo, { farmId, accountId: 'nao-e-um-codigo' })).status, 422);
    a.equal((await call('/api/expansion/openfinance/account', ceo, { farmId: 'outra', accountId: '' })).status, 422);
    a.equal((await call('/api/expansion/openfinance/account', ceo, { farmId, accountId: 'a658c848-e475-457b-8565-d1fffba127c4' })).status, 200);
    // Com a conta guardada mas sem as chaves no servidor, a busca avisa que o Open Finance não está ligado.
    const r = await call('/api/expansion/openfinance/transactions?farmId=' + farmId, ceo); a.equal(r.status, 503); a.match(r.json.error, /Open Finance/);
    assert403: {
      a.equal((await call('/api/users', ceo, { username: 'adm9', name: 'ADM', email: 'adm9@example.invalid', password: s.password, role: 'adm' })).status, 200);
      let adm = (await call('/api/auth/login', '', { groupCode: '1001', username: 'adm9', password: s.password })).json.token;
      await call('/api/auth/change-password', adm, { currentPassword: s.password, newPassword: 'Adm#Campo582' });
      adm = (await call('/api/auth/login', '', { groupCode: '1001', username: 'adm9', password: 'Adm#Campo582' })).json.token;
      a.equal((await call('/api/expansion/openfinance/transactions?farmId=' + farmId, adm)).status, 403, 'ADM não busca extrato');
    }
  } finally { await s.stop(); }
});
