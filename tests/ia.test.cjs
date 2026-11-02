const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAssistant, requestBody, answer } = require('../ia-server');
const { startServer } = require('./support/server.cjs');
const env = { AI_ENABLED: 'true', OPENAI_API_KEY: 'only-a-fake-key-for-mocked-tests', OPENAI_MODEL: 'model-test', AI_DAILY_REQUEST_LIMIT: '2' };
const q = { question: 'Preço do café em Minas?', mode: 'prices', consent: true };
const payload = { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Preço não confirmado. Fonte', annotations: [{ type: 'url_citation', url: 'https://example.com/cafe', title: 'Fonte', start_index: 22, end_index: 27 }] }] }] };

test('IA desligada não chama o provedor, mesmo com chave; exige modelo e grupo liberado', async () => {
  let calls = 0; const fetchImpl = async () => { calls++; throw Error('Não deveria chamar'); };
  for (const config of [{}, { ...env, AI_ENABLED: 'false' }, { ...env, OPENAI_MODEL: '' }, { ...env, AI_ALLOWED_GROUP_IDS: 'outro' }]) {
    const a = createAssistant({ env: config, fetchImpl });
    assert.equal(a.status('grupo').enabled, false);
    await assert.rejects(a.ask('grupo', q), e => e.statusCode === 503);
  }
  assert.equal(calls, 0);
});
test('IA envia só pergunta autorizada, não estado/token do usuário; busca obrigatória e sem armazenamento', async () => {
  let sent;
  const a = createAssistant({ env, fetchImpl: async (url, options) => { sent = { url, ...options, data: JSON.parse(options.body) }; return { ok: true, json: async () => payload }; } });
  const r = await a.ask('g', { ...q, state: { secret: 'nao-enviar' }, token: 'nao-enviar' });
  assert.equal(sent.url, 'https://api.openai.com/v1/responses');
  assert.equal(sent.data.store, false); assert.equal(sent.data.input, q.question);
  assert.equal(sent.data.tool_choice, 'required'); assert.equal(sent.data.max_tool_calls, 1);
  assert.equal(sent.data.tools[0].type, 'web_search'); assert.ok(sent.signal);
  assert.ok(!sent.body.includes('nao-enviar')); assert.equal(r.segments[0].citations[0].url, 'https://example.com/cafe');
  assert.equal(JSON.stringify(a.status('g')).includes(env.OPENAI_API_KEY), false);
});
test('IA valida consentimento/modo/tamanho e só aceita fonte segura nos preços', () => {
  for (const input of [{ ...q, consent: false }, { ...q, mode: 'execute' }, { ...q, question: '' }, { ...q, question: 'a'.repeat(2501) }]) assert.throws(() => requestBody(input, { model: 'test' }));
  assert.equal(requestBody({ ...q, mode: 'explain' }, { model: 'test' }).tools, undefined);
  const p = structuredClone(payload); p.output[0].content[0].annotations[0].url = 'javascript:alert(1)';
  assert.throws(() => answer(p, 'prices'), /fontes/);
  assert.throws(() => answer({ ...payload, status: 'incomplete' }, 'explain'), /concluída/);
});
test('IA limita chamadas simultâneas e totais diários; erros não vazam segredo nem repetem chamada', async () => {
  let now = new Date('2026-11-02T12:00:00Z'), resolve;
  const a = createAssistant({ env, clock: () => now, fetchImpl: () => new Promise(r => { resolve = r; }) });
  const first = a.ask('g', q);
  await assert.rejects(a.ask('g', q), e => e.statusCode === 429);
  resolve({ ok: true, json: async () => payload }); await first;
  const second = a.ask('other', q); resolve({ ok: false, status: 429 });
  await assert.rejects(second, e => e.statusCode === 429 && /créditos/.test(e.message));
  await assert.rejects(a.ask('g', q), /Limite diário/);
  now = new Date('2026-11-03T01:00:00Z'); assert.equal(a.status('g').usedToday, 0);
  const broken = createAssistant({ env, fetchImpl: async () => { throw Error('secret-value'); } });
  await assert.rejects(broken.ask('g', q), e => e.statusCode === 502 && !e.message.includes('secret-value'));
});
test('API IA: autenticação, acesso autenticado, padrão desligado e arquivos públicos sem módulo do servidor', async t => {
  const s = await startServer({ AI_ENABLED: 'false', OPENAI_API_KEY: '', OPENAI_MODEL: '' }); t.after(() => s.stop());
  const api = async (path, token = '', body) => {
    const r = await fetch(s.url + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, json: await r.json() };
  };
  assert.equal((await api('/api/ai/status')).status, 401);
  const ceo = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  assert.equal((await api('/api/ai/status', ceo)).json.enabled, false);
  assert.equal((await api('/api/ai/ask', ceo, q)).status, 503);
  assert.equal((await api('/api/users', ceo, { name: 'ADM teste', username: 'admaitest', email: 'adm-ai@example.invalid', password: s.password, role: 'adm' })).status, 200);
  const initial = (await api('/api/auth/login', '', { groupCode: '1001', username: 'admaitest', password: s.password })).json.token;
  await api('/api/auth/change-password', initial, { currentPassword: s.password, newPassword: s.password + 'X1' });
  const adm = (await api('/api/auth/login', '', { groupCode: '1001', username: 'admaitest', password: s.password + 'X1' })).json.token;
  assert.equal((await api('/api/ai/status', adm)).status, 200);
  assert.equal((await api('/api/ai/ask', adm, q)).status, 503);
  assert.equal((await fetch(s.url + '/ia.js')).status, 200);
  assert.equal((await fetch(s.url + '/ia-server.js')).status, 404);
  const sw = await (await fetch(s.url + '/campo-sw.js')).text(); assert.ok(sw.includes('/ia-assistente.js') && sw.includes('/ia.css'));
});
