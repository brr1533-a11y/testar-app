// Hook do Claude Code (PostToolUse em Edit/Write/MultiEdit): ao mudar uma regra (*-domain.js na raiz),
// roda na hora só os testes de unidade que usam aquele arquivo. Falhou → avisa o Claude (saída 2) com o resumo.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
let raw = ''; process.stdin.on('data', d => { raw += d; }); process.stdin.on('end', () => {
  let input; try { input = JSON.parse(raw || '{}'); } catch (_) { process.exit(0); }
  const file = input?.tool_input?.file_path; if (!file) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
  const rel = path.relative(root, path.resolve(file)).split(path.sep).join('/');
  if (rel.includes('/') || !/-domain\.js$/.test(rel)) process.exit(0);
  const name = rel.replace(/\.js$/, ''), dir = path.join(root, 'tests');
  const uses = new RegExp(`require\\(\\s*['"]\\.\\./${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\.js)?['"]\\s*\\)`);
  const tests = fs.readdirSync(dir).filter(f => f.endsWith('.test.cjs') && uses.test(fs.readFileSync(path.join(dir, f), 'utf8'))).map(f => path.join('tests', f));
  if (!tests.length) process.exit(0);
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=dot', ...tests], { cwd: root, encoding: 'utf8', timeout: 90000 });
  if (r.status === 0) process.exit(0);
  const out = ((r.stdout || '') + (r.stderr || '')).split('\n').filter(l => /not ok|Error|expected|actual|✖|fail/i.test(l)).slice(0, 25).join('\n');
  process.stderr.write(`Testes da regra ${rel} falharam (${tests.length} arquivo(s): ${tests.map(t => path.basename(t)).join(', ')}):\n${out || (r.error ? r.error.message : 'sem detalhes')}\n`);
  process.exit(2);
});
