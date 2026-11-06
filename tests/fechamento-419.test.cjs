// 4.19: baixa pelo insumo realmente usado (com lote) e fechamento do mês confirmado pelo CEO, com trava do mês.
const test = require('node:test'), a = require('node:assert/strict'), crypto = require('node:crypto');
const X = require('../expansao-domain.js'), M = require('../melhorias-domain.js'), F = require('../fechamento-domain.js');
const { startServer } = require('./support/server.cjs');
const T = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()), plus = n => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(Date.now() + n * 86400000));
const prevMonth = (() => { const [y, m] = T.split("-").map(Number); return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7); })();
function farm() {
  const f = { id: 'f1', name: 'Fazenda', tractors: [], implements: [], talhoes: [], agriculture: { cycles: [{ id: 'c1', activity: 'coffee', crop: 'Café arábica', name: 'Safra', areaHa: 10, bagKg: 60, plannedCost: 0, stage: 'Em colheita', startDate: '2026-01-01' }], harvests: [], sales: [] }, cattle: { lots: [], paddocks: [] }, finances: [], management: { payables: [] }, operations: { stockUses: [] },
    stock: [{ id: 'a', activity: 'coffee', item: 'Fungicida X', unit: 'L', quantity: 12, unitCost: 50, batch: 'A1', expires: plus(200) }, { id: 'b', activity: 'coffee', item: 'fungicida x', unit: 'L', quantity: 10, unitCost: 55, batch: 'B2', expires: plus(20) }, { id: 'c', activity: 'coffee', item: 'Adubo', unit: 'sc', quantity: 40, unitCost: 180 }] };
  X.init(f); return f;
}
const order = { id: 'os1', activity: 'coffee', date: T, title: 'Pulverizar talhão 1', assignee: 'u1', due: T, cycleId: 'c1', notes: '', archived: false, inputs: [{ stockId: 'a', quantity: 20, itemName: 'Fungicida X', unit: 'L' }, { stockId: 'c', quantity: 2, itemName: 'Adubo', unit: 'sc' }] };

test('baixa pelo usado: lotes do mesmo insumo, o que vence antes primeiro; sobra fica no estoque; não usado sai da pendência', () => {
  const f = farm(); f.expansion.workOrders.push(JSON.parse(JSON.stringify(order))); const o = f.expansion.workOrders[0];
  a.deepEqual(M.orderLotOptions(f, 'a', T).map(l => l.item.id), ['b', 'a'], 'lote B vence antes');
  const r = M.orderStockUses(f, o, T, [{ stockId: 'a', lots: [{ stockId: 'b', quantity: 10 }, { stockId: 'a', quantity: '6' }] }, { stockId: 'c', lots: [{ stockId: 'c', quantity: '' }] }]);
  a.deepEqual(r.uses.map(u => [u.id, u.stockId, u.inputStockId, u.quantity, u.plannedQuantity, u.batch, u.cycleId]), [['os_os1_a_b', 'b', 'a', 10, 20, 'B2', 'c1'], ['os_os1_a', 'a', 'a', 6, 20, 'A1', 'c1']]);
  a.deepEqual(r.skipped, ['c']); a.deepEqual(r.warnings, []);
  f.operations.stockUses.push(...r.uses); o.inputs[1].skipped = true;
  a.deepEqual(M.orderPendingInputs(f, o), [], 'tudo resolvido');
  a.equal(M.monthClose(f, T.slice(0, 7), X, T).pendencies.filter(p => p.kind === 'Ordem concluída sem baixa').length, 0);
});

