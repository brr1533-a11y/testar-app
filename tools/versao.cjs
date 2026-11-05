// Troca a versão no package.json e no package-lock.json e gera de novo o campo-sw.js.
// Uso: npm run versao -- 4.19.2
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), nova = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(nova || '')) { console.error('Informe a versão nova, por exemplo: npm run versao -- 4.19.2'); process.exit(1); }
const pkgPath = path.join(root, 'package.json'), lockPath = path.join(root, 'package-lock.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')), velha = pkg.version;
const troca = (file, de, para) => { const t = fs.readFileSync(file, 'utf8'), n = t.split(`"version": "${de}"`).join(`"version": "${para}"`); if (n === t) throw new Error('versão não encontrada em ' + path.basename(file)); fs.writeFileSync(file, n); };
troca(pkgPath, velha, nova);
const lock = fs.readFileSync(lockPath, 'utf8'), head = lock.slice(0, 600);
fs.writeFileSync(lockPath, head.split(`"version": "${velha}"`).join(`"version": "${nova}"`) + lock.slice(600));
fs.writeFileSync(path.join(root, 'campo-sw.js'), require(path.join(root, 'gerar-worker.cjs')).build());
console.log(`Versão ${velha} → ${nova}; campo-sw.js gerado de novo.`);
