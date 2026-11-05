// Checklist do trator pela tela do tratorista, sem internet: entra na fila, sobe ao reconectar e avisa o CEO.
// Uso: node tests/checklist-trator-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const st = await call('/api/state', ceo), fid = st.json.state.farms[0].id;
    st.json.state.farms[0].tractors = [{ id: 'tr1', name: 'Trator Azul', model: 'MF 4275', status: 'Ativo' }];
    assert.equal((await call('/api/state', ceo, { state: st.json.state, baseRev: st.json.rev }, 'PUT')).status, 200);
    assert.equal((await call('/api/users', ceo, { username: 'trator1', name: 'Tratorista Um', email: 'trator1@example.invalid', password: s.password, role: 'contribuinte', function: 'Tratorista', allowedFarmId: fid, allowedActivity: 'coffee' })).status, 200);
    const tk = (await call('/api/auth/login', '', { groupCode: '1001', username: 'trator1', password: s.password })).json.token;
    await call('/api/auth/change-password', tk, { currentPassword: s.password, newPassword: 'Trator#Campo58' });

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(s.url + '/app'); await page.locator('#loginGroup').fill('1001'); await page.locator('#loginUser').fill('trator1'); await page.locator('#loginPassword').fill('Trator#Campo58'); await page.locator('#loginForm button[type=submit]').click();
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await context.setOffline(true);
    await page.evaluate(() => goToPage('campo-completo'));
    await page.locator('#checklistNovo').click();
    const dlg = page.locator('.dlg-back:not(.closing)');
    await dlg.locator('input[data-choice][value="Pneus"]').uncheck();
    await dlg.locator('[name=meter]').fill('1520');
    await dlg.locator('[name=description]').fill('Pneu traseiro esquerdo murcho');
    await dlg.locator('button[type=submit]').click();
    await page.waitForFunction(() => FilaCampo.rows().length === 1);
    assert.match((await page.evaluate(() => FilaCampo.rows()[0].text)), /Checklist · Trator Azul · 1 problema/);
    assert.match(await page.locator('.checklist-cta').textContent(), /com problema/);

    await context.setOffline(false); await page.evaluate(() => dispatchEvent(new Event('online')));
    await page.waitForFunction(() => FilaCampo.rows().length === 0, null, { timeout: 30000 }).catch(async () => { await page.evaluate(() => pushStateToServer(0, true)); await page.waitForFunction(() => FilaCampo.rows().length === 0, null, { timeout: 30000 }); });
    const logs = (await call('/api/state', ceo)).json.state.farms[0].expansion.fieldLogs;
    assert.equal(logs.length, 1); assert.equal(logs[0].kind, 'checklist'); assert.equal(logs[0].meter, 1520); assert.equal(logs[0].recordedBy, 'trator1');
    assert.deepEqual(logs[0].checks.filter(c => !c.ok).map(c => c.item), ['Pneus']);
    const alerts = (await call('/api/expansion/alerts', ceo)).json.alerts.map(a => a.title);
    assert.ok(alerts.some(t => /Checklist Trator Azul: Pneus/.test(t)), 'o CEO recebe o aviso: ' + alerts.join(' | '));
    assert.deepEqual(errors, []);
    console.log('PASS: checklist do trator sem internet, na fila, enviado ao reconectar e com aviso ao CEO.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
