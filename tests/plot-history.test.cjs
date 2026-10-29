const {test}=require('node:test');const assert=require('node:assert/strict');const H=require('../talhoes-domain');const {startServer}=require('./support/server.cjs');
const row=()=>({id:'p1',plotId:'t1',activity:'coffee',type:'Adubação',title:'Adubação de cobertura',date:'2020-01-05',responsible:'Equipe A',inputs:'Produto e quantidade registrados pelo responsável',notes:'Conferido',voided:false});
const farm=()=>({id:'f1',talhoes:[{id:'t1',name:'Baixada'}],plotProcedures:[],equipmentLogs:[],banho:{products:[],orders:[]},agriculture:{cycles:[],harvests:[],sales:[]}});
test('histórico reúne as fontes, considera apenas aplicações concluídas e separa atividades',()=>{
 const f=farm();f.plotProcedures=[row()];f.equipmentLogs=[{id:'w1',date:'2020-01-06',activity:'Roçada',activityModule:'coffee',talhaoIds:['t1'],userName:'Equipe B'},{id:'w2',date:'2020-01-06',activity:'Plantio de soja',activityModule:'grains',talhaoIds:['t1']}];
 f.banho.orders=[{id:'a1',status:'completed',title:'Aplicação concluída',talhaoIds:['t1'],completedAt:'2020-01-07T10:00:00Z',products:[{name:'Produto A',quantity:2,unit:'L'}]},{id:'a2',status:'released',title:'Não concluído',talhaoIds:['t1']}];
 f.agriculture.cycles=[{id:'c1',plotId:'t1',activity:'coffee',name:'Café 2020'}];f.agriculture.harvests=[{id:'h1',cycleId:'c1',date:'2020-01-08',netKg:600}];
 const events=H.events(f,'t1','coffee');assert.deepEqual(events.map(e=>e.source),['harvest','application','work','manual']);assert.match(events[1].inputs,/Produto A 2 L/);assert.equal(H.events(f,'t1','grains').length,1);assert.equal(H.events(f,'outro','coffee').length,0);
});
test('vínculo por ID resiste à renomeação e legado por nome só é aceito sem ambiguidade',()=>{
 const f=farm();f.equipmentLogs=[{id:'a',talhaoIds:['t1'],activity:'Roçada'},{id:'b',talhaoNames:['Baixada'],activity:'Limpeza'}];assert.equal(H.events(f,'t1','coffee').length,2);
 f.talhoes[0].name='Novo nome';assert.equal(H.events(f,'t1','coffee').length,1);
 f.talhoes[0].name='Baixada';f.talhoes.push({id:'t2',name:'Baixada'});assert.equal(H.events(f,'t1','coffee').length,1);
});
test('procedimento recebe autoria do servidor e não aceita reescrita nem exclusão',()=>{
 const before={farms:[farm()]},after=structuredClone(before);after.farms[0].plotProcedures.push({...row(),recordedBy:'falso'});
 H.sealAndValidate(before,after,{role:'ceo',username:'owner',name:'Pessoa'},'2020-01-05T12:00:00Z');assert.equal(after.farms[0].plotProcedures[0].recordedBy,'owner');
 const rewritten=structuredClone(after);rewritten.farms[0].plotProcedures[0].title='Alteração';assert.throws(()=>H.sealAndValidate(after,rewritten,{role:'ceo',username:'owner'}),/reescrito/);
 const removed=structuredClone(after);removed.farms[0].plotProcedures=[];assert.throws(()=>H.sealAndValidate(after,removed,{role:'ceo',username:'owner'}),/apagados/);
});
test('anulação preserva original, exige motivo e não pode ser desfeita',()=>{
 const before={farms:[farm()]};before.farms[0].plotProcedures.push(row());const after=structuredClone(before);Object.assign(after.farms[0].plotProcedures[0],{voided:true,voidReason:'Lançamento em duplicidade'});
 H.sealAndValidate(before,after,{role:'adm',username:'admin'},'2020-01-06T12:00:00Z');assert.equal(after.farms[0].plotProcedures[0].title,row().title);assert.equal(after.farms[0].plotProcedures[0].voidedBy,'admin');
 const undo=structuredClone(after);undo.farms[0].plotProcedures[0].voided=false;assert.throws(()=>H.sealAndValidate(after,undo,{role:'ceo',username:'owner'}),/preservada/);
});
test('rejeita data futura, talhão de outra fazenda e anulação sem motivo',()=>{
 for(const change of [{date:'2999-01-01'},{plotId:'outra'},{voided:true}]){const f=farm();f.plotProcedures=[{...row(),...change}];assert.throws(()=>H.validateFarm(f));}
});
test('API persiste procedimento, registra auditoria e rejeita edição ou exclusão do original',async t=>{
 const s=await startServer();t.after(()=>s.stop());
 const request=async(url,body,token,method)=>{const r=await fetch(s.url+url,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,json:await r.json()};};
 const login=await request('/api/auth/login',{groupCode:'1001',username:'testceo',password:s.password});const token=login.json.token;
 const initial=await request('/api/state',null,token),state=initial.json.state;state.farms[0].talhoes=[{id:'t1',name:'Baixada'}];state.farms[0].plotProcedures=[{...row(),recordedBy:'forjado'}];
 const saved=await request('/api/state',{state,baseRev:initial.json.rev},token,'PUT');assert.equal(saved.status,200);assert.equal(saved.json.state.farms[0].plotProcedures[0].recordedBy,'testceo');assert.ok(saved.json.state.audit.some(a=>a.area==='Procedimento do talhão'));
 const next=structuredClone(saved.json.state);next.farms[0].plotProcedures[0].title='Título trocado';assert.equal((await request('/api/state',{state:next,baseRev:saved.json.rev},token,'PUT')).status,403);
 const del=structuredClone(saved.json.state);del.farms[0].plotProcedures=[];assert.equal((await request('/api/state',{state:del,baseRev:saved.json.rev},token,'PUT')).status,403);
 const cancel=structuredClone(saved.json.state);Object.assign(cancel.farms[0].plotProcedures[0],{voided:true,voidReason:'Registro duplicado'});const voided=await request('/api/state',{state:cancel,baseRev:saved.json.rev},token,'PUT');assert.equal(voided.status,200);assert.equal(voided.json.state.farms[0].plotProcedures[0].voidedBy,'testceo');
});
