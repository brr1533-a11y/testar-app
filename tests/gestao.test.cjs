const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../gestao-domain.js');
const { startServer } = require('./support/server.cjs');

test('insumos acabando aparecem primeiro, com a cotação de menor preço (frete incluído) e o último preço pago', () => {
  const farm = { stock: [
    { id: 's1', activity: 'coffee', item: 'Adubo 20-05-20', unit: 'saco', quantity: 4, min: 10 },
    { id: 's2', activity: 'coffee', item: 'Diesel S10', unit: 'L', quantity: 900, min: 800 },
    { id: 's3', activity: 'coffee', item: 'Calcário', unit: 't', quantity: 50, min: 5 }
  ], management: { quotes: [
    { id: 'q1', stockId: 's1', itemName: 'Adubo 20-05-20', supplier: 'A', unitPrice: 150, unit: 'saco', date: '2026-01-01' },
    { id: 'q2', stockId: 's1', itemName: 'Adubo 20-05-20', supplier: 'B', unitPrice: 140, unit: 'saco', quantity: 20, freight: 400, date: '2026-01-02' },
    { id: 'q3', itemName: 'diesel s10', supplier: 'Posto', unitPrice: 6.1, unit: 'L', date: '2026-01-02' },
    { id: 'q4', stockId: 's1', itemName: 'Adubo 20-05-20', supplier: 'Vencida', unitPrice: 100, unit: 'saco', date: '2025-01-01', validUntil: '2025-02-01' }
  ], fiscalDocs: [{ id: 'n1', kind: 'nfe-entrada', number: '77', date: '2025-12-01', party: 'Coop', items: [{ name: 'ADUBO 20-05-20', quantity: 10, unit: 'SC', unitPrice: 135 }] }] } };
  const list = G.shoppingList(farm, 'coffee');
  assert.deepEqual(list.map(r => r.item.id), ['s1', 's2', 's3']);
  assert.equal(list[0].level, 'low'); assert.equal(list[1].level, 'near'); assert.equal(list[2].level, 'ok');
  assert.equal(list[0].best.supplier, 'A'); // B: 140 + 400/20 = 160 > 150; a cotação vencida não entra
  assert.equal(list[0].quotes.length, 2);
  assert.equal(list[0].lastPaid.number, '77');
  assert.equal(list[1].best.supplier, 'Posto'); // casa pelo nome, sem diferenciar maiúsculas
  assert.equal(list[0].suggestedQty, 16);
  assert.match(G.searchLinks('Diesel S10')[0].url, /^https:\/\/www\.google\.com\/search\?tbm=shop&q=Diesel%20S10$/);
});

test('extrato em CSV e OFX vira linhas com sinal, e a sugestão casa valor e data próxima', () => {
  const csv = G.parseStatement('Data;Descrição;Valor\n05/03/2026;PIX FORNECEDOR;-1.250,40\n06/03/2026;Venda café;15000,00\nlixo');
  assert.deepEqual(csv.map(r => [r.date, r.amount]), [['2026-03-05', -1250.4], ['2026-03-06', 15000]]);
  const ofx = G.parseStatement('<OFX><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260307120000<TRNAMT>-89.90<FITID>abc1<MEMO>TARIFA</STMTTRN>', 'extrato.ofx');
  assert.deepEqual(ofx, [{ date: '2026-03-07', description: 'TARIFA', amount: -89.9, fitid: 'abc1' }]);
  const farm = { finances: [{ id: 'f1', type: 'saida', value: 1250.4, date: '2026-03-03' }, { id: 'f2', type: 'saida', value: 1250.4, date: '2026-03-20' }] };
  assert.equal(G.suggestMatch(farm, csv[0])?.id, 'f1');
  assert.equal(G.suggestMatch(farm, csv[0], new Set(['f1'])), null);
});

