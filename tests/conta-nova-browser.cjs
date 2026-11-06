// 4.22 · Primeira impressão da conta nova (celular): login sem Grupo de outro cliente, "Esqueci o código do Grupo",
// fazenda com o nome digitado, pergunta "Como é a sua fazenda?" (menu enxuto) e tela vazia sem alertas falsos.
// Uso: node tests/conta-nova-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const post = async (p, body) => { const r = await fetch(s.url + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const criado = await post('/api/public/trial', { email: 'sitio@example.invalid', groupName: 'Sítio Boa Água', ceoName: 'Dona Rita', ceoUser: 'donarita', ceoPassword: s.password, activities: ['coffee'], acceptTerms: true });
    assert.equal(criado.status, 200, JSON.stringify(criado.json));
    const codigo = criado.json.group.code;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));

    // Aparelho novo: o código do Grupo vem vazio (antes vinha "1001", de outro cliente).
    await page.goto(s.url + '/app'); await page.locator('#loginGroup').waitFor();
    assert.equal(await page.locator('#loginGroup').inputValue(), '');
    assert.equal(await page.locator('#forgotGroupBtn').isVisible(), true, 'botão Esqueci o código do Grupo');

    // Entra como a dona do sítio.
    const login = await post('/api/auth/login', { groupCode: codigo, username: 'donarita', password: s.password });
    await page.evaluate(t => sessionStorage.setItem('gestaoRuralToken', t), login.json.token);
    await page.goto(s.url + '/app');
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    assert.equal(await page.evaluate(() => data.farms[0].name), 'Sítio Boa Água', 'a fazenda tem o nome digitado no cadastro');

    // Primeira vez numa fazenda vazia: pergunta o modelo; escolher "Café familiar" tira páginas do menu.
    const dlg = page.locator('.dlg-back:not(.closing) form');
    await dlg.waitFor({ timeout: 8000 });
    assert.match(await dlg.textContent(), /Como é a sua fazenda\?/);
    const antes = await page.evaluate(() => navItems().length);
    await dlg.locator('[name=modelo]').selectOption('cafe-familiar');
    await dlg.locator('button[type=submit]').click();
    await page.waitForFunction(() => (activeFarm().expansion?.moduleSettings || []).some(r => r.template === 'cafe-familiar') && !hasLocalChanges(), null, { timeout: 15000 });
    const depois = await page.evaluate(() => navItems().length);
    assert.ok(depois < antes, `menu mais curto: ${antes} → ${depois}`);
    // Não pergunta de novo.
    await page.evaluate(() => renderPage({ animate: false })); await page.waitForTimeout(600);
    assert.equal(await page.locator('.dlg-back:not(.closing)').count(), 0, 'pergunta só uma vez');

    // Tela vazia: "Comece por aqui", sem "caixa positivo", sem alerta de combustível e sem histórico zerado.
    await page.evaluate(() => goToPage('dashboard')); await page.locator('.hero-surface').waitFor();
    const texto = await page.locator('#pageContent').textContent();
    assert.match(texto, /Comece por aqui/);
    assert.doesNotMatch(texto, /caixa positivo/);
    assert.doesNotMatch(texto, /combustível abaixo do limite|Abaixo do mínimo · repor combustível/);
    assert.equal(await page.locator('.equipment-fuel-chart').count(), 0, 'sem histórico de combustível zerado');
    assert.deepEqual(errors, []);
    console.log('PASS: conta nova sem Grupo alheio no login, com "Esqueci o código", nome da fazenda, modelo da fazenda e tela vazia honesta.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
