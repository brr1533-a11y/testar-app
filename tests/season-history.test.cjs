const {test}=require('node:test'),assert=require('node:assert/strict');
const H=require('../safras-domain'),{startServer}=require('./support/server.cjs');
const cycle=()=>({id:'c1',activity:'grains',crop:'Soja',name:'Soja 2020',plotId:'t1',areaHa:10,bagKg:60,plannedCost:0,startDate:'2020-01-01',stage:'Planejada',createdAt:'2020-01-01T12:00:00Z'});
const state=()=>({farms:[{id:'f1',agriculture:{cycles:[cycle()],harvests:[],sales:[]}}]});
test('diário preserva autoria e etapas, ignora adulteração e mantém exclusões de produção',()=>{
 const before=state(),after=structuredClone(before);after.farms[0].agriculture.cycles[0].stage='Em colheita';
 after.farms[0].agriculture.history=[{title:'forjado'}];before.farms[0].agriculture.harvests=[{id:'h1',cycleId:'c1',date:'2020-01-02',netKg:600}];
 H.recordChanges(before,after,{name:'Responsável'},'2020-01-03T12:00:00Z');
 const entries=after.farms[0].agriculture.history;assert.equal(entries.length,2);assert.equal(entries[0].notes,'Planejada → Em colheita');assert.equal(entries[0].responsible,'Responsável');assert.equal(entries[1].title,'Colheita excluída');
 const again=structuredClone(after);again.farms[0].agriculture.history=[];H.recordChanges(after,again,{name:'Outro'});assert.deepEqual(again.farms[0].agriculture.history,entries);
});
test('timeline separa safra, atividade e período do talhão sem duplicar colheitas',()=>{
 const f=state().farms[0],c=f.agriculture.cycles[0];c.stage='Encerrada';f.agriculture.history=[{id:'stage',cycleId:'c1',activity:'grains',date:'2020-03-01',createdAt:'2020-03-01T12:00:00Z',type:'Etapa',notes:'Em colheita → Encerrada',title:'Etapa alterada'}];
 f.agriculture.harvests=[{id:'h1',cycleId:'c1',date:'2020-02-01',netKg:600},{id:'h2',cycleId:'outro',date:'2020-02-01',netKg:999}];
 const plot=[{id:'p1',date:'2019-12-31'},{id:'p2',date:'2020-02-01',source:'manual',title:'Adubação'},{id:'p3',date:'2020-04-01'},{id:'p4',date:'2020-02-01',source:'harvest'}];
 const rows=H.events(f,c,plot);assert.equal(rows.length,4);assert.equal(rows.filter(e=>e.type==='Talhão').length,1);assert.ok(rows.some(e=>e.notes?.includes('600')));assert.ok(rows.some(e=>e.notes?.includes('não foram reconstruídas')));
});
test('API grava etapas e restaura diário removido pelo cliente, em nova consulta',async t=>{
 const s=await startServer();t.after(()=>s.stop());
 const req=async(url,body,token,method)=>{const r=await fetch(s.url+url,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};};
 const login=await req('/api/auth/login',{groupCode:'1001',username:'testceo',password:s.password});const token=login.token;
 let snap=await req('/api/state',null,token);snap.state.farms[0].agriculture={cycles:[{...cycle(),plotId:''}],harvests:[],sales:[],history:[{title:'forjado'}]};
 snap=await req('/api/state',{state:snap.state,baseRev:snap.rev},token,'PUT');assert.equal(snap.status,200);assert.equal(snap.state.farms[0].agriculture.history[0].title,'Safra cadastrada');
 snap.state.farms[0].agriculture.cycles[0].stage='Encerrada';snap.state.farms[0].agriculture.history=[];
 snap=await req('/api/state',{state:snap.state,baseRev:snap.rev},token,'PUT');assert.equal(snap.status,200);assert.equal(snap.state.farms[0].agriculture.history.length,2);
 const loaded=await req('/api/state',null,token);assert.equal(loaded.state.farms[0].agriculture.history[1].notes,'Planejada → Encerrada');
});
