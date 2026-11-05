// Confere se o campo-sw.js está igual ao que o gerar-worker.cjs produz hoje (o site gera o mesmo ao iniciar).
// Uso: node tools/conferir-sw.cjs        (sai com erro se estiver desatualizado)
//      node tools/conferir-sw.cjs --corrigir
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), file = path.join(root, 'campo-sw.js');
const esperado = require(path.join(root, 'gerar-worker.cjs')).build(), atual = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
if (atual === esperado) { console.log('campo-sw.js em dia.'); process.exit(0); }
if (process.argv.includes('--corrigir')) { fs.writeFileSync(file, esperado); console.log('campo-sw.js gerado de novo.'); process.exit(0); }
console.error('campo-sw.js desatualizado: rode node tools/conferir-sw.cjs --corrigir'); process.exit(1);
