const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path'),fs=require('fs'),os=require('os'),net=require('net'),{spawn}=require('child_process');
const root=path.resolve(__dirname,'..'),L=require(root+'/lcdpr.js'),H=require(root+'/maodeobra-domain.js'),E=require(root+'/equipamentos-domain.js'),{startServer}=require(root+'/tests/support/server.cjs');
let seed=7638;const rng=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n};
const ceo={id:'ceo',username:'ceo',role:'ceo',name:'CEO',labor:'manager'};
test('LCDPR: 80 cenários reproduzíveis, três fazendas, quatro anos, centavos e meses negativos',()=>{
 for(let scenario=0;scenario<80;scenario++){
  const st={farms:[]},cfg={produtor:{cpf:'52998224725',nome:'SIMULACAO',endereco:'Rua ficticia',bairro:'Teste',uf:'MG',codMun:'3101607',cep:'37130000',email:'test@example.invalid'},imoveis:[],contas:[{banco:'000',nomeBanco:'TESTE',agencia:'1',conta:'1'}]};
  const totals=new Map();
  for(let f=0;f<3;f++){const farm={id:'f'+f,name:'FICTICIA '+f,finances:[]};st.farms.push(farm);cfg.imoveis.push({farmId:farm.id,cafir:'00000000',endereco:'Rua ficticia',bairro:'Teste',uf:'MG',codMun:'3101607',cep:'37130000',tipo:1});for(let y=2023;y<=2026;y++)for(let m=1;m<=12;m++)for(let j=0;j<4;j++){const cents=1+rng(999999),type=rng(2)?'entrada':'saida',date=y+'-'+String(m).padStart(2,'0')+'-'+String(1+rng(27)).padStart(2,'0');farm.finances.push({id:f+'-'+date+'-'+j,date,type,value:cents/100,description:'Teste | çã',lcdpr:{partic:'12345678000195',tipoDoc:3,numDoc:'SIM'}});const key=y+'-'+m,row=totals.get(key)||[0,0];row[type==='entrada'?0:1]+=cents;totals.set(key,row);}}
  for(let y=2023;y<=2026;y++){const out=L.build(st,y,cfg);assert.equal(out.warnings.length,0);assert.equal(out.entries,144);let cumulative=0;const rows=out.text.trim().split('\r\n').map(r=>r.split('|'));for(const r of rows.filter(r=>r[0]==='Q200')){const [inc,exp]=totals.get(y+'-'+Number(r[1].slice(0,2)));cumulative+=inc-exp;assert.deepEqual(r.slice(2),[String(inc),String(exp),String(Math.abs(cumulative)),cumulative<0?'N':'P']);}assert.equal(Math.round(out.balance*100),cumulative);assert.equal(+rows.at(-1).at(-1),rows.length);}
 }
});
test('Colheita: 60 semanas com dez pessoas, diárias, sacos e fechamento idempotente',()=>{
 const day='2026-09-08',week=H.weekStart(day);
 for(let scenario=0;scenario<60;scenario++){
  const f={id:'f',talhoes:[{id:'t',name:'Teste'}],finances:[],management:{payables:[]},labor:{workers:[],plotRates:[{id:'r',plotId:'t',ratePerBag:12.5,validFrom:'2020-01-01'}],entries:[],adjustments:[],closings:[],settings:{}}};
  let expected=0;for(let i=0;i<10;i++)f.labor.workers.push({id:'w'+i,name:'Pessoa '+i,role:'panhador',dailyRate:100+i,active:true});
  let before={users:[ceo],farms:[f]},after=structuredClone(before);
  for(let i=0;i<10;i++){const bags=1+rng(80);expected+=i%2?100+i:bags*12.5;after.farms[0].labor.entries.push({id:'e'+i,date:day,workerId:'w'+i,plotId:'t',kind:i%2?'diaria':'saco',...(i%2?{}:{bags})});}
  H.prepare(before,after,ceo);before=structuredClone(after);after.farms[0].labor.closings.push({id:'k',weekStart:week});H.prepare(before,after,ceo);const payables=after.farms[0].management.payables;assert.equal(payables.length,10);assert.equal(payables.reduce((n,p)=>n+p.amount,0),expected);const again=structuredClone(after);H.prepare(after,again,ceo);assert.deepEqual(again.farms[0].management.payables,payables);
 }
});
test('Equipamentos: 40 transferências de ida e volta sem duplicação de cadastro ou histórico',()=>{
 const state={farms:[{id:'a',name:'A',tractors:[{id:'t',name:'Trator',status:'Disponível'}],implements:[]},{id:'b',name:'B',tractors:[],implements:[]}]};
 for(let i=0;i<40;i++){const payload={fromFarmId:i%2?'b':'a',toFarmId:i%2?'a':'b',tractorId:'t',reason:'Teste de movimentação',requestId:'m'+i};E.transfer(state,payload,ceo,'2026-11-01T12:00:00Z');E.transfer(state,payload,ceo,'2026-11-01T12:00:01Z');assert.equal(state.farms.flatMap(f=>f.tractors).length,1);assert.equal(state.equipmentTransfers.length,i+1);}assert.equal(state.farms[0].equipmentArchive.length,20);assert.equal(state.farms[1].equipmentArchive.length,20);
});
test('API: vinte gravações concorrentes geram conflito, permitem repetição e preservam todas',async t=>{
 const s=await startServer();t.after(()=>s.stop());const api=async(p,tk,b,m)=>{const r=await fetch(s.url+p,{method:m||(b?'POST':'GET'),headers:{'Content-Type':'application/json',...(tk?{Authorization:'Bearer '+tk}:{})},...(b?{body:JSON.stringify(b)}:{})});return {status:r.status,j:await r.json()}};
 const tk=(await api('/api/auth/login','',{groupCode:'1001',username:'testceo',password:s.password})).j.token,base=(await api('/api/state',tk)).j;
 const requests=Array.from({length:20},(_,i)=>{const state=structuredClone(base.state);state.farms[0].finances.push({id:'concurrent-'+i,activity:'coffee',date:'2026-01-01',type:'saida',category:'Teste',description:'Teste concorrente '+i,value:(i+1)/100});return {state,i}});
 const responses=await Promise.all(requests.map(({state})=>api('/api/state',tk,{state,baseRev:base.rev},'PUT')));assert.equal(responses.filter(r=>r.status===200).length,1);assert.equal(responses.filter(r=>r.status===409).length,19);
 for(let i=0;i<20;i++)if(responses[i].status===409){const latest=(await api('/api/state',tk)).j;latest.state.farms[0].finances.push(requests[i].state.farms[0].finances.at(-1));assert.equal((await api('/api/state',tk,{state:latest.state,baseRev:latest.rev},'PUT')).status,200);}
 const final=(await api('/api/state',tk)).j,rows=final.state.farms[0].finances.filter(r=>r.id.startsWith('concurrent-'));assert.equal(rows.length,20);assert.equal(rows.reduce((n,r)=>n+Math.round(r.value*100),0),210);assert.equal((await api('/api/state',tk,{state:final.state},'PUT')).status,400);
});
test('Persistência: cópia do banco local inicia outro processo e mantém lançamentos e revisão',async t=>{
 const s=await startServer();t.after(()=>s.stop());
 const call=async(url,p,token,body,method)=>{const r=await fetch(url+p,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});assert.equal(r.status,200);return r.json()};
 const login=await call(s.url,'/api/auth/login','',{groupCode:'1001',username:'testceo',password:s.password}),v=await call(s.url,'/api/state',login.token);v.state.farms[0].finances.push({id:'restauracao',activity:'coffee',type:'entrada',value:1234.56,date:'2026-01-01',category:'Teste',description:'Valor que deve sobreviver à restauração'});const saved=await call(s.url,'/api/state',login.token,{state:v.state,baseRev:v.rev},'PUT');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'rural-restore-'));t.after(()=>{if(path.dirname(path.resolve(folder))===path.resolve(os.tmpdir())&&path.basename(folder).startsWith('rural-restore-'))fs.rmSync(folder,{recursive:true,force:true})});for(const file of fs.readdirSync(s.folder,{withFileTypes:true}))if(file.isFile())fs.copyFileSync(path.join(s.folder,file.name),path.join(folder,file.name));fs.cpSync(path.join(s.folder,'assets'),path.join(folder,'assets'),{recursive:true});
 const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));const child=spawn(process.execPath,[path.join(folder,'server.js')],{windowsHide:true,stdio:'ignore',env:{...process.env,NODE_ENV:'test',DATABASE_URL:'',NODE_PATH:root+'/node_modules',PORT:String(port),SEED_CEO_USER:'testceo',SEED_CEO_PASSWORD:s.password,PLATFORM_ADMIN_EMAIL:'admin@example.invalid',PLATFORM_ADMIN_PASSWORD:s.password,PRICE_WATCH_HOURS:'0',BACKUP_HOURS:'0'}});t.after(async()=>{if(child.exitCode===null){const p=new Promise(r=>child.once('close',r));child.kill();await p}});
 const url='http://127.0.0.1:'+port;let ready=false;for(let i=0;i<60;i++){try{if((await fetch(url+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert.ok(ready);const restored=await call(url,'/api/state',login.token);assert.equal(restored.rev,saved.rev);assert.deepEqual(restored.state.farms[0].finances,saved.state.farms[0].finances);
});
