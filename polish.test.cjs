const {test}=require('node:test'),assert=require('node:assert/strict'),D=require('../rural-domain'),O=require('../operacao-domain'),{startServer}=require('./support/server.cjs');
test('sete combinações únicas preservam o acesso legado e os pares com Grãos',()=>{
 assert.equal(D.PERMISSIONS.length,7);assert.equal(new Set(D.PERMISSION_OPTIONS.map(([v])=>D.activitiesFor(v).join(','))).size,7);
 assert.deepEqual(D.activitiesFor('coffee_grains'),['coffee','grains']);assert.deepEqual(D.activitiesFor('cattle_grains'),['cattle','grains']);assert.deepEqual(D.activitiesFor('both'),['coffee','cattle']);
});
test('saca da venda preserva o peso original mesmo após editar o peso da safra',()=>{
 const farm={agriculture:{cycles:[{id:'c1',bagKg:35}]}};const sale={cycleId:'c1',bagKg:35,kg:87.5,pricePerKg:70/35};farm.agriculture.cycles[0].bagKg=60;
 assert.equal(O.saleBagKg(farm,sale),35);assert.equal(sale.kg/O.saleBagKg(farm,sale),2.5);assert.equal(sale.kg*sale.pricePerKg,175);assert.equal(O.saleBagKg(farm,{cycleId:'c1'}),60);
});
test('API persiste pares Café+Grãos e Gado+Grãos e filtra a atividade não permitida',async t=>{
 const s=await startServer();t.after(()=>s.stop());const req=async(url,body,token,method)=>{const r=await fetch(s.url+url,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const json=await r.json();assert.equal(r.status,200,JSON.stringify(json));return json;};
 const owner=await req('/api/auth/login',{groupCode:'1001',username:'testceo',password:s.password});let snap=await req('/api/state',null,owner.token);const f=snap.state.farms[0];f.agriculture={cycles:['coffee','grains'].map((activity,i)=>({id:'c'+i,activity,crop:D.CROPS[activity][0],name:activity,areaHa:10,bagKg:60,plannedCost:0,startDate:'2020-01-01',stage:'Planejada'})),harvests:[],sales:[]};f.cattle={lots:[{id:'l1',name:'Recria',heads:10}],paddocks:[],weighings:[],healthEvents:[]};await req('/api/state',{state:snap.state,baseRev:snap.rev},owner.token,'PUT');
 for(const [code,expected]of [['coffee_grains',['coffee','grains']],['cattle_grains',['grains']]]){
  const password=s.password+code;await req('/api/users',{username:code,name:code,email:code+'@example.invalid',password,role:'contribuinte',function:'Campo',allowedFarmId:f.id,allowedActivity:code},owner.token);
  let auth=await req('/api/auth/login',{groupCode:'1001',username:code,password});await req('/api/auth/change-password',{currentPassword:password,newPassword:password+'xy'},auth.token);auth=await req('/api/auth/login',{groupCode:'1001',username:code,password:password+'xy'});
  const visible=await req('/api/state',null,auth.token);assert.equal(visible.state.users[0].allowedActivity,code);assert.deepEqual(visible.state.farms[0].agriculture.cycles.map(c=>c.activity),expected);assert.equal(visible.state.farms[0].cattle.lots.length,code==='cattle_grains'?1:0);
 }
});
