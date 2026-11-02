(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./adm-access'):root.AdmAccess,typeof module==='object'&&module.exports?require('./subscription-domain'):root.SubscriptionDomain);if(typeof module==='object'&&module.exports)module.exports=api;else root.RuralRoutine=api;})(globalThis,function(Adm,Sub){
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x)),fail=(m,s=422)=>{throw Object.assign(new Error(m),{statusCode:s});},check=(ok,m,s)=>{if(!ok)fail(m,s);},num=(v,min=0,max=1e10)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,round=n=>Math.round((n+Number.EPSILON)*100)/100;
  const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
  const text=(v,max=100)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
  const activityOf=r=>r.activityModule||(['coffee','cattle','grains'].includes(r.activity)?r.activity:'coffee');
  function can(state,u,kind){
    if(!u)return false;
    if(kind==='feedback'||kind==='help')return true;
    if(kind==='feedbackStatus'||kind==='policy')return u.role==='ceo';
    if(kind==='pay')return u.role==='ceo'||u.role==='adm'&&Adm.can(state,'financeiro')&&Adm.can(state,'manutencao');
    if(kind==='work')return u.role==='ceo'||u.role==='adm'&&Adm.can(state,'manutencao')||u.role==='contribuinte'&&u.function==='Tratorista';
    if(kind==='approval'||kind==='void')return can(state,u,'work')&&u.role!=='contribuinte';
    if(kind==='ground')return Sub.licensed(state).includes('coffee')&&(u.role==='ceo'||u.role==='adm'&&Adm.can(state,'safras'));
    if(kind==='tips')return Sub.licensed(state).includes('coffee')&&(u.role!=='contribuinte'||Sub.activities.some(a=>a.id==='coffee')&&['coffee','both','all','coffee_cattle','coffee_grains'].includes(u.allowedActivity));
    if(kind==='tipEdit')return can(state,u,'tips')&&(u.role==='ceo'||u.role==='adm'&&(Adm.can(state,'pos-colheita')||Adm.can(state,'banho')));
    return false;
  }
  function init(state){state.routine||={};state.routine.tips||=[];state.routine.feedback||=[];for(const f of state.farms||[]){f.routine||={};for(const k of ['ground','work','payPolicies','machinePolicies'])f.routine[k]||=[];}return state;}
  function groundStats(f,row){
    const c=f.agriculture?.cycles?.find(c=>c.id===row.cycleId),denom=row.referenceKg>0?row.referenceKg:(f.agriculture?.harvests||[]).filter(h=>h.cycleId===row.cycleId&&h.plotId===row.plotId).reduce((n,h)=>n+Number(h.netKg||0),0),remaining=Math.max(0,row.fallenKg-row.recoveredKg),bagKg=c?.bagKg||60;
    return{fallenKg:row.fallenKg,recoveredKg:row.recoveredKg,remainingKg:round(remaining),remainingBags:round(remaining/bagKg),bagKg,referenceKg:round(denom),fallenPct:denom>0?round(row.fallenKg/denom*100):null,recoveredPct:row.fallenKg>0?round(row.recoveredKg/row.fallenKg*100):0};
  }
  function machineRate(p){const depreciation=(p.purchaseValue-p.residualValue)/p.usefulHours;return{depreciation:round(depreciation),fuel:round(p.fuelLitresHour*p.fuelPrice),maintenance:p.maintenanceHour,total:round(depreciation+p.fuelLitresHour*p.fuelPrice+p.maintenanceHour)};}
  function report(f,month,activity){
    const rows=(f.routine?.work||[]).filter(w=>!w.voided&&w.approved&&w.date.startsWith(month)),workers=[],machines=[];
    const applicable=(policies,key)=>{const latest=new Map();for(const p of policies||[])if(p.effectiveMonth<=month&&(!latest.has(p[key])||latest.get(p[key]).effectiveMonth<p.effectiveMonth))latest.set(p[key],p);return [...latest.values()];};
    for(const p of applicable(f.routine?.payPolicies,'workerId')){const own=rows.filter(w=>w.workerId===p.workerId),hours=round(own.reduce((n,w)=>n+w.workerHours,0)),days=new Set(own.map(w=>w.date)).size;
      const extra=p.mode==='monthly'?Math.max(0,hours-p.contractedHours):0,base=p.mode==='hourly'?hours*p.rate:p.mode==='daily'?days*p.rate:p.rate;
      workers.push({workerId:p.workerId,mode:p.mode,hours,days,base:round(base),extraHours:round(extra),extra:round(extra*p.overtimeRate),total:round(base+extra*p.overtimeRate)});
    }
    for(const p of applicable(f.routine?.machinePolicies,'equipmentId')){const own=rows.filter(w=>w.equipmentId===p.equipmentId),hours=round(own.reduce((n,w)=>n+w.machineHours,0)),rate=machineRate(p);machines.push({equipmentId:p.equipmentId,hours,rate:rate.total,total:round(hours*rate.total)});}
    return{month,workers,machines,pending:(f.routine?.work||[]).filter(w=>!w.voided&&!w.approved&&w.date.startsWith(month)).length};
  }
  function apply(state,input,user,{id,at}){
    init(state);const kind=input.kind;check(can(state,user,kind==='tip'?'tipEdit':kind),'Sem permissão para esta operação.',403);
    const today=at.slice(0,10),global=state.routine;
    if(kind==='feedback'){check(['bug','idea','difficulty','other'].includes(input.category)&&text(input.message,2000),'Informe categoria e mensagem (até 2.000 caracteres).');check(global.feedback.length<5000,'Limite de feedbacks atingido.');global.feedback.push({id,authorId:user.id,at,category:input.category,message:input.message.trim(),page:String(input.page||'').slice(0,80),status:'novo'});return;}
    if(kind==='feedbackStatus'){const r=global.feedback.find(r=>r.id===input.id);check(r&&['novo','em análise','resolvido'].includes(input.status),'Feedback ou situação inválida.');r.status=input.status;r.reviewedAt=at;r.reviewedBy=user.id;return;}
    if(kind==='tip'){check(['pre','post','treatment'].includes(input.phase)&&text(input.title,120)&&text(input.message,3000),'Informe fase, título e orientação.');const existing=input.id?global.tips.find(t=>t.id===input.id):null;check(!input.id||existing,'Orientação não encontrada.');if(existing)Object.assign(existing,{phase:input.phase,title:input.title.trim(),message:input.message.trim(),updatedAt:at,updatedBy:user.id});else{check(global.tips.length<1000,'Limite de orientações atingido.');global.tips.push({id,at,authorId:user.id,phase:input.phase,title:input.title.trim(),message:input.message.trim()});}return;}
    const f=state.farms.find(f=>String(f.id)===String(input.farmId));check(f,'Fazenda não encontrada.');check(user.role!=='contribuinte'||String(user.allowedFarmId)===String(f.id),'Fazenda fora do seu acesso.',403);
    if(kind==='ground'){
      const c=f.agriculture?.cycles?.find(c=>c.id===input.cycleId&&c.activity==='coffee'),plot=f.talhoes?.find(p=>p.id===input.plotId);check(c&&plot&&activityOf(plot)==='coffee'&&(!c.plotIds?.length||c.plotIds.includes(plot.id)),'Escolha uma safra e um talhão de café compatíveis.');
      const inputMode=input.inputMode||'kg';check(['kg','percent'].includes(inputMode)&&num(input.referenceKg,0,1e10),'Escolha o modo de entrada e uma referência válida.');
      const base=input.referenceKg>0?input.referenceKg:(f.agriculture?.harvests||[]).filter(h=>h.cycleId===c.id&&h.plotId===plot.id).reduce((n,h)=>n+Number(h.netKg||0),0);
      if(inputMode==='percent')check(base>0&&num(input.fallenPercent,0,100),'Para informar a porcentagem, é necessário ter uma base em kg e um percentual de 0 a 100.');
      const fallenKg=inputMode==='percent'?round(base*input.fallenPercent/100):input.fallenKg;
      check(date(input.date)&&input.date<=today&&num(fallenKg,0,1e9)&&num(input.recoveredKg,0,fallenKg),'Quantidades ou data inválidas; levantado não pode superar o caído.');
      const existing=f.routine.ground.find(r=>r.cycleId===c.id&&r.plotId===plot.id);const row={id:existing?.id||id,cycleId:c.id,plotId:plot.id,date:input.date,inputMode,fallenKg,recoveredKg:input.recoveredKg,referenceKg:inputMode==='percent'?base:input.referenceKg,at,authorId:user.id};
      const stats=groundStats(f,row);check(stats.fallenPct===null||stats.fallenPct<=100,'O café caído não pode superar a quantidade de referência. Confira a base da porcentagem.');
      if(existing)Object.assign(existing,row);else f.routine.ground.push(row);return;
    }
    if(kind==='work'){
      check(f.routine.work.length<10000,'Limite de apontamentos desta fazenda atingido.');
      check(Sub.licensed(state).includes(input.activity),'Atividade não contratada.',403);
      if(user.role==='contribuinte')check(Sub.licensed(state).includes(input.activity)&&requireActivities(user.allowedActivity).includes(input.activity),'Atividade fora do seu acesso.',403);
      const worker=state.users.find(u=>u.id===(user.role==='contribuinte'?user.id:input.workerId)&&u.active!==false),equipment=[...(f.tractors||[]),...(f.implements||[])].find(e=>e.id===input.equipmentId);
      check(worker&&equipment,'Escolha usuário ativo e equipamento desta fazenda.');
      check(worker.role!=='contribuinte'||String(worker.allowedFarmId)===String(f.id),'Usuário não está liberado para esta fazenda.');
      check(worker.role!=='contribuinte'||requireActivities(worker.allowedActivity).includes(input.activity),'Usuário não está liberado para esta atividade.');
      check(date(input.date)&&input.date<=today&&num(input.startMeter)&&num(input.endMeter,input.startMeter)&&num(input.breakHours,0,24)&&num(input.workerHours,0,24),'Data, horas ou horímetro inválidos.');
      const machineHours=round(input.endMeter-input.startMeter-input.breakHours);check(machineHours>=0&&machineHours<=24&&input.workerHours>0,'Informe até 24 horas válidas no dia e confira a pausa.');
      check(!(f.routine.work||[]).some(r=>!r.voided&&r.equipmentId===equipment.id&&r.date===input.date&&r.startMeter<input.endMeter&&r.endMeter>input.startMeter),'Já existe uso desta máquina no mesmo intervalo de horímetro.');
      check(!(f.routine.work||[]).some(r=>!r.voided&&r.workerId===worker.id&&r.equipmentId===equipment.id&&r.date===input.date&&r.startMeter===input.startMeter&&r.endMeter===input.endMeter),'Este apontamento já existe.');
      check((f.routine.work||[]).filter(r=>!r.voided&&r.workerId===worker.id&&r.date===input.date).reduce((n,r)=>n+r.workerHours,0)+input.workerHours<=24,'As horas do trabalhador no dia não podem passar de 24.');
      f.routine.work.push({id,workerId:worker.id,equipmentId:equipment.id,date:input.date,activity:input.activity,startMeter:input.startMeter,endMeter:input.endMeter,breakHours:input.breakHours,workerHours:input.workerHours,machineHours,approved:user.role!=='contribuinte',authorId:user.id,at});return;
    }
    if(kind==='approval'){check(can(state,user,'work')&&user.role!=='contribuinte','Somente o responsável pode conferir horas.',403);const r=f.routine.work.find(r=>r.id===input.id);check(r,'Apontamento não encontrado.');r.approved=true;r.reviewedAt=at;r.reviewedBy=user.id;return;}
    if(kind==='void'){const r=f.routine.work.find(r=>r.id===input.id);check(r&&text(input.reason,300),'Informe o apontamento e o motivo da anulação.');r.voided=true;r.voidReason=input.reason;r.reviewedAt=at;r.reviewedBy=user.id;return;}
    if(kind==='policy'){
      check(typeof input.effectiveMonth==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(input.effectiveMonth),'Informe o mês inicial de vigência.');
      if(input.policy==='worker'){check(state.users.some(u=>u.id===input.workerId&&u.active!==false&&(u.role!=='contribuinte'||u.allowedFarmId===f.id))&&['hourly','daily','monthly'].includes(input.mode)&&num(input.rate,0,1e7)&&num(input.contractedHours,1,744)&&num(input.overtimeRate,0,1e7),'Configuração de remuneração inválida.');const r={workerId:input.workerId,mode:input.mode,rate:input.rate,contractedHours:input.contractedHours,overtimeRate:input.overtimeRate,effectiveMonth:input.effectiveMonth};const i=f.routine.payPolicies.findIndex(p=>p.workerId===r.workerId&&p.effectiveMonth===r.effectiveMonth);if(i<0)f.routine.payPolicies.push(r);else f.routine.payPolicies[i]=r;}
      else{check(input.policy==='machine'&&[...(f.tractors||[]),...(f.implements||[])].some(e=>e.id===input.equipmentId)&&num(input.purchaseValue)&&num(input.residualValue,0,input.purchaseValue)&&num(input.usefulHours,1,1e7)&&num(input.fuelLitresHour,0,1000)&&num(input.fuelPrice,0,1000)&&num(input.maintenanceHour,0,1e7),'Configuração de hora-máquina inválida.');const r={equipmentId:input.equipmentId,purchaseValue:input.purchaseValue,residualValue:input.residualValue,usefulHours:input.usefulHours,fuelLitresHour:input.fuelLitresHour,fuelPrice:input.fuelPrice,maintenanceHour:input.maintenanceHour,effectiveMonth:input.effectiveMonth};const i=f.routine.machinePolicies.findIndex(p=>p.equipmentId===r.equipmentId&&p.effectiveMonth===r.effectiveMonth);if(i<0)f.routine.machinePolicies.push(r);else f.routine.machinePolicies[i]=r;}return;
    }
    fail('Operação não reconhecida.');
  }
  function requireActivities(value){return value==='all'?['coffee','cattle','grains']:({coffee:['coffee'],cattle:['cattle'],grains:['grains'],both:['coffee','cattle'],coffee_cattle:['coffee','cattle'],coffee_grains:['coffee','grains'],cattle_grains:['cattle','grains']})[value]||[];}
  function preserve(before,after){after.routine=clone(before.routine||{tips:[],feedback:[]});for(const f of after.farms||[]){const old=before.farms?.find(o=>o.id===f.id);f.routine=clone(old?.routine||{ground:[],work:[],payPolicies:[],machinePolicies:[]});}}
  function project(full,raw,user){
    const g=raw.routine||{};full.routine={tips:can(raw,user,'tips')?clone(g.tips||[]):[],feedback:clone((g.feedback||[]).filter(r=>user.role==='ceo'||r.authorId===user.id))};
    for(const f of full.farms||[]){const src=raw.farms?.find(r=>r.id===f.id)?.routine||{},activities=Sub.licensed(raw).filter(a=>user.role!=='contribuinte'||requireActivities(user.allowedActivity).includes(a));f.routine={ground:can(raw,user,'ground')?clone(src.ground||[]):[],work:can(raw,user,'work')?clone((src.work||[]).filter(r=>activities.includes(r.activity)&&(user.role!=='contribuinte'||r.workerId===user.id))):[],payPolicies:can(raw,user,'pay')?clone(src.payPolicies||[]):[],machinePolicies:can(raw,user,'pay')?clone(src.machinePolicies||[]):[]};}
    return full;
  }
  return{can,init,apply,project,preserve,groundStats,machineRate,report,requireActivities};
});
