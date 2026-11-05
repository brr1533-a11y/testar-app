const {test}=require('node:test'),assert=require('node:assert/strict'),{startServer}=require('./support/server.cjs');
test('novas atribuições respeitam atividade do talhão e preservam café legado e histórico',async t=>{
 const s=await startServer({PRICE_WATCH_HOURS:'0'});t.after(()=>s.stop());
 const api=async(p,tk,b,m)=>{const r=await fetch(s.url+p,{method:m||(b?'POST':'GET'),headers:{'Content-Type':'application/json',...(tk?{Authorization:'Bearer '+tk}:{})},...(b?{body:JSON.stringify(b)}:{})});return {status:r.status,...await r.json()};};
 const login=async(password=s.password)=>(await api('/api/auth/login','',{groupCode:'1001',username:'plotworker',password})).token;
 const ceo=(await api('/api/auth/login','',{groupCode:'1001',username:'testceo',password:s.password})).token;
 let v=await api('/api/state',ceo),f=v.state.farms[0],fid=f.id;
 f.talhoes=[{id:'coffee',name:'Café',activity:'coffee'},{id:'grain',name:'Soja',activity:'grains'},{id:'legacy',name:'Antigo'}];
 assert.equal((await api('/api/state',ceo,{baseRev:v.rev,state:v.state},'PUT')).status,200);
 assert.equal((await api('/api/users',ceo,{name:'Campo',username:'plotworker',email:'plot@example.invalid',password:s.password,role:'contribuinte',function:'Campo',allowedFarmId:fid,allowedActivity:'all'})).status,200);
 let worker=await login();await api('/api/auth/change-password',worker,{currentPassword:s.password,newPassword:s.password+'K9'});worker=await login(s.password+'K9');
 const save=async(id,activityModule,plotId)=>{const st=await api('/api/state',worker),farm=st.state.farms.find(f=>f.id===fid);farm.assignments.push({id,date:new Date().toISOString().slice(0,10),user:'plotworker',activityModule,activity:'Teste',talhaoIds:[plotId]});return api('/api/state',worker,{baseRev:st.rev,state:st.state},'PUT');};
 assert.equal((await save('wrong','coffee','grain')).status,422);
 assert.equal((await save('legacy-ok','coffee','legacy')).status,200);
 assert.equal((await save('wrong-grain','grains','coffee')).status,422);
 assert.equal((await save('grain-ok','grains','grain')).status,200);
 const persisted=await api('/api/state',worker);assert.equal(persisted.state.farms[0].assignments.find(a=>a.id==='legacy-ok').talhaoNames[0],'Antigo');assert.equal(persisted.state.farms[0].assignments.find(a=>a.id==='grain-ok').talhaoNames[0],'Soja');
});
