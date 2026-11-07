// 4.24.1 · Restos do "usuário bagunceiro": diálogo da Gestão recusado reabre com o que foi digitado; o Voltar do
// celular fecha o diálogo sem sair do sistema; no Financeiro a categoria acompanha o tipo. Uso: node tests/bagunca-4241-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const r = await fetch(s.url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupCode: '1001', username: 'testceo', password: s.password }) });
    const ceo = (await r.json()).token;
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), ceo);
    await page.goto(s.url + '/app');
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.evaluate(() => { activeFarmId = data.farms[0].id; localStorage.setItem(modeStorageKey(), 'coffee'); goToPage('financeiro'); });

    // 1. Categoria acompanha o tipo.
    const form = page.locator('#financeForm'); await form.waitFor();
    await form.locator('[name=type]').selectOption('saida');
    assert.doesNotMatch(await form.locator('[name=category]').inputValue(), /^Venda/, 'despesa não fica com "Venda de café"');
    await form.locator('[name=type]').selectOption('entrada');
    assert.match(await form.locator('[name=category]').inputValue(), /^Venda/, 'entrada volta para venda');

    // 2. Conta a pagar recusada: o diálogo reabre com o que foi digitado.
    await page.evaluate(() => { const orig = FarmManagement.validateFarm; FarmManagement.validateFarm = function () { FarmManagement.validateFarm = orig; throw new Error('Recusado no teste.'); }; goToPage('financeiro-gestao'); });
    await page.locator('#gNewPayable').click();
    let d = page.locator('.dlg-back:not(.closing) form'); await d.waitFor();
    await d.locator('[name=supplier]').fill('Agro Bagunça'); await d.locator('[name=description]').fill('Adubo'); await d.locator('[name=amount]').fill('250');
    await d.locator('button[type=submit]').click();
    await page.waitForFunction(() => /Recusado no teste/.test(document.querySelector('#toast')?.textContent || ''));
    d = page.locator('.dlg-back:not(.closing) form'); await d.waitFor();
    assert.equal(await d.locator('[name=supplier]').inputValue(), 'Agro Bagunça', 'reabriu com o fornecedor');
    assert.equal(await d.locator('[name=amount]').inputValue(), '250', 'reabriu com o valor');
    await d.locator('button[type=submit]').click();
    await page.waitForFunction(() => /Conta a pagar registrada/.test(document.querySelector('#toast')?.textContent || ''));
    assert.equal(await page.evaluate(() => activeFarm().management.payables.filter(p => p.supplier === 'Agro Bagunça').length), 1, 'gravou uma vez só');

    // 3. Voltar com diálogo aberto fecha o diálogo e continua no sistema; diálogo fechado normalmente não deixa entrada sobrando.
    const len = await page.evaluate(() => history.length);
    await page.locator('#gNewPayable').click(); await page.locator('.dlg-back:not(.closing) form').waitFor();
    await page.goBack();
    await page.waitForFunction(() => !document.querySelector('.dlg-back:not(.closing)'));
    assert.ok(await page.locator('#gNewPayable').isVisible(), 'continua na tela de contas');
    await page.locator('#gNewPayable').click(); d = page.locator('.dlg-back:not(.closing) form'); await d.waitFor();
    await d.locator('[data-dlg-cancel]').click();
    await page.waitForFunction(() => !document.querySelector(".dlg-back:not(.closing)") && !history.state?.dlg, null, { polling: 100 });
    assert.ok(await page.evaluate(() => location.pathname === '/app'), 'segue no /app');
    assert.ok(await page.evaluate(l => history.length <= l + 1, len), 'histórico não cresce a cada diálogo');
    assert.deepEqual(errors, []);
    console.log('PASS: categoria segue o tipo, diálogo recusado reabre preenchido e Voltar fecha o diálogo.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
