const {chromium}=require('playwright'),assert=require('node:assert/strict'),{startServer}=require('./support/server.cjs');
(async()=>{
 const s=await startServer(),browser=await chromium.launch();
 try{
  const request=async(url,body,token,method)=>{const r=await fetch(s.url+url,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});assert.equal(r.status,200);return r.json();};
  const login=await request('/api/auth/login',{groupCode:'1001',username:'testceo',password:s.password});let snap=await request('/api/state',null,login.token);
  const farm=snap.state.farms[0];farm.agriculture={cycles:[{id:'coffee1',activity:'coffee',crop:'Café arábica',name:'Café 2020',areaHa:10,bagKg:60,plannedCost:0,startDate:'2020-01-01',stage:'Planejada'},{id:'grain1',activity:'grains',crop:'Soja',name:'Soja 2020',areaHa:10,bagKg:60,plannedCost:0,startDate:'2020-01-01',stage:'Planejada'}],harvests:[{id:'h1',cycleId:'coffee1',date:'2020-02-01',netKg:600,moisture:null}],sales:[]};
  snap=await request('/api/state',{state:snap.state,baseRev:snap.rev},login.token,'PUT');snap.state.farms[0].agriculture.cycles[0].stage='Encerrada';await request('/api/state',{state:snap.state,baseRev:snap.rev},login.token,'PUT');
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/cotacao-cafe',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await page.goto(s.url+'/app');await page.locator('#loginGroup').fill('1001');await page.locator('#loginUser').fill('testceo');await page.locator('#loginPassword').fill(s.password);await page.locator('#loginForm button[type=submit]').click();await page.locator('#modeSwitchBtn').waitFor();
  await page.locator('#navMenu [data-page=safras]').click();await page.locator('.rural-season-history').click();assert.equal(await page.locator('.season-event').count(),3);assert.match(await page.locator('#pageContent').innerText(),/Planejada → Encerrada/);
  await page.locator('#seasonFilters [name=type]').selectOption('Colheita');await page.locator('#seasonFilters button').click();assert.equal(await page.locator('.season-event').count(),1);
  const d=page.waitForEvent('download');await page.locator('#exportSeasonHistory').click();assert.match((await d).suggestedFilename(),/historico-safra-coffee/);
  for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Overflow '+width);}
  await page.setViewportSize({width:1440,height:1000});await page.locator('#seasonBack').click();await page.locator('#modeSwitchBtn').click();await page.locator('.dlg [name=mode][value=grains]').click();await page.locator('#navMenu [data-page=safras]').click();await page.locator('.rural-season-history').click();assert.match(await page.locator('#pageContent').innerText(),/Soja 2020/);assert.equal(await page.locator('.season-event').count(),1);
  await page.reload();await page.locator('#navMenu [data-page=safras]').click();await page.locator('.rural-season-history').click();assert.equal(await page.locator('.season-event').count(),1);assert.deepEqual(errors,[]);
  console.log('PASS: safra encerrada, etapas persistidas, colheita, filtro, CSV, Café e Grãos separados, recarga e 4 larguras sem overflow.');
 }finally{await browser.close();await s.stop();}
})().catch(e=>{console.error(e);process.exit(1)});
