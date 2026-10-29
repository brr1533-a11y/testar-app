const {chromium}=require('playwright');
const {startServer}=require('./support/server.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const screenshotDir=process.env.RURAL_SCREENSHOT_DIR || path.resolve('test-results');
fs.mkdirSync(screenshotDir,{recursive:true});
(async()=>{
 const server=await startServer();
 const browser=await chromium.launch({headless:true});
 const errors=[];
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/cotacao-cafe',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Cotação indisponível no teste"}'}));
  await page.route('**/api/mercado',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Indisponível no teste"}'}));
  await page.goto(server.url+'/app');
  await page.locator('#loginGroup').fill('1001');await page.locator('#loginUser').fill('testceo');await page.locator('#loginPassword').fill(server.password);
  await page.locator('#loginForm button[type=submit]').click();await page.locator('#modeSwitchBtn').waitFor();
  const sync=()=>page.waitForFunction(()=>document.querySelector('#syncStatus')?.dataset.kind==='ok');
  async function mode(value){await page.locator('#modeSwitchBtn').click();await page.locator(`.dlg button[name=mode][value=${value}]`).click();await page.waitForFunction(v=>selectedType()===v,value);}
  async function go(value){await page.locator(`#navMenu button[data-page="${value}"]`).click();}
  async function saveDialog(){await page.locator('.dlg button[type=submit]').click();await page.locator('.dlg-back').waitFor({state:'detached'});await sync();}
  async function newCycle(name,crop){
   await page.locator('#ruralNewCycle').click();await page.locator('.dlg [name=name]').fill(name);await page.locator('.dlg [name=crop]').selectOption(crop);
   await page.locator('.dlg [name=areaHa]').fill('10');await page.locator('.dlg [name=startDate]').fill('2020-01-01');await page.locator('.dlg [name=plannedCost]').fill('12000');await saveDialog();
  }
  await mode('grains');await go('safras');await newCycle('Soja 2026/27 · Baixada','Soja');
  const cycleId=await page.locator('.rural-harvest').first().getAttribute('data-id');
  await page.locator('.rural-harvest').first().click();await page.locator('.dlg [name=date]').fill('2020-05-01');await page.locator('.dlg [name=netKg]').fill('60000');await page.locator('.dlg [name=storage]').fill('Armazém principal');await saveDialog();
  await page.locator('.rural-sale').first().click();await page.locator('.dlg [name=date]').fill('2020-05-02');await page.locator('.dlg [name=bags]').fill('200');await page.locator('.dlg [name=pricePerBag]').fill('132');await page.locator('.dlg [name=buyer]').fill('Cooperativa — exemplo');await saveDialog();
  const numbers=await page.evaluate(()=>RuralDomain.cycleStats(activeFarm(),activeFarm().agriculture.cycles[0]));assert.equal(numbers.availableKg,48000);assert.equal(numbers.revenue,26400);
  await newCycle('Milho 2026/27 · Safrinha','Milho');await newCycle('Trigo 2027 · Inverno','Trigo');
  assert.equal(await page.locator('.rural-cycle').count(),3);
  await page.locator('#ruralFilters select[name=crop]').selectOption('Soja');await page.locator('#ruralFilters button').click();assert.equal(await page.locator('.rural-cycle').count(),1);
  const download=page.waitForEvent('download');await page.locator('#ruralExport').click();const downloaded=await download;assert.ok(downloaded.suggestedFilename().endsWith('.csv'));
  await page.screenshot({path:path.join(screenshotDir,'previa-graos-desktop.png'),fullPage:true});
  await page.reload();await page.locator('#modeSwitchBtn').waitFor();assert.equal(await page.evaluate(()=>selectedType()),'grains');await go('safras');assert.equal(await page.locator('.rural-cycle').count(),3);
  await page.locator('#farmSelect').selectOption('general-grains');await go('safras');assert.equal(await page.locator('#ruralNewCycle').count(),0);
  await page.locator('#farmSelect').selectOption(await page.locator('#farmSelect option').nth(1).getAttribute('value'));
  await mode('coffee');await go('safras');await newCycle('Café 2026 · Talhão sede','Café arábica');
  assert.equal(await page.locator('.rural-cycle').count(),1);
  await mode('cattle');await go('gado');
  await page.locator('#lotForm [name=name]').fill('Lote 01 — Engorda');await page.locator('#lotForm [name=heads]').fill('20');await page.locator('#lotForm [name=initialDate]').fill('2020-01-01');await page.locator('#lotForm [name=initialTotalKg]').fill('6000');await page.locator('#lotForm button[type=submit],#lotForm button:not([type])').first().click();await sync();
  await page.locator('#lotDetailWeighForm [name=date]').fill('2020-01-11');await page.locator('#lotDetailWeighForm [name=totalKg]').fill('6200');await page.locator('#lotDetailWeighForm button').click();await sync();
  await go('manejos');await page.locator('.rural-lot-goal').click();await page.locator('.dlg [name=targetKg]').fill('450');await saveDialog();
  const perf=await page.evaluate(()=>RuralDomain.lotPerformance(activeFarm(),activeFarm().cattle.lots[0]));assert.equal(perf.dailyGainKg,1);assert.equal(perf.daysToTarget,140);
  await page.locator('#ruralNewHealth').click();await page.locator('.dlg [name=title]').fill('Inspeção periódica do lote');await page.locator('.dlg [name=responsible]').fill('Responsável técnico — exemplo');await saveDialog();
  await page.locator('.rural-health-done').click();await saveDialog();assert.equal(await page.locator('.rural-health-done').count(),0);
  await page.screenshot({path:path.join(screenshotDir,'previa-gado-desktop.png'),fullPage:true});
  // Cada página nova precisa caber sem rolagem horizontal do documento.
  for(const width of [320,375,768,1024,1440]){
   await page.setViewportSize({width,height:900});
   for(const target of ['safras','manejos']){
    await page.evaluate(target=>{localStorage.setItem(modeStorageKey(),target==='safras'?'grains':'cattle');currentPage=target;renderNav();renderPage();},target);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    assert.equal(overflow,false,'Overflow em '+target+' '+width);
   }
  }
  await page.setViewportSize({width:375,height:900});
  await page.evaluate(()=>{localStorage.setItem(modeStorageKey(),'grains');currentPage='safras';renderNav();renderPage();});
  await page.screenshot({path:path.join(screenshotDir,'previa-graos-celular.png'),fullPage:true});
  // Troca real de atividade pelo menu móvel.
  await page.locator('#navMore').click();await page.locator('.dlg button[name=go][value=__mode]').click();await page.locator('.dlg button[name=mode][value=cattle]').click();
  assert.equal(await page.evaluate(()=>selectedType()),'cattle');
  // Smoke test de todas as páginas existentes nos três modos.
  await page.setViewportSize({width:1440,height:1000});
  for(const activity of ['coffee','cattle','grains']){
    await page.evaluate(activity=>{localStorage.setItem(modeStorageKey(),activity);currentPage='dashboard';renderNav();renderPage();},activity);
    const pages=await page.evaluate(()=>navItems().map(x=>x[0]));
    for(const target of pages){await page.evaluate(target=>goToPage(target),target);await page.waitForTimeout(30);}
  }
  assert.deepEqual(errors,[],'Erros JavaScript no navegador');
  console.log('PASS: navegação Café/Gado/Grãos; 3 culturas; colheita; venda; filtros; CSV; persistência após recarregar; consolidado; café; pesagens; GMD; metas; agenda; conclusão; 320/375/768/1024/1440px; nenhum erro JavaScript.');
 } finally {await browser.close();await server.stop();}
})().catch(e=>{console.error(e);process.exit(1)});
