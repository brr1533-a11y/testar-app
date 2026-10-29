/* Regras da operação, compartilhadas pelo navegador e servidor. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./rural-domain.js'):root.RuralDomain);if(typeof module==='object'&&module.exports)module.exports=api;else root.RuralOps=api;})(globalThis,function(D){
 'use strict';
 const cents=v=>Math.round((Number(v)+Number.EPSILON)*100),money=v=>cents(v)/100;
 const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode});};
 const check=(ok,msg)=>{if(!ok)fail(msg);};
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const keys=['expenses','tasks','stockUses','payments','cattleMoves','deliveries','dryingLogs','dryingGuidelines'];
 const COC_PRICES=[1680,1670,1660,1660,1610,1392,1360,1345,1187,1152,1095,992,685,685,565,445];
 function defaultQualities(){return [{id:'special',name:'Especial',rank:0,bagKg:60,pricePerBag:null,active:true},...COC_PRICES.map((price,i)=>({id:'coc'+String(i+1).padStart(2,'0'),name:'COC '+String(i+1).padStart(2,'0'),rank:i+1,bagKg:60,pricePerBag:price,active:true}))];}
 const defaultStages=()=>['Bezerros','Recria','Engorda','Reprodução','Terminação'].map((name,i)=>({id:'stage'+i,name,active:true}));
 function composition(farms,cycles,qualities){
  const selected=new Set(cycles.map(r=>r.farm.id+'|'+r.cycle.id));let total=0,gradedKg=0,rankKg=0,humidKg=0,humidSum=0;
  const groups=new Map();
  for(const f of farms)for(const h of f.agriculture?.harvests||[]){if(!selected.has(f.id+'|'+h.cycleId))continue;const c=f.agriculture.cycles.find(c=>c.id===h.cycleId);total+=h.netKg;
   let id,label,rank;
   if(c.activity==='coffee'){const q=qualities.find(q=>q.id===h.qualityId);id=q?.id||'unknown';label=q?.name||'Não classificado';rank=q?.rank;if(Number.isFinite(rank)){gradedKg+=h.netKg;rankKg+=rank*h.netKg;}}
   else {const v=h.moisture;id=v==null?'unknown':String(v);label=v==null?'Umidade não informada':Number(v).toLocaleString('pt-BR')+'% de umidade';rank=v;if(Number.isFinite(v)){humidKg+=h.netKg;humidSum+=v*h.netKg;}}
   const row=groups.get(id)||{id,label,rank,kg:0};row.kg+=h.netKg;groups.set(id,row);
  }
  return {total,gradedKg,humidKg,meanRank:gradedKg?rankKg/gradedKg:null,meanMoisture:humidKg?humidSum/humidKg:null,groups:[...groups.values()].sort((a,b)=>(a.rank??Infinity)-(b.rank??Infinity)).map(g=>({...g,percent:total?g.kg/total*100:0}))};
 }
 function estimate(f,c,qualities){
  const stats=D.cycleStats(f,c);let pricedKg=0,gross=0;
  for(const h of f.agriculture?.harvests||[])if(h.cycleId===c.id){const price=c.activity==='coffee'?qualities.find(q=>q.id===h.qualityId)?.pricePerBag:c.quotePerBag;if(Number.isFinite(price)&&price>0){pricedKg+=h.netKg;gross+=h.netKg/(c.activity==='coffee'?(qualities.find(q=>q.id===h.qualityId)?.bagKg||60):c.bagKg)*price;}}
  // Estoque não é alocado por qualidade nas vendas atuais; saldo estimado usa a média ponderada do colhido precificado.
  const averagePerKg=pricedKg?gross/pricedKg:null,remainingValue=averagePerKg===null||pricedKg!==stats.harvestedKg?null:stats.availableKg*averagePerKg,cost=costs(f,c.activity,c.id);
  return {pricedKg,totalKg:stats.harvestedKg,averagePerBag:averagePerKg===null?null:averagePerKg*c.bagKg,remainingValue,cost,soldRevenue:stats.revenue,estimatedResult:remainingValue===null?null:money(stats.revenue+remainingValue-cost),complete:pricedKg===stats.harvestedKg&&stats.harvestedKg>0};
 }
 function lotEstimate(f,l){const latest=D.latestWeighings(f).get(String(l.id));if(!latest||!(l.quotePerArroba>0))return null;const factor=l.valuationBasis==='live'?1:l.valuationBasis==='carcass'&&l.carcassYieldPct>0?l.carcassYieldPct/100:null;if(factor===null)return null;const arrobas=latest.avgKg*l.heads*factor/15,gross=arrobas*l.quotePerArroba,cost=costs(f,'cattle',l.id);return {arrobas,gross:money(gross),cost,result:money(gross-cost),weightDate:latest.date};}
 function init(f){f.operations||={};for(const k of keys)f.operations[k]||=[];D.farmData(f);return f.operations;}
 const plotIds=c=>[...new Set(c?.plotIds?.length?c.plotIds:c?.plotId?[c.plotId]:[])];
 const campaign=c=>c.campaign||String(c.startDate||'').slice(0,4);
 function saleBagKg(farm,sale){const value=sale.bagKg??farm.agriculture?.cycles?.find(c=>c.id===sale.cycleId)?.bagKg;return Number.isFinite(value)&&value>0?value:60;}
 function progress(farms,activity,period){
  let total=0,done=0;
  for(const f of farms){
   const plots=new Set((f.talhoes||[]).map(p=>p.id));total+=plots.size;
   const cycles=new Map((f.agriculture?.cycles||[]).filter(c=>c.activity===activity&&campaign(c)===period).map(c=>[c.id,c]));
   const completed=new Set();
   for(const h of f.agriculture?.harvests||[]){const c=cycles.get(h.cycleId);if(!c||!h.finishesPlot)continue;const id=h.plotId||(plotIds(c).length===1?plotIds(c)[0]:null);if(plots.has(id))completed.add(id);}
   done+=completed.size;
  }
  return {total,done,percent:total?Math.min(100,done/total*100):0};
 }
 function costs(f,activity,targetId){
  const op=f.operations||{},match=r=>r.activity===activity&&!r.voided&&(!targetId||(activity==='cattle'?r.lotId:r.cycleId)===targetId);
  return money((op.expenses||[]).filter(match).reduce((n,e)=>n+e.amount,0)+(op.stockUses||[]).filter(match).reduce((n,e)=>n+(e.cost||0),0));
 }
 function schedule(total,count,firstDate){
  check(Number.isInteger(count)&&count>=1&&count<=24&&D.validDate(firstDate),'Confira a quantidade de parcelas (1 a 24) e o primeiro vencimento.');
  const amount=cents(total);check(amount>=count,'O valor da venda é insuficiente para as parcelas.');
  const day=Number(firstDate.slice(8)),year=Number(firstDate.slice(0,4)),month=Number(firstDate.slice(5,7))-1;
  return Array.from({length:count},(_,i)=>{const last=new Date(Date.UTC(year,month+i+1,0)),d=new Date(Date.UTC(last.getUTCFullYear(),last.getUTCMonth(),Math.min(day,last.getUTCDate())));return {id:'p'+(i+1),date:d.toISOString().slice(0,10),amount:(Math.floor(amount/count)+(i<amount%count?1:0))/100};});
 }
 function receivables(f){
  return (f.agriculture?.sales||[]).flatMap(s=>(s.installments||[]).map(p=>{const paid=money((f.operations?.payments||[]).filter(r=>r.saleId===s.id&&r.installmentId===p.id).reduce((n,r)=>n+r.amount,0));return {sale:s,...p,paid,balance:money(p.amount-paid)};}));
 }
 function applyMove(f,m){
  const lots=f.cattle?.lots||[],source=lots.find(l=>l.id===m.lotId);check(source&&!source.archived,'Selecione um lote ativo.');
  check(D.validDate(m.date)&&m.date<=new Date().toISOString().slice(0,10),'Data da movimentação inválida.');
  check(['purchase','sale','death','transfer','relocate'].includes(m.kind),'Movimentação inválida.');
  if(m.kind==='relocate'){
   check(!m.paddockId||(f.cattle.paddocks||[]).some(p=>p.id===m.paddockId),'Piquete não encontrado.');
   m.fromPaddockId=source.paddockId||'';source.paddockId=m.paddockId||'';source.piquete=(f.cattle.paddocks||[]).find(p=>p.id===m.paddockId)?.name||'';return;
  }
  check(Number.isInteger(m.heads)&&m.heads>0,'Informe um número inteiro positivo de cabeças.');
  if(m.kind!=='purchase')check(source.heads>=m.heads,'A saída supera as cabeças do lote.');
  if(m.kind==='transfer'){
   const target=lots.find(l=>l.id===m.targetLotId&&!l.archived);check(target&&target.id!==source.id,'Escolha outro lote ativo na mesma fazenda.');target.heads+=m.heads;
  }
  source.heads+=m.kind==='purchase'?m.heads:-m.heads;
 }
 function validate(state){
  const quality=state.coffeeQualities||defaultQualities();check(Array.isArray(quality)&&quality.length<=100,'Lista de qualidades inválida.');
  const names=new Set(),qids=new Set();for(const q of quality){check(q&&typeof q.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(q.id)&&!qids.has(q.id)&&typeof q.name==='string'&&q.name.trim()&&q.name.length<=80&&!names.has(q.name.trim().toLocaleLowerCase('pt-BR')),'Use nomes de qualidade únicos, de até 80 caracteres.');qids.add(q.id);names.add(q.name.trim().toLocaleLowerCase('pt-BR'));}
  for(const q of quality)check((q.rank==null||Number.isFinite(q.rank)&&q.rank>=0&&q.rank<=16)&&(q.pricePerBag==null||Number.isFinite(q.pricePerBag)&&q.pricePerBag>0)&&(q.bagKg==null||Number.isFinite(q.bagKg)&&q.bagKg>0),'Índice ou preço de qualidade inválido.');
  for(const q of quality){if(q.id==='special')check(q.rank===0,'Especial mantém índice 0, acima de COC 01.');if(/^coc(0[1-9]|1[0-6])$/.test(q.id))check(q.rank===Number(q.id.slice(3)),'A ordem de COC 01 a COC 16 é fixa.');}
  const stages=state.cattleStages||defaultStages();check(Array.isArray(stages)&&stages.length<=100&&new Set(stages.map(s=>s.id)).size===stages.length&&stages.every(s=>typeof s.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(s.id)&&typeof s.name==='string'&&s.name.trim()&&s.name.length<=80),'Etapas do gado inválidas.');
  for(const f of state.farms||[]){
   const op=init(f),cycles=new Map(f.agriculture.cycles.map(c=>[c.id,c])),lots=new Map((f.cattle.lots||[]).map(l=>[l.id,l]));
   for(const k of keys){check(Array.isArray(op[k])&&op[k].length<=20000,'Lista da operação inválida.');const ids=new Set();for(const r of op[k]){check(r&&typeof r.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(r.id)&&!ids.has(r.id),'Identificação da operação inválida ou repetida.');ids.add(r.id);check(D.ACTIVITIES.includes(r.activity)&&D.validDate(r.date),'Atividade ou data da operação inválida.');if(r.cycleId)check(cycles.get(r.cycleId)?.activity===r.activity,'Vincule uma safra da atividade selecionada.');if(r.lotId)check(r.activity==='cattle'&&lots.has(r.lotId),'Lote da operação não encontrado.');}}
   for(const r of op.expenses)check(typeof r.description==='string'&&r.description.trim()&&Number.isFinite(r.amount)&&r.amount>0,'Confira a descrição e o valor do custo.');
   for(const r of op.tasks)check(typeof r.title==='string'&&r.title.trim()&&r.title.length<=160&&['pending','done'].includes(r.status)&&(!r.completedDate||D.validDate(r.completedDate)&&r.completedDate<=new Date().toISOString().slice(0,10)),'Tarefa inválida.');
   for(const r of [...op.dryingLogs,...op.dryingGuidelines]){check(r.activity==='coffee'&&cycles.get(r.cycleId)?.activity==='coffee'&&r.date<=new Date().toISOString().slice(0,10),'Safra ou data do terreiro inválida.');check(typeof r.notes==='string'&&r.notes.trim()&&r.notes.length<=2500,'Descreva o manejo ou orientação (até 2500 caracteres).');for(const k of ['temperatureC','minTempC','maxTempC'])check(r[k]==null||Number.isFinite(r[k]),'Temperatura inválida.');check(r.minTempC==null||r.maxTempC==null||r.minTempC<=r.maxTempC,'A temperatura mínima deve ser menor ou igual à máxima.');}
   for(const r of op.dryingLogs)check(['Limpeza','Secagem','Revolvimento','Entrada no terreiro','Saída do terreiro','Inspeção'].includes(r.kind),'Tipo de manejo do terreiro inválido.');
   for(const c of cycles.values()){
    check(!c.campaign||typeof c.campaign==='string'&&c.campaign.length<=40,'Período da safra inválido.');
    check(plotIds(c).every(id=>(f.talhoes||[]).some(p=>p.id===id)),'Talhão da safra não encontrado.');
    check(c.quotePerBag==null||Number.isFinite(c.quotePerBag)&&c.quotePerBag>0,'Cotação da safra inválida.');
   }
   for(const h of f.agriculture.harvests){const c=cycles.get(h.cycleId);check(!h.plotId||plotIds(c).includes(h.plotId),'A colheita deve usar um talhão vinculado à safra.');check(!h.finishesPlot||!!(h.plotId||plotIds(c).length===1),'Escolha o talhão cuja colheita foi concluída.');check(!h.qualityId||c.activity==='coffee'&&qids.has(h.qualityId),'Qualidade de café não cadastrada pelo CEO.');}
   for(const s of f.agriculture.sales)check(s.bagKg==null||Number.isFinite(s.bagKg)&&s.bagKg>0,'Peso da saca da venda inválido.');
   for(const s of f.agriculture.sales)if(s.installments){check(Array.isArray(s.installments)&&s.installments.length>0&&s.installments.length<=24,'Parcelamento inválido.');const ids=new Set();let sum=0;for(const p of s.installments){check(p&&typeof p.id==='string'&&!ids.has(p.id)&&D.validDate(p.date)&&p.date>=s.date&&Number.isFinite(p.amount)&&p.amount>0&&Math.abs(cents(p.amount)-p.amount*100)<0.000001,'Parcela inválida.');ids.add(p.id);sum+=cents(p.amount);}if(s.pricePerKg!==undefined)check(sum===cents(s.kg*s.pricePerKg),'As parcelas devem somar o valor da venda.');}
   for(const e of op.deliveries){const s=f.agriculture.sales.find(s=>s.id===e.saleId);check(s&&cycles.get(s.cycleId)?.activity===e.activity&&e.date>=s.date&&e.date<=new Date().toISOString().slice(0,10)&&Number.isFinite(e.kg)&&e.kg>0,'Confira a venda, data e peso da entrega.');check(op.deliveries.filter(r=>r.saleId===s.id).reduce((n,r)=>n+r.kg,0)<=s.kg+0.000001,'A entrega supera a quantidade da venda.');}
   for(const l of lots.values()){check(Number.isInteger(l.heads)&&l.heads>=0,'Cabeças do lote devem ser um inteiro não negativo.');check(!l.stageId||stages.some(s=>s.id===l.stageId),'Etapa do lote não cadastrada pelo CEO.');check(l.quotePerArroba==null||Number.isFinite(l.quotePerArroba)&&l.quotePerArroba>0,'Cotação de arroba inválida.');check(l.carcassYieldPct==null||Number.isFinite(l.carcassYieldPct)&&l.carcassYieldPct>0&&l.carcassYieldPct<=100,'Rendimento informado deve estar entre 0 e 100%.');check(!l.valuationBasis||['live','carcass'].includes(l.valuationBasis),'Base da avaliação inválida.');}
  }
  return state;
 }
 function immutable(oldRows,newRows,label){for(const r of oldRows)check(newRows.some(n=>n.id===r.id&&same(n,r)),label+' já registrado não pode ser apagado ou reescrito.');}
 function prepare(before,after,user,now=new Date().toISOString()){
  const oldQuality=before.coffeeQualities||defaultQualities();after.coffeeQualities??=JSON.parse(JSON.stringify(oldQuality));
  if(user.role!=='ceo')after.coffeeQualities=JSON.parse(JSON.stringify(oldQuality));
  else for(const q of oldQuality)check((after.coffeeQualities||[]).some(n=>n.id===q.id&&n.name===q.name),'Desative uma qualidade já cadastrada para preservar os registros; o nome não pode ser apagado ou alterado.');
  const oldStages=before.cattleStages||defaultStages();after.cattleStages??=JSON.parse(JSON.stringify(oldStages));if(user.role!=='ceo')after.cattleStages=JSON.parse(JSON.stringify(oldStages));else for(const s of oldStages)check(after.cattleStages.some(n=>n.id===s.id&&n.name===s.name),'Desative etapas utilizadas em vez de apagá-las ou renomeá-las.');
  for(const f of after.farms||[]){
   const prior=(before.farms||[]).find(x=>x.id===f.id)||{},old=init(prior),op=init(f);
   if(user.role!=='ceo'&&!user.canReceive)op.payments=JSON.parse(JSON.stringify(old.payments));
   for(const k of ['payments','stockUses','cattleMoves','deliveries','dryingLogs','dryingGuidelines'])immutable(old[k],op[k],k==='payments'?'Recebimento':k==='stockUses'?'Consumo de estoque':k==='deliveries'?'Entrega':k.startsWith('drying')?'Registro do terreiro':'Movimentação do gado');
   for(const c of prior.agriculture.cycles)check(f.agriculture.cycles.some(n=>n.id===c.id),'Arquive a safra para preservar seu histórico.');
   for(const l of prior.cattle.lots||[])check((f.cattle.lots||[]).some(n=>n.id===l.id),'Arquive o lote para preservar suas pesagens.');
   for(const h of f.agriculture.harvests){const existing=prior.agriculture.harvests.find(x=>x.id===h.id);if(h.qualityId){const q=(after.coffeeQualities||[]).find(x=>x.id===h.qualityId);check(q&&(existing?.qualityId===h.qualityId||q.active!==false),'Selecione uma qualidade ativa definida pelo CEO.');h.qualityName=existing?.qualityId===h.qualityId?existing.qualityName||q.name:q.name;}else delete h.qualityName;}
   for(const s of prior.agriculture.sales){const next=f.agriculture.sales.find(n=>n.id===s.id);if(old.payments.some(p=>p.saleId===s.id)||old.deliveries.some(d=>d.saleId===s.id))check(next&&same(s,next),'Uma venda com recebimentos ou entregas não pode ser apagada ou alterada.');}
   for(const use of op.stockUses.filter(r=>!old.stockUses.some(o=>o.id===r.id))){
    const item=(f.stock||[]).find(i=>i.id===use.stockId&&(i.activity||'coffee')===use.activity);check(item&&Number.isFinite(use.quantity)&&use.quantity>0&&Number.isFinite(Number(item.unitCost||0))&&Number(item.unitCost||0)>=0,'Item ou quantidade do consumo inválidos.');check(use.date<=now.slice(0,10),'Consumo não pode ter data futura.');
    if(use.procedureId){const p=(f.plotProcedures||[]).find(p=>p.id===use.procedureId&&p.activity===use.activity&&!p.voided);check(p,'Procedimento do consumo não encontrado.');if(use.cycleId)check(plotIds(f.agriculture.cycles.find(c=>c.id===use.cycleId)).includes(p.plotId),'Procedimento e safra devem compartilhar o talhão.');}
    check(Number(item.quantity)>=use.quantity,'Estoque insuficiente para registrar o consumo.');
    item.quantity=Math.round((item.quantity-use.quantity)*1000)/1000;
    use.cost=money(use.quantity*Number(item.unitCost||0));use.itemName=item.item;use.unit=item.unit;use.recordedBy=user.name||user.username;use.createdAt=now;
    item.moves||=[];item.moves.push({id:use.id,at:now,delta:-use.quantity,reason:'Consumo vinculado: '+use.reason,by:use.recordedBy});
   }
   for(const move of op.cattleMoves.filter(r=>!old.cattleMoves.some(o=>o.id===r.id))){
    const previous=old.cattleMoves.filter(m=>m.lotId===move.lotId||m.targetLotId===move.lotId||(move.targetLotId&&(m.lotId===move.targetLotId||m.targetLotId===move.targetLotId)));
    check(!previous.some(m=>m.date>move.date),'Registre a movimentação a partir da última movimentação dos lotes envolvidos.');
    // O estado enviado só descreve a intenção; o saldo é calculado sobre a versão persistida.
    if(!f.__moveBase){for(const l of f.cattle.lots||[]){const p=(prior.cattle.lots||[]).find(x=>x.id===l.id);if(p){l.heads=p.heads;l.paddockId=p.paddockId;l.piquete=p.piquete;}}f.__moveBase=true;}
    applyMove(f,move);move.recordedBy=user.name||user.username;move.createdAt=now;
   }
   delete f.__moveBase;
   for(const l of f.cattle.lots||[]){const p=(prior.cattle.lots||[]).find(x=>x.id===l.id);const moved=op.cattleMoves.some(m=>!old.cattleMoves.some(o=>o.id===m.id)&&(m.lotId===l.id||m.targetLotId===l.id));if(p&&!moved){check(l.heads===p.heads,'Use Movimentações para alterar as cabeças do lote.');if(l.paddockId!==p.paddockId){const m={id:'location_'+l.id+'_'+Date.parse(now),activity:'cattle',date:now.slice(0,10),kind:'relocate',lotId:l.id,paddockId:l.paddockId||'',fromPaddockId:p.paddockId||'',createdAt:now,recordedBy:user.name||user.username};op.cattleMoves.push(m);}}check(!l.archived||l.heads===0,'Movimente a saída dos animais antes de arquivar o lote.');}
   for(const pay of op.payments.filter(r=>!old.payments.some(o=>o.id===r.id))){
    check(user.role==='ceo'||user.canReceive,'Somente o CEO (ou o ADM com Contas a receber liberada) registra recebimentos.');
    const due=receivables(f).find(r=>r.sale.id===pay.saleId&&r.id===pay.installmentId);check(due&&Number.isFinite(pay.amount)&&pay.amount>0,'Parcela ou recebimento inválido.');
    check(pay.date>=due.sale.date&&pay.date<=now.slice(0,10),'Data do recebimento inválida.');
    // receivables já inclui este pagamento; saldo negativo significa recebimento excedente.
    check(due.balance>=0&&Math.abs(cents(pay.amount)-pay.amount*100)<0.000001,'O recebimento supera o saldo da parcela ou contém frações de centavo.');
    const cycle=f.agriculture.cycles.find(c=>c.id===due.sale.cycleId);check(pay.activity===cycle.activity,'Atividade do recebimento inválida.');pay.createdAt=now;pay.recordedBy=user.name||user.username;
    f.finances||=[];const id='receipt_'+pay.id;check(!f.finances.some(x=>x.id===id),'Recebimento duplicado.');f.finances.push({id,activity:cycle.activity,type:'entrada',category:'Recebimento de produção',description:due.sale.buyer+' · '+cycle.name+' · '+due.id,date:pay.date,value:pay.amount,sourcePaymentId:pay.id,createdBy:pay.recordedBy,createdAt:now});
   }
   for(const pay of old.payments){const id='receipt_'+pay.id,original=(prior.finances||[]).find(x=>x.id===id);if(original){const index=(f.finances||[]).findIndex(x=>x.id===id);if(index<0)f.finances.push(original);else f.finances[index]=original;}}
   for(const row of op.deliveries.filter(r=>!old.deliveries.some(p=>p.id===r.id))){row.recordedBy=user.name||user.username;row.createdAt=now;}
   for(const key of ['dryingLogs','dryingGuidelines'])for(const row of op[key].filter(r=>!old[key].some(p=>p.id===r.id))){check(['ceo','adm'].includes(user.role),'Somente CEO e ADM podem registrar o manejo e as orientações do terreiro.');row.recordedBy=user.name||user.username;row.createdAt=now;}
  }
  for(const f of before.farms||[])if(!after.farms?.some(n=>n.id===f.id)&&((f.agriculture?.cycles||[]).length||(f.cattle?.lots||[]).length||keys.some(k=>(f.operations?.[k]||[]).length)))fail('A fazenda possui produção ou histórico. Preserve seus registros.',403);
  validate(after);
 }
 return {init,plotIds,campaign,saleBagKg,progress,costs,schedule,receivables,applyMove,validate,prepare,defaultQualities,defaultStages,composition,estimate,lotEstimate};
});
