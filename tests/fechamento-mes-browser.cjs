// 4.19 · Fechar mês pelo CEO: versão guardada com código, PDF da versão, mês travado e reabertura com motivo.
// Uso: node tests/fechamento-mes-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
const P = (() => { const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()).split("-").map(Number); return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7); })();
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const st = (await call('/api/state', ceo)).json, f = st.state.farms[0];
    f.name = 'Fazenda Alta';
    f.finances = [{ id: 'f1', activity: 'coffee', type: 'entrada', category: 'Venda', description: 'Venda café', value: 10000, date: P + '-05' }, { id: 'f2', activity: 'coffee', type: 'saida', category: 'Outros', description: 'Energia', value: 400, date: P + '-08', costCenter: 'geral' }];
    const saved = await call('/api/state', ceo, { state: st.state, baseRev: st.rev }, 'PUT'); assert.equal(saved.status, 200, JSON.stringify(saved.json));

    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), ceo);
    await page.goto(s.url + '/app');
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.evaluate(m => { activeFarmId = data.farms[0].id; localStorage.setItem(modeStorageKey(), 'coffee'); fechMes = m; goToPage('fechamento-mes'); }, P);
    await page.locator('[data-fech-fechar]').waitFor();
    assert.match(await page.locator('.fech-box').textContent(), /Mês aberto/);

    // 1. Fechar: confirma, o servidor devolve a versão 1 com código.
    await page.locator('[data-fech-fechar]').click(); await page.locator('.dlg-back:not(.closing) button[type=submit]').click();
    await page.waitForFunction(() => !hasLocalChanges() && /código [0-9A-F]{4}-/.test(document.querySelector('.fech-box')?.textContent || ''));
    const box = await page.locator('.fech-box').textContent(); assert.match(box, /Mês fechado/); assert.match(box, /versão 1/);
    assert.equal(await page.locator('[data-fech-fechar]').count(), 0);
    const [pop] = await Promise.all([page.waitForEvent('popup'), page.locator('[data-fech-ver]').click()]); await pop.waitForLoadState();
    const html = await pop.content(); assert.match(html, /Versão 1 · fechado em/); assert.match(html, /código de conferência [0-9A-F]{4}-/); assert.match(html, /9\.600,00/); await pop.close();

    // 2. Mês travado: um lançamento com data no mês fechado é recusado pelo servidor.
    const now = (await call('/api/state', ceo)).json; now.state.farms[0].finances.push({ id: 'f3', activity: 'coffee', type: 'saida', category: 'Outros', description: 'Nota esquecida', value: 50, date: P + '-20', costCenter: 'geral' });
    const late = await call('/api/state', ceo, { state: now.state, baseRev: now.rev }, 'PUT'); assert.equal(late.status, 422); assert.match(late.json.error, /fechado pelo CEO/);

    // 3. Reabrir com motivo: o histórico guarda a versão 1 e o motivo; o mês destrava.
    await page.locator('[data-fech-reabrir]').click();
    await page.locator('.dlg-back:not(.closing) [name=reason]').fill('Nota do adubo esquecida'); await page.locator('.dlg-back:not(.closing) button[type=submit]').click();
    await page.waitForFunction(() => !hasLocalChanges() && /Mês reaberto/.test(document.querySelector('.fech-box')?.textContent || ''));
    assert.match(await page.locator('.fech-box details').textContent(), /Reaberto por .*Nota do adubo esquecida/);
    const again = (await call('/api/state', ceo)).json; again.state.farms[0].finances.push({ id: 'f3', activity: 'coffee', type: 'saida', category: 'Outros', description: 'Nota esquecida', value: 50, date: P + '-20', costCenter: 'geral' });
    assert.equal((await call('/api/state', ceo, { state: again.state, baseRev: again.rev }, 'PUT')).status, 200);

    // 4. Fechar de novo: versão 2 com o valor corrigido; a 1 continua no histórico.
    await page.reload(); await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.evaluate(m => { activeFarmId = data.farms[0].id; fechMes = m; goToPage('fechamento-mes'); }, P);
    await page.locator('[data-fech-fechar]').click(); await page.locator('.dlg-back:not(.closing) button[type=submit]').click();
    await page.waitForFunction(() => !hasLocalChanges() && /versão 2/.test(document.querySelector('.fech-box')?.textContent || ''));
    const c = (await call('/api/state', ceo)).json.state.farms[0].monthClosings[0];
    assert.deepEqual(c.versions.map(v => [v.n, v.report.spend]), [[1, 400], [2, 450]]); assert.equal(c.reopenings.length, 1);
    assert.equal(await page.locator('[data-fech-versao]').count(), 2, 'PDF de cada versão no histórico');
    assert.deepEqual(errors, []);
    console.log('PASS: CEO fecha o mês (versão com código e PDF), mês travado no servidor, reabertura com motivo e versão 2.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
