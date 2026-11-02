const {reveal}=require('./support/navigation.cjs');
// Roteiro de navegador das melhorias 2027: abre cada tela nova com dados, cadastra pelo formulário (parceria com
// talhões marcados), esconde módulos pelo modelo pronto, abre a ajuda e o resumo do dono num celular fraco
// (CPU 4x mais lenta e rede 3G). Uso: node tests/melhorias-browser.cjs (requer um Chromium para o Playwright).
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
const iso = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0', SUPPORT_WHATSAPP: '5535999990000' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const put = async (tk, mut) => { const st = await call('/api/state', tk); mut(st.json.state); const r = await call('/api/state', tk, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); assert.equal(r.status, 200, JSON.stringify(r.json)); };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const rec = o => ({ activity: 'coffee', date: iso(0), notes: '', archived: false, ...o });
    await put(ceo, st => {
      const f = st.farms[0];
      f.talhoes = [{ id: 't1', name: 'Talhão Alto', areaHa: 4 }, { id: 't2', name: 'Talhão Baixo', areaHa: 6 }];
      f.agriculture = { cycles: [{ id: 'c1', activity: 'coffee', crop: 'Café arábica', name: 'Safra 26/27', areaHa: 10, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: '2026-01-01', plotIds: ['t1', 't2'] }], harvests: [{ id: 'h1', cycleId: 'c1', plotId: 't1', date: iso(-5), netKg: 6000 }], sales: [] };
      f.finances = [{ id: 'fi1', activity: 'coffee', type: 'entrada', category: 'Venda', description: 'Venda', value: 20000, date: iso(-20) }];
      f.expansion ||= {};
      Object.assign(f.expansion, {
        loans: [rec({ id: 'l1', name: 'Custeio 2026', kind: 'custeio', bank: 'Banco do Brasil', principal: 80000, annualRate: 9, installments: 2, periodMonths: 6, system: 'sac', date: iso(-150), due: iso(20) })],
        leases: [rec({ id: 'a1', direction: 'tomado', party: 'Sr. Antônio', areaHa: 3, unit: 'reais', perHa: 1500, start: '2025-01-15', dueMonth: Number(iso(45).slice(5, 7)) })],
        contractors: [rec({ id: 'k1', provider: 'Colhe Bem', service: 'colheita', unit: 'saca', quantity: 100, price: 70, cycleId: 'c1', paid: false })],
        taxSettings: [rec({ id: 'x1', regime: 'pf', buyerWithholds: true })]
      });
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/cotacao-cafe', r => r.fulfill({ status: 503, body: '{}' })); await page.route('https://fonts.googleapis.com/**', r => r.abort()); await page.route('https://fonts.gstatic.com/**', r => r.abort());
    await page.goto(s.url + '/app'); await page.locator('#loginGroup').fill('1001'); await page.locator('#loginUser').fill('testceo'); await page.locator('#loginPassword').fill(s.password); await page.locator('#loginForm button[type=submit]').click();
    await page.waitForFunction(() => currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.evaluate(() => { activeFarmId = data.farms[0].id; });
    const open = async (id, text) => { await page.evaluate(id => goToPage(id), id); await page.waitForFunction(([id, t]) => currentPage === id && document.querySelector('#pageContent').textContent.includes(t), [id, text], { timeout: 8000 }); return page.locator('#pageContent').textContent(); };
    const dialog = () => page.locator('.dlg-back:not(.closing)');

    // Menu: as páginas novas aparecem nos grupos certos.
    const menu = await page.evaluate(() => navItems().map(i => [i[0], i[3]]));
    for (const [id, group] of [['resumo-dono', 'Início'], ['parcerias', 'Lavoura'], ['funrural', 'Financeiro e fiscal'], ['financiamentos', 'Financeiro e fiscal'], ['fluxo-caixa', 'Financeiro e fiscal'], ['modulos', 'Configurações'], ['meus-dados', 'Configurações']]) assert.ok(menu.some(m => m[0] === id && m[1] === group), id);

    // Parceria pelo formulário, com os talhões marcados.
    await open('parcerias', 'Parceria / meação');
    await page.locator('[data-x-new="partnerships"]').click();
    await page.locator('#dlg_partner').fill('José Meeiro');
    await dialog().locator('input[data-choice][value="t1"]').check();
    await page.locator('#dlg_cycleId').selectOption('c1'); await page.locator('#dlg_productionShare').fill('50'); await page.locator('#dlg_costShare').fill('50'); await page.locator('#dlg_start').fill('2026-01-01');
    await dialog().locator('button[type=submit]').click();
    let text = await open('parcerias', 'José Meeiro');
    assert.match(text, /Parte do parceiro \(50%\)/); assert.match(text, /50 sc/); assert.match(text, /Faltam entregar 50 sacas/);
    await page.waitForFunction(() => !hasLocalChanges());
    const saved = (await call('/api/state', ceo)).json.state.farms[0].expansion.partnerships;
    assert.deepEqual(saved.map(p => [p.partner, p.plotIds]), [['José Meeiro', ['t1']]]);

    // Demais telas, com os números esperados.
    text = await open('financiamentos', 'Custeio 2026'); assert.match(text, /a vencer/); assert.match(text, /Banco do Brasil/);
    text = await open('fluxo-caixa', 'Mês a mês'); assert.match(text, /Parcela: Custeio 2026/); assert.match(text, /Arrendamento a pagar/); assert.match(text, /Prestador: Colhe Bem/);
    text = await open('funrural', 'Pessoa física'); assert.match(text, /1,5%/);
    text = await open('arrendamentos', 'Sr. Antônio'); assert.match(text, /4\.500,00/);
    text = await open('prestadores', 'Colheita terceirizada'); assert.match(text, /70,00 \/ sc/);
    text = await open('relatorio-credito', 'Endividamento'); assert.match(text, /Safra 26\/27/);
    text = await open('comparacao-fazendas', 'Comparar');
    await page.locator('#mhBenchRun').click(); await page.waitForFunction(() => /três fazendas/.test(document.querySelector('#mhBenchOut').textContent));
    text = await open('resumo-dono', 'Caixa hoje'); assert.match(text, /20\.000,00/); assert.match(text, /Vence em 30 dias/);
    text = await open('meus-dados', 'Baixar todos os dados'); await page.waitForFunction(() => /Grupo inicial|Pedir exclusão|protegido/.test(document.querySelector('#mhDel').textContent) || document.querySelector('#mhDelAsk'));

    // Ajuda na tela, com o WhatsApp do suporte.
    await open('financiamentos', 'Custeio 2026');
    await require('./support/navigation.cjs').go(page,'ajuda');
    const wa = await page.locator('#helpContact a[href^="https://wa.me/5535999990000"]').getAttribute('href');
    assert.match(decodeURIComponent(wa), /Financiamentos e dívidas/);

    // Animais: cadastro, parto e indicador de lactação.
    await page.evaluate(() => { localStorage.setItem(modeStorageKey(), 'cattle'); });
    await put(ceo, st => { const f = st.farms[0]; f.cattle = { ...(f.cattle || {}), lots: [{ id: 'lt1', name: 'Vacas', heads: 2 }], paddocks: [], weighings: [] }; Object.assign(f.expansion, { animals: [{ id: 'v1', activity: 'cattle', date: iso(0), tag: 'BR-07', sex: 'F', birth: '2021-03-01', lotId: 'lt1', status: 'ativo', archived: false, notes: '' }], animalEvents: [{ id: 'e1', activity: 'cattle', date: iso(-40), animalId: 'v1', kind: 'parto', archived: false, notes: '' }] }); });
    await page.evaluate(() => syncNow?.()).catch(() => {});
    await page.waitForFunction(() => (data.farms[0].expansion.animals || []).length === 1, null, { timeout: 15000 }).catch(async () => { await page.reload(); await page.waitForFunction(() => currentUser && (data.farms[0].expansion.animals || []).length === 1); });
    const activity = await page.evaluate(() => [selectedType(), availableInterfaceModes()]);
    assert.equal(activity[0], 'cattle', 'modo Gado: ' + JSON.stringify(activity));
    text = await open('animais', 'BR-07'); assert.match(text, /Em lactação/); assert.match(text, /BR-07[^]*40/);

    // Módulos: o modelo "Café familiar" tira páginas do menu; os dados continuam.
    await page.evaluate(() => { localStorage.setItem(modeStorageKey(), 'coffee'); });
    await open('modulos', 'Modelos prontos');
    await page.locator('[data-mh-tpl="cafe-familiar"]').click(); await dialog().locator('button[type=submit]').click();
    await page.waitForFunction(() => !navItems().some(i => i[0] === 'parcerias'));
    assert.ok(await page.evaluate(() => navItems().some(i => i[0] === 'modulos' && navItems().some(j => j[0] === 'dashboard'))));
    await page.waitForFunction(() => !hasLocalChanges());
    assert.equal((await call('/api/state', ceo)).json.state.farms[0].expansion.partnerships.length, 1, 'dados da página escondida ficam guardados');
    await reveal(page.locator('#mhModForm input[value="parcerias"]')); await page.locator('#mhModForm input[value="parcerias"]').check(); await page.locator('#mhModForm button[type=submit]').click();
    await page.waitForFunction(() => navItems().some(i => i[0] === 'parcerias'));
    assert.deepEqual(errors, []);
    await context.close();

    // Celular fraco: CPU 4x mais lenta, 3G (1,6 Mbps, 150 ms) e tela de 360 px.
    const phone = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }), m = await phone.newPage(), mErrors = [];
    m.on('pageerror', e => mErrors.push(e.message));
    await m.route('**/api/cotacao-cafe', r => r.fulfill({ status: 503, body: '{}' })); await m.route('https://fonts.googleapis.com/**', r => r.abort()); await m.route('https://fonts.gstatic.com/**', r => r.abort());
    const cdp = await phone.newCDPSession(m);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 90 * 1024 });
    let t0 = Date.now();
    await m.goto(s.url + '/app', { waitUntil: 'domcontentloaded' }); await m.locator('#loginGroup').waitFor();
    const loginReady = Date.now() - t0;
    await m.locator('#loginGroup').fill('1001'); await m.locator('#loginUser').fill('testceo'); await m.locator('#loginPassword').fill(s.password);
    t0 = Date.now(); await m.locator('#loginForm button[type=submit]').click();
    await m.waitForFunction(() => currentUser && !document.querySelector('#appView').classList.contains('hidden'), null, { timeout: 60000 });
    const panelReady = Date.now() - t0;
    t0 = Date.now(); await m.evaluate(() => { activeFarmId = data.farms[0].id; goToPage('resumo-dono'); }); await m.waitForFunction(() => document.querySelector('.mh-owner'));
    const ownerReady = Date.now() - t0;
    const fits = await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    const tiles = await m.locator('.mh-tile').count();
    assert.ok(fits, 'resumo do dono cabe na largura do celular, sem rolagem lateral'); assert.ok(tiles >= 4);
    assert.ok(loginReady < 30000 && panelReady < 30000 && ownerReady < 5000, `tempos: ${loginReady} / ${panelReady} / ${ownerReady} ms`);
    assert.deepEqual(mErrors, []);
    await m.waitForTimeout(1500);
    await m.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), 'melhorias-celular-fraco.png') });
    console.log(`PASS: telas novas, parceria pelo formulário, ajuda com WhatsApp, módulos por modelo e celular fraco (tela de entrada ${loginReady} ms, painel ${panelReady} ms, resumo do dono ${ownerReady} ms com CPU 4x e 3G).`);
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
