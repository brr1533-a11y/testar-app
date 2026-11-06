// 4.19 · Quem faz o serviço conclui a ordem no celular informando o usado (16 L de 20 L previstos); o escritório
// dá baixa com o usado já preenchido, no lote que vence antes, e a sobra fica no estoque.
// Uso: node tests/insumo-usado-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
const T = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()), plus = n => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(Date.now() + n * 86400000));
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const fid = (await call('/api/state', ceo)).json.state.farms[0].id;
    assert.equal((await call('/api/users', ceo, { username: 'op1', name: 'Operador Um', email: 'op1@example.invalid', password: s.password, role: 'contribuinte', function: 'Tratorista', allowedFarmId: fid, allowedActivity: 'coffee' })).status, 200);
    let op = (await call('/api/auth/login', '', { groupCode: '1001', username: 'op1', password: s.password })).json.token;
    await call('/api/auth/change-password', op, { currentPassword: s.password, newPassword: 'Operador#Campo58' });
    op = (await call('/api/auth/login', '', { groupCode: '1001', username: 'op1', password: 'Operador#Campo58' })).json.token;
    const st = (await call('/api/state', ceo)).json, f = st.state.farms[0], opId = st.state.users.find(u => u.username === 'op1').id;
    f.agriculture = { cycles: [{ id: 'c1', activity: 'coffee', crop: 'Café arábica', name: 'Safra 26/27', areaHa: 10, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: '2026-01-01' }], harvests: [], sales: [] };
    f.stock = [{ id: 'fa', activity: 'coffee', item: 'Fungicida X', category: 'Defensivos', unit: 'L', quantity: 30, unitCost: 50, batch: 'A1', expires: plus(300) }, { id: 'fb', activity: 'coffee', item: 'Fungicida X', category: 'Defensivos', unit: 'L', quantity: 10, unitCost: 60, batch: 'B2', expires: plus(40) }];
    f.expansion ||= {}; f.expansion.workOrders = [{ id: 'os1', activity: 'coffee', date: T, title: 'Pulverizar Talhão 1', assignee: opId, due: T, cycleId: 'c1', notes: '', archived: false, inputs: [{ stockId: 'fa', quantity: 20, itemName: 'Fungicida X', unit: 'L' }] }];
    assert.equal((await call('/api/state', ceo, { state: st.state, baseRev: st.rev }, 'PUT')).status, 200);

    // 1. Celular do operador: conclui informando 16 L.
    const errors = [], phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage(); phone.on('pageerror', e => errors.push(e.message));
    await phone.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), op);
    await phone.goto(s.url + '/app'); await phone.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await phone.evaluate(() => goToPage('campo-completo'));
    await phone.locator('[data-os-concluir="os1"]').click();
    const used = phone.locator('.dlg-back:not(.closing) [name=u_0]'); await used.waitFor();
    assert.equal(await used.inputValue(), '20'); assert.match(await phone.locator('.dlg-back:not(.closing)').textContent(), /Fungicida X usado \(L\) · previsto 20/);
    await used.fill('16'); await phone.locator('.dlg-back:not(.closing) button[type=submit]').click();
    await phone.waitForFunction(() => !document.querySelector('[data-os-concluir]'));
    let ev; for (let i = 0; i < 60 && !ev; i++) { ev = (await call('/api/state', ceo)).json.state.farms[0].expansion.workOrderEvents.at(-1); if (!ev) await new Promise(r => setTimeout(r, 500)); }
    assert.deepEqual([ev.status, ev.used], ['done', [{ stockId: 'fa', quantity: 16 }]]);
    // A tela do campo não pode ficar regravando sozinha (antes da 4.19 a seção Gestão vazia fazia isso sem parar).
    const rev0 = (await call('/api/state', ceo)).json.rev; await new Promise(r => setTimeout(r, 3000));
    assert.equal((await call('/api/state', ceo)).json.rev, rev0, 'celular parado não grava de novo'); assert.equal(await phone.evaluate(() => hasLocalChanges()), false);

    // 2. Escritório: a baixa vem com 10 L do lote B2 (vence antes) + 6 L do A1 = 16 L informados no campo.
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), ceo);
    await page.goto(s.url + '/app'); await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.evaluate(() => { activeFarmId = data.farms[0].id; localStorage.setItem(modeStorageKey(), 'coffee'); goToPage('campo-completo'); });
    assert.match(await page.locator('.os-insumos').textContent(), /campo informou 16 L/);
    await page.locator('[data-os-baixa="os1"]').click();
    const dlg = page.locator('.dlg-back:not(.closing)'); await dlg.locator('[name=q_0_fb]').waitFor();
    assert.equal(await dlg.locator('[name=q_0_fb]').inputValue(), '10'); assert.equal(await dlg.locator('[name=q_0_fa]').inputValue(), '6');
    assert.match(await dlg.textContent(), /Informado no campo: 16 L \(Operador Um\)/);
    await dlg.locator('button[type=submit]').click();
    await page.waitForFunction(() => !hasLocalChanges() && /Baixa feita/.test(document.querySelector('.os-insumos')?.textContent || ''));
    assert.match(await page.evaluate(() => document.querySelector('#toast')?.textContent || ''), /Fungicida X: 16 \(sobra de 4 no estoque\)/);
    const farm = (await call('/api/state', ceo)).json.state.farms[0];
    assert.deepEqual(farm.stock.map(x => [x.id, x.quantity]), [['fa', 24], ['fb', 0]], 'sobra fica no estoque');
    assert.deepEqual(farm.operations.stockUses.map(u => [u.stockId, u.quantity, u.batch, u.cost]).sort(), [['fa', 6, 'A1', 300], ['fb', 10, 'B2', 600]]);
    assert.match(await page.locator('.os-insumos').textContent(), /usado 16 L \(lote B2, A1\)|usado 16 L \(lote A1, B2\)/);
    assert.deepEqual(errors, []);
    console.log('PASS: operador conclui informando 16 de 20 L; escritório dá baixa do usado nos lotes (vence antes primeiro); sobra no estoque.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
