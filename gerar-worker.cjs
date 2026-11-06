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
  return `const CACHE='rural-campo-${version}',SHELL=${JSON.stringify([...urls, ...assets])};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('rural-campo-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;const daVersao=p=>caches.open(CACHE).then(c=>c.match(p));if(u.pathname==='/app'||u.pathname==='/app.html'){e.respondWith(daVersao('/app').then(r=>r||fetch(e.request)).catch(()=>fetch(e.request)));return;}if(SHELL.includes(u.pathname))e.respondWith(daVersao(u.pathname).then(r=>r||fetch(e.request)));});`;
// 4.23: a página /app e os scripts saem do MESMO cache (a mesma versão). Antes a página vinha da internet e os scripts do cache:
// logo depois de uma atualização, página nova + script velho quebrava a tela. A versão nova entra inteira na próxima abertura.
}
const baseBuild=build;
function buildWithPush(dir){return baseBuild(dir)+String.raw`self.addEventListener('push',e=>{let p={};try{p=e.data.json();}catch{}e.waitUntil(self.registration.showNotification('Gestão Rural',{body:String(p.body||'Há uma atualização no painel.').slice(0,200),tag:String(p.tag||'rural').slice(0,100),icon:'/assets/app-icone-192.png',data:{url:/^\/app(\?[\w=&%.-]*)?$/.test(String(p.url||''))?String(p.url):'/app'}}));});self.addEventListener('notificationclick',e=>{e.notification.close();const url=/^\/app(\?[\w=&%.-]*)?$/.test(String(e.notification.data?.url||''))?e.notification.data.url:'/app';e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{const w=list.find(c=>new URL(c.url).origin===self.location.origin&&new URL(c.url).pathname==='/app');if(w)return (w.navigate?w.navigate(url):Promise.resolve(w)).then(c=>(c||w).focus());return self.clients.openWindow(url);}));});`;}
module.exports = { build:buildWithPush };
if (require.main === module) fs.writeFileSync(path.join(__dirname, 'campo-sw.js'), buildWithPush());
