// Hook do Claude Code (PostToolUse em Edit/Write/MultiEdit). Recebe o JSON da ferramenta pela entrada padrão.
// 1. Arquivo .js/.cjs editado: confere a sintaxe com `node --check` e avisa o Claude se quebrou (saída 2).
// 2. Arquivo do site editado (raiz .js/.css/.html, assets, manifest): gera de novo o campo-sw.js.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
let raw = ''; process.stdin.on('data', d => { raw += d; }); process.stdin.on('end', () => {
  let input; try { input = JSON.parse(raw || '{}'); } catch (_) { process.exit(0); }
  const file = input?.tool_input?.file_path; if (!file) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
  const abs = path.resolve(file), rel = path.relative(root, abs).split(path.sep).join('/');
  if (rel.startsWith('..') || rel.startsWith('node_modules/') || !fs.existsSync(abs)) process.exit(0);
  const erros = [];
  if (/\.(c?js)$/.test(rel)) {
    const r = spawnSync(process.execPath, ['--check', abs], { encoding: 'utf8' });
    if (r.status !== 0) erros.push(`Erro de sintaxe em ${rel}:\n${(r.stderr || '').trim().split('\n').slice(0, 8).join('\n')}`);
  }
  const doSite = (!rel.includes('/') && /\.(js|css|html)$/.test(rel) && rel !== 'campo-sw.js') || rel.startsWith('assets/') || rel === 'manifest.webmanifest';
  if (doSite && !erros.length) {
    try { const sw = path.join(root, 'campo-sw.js'), novo = require(path.join(root, 'gerar-worker.cjs')).build(); if (!fs.existsSync(sw) || fs.readFileSync(sw, 'utf8') !== novo) fs.writeFileSync(sw, novo); }
    catch (e) { erros.push('Não consegui gerar o campo-sw.js: ' + e.message); }
  }
  if (erros.length) { process.stderr.write(erros.join('\n\n') + '\n'); process.exit(2); }
  process.exit(0);
});
