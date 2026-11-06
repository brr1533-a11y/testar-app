// 4.18 · Alertas que pedem decisão: parcela sem caixa previsto e pedido de compra aguardando. Só o CEO recebe;
// o endereço da notificação abre o pedido destacado, e o CEO aprova ali mesmo. Uso: node tests/alertas-acao-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
const day = n => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(Date.now() + n * 86400000));
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const put = async (tk, mut) => { const st = await call('/api/state', tk); mut(st.json.state); const r = await call('/api/state', tk, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); assert.equal(r.status, 200, JSON.stringify(r.json)); };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    await put(ceo, st => {
      const f = st.farms[0]; f.finances = [{ id: 'e1', activity: 'coffee', type: 'entrada', category: 'Venda', description: 'Venda', value: 10000, date: day(-5) }];
      f.management ||= {}; f.management.payables = [{ id: 'p1', activity: 'coffee', supplier: 'Agro Loja', description: 'Defensivo', amount: 9000, dueDate: day(3), status: 'open' }];
      f.management.purchaseOrders = [{ id: 'po1', activity: 'coffee', date: day(0), supplier: 'Agro Loja', status: 'pending', justification: 'Adubação de cobertura do talhão 1', items: [{ name: 'Adubo 20-05-20', quantity: 10, unit: 'sc', unitPrice: 180 }] }];
      f.expansion ||= {}; f.expansion.loans = [{ id: 'l1', activity: 'coffee', date: day(-300), notes: '', archived: false, name: 'Custeio café', kind: 'custeio', principal: 4000, annualRate: 0, installments: 1, periodMonths: 12, system: 'unica', due: day(10) }];
      st.admAccess = { pages: ['pedidos-compra', 'fluxo-caixa', 'financiamentos', 'financeiro-gestao'] };
    });
    const ceoAlerts = (await call('/api/expansion/alerts', ceo)).json.alerts;
    const gap = ceoAlerts.find(x => x.id.startsWith('loan-cash:')), po = ceoAlerts.find(x => x.id === 'po:po1');
    assert.ok(gap && po, 'CEO recebe os dois alertas');
    assert.match(gap.title, /faltam R\$ 3\.000,00/); assert.equal(gap.link, '/app?abrir=fluxo-caixa'); assert.equal(po.link, '/app?abrir=pedidos-compra&item=po1');
    // ADM com acesso às mesmas telas não recebe os alertas de decisão do CEO.
    assert.equal((await call('/api/users', ceo, { username: 'adm1', name: 'ADM Um', email: 'adm1@example.invalid', password: s.password, role: 'adm' })).status, 200);
    let adm = (await call('/api/auth/login', '', { groupCode: '1001', username: 'adm1', password: s.password })).json.token;
    await call('/api/auth/change-password', adm, { currentPassword: s.password, newPassword: 'Adm#Campo582' }); adm = (await call('/api/auth/login', '', { groupCode: '1001', username: 'adm1', password: 'Adm#Campo582' })).json.token;
    const admAlerts = (await call('/api/expansion/alerts', adm)).json.alerts;
    assert.ok(!admAlerts.some(x => x.id.startsWith('loan-cash:') || x.id === 'po:po1'), 'ADM não recebe: ' + admAlerts.map(x => x.id).join(','));

    // A notificação abre o pedido destacado; o CEO aprova ali mesmo.
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), ceo);
    await page.goto(s.url + po.link);
    await page.waitForFunction(() => typeof currentPage !== 'undefined' && currentPage === 'pedidos-compra' && document.querySelector('.item-destaque'));
    assert.equal(new URL(page.url()).search, '', 'o endereço é limpo depois de abrir');
    assert.match(await page.locator('.item-destaque').textContent(), /Adubo 20-05-20/);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('g-approve')), true, 'foco no Aprovar');
    await page.locator('.item-destaque .g-approve').click();
    await page.locator('.dlg-back:not(.closing) button[type=submit]').click();
    await page.waitForFunction(() => activeFarm()?.management?.purchaseOrders?.[0]?.status === 'approved' && !hasLocalChanges(), null, { timeout: 15000 });
    assert.equal((await call('/api/state', ceo)).json.state.farms[0].management.purchaseOrders[0].status, 'approved');
    assert.ok(!(await call('/api/expansion/alerts', ceo)).json.alerts.some(x => x.id === 'po:po1'), 'aprovado, o alerta some');
    // Endereço de tela não liberada não abre nada.
    const p2 = await browser.newPage(); await p2.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), adm);
    await p2.goto(s.url + '/app?abrir=usuarios'); await p2.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await p2.waitForTimeout(400); assert.notEqual(await p2.evaluate(() => currentPage), 'usuarios');
    assert.deepEqual(errors, []);
    console.log('PASS: alertas de decisão só para o CEO; a notificação abre o pedido destacado e a aprovação é feita no celular.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
