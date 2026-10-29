const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../plan-features.js');
const F = require('../campo-domain.js');
const L = require('../lcdpr.js');
const { startServer } = require('./support/server.cjs');

const client = s => {
  const api = async (path, token, body, method) => { const r = await fetch(s.url + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); let json = null; try { json = await r.json(); } catch {} return { status: r.status, json }; };
  const put = async (token, mutate) => { const st = await api('/api/state', token); mutate(st.json.state); return api('/api/state', token, { state: st.json.state, baseRev: st.json.rev }, 'PUT'); };
  return { api, put };
};

test('funções por plano seguem a tabela; o Essencial não grava conciliação nem cotações', () => {
  assert.equal(P.has('essential', 'quotes'), false); assert.equal(P.has('pro', 'quotes'), true); assert.equal(P.has('essential', 'audit'), false);
  assert.equal(P.has('pro', 'prioritySupport'), false); assert.equal(P.has('group', 'guidedSetup'), true); assert.equal(P.has(undefined, 'reconciliation'), true);
  assert.equal(P.pageAllowed('essential', 'conciliacao'), false); assert.equal(P.pageAllowed('essential', 'fiscal'), true);
  const before = { farms: [{ id: 'f', management: { bankEntries: [], quotes: [], payables: [] } }] };
  const after = { farms: [{ id: 'f', management: { bankEntries: [{ id: 'b' }], quotes: [{ id: 'q' }], payables: [{ id: 'p' }] } }] };
  P.restoreLocked(before, after, 'essential');
  assert.deepEqual(after.farms[0].management.bankEntries, []); assert.deepEqual(after.farms[0].management.quotes, []); assert.equal(after.farms[0].management.payables.length, 1);
});

test('pós-colheita calcula rendimento; pragas avisam acima do nível de controle; leite resume por dia', () => {
  const lot = { volumeL: 6000, processing: { cocoKg: 1200, beneficiadoKg: 600 } };
  const y = F.lotYield(lot); assert.equal(y.pct, 50); assert.equal(y.bags, 10); assert.equal(y.litersPerBag, 600);
  assert.equal(F.pestAlert({ pest: 'broca', infestationPct: 4 }), true); assert.equal(F.pestAlert({ pest: 'ferrugem', infestationPct: 4 }), false);
  const st = F.reproStats({ reproduction: [{ type: 'diagnostico', result: 'prenhe', heads: 30 }, { type: 'diagnostico', result: 'vazia', heads: 10 }] });
  assert.equal(st.rate, 75);
  const m = F.milkSummary({ milk: [{ date: '2026-05-10', liters: 100 }, { date: '2026-05-10', liters: 50 }], dairyCows: [{ status: 'lactacao' }, { status: 'seca' }] }, '2026-05-10');
  assert.equal(m.today, 150); assert.equal(m.lactating, 1);
  assert.equal(F.vaccineStatus({ dueDate: '2026-01-01' }, '2026-02-01'), 'atrasada');
});

