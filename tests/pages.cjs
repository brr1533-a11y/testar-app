const {chromium}=require('playwright');
const {startServer}=require('./support/server.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const screenshots=process.env.RURAL_SCREENSHOT_DIR||path.resolve('test-results');fs.mkdirSync(screenshots,{recursive:true});
(async()=>{
 const server=await startServer(),browser=await chromium.launch();
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/cotacao-cafe',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Indisponível no teste"}'}));
  for(const [url,type,preview] of [['/cafe','coffee','visao'],['/gado','cattle','gado'],['/graos','grains','graos']]){
   for(const width of [320,375,768,1024,1440]){
    await page.setViewportSize({width,height:900});await page.goto(server.url+url);
    assert.equal(await page.locator('body').getAttribute('data-landing'),type);
    assert.equal(await page.locator('main').count(),1);
    assert.equal(await page.locator('.landing-switch [aria-current=page]').count(),1);
    await page.waitForFunction(p=>document.querySelector('#pv-'+p)?.classList.contains('at'),preview);
    assert.equal(await page.locator('.voo').isVisible(),type==='coffee');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Overflow '+url+' '+width);
    const click=await page.locator('.hero-actions a').first().evaluate(el=>{const r=el.getBoundingClientRect(),p=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {visible:r.top>=0&&r.bottom<=innerHeight,clickable:p===el||el.contains(p)};});
    assert.equal(click.visible,true,'CTA fora da primeira tela '+url+' '+width);assert.equal(click.clickable,true,'CTA bloqueado '+url+' '+width);
    if(width===1440)await page.screenshot({path:path.join(screenshots,'pagina-'+(type==='cattle'?'gado':type==='coffee'?'cafe':'graos')+'.png')});
   }
  }
  await page.locator('.landing-switch a[href="/gado"]').click();await page.waitForURL('**/gado');assert.equal(await page.locator('body').getAttribute('data-landing'),'cattle');
  assert.equal((await page.locator('.nav .marca').innerText()).trim(),'Gestão');assert.equal(await page.locator('.nav .marca svg').count(),0);
  const cattleTabs=['visao','gado','piquetes','pesagens','desempenho','manejos','estoque','financeiro'];
  assert.deepEqual(await page.locator('.app [data-pv]').evaluateAll(tabs=>tabs.map(t=>t.dataset.pv)),cattleTabs);
  for(const id of cattleTabs){await page.locator(`.app [data-pv=${id}]`).click();assert.equal(await page.locator('#pv-'+id).getAttribute('class'),'pv at');}
  assert.equal(await page.locator('.app').evaluate(el=>/café|coffee|talhões|\bbanho\b/i.test(el.textContent)),false);
  await page.locator('.app [data-pv=piquetes]').click();await page.locator('#sistema').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(screenshots,'gado-previa-piquetes.png')});
  for(const url of ['/gado.html','/graos.html','/graos.js','/paginas-iniciais.css','/assets/gado-paisagem.svg','/assets/graos-paisagem.svg']){
   const r=await fetch(server.url+url);assert.equal(r.status,200);const type=r.headers.get('content-type');assert.ok(type?.includes(url.endsWith('.svg')?'image/svg+xml':url.endsWith('.js')?'javascript':url.endsWith('.css')?'text/css':'text/html'),url+': '+type);
  }
  // O arquivo separado precisa registrar a tela de Grãos no painel real.
  await page.goto(server.url+'/app');await page.locator('#loginGroup').fill('1001');await page.locator('#loginUser').fill('testceo');await page.locator('#loginPassword').fill(server.password);await page.locator('#loginForm button[type=submit]').click();
  await page.locator('#modeSwitchBtn').click();await page.locator('.dlg button[name=mode][value=grains]').click();await page.locator('#navMenu button[data-page=safras]').click();
  assert.equal(await page.evaluate(()=>typeof renderGrains),'function');assert.equal(await page.locator('script[src="graos.js"]').count(),1);await page.locator('#ruralNewCycle').waitFor();
  // Saída sem erro também no caminho com animação habilitada.
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(server.url+'/gado');await page.locator('.hero-actions a[href="#sistema"]').click();
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#sistema')).opacity)>.9);
  assert.deepEqual(errors,[]);
  console.log('PASS: páginas /gado e /graos, navegação entre páginas, assets locais e MIME, painel via graos.js, 5 larguras e CTAs, animação, nenhum erro JavaScript.');
 }finally{await browser.close();await server.stop();}
})().catch(e=>{console.error(e);process.exit(1)});
