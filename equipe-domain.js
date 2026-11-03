(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RuralTeam=factory();})(globalThis,function(){
 'use strict';
 const fail=(m,s=422)=>{throw Object.assign(Error(m),{statusCode:s});},ok=(v,m,s)=>{if(!v)fail(m,s);};
 const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 const functions=['Campo','Tratorista','Fiscal de colheita'];
 function init(state){state.workforce||={roles:[],attendance:[]};state.workforce.roles||=[];state.workforce.attendance||=[];return state.workforce;}
 function seconds(row,now){const end=row.endedAt||now;return Math.max(0,Math.floor((Date.parse(end)-Date.parse(row.startedAt))/1000)-(row.breaks||[]).reduce((n,b)=>n+Math.max(0,Math.floor((Date.parse(b.end||end)-Date.parse(b.start))/1000)),0));}
 function periodSeconds(row,start,end,now){const finish=Date.parse(row.endedAt||now),a=Math.max(Date.parse(row.startedAt),Date.parse(start)),b=Math.min(finish,Date.parse(end));if(b<=a)return 0;const pause=(row.breaks||[]).reduce((n,p)=>n+Math.max(0,Math.min(b,Date.parse(p.end||row.endedAt||now))-Math.max(a,Date.parse(p.start))),0);return Math.max(0,Math.floor((b-a-pause)/1000));}
 function act(state,input,user,{id,at}){
  const w=init(state),actor=state.users.find(u=>u.id===user.id&&u.active!==false);ok(actor,'Acesso desativado',403);
  if(input.kind==='clock'){
   ok(actor.role!=='ceo','CEO acompanha os pontos, mas não bate ponto.',403);
   const open=w.attendance.filter(r=>r.userId===actor.id&&!r.endedAt);ok(open.length<=1,'Há mais de um ponto aberto. Fale com o CEO.',409);const r=open[0];
   if(input.action==='in'){ok(!r,'Você já tem um ponto aberto.',409);w.attendance.push({id,userId:actor.id,userName:actor.name||actor.username,username:actor.username,cargo:actor.cargoName||actor.function||actor.role,startedAt:at,breaks:[],endedAt:null,createdAt:at});}
   else{ok(r,'Registre a entrada primeiro.',409);const last=r.breaks.at(-1);ok(Date.parse(at)>=Date.parse(last?.end||last?.start||r.startedAt),'Horário do servidor inconsistente.',409);const pause=r.breaks.find(b=>!b.end);
    if(input.action==='pause'){ok(!pause,'O intervalo já está aberto.',409);r.breaks.push({start:at,end:null});}
    else if(input.action==='resume'){ok(pause,'Não há intervalo aberto.',409);pause.end=at;}
    else if(input.action==='out'){if(pause)pause.end=at;r.endedAt=at;}
    else fail('Escolha uma ação de ponto válida.');
   }return;
  }
  ok(actor.role==='ceo','Só o CEO gerencia cargos e corrige pontos.',403);
  if(input.kind==='role'){
   ok(text(input.name,80),'Informe o nome do cargo (até 80 caracteres).');ok(['adm','contribuinte'].includes(input.level),'Escolha Administrador ou Operacional.');
   const fn=input.level==='adm'?'Administração':input.function;ok(input.level==='adm'||functions.includes(fn),'Escolha a rotina operacional.');
   const existing=input.id?w.roles.find(r=>r.id===input.id):null;ok(!input.id||existing,'Cargo não encontrado.',404);
   ok(!w.roles.some(r=>r.id!==input.id&&r.name.toLocaleLowerCase('pt-BR')===input.name.trim().toLocaleLowerCase('pt-BR')),'Já existe um cargo com esse nome.',409);
   if(existing)ok(!state.users.some(u=>u.cargoId===existing.id&&(u.role!==input.level||u.function!==fn)),'Para mudar o nível, crie outro cargo e transfira as pessoas.');
   ok(existing||w.roles.length<100,'Limite de 100 cargos personalizados no grupo.');const r={id:existing?.id||id,name:input.name.trim(),level:input.level,function:fn,updatedAt:at,updatedBy:actor.id};if(existing)Object.assign(existing,r);else w.roles.push(r);
   for(const u of state.users)if(u.cargoId===r.id)u.cargoName=r.name;return;
  }
  if(input.kind==='assign'){
   const target=state.users.find(u=>u.id===input.userId),role=w.roles.find(r=>r.id===input.roleId);ok(target&&role,'Pessoa ou cargo não encontrado.',404);ok(target.role!=='ceo','O acesso do CEO não é substituído por um cargo.',403);
   if(role.level==='contribuinte'){ok(state.farms.some(f=>f.id===input.farmId),'Escolha a fazenda do usuário.');ok(['coffee','cattle','grains','both','all','coffee_cattle','coffee_grains','cattle_grains'].includes(input.activity),'Escolha a atividade permitida.');}
   Object.assign(target,{cargoId:role.id,cargoName:role.name,role:role.level,function:role.function,allowedFarmId:role.level==='adm'?'':input.farmId,allowedActivity:role.level==='adm'?'all':input.activity});return;
  }
  if(input.kind==='correct'){
   const r=w.attendance.find(r=>r.id===input.id);ok(r&&r.endedAt,'Ajuste somente um ponto encerrado.',409);ok(text(input.reason,500),'Informe o motivo da correção.');
   const start=Date.parse(input.startedAt),end=Date.parse(input.endedAt),breakMinutes=Number(input.breakMinutes);
   ok(Number.isFinite(start)&&Number.isFinite(end)&&end>start&&end<=Date.parse(at)&&end-start<=7*86400000,'Confira entrada e saída (até sete dias, sem datas futuras).');ok(Number.isFinite(breakMinutes)&&breakMinutes>=0&&breakMinutes*60000<=end-start,'Intervalo inválido.');
   ok(!w.attendance.some(x=>x.id!==r.id&&x.userId===r.userId&&start<Date.parse(x.endedAt||at)&&end>Date.parse(x.startedAt)),'O horário se sobrepõe a outro ponto.',409);
   r.corrections||=[];r.corrections.push({startedAt:r.startedAt,endedAt:r.endedAt,breaks:r.breaks,reason:input.reason.trim(),by:actor.id,at});r.startedAt=new Date(start).toISOString();r.endedAt=new Date(end).toISOString();r.breaks=breakMinutes?[{start:r.startedAt,end:new Date(start+breakMinutes*60000).toISOString()}]:[];return;
  }
  fail('Operação desconhecida.');
 }
 function project(state,user){const w=state.workforce||{roles:[],attendance:[]};return user.role==='ceo'?w:{roles:[],attendance:w.attendance.filter(r=>r.userId===user.id).map(r=>{const x={...r};delete x.corrections;return x;})};}
 return{act,project,seconds,periodSeconds,functions};
});
