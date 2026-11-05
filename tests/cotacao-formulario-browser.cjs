// 4.19.1 · A cotação do café chega depois da tela. Se chegar com o formulário do Financeiro meio preenchido,
// não pode apagar o que foi digitado (antes a tela inteira era redesenhada). Uso: node tests/cotacao-formulario-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const r = await fetch(s.url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupCode: '1001', username: 'testceo', password: s.password }) });
    const ceo = (await r.json()).token;
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // Segura a cotação até o teste mandar soltar.
    let release; const held = new Promise(res => { release = res; }); let calls = 0;
    await page.route('**/api/cotacao-cafe', async route => { calls++; if (calls > 1) return route.fulfill({ json: { brlPerSaca: 1500, source: 'teste' } }); await held; await route.fulfill({ json: { brlPerSaca: 1500, source: 'teste' } }); });
    await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), ceo);
    await page.goto(s.url + '/app');
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.evaluate(() => { activeFarmId = data.farms[0].id; localStorage.setItem(modeStorageKey(), 'coffee'); goToPage('financeiro'); refreshQuote(); });
    const form = page.locator('#financeForm'); await form.waitFor();
    await form.locator('[name=type]').selectOption('saida'); await form.locator('[name=description]').fill('Conserto da bomba'); await form.locator('[name=value]').fill('320');
    await form.locator('[name=supplier]').fill('Oficina Silva'); await form.locator('[name=costCenter]').selectOption('geral');
    // Saiu do campo (clicou fora), mas não salvou ainda: a cotação chega agora.
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    release(); await page.waitForFunction(() => typeof quote !== 'undefined' && quote && quote.brlPerSaca === 1500);
    await page.waitForTimeout(700);
    assert.equal(await form.locator('[name=description]').inputValue(), 'Conserto da bomba', 'o que foi digitado continua lá');
    assert.equal(await form.locator('[name=value]').inputValue(), '320'); assert.equal(await form.locator('[name=costCenter]').inputValue(), 'geral');
    await form.locator('button.btn.primary').click();
    await page.waitForFunction(() => activeFarm().finances.length === 1 && !hasLocalChanges(), null, { timeout: 15000 });
    assert.equal(await page.evaluate(() => activeFarm().finances[0].description), 'Conserto da bomba');
    assert.deepEqual(errors, []);
    console.log('PASS: a cotação que chega atrasada não apaga o formulário do Financeiro.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
