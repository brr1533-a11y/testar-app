// 4.24 · Casos do "usuário bagunceiro": descrição só com espaços e valor gigante barrados na tela; diálogo recusado reabre
// com o que foi digitado; trocar de fazenda com formulário pela metade pergunta antes. Uso: node tests/bagunca-424-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const st = await call('/api/state', ceo); const f2 = JSON.parse(JSON.stringify(st.json.state.farms[0])); f2.id = 'fazenda-2'; f2.name = 'Fazenda Dois'; st.json.state.farms.push(f2);
    assert.equal((await call('/api/state', ceo, { state: st.json.state, baseRev: st.json.rev }, 'PUT')).status, 200);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), ceo);
    await page.goto(s.url + '/app');
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.evaluate(() => { activeFarmId = data.farms[0].id; localStorage.setItem(modeStorageKey(), 'coffee'); goToPage('financeiro'); });
    const form = page.locator('#financeForm'); await form.waitFor();
    const toast = () => page.evaluate(() => document.querySelector('#toast')?.textContent || '');
    const qtd = () => page.evaluate(() => activeFarm().finances.length), antes = await qtd();

    // 1. Descrição só com espaços: barrada antes de gravar.
    await form.locator('[name=type]').selectOption('entrada');
    await form.locator('[name=description]').fill('     '); await form.locator('[name=value]').fill('100');
    await form.locator('button.btn.primary').click();
    await page.waitForFunction(() => /só espaços não vale/.test(document.querySelector('#toast')?.textContent || ''));
    assert.equal(await qtd(), antes, 'nada gravado');
    // 2. Valor gigante (1e300): barrado.
    await form.locator('[name=description]').fill('Venda'); await form.locator('[name=value]').focus(); await form.locator('[name=value]').fill('1e300');
    await form.locator('button.btn.primary').click();
    // O formulário usa a validação do navegador: com o limite no campo, o próprio navegador barra (balão dele) e nada é enviado.
    await page.waitForTimeout(300);
    assert.equal(await form.locator('[name=value]').evaluate(el => el.validity.rangeOverflow), true, 'campo acusa valor acima do limite');
    assert.equal(await qtd(), antes, 'valor gigante não grava');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'tela não estoura no celular');

    // 3. Trocar de fazenda com o formulário pela metade: pergunta; "Cancelar" mantém a fazenda e o que foi digitado.
    await form.locator('[name=description]').fill('Meio preenchido');
    const fazendaAntes = await page.evaluate(() => activeFarmId);
    await page.locator('#farmSelect').selectOption('fazenda-2');
    const dlg = page.locator('.dlg-back:not(.closing) form'); await dlg.waitFor();
    assert.match(await dlg.textContent(), /Trocar de fazenda\?/);
    await dlg.locator('[data-dlg-cancel], button[type=button]').first().click();
    await page.waitForFunction(() => !document.querySelector('.dlg-back:not(.closing)'));
    assert.equal(await page.evaluate(() => activeFarmId), fazendaAntes);
    assert.equal(await form.locator('[name=description]').inputValue(), 'Meio preenchido', 'o que foi digitado continua');

    // 4. Documento com vencimento antes da data: o servidor/regra recusa e o diálogo REABRE com o que foi digitado.
    await page.evaluate(() => goToPage('documentos'));
    await page.locator('[data-x-new="documents"]').click();
    let d = page.locator('.dlg-back:not(.closing) form'); await d.waitFor();
    await d.locator('[name=name]').fill('CCIR 2026 com observação longa');
    await d.locator('[name=date]').fill('2026-06-01');
    if (await d.locator('[name=expires]').count()) await d.locator('[name=expires]').fill('2026-01-01');
    await d.locator('button[type=submit]').click();
    await page.waitForFunction(() => /inválid/i.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 8000 });
    d = page.locator('.dlg-back:not(.closing) form'); await d.waitFor({ timeout: 5000 });
    assert.equal(await d.locator('[name=name]').inputValue(), 'CCIR 2026 com observação longa', 'diálogo reaberto com o que foi digitado');
    assert.deepEqual(errors, []);
    console.log('PASS: espaços e valor gigante barrados na tela, troca de fazenda pergunta antes e diálogo recusado reabre preenchido.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
