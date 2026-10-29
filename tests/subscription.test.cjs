const {test}=require('node:test');const assert=require('node:assert/strict');
const D=require('../subscription-domain');const {startServer}=require('./support/server.cjs');
test('seleciona uma, duas ou três atividades em ordem estável',()=>{
 assert.deepEqual(D.normalize(['coffee']),['coffee']);assert.equal(D.key(['grains','cattle']),'cattle+grains');assert.equal(D.key(['grains','cattle','coffee']),'coffee+cattle+grains');
 for(const input of [[],['coffee','coffee'],['soja'],null])assert.throws(()=>D.normalize(input));
});
test('preços ficam pendentes sem tabela; cobrança usa somente valores configurados',()=>{
 const table=D.parsePricing(require('fs').readFileSync(require('path').join(__dirname,'..','planos-atividades.json'),'utf8'));
 // Tabela oficial: valor por mês com desconto arredondado para baixo (Essencial só gado: 149 / 141 / 134 / 119).
 assert.deepEqual([[1,0],[3,.05],[6,.10],[12,.20]].map(([months,discount])=>D.quote('essential',{months,discount},['cattle'],table).perMonth),[149,141,134,119]);
 assert.equal(D.quote('group',{months:12,discount:.20},['coffee','cattle','grains'],table).amount,1197*12);
 assert.equal(D.quote('essential',{months:1,discount:0},['coffee'],{}).ready,false);
 const prices=D.parsePricing('{"essential":{"coffee":100,"coffee+cattle":170,"coffee+cattle+grains":null}}');
 assert.equal(D.quote('essential',{months:12,discount:.15},['coffee'],prices).amount,1020);
 assert.equal(D.quote('essential',{months:1,discount:0},['cattle','coffee'],prices).amount,170);
 assert.equal(D.quote('essential',{months:1,discount:0},['coffee','cattle','grains'],prices).ready,false);
 assert.throws(()=>D.parsePricing('{"essential":{"coffee":-1}}'));
});
test('grupos antigos mantêm atividades, e grupos novos usam a seleção contratada',()=>{
 assert.deepEqual(D.licensed({}),['coffee','cattle','grains']);assert.deepEqual(D.licensed({subscriptionActivities:['grains']}),['grains']);
});
test('API impede cobrança sem preço definido',async t=>{
 const s=await startServer({ACTIVITY_PRICES_JSON:'{"essential":{"coffee":null}}'});t.after(()=>s.stop());
 const config=await (await fetch(s.url+'/api/public/config')).json();assert.equal(config.planPrice,null);assert.equal(D.quote('essential',{months:1,discount:0},['coffee'],config.activityPricing).ready,false);
 for(const activities of [['coffee'],['coffee','cattle'],['coffee','cattle','grains']]){
  const r=await fetch(s.url+'/api/public/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.invalid',planId:'essential',billingCycle:'monthly',activities})});
  assert.equal(r.status,422);assert.match((await r.json()).error,/não foram definidos/);
 }
});
test('assinatura de uma atividade persiste e não pode ser ampliada pelo cliente',async t=>{
 const s=await startServer({ACTIVITY_PRICES_JSON:'{"essential":{"coffee":100}}',TEST_PURCHASE_MODE:'true'});t.after(()=>s.stop());
 const request=async(url,body,token,method)=>{const r=await fetch(s.url+url,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,json:await r.json()};};
 const checkout=await request('/api/public/checkout',{email:'test@example.invalid',planId:'essential',billingCycle:'monthly',activities:['coffee']});assert.equal(checkout.status,200);assert.equal(checkout.json.amount,100);
 const onboard=await request('/api/public/purchases/'+checkout.json.purchaseId+'/onboard',{groupName:'Café teste',ceoName:'Pessoa teste',ceoUser:'coffeeowner',ceoPassword:s.password});assert.equal(onboard.status,200);
 const login=await request('/api/auth/login',{groupCode:onboard.json.group.code,username:'coffeeowner',password:s.password});assert.equal(login.status,200);const token=login.json.token;
 const state=await request('/api/state',null,token);assert.deepEqual(state.json.state.subscriptionActivities,['coffee']);
 const altered=structuredClone(state.json.state);altered.subscriptionActivities=['coffee','cattle','grains'];altered.farms[0].cattle.lots.push({id:'fake',heads:1,name:'Lote não contratado'});
 const blocked=await request('/api/state',{state:altered,baseRev:state.json.rev},token,'PUT');assert.equal(blocked.status,403);
 const forged=structuredClone(state.json.state);forged.subscriptionActivities=['coffee','cattle','grains'];
 const kept=await request('/api/state',{state:forged,baseRev:state.json.rev},token,'PUT');assert.equal(kept.status,200);assert.deepEqual(kept.json.state.subscriptionActivities,['coffee']);
 const user=await request('/api/users',{username:'notallowed',name:'Pessoa',email:'n@example.invalid',password:s.password,role:'contribuinte',function:'Campo',allowedFarmId:state.json.state.farms[0].id,allowedActivity:'cattle'},token);assert.equal(user.status,422); // 422 = recusado: atividade fora da assinatura
});
