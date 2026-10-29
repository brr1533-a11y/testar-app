const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../price-watch.js');
const G = require('../gestao-domain.js');
const { startServer } = require('./support/server.cjs');

test('lê o preço publicado na página (dados do produto, etiquetas meta e itemprop)', () => {
  const ld = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Adubo","offers":{"@type":"Offer","price":"189.90","priceCurrency":"BRL"}}</script>`;
  assert.deepEqual(P.extractPrice(ld), { price: 189.9, source: 'dados do produto' });
  const graph = `<script type="application/ld+json">{"@graph":[{"@type":"Product","offers":{"@type":"AggregateOffer","lowPrice":6.19,"priceCurrency":"BRL"}}]}</script>`;
  assert.equal(P.extractPrice(graph).price, 6.19);
  assert.equal(P.extractPrice(`<meta property="product:price:amount" content="1.234,56">`).price, 1234.56);
  assert.equal(P.extractPrice(`<span itemprop="price" content="99.5">R$ 99,50</span>`).price, 99.5);
  assert.equal(P.extractPrice('<p>Fale com o vendedor</p>'), null);
  assert.equal(P.extractPrice(`<script type="application/ld+json">{"@type":"Offer","price":"10","priceCurrency":"USD"}</script>`), null);
  for (const [v, n] of [['R$ 1.234,56', 1234.56], ['1234.56', 1234.56], ['1.234', 1234], ['6,19', 6.19], [7, 7], ['0', null]]) assert.equal(P.parsePrice(v), n);
});

test('não acessa endereço interno nem link que não seja https', () => {
  for (const url of ['http://loja.com.br/x', 'https://localhost/x', 'https://127.0.0.1/x', 'https://10.0.0.5/x', 'https://169.254.169.254/latest', 'https://[::1]/x', 'https://loja.com.br:8443/x', 'https://user:senha@loja.com.br/x', 'https://intranet/x', 'https://192.168.0.1/x', 'ftp://x.com'])
    assert.throws(() => P.checkUrl(url), e => e.code === 'blocked', url);
  assert.equal(P.checkUrl('https://www.loja.com.br/adubo?id=1').hostname, 'www.loja.com.br');
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) assert.equal(P.addressBlocked(ip), true, ip);
  for (const ip of ['8.8.8.8', '200.147.1.1', '2804:14c::1']) assert.equal(P.addressBlocked(ip), false, ip);
});

test('preço mudou: atualiza, guarda histórico e diz se subiu; mudança grande fica para conferir', () => {
  const q = { unitPrice: 100, link: 'https://x.com.br/p', priceHistory: [] };
  assert.equal(P.applyResult(q, { ok: true, price: 100, source: 's' }, 't0'), 'same');
  assert.equal(P.applyResult(q, { ok: true, price: 112, source: 's' }, 't1'), 'changed');
  assert.equal(q.unitPrice, 112); assert.equal(q.priceCheck.direction, 'up'); assert.equal(q.priceCheck.previousPrice, 100);
  assert.deepEqual(q.priceHistory.map(h => h.unitPrice), [100, 112]);
  assert.equal(P.applyResult(q, { ok: true, price: 20, source: 's' }, 't2'), 'review');
  assert.equal(q.unitPrice, 112); assert.equal(q.priceCheck.foundPrice, 20); assert.equal(q.priceCheck.direction, 'up');
  assert.equal(P.applyResult(q, { ok: false, code: 'notFound', message: 'sem preço' }, 't3'), 'notFound');
  assert.equal(q.unitPrice, 112);
});

test('WhatsApp: link com a pergunta pronta e aviso de preço velho', () => {
  const q = { whatsapp: '35999998888', itemName: 'Diesel S10', unit: 'L', date: '2026-01-01' };
  assert.equal(G.whatsappLink(q), 'https://wa.me/5535999998888?text=' + encodeURIComponent('Olá! Pode me passar o preço atualizado de Diesel S10 (L)?'));
  assert.equal(G.quoteStale(q, '2026-01-05'), false);
  assert.equal(G.quoteStale(q, '2026-01-20'), true);
  assert.equal(G.whatsappLink({}), '');
});

test('API: histórico de preço é do servidor, preço à mão entra no histórico, e link interno não é acessado', async t => {
  const s = await startServer(); t.after(() => s.stop());
  const api = async (path, token, body, method) => { const r = await fetch(s.url + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); let json = null; try { json = await r.json(); } catch {} return { status: r.status, json }; };
  const put = async (token, mutate) => { const st = await api('/api/state', token); mutate(st.json.state); return api('/api/state', token, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
  const ceo = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  const today = new Date().toISOString().slice(0, 10);
  const quote = { id: 'qx', activity: 'coffee', itemName: 'Adubo', supplier: 'Loja', channel: 'site', unitPrice: 150, unit: 'saco', date: today, link: 'https://127.0.0.1/adubo', autoUpdate: true,
    priceHistory: [{ at: '2020-01-01', unitPrice: 1, source: 'auto' }], priceCheck: { status: 'ok', checkedAt: '2099-01-01' } };
  let farmId;
  assert.equal((await put(ceo, st => { farmId = st.farms[0].id; st.farms[0].management ||= {}; st.farms[0].management.quotes = [quote]; })).status, 200);
  let q = (await api('/api/state', ceo)).json.state.farms[0].management.quotes[0];
  assert.deepEqual(q.priceHistory.map(h => [h.unitPrice, h.source]), [[150, 'manual']]);
  assert.equal(q.priceCheck, undefined);
  assert.equal((await put(ceo, st => { const x = st.farms[0].management.quotes[0]; x.unitPrice = 140; x.priceHistory = []; })).status, 200);
  q = (await api('/api/state', ceo)).json.state.farms[0].management.quotes[0];
  assert.deepEqual(q.priceHistory.map(h => h.unitPrice), [150, 140]);
  const r = await api('/api/precos/conferir', ceo, { farmId });
  assert.equal(r.status, 200); assert.equal(r.json.checked, 1); assert.equal(r.json.failed, 1);
  q = (await api('/api/state', ceo)).json.state.farms[0].management.quotes[0];
  assert.equal(q.priceCheck.status, 'blocked'); assert.equal(q.unitPrice, 140);
  assert.equal((await api('/api/precos/conferir', ceo, { farmId: 'outra' })).status, 404);
  assert.equal((await api('/api/precos/conferir', '', { farmId })).status, 401);
});
