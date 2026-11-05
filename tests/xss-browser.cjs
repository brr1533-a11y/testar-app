// Varredura de injeção (XSS) no site fictício: coloca uma isca HTML em todos os textos de nome/descrição dos dados
// e abre todas as telas nos três modos. Se a isca virar elemento (<b data-xss-probe>), o texto foi para a tela sem escape.
// Uso: node tests/xss-browser.cjs  (sobe o site fictício sozinho e encerra no fim; demora alguns minutos).
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const dir = path.resolve(__dirname, '..');
const { chromium } = require('playwright');
const KEYS = /^(name|description|buyer|party|partner|provider|title|notes|label|supplier|tag|breed|origin|bank|reason|crop?Name|product|customer|dairy|item|reference|message|city|motherTag|qualityName|storage|category|fileName|number|piquete)$/;
const bait = k => `"'><b data-xss-probe="${k}">x</b>`;
(async () => {
  const info = path.join(os.tmpdir(), 'gestao-rural-site-ficticio.json'); try { fs.unlinkSync(info); } catch {}
  const demo = spawn(process.execPath, [path.join(dir, 'tests/support/site-ficticio.cjs')], { cwd: dir, stdio: 'ignore', windowsHide: true });
  try {
    for (let i = 0; i < 120 && !fs.existsSync(info); i++) await new Promise(r => setTimeout(r, 1000));
    const I = JSON.parse(fs.readFileSync(info, 'utf8'));
    const call = async (p, body, method) => { const r = await fetch(I.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + I.token }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
    // Envenena os textos fazenda por fazenda (e os usuários), para saber o que o servidor recusa.
    const st = await call('/api/state'); let poisoned = 0; const refused = [];
    const walk = (o, where) => { if (Array.isArray(o)) o.forEach((v, i) => walk(v, where)); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (typeof v === 'string' && KEYS.test(k) && v.length && v.length < 300) { o[k] = v + bait(where + '.' + k); poisoned++; } else if (v && typeof v === 'object') walk(v, where + '.' + k); } };
    const state = st.json.state;
    for (const f of state.farms) walk(f, 'farm');
    for (const u of state.users || []) if (u.role !== 'ceo') u.name += bait('user.name');
    let r = await call('/api/state', { state, baseRev: st.json.rev }, 'PUT');
    if (r.status !== 200) {
      // Recusado em bloco: tenta campo a campo por fazenda, guardando o que passa.
      refused.push('lote inteiro: ' + r.json?.error);
      const fresh = await call('/api/state'); let base = fresh.json; poisoned = 0;
      for (let fi = 0; fi < base.state.farms.length; fi++) for (const part of Object.keys(base.state.farms[fi])) {
        const cur = await call('/api/state'), s = cur.json.state, f = s.farms[fi]; if (!f[part] || typeof f[part] !== 'object') continue;
        const before = poisoned; walk(f[part], 'farm.' + part); if (poisoned === before) continue;
        const t = await call('/api/state', { state: s, baseRev: cur.json.rev }, 'PUT'); if (t.status !== 200) { refused.push(part + ': ' + t.json?.error); poisoned = before; }
      }
    }
    // Registros novos com isca nas listas que não podem ser alteradas (histórico protegido): cada um gravado sozinho.
    const day = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10), rec = (o, a = 'coffee') => ({ id: 'xss' + Math.random().toString(36).slice(2, 10), activity: a, date: day(0), notes: bait('notes'), archived: false, ...o });
    const adds = [
      ['parceria', f => { f.expansion.partnerships.push(rec({ partner: 'Parceiro' + bait('partner'), plotIds: [f.talhoes.find(t => t.activity === 'coffee' && !f.expansion.partnerships.some(p => p.plotIds.includes(t.id)))?.id || f.talhoes[0].id], productionShare: 50, costShare: 50, start: '2020-01-01', end: '2020-12-31' })); }],
      ['financiamento', f => { f.expansion.loans.push(rec({ name: 'Custeio' + bait('loan.name'), kind: 'custeio', bank: 'Banco' + bait('bank'), principal: 1000, annualRate: 5, installments: 1, periodMonths: 12, system: 'unica', date: day(-10), due: day(200) })); }],
      ['arrendamento', f => { f.expansion.leases.push(rec({ direction: 'cedido', party: 'Vizinho' + bait('party'), areaHa: 1, unit: 'reais', perHa: 100, start: '2025-01-01' })); }],
      ['prestador', f => { f.expansion.contractors.push(rec({ provider: 'Prestador' + bait('provider'), service: 'outro', unit: 'total', quantity: 1, price: 10, paid: false })); }],
      ['documento', f => { f.expansion.documents.push(rec({ name: 'Doc' + bait('doc.name'), kind: 'outro', expires: day(20), reference: 'Ref' + bait('reference') })); }],
      ['equipe anual', f => { f.expansion.yearWorkers.push(rec({ name: 'Pessoa' + bait('yearWorker'), kind: 'diarista', dailyRate: 100, active: true })); }],
      ['ordem de serviço', f => { f.expansion.workOrders.push(rec({ title: 'Ordem' + bait('workOrder'), assignee: I.ceoId || 'x', due: day(-3) })); }],
      ['animal', f => { f.expansion.animals.push(rec({ tag: 'BR' + Math.random().toString(36).slice(2, 6) + bait('tag'), sex: 'F', breed: 'Raça' + bait('breed'), origin: 'Origem' + bait('origin'), status: 'ativo' }, 'cattle')); }],
      ['conta a pagar', f => { f.management.payables.push({ id: 'xss' + Date.now(), activity: 'coffee', supplier: 'Loja' + bait('supplier'), description: 'Item' + bait('payable'), amount: 10, dueDate: day(5), status: 'open' }); }],
      ['contrato de venda', f => { f.management.salesContracts.push({ id: 'xssc' + Date.now(), activity: 'coffee', buyer: 'Comprador' + bait('buyer'), product: 'Café' + bait('product'), number: 'N1', quantityKg: 60, pricePerKg: 30, deliveryStart: day(10), deliveryEnd: day(40), status: 'open', deliveries: [] }); }],
      ['trabalhador da colheita', f => { f.labor.workers.push({ id: 'xssw' + Date.now(), name: 'Colhedor' + bait('labor.worker'), role: 'safrista', cpf: '', pix: '', dailyRate: 100, active: true }); }]
    ];
    const me = await call('/api/state'); I.ceoId = (me.json.state.users || []).find(u => u.role === 'ceo')?.id;
    for (const [name, add] of adds) { const cur = await call('/api/state'), s = cur.json.state, f = s.farms[0]; f.expansion ||= {}; f.management ||= {}; f.labor ||= { workers: [] }; try { add(f); } catch (e) { refused.push(name + ': preparo ' + e.message); continue; } const t = await call('/api/state', { state: s, baseRev: cur.json.rev }, 'PUT'); if (t.status === 200) poisoned++; else refused.push(name + ': ' + t.json?.error); }
    const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }), page = await ctx.newPage(), found = new Map(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => { found.set('dialog:' + d.message().slice(0, 60), 'alert'); d.dismiss(); });
    await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), I.token);
    await page.goto(I.url + '/app');
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'), null, { timeout: 30000 });
    const probe = async where => { for (const k of await page.evaluate(() => [...document.querySelectorAll('[data-xss-probe]')].map(e => e.dataset.xssProbe))) if (!found.has(k)) found.set(k, where); };
    let screens = 0;
    for (const farm of await page.evaluate(() => [...data.farms.map(f => f.id), data.farms.length > 1 ? 'general-coffee' : null].filter(Boolean)))
      for (const mode of ['coffee', 'cattle', 'grains']) {
        await page.evaluate(([fid, m]) => { activeFarmId = fid; localStorage.setItem(modeStorageKey(), m); renderPage({ animate: false }); }, [farm, mode]).catch(() => {});
        for (const id of await page.evaluate(() => navItems().map(i => i[0]))) {
          await page.evaluate(id => goToPage(id), id).catch(() => {}); await page.waitForTimeout(250); screens++;
          await probe(`${mode}/${id}`);
          // Abre o primeiro "Editar" de cada seção genérica e o primeiro formulário de cadastro: texto vai para campos e títulos.
          for (const sel of ['[data-x-edit]', '[data-x-new]']) { const b = page.locator(sel).first(); if (await b.count() && await b.isVisible().catch(() => false)) { await b.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(250); await probe(`${mode}/${id} (formulário)`); await page.keyboard.press('Escape').catch(() => {}); await page.evaluate(() => document.querySelectorAll('.dlg-back').forEach(d => d.remove())); } }
        }
      }
    // Telas públicas e do Super Admin com os mesmos dados.
    const plat = (await (await fetch(I.url + '/api/platform/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@example.invalid', password: I.password }) })).json()).token;
    const p2 = await ctx.newPage(); await p2.addInitScript(t => sessionStorage.setItem('platformToken', t), plat); await p2.goto(I.url + '/platform'); await p2.waitForTimeout(4000);
    for (const k of await p2.evaluate(() => [...document.querySelectorAll('[data-xss-probe]')].map(e => e.dataset.xssProbe))) found.set(k, 'platform');
    const out = { poisoned, refused, screens, found: [...found.entries()], errors: [...new Set(errors)].slice(0, 15) };
    fs.writeFileSync(path.join(os.tmpdir(), 'gestao-rural-xss-resultado.json'), JSON.stringify(out, null, 1));
    console.log(`Iscas: ${poisoned} textos · telas abertas: ${screens} · recusados: ${refused.length}`);
    console.log(found.size ? 'ISCA VIROU HTML EM:\n' + [...found.entries()].map(([k, w]) => `  ${k}  ←  ${w}`).join('\n') : 'Nenhuma isca virou HTML.');
    if (errors.length) console.log('Erros de script: ' + [...new Set(errors)].slice(0, 5).join(' | '));
    await browser.close();
    if (found.size || poisoned < 40) process.exitCode = 1;
  } finally { demo.kill(); }
})().catch(e => { console.error(e); process.exit(1); });
