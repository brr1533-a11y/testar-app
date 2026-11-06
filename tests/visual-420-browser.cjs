// 4.20 · Ajustes da crítica de design no celular e no computador: título único, seletor de fazenda visível, barra de baixo
// com ícones e nomes curtos, Visão geral com dinheiro primeiro, cotação legível e Financeiro abrindo no mês com movimento.
// Uso: node tests/visual-420-browser.cjs
// Obs.: page.evaluate/$$eval são do Playwright e rodam só no navegador de teste; não há eval() de texto aqui.
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const mesAnterior = (() => { const [y, m] = hoje.split('-').map(Number); return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7); })();
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const st = await call('/api/state', ceo), f = st.json.state.farms[0];
    f.finances = [{ id: 'v1', activity: 'coffee', type: 'entrada', category: 'Venda', description: 'Venda de café', value: 9000, date: mesAnterior + '-10' }];
    assert.equal((await call('/api/state', ceo, { state: st.json.state, baseRev: st.json.rev }, 'PUT')).status, 200);
    const abre = async (viewport, extra = {}) => {
      const ctx = await browser.newContext({ viewport, ...extra }), page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), ceo);
      await page.goto(s.url + '/app');
      await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
      await page.evaluate(() => { activeFarmId = data.farms[0].id; localStorage.setItem(modeStorageKey(), 'coffee'); });
      return { ctx, page, errors };
    };

    // Celular
    const cel = await abre({ width: 390, height: 844 }, { isMobile: true, hasTouch: true });
    let p = cel.page;
    await p.evaluate(() => goToPage('dashboard')); await p.locator('.grid.kpis .card').first().waitFor();
    const sel = await p.locator('.topbar .farm-switcher').boundingBox();
    assert.ok(sel && sel.height >= 36, 'seletor de fazenda visível no celular: ' + JSON.stringify(sel));
    assert.match(await p.locator('.grid.kpis .card').first().textContent(), /Resultado acumulado/, 'Visão geral começa pelo dinheiro');
    const nav = await p.$$eval('.nav-btn:not(.menu-layout-btn)', bs => bs.filter(b => b.offsetParent).map(b => ({ label: b.querySelector('.nav-label')?.textContent, icon: b.querySelector('svg')?.innerHTML })));
    assert.ok(nav.length >= 4, 'barra de baixo com atalhos');
    assert.equal(new Set(nav.map(n => n.icon)).size, nav.length, 'um ícone diferente por item: ' + nav.map(n => n.label).join(', '));
    for (const n of nav) assert.ok(n.label.length <= 11, 'nome curto na barra: ' + n.label);
    // Tela sem nome curto na lista: usa a primeira palavra (corta no espaço, não na letra "s").
    assert.equal(await p.evaluate(() => navShort('tela-nova', 'Desempenho e manejos')), 'Desempenho');
    await p.evaluate(() => goToPage('fluxo-caixa')); await p.locator('#mhCenario').waitFor();
    assert.equal(await p.locator('#pageContent > header.exp-head h2').isVisible(), false, 'título não se repete dentro da página');
    assert.equal(await p.locator('#pageTitle').textContent(), 'Fluxo de caixa projetado');
    assert.match(await p.locator('#mhCenario [name=price]').inputValue(), /^(\d+(\.\d{1,2})?)?$/, 'preço com no máximo 2 casas');
    const simular = await p.locator('#mhCenario .mh-simular').boundingBox();
    assert.ok(simular.height <= 46, 'botão Simular do tamanho das caixas');
    assert.deepEqual(cel.errors, []); await cel.ctx.close();

    // Computador: Financeiro abre no último mês com movimento e avisa
    const pc = await abre({ width: 1366, height: 820 });
    p = pc.page;
    await p.evaluate(() => goToPage('financeiro')); await p.locator('.finance-month-note').waitFor();
    assert.match(await p.locator('.finance-month-note').textContent(), /Sem lançamentos em .* Mostrando .*último mês com movimento/);
    assert.match(await p.locator('#pageContent').textContent(), /9\.000,00/);
    // Trocar o mês à mão continua valendo (o ajuste automático é só na primeira vez)
    await p.evaluate(() => goToPage('dashboard')); await p.evaluate(() => goToPage('financeiro'));
    assert.equal(await p.locator('.finance-month-note').count(), 0, 'aviso aparece só uma vez');
    const corTexto = await p.evaluate(() => { const el = document.querySelector('.quote-card .kpi-value'); return el ? getComputedStyle(el).color : null; });
    if (corTexto) assert.equal(corTexto, 'rgb(31, 26, 16)', 'cotação com texto escuro sobre o dourado');
    assert.deepEqual(pc.errors, []); await pc.ctx.close();
    console.log('PASS: título único, seletor visível, barra de baixo com ícones e nomes curtos, dinheiro primeiro, Financeiro no mês com movimento.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
