// Sondas de segurança pela API, num servidor de teste isolado: arquivos internos, cabeçalhos, erros, login obrigatório,
// o que o funcionário recebe e grava, sessão depois de sair e isolamento entre Grupos.
const test = require('node:test'), assert = require('node:assert/strict'), { startServer } = require('./support/server.cjs');
const out = [], ok = (n, c, d = '') => { out.push(`${c ? 'OK   ' : 'FALHA'} ${n}${d ? ' — ' + d : ''}`); };
test('sondas de segurança pela API', async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' });
  try {
    const raw = (p, o = {}) => fetch(s.url + p, o);
    const call = async (p, token, body, method) => { const r = await raw(p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { status: r.status, json: j, text: t, headers: r.headers }; };
    // 1. Arquivos internos não podem ser servidos.
    const secret = ['/server.js', '/.env', '/.env.example', '/package.json', '/package-lock.json', '/.local-cloud.json', '/ia-server.js', '/melhorias-server.js', '/clima-openmeteo.js', '/tests/api.test.cjs', '/tests/support/server.cjs', '/node_modules/express/package.json', '/%2e%2e/server.js', '/assets/../server.js', '/SEGURANCA.md', '/.gitignore', '/tools/', '/.backups/', '/integracoes-etapas.js'];
    const leaked = []; for (const p of secret) { const r = await raw(p); const t = await r.text(); if (r.status === 200 && !/Página não encontrada/.test(t)) leaked.push(p + ' (' + r.status + ')'); }
    ok('Arquivos internos não são servidos', !leaked.length, leaked.join(', '));
    // 2. Cabeçalhos de proteção.
    const app = await raw('/app'), h = n => app.headers.get(n) || '';
    ok('CSP sem script inline', /script-src 'self'/.test(h('content-security-policy')) && !/script-src[^;]*'unsafe-inline'/.test(h('content-security-policy')), h('content-security-policy').slice(0, 120));
    ok('Bloqueia o site dentro de outro (frame-ancestors/X-Frame-Options)', /frame-ancestors 'self'|frame-ancestors 'none'/.test(h('content-security-policy')) || /DENY|SAMEORIGIN/i.test(h('x-frame-options')));
    ok('X-Content-Type-Options: nosniff', /nosniff/i.test(h('x-content-type-options')));
    ok('Referrer-Policy definido', !!h('referrer-policy'), h('referrer-policy'));
    ok('Não anuncia o Express (X-Powered-By)', !h('x-powered-by'), h('x-powered-by'));
    // 3. Erros não revelam detalhes internos.
    const bad = await raw('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"username":' });
    const badText = await bad.text(); ok('JSON quebrado não mostra pilha de erro', !/at \w+ \(|node_modules|\\server\.js|\/server\.js/.test(badText), bad.status + ' ' + badText.slice(0, 100));
    const big = await raw('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'a', password: 'x'.repeat(3_000_000) }) });
    ok('Corpo gigante é recusado', [400, 401, 413].includes(big.status), String(big.status));
    // 4. Sem login nada de dados.
    for (const p of ['/api/state', '/api/account', '/api/account/export', '/api/expansion/alerts', '/api/ai/status', '/api/platform/groups', '/api/platform/usage', '/api/platform/backups']) { const r = await call(p); if (![401, 403].includes(r.status)) ok('Sem login: ' + p, false, String(r.status)); }
    ok('Rotas de dados exigem login', true);
    // 5. Funcionário (contribuinte) não recebe dados de dinheiro, senhas ou outros usuários.
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const st = await call('/api/state', ceo); const fid = st.json.state.farms[0].id;
    const put = async (tk, mut) => { const g = await call('/api/state', tk); mut(g.json.state); return call('/api/state', tk, { state: g.json.state, baseRev: g.json.rev }, 'PUT'); };
    await put(ceo, x => { x.farms[0].finances = [{ id: 'f1', activity: 'coffee', type: 'entrada', category: 'Venda', description: 'Venda sigilosa', value: 99999, date: '2026-10-01' }]; });
    const made = await call('/api/users', ceo, { username: 'tratorista1', name: 'Tratorista', email: 't1@example.invalid', password: s.password, role: 'contribuinte', function: 'Tratorista', allowedFarmId: fid, allowedActivity: 'coffee' });
    let tk = (await call('/api/auth/login', '', { groupCode: '1001', username: 'tratorista1', password: s.password })).json?.token;
    await call('/api/auth/change-password', tk, { currentPassword: s.password, newPassword: 'Trator#Novo58' }); tk = (await call('/api/auth/login', '', { groupCode: '1001', username: 'tratorista1', password: 'Trator#Novo58' })).json?.token;
    const mine = await call('/api/state', tk), body = JSON.stringify(mine.json || {});
    ok('Funcionário criado e logado', made.status === 200 && !!tk, made.status + '');
    ok('Funcionário não vê valores do Financeiro', !/Venda sigilosa|99999/.test(body));
    ok('Funcionário não recebe hash de senha nem e-mails da equipe', !/passwordHash|\$2[aby]\$|test@example\.invalid/.test(body));
    // Funcionário tenta gravar no Financeiro e nos usuários: o servidor descarta.
    await put(tk, x => { x.farms[0].finances = [{ id: 'f2', activity: 'coffee', type: 'saida', value: 1, description: 'invasor', date: '2026-10-02' }]; (x.users || []).push({ id: 'hack', username: 'hacker', role: 'ceo', name: 'H' }); }).catch(() => null);
    const after = JSON.stringify((await call('/api/state', ceo)).json.state);
    ok('Funcionário não consegue gravar no Financeiro nem criar usuário', !/invasor|hacker/.test(after));
    // 6. Sair invalida a sessão.
    const t2 = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    await call('/api/auth/logout', t2, {}); ok('Depois de sair, a sessão não vale mais', (await call('/api/state', t2)).status === 401);
    // 7. Outro Grupo não enxerga este (isolamento).
    const trial = await call('/api/public/trial', '', { email: 'outro@example.invalid', groupName: 'Outro Grupo', ceoName: 'Outro', ceoUser: 'outroceo', ceoPassword: s.password, activities: ['coffee'], acceptTerms: true });
    const other = (await call('/api/auth/login', '', { groupCode: trial.json.group.code, username: 'outroceo', password: s.password })).json.token;
    const os2 = JSON.stringify((await call('/api/state', other)).json);
    ok('Outro Grupo não vê dados deste', !/Venda sigilosa|tratorista1/.test(os2));
    const exp = await call('/api/accountant/export/' + st.json.group?.id + '/' + fid, other); ok('Exportação do contador recusa sessão comum de outro Grupo', [401, 403].includes(exp.status), String(exp.status));
    const qr = await call('/api/coffee-studio/qr?farmId=' + fid + '&lotId=x', other); ok('QR do café recusa outro Grupo', [403, 404, 422].includes(qr.status), String(qr.status));
    const wq = await call('/api/labor/worker-qr?farmId=' + fid + '&workerId=x', other); ok('QR do colhedor recusa outro Grupo', [403, 404].includes(wq.status), String(wq.status));
    const falhas = out.filter(l => !l.startsWith('OK')); assert.deepEqual(falhas, [], falhas.join('\n'));
  } finally { await s.stop(); }
});