test('LCDPR sai no leiaute 1.3: abertura, imóvel, conta, lançamentos com saldo, resumo mensal e total de linhas', () => {
  const state = { farms: [{ id: 'f1', name: 'Fazenda Boa Vista', finances: [
    { id: 'a', type: 'entrada', value: 10000, date: '2025-01-02', description: 'Venda de café', lcdpr: { partic: '11222333000181', tipoDoc: 1, numDoc: '123' } },
    { id: 'b', type: 'saida', value: 2500.5, date: '2025-01-20', category: 'Adubo', description: 'Compra' },
    { id: 'c', type: 'saida', value: 1000, date: '2025-02-05', description: 'Diesel' },
    { id: 'd', type: 'entrada', value: 999, date: '2024-12-31', description: 'Fora do ano' }] }] };
  const cfg = { produtor: { cpf: '52998224725', nome: 'José da Silva', endereco: 'Rua A', numero: '10', bairro: 'Centro', uf: 'MG', codMun: '3106200', cep: '37000000', email: 'jose@example.invalid' },
    imoveis: [{ farmId: 'f1', cafir: '12345678', endereco: 'Estrada B', bairro: 'Zona rural', uf: 'MG', codMun: '3106200', cep: '37000000', tipo: 1, participacao: 100 }],
    contas: [{ banco: '1', nomeBanco: 'Banco do Brasil', agencia: '1234', conta: '123456' }], contador: { nome: 'Ana Contadora', crc: 'MG-1' } };
  const r = L.build(state, 2025, cfg), lines = r.text.trim().split('\r\n');
  assert.equal(lines[0], '0000|LCDPR|0013|52998224725|Jose da Silva|0|0||01012025|31122025');
  assert.equal(lines[1], '0010|1');
  assert.ok(lines.some(l => l.startsWith('0040|001|BR|BRL|12345678|')) && lines.some(l => l === '0050|001|BR|001|Banco do Brasil|1234|123456'));
  const q = lines.filter(l => l.startsWith('Q100'));
  assert.equal(q.length, 3);
  assert.equal(q[0], 'Q100|02012025|001|001|123|1|Venda de cafe|11222333000181|1|1000000|0|1000000|P');
  assert.equal(q[1].split('|').slice(-4).join('|'), '0|250050|749950|P');
  assert.deepEqual(lines.filter(l => l.startsWith('Q200')), ['Q200|012025|1000000|250050|749950|P', 'Q200|022025|0|100000|649950|P']);
  assert.equal(lines.at(-1).split('|').at(-1), String(lines.length));
  assert.equal(r.warnings.length, 1); assert.match(r.warnings[0], /sem CPF\/CNPJ/);
  assert.equal(L.validCPF('52998224725'), true); assert.equal(L.validCPF('11111111111'), false);
});

test('API: teste grátis cria o Grupo com prazo, um por e-mail, e o prazo não muda pelo navegador', async t => {
  const s = await startServer(); t.after(() => s.stop()); const { api, put } = client(s);
  const body = { email: 'teste@example.invalid', groupName: 'Fazenda Teste', ceoName: 'Pessoa', ceoUser: 'testador', ceoPassword: s.password, activities: ['coffee', 'cattle'] };
  const r = await api('/api/public/trial', '', body);
  assert.equal(r.status, 200); assert.equal(r.json.days, 14);
  assert.equal((await api('/api/public/trial', '', { ...body, ceoUser: 'outro' })).status, 409);
  const login = await api('/api/auth/login', '', { groupCode: r.json.group.code, username: 'testador', password: s.password });
  assert.equal(login.status, 200);
  const st = await api('/api/state', login.json.token);
  assert.ok(st.json.group.trial.endsAt); assert.deepEqual(st.json.state.subscriptionActivities, ['coffee', 'cattle']);
  assert.equal((await put(login.json.token, x => { x.trial = { endsAt: '2099-01-01T00:00:00Z', days: 999 }; })).status, 200);
  assert.equal((await api('/api/state', login.json.token)).json.group.trial.endsAt, st.json.group.trial.endsAt);
});

test('API: módulos de campo validam, gravam autor e não deixam apagar GTA', async t => {
  const s = await startServer(); t.after(() => s.stop()); const { api, put } = client(s);
  const ceo = (await api('/api/auth/login', '', { groupCode: '1001', username: 'testceo', password: s.password })).json.token;
  assert.equal((await put(ceo, st => { const f = st.farms[0]; f.cattle ||= { paddocks: [], lots: [], weighings: [] }; f.cattle.lots.push({ id: 'l1', name: 'Matrizes', heads: 40 });
    f.field = { postHarvest: [{ id: 'p1', activity: 'coffee', name: 'Lote 1', harvestDate: '2026-06-01', volumeL: 6000, processing: { date: '2026-07-01', cocoKg: 1200, beneficiadoKg: 600 } }],
      gta: [{ id: 'g1', activity: 'cattle', number: '123', date: '2026-01-02', origin: 'A', destination: 'B', purpose: 'Abate', heads: 10, lotId: 'l1' }] }; })).status, 200);
  const field = (await api('/api/state', ceo)).json.state.farms[0].field;
  assert.ok(field.postHarvest[0].recordedBy); assert.equal(field.gta.length, 1);
  assert.equal((await put(ceo, st => { st.farms[0].field.postHarvest[0].processing.beneficiadoKg = 5000; })).status, 422);
  assert.equal((await put(ceo, st => { st.farms[0].field.gta = []; })).status, 422);
});
