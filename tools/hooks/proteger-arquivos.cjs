// Hook do Claude Code (PreToolUse em Edit/Write/MultiEdit): não deixa editar dados locais nem segredos.
// .local-cloud.json guarda os dados da fazenda no modo local; .env guarda senhas e chaves. .env.example pode.
const path = require('node:path');
let raw = ''; process.stdin.on('data', d => { raw += d; }); process.stdin.on('end', () => {
  let input; try { input = JSON.parse(raw || '{}'); } catch (_) { process.exit(0); }
  const file = input?.tool_input?.file_path; if (!file) process.exit(0);
  const base = path.basename(file);
  const bloqueado = base === '.local-cloud.json' || (base === '.env' || (base.startsWith('.env.') && base !== '.env.example')) || /[\\/]\.backups[\\/]/.test(file) || /antigos salvos/i.test(file);
  if (base === 'campo-sw.js' && !/[\\/]tests[\\/]/.test(file)) {
    process.stderr.write('Bloqueado: campo-sw.js é gerado por gerar-worker.cjs (um hook gera de novo a cada mudança no site). Edite o gerar-worker.cjs.\n');
    process.exit(2);
  }
  if (bloqueado) {
    process.stderr.write(`Bloqueado: ${base} guarda dados locais, senhas ou cópias antigas e não deve ser editado pelo Claude. Peça ao dono do projeto.\n`);
    process.exit(2);
  }
  process.exit(0);
});
