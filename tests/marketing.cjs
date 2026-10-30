const {chromium}=require('playwright');const {startServer}=require('./support/server.cjs');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path');
const screenshots=process.env.RURAL_SCREENSHOT_DIR||path.resolve('test-results');fs.mkdirSync(screenshots,{recursive:true});
(async()=>{
 const s=await startServer(),browser=await chromium.launch();const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  let checkouts=0;page.on('request',r=>{if(r.url().endsWith('/api/public/checkout'))checkouts++;});
  await page.route('**/api/cotacao-cafe',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Indisponível no teste"}'}));
  await page.goto(s.url);assert.equal(await page.locator('body').getAttribute('data-landing'),'overview');assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.overview-activity-grid a').count(),3);
  for(const width of [320,375,768,1024,1440]){
   await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Overflow visão geral '+width);
   const first=await page.locator('.hero-actions a').first().boundingBox();assert.ok(first.y+first.height<=900,'CTA visão geral fora da tela '+width);
  }
  await page.screenshot({path:path.join(screenshots,'nova-visao-geral.png')});
  await page.locator('[name=subscriptionActivity][value=coffee]').check();assert.match(await page.locator('#activitySelectionSummary').innerText(),/1 atividade: Café/);
  await page.locator('.buy-plan[data-plan=essential]').click();await page.locator('.mail-dlg').waitFor();assert.match(await page.locator('.mail-dlg h3').innerText(),/Essencial/);await page.locator('.mail-dlg .mail-cancel').click();
  await page.locator('[name=subscriptionActivity][value=cattle]').check();assert.match(await page.locator('#activitySelectionSummary').innerText(),/2 atividades: Café \+ Gado/);
  await page.locator('.buy-plan[data-plan=pro]').click();await page.locator('.mail-dlg').waitFor();assert.match(await page.locator('.mail-dlg h3').innerText(),/Profissional/);await page.locator('.mail-dlg .mail-cancel').click();
  await page.locator('#selectAllActivities').click();assert.match(await page.locator('#activitySelectionSummary').innerText(),/3 atividades/);
  await page.locator('.buy-plan[data-plan=group]').click();await page.locator('.mail-dlg').waitFor();assert.match(await page.locator('.mail-dlg h3').innerText(),/Grupo/);await page.locator('.mail-dlg .mail-cancel').click();
  assert.equal(checkouts,0);assert.deepEqual((await page.locator('[data-price]').allTextContents()).map(v=>Number(v.replace(/\./g,'').replace(',','.'))),[397,997,1497]);
  await page.locator('.activity-plan-picker').screenshot({path:path.join(screenshots,'planos-por-atividade.png')});
  for(const [url,allowed] of [['/cafe',['visao','producao','mercado','equip','talhoes','banho','estoque','financeiro','notas','pagamentos','fazendas','usuarios','log','perfil']],['/graos',['visao','graos','equip','talhoes','estoque','financeiro','notas','usuarios','perfil']]]){
   await page.goto(s.url+url);assert.deepEqual(await page.locator('.app [data-pv]').evaluateAll(els=>els.map(el=>el.dataset.pv)),allowed);
   if(url==='/cafe'){
    assert.match(await page.locator('h1').innerText(),/Do grão\s+à saca/);assert.match(await page.locator('#frase').textContent(),/Cada grão, registrado/);
    for(const width of [320,375,768,1024,1440]){
     await page.setViewportSize({width,height:900});await page.locator('[data-pv=visao]').click();
     const rect=await page.locator('#pv-visao .kpis').boundingBox();assert.ok(rect.width>150,'Prévia encolhida '+width);
     const clipped=await page.locator('#pv-visao .kpis').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.children].some(c=>c.getBoundingClientRect().bottom>r.bottom+1)||el.scrollHeight>el.clientHeight+1;});assert.equal(clipped,false,'Indicadores cortados '+width);
    }
    await page.locator('#sistema').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(screenshots,'cafe-indicadores-corrigidos.png')});
   }
  }
  await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(s.url+'/cafe');await page.locator('.hero-actions [href="#sistema"]').click();await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#sistema')).opacity)>.9);
  assert.deepEqual(errors,[]);console.log('PASS: visão geral própria; Café com frase original; prévias isoladas; indicadores sem corte; seleção de 1/2/3 atividades; preços configurados e cancelamento antes do checkout; 5 larguras; animação; nenhum erro JavaScript.');
 }finally{await browser.close();await s.stop();}
})().catch(e=>{console.error(e);process.exit(1)});
