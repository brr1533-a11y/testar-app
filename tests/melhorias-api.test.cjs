// Melhorias 2027 pela API: push sem configuração manual, registros novos validados e protegidos por permissão,
// exportação, exclusão a pedido, aceite dos termos, métricas, backup e comparação anônima.
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto'), { startServer } = require('./support/server.cjs');
const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());

test('melhorias 2027 pela API', async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' });
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch (_) {} return { status: r.status, json, text }; };
    const put = async (tk, mut) => { const st = await call('/api/state', tk); mut(st.json.state); return call('/api/state', tk, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
    const login = async (groupCode, username, password) => (await call('/api/auth/login', '', { groupCode, username, password })).json?.token;
    const ceo = await login('1001', 'testceo', s.password);

    // Arquivos públicos e privados.
    for (const p of ['/melhorias.js', '/melhorias-domain.js', '/melhorias.css', '/termos', '/privacidade', '/platform-melhorias.js']) assert.equal((await call(p)).status, 200, p);
    for (const p of ['/melhorias-server.js', '/clima-openmeteo.js']) assert.equal((await call(p)).status, 404, p);

    // Push: chaves geradas uma vez e mantidas; assinatura de um aparelho aceita.
    const c1 = (await call('/api/expansion/capabilities', ceo)).json, c2 = (await call('/api/expansion/capabilities', ceo)).json;
    assert.equal(c1.push, true); assert.equal(c1.vapidPublicKey, c2.vapidPublicKey); assert.equal(c1.weather, false, 'clima desligado nos testes (sem internet)');
    const b64 = n => crypto.randomBytes(n).toString('base64url');
    assert.equal((await call('/api/expansion/push/subscribe', ceo, { subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/teste-' + b64(8), keys: { p256dh: b64(65), auth: b64(16) } } })).status, 200);
    assert.equal((await call('/api/expansion/push/subscribe', ceo, { subscription: { endpoint: 'https://exemplo.invalid/push', keys: { p256dh: b64(65), auth: b64(16) } } })).status, 422);

    // Registros novos: gravam pelo mesmo mecanismo e são validados no servidor.
    let r = await put(ceo, st => { const f = st.farms[0]; f.talhoes = [{ id: 't1', name: 'Talhão 1', areaHa: 5 }]; f.agriculture = { cycles: [{ id: 'c1', activity: 'coffee', crop: 'Café arábica', name: 'Safra', areaHa: 5, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: '2026-01-01', plotIds: ['t1'] }], harvests: [], sales: [] }; });
    assert.equal(r.status, 200, r.text);
    r = await put(ceo, st => { const e = st.farms[0].expansion ||= {}; e.partnerships = [{ id: 'p1', activity: 'coffee', date: today, partner: 'José', plotIds: ['t1'], productionShare: 50, costShare: 50, start: '2026-01-01', archived: false }]; e.loans = [{ id: 'l1', activity: 'coffee', date: '2026-01-10', name: 'Pronaf', kind: 'pronaf', principal: 50000, annualRate: 5, installments: 5, periodMonths: 12, system: 'sac', due: '2027-01-10', archived: false }]; e.taxSettings = [{ id: 'x1', activity: 'coffee', date: today, regime: 'pf', buyerWithholds: true, archived: false }]; });
    assert.equal(r.status, 200, r.text);
    let st = (await call('/api/state', ceo)).json.state;
    assert.equal(st.farms[0].expansion.loans[0].name, 'Pronaf'); assert.equal(st.farms[0].expansion.partnerships[0].partner, 'José');
    r = await put(ceo, st => { st.farms[0].expansion.partnerships.push({ id: 'p2', activity: 'coffee', date: today, partner: 'Outro', plotIds: ['nao-existe'], productionShare: 50, start: '2026-01-01', archived: false }); });
    assert.equal(r.status, 422); assert.match(r.json.error, /talhão/);

    // ADM sem a página de financiamentos não vê nem altera.
    assert.equal((await call('/api/users', ceo, { username: 'admx', name: 'ADM', email: 'admx@example.invalid', password: s.password, role: 'adm' })).status, 200);
    let adm = await login('1001', 'admx', s.password); await call('/api/auth/change-password', adm, { currentPassword: s.password, newPassword: 'Adm#Novo2027' }); adm = await login('1001', 'admx', 'Adm#Novo2027');
    st = (await call('/api/state', adm)).json.state; assert.deepEqual(st.farms[0].expansion.loans, []);
    r = await put(adm, st => { st.farms[0].expansion.loans = [{ id: 'l9', activity: 'coffee', date: today, name: 'Falsa', kind: 'outro', principal: 1, installments: 1, periodMonths: 12, system: 'unica', due: today, archived: false }]; });
    assert.equal(r.status, 200);
    assert.deepEqual((await call('/api/state', ceo)).json.state.farms[0].expansion.loans.map(l => l.name), ['Pronaf']);
    assert.equal((await call('/api/account/export', adm)).status, 403);

    // Exportação completa sem senhas.
    const exp = await call('/api/account/export', ceo);
    assert.equal(exp.status, 200); assert.equal(exp.json.format, 'gestao-rural-export'); assert.doesNotMatch(exp.text, /passwordHash|\$2[aby]\$/);
    assert.ok(exp.json.state.farms[0].expansion.loans.length);

    // Comparação anônima: sem fazendas suficientes, explica o motivo.
    const bench = await call('/api/expansion/benchmark?farmId=' + st.farms[0].id + '&activity=coffee', ceo);
    assert.equal(bench.status, 200); assert.equal(bench.json.available, false); assert.match(bench.json.reason, /três fazendas/);

    // Grupo inicial é protegido contra a exclusão a pedido.
    assert.equal((await call('/api/account/deletion', ceo, { password: s.password, confirmText: 'EXCLUIR', groupCode: '1001' })).status, 403);

    // Teste grátis: sem aceite não cria; com aceite, o registro fica no Grupo e o navegador não consegue mudar.
    const trial = { email: 'novo@example.invalid', groupName: 'Sítio Novo', ceoName: 'Dona', ceoUser: 'donasitio', ceoPassword: s.password, activities: ['coffee'] };
    assert.equal((await call('/api/public/trial', '', trial)).status, 400);
    const created = await call('/api/public/trial', '', { ...trial, acceptTerms: true }); assert.equal(created.status, 200, created.text);
    const code = created.json.group.code, owner = await login(code, 'donasitio', s.password);
    st = (await call('/api/state', owner)).json.state; assert.equal(st.termsAcceptance.version, '2026-10-30');
    r = await put(owner, st => { st.termsAcceptance = { version: 'falsa', at: '2000-01-01' }; }); assert.equal(r.status, 200);
    assert.equal((await call('/api/state', owner)).json.state.termsAcceptance.version, '2026-10-30');

    // Exclusão a pedido: senha e confirmação conferidas; agenda e pode cancelar.
    assert.equal((await call('/api/account/deletion', owner, { password: 'Errada#123', confirmText: 'EXCLUIR', groupCode: code })).status, 401);
    assert.equal((await call('/api/account/deletion', owner, { password: s.password, confirmText: 'apagar', groupCode: code })).status, 400);
    const del = await call('/api/account/deletion', owner, { password: s.password, confirmText: 'excluir', groupCode: code });
    assert.equal(del.status, 200); assert.ok(Date.parse(del.json.request.executeAfter) > Date.now() + 6 * 86400000);
    assert.ok((await call('/api/account/deletion', owner)).json.request);

    // Super Admin: métricas, pedidos de exclusão e backup com teste de restauração.
    await call('/api/metrics/page', owner, { page: 'resumo-dono' }); await call('/api/metrics/page', ceo, { page: 'resumo-dono' }); await call('/api/metrics/page', ceo, { page: '<script>' });
    const platform = (await call('/api/platform/auth/login', '', { email: 'admin@example.invalid', password: s.password })).json.token;
    const usage = (await call('/api/platform/usage', platform)).json; const row = usage.pages.find(p => p.page === 'resumo-dono');
    assert.equal(row.views, 2); assert.equal(row.groups, 2); assert.ok(!usage.pages.some(p => /script/.test(p.page)));
    assert.equal((await call('/api/platform/usage', ceo)).status, 401);
    const pending = (await call('/api/platform/deletions', platform)).json.pending; assert.ok(pending.some(p => p.code === code));
    assert.equal((await call('/api/account/deletion', owner, null, 'DELETE')).status, 200);
    assert.equal((await call('/api/account/deletion', owner)).json.request, null);
    const backup = await call('/api/platform/backups/run', platform, {});
    assert.equal(backup.status, 200, backup.text); assert.equal(backup.json.test.ok, true); assert.equal(backup.json.test.groups, 2);
    assert.equal((await call('/api/platform/backups', platform)).json.log[0].file, backup.json.file);
  } finally { await s.stop(); }
});

test('previsão do tempo fica ligada por padrão (Open-Meteo) e pede o município cadastrado', async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0', WEATHER_PROVIDER: 'open-meteo' });
  try {
    const call = async (p, token) => { const r = await fetch(s.url + p, { headers: token ? { Authorization: 'Bearer ' + token } : {} }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const token = (await (await fetch(s.url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupCode: '1001', username: 'testceo', password: s.password }) })).json()).token;
    assert.equal((await call('/api/expansion/capabilities', token)).json.weather, true);
    const fid = (await call('/api/state', token)).json.state.farms[0].id, r = await call('/api/expansion/weather?farmId=' + fid, token);
    assert.equal(r.status, 422); assert.match(r.json.error, /região da fazenda/);
  } finally { await s.stop(); }
});
