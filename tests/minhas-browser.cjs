// 4.18 · Contas recorrentes, cenário "e se eu vender agora?" e validade dos insumos, na tela. Uso: node tests/minhas-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
const T = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()), day = n => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(Date.now() + n * 86400000));
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const st = await call('/api/state', ceo), f = st.json.state.farms[0];
    f.finances = [{ id: 'e1', activity: 'coffee', type: 'entrada', category: 'Venda', description: 'Venda', value: 2000, date: day(-3) }];
    f.management ||= {}; f.management.payables = [{ id: 'p1', activity: 'coffee', date: T, supplier: 'Banco', description: 'Parcela', amount: 8000, dueDate: day(6), status: 'open' }];
    f.expansion ||= {}; f.expansion.recurringBills = [{ id: 'luz', activity: 'coffee', date: T, notes: '', archived: false, supplier: 'Energisa', description: 'Energia da sede', amount: 850, dayOfMonth: Number(T.slice(8)), costCenter: 'geral', start: '2020-01-01', active: true }];
    f.stock = [{ id: 'st1', activity: 'coffee', item: 'Fungicida', category: 'Defensivos', quantity: 12, unit: 'L', min: 0, unitCost: 90, expires: day(4), batch: 'L77' }];
    const saved = await call('/api/state', ceo, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); assert.equal(saved.status, 200, JSON.stringify(saved.json));
    const alerts = (await call('/api/expansion/alerts', ceo)).json.alerts;
    assert.ok(alerts.some(a => a.id.startsWith('recurring:')), 'aviso de recorrente'); assert.ok(alerts.some(a => a.id.startsWith('expires:st1')), 'aviso de validade');

    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), ceo);
    await page.goto(s.url + '/app');
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    await page.evaluate(() => { activeFarmId = data.farms[0].id; localStorage.setItem(modeStorageKey(), 'coffee'); goToPage('fluxo-caixa'); });
    await page.locator('#mhCenario').waitFor(); // o que foi digitado sobrevive à cotação do mercado redesenhar a tela
    assert.match(await page.locator('.mh-recorrentes').textContent(), /Energisa/);
    // Sem caixa: o sistema diz quantas sacas vender (saldo 2.000 − parcela 8.000 − energia 850 × 12 = −16.200 → 11 sacas a 1.500).
    await page.locator('#mhCenario [name=price]').fill('1500');
    await page.locator('#mhCenario [name=bags]').fill('3'); await page.locator('#mhCenario button.primary').click();
    await page.locator('#mhCenarioRes').waitFor({ state: 'attached' });
    const res = await page.locator('.mh-cenario').textContent();
    assert.match(res, /venda pelo menos 11 sacas/, res); assert.match(res, /Ainda falta caixa/);
    await page.locator('#mhCenario [name=bags]').fill('11'); await page.locator('#mhCenario button.primary').click();
    await page.waitForFunction(() => /fica positivo/.test(document.querySelector('#mhCenarioRes')?.textContent || ''));
    // Lança as recorrentes do mês em Contas a pagar; o aviso some e não duplica.
    await page.locator('#mhRecLancar').click();
    await page.waitForFunction(() => !document.querySelector('.mh-recorrentes') && !hasLocalChanges(), null, { timeout: 15000 });
    const srv = (await call('/api/state', ceo)).json.state.farms[0];
    const rec = srv.management.payables.filter(p => p.recurringId === 'luz'); assert.equal(rec.length, 1); assert.equal(rec[0].id, 'rec_luz_' + T.slice(0, 7).replace('-', '')); assert.equal(rec[0].amount, 850);
    assert.ok(!(await call('/api/expansion/alerts', ceo)).json.alerts.some(a => a.id.startsWith('recurring:')));
    // Cadastro de conta recorrente pela tela.
    await page.locator('[data-x-new="recurringBills"]').click();
    const dlg = page.locator('.dlg-back:not(.closing) form');
    await dlg.locator('[name=supplier]').fill('Imobiliária'); await dlg.locator('[name=description]').fill('Aluguel do galpão'); await dlg.locator('[name=amount]').fill('1200'); await dlg.locator('[name=dayOfMonth]').fill('31');
    await dlg.locator('button[type=submit]').click();
    await page.waitForFunction(() => activeFarm().expansion.recurringBills.length === 2 && !hasLocalChanges(), null, { timeout: 15000 });
    const nova = (await call('/api/state', ceo)).json.state.farms[0].expansion.recurringBills.find(b => b.supplier === 'Imobiliária');
    assert.equal(nova.dayOfMonth, 31); assert.equal(nova.active, true); assert.equal(nova.costCenter, 'geral');

    // Validade: aparece no estoque, alterável; item novo com validade pelo cadastro.
    await page.evaluate(() => goToPage('estoque'));
    await page.locator('.stock-validade').waitFor();
    assert.match(await page.locator('.stock-validade').textContent(), /Fungicida.*L77.*vence em 4 dia/s);
    await page.locator('#stockForm [name=item]').fill('Vacina aftosa'); await page.locator('#stockForm [name=quantity]').fill('50'); await page.locator('#stockForm [name=unit]').fill('dose');
    await page.locator('#stockForm [name=batch]').fill('VX9'); await page.locator('#stockForm [name=expires]').fill(day(-1));
    await page.locator('#stockForm button.primary').click();
    await page.waitForFunction(() => /Vacina aftosa/.test(document.querySelector('.stock-validade')?.textContent || '') && !hasLocalChanges(), null, { timeout: 15000 });
    assert.match(await page.locator('.stock-validade').textContent(), /venceu há 1 dia/);
    const vac = (await call('/api/state', ceo)).json.state.farms[0].stock.find(x => x.item === 'Vacina aftosa'); assert.equal(vac.batch, 'VX9'); assert.equal(vac.expires, day(-1));
    await page.locator('[data-validade="st1"]').click();
    await page.locator('.dlg-back:not(.closing) [name=expires]').fill(day(200)); await page.locator('.dlg-back:not(.closing) button[type=submit]').click();
    await page.waitForFunction(() => !/Fungicida/.test(document.querySelector('.stock-validade')?.textContent || ''));
    assert.deepEqual(errors, []);
    console.log('PASS: recorrentes lançadas uma vez e previstas no caixa; cenário mostra quantas sacas vender; validade avisa e é editável.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