test('baixa pelo usado: recusa saldo insuficiente e lote de outro insumo; avisa acima de 20% e lote vencido', () => {
  const f = farm(); f.expansion.workOrders.push(JSON.parse(JSON.stringify(order))); const o = f.expansion.workOrders[0];
  a.throws(() => M.orderStockUses(f, o, T, [{ stockId: 'a', lots: [{ stockId: 'a', quantity: 13 }] }]), /Saldo insuficiente/);
  a.throws(() => M.orderStockUses(f, o, T, [{ stockId: 'a', lots: [{ stockId: 'c', quantity: 1 }] }]), /mesmo insumo/);
  a.throws(() => M.orderStockUses(f, o, T, [{ stockId: 'a', lots: [{ stockId: 'a', quantity: -1 }] }]), /válidas/);
  f.stock[1].expires = '2020-01-01';
  const r = M.orderStockUses(f, o, T, [{ stockId: 'a', lots: [{ stockId: 'a', quantity: 12 }, { stockId: 'b', quantity: 10 }] }, { stockId: 'c', lots: [{ stockId: 'c', quantity: 3 }] }]);
  a.equal(r.warnings.length, 2, r.warnings.join(' | ')); a.match(r.warnings[0], /venceu/); a.match(r.warnings[1], /Adubo: usado 3 sc, 50% acima do previsto/);
  a.throws(() => M.orderStockUses(f, o, T, [{ stockId: 'a', lots: [{ stockId: 'a', quantity: 12 }, { stockId: 'a', quantity: 1 }] }]), /Saldo insuficiente/, 'o mesmo lote duas vezes soma no saldo');
});

test('funcionário do campo: valida a ordem com insumos sem receber o estoque e informa o usado ao concluir', () => {
  const f = farm(); f.stock = []; f.expansion.workOrders.push(JSON.parse(JSON.stringify(order)));
  f.expansion.workOrderEvents.push({ id: 'e1', activity: 'coffee', date: T, orderId: 'os1', status: 'done', used: [{ stockId: 'a', quantity: 16 }, { stockId: 'c', quantity: 0 }], notes: '', archived: false });
  X.validateFarm(f);
  const u = M.orderFieldUsage(f, f.expansion.workOrders[0]); a.equal(u.used.get('a'), 16); a.equal(u.used.get('c'), 0);
  for (const bad of [[{ stockId: 'zz', quantity: 1 }], [{ stockId: 'a', quantity: -1 }], [{ stockId: 'a', quantity: 1 }, { stockId: 'a', quantity: 2 }]]) {
    const g = farm(); g.stock = []; g.expansion.workOrders.push(JSON.parse(JSON.stringify(order)));
    g.expansion.workOrderEvents.push({ id: 'e1', activity: 'coffee', date: T, orderId: 'os1', status: 'done', used: bad, notes: '', archived: false });
    a.throws(() => X.validateFarm(g), /usada/, JSON.stringify(bad));
  }
  const s = farm(); s.stock = []; s.expansion.workOrders.push(JSON.parse(JSON.stringify(order)));
  s.expansion.workOrderEvents.push({ id: 'e1', activity: 'coffee', date: T, orderId: 'os1', status: 'started', used: [{ stockId: 'a', quantity: 1 }], notes: '', archived: false });
  a.throws(() => X.validateFarm(s), /usada/, 'só a conclusão leva quantidade');
});

const ceo = { role: 'ceo', name: 'Ana CEO', username: 'ana' }, adm = { role: 'adm', name: 'Beto', username: 'beto' };
const hash = t => crypto.createHash('sha256').update(t).digest('hex');
const state = f => ({ farms: [f] }), copy = x => JSON.parse(JSON.stringify(x));
function closedState() {
  const f = farm(); f.finances.push({ id: 'n1', activity: 'coffee', type: 'saida', value: 300, date: prevMonth + '-10', category: 'Outros', costCenter: 'geral' });
  const before = state(f), after = copy(before);
  after.farms[0].monthClosings = [{ month: prevMonth, status: 'closed', versions: [{ pending: true }], reopenings: [] }];
  F.prepare(before, after, ceo, { X, hash }); return after;
}

