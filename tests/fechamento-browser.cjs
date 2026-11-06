// 4.18 · Fechamento do mês (tela e PDF) e margem por hectare comparando duas fazendas. Uso: node tests/fechamento-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
const T = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()), M0 = T.slice(0, 7) + '-01', Y = T.slice(0, 4);
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const st = await call('/api/state', ceo), f = st.json.state.farms[0];
    const cycle = (id, area) => ({ id, activity: 'coffee', crop: 'Café arábica', name: 'Café ' + Y, areaHa: area, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: Y + '-01-01' });
    f.name = 'Fazenda Alta'; f.agriculture = { cycles: [cycle('c1', 10)], harvests: [{ id: 'h1', cycleId: 'c1', date: M0, netKg: 6000 }], sales: [{ id: 's1', cycleId: 'c1', date: M0, kg: 6000, pricePerKg: 30, buyer: 'Cooperativa' }] };
    f.finances = [{ id: 'f1', activity: 'coffee', type: 'entrada', category: 'Venda', description: 'Venda café', value: 180000, date: M0 }, { id: 'f2', activity: 'coffee', type: 'saida', category: 'Insumos', description: 'Adubo', value: 60000, date: M0, costCenter: 'cycle:c1', cycleId: 'c1', supplier: 'Agro Loja' }, { id: 'f3', activity: 'coffee', type: 'saida', category: 'Outros', description: 'Conserto antigo', value: 500, date: M0 }];
    const f2 = JSON.parse(JSON.stringify(f)); f2.id = 'farm-baixa'; f2.name = 'Fazenda Baixa'; f2.agriculture.cycles[0].areaHa = 20;
    f2.agriculture.sales[0].pricePerKg = 25; f2.finances = [{ id: 'g2', activity: 'coffee', type: 'saida', category: 'Insumos', description: 'Adubo', value: 90000, date: M0, costCenter: 'cycle:c1', cycleId: 'c1' }];
    st.json.state.farms.push(f2);
    const saved = await call('/api/state', ceo, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); assert.equal(saved.status, 200, JSON.stringify(saved.json));

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), ceo);
    await page.goto(s.url + '/app');
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.evaluate(() => { activeFarmId = data.farms[0].id; localStorage.setItem(modeStorageKey(), 'coffee'); goToPage('fechamento-mes'); });
    await page.locator('#fechPdf').waitFor();
    const text = await page.locator('#pageContent').textContent();
    assert.match(text, /Resultado do mês/); assert.match(text, /119\.500,00/); assert.match(text, /Saídas sem centro de custo/); assert.match(text, /Conserto antigo/);
    const [pop] = await Promise.all([page.waitForEvent('popup'), page.locator('#fechPdf').click()]); await pop.waitForLoadState();
    const html = await pop.content(); assert.match(html, /Fechamento de/); assert.match(html, /Pendências para resolver/); assert.match(html, /Fazenda Alta/); await pop.close();

    await page.evaluate(() => goToPage('margem-hectare'));
    await page.locator('#margemForm').waitFor();
    const rows = await page.locator('#pageContent .exp-table tbody tr').allTextContents();
    assert.match(rows[0], /Fazenda Alta/); assert.match(rows[0], /12\.000,00\/ha/); assert.match(rows[1], /Fazenda Baixa/); assert.match(rows[1], /3\.000,00\/ha/);
    assert.deepEqual(errors, []);
    console.log('PASS: fechamento do mês com pendências e PDF; margem por hectare comparando duas fazendas no mesmo critério.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