test('API: ADM não vê o dinheiro da fazenda, pede compra; só o CEO aprova; recebimento e pagamento entram uma vez', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const api = async (path, token, body, method) => { const r = await fetch(s.url + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, json: await r.json() }; };
  const put = async (token, mutate) => { const st = await api('/api/state', token); mutate(st.json.state); return api('/api/state', token, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
  const ceo = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  const today = new Date().toISOString().slice(0, 10);
  assert.equal((await put(ceo, st => { const f = st.farms[0]; f.stock.push({ id: 'adubo', activity: 'coffee', item: 'Adubo', unit: 'saco', quantity: 2, min: 10, unitCost: 100 }); f.management = { payables: [{ id: 'p1', activity: 'coffee', date: today, supplier: 'Coop', description: 'Adubo', amount: 1500.5, dueDate: today, status: 'open' }] }; })).status, 200);

  // ADM
  assert.equal((await api('/api/users', ceo, { username: 'testadm', name: 'ADM', email: 'adm@example.invalid', password: s.password, role: 'adm' })).status, 200);
  const t1 = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testadm', password: s.password })).json.token;
  assert.equal((await api('/api/auth/change-password', t1, { currentPassword: s.password, newPassword: s.password + 'x1' })).status, 200);
  const adm = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testadm', password: s.password + 'x1' })).json.token;
  const seen = (await api('/api/state', adm)).json.state.farms[0].management;
  assert.deepEqual(seen.payables, []);
  // ADM não consegue criar pedido já aprovado nem aprovar o próprio pedido (recusa 400, como nas outras regras da operação).
  assert.equal((await put(adm, st => { st.farms[0].management.purchaseOrders.push({ id: 'o1', activity: 'coffee', date: today, items: [{ stockId: 'adubo', name: 'Adubo', quantity: 20, unit: 'saco', unitPrice: 120 }], justification: 'Abaixo do mínimo', status: 'approved' }); })).status, 400);
  assert.equal((await put(adm, st => { st.farms[0].management.purchaseOrders.push({ id: 'o1', activity: 'coffee', date: today, items: [{ stockId: 'adubo', name: 'Adubo', quantity: 20, unit: 'saco', unitPrice: 120 }], justification: 'Abaixo do mínimo', status: 'pending' }); })).status, 200);
  assert.equal((await put(adm, st => { st.farms[0].management.purchaseOrders[0].status = 'approved'; })).status, 400);
  let ceoView = (await api('/api/state', ceo)).json.state.farms[0];
  assert.equal(ceoView.management.payables.length, 1);
  assert.equal(ceoView.management.purchaseOrders[0].requestedBy, 'ADM');

  // CEO aprova; ADM recebe; estoque soma uma vez
  assert.equal((await put(ceo, st => { st.farms[0].management.purchaseOrders[0].status = 'approved'; })).status, 200);
  assert.equal((await put(adm, st => { st.farms[0].management.purchaseOrders[0].status = 'received'; })).status, 200);
  assert.equal((await put(adm, st => { st.farms[0].management.purchaseOrders[0].status = 'received'; })).status, 200);
  ceoView = (await api('/api/state', ceo)).json.state.farms[0];
  assert.equal(ceoView.stock.find(i => i.id === 'adubo').quantity, 22);
  assert.equal(ceoView.stock.find(i => i.id === 'adubo').unitCost, 120);

  // CEO paga a conta: saída no Financeiro uma vez; conta paga não pode ser apagada nem alterada
  assert.equal((await put(ceo, st => { const p = st.farms[0].management.payables[0]; p.status = 'paid'; p.paidDate = today; })).status, 200);
  ceoView = (await api('/api/state', ceo)).json.state.farms[0];
  assert.equal(ceoView.finances.filter(x => x.sourcePayableId === 'p1').length, 1);
  assert.equal(ceoView.finances.find(x => x.sourcePayableId === 'p1').value, 1500.5);
  assert.equal((await put(ceo, st => { st.farms[0].management.payables = []; })).status, 400);
  assert.equal((await put(ceo, st => { st.farms[0].management.payables[0].amount = 1; })).status, 400);

  // Contrato: entrega não pode passar da quantidade nem ser apagada
  assert.equal((await put(ceo, st => { st.farms[0].management.salesContracts.push({ id: 'c1', activity: 'coffee', date: today, buyer: 'Exportadora', product: 'Café', quantityKg: 600, pricePerKg: 20, bagKg: 60, deliveryStart: today, deliveryEnd: today, status: 'open', deliveries: [{ id: 'd1', date: today, kg: 300 }] }); })).status, 200);
  assert.equal((await put(ceo, st => { st.farms[0].management.salesContracts[0].deliveries.push({ id: 'd2', date: today, kg: 301 }); })).status, 400);
  assert.equal((await put(ceo, st => { st.farms[0].management.salesContracts[0].deliveries = []; })).status, 400);

  // Fiscal: mesma chave não entra duas vezes; documento registrado não some
  const doc = { id: 'n1', activity: 'coffee', kind: 'nfe-entrada', number: '10', key: '1'.repeat(44), date: today, party: 'Coop', items: [] };
  assert.equal((await put(adm, st => { st.farms[0].management.fiscalDocs.push(doc); })).status, 200);
  assert.equal((await put(adm, st => { st.farms[0].management.fiscalDocs.push({ ...doc, id: 'n2' }); })).status, 400);
  assert.equal((await put(adm, st => { st.farms[0].management.fiscalDocs = []; })).status, 400);
});