test('fechar mês: só o CEO; o servidor guarda o relatório com código; mês que não terminou não fecha', () => {
  const s = closedState(), c = s.farms[0].monthClosings[0], v = c.versions[0];
  a.equal(c.status, 'closed'); a.equal(v.n, 1); a.equal(v.closedBy, 'Ana CEO'); a.match(v.hash, /^[0-9a-f]{64}$/); a.equal(v.report.spend, 300); a.equal(v.report.month, prevMonth);
  a.match(F.code(v.hash), /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  const forged = copy(s); forged.farms[0].monthClosings[0].versions[0].report.spend = 1;
  const r2 = copy(forged); F.prepare(s, r2, ceo, { X, hash }); a.equal(r2.farms[0].monthClosings[0].versions[0].report.spend, 300, 'relatório guardado não muda pelo navegador');
  const byAdm = copy(s); byAdm.farms[0].monthClosings = []; F.prepare(s, byAdm, adm, { X, hash }); a.equal(byAdm.farms[0].monthClosings.length, 1, 'ADM não mexe no fechamento');
  const now = state(farm()), cur = copy(now); cur.farms[0].monthClosings = [{ month: T.slice(0, 7), status: 'closed', versions: [{}], reopenings: [] }];
  a.throws(() => F.prepare(now, cur, ceo, { X, hash }), /já terminou/);
  const del = copy(s); del.farms[0].monthClosings = []; a.throws(() => F.prepare(s, del, ceo, { X, hash }), /não pode ser apagado/);
});

test('mês fechado trava lançamentos; reabrir pede motivo, fica no histórico e destrava; fechar de novo gera versão 2', () => {
  const s = closedState();
  const add = copy(s); add.farms[0].finances.push({ id: 'n2', activity: 'coffee', type: 'saida', value: 50, date: prevMonth + '-20', costCenter: 'geral' });
  a.throws(() => F.prepare(s, add, adm, { X, hash }), /está fechado pelo CEO/);
  const edit = copy(s); edit.farms[0].finances[0].value = 1; a.throws(() => F.prepare(s, edit, ceo, { X, hash }), /fechado/);
  const move = copy(s); move.farms[0].finances[0].date = T; a.throws(() => F.prepare(s, move, ceo, { X, hash }), /fechado/, 'tirar o lançamento do mês também é mudar o mês');
  const del = copy(s); del.farms[0].finances = []; a.throws(() => F.prepare(s, del, ceo, { X, hash }), /fechado/);
  const use = copy(s); use.farms[0].operations.stockUses.push({ id: 'u9', activity: 'coffee', stockId: 'c', quantity: 1, date: prevMonth + '-05' }); a.throws(() => F.prepare(s, use, ceo, { X, hash }), /consumo de estoque/);
  const ok = copy(s); ok.farms[0].finances.push({ id: 'n3', activity: 'coffee', type: 'saida', value: 50, date: T, costCenter: 'geral' }); F.prepare(s, ok, adm, { X, hash });

  const noReason = copy(s); Object.assign(noReason.farms[0].monthClosings[0], { status: 'reopened', reopenings: [{ reason: 'x' }] });
  a.throws(() => F.prepare(s, noReason, ceo, { X, hash }), /motivo/);
  const admReopen = copy(s); Object.assign(admReopen.farms[0].monthClosings[0], { status: 'reopened', reopenings: [{ reason: 'Nota esquecida' }] });
  F.prepare(s, admReopen, adm, { X, hash }); a.equal(admReopen.farms[0].monthClosings[0].status, 'closed', 'ADM não reabre');
  const re = copy(s); Object.assign(re.farms[0].monthClosings[0], { status: 'reopened', reopenings: [{ reason: 'Nota do adubo esquecida' }] });
  F.prepare(s, re, ceo, { X, hash }); const c = re.farms[0].monthClosings[0];
  a.equal(c.status, 'reopened'); a.equal(c.reopenings[0].by, 'Ana CEO'); a.equal(c.reopenings[0].version, 1); a.equal(c.versions.length, 1, 'versão enviada continua guardada');
  const fix = copy(re); fix.farms[0].finances.push({ id: 'n2', activity: 'coffee', type: 'saida', value: 50, date: prevMonth + '-20', costCenter: 'geral' }); F.prepare(re, fix, adm, { X, hash });
  const again = copy(fix); Object.assign(again.farms[0].monthClosings[0], { status: 'closed', versions: [...again.farms[0].monthClosings[0].versions, { pending: true }] });
  F.prepare(fix, again, ceo, { X, hash }); const v = again.farms[0].monthClosings[0].versions;
  a.deepEqual(v.map(x => [x.n, x.report.spend]), [[1, 300], [2, 350]]); a.notEqual(v[0].hash, v[1].hash);
  const rewrite = copy(again); rewrite.farms[0].monthClosings[0].reopenings[0].reason = 'outro'; a.throws(() => F.prepare(again, rewrite, ceo, { X, hash }), /Reabertura registrada/);
});

test('API: CEO fecha o mês, o ADM não grava no mês fechado e só vê quais meses estão fechados', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const call = async (p, token, body, method) => { const r = await fetch(s.url + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const ceoT = (await call('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  let st = (await call('/api/state', ceoT)).json; const f = st.state.farms[0];
  f.finances = [{ id: 'n1', activity: 'coffee', type: 'saida', category: 'Outros', description: 'Energia', value: 300, date: prevMonth + '-10', costCenter: 'geral' }];
  f.monthClosings = [{ month: prevMonth, status: 'closed', versions: [{ pending: true }], reopenings: [] }];
  let r = await call('/api/state', ceoT, { state: st.state, baseRev: st.rev }, 'PUT'); a.equal(r.status, 200, JSON.stringify(r.json));
  const c = r.json.state.farms[0].monthClosings[0]; a.equal(c.versions[0].n, 1); a.match(c.versions[0].hash, /^[0-9a-f]{64}$/); a.equal(c.versions[0].report.spend, 300);
  st = r.json; st.state.farms[0].finances.push({ id: 'n2', activity: 'coffee', type: 'saida', category: 'Outros', description: 'Atrasada', value: 10, date: prevMonth + '-11', costCenter: 'geral' });
  r = await call('/api/state', ceoT, { state: st.state, baseRev: st.rev }, 'PUT'); a.equal(r.status, 422); a.match(r.json.error, /fechado pelo CEO/);
  // ADM sem páginas de dinheiro: vê só a situação dos meses, sem o relatório.
  a.equal((await call('/api/users', ceoT, { username: 'adm-fech', name: 'Beto', email: 'beto@example.invalid', password: s.password, role: 'adm' })).status < 300, true);
  let admT = (await call('/api/auth/login', '', { groupCode: '1001', username: 'adm-fech', password: s.password })).json.token;
  await call('/api/auth/change-password', admT, { currentPassword: s.password, newPassword: s.password + 'X1!' });
  admT = (await call('/api/auth/login', '', { groupCode: '1001', username: 'adm-fech', password: s.password + 'X1!' })).json.token;
  const view = (await call('/api/state', admT)).json;
  a.deepEqual(view.state.farms[0].monthClosings, [{ id: 'close_' + prevMonth, month: prevMonth, status: 'closed' }]);
  // O ADM devolve o que recebeu (sem as versões) e lança algo de hoje: grava, e o histórico do CEO continua inteiro.
  view.state.farms[0].finances.push({ id: 'n3', activity: 'coffee', type: 'saida', category: 'Outros', description: 'Hoje', value: 5, date: new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()), costCenter: 'geral' });
  r = await call('/api/state', admT, { state: view.state, baseRev: view.rev }, 'PUT'); a.equal(r.status, 200, JSON.stringify(r.json));
  const full = (await call('/api/state', ceoT)).json.state.farms[0].monthClosings[0]; a.equal(full.versions.length, 1); a.equal(full.versions[0].report.spend, 300);
  const late = (await call('/api/state', admT)).json; late.state.farms[0].finances.push({ id: 'n4', activity: 'coffee', type: 'saida', category: 'Outros', description: 'Atrasada', value: 5, date: prevMonth + '-12', costCenter: 'geral' });
  r = await call('/api/state', admT, { state: late.state, baseRev: late.rev }, 'PUT'); a.equal(r.status, 422); a.match(r.json.error, /fechado/);
  // Contador: recebe a versão fechada, com o relatório e o código, no pacote da fazenda.
  const fid = full && (await call('/api/state', ceoT)).json.state.farms[0].id;
  const inv = await call('/api/expansion/accountant/invite', ceoT, { email: 'contador@example.invalid', farmIds: [fid] }); a.equal(inv.status, 200, JSON.stringify(inv.json));
  const params = Object.fromEntries(new URL(inv.json.link, s.url).searchParams), pw = 'Aa1@' + crypto.randomBytes(22).toString('hex');
  a.equal((await call('/api/accountant/accept', '', { ...params, email: 'contador@example.invalid', password: pw })).status, 200);
  const acc = (await call('/api/accountant/login', '', { email: 'contador@example.invalid', password: pw })).json.token;
  const gid = (await call('/api/accountant/clients', acc)).json.clients[0].groupId, pack = (await call('/api/accountant/export/' + gid + '/' + fid, acc)).json;
  a.deepEqual(pack.closings.map(c => [c.month, c.status, c.versions.length, c.versions[0].report.spend, c.versions[0].hash]), [[prevMonth, 'closed', 1, 300, full.versions[0].hash]]);
});

test('4.23 · mês fechado trava também contas a pagar, manutenção, abastecimento e prestador; pagar continua livre', () => {
  const s = closedState(), dia = prevMonth + '-15';
  const tenta = mexe => { const after = copy(s); mexe(after.farms[0]); return () => F.prepare(s, after, ceo, { X, hash }); };
  a.throws(tenta(f => { f.management.payables.push({ id: 'pz', activity: 'coffee', date: dia, supplier: 'Agro', description: 'Adubo', amount: 500, dueDate: dia, status: 'open' }); }), /fechado/);
  a.throws(tenta(f => { f.management.maintenance = [{ id: 'm1', activity: 'coffee', date: dia, cost: 800, description: 'Pneu' }]; }), /fechado/);
  a.throws(tenta(f => { f.management.fuel = [{ id: 'd1', activity: 'coffee', date: dia, litres: 100, pricePerLitre: 6 }]; }), /fechado/);
  a.throws(tenta(f => { f.expansion.contractors = [{ id: 'c1', activity: 'coffee', date: dia, provider: 'Colheita SA', price: 10, quantity: 100, unit: 'saca' }]; }), /fechado/);
  // Conta de outubro paga em novembro: permitido. Cancelada: barrado (tiraria o custo do mês fechado).
  const base = copy(s); base.farms[0].management.payables = [{ id: 'po', activity: 'coffee', date: dia, supplier: 'Agro', description: 'Adubo', amount: 500, dueDate: dia, status: 'open' }];
  base.farms[0].monthClosings = []; const fechado = copy(base); fechado.farms[0].monthClosings = s.farms[0].monthClosings;
  const paga = copy(fechado); paga.farms[0].management.payables[0].status = 'paid'; paga.farms[0].management.payables[0].paidDate = new Date().toISOString().slice(0, 10);
  F.prepare(fechado, paga, ceo, { X, hash });
  const cancelada = copy(fechado); cancelada.farms[0].management.payables[0].status = 'canceled';
  a.throws(() => F.prepare(fechado, cancelada, ceo, { X, hash }), /fechado/);
});

test('4.23 · mês fechado: ligar uma saída a um prestador (tirando ela do custo) também é barrado', () => {
  const s = closedState(), after = copy(s);
  after.farms[0].expansion.contractors = [{ id: 'k1', activity: 'coffee', date: new Date().toISOString().slice(0, 10), notes: '', archived: false, provider: 'X', service: 'colheita', unit: 'total', price: 1, quantity: 1 }];
  F.prepare(s, after, ceo, { X, hash });
  const liga = copy(after); liga.farms[0].finances.find(r => r.id === 'n1').sourceContractorId = 'k1';
  a.throws(() => F.prepare(after, liga, ceo, { X, hash }), /fechado/);
});
