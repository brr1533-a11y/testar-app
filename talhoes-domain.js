(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PlotHistory=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const TYPES=['Preparo do solo','Plantio','Adubação','Aplicação','Roçada','Poda','Irrigação','Colheita','Inspeção','Outro'];
 const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode});};
 function matches(farm,row,plot){
  if(Array.isArray(row.talhaoIds)&&row.talhaoIds.length)return row.talhaoIds.includes(plot.id);
  return (row.talhaoNames||[]).includes(plot.name)&&(farm.talhoes||[]).filter(p=>p.name===plot.name).length===1;
 }
 function events(farm,plotId,activity){
  const plot=(farm.talhoes||[]).find(p=>p.id===plotId);if(!plot)return [];
  const rows=[];
  for(const a of farm.soilAnalyses||[])if(a.plotId===plotId&&(!activity||a.activity===activity))rows.push({id:'analysis-'+a.id,plotId,activity:a.activity,date:a.date,createdAt:a.createdAt||'',type:'Inspeção',title:(a.kind==='soil'?'Análise de solo':'Análise foliar')+' · '+a.sample,responsible:a.createdBy||'Equipe',inputs:a.crop,notes:a.notes||'',source:'analysis',origin:'Laudo laboratorial',status:a.archived?'Arquivada':'Registrada'});
  for(const p of farm.plotProcedures||[])if(p.plotId===plotId&&(!activity||p.activity===activity))rows.push({...p,source:'manual',origin:'Registro manual',status:p.voided?'Anulado':'Realizado'});
  for(const log of farm.equipmentLogs||[]){
   const module=log.activityModule||'coffee';
   if((activity&&module!==activity)||!matches(farm,log,plot))continue;
   rows.push({id:'work-'+log.id,plotId,activity:module,date:log.date||String(log.loggedAt||'').slice(0,10),createdAt:log.loggedAt||'',type:'Trabalho da equipe',title:log.activity||'Trabalho registrado',responsible:log.userName||log.user||'Não informado',inputs:[log.tractorName,log.implementName].filter(Boolean).join(' · '),notes:log.notes||'',source:'work',origin:'Log de equipamentos',status:'Trabalho registrado'});
  }
  if(!activity||activity==='coffee')for(const order of farm.banho?.orders||[]){
   if(order.status!=='completed'||!matches(farm,order,plot))continue;
   rows.push({id:'bath-'+order.id,plotId,activity:'coffee',date:String(order.completedAt||order.date||'').slice(0,10),createdAt:order.completedAt||'',type:'Aplicação',title:order.title||'Aplicação concluída',responsible:order.completedByName||order.completedBy||'Não informado',inputs:(order.products||[]).map(p=>[p.name,p.quantity,p.unit].filter(v=>v!==undefined&&v!=='').join(' ')).join(' · '),notes:order.notes||'',source:'application',origin:'Ordem de aplicação concluída',status:'Concluído'});
  }
  const cycles=new Map((farm.agriculture?.cycles||[]).filter(c=>(c.plotId===plotId||(c.plotIds||[]).includes(plotId))&&(!activity||c.activity===activity)).map(c=>[c.id,c]));
  for(const h of farm.agriculture?.harvests||[]){
   const cycle=cycles.get(h.cycleId);if(!cycle||(h.plotId&&h.plotId!==plotId))continue;
   rows.push({id:'harvest-'+h.id,plotId,activity:cycle.activity,date:h.date,createdAt:h.createdAt||'',type:'Colheita',title:'Colheita · '+cycle.name,responsible:h.recordedByName||h.recordedBy||'Não informado',inputs:Number(h.netKg||0).toLocaleString('pt-BR')+' kg líquidos',notes:[h.storage,h.notes].filter(Boolean).join(' · '),source:'harvest',origin:'Produção da safra',status:'Registrado'});
  }
  return rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||''))||a.id.localeCompare(b.id));
 }
 function hasReferences(farm,plotId){
  const plot=(farm.talhoes||[]).find(p=>p.id===plotId);if(!plot)return false;
  return (farm.soilAnalyses||[]).some(a=>a.plotId===plotId)||(farm.plotProcedures||[]).some(p=>p.plotId===plotId)||(farm.equipmentLogs||[]).some(log=>matches(farm,log,plot))||(farm.banho?.orders||[]).some(o=>matches(farm,o,plot))||(farm.agriculture?.cycles||[]).some(c=>c.plotId===plotId);
 }
 function validateFarm(farm){
  if(farm.plotProcedures===undefined)return;
  if(!Array.isArray(farm.plotProcedures))fail('Histórico de procedimentos inválido.');
  const ids=new Set();
  for(const p of farm.plotProcedures){
   if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)||ids.has(p.id))fail('Identificação do procedimento inválida ou repetida.');ids.add(p.id);
   if(!(farm.talhoes||[]).some(t=>t.id===p.plotId))fail('O talhão do procedimento não existe nesta fazenda.');
   if(!['coffee','grains'].includes(p.activity)||!TYPES.includes(p.type))fail('Atividade ou tipo de procedimento inválido.');
   if(typeof p.title!=='string'||!p.title.trim()||p.title.length>160)fail('Descreva o procedimento em até 160 caracteres.');
   if(!validDate(p.date)||p.date>new Date().toISOString().slice(0,10))fail('Informe uma data válida, até hoje, para o procedimento realizado.');
   if(typeof p.responsible!=='string'||!p.responsible.trim()||p.responsible.length>160)fail('Informe o responsável pelo procedimento.');
   for(const k of ['notes','inputs'])if(p[k]!==undefined&&(typeof p[k]!=='string'||p[k].length>2000))fail('Observações e insumos devem ter até 2.000 caracteres.');
   if(p.voided&&(typeof p.voidReason!=='string'||p.voidReason.trim().length<3||p.voidReason.length>500))fail('Informe o motivo da anulação.');
  }
 }
 function sealAndValidate(before,after,user,now=new Date().toISOString()){
  for(const farm of after.farms||[]){
   const old=(before.farms||[]).find(f=>f.id===farm.id);
   const prior=new Map((old?.plotProcedures||[]).map(p=>[p.id,p]));
   const next=new Map((farm.plotProcedures||[]).map(p=>[p.id,p]));
   for(const [id,p] of prior){
    const n=next.get(id);if(!n)fail('Procedimentos registrados não podem ser apagados. Use a anulação com motivo.',403);
    const excluded=new Set(['voided','voidReason','voidedAt','voidedBy']);
    const fields=[...new Set([...Object.keys(p),...Object.keys(n)])].filter(k=>!excluded.has(k));
    if(fields.some(k=>JSON.stringify(p[k])!==JSON.stringify(n[k])))fail('Um procedimento registrado não pode ser reescrito. Anule e crie um novo registro.',403);
    if(p.voided){if([...excluded].some(k=>p[k]!==n[k]))fail('A anulação já registrada deve ser preservada.',403);}
    else if(n.voided){n.voidedAt=now;n.voidedBy=user.username;}
    else if(n.voidReason||n.voidedAt||n.voidedBy)fail('Uma anulação precisa ter motivo e status.',400);
   }
   for(const [id,p] of next)if(!prior.has(id)){
    if(!['ceo','adm'].includes(user.role))fail('Somente CEO e ADM podem registrar procedimentos.',403);
    if(p.voided)fail('Um procedimento novo não pode nascer anulado.');
    delete p.voidReason;delete p.voidedAt;delete p.voidedBy;
    p.recordedBy=user.username;p.recordedByName=user.name||user.username;p.createdAt=now;
   }
   validateFarm(farm);
  }
  for(const farm of before.farms||[])if((farm.plotProcedures||[]).length&&!(after.farms||[]).some(f=>f.id===farm.id))fail('A fazenda tem procedimentos registrados. Preserve o histórico antes de excluir.',403);
 }
 return {TYPES,events,hasReferences,validateFarm,sealAndValidate};
});
