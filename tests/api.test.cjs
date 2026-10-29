const { test }=require('node:test');
const assert=require('node:assert/strict');
const {startServer}=require('./support/server.cjs');
test('API preserva safras, valida saldo e isola dados e escrita por perfil',async t=>{
 const s=await startServer();t.after(()=>s.stop());
 async function api(path,token,body,method){const r=await fetch(s.url+path,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,json:await r.json()};}
 const login=await api('/api/auth/login','',{groupCode:'1001',username:'testceo',password:s.password});assert.equal(login.status,200);const token=login.json.token;
 const initial=await api('/api/state',token);assert.equal(initial.status,200);
 const state=initial.json.state;const f=state.farms[0];
 f.agriculture={cycles:[{id:'s1',activity:'grains',crop:'Soja',name:'Safra teste',areaHa:10,bagKg:60,plannedCost:15000,quotePerBag:130,stage:'Em colheita',startDate:'2020-01-01'}],harvests:[{id:'h1',cycleId:'s1',date:'2020-05-01',netKg:1000}],sales:[{id:'v1',cycleId:'s1',date:'2020-05-02',kg:400,pricePerKg:2,buyer:'Comprador privado'}]};
 f.cattle={lots:[{id:'l1',name:'Lote A',heads:10}],weighings:[],paddocks:[],healthEvents:[]};
 const saved=await api('/api/state',token,{state,baseRev:initial.json.rev},'PUT');assert.equal(saved.status,200);assert.equal(saved.json.state.farms[0].agriculture.sales[0].buyer,'Comprador privado');
 const bad=structuredClone(saved.json.state);bad.farms[0].agriculture.sales[0].kg=1100;
 assert.equal((await api('/api/state',token,{state:bad,baseRev:saved.json.rev},'PUT')).status,400);
 assert.equal((await api('/api/state',token,{state:saved.json.state,baseRev:initial.json.rev},'PUT')).status,409);
 // O CEO concede explicitamente acesso apenas a grãos para o novo contribuinte.
 const user=await api('/api/users',token,{username:'grainuser',name:'Campo Grãos',email:'grain@example.invalid',password:s.password,role:'contribuinte',function:'Campo',allowedFarmId:f.id,allowedActivity:'grains'});assert.equal(user.status,200);
 const auth=await api('/api/auth/login','',{groupCode:'1001',username:'grainuser',password:s.password});assert.equal(auth.status,200);
 // Senha temporária exige troca; a rota protegida preserva essa regra.
 const passwordRoute='/api/auth/change-password';
 const changed=await api(passwordRoute,auth.json.token,{currentPassword:s.password,newPassword:s.password+'xy'});
 assert.equal(changed.status,200,JSON.stringify(changed.json));
 const userLogin=await api('/api/auth/login','',{groupCode:'1001',username:'grainuser',password:s.password+'xy'});const ut=userLogin.json.token;
 const visible=await api('/api/state',ut);assert.equal(visible.status,200);const vf=visible.json.state.farms[0];
 assert.equal(vf.agriculture.cycles[0].plannedCost,undefined);assert.equal(vf.agriculture.cycles[0].quotePerBag,undefined);assert.equal(vf.agriculture.sales[0].pricePerKg,undefined);assert.equal(vf.agriculture.sales[0].buyer,undefined);assert.equal(vf.agriculture.sales[0].kg,400);assert.equal(vf.cattle.lots.length,0);assert.equal(vf.finances.length,0);
 vf.agriculture.cycles[0].name='Tentativa de alteração';
 const blocked=await api('/api/state',ut,{state:visible.json.state,baseRev:visible.json.rev},'PUT');assert.equal(blocked.status,200);
 const after=await api('/api/state',token);assert.equal(after.json.state.farms[0].agriculture.cycles[0].name,'Safra teste');
 // ADM continua sem balanço, mas pode operar safras e manejos sem apagar dados do CEO.
 const admin=await api('/api/users',token,{username:'testadmin',name:'Admin teste',email:'adm@example.invalid',password:s.password,role:'adm'});assert.equal(admin.status,200);
 const al=await api('/api/auth/login','',{groupCode:'1001',username:'testadmin',password:s.password});
 assert.equal((await api('/api/auth/change-password',al.json.token,{currentPassword:s.password,newPassword:s.password+'ad'})).status,200);
 const al2=await api('/api/auth/login','',{groupCode:'1001',username:'testadmin',password:s.password+'ad'});const at=al2.json.token;
 const av=await api('/api/state',at);assert.equal(av.json.state.farms[0].finances.length,0);
 av.json.state.farms[0].agriculture.cycles.push({...av.json.state.farms[0].agriculture.cycles[0],id:'cafe2',activity:'coffee',crop:'Café arábica',name:'Café teste'});
 av.json.state.farms[0].cattle.healthEvents.push({id:'manejo1',lotId:'l1',type:'Inspeção',title:'Conferir lote',date:'2020-01-01',status:'scheduled'});
 const admSave=await api('/api/state',at,{state:av.json.state,baseRev:av.json.rev},'PUT');assert.equal(admSave.status,200);
 const final=await api('/api/state',token);assert.equal(final.json.state.farms[0].agriculture.cycles.length,2);assert.equal(final.json.state.farms[0].cattle.healthEvents.length,1);
 for(const path of ['/rural-domain.js','/rural-modules.js','/rural-modules.css']){const r=await fetch(s.url+path);assert.equal(r.status,200);assert.notEqual(r.headers.get('content-type')?.includes('text/html'),true);}
});
