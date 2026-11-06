// Site fictício para teste: sobe uma cópia isolada (pasta temporária, banco local próprio) e preenche com dados inventados.
// Uso: npm run demo:ficticio  (Ctrl+C encerra e apaga a cópia). Nada toca no banco real nem no .env.
const path = require('path'), fs = require('fs');
const dir = path.resolve(__dirname, '..', '..'), { startServer } = require(path.join(dir, 'tests/support/server.cjs')), H = require(path.join(dir, 'maodeobra-domain.js'));
const iso = n => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(Date.now() + n * 86400000));
const nfe = base => { let s = 0, w = 2; for (let i = 42; i >= 0; i--) { s += Number(base[i]) * w; w = w === 9 ? 2 : w + 1; } const r = s % 11; return base + (r < 2 ? 0 : 11 - r); };
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0', WEATHER_PROVIDER: 'open-meteo', SUPPORT_WHATSAPP: '5535900000000', SUPPORT_VIDEO_URL: 'https://exemplo.invalid/videos', BACKUP_HOURS: '0' });
  const log = [], call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const step = async (name, tk, mut) => { const st = await call('/api/state', tk); mut(st.json.state); const r = await call('/api/state', tk, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); log.push(`${r.status === 200 ? 'ok  ' : 'ERRO'} ${name}${r.status === 200 ? '' : ' :: ' + r.json?.error}`); };
  const login = async (g, u, p) => (await call('/api/auth/login', '', { groupCode: g, username: u, password: p })).json?.token;
  const rec = (o, act = 'coffee') => ({ activity: act, date: iso(0), notes: '', archived: false, ...o });
  const ceo = await login('1001', 'testceo', s.password);

  await step('fazenda, talhões, safras, colheitas e vendas', ceo, st => {
    const f = st.farms[0]; f.name = 'Fazenda Boa Esperança (fictícia)';
    f.talhoes = [{ id: 't1', name: 'Talhão do Alto', areaHa: 12, crop: 'Café arábica', activity: 'coffee', reference: '' }, { id: 't2', name: 'Talhão da Baixada', areaHa: 8, crop: 'Café arábica', activity: 'coffee', reference: '' }, { id: 't3', name: 'Talhão do Meeiro', areaHa: 5, crop: 'Café arábica', activity: 'coffee', reference: '' }, { id: 't4', name: 'Gleba de Soja', areaHa: 40, crop: 'Soja', activity: 'grains', reference: '' }];
    f.agriculture = { cycles: [
      { id: 'c25', activity: 'coffee', crop: 'Café arábica', name: 'Café 2025/26', areaHa: 25, bagKg: 60, plannedCost: 0, stage: 'Encerrada', startDate: '2025-01-01', plotIds: ['t1', 't2', 't3'] },
      { id: 'c26', activity: 'coffee', crop: 'Café arábica', name: 'Café 2026/27', areaHa: 25, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: '2026-01-01', plotIds: ['t1', 't2', 't3'] },
      { id: 'g26', activity: 'grains', crop: 'Soja', name: 'Soja 2026', areaHa: 40, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: '2026-01-10', plotIds: ['t4'] }],
      harvests: [
        { id: 'h1', cycleId: 'c25', plotId: 't1', date: '2025-07-10', netKg: 21600 }, { id: 'h2', cycleId: 'c25', plotId: 't2', date: '2025-07-20', netKg: 12000 }, { id: 'h3', cycleId: 'c25', plotId: 't3', date: '2025-07-25', netKg: 7200 },
        { id: 'h4', cycleId: 'c26', plotId: 't1', date: iso(-40), netKg: 18000 }, { id: 'h5', cycleId: 'c26', plotId: 't3', date: iso(-20), netKg: 6000 }, { id: 'h6', cycleId: 'c26', plotId: 't2', date: iso(-3), netKg: 3000 },
        { id: 'h7', cycleId: 'g26', plotId: 't4', date: iso(-30), netKg: 144000 }],
      sales: [{ id: 's1', cycleId: 'c25', date: '2025-09-01', kg: 18000, bagKg: 60, pricePerKg: 30, buyer: 'Cooperativa Fictícia' }, { id: 's2', cycleId: 'c26', date: iso(-10), kg: 6000, bagKg: 60, pricePerKg: 33, buyer: 'Torrefação Exemplo' }, { id: 's3', cycleId: 'g26', date: iso(-15), kg: 60000, bagKg: 60, pricePerKg: 2.1, buyer: 'Trading Modelo' }] };
    f.finances = [
      { id: 'fn1', activity: 'coffee', type: 'entrada', category: 'Venda', description: 'Venda café 2025', value: 540000, date: '2025-09-02' },
      { id: 'fn2', activity: 'coffee', type: 'saida', category: 'Insumos', description: 'Adubo', value: 180000, date: '2026-02-10' },
      { id: 'fn3', activity: 'coffee', type: 'saida', category: 'Operações', description: 'Diesel e manutenção', value: 95000, date: iso(-60) },
      { id: 'fn4', activity: 'coffee', type: 'entrada', category: 'Venda', description: 'Venda café 2026', value: 198000, date: iso(-9) },
      { id: 'fn5', activity: 'grains', type: 'entrada', category: 'Venda', description: 'Venda soja', value: 126000, date: iso(-14) }];
  });
  await step('contas a pagar e contratos de venda', ceo, st => {
    const f = st.farms[0]; f.management ||= {};
    f.management.payables = [{ id: 'pg1', activity: 'coffee', supplier: 'Agro Loja Fictícia', description: 'Defensivos', amount: 42000, dueDate: iso(12), status: 'open', category: 'Insumos' }, { id: 'pg2', activity: 'coffee', supplier: 'Mecânica Exemplo', description: 'Revisão do trator', amount: 8500, dueDate: iso(35), status: 'open' }];
    f.management.salesContracts = [{ id: 'ct1', activity: 'coffee', buyer: 'Exportadora Modelo', product: 'Café arábica tipo 6', number: 'CT-01', quantityKg: 12000, pricePerKg: 34, deliveryStart: iso(30), deliveryEnd: iso(75), status: 'open', deliveries: [], cycleId: 'c26' }];
  });
  await step('gado: piquetes, lotes e pesagens', ceo, st => {
    const f = st.farms[0];
    f.cattle = { paddocks: [{ id: 'pq1', name: 'Piquete 1' }, { id: 'pq2', name: 'Piquete 2' }], lots: [{ id: 'lt1', name: 'Vacas em lactação', heads: 4, category: 'Vacas', paddockId: 'pq1', piquete: 'Piquete 1', entryDate: '2025-01-01' }, { id: 'lt2', name: 'Novilhas', heads: 2, category: 'Novilhas', paddockId: 'pq2', piquete: 'Piquete 2', entryDate: '2025-06-01' }], weighings: [{ id: 'w1', lotId: 'lt2', date: iso(-60), heads: 2, totalKg: 640, avgKg: 320, totalArrobas: 640 / 15, avgArrobas: 320 / 15 }], healthEvents: [] };
  });
  await step('perfil regional, clima e documentos', ceo, st => {
    const e = st.farms[0].expansion ||= {};
    e.profiles = [rec({ id: 'pf1', uf: 'MG', city: 'Alfenas', taxId: '12345678909', sharePrices: true, shareBenchmarks: true })];
    e.rain = [rec({ id: 'r1', mm: 22, date: iso(-6) }), rec({ id: 'r2', mm: 8, date: iso(-2) })];
    e.documents = [rec({ id: 'd1', name: 'CCIR 2026', kind: 'CCIR', expires: iso(25) })];
    e.yearWorkers = [rec({ id: 'yw1', name: 'Seu Zé (fixo)', kind: 'fixo', monthlyRate: 2600, active: true })];
  });
  await step('parceria/meação e lançamentos', ceo, st => {
    const e = st.farms[0].expansion;
    e.partnerships = [rec({ id: 'pa1', partner: 'Antônio Meeiro (fictício)', partnerDoc: '98765432100', pix: '98765432100', plotIds: ['t3'], areaHa: 5, cycleId: 'c26', productionShare: 50, costShare: 50, shareFarmCosts: true, start: '2026-01-01' })];
    e.partnerEntries = [rec({ id: 'pe1', partnershipId: 'pa1', kind: 'custo', amount: 6000, description: 'Adubo do talhão', date: iso(-90) }), rec({ id: 'pe2', partnershipId: 'pa1', kind: 'adiantamento', amount: 3000, date: iso(-50) }), rec({ id: 'pe3', partnershipId: 'pa1', kind: 'entrega', bags: 20, date: iso(-15) }), rec({ id: 'pe4', partnershipId: 'pa1', kind: 'venda', bags: 10, amount: 19800, date: iso(-10) })];
  });
  await step('Funrural (PF, comprador desconta)', ceo, st => { st.farms[0].expansion.taxSettings = [rec({ id: 'tx1', regime: 'pf', buyerWithholds: true })]; });
  await step('financiamentos e pagamentos', ceo, st => {
    const e = st.farms[0].expansion;
    e.loans = [rec({ id: 'ln1', name: 'Custeio café 2026', kind: 'custeio', bank: 'Banco Fictício', principal: 300000, annualRate: 11, installments: 2, periodMonths: 6, system: 'sac', date: iso(-200), due: iso(-20) }), rec({ id: 'ln2', name: 'Pronaf trator', kind: 'pronaf', bank: 'Cooperativa de Crédito Modelo', principal: 250000, annualRate: 5, installments: 7, periodMonths: 12, system: 'price', date: '2025-03-01', due: iso(18) }), rec({ id: 'ln3', name: 'CPR 2027', kind: 'cpr', bank: 'Trading Modelo', principal: 120000, annualRate: 0, installments: 1, periodMonths: 12, system: 'unica', date: iso(-30), due: iso(240), cprBags: 60, crop: 'Café arábica' })];
    e.loanPayments = [rec({ id: 'lp1', loanId: 'ln1', installment: 1, amount: 168000, date: iso(-19) })];
  });
  await step('arrendamentos', ceo, st => { st.farms[0].expansion.leases = [rec({ id: 'ar1', direction: 'tomado', party: 'Dona Maria (fictícia)', plotIds: ['t2'], areaHa: 8, unit: 'sacas', perHa: 6, bagPrice: 1800, start: '2024-05-15', dueMonth: Number(iso(45).slice(5, 7)), cycleId: 'c26' }), rec({ id: 'ar2', direction: 'cedido', party: 'Vizinho Exemplo', areaHa: 10, unit: 'reais', perHa: 1100, start: '2025-02-01', dueMonth: Number(iso(70).slice(5, 7)) })]; });
  await step('prestadores', ceo, st => { st.farms[0].expansion.contractors = [rec({ id: 'pr1', provider: 'Colheita Mecânica Exemplo', service: 'colheita', unit: 'ha', quantity: 12, price: 2900, cycleId: 'c26', plotId: 't1', paid: false, date: iso(-35) }), rec({ id: 'pr2', provider: 'Drone Agro Fictício', service: 'pulverizacao', unit: 'ha', quantity: 25, price: 95, cycleId: 'c26', paid: true, date: iso(-70) })]; });
  await step('mão de obra da colheita (turma, apontamentos, semana fechada)', ceo, st => {
    const f = st.farms[0], week = H.weekStart(iso(-14));
    f.labor = { workers: [{ id: 'mw1', name: 'Ana Colhedora', role: 'safrista', cpf: '52998224725', pix: '52998224725', dailyRate: 110, active: true }, { id: 'mw2', name: 'Bruno Colhedor', role: 'safrista', cpf: '11144477735', pix: '11144477735', dailyRate: 110, active: true }], plotRates: [{ id: 'pr', plotId: 't2', ratePerBag: 14, validFrom: '2020-01-01' }], entries: [{ id: 'le1', date: H.weekEnd(week), plotId: 't2', workerId: 'mw1', kind: 'saco', bags: 40 }, { id: 'le2', date: H.weekEnd(week), plotId: 't2', workerId: 'mw2', kind: 'saco', bags: 35 }], adjustments: [], closings: [], settings: {} };
  });
  await step('fechamento da semana', ceo, st => { const week = H.weekStart(iso(-14)); st.farms[0].labor.closings.push({ id: 'kc1', weekStart: week, weekEnd: H.weekEnd(week), lines: [] }); });
  const key = nfe('3126101234567800019055001000000123100000001');
  await step('NF-e importada por XML e classificação para o comparador', ceo, st => {
    const f = st.farms[0]; f.management.fiscalDocs = [{ id: 'nf1', activity: 'coffee', kind: 'nfe-entrada', number: '1231', series: '1', key, date: iso(-12), party: 'Agro Loja Fictícia', partyDoc: '12345678000190', total: 9000, items: [{ name: 'Adubo 20-05-20 50kg', quantity: 50, unit: 'SC', unitPrice: 180 }], source: 'xml', fileName: 'nota.xml' }];
    f.expansion.invoiceDetails = [rec({ id: 'id1', invoiceId: 'nf1', itemIndex: 0, productCode: 'Adubo 20-05-20', activeIngredient: '', packageQuantity: 50, baseUnit: 'kg', city: 'Alfenas', uf: 'MG' })];
  });

  // Duas fazendas vizinhas de outros grupos (também fictícias), para a comparação anônima e o comparador terem 3 participantes.
  const extra = [];
  for (const [n, price, bags] of [['Sítio Vizinho A', 170, 30], ['Fazenda Vizinha B', 195, 38], ['Fazenda Vizinha C', 182, 26]]) {
    const user = 'dono' + extra.length, pwd = s.password;
    const t = await call('/api/public/trial', '', { email: user + '@exemplo.invalid', groupName: n + ' (fictício)', ceoName: 'Dono ' + n, ceoUser: user, ceoPassword: pwd, activities: ['coffee', 'grains'], acceptTerms: true });
    if (t.status !== 200) { log.push('ERRO grupo vizinho :: ' + t.json?.error); continue; }
    const tk = await login(t.json.group.code, user, pwd), k2 = nfe('31261012345678000190550010000' + String(5000 + extra.length).padStart(6, '0') + '10000000');
    await step(n + ': safra, colheita, nota e consentimento', tk, st => {
      const f = st.farms[0]; f.talhoes = [{ id: 'v1', name: 'Talhão', areaHa: 10, crop: 'Café arábica', activity: 'coffee', reference: '' }];
      f.agriculture = { cycles: [{ id: 'vc', activity: 'coffee', crop: 'Café arábica', name: 'Café 2026/27', areaHa: 10, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: '2026-01-01', plotIds: ['v1'] }], harvests: [{ id: 'vh', cycleId: 'vc', plotId: 'v1', date: iso(-20), netKg: bags * 10 * 60 }], sales: [] };
      f.finances = [{ id: 'vf', activity: 'coffee', type: 'saida', category: 'Insumos', description: 'Custos', value: bags * 10 * 600, date: iso(-50) }];
      f.management ||= {}; f.management.fiscalDocs = [{ id: 'vn', activity: 'coffee', kind: 'nfe-entrada', number: '77', key: k2, date: iso(-8), party: 'Loja da Região', total: price * 20, items: [{ name: 'Adubo 20-05-20', quantity: 20, unit: 'SC', unitPrice: price }], source: 'xml' }];
      const e = f.expansion ||= {}; e.profiles = [rec({ id: 'vp', uf: 'MG', city: 'Alfenas', sharePrices: true, shareBenchmarks: true })];
      e.invoiceDetails = [rec({ id: 'vd', invoiceId: 'vn', itemIndex: 0, productCode: 'Adubo 20-05-20', activeIngredient: '', packageQuantity: 50, baseUnit: 'kg', city: 'Alfenas', uf: 'MG' })];
      e.allocations = [rec({ id: 'va', source: 'finance:vf', targetType: 'cycle', targetId: 'vc', percent: 100 })];
    });
    extra.push({ group: t.json.group.code, user });
  }
  await step('rateio dos custos da Boa Esperança na safra', ceo, st => { st.farms[0].expansion.allocations = ['fn2', 'fn3'].map((id, i) => rec({ id: 'al' + i, source: 'finance:' + id, targetType: 'cycle', targetId: 'c26', percent: 100 })); });

  const info = { url: s.url, token: ceo, password: s.password, folder: s.folder, extra, log };
  fs.writeFileSync(path.join(require('os').tmpdir(), 'gestao-rural-site-ficticio.json'), JSON.stringify(info, null, 1));
  console.log(log.join('\n')); console.log('PRONTO ' + s.url);
  console.log(`\nAbra ${s.url}/app e entre com: Grupo 1001 · usuário testceo · senha ${s.password}\nVizinhos: ${extra.map(e => 'Grupo ' + e.group + ' · ' + e.user).join(' | ')} (mesma senha). Super Admin: ${s.url}/platform · admin@example.invalid (mesma senha).`);
  process.on('SIGINT', async () => { await s.stop(); process.exit(0); });
  setInterval(() => {}, 1 << 30);
})().catch(e => { console.error(e); process.exit(1); });
