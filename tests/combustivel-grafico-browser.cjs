// 4.18.1 · Histórico de combustível: o mês é escolhido arrastando direto no gráfico (sem controle deslizante),
// sem caixa de foco no toque. Celular e computador. Uso: node tests/combustivel-grafico-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    for (const [w, h, touch] of [[390, 844, true], [1280, 900, false]]) {
      const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch }), page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), ceo);
      await page.goto(s.url + '/app');
      await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
      // Entra pela navegação (como a pessoa): chamar renderEquipmentAdmin() direto deixava currentPage na Visão geral, e a cotação
      // que chega depois redesenhava a Visão geral por cima do gráfico (falhava sob carga: 5 em 18).
      await page.evaluate(() => { activeFarmId = data.farms[0].id; localStorage.setItem(modeStorageKey(), 'coffee'); goToPage('equipamentos'); });
      await page.waitForLoadState('networkidle');
      const svg = page.locator('.equipment-fuel-chart .js-linha');
      await svg.waitFor();
      assert.equal(await page.locator('#fuelMonthCursor, .fuel-chart-reader').count(), 0, 'sem o controle deslizante');
      const out = page.locator('.fuel-chart-readout output'), last = await out.textContent();
      assert.match(last, /\d{2}\/\d{4} · .* L/);
      await svg.scrollIntoViewIfNeeded();
      const box = await svg.boundingBox(), y = box.y + box.height / 2;
      // Toque/clique no início do gráfico: primeiro mês; arrastar até o meio muda o mês.
      if (touch) await page.touchscreen.tap(box.x + 2, y); else await page.mouse.click(box.x + 2, y);
      const first = await out.textContent(); assert.notEqual(first, last, 'o toque escolhe outro mês');
      await page.mouse.move(box.x + 2, y); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2, y, { steps: 6 }); await page.mouse.up();
      const mid = await out.textContent(); assert.notEqual(mid, first, 'arrastar muda o mês');
      assert.equal(await page.locator('.equipment-fuel-chart .ponto.ativo').count(), 1);
      // Sem caixa de foco depois de tocar.
      const style = await svg.evaluate(el => { const c = getComputedStyle(el); return [c.outlineStyle, c.boxShadow]; });
      assert.deepEqual(style, ['none', 'none']);
      // Teclado continua funcionando.
      await svg.focus(); await page.keyboard.press('End'); assert.equal(await out.textContent(), last);
      await page.keyboard.press('ArrowLeft'); assert.notEqual(await out.textContent(), last);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS: mês do combustível escolhido direto no gráfico (toque, arrasto e teclado), sem controle deslizante e sem caixa de foco.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
