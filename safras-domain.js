(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SeasonHistory=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // O cliente não grava o diário: o servidor compara as versões salvas.
 function recordChanges(before,after,user,now=new Date().toISOString()){
  for(const farm of after.farms||[]){
   const old=(before.farms||[]).find(f=>f.id===farm.id)?.agriculture||{};
   const a=farm.agriculture;if(!a)continue;
   a.history=JSON.parse(JSON.stringify(old.history||[]));
   const append=(cycle,type,title,notes='')=>a.history.push({id:now+'-'+a.history.length,cycleId:cycle.id,activity:cycle.activity,date:now.slice(0,10),createdAt:now,type,title,notes,responsible:user.name||user.username});
   for(const cycle of a.cycles||[]){
    const prior=(old.cycles||[]).find(c=>c.id===cycle.id);
    if(!prior)append(cycle,'Cadastro','Safra cadastrada',cycle.name+' · '+cycle.stage);
    else {
     if(prior.stage!==cycle.stage)append(cycle,'Etapa','Etapa alterada',prior.stage+' → '+cycle.stage);
     const fields=['name','crop','plotId','variety','areaHa','bagKg','plannedCost','startDate','expectedDate','notes','campaign','plotIds','archived'];
     if(fields.some(k=>JSON.stringify(prior[k])!==JSON.stringify(cycle[k])))append(cycle,'Cadastro','Cadastro da safra atualizado');
    }
   }
   for(const h of a.harvests||[]){const p=(old.harvests||[]).find(p=>p.id===h.id),cycle=(a.cycles||[]).find(c=>c.id===h.cycleId);if(p&&cycle&&(p.qualityId!==h.qualityId||p.moisture!==h.moisture))append(cycle,'Classificação','Classificação da colheita atualizada',cycle.activity==='coffee'?(p.qualityName||'Não classificado')+' → '+(h.qualityName||'Não classificado'):'Umidade: '+(p.moisture??'Não informada')+'% → '+(h.moisture??'Não informada')+'%');}
   for(const kind of ['harvests','sales'])for(const row of old[kind]||[]){
    if((a[kind]||[]).some(r=>r.id===row.id))continue;
    const cycle=(old.cycles||[]).find(c=>c.id===row.cycleId);
    if(cycle)append(cycle,'Exclusão',kind==='harvests'?'Colheita excluída':'Venda excluída',row.date+' · '+(row.netKg??row.kg)+' kg');
   }
  }
 }
 function events(farm,cycle,plotEvents=[],today=new Date().toISOString().slice(0,10)){
  const a=farm.agriculture||{},rows=(a.history||[]).filter(e=>e.cycleId===cycle.id&&e.activity===cycle.activity).map(e=>({...e,source:'Diário da safra'}));
  if(!rows.some(e=>e.type==='Cadastro'&&e.title==='Safra cadastrada'))rows.push({id:'legacy-'+cycle.id,date:String(cycle.createdAt||cycle.startDate).slice(0,10),type:'Cadastro',title:'Safra cadastrada',notes:'Registro anterior ao diário de alterações; etapas antigas não foram reconstruídas.',source:'Cadastro existente'});
  for(const kind of ['harvests','sales'])for(const r of a[kind]||[])if(r.cycleId===cycle.id)rows.push({id:kind+'-'+r.id,date:r.date,createdAt:r.createdAt,type:kind==='harvests'?'Colheita':'Venda',title:kind==='harvests'?'Colheita registrada':'Venda registrada',notes:(r.netKg??r.kg)+' kg · '+(kind==='harvests'?[r.storage,r.notes]:[r.buyer,r.notes]).filter(Boolean).join(' · '),responsible:r.recordedByName||r.recordedBy,source:'Produção da safra'});
  for(const key of ['dryingLogs','dryingGuidelines'])for(const e of farm.operations?.[key]||[])if(e.cycleId===cycle.id)rows.push({...e,id:key+'-'+e.id,type:'Terreiro',title:key==='dryingLogs'?e.kind:'Orientação do CEO / ADM',source:'Terreirão da safra',responsible:e.recordedBy});
  // Não atribuir procedimentos de outros anos nem colheitas de outras safras.
  const closed=cycle.stage==='Encerrada'?rows.filter(e=>e.type==='Etapa'&&e.notes?.endsWith('→ Encerrada')).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]?.date:null;
  for(const e of plotEvents)if(e.source!=='harvest'&&e.date>=cycle.startDate&&e.date<=(closed||today))rows.push({...e,id:'plot-'+e.id,type:'Talhão',title:e.title+(e.voided?' · Anulado':''),notes:[e.inputs,e.notes,e.voidReason].filter(Boolean).join(' · '),source:'Talhão vinculado · '+e.origin});
  return rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||''))||a.id.localeCompare(b.id));
 }
 return {recordChanges,events};
});
