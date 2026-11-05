// 4.18 · Centro de custo na saída (obrigatório, com sugestão pelo fornecedor), baixa dos insumos da ordem de serviço
// (uma vez só) e mínimo de estoque pelo consumo, liberado só depois de conferir o saldo físico.
// Uso: node tests/custos-estoque-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
const T = new Date().toISOString().slice(0, 10);
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const st = await call('/api/state', ceo), ceoId = st.json.state.users.find(u => u.role === 'ceo').id, f0 = st.json.state.farms[0];
    f0.agriculture = { cycles: [{ id: 'c1', activity: 'coffee', crop: 'Café arábica', name: 'Safra 26/27', areaHa: 10, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: '2026-01-01' }], harvests: [], sales: [] };
    f0.stock = [{ id: 's1', activity: 'coffee', item: 'Adubo 20-05-20', category: 'Adubo', unit: 'sc', quantity: 40, min: 5, unitCost: 180 }];
    f0.expansion ||= {}; f0.expansion.workOrders = [{ id: 'os1', activity: 'coffee', date: T, title: 'Adubar o Talhão 1', assignee: ceoId, due: T, cycleId: 'c1', notes: '', archived: false }];
    f0.expansion.workOrderEvents = [{ id: 'ev1', activity: 'coffee', date: T, orderId: 'os1', status: 'done', notes: '', archived: false }];
    const saved = await call('/api/state', ceo, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); assert.equal(saved.status, 200, JSON.stringify(saved.json));

    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), ceo);
    await page.goto(s.url + '/app');
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.evaluate(() => { activeFarmId = data.farms[0].id; localStorage.setItem(modeStorageKey(), 'coffee'); goToPage('financeiro'); });
    const form = page.locator('#financeForm'); await form.waitFor();
    const toast = () => page.evaluate(() => document.querySelector('#toast')?.textContent || '');
    const fill = async (desc, value) => { await form.locator('[name=type]').selectOption('saida'); await form.locator('[name=description]').fill(desc); await form.locator('[name=value]').fill(value); };

    // 1. Saída sem centro de custo é barrada; com a safra, grava fornecedor e destino.
    await fill('Adubo de cobertura', '900'); await form.locator('[name=supplier]').fill('Agro Loja');
    await form.locator('button.btn.primary').click();
    await page.waitForFunction(() => /centro de custo/.test(document.querySelector('#toast')?.textContent || ''));
    assert.equal(await page.evaluate(() => activeFarm().finances.length), 0, 'sem centro de custo não grava');
    await form.locator('[name=costCenter]').selectOption('cycle:c1'); await form.locator('button.btn.primary').click();
    await page.waitForFunction(() => activeFarm().finances.length === 1 && !hasLocalChanges());
    let fin = (await call('/api/state', ceo)).json.state.farms[0].finances;
    assert.deepEqual([fin[0].supplier, fin[0].costCenter, fin[0].cycleId], ['Agro Loja', 'cycle:c1', 'c1']);
    // 2. Mesmo fornecedor (escrito diferente): o centro de custo já vem sugerido.
    await page.evaluate(() => goToPage('financeiro')); await form.waitFor();
    await fill('Mais adubo', '450'); await form.locator('[name=supplier]').fill('agro loja'); await form.locator('[name=supplier]').blur();
    assert.equal(await form.locator('[name=costCenter]').inputValue(), 'cycle:c1');
    assert.match(await form.locator('.cost-center-hint').textContent(), /Sugerido pelo último gasto/);
    await form.locator('button.btn.primary').click(); await page.waitForFunction(() => activeFarm().finances.length === 2 && !hasLocalChanges());
    // Uma saída Geral.
    await page.evaluate(() => goToPage('financeiro')); await form.waitFor();
    await fill('Energia', '300'); await form.locator('[name=costCenter]').selectOption('geral'); await form.locator('button.btn.primary').click();
    await page.waitForFunction(() => activeFarm().finances.length === 3 && !hasLocalChanges());
    fin = (await call('/api/state', ceo)).json.state.farms[0].finances;
    assert.deepEqual(fin.map(r => r.costCenter), ['cycle:c1', 'cycle:c1', 'geral']); assert.equal(fin[2].cycleId, undefined);

    // 3. Insumos da ordem de serviço e baixa única.
    await page.evaluate(() => goToPage('campo-completo'));
    await page.locator('[data-os-insumos="os1"]').click();
    await page.locator('.dlg-back:not(.closing) [name=q_s1]').fill('4'); await page.locator('.dlg-back:not(.closing) button[type=submit]').click();
    await page.waitForFunction(() => activeFarm().expansion.workOrders[0].inputs?.length === 1 && !hasLocalChanges());
    // 4.19: a baixa abre com o previsto (o campo não informou) e grava o que foi realmente usado; a sobra fica no estoque.
    await page.locator('[data-os-baixa="os1"]').click();
    const q = page.locator('.dlg-back:not(.closing) [name=q_0_s1]'); await q.waitFor();
    assert.equal(await q.inputValue(), '4'); assert.match(await page.locator('.dlg-back:not(.closing)').textContent(), /O campo não informou/);
    await q.fill('3'); await page.locator('.dlg-back:not(.closing) button[type=submit]').click();
    await page.waitForFunction(() => activeFarm().stock[0].quantity === 37 && !hasLocalChanges());
    assert.match(await page.locator('.os-insumos').textContent(), /Baixa feita/); assert.match(await page.locator('.os-insumos').textContent(), /previsto 4 sc · usado 3 sc/);
    assert.equal(await page.locator('[data-os-baixa]').count(), 0, 'o botão de baixa some depois de usar');
    let farm = (await call('/api/state', ceo)).json.state.farms[0];
    assert.equal(farm.stock[0].quantity, 37); assert.deepEqual(farm.operations.stockUses.map(u => [u.id, u.quantity, u.plannedQuantity, u.cycleId, u.cost]), [['os_os1_s1', 3, 4, 'c1', 540]]);

    // 4. Mínimo sugerido só depois de conferir o saldo físico.
    await page.evaluate(() => goToPage('estoque'));
    const usar = page.locator('[data-usar-min="s1"]'); await usar.waitFor();
    assert.equal(await usar.isDisabled(), true, 'sem conferência o sugerido fica travado');
    await page.locator('[data-conferir="s1"]').click();
    await page.locator('.dlg-back:not(.closing) [name=counted]').fill('35'); await page.locator('.dlg-back:not(.closing) [name=note]').fill('Um saco rasgado');
    await page.locator('.dlg-back:not(.closing) button[type=submit]').click();
    await page.waitForFunction(() => activeFarm().stock[0].quantity === 35 && !hasLocalChanges());
    await page.locator('[data-usar-min="s1"]:not([disabled])').click();
    await page.waitForFunction(() => activeFarm().stock[0].min === 1 && !hasLocalChanges());
    farm = (await call('/api/state', ceo)).json.state.farms[0];
    assert.equal(farm.stock[0].quantity, 35); assert.equal(farm.stock[0].min, 1); assert.ok(farm.stock[0].countedAt); assert.equal(farm.stock[0].countNote, 'Um saco rasgado');
    assert.deepEqual(errors, []);
    console.log('PASS: centro de custo obrigatório com sugestão pelo fornecedor, baixa única dos insumos da OS e mínimo pelo consumo depois de conferir o saldo.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
