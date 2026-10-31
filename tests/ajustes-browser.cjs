// Roteiro de navegador dos ajustes mais recentes: bloqueio do PIN do cofre (cofre real, aberto pelo próprio app), vale
// indo sozinho para o Financeiro e aviso de vale lançado à mão, lançamento repetido resolvido pelo escritório e Pix copia
// e cola copiado nos Recibos. Uso: node tests/ajustes-browser.cjs (requer Chromium do Playwright ou outro Chromium).
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs'), H = require('../maodeobra-domain.js');
const iso = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const put = async (tk, mut) => { const st = await call('/api/state', tk); mut(st.json.state); const r = await call('/api/state', tk, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); assert.equal(r.status, 200, JSON.stringify(r.json)); };
    const ceo = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
    const fid = (await call('/api/state', ceo)).json.state.farms[0].id, week = H.weekStart(iso(14));
    // Semana passada fechada (para os Recibos com Pix) e dois fiscais que, sem internet, lançam a Ana no mesmo dia.
    await put(ceo, st => { const f = st.farms[0]; f.talhoes = [{ id: 't1', name: 'Talhão 01' }];
      f.labor = { workers: [{ id: 'w1', name: 'Ana Souza', role: 'safrista', cpf: '52998224725', pix: '52998224725', dailyRate: 90, active: true }], plotRates: [{ id: 'r1', plotId: 't1', ratePerBag: 12, validFrom: '2020-01-01' }], entries: [{ id: 'e1', date: H.weekEnd(week), plotId: 't1', workerId: 'w1', kind: 'saco', bags: 10 }], adjustments: [], closings: [], settings: {} }; });
    await put(ceo, st => st.farms[0].labor.closings.push({ id: 'k1', weekStart: week, weekEnd: H.weekEnd(week), lines: [] }));
    const fiscal = async (u, pw) => { await call('/api/users', ceo, { username: u, name: u, email: u + '@example.invalid', password: s.password, role: 'contribuinte', function: 'Fiscal de colheita', allowedFarmId: fid, allowedActivity: 'coffee' }); let tk = (await call('/api/auth/login', '', { groupCode: '1001', username: u, password: s.password })).json.token; await call('/api/auth/change-password', tk, { currentPassword: s.password, newPassword: pw }); return (await call('/api/auth/login', '', { groupCode: '1001', username: u, password: pw })).json.token; };
    const norte = await fiscal('norte', 'Turma#Norte58'), sul = await fiscal('sul', 'Turma#Sul73');
    await put(norte, st => st.farms[0].labor.entries.push({ id: 'n1', date: iso(0), plotId: 't1', workerId: 'w1', kind: 'saco', bags: 4 }));
    await put(sul, st => st.farms[0].labor.entries.push({ id: 's1', date: iso(0), plotId: 't1', workerId: 'w1', kind: 'saco', bags: 4 }));

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: s.url });
    const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/cotacao-cafe', r => r.fulfill({ status: 503, body: '{}' })); await page.route('https://fonts.googleapis.com/**', r => r.abort()); await page.route('https://fonts.gstatic.com/**', r => r.abort());
    await page.goto(s.url + '/app'); await page.locator('#loginGroup').fill('1001'); await page.locator('#loginUser').fill('testceo'); await page.locator('#loginPassword').fill(s.password); await page.locator('#loginForm button[type=submit]').click();
    await page.waitForFunction(() => currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    const toastText = () => page.evaluate(() => document.querySelector('#toast')?.textContent || '');
    const dialog = () => page.locator('.dlg-back:not(.closing)');

    // ---------- 1. PIN do cofre ----------
    await page.evaluate(() => { activeFarmId = data.farms[0].id; goToPage('campo'); FieldMode.enable(); });
    await page.locator('#dlg_pin').fill('482915'); await page.locator('#dlg_confirm').fill('482915'); await dialog().locator('button[type=submit]').click();
    await page.waitForFunction(() => FieldMode.enabled());
    await page.evaluate(() => FieldMode.lock());
    const tryPin = async pin => { await page.evaluate(() => { document.querySelector('#toast').textContent = ''; window.__r = FieldMode.unlock(); }); const asked = await dialog().locator('#dlg_pin').waitFor({ timeout: 1500 }).then(() => true, () => false); if (asked) { await dialog().locator('#dlg_pin').fill(pin); await dialog().locator('button[type=submit]').click(); } const r = await page.evaluate(() => window.__r); return { r, asked, toast: await toastText() }; };
    for (let i = 1; i <= 4; i++) { const x = await tryPin('000000'); assert.equal(x.r, 'wrong'); assert.match(x.toast, new RegExp(`Restam ${5 - i} tentativa`)); }
    let x = await tryPin('000000'); assert.equal(x.r, 'wrong'); assert.match(x.toast, /bloqueado por 5 min/);
    x = await tryPin('482915'); assert.equal(x.r, 'locked'); assert.equal(x.asked, false, 'durante a espera nem o PIN certo é perguntado'); assert.match(x.toast, /Tente de novo em/);
    await page.evaluate(() => new Promise(res => { const q = indexedDB.open('gestao-rural-campo', 1); q.onsuccess = () => { const d = q.result, t = d.transaction('vault', 'readwrite'), st = t.objectStore('vault'), g = st.get('active'); g.onsuccess = () => st.put({ ...g.result, lockedUntil: Date.now() - 1000 }, 'active'); t.oncomplete = () => { d.close(); res(); }; }; }));
    x = await tryPin('482915'); assert.equal(x.r, 'ok'); assert.ok(await page.evaluate(() => FieldMode.enabled()));
    const rec = await page.evaluate(() => new Promise(res => { const q = indexedDB.open('gestao-rural-campo', 1); q.onsuccess = () => { const g = q.result.transaction('vault').objectStore('vault').get('active'); g.onsuccess = () => { res(g.result); q.result.close(); }; }; }));
    assert.ok(!rec.fails && !rec.lockedUntil, 'acertar o PIN zera o contador');

    // ---------- 2. Vale vai sozinho para o Financeiro ----------
    await page.evaluate(() => { lbTab = 'lancamentos'; goToPage('mao-de-obra'); });
    await page.locator('#lbAdj').click();
    await page.locator('#dlg_workerId').selectOption('w1'); await page.locator('#dlg_kind').selectOption('adiantamento'); await page.locator('#dlg_amount').fill('75'); await page.locator('#dlg_reason').fill('vale mercado');
    await dialog().locator('button[type=submit]').click();
    await page.waitForFunction(() => /aparece sozinho no Financeiro/.test(document.querySelector('#toast')?.textContent || ''));
    await page.waitForFunction(() => !hasLocalChanges());
    let fin = (await call('/api/state', ceo)).json.state.farms[0].finances.filter(f => f.sourceLaborAdjustmentId);
    assert.deepEqual(fin.map(f => [f.type, f.value, f.category]), [['saida', 75, 'Vale da colheita']]);
    // Vale lançado à mão no Financeiro: o app avisa antes; cancelando, nada é gravado.
    await page.evaluate(() => goToPage('financeiro'));
    const form = page.locator('#financeForm'); await form.waitFor();
    await form.locator('[name=type]').selectOption('saida'); await form.locator('[name=description]').fill('Vale para a Ana'); await form.locator('[name=value]').fill('75');
    await form.locator('button.btn.primary').click();
    await dialog().getByText('Vale da colheita?').waitFor();
    await dialog().locator('[data-dlg-cancel], button[type=button]').first().click();
    assert.equal(await page.evaluate(() => activeFarm().finances.filter(f => /Vale para a Ana/.test(f.description || '')).length), 0);

    // ---------- 3. Lançamento repetido: o escritório confirma pela tela ----------
    await page.evaluate(() => goToPage('mao-de-obra'));
    await page.getByText('possível lançamento repetido').waitFor();
    await page.locator('.lb-dup-ok').first().click(); await dialog().locator('button[type=submit]').click();
    await page.waitForFunction(() => !hasLocalChanges() && !document.querySelector('.lb-dup-ok'));
    const ents = (await call('/api/state', ceo)).json.state.farms[0].labor.entries.filter(e => ['n1', 's1'].includes(e.id));
    assert.ok(ents.every(e => e.dupOk && e.dupOkBy), 'os dois ficam confirmados pelo escritório');

    // ---------- 4. Pix copia e cola nos Recibos ----------
    await page.evaluate(() => { lbTab = 'fechamentos'; renderHarvestLabor(); });
    await page.locator('.lb-open').first().click();
    await page.locator('.lb-pix').first().click();
    await page.waitForFunction(() => /copiado/.test(document.querySelector('#toast')?.textContent || ''));
    const code = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(code, /^000201.*br\.gov\.bcb\.pix011152998224725/);
    assert.equal(await page.evaluate(c => c.slice(-4) === PixBR.crc16(c.slice(0, -4)), code), true, 'o código de verificação do Pix confere');
    assert.match(code, /5406120\.00/); // R$ 120,00 = 10 sacos × R$ 12

    assert.deepEqual(errors, []);
    console.log('PASS: PIN trava no 5º erro e não pergunta durante a espera, abre e zera depois; vale vai para o Financeiro e o lançado à mão é avisado; repetido resolvido pela tela; Pix copia e cola copiado com verificação correta.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
