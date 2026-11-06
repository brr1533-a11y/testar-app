// 4.19.3 · "Hoje" é o dia em Brasília, no navegador e no servidor. O Render roda em UTC: das 21h à meia-noite
// o servidor achava que já era o dia seguinte (avisos de vencimento, mês que "já terminou", data futura).
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const fresh = name => { const p = require.resolve(path.join(root, name)); delete require.cache[p]; return require(p); };

test('nenhum arquivo do sistema calcula o dia de hoje em UTC', () => {
  const ruins = [];
  for (const f of fs.readdirSync(root).filter(f => f.endsWith('.js') && f !== 'campo-sw.js')) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    for (const re of [/new Date\(\)\.toISOString\(\)\.slice\(0, ?(10|7)\)/, /nowIso\(\)\.slice\(0, ?10\)/, /new Date\(Date\.now\(\)[^)]*\)\.toISOString\(\)\.slice\(0, ?10\)/]) if (re.test(s)) ruins.push(f + ' ' + re);
  }
  a.deepEqual(ruins, [], 'use o dia de Brasília: new Intl.DateTimeFormat(\'en-CA\',{timeZone:\'America/Sao_Paulo\'}).format(new Date())');
});

test('às 22h30 de Brasília (01h30 UTC do dia seguinte) o dia ainda é o de hoje', t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-06T01:30:00Z') });
  const X = fresh('expansao-domain.js'), M = fresh('melhorias-domain.js');
  const f = { id: 'f1', name: 'F', tractors: [], implements: [], talhoes: [], agriculture: { cycles: [], harvests: [], sales: [] }, cattle: { lots: [], paddocks: [] },
    stock: [{ id: 's1', activity: 'coffee', item: 'Fungicida', unit: 'L', quantity: 5, expires: '2026-11-06' }] };
  X.init(f);
  // Vence amanhã (6/11): falta 1 dia, não "vence hoje".
  a.equal(M.expiringStock(f)[0].left, 1);
  // Registro do campo com data de amanhã é recusado (data futura); com a data de hoje passa.
  const log = date => ({ id: 'l' + date, activity: 'coffee', date, notes: '', archived: false, kind: 'general', description: 'Chuva forte' });
  f.expansion.fieldLogs = [log('2026-11-05')]; X.validateFarm(f);
  f.expansion.fieldLogs = [log('2026-11-06')]; a.throws(() => X.validateFarm(f));
});

test('fechamento: 30/11 às 22h de Brasília novembro ainda não terminou; 1/12 de madrugada já pode fechar', () => {
  const X = fresh('expansao-domain.js'), F = fresh('fechamento-domain.js');
  const hash = s => crypto.createHash('sha256').update(s).digest('hex'), ceo = { role: 'ceo', name: 'Ana CEO', username: 'ana' };
  const farm = () => { const f = { id: 'f1', name: 'F', tractors: [], implements: [], talhoes: [], finances: [], agriculture: { cycles: [], harvests: [], sales: [] }, cattle: { lots: [], paddocks: [] }, stock: [] }; X.init(f); return f; };
  const tenta = now => { const before = { farms: [farm()] }, after = JSON.parse(JSON.stringify(before)); after.farms[0].monthClosings = [{ month: '2026-11', status: 'closed', versions: [{}], reopenings: [] }]; F.prepare(before, after, ceo, { X, hash, now }); return after; };
  a.throws(() => tenta('2026-12-01T01:00:00.000Z'), /já terminou/, '22h de 30/11 em Brasília');
  a.equal(tenta('2026-12-01T04:00:00.000Z').farms[0].monthClosings[0].status, 'closed', '01h de 1/12 em Brasília');
});
