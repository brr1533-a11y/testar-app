// 4.24.2 · Achados 7 e 13 do revisor: módulo desligado esconde também as telas acrescentadas por scripts carregados
// depois do filtro; o histórico acima do limite vai para o arquivo e o "Baixar histórico completo" traz tudo.
// Uso: node tests/modulos-historico-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;

    // 1. Histórico: 36 gravações de 60 lançamentos (o servidor registra até 60 por gravação) passam de 2.000 registros;
    //    os antigos vão para o arquivo e o histórico completo continua com todos.
    const put = async mutate => { const st = await call('/api/state', ceo); mutate(st.json.state); const r = await call('/api/state', ceo, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); assert.equal(r.status, 200, JSON.stringify(r.json)); };
    for (let n = 0; n < 36; n++) await put(state => { const f = state.farms[0]; f.finances = f.finances || []; for (let i = 0; i < 60; i++) f.finances.push({ id: `h${n}-${i}`, activity: 'coffee', type: 'saida', category: 'Outros', description: 'Teste ' + i, date: '2026-01-10', value: 1 }); });
    const full = await call('/api/audit/completo', ceo);
    assert.equal(full.status, 200);
    assert.ok(full.json.entries.length >= 2160, 'histórico completo com todos: ' + full.json.entries.length);
    assert.equal(new Set(full.json.entries.map(e => e.id)).size, full.json.entries.length, 'sem registro repetido');
    assert.ok((await call('/api/state', ceo)).json.state.audit.length <= 400, 'tela recebe só os recentes');

    // 2. Módulo desligado: "Ponto da equipe" (acrescentado por equipe.js, carregado depois do filtro) some do menu.
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), ceo);
    await page.goto(s.url + '/app');
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    const ids = await page.evaluate(() => { for (const f of data.farms) { f.expansion = f.expansion || {}; f.expansion.moduleSettings = [{ id: 'm-' + f.id, hidden: ['ponto-equipe'] }]; } return navItems().map(i => i[0]); });
    assert.ok(!ids.includes('ponto-equipe'), 'Ponto da equipe escondido');
    assert.ok(ids.includes('cargos-equipe'), 'o resto do módulo de equipe continua');
    assert.ok(await page.evaluate(() => mhNavAll().some(i => i[0] === 'ponto-equipe')), 'a tela de Módulos ainda oferece religar');
    // Página da Gestão escondida não abre nem por atalho.
    const aberta = await page.evaluate(() => { for (const f of data.farms) f.expansion.moduleSettings[0].hidden = ['ponto-equipe', 'contratos']; goToPage('contratos'); return currentPage; });
    assert.notEqual(aberta, 'contratos', 'Contratos escondido não abre por atalho');
    assert.deepEqual(errors, []);
    console.log('PASS: histórico antigo arquivado e baixável; módulo desligado esconde telas de scripts carregados depois.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
