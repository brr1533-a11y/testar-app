// Teste de aceite da fila de lançamentos: o fiscal registra sacos em modo avião, fecha e reabre o app sem internet
// (cofre com PIN), a fila continua mostrando os lançamentos; ao reconectar — inclusive com a primeira resposta do
// servidor perdida no caminho — cada lançamento chega ao servidor uma única vez. Uso: node tests/fila-campo-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
const today = new Date().toISOString().slice(0, 10);
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const put = async (tk, mut) => { const st = await call('/api/state', tk); mut(st.json.state); const r = await call('/api/state', tk, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); assert.equal(r.status, 200, JSON.stringify(r.json)); };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const fid = (await call('/api/state', ceo)).json.state.farms[0].id;
    await put(ceo, st => { const f = st.farms[0]; f.talhoes = [{ id: 't1', name: 'Talhão do Alto', activity: 'coffee', crop: 'Café arábica', areaHa: 5 }];
      f.labor = { workers: [{ id: 'w1', name: 'Ana Souza', role: 'safrista', dailyRate: 100, active: true }, { id: 'w2', name: 'Bruno Lima', role: 'safrista', dailyRate: 100, active: true }], plotRates: [{ id: 'r1', plotId: 't1', ratePerBag: 12, validFrom: '2020-01-01' }], entries: [], adjustments: [], closings: [], settings: {} }; });
    assert.equal((await call('/api/users', ceo, { username: 'fiscal1', name: 'Fiscal Um', email: 'fiscal1@example.invalid', password: s.password, role: 'contribuinte', function: 'Fiscal de colheita', allowedFarmId: fid, allowedActivity: 'coffee' })).status, 200);
    let tk = (await call('/api/auth/login', '', { groupCode: '1001', username: 'fiscal1', password: s.password })).json.token;
    await call('/api/auth/change-password', tk, { currentPassword: s.password, newPassword: 'Fiscal#Campo58' });

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } }), errors = [];
    let page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(s.url + '/app'); await page.locator('#loginGroup').fill('1001'); await page.locator('#loginUser').fill('fiscal1'); await page.locator('#loginPassword').fill('Fiscal#Campo58'); await page.locator('#loginForm button[type=submit]').click();
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.evaluate(() => navigator.serviceWorker.ready);
    // Cofre do modo de campo com PIN.
    await page.evaluate(() => { goToPage('campo'); FieldMode.enable(); });
    await page.locator('#dlg_pin').fill('482915'); await page.locator('#dlg_confirm').fill('482915'); await page.locator('.dlg-back:not(.closing) button[type=submit]').click();
    await page.waitForFunction(() => FieldMode.enabled());
    assert.ok(await page.evaluate(() => document.body.classList.contains('modo-campo')), 'modo campo liga sozinho para a equipe no celular');

    // Modo avião: 3 sacos da Ana e a diária do Bruno.
    await context.setOffline(true);
    await page.evaluate(() => goToPage('colheita-campo'));
    const ana = page.locator('.hf-row').filter({ hasText: 'Ana Souza' });
    for (let i = 0; i < 3; i++) await ana.locator('.hf-btn.plus').click();
    await page.locator('.hf-row').filter({ hasText: 'Bruno Lima' }).locator('.hf-day').click();
    await page.locator('#hfSave').click();
    await page.waitForFunction(() => FilaCampo.rows().length === 2);
    assert.match(await page.locator('#filaChip').textContent(), /2 na fila/);
    await page.locator('#filaChip').click();
    const fila = await page.locator('.fila-dlg').textContent();
    assert.match(fila, /Sem internet/); assert.match(fila, /Guardado, esperando envio/); assert.match(fila, /Ana Souza · 3 saco\(s\) · Talhão do Alto/); assert.match(fila, /Bruno Lima · diária/); assert.match(fila, /cofre cifrado deste aparelho/);
    await page.locator('.fila-dlg button[type=submit]').click();
    await page.evaluate(() => FieldMode.flush());

    // Fecha o app e reabre sem internet, pelo PIN.
    await page.close();
    page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(s.url + '/app');
    await page.locator('#openFieldVault').click(); await page.locator('.dlg [name=pin]').fill('482915'); await page.locator('.dlg-back:not(.closing) button[type=submit]').click();
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.waitForFunction(() => FilaCampo.rows().length === 2);
    const kept = await page.evaluate(() => FilaCampo.rows().map(r => r.text));
    assert.ok(kept.some(t => /Ana Souza · 3 saco/.test(t)) && kept.some(t => /Bruno Lima · diária/.test(t)), 'a fila continua depois de reabrir');

    // Reconecta; a primeira resposta do servidor se perde no caminho (o servidor grava, o aparelho não fica sabendo).
    let lost = 0;
    await page.route('**/api/state', async route => { if (route.request().method() === 'PUT' && lost === 0) { lost++; await route.fetch(); return route.abort('connectionreset'); } return route.continue(); });
    await context.setOffline(false);
    await page.evaluate(() => dispatchEvent(new Event('online')));
    await page.waitForFunction(() => FilaCampo.rows().length === 0 && document.querySelector('#syncStatus').dataset.kind === 'ok', null, { timeout: 30000 }).catch(async () => { await page.evaluate(() => pushStateToServer(0, true)); await page.waitForFunction(() => FilaCampo.rows().length === 0, null, { timeout: 30000 }); });
    assert.equal(lost, 1, 'a primeira resposta foi perdida de propósito');
    const confirmed = await page.evaluate(() => FilaCampo.confirmed.map(c => c.text));
    assert.ok(confirmed.length >= 2, 'a fila mostra o que chegou ao escritório');

    const entries = (await call('/api/state', ceo)).json.state.farms[0].labor.entries;
    assert.equal(entries.length, 2, 'cada lançamento chega uma única vez'); assert.equal(new Set(entries.map(e => e.id)).size, 2);
    assert.deepEqual(entries.map(e => [e.workerId, e.kind, e.bags ?? null]).sort(), [['w1', 'saco', 3], ['w2', 'diaria', null]]);
    // Reconectar de novo e recarregar não duplica.
    await page.reload(); await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.evaluate(() => pushStateToServer(0, true)); await page.waitForTimeout(800);
    assert.equal((await call('/api/state', ceo)).json.state.farms[0].labor.entries.length, 2);
    assert.deepEqual(errors, []);
    console.log('PASS: fila em modo avião, reabertura pelo PIN e envio único ao reconectar (inclusive com resposta perdida).');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
