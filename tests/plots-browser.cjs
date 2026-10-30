const {go:navigate}=require('./support/navigation.cjs');
const {chromium}=require('playwright');const {startServer}=require('./support/server.cjs');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path');
const screenshots=process.env.RURAL_SCREENSHOT_DIR||path.resolve('test-results');fs.mkdirSync(screenshots,{recursive:true});
(async()=>{
 const s=await startServer(),browser=await chromium.launch();const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/cotacao-cafe',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Indisponível no teste"}'}));
  await page.goto(s.url+'/app');await page.locator('#loginGroup').fill('1001');await page.locator('#loginUser').fill('testceo');await page.locator('#loginPassword').fill(s.password);await page.locator('#loginForm button[type=submit]').click();await page.locator('#modeSwitchBtn').waitFor();
  const sync=()=>page.waitForFunction(()=>document.querySelector('#syncStatus')?.dataset.kind==='ok');
  await page.locator('#navMenu [data-page=talhoes]').click();await page.locator('#plotForm [name=name]').fill('Talhão Baixada');await page.locator('#plotForm [name=reference]').fill('Próximo da represa');await page.locator('#plotForm button').click();await sync();
  await page.locator('.plot-history').click();await page.locator('#newPlotProcedure').click();await page.locator('.dlg [name=type]').selectOption('Roçada');await page.locator('.dlg [name=title]').fill('Roçada entre linhas');await page.locator('.dlg [name=date]').fill('2020-01-05');await page.locator('.dlg [name=responsible]').fill('Equipe do campo');await page.locator('.dlg [name=notes]').fill('Serviço concluído no período da manhã');await page.locator('.dlg button[type=submit]').click();await sync();
  assert.equal(await page.locator('.plot-event').count(),1);assert.match(await page.locator('.plot-event').innerText(),/Roçada entre linhas/);
  await page.reload();await navigate(page,'historico-talhoes');assert.equal(await page.locator('.plot-event').count(),1);
  const d=page.waitForEvent('download');await page.locator('#exportPlotHistory').click();assert.ok((await d).suggestedFilename().includes('historico-talhoes'));
  await page.screenshot({path:path.join(screenshots,'historico-talhao.png'),fullPage:true});
  await page.locator('.void-plot-procedure').click();await page.locator('.dlg [name=reason]').fill('Registro duplicado na conferência');await page.locator('.dlg button[type=submit]').click();await sync();assert.equal(await page.locator('.plot-event-void').count(),1);assert.match(await page.locator('.plot-event').innerText(),/Registro duplicado/);
  // Grãos usa o mesmo histórico por talhão, mas não mistura os procedimentos do café.
  await page.locator('#modeSwitchBtn').click();await page.locator('.dlg [name=mode][value=grains]').click();await navigate(page,'historico-talhoes');assert.equal(await page.locator('.plot-event').count(),0);
  await page.locator('#newPlotProcedure').click();await page.locator('.dlg [name=type]').selectOption('Plantio');await page.locator('.dlg [name=title]').fill('Plantio de soja');await page.locator('.dlg [name=date]').fill('2020-01-07');await page.locator('.dlg button[type=submit]').click();await sync();assert.match(await page.locator('.plot-event').innerText(),/Plantio de soja/);
  for(const width of [320,375,768,1024,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Overflow histórico '+width);}
  assert.deepEqual(errors,[]);console.log('PASS: criação de talhão; histórico pelo botão; registro de procedimento; persistência; exportação; anulação com motivo; Grãos separado do Café; 5 larguras; nenhum erro JavaScript.');
 }finally{await browser.close();await s.stop();}
})().catch(e=>{console.error(e);process.exit(1)});
