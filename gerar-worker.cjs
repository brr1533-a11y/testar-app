// Gera o service worker do app (campo-sw.js): guarda as telas (nunca dados) para abrir sem internet.
// A versão do cache é o resumo dos próprios arquivos: qualquer mudança no código gera uma versão nova e os celulares
// atualizam sozinhos. O servidor chama build() ao iniciar; "npm run build:offline" grava o arquivo, se quiser conferir.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
function build(dir = __dirname) {
  const html = fs.readFileSync(path.join(dir, 'app.html'), 'utf8');
  const urls = ['/app', ...new Set([...html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))"/g)].map(m => '/' + m[1]).filter(u => !u.includes('://')))];
  const assets = [...fs.readdirSync(path.join(dir, 'assets')).filter(n => /\.(svg|png)$/.test(n) && !/previa/.test(n)).map(n => '/assets/' + n), '/manifest.webmanifest'];
  const hash = crypto.createHash('sha256');
  for (const url of [...urls, ...assets]) hash.update(fs.readFileSync(path.join(dir, url === '/app' ? 'app.html' : url.slice(1))));
  const version = hash.digest('hex').slice(0, 16);
  return `const CACHE='rural-campo-${version}',SHELL=${JSON.stringify([...urls, ...assets])};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('rural-campo-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;if(u.pathname==='/app'||u.pathname==='/app.html'){e.respondWith(fetch(e.request).catch(()=>caches.match('/app')));return;}if(SHELL.includes(u.pathname))e.respondWith(caches.match(u.pathname).then(r=>r||fetch(e.request)));});`;
}
module.exports = { build };
if (require.main === module) fs.writeFileSync(path.join(__dirname, 'campo-sw.js'), build());
