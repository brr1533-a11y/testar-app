// Roda todos os roteiros de navegador de tests/ (um por vez) e resume. No Windows usa o Brave, se instalado.
// Uso: npm run test:navegador            (todos)
//      npm run test:navegador -- fechamento-mes-browser.cjs minhas-browser.cjs   (só alguns)
//      REPETIR=10 npm run test:navegador -- custos-estoque-browser.cjs           (caçar teste instável)
const { spawnSync } = require('node:child_process'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), hook = path.join(__dirname, 'navegador-brave.cjs');
const only = process.argv.slice(2), times = Math.max(1, Number(process.env.REPETIR) || 1);
const files = fs.readdirSync(path.join(root, 'tests')).filter(f => f.endsWith('.cjs') && !f.endsWith('.test.cjs') && (!only.length || only.includes(f)));
if (!files.length) { console.error('Nenhum roteiro encontrado' + (only.length ? ': ' + only.join(', ') : '')); process.exit(1); }
const out = [];
for (const f of files) for (let k = 1; k <= times; k++) {
  const t0 = Date.now(), r = spawnSync(process.execPath, ['-r', hook, path.join('tests', f)], { cwd: root, encoding: 'utf8', timeout: 600000 });
  const ok = r.status === 0, tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-4).join(' | ').slice(0, 400);
  out.push(`${ok ? 'PASS' : 'FAIL'} ${f}${times > 1 ? ' #' + k : ''} (${Math.round((Date.now() - t0) / 1000)} s)${ok ? '' : ' :: ' + tail}`);
  console.log(out.at(-1));
}
const passed = out.filter(l => l.startsWith('PASS')).length;
console.log(`\n${passed}/${out.length} passaram`);
process.exit(passed === out.length ? 0 : 1);
