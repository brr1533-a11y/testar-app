/* Melhorias 2027: parceria/meação, Funrural, financiamentos, fluxo de caixa projetado, arrendamentos, prestadores,
   animais individuais, indicadores do leite, módulos ativos e comparação anônima. Regras compartilhadas pelo navegador
   e pelo servidor. Os registros usam o mesmo mecanismo das etapas 3–8 (farm.expansion), com validação, histórico e
   permissão por página. Cálculos que precisam de custos recebem a API de RuralExpansion (X) como parâmetro. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./rural-domain'):root.RuralDomain);if(typeof module==='object'&&module.exports)module.exports=api;else root.RuralMelhorias=api;})(globalThis,function(D){
'use strict';
const num=x=>typeof x==='number'&&Number.isFinite(x),round=(x,n=2)=>Math.round((x+Number.EPSILON)*10**n)/10**n;
const check=(ok,message)=>{if(!ok)throw Object.assign(new Error(message),{statusCode:422});};
const today=()=>new Date().toISOString().slice(0,10),days=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/86400000);
const active=(f,key)=>(f.expansion?.[key]||[]).filter(r=>!r.archived);
const addDays=(iso,n)=>new Date(Date.parse(iso)+n*86400000).toISOString().slice(0,10);
// Soma meses mantendo o dia (ou o último dia do mês, quando ele não existe).
function addMonths(iso,n){const y=Number(iso.slice(0,4)),m=Number(iso.slice(5,7))-1+n,d=Number(iso.slice(8,10)),last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return new Date(Date.UTC(y,m,Math.min(d,last))).toISOString().slice(0,10);}
const month=iso=>iso.slice(0,7);

const PAGES=[
 {id:'resumo-dono',name:'Resumo do dono',group:'Início',finance:true},
 {id:'parcerias',name:'Parceria e meação',group:'Lavoura',activity:'coffee',finance:true},
 {id:'arrendamentos',name:'Arrendamentos',group:'Financeiro e fiscal',finance:true},
 {id:'prestadores',name:'Prestadores terceirizados',group:'Financeiro e fiscal',finance:true},
 {id:'animais',name:'Animais individuais',group:'Pecuária',activity:'cattle'},
 {id:'funrural',name:'Funrural e Senar',group:'Financeiro e fiscal',finance:true},
 {id:'financiamentos',name:'Financiamentos e dívidas',group:'Financeiro e fiscal',finance:true},
 {id:'fluxo-caixa',name:'Fluxo de caixa projetado',group:'Financeiro e fiscal',finance:true},
 {id:'relatorio-credito',name:'Relatório para crédito',group:'Financeiro e fiscal',finance:true},
 {id:'comparacao-fazendas',name:'Comparar com fazendas parecidas',group:'Financeiro e fiscal',finance:true},
 {id:'modulos',name:'Módulos e modelo da fazenda',group:'Configurações',ceo:true},
 {id:'meus-dados',name:'Meus dados e privacidade',group:'Configurações',ceo:true}
];
const META={
 partnerships:{page:'parcerias',name:'Parceria / meação',fields:{partner:'text',partnerDoc:'text',pix:'text',plotIds:'array',areaHa:'number',cycleId:'text',productionShare:'number',costShare:'number',shareFarmCosts:'boolean',start:'text',end:'text'}},
 partnerEntries:{page:'parcerias',name:'Lançamento da parceria',immutable:true,fields:{partnershipId:'text',kind:'text',amount:'number',bags:'number',description:'text'}},
 taxSettings:{page:'funrural',name:'Regime do Funrural',fields:{regime:'text',funruralRate:'number',ratRate:'number',senarRate:'number',buyerWithholds:'boolean'}},
 loans:{page:'financiamentos',name:'Financiamento / dívida',fields:{name:'text',kind:'text',bank:'text',principal:'number',annualRate:'number',installments:'number',periodMonths:'number',system:'text',due:'text',cprBags:'number',crop:'text'}},
 loanPayments:{page:'financiamentos',name:'Pagamento de parcela',immutable:true,fields:{loanId:'text',installment:'number',amount:'number'}},
 leases:{page:'arrendamentos',name:'Arrendamento',fields:{direction:'text',party:'text',plotIds:'array',areaHa:'number',unit:'text',perHa:'number',bagPrice:'number',start:'text',end:'text',dueMonth:'number',cycleId:'text'}},
 contractors:{page:'prestadores',name:'Serviço terceirizado',fields:{provider:'text',service:'text',unit:'text',quantity:'number',price:'number',cycleId:'text',plotId:'text',paid:'boolean'}},
 animals:{page:'animais',name:'Animal',fields:{tag:'text',sisbov:'text',name:'text',sex:'text',breed:'text',birth:'text',lotId:'text',motherTag:'text',origin:'text',status:'text',exitDate:'text'}},
 animalEvents:{page:'animais',name:'Evento do animal',immutable:true,fields:{animalId:'text',kind:'text',weightKg:'number',description:'text'}},
 moduleSettings:{page:'modulos',name:'Módulos da fazenda',fields:{hidden:'array',template:'text'}}
};
const GLOBAL_KEYS=['taxSettings','loans','loanPayments','leases','moduleSettings'];
const ENTRY_KINDS=['custo','adiantamento','entrega','venda','pagamento'];
const LOAN_KINDS=['custeio','pronaf','investimento','cpr','outro'];
const LOAN_SYSTEMS=['price','sac','unica'];
const CONTRACTOR_SERVICES=['colheita','pulverizacao','plantio','preparo','transporte','outro'];
const CONTRACTOR_UNITS=['ha','saca','diaria','hora','total'];
const ANIMAL_STATUS=['ativo','vendido','morto','descartado'];
const EVENT_KINDS=['pesagem','parto','cobertura','prenhez','secagem','vacina','tratamento','transferencia','outro'];
// Alíquotas sobre a receita bruta da comercialização (Lei 8.212/91, art. 25, e Lei 13.606/2018). Conferir com o contador.
const REGIMES={
 pf:{label:'Pessoa física (comercialização)',funrural:1.2,rat:0.1,senar:0.2},
 pj:{label:'Pessoa jurídica (comercialização)',funrural:1.7,rat:0.1,senar:0.25},
 folha:{label:'Optou pela folha de pagamento (só Senar)',funrural:0,rat:0,senar:0.2},
 isento:{label:'Isento / exportação direta',funrural:0,rat:0,senar:0}
};

// ---------- Validação ----------
function validate(f){
 const plots=new Map((f.talhoes||[]).map(p=>[p.id,p])),cycles=new Map((f.agriculture?.cycles||[]).map(c=>[c.id,c])),dateOk=v=>D.validDate(v);
 const parts=active(f,'partnerships');
 for(const p of parts){check(p.activity==='coffee'&&p.partner?.trim()&&Array.isArray(p.plotIds)&&p.plotIds.length>0&&p.plotIds.every(id=>typeof id==='string'&&plots.has(id)),'Parceria: informe o parceiro e ao menos um talhão da fazenda.');check(num(p.productionShare)&&p.productionShare>0&&p.productionShare<=100&&(p.costShare==null||num(p.costShare)&&p.costShare<=100),'Parceria: percentuais entre 0 e 100.');check(dateOk(p.start)&&(!p.end||dateOk(p.end)&&p.end>=p.start),'Parceria: confira o início e o fim.');if(p.partnerDoc)check(/^(\d{11}|\d{14})$/.test(p.partnerDoc),'Parceria: CPF/CNPJ só com números.');}
 for(const p of parts)for(const o of parts)if(o.id<p.id&&o.plotIds.some(id=>p.plotIds.includes(id))&&o.start<=(p.end||'9999-12-31')&&p.start<=(o.end||'9999-12-31'))check(false,'O mesmo talhão já está em outra parceria no período.');
 for(const e of f.expansion?.partnerEntries||[]){const p=(f.expansion.partnerships||[]).find(p=>p.id===e.partnershipId);check(p&&ENTRY_KINDS.includes(e.kind)&&e.date<=today(),'Lançamento da parceria inválido.');if(['custo','adiantamento','pagamento'].includes(e.kind))check(num(e.amount)&&e.amount>0,'Informe o valor do lançamento.');if(e.kind==='entrega')check(num(e.bags)&&e.bags>0,'Informe as sacas entregues.');if(e.kind==='venda')check(num(e.bags)&&e.bags>0&&num(e.amount)&&e.amount>0,'Venda do parceiro: informe sacas e valor.');}
 const tax=active(f,'taxSettings');check(tax.length<=1,'Mantenha um único regime do Funrural por fazenda.');for(const t of tax)check(REGIMES[t.regime]&&[t.funruralRate,t.ratRate,t.senarRate].every(v=>v==null||num(v)&&v<=10),'Regime ou alíquota do Funrural inválido.');
 for(const l of active(f,'loans')){check(l.name?.trim()&&LOAN_KINDS.includes(l.kind)&&num(l.principal)&&l.principal>0,'Financiamento: informe nome, tipo e valor.');check(LOAN_SYSTEMS.includes(l.system||'price')&&Number.isInteger(l.installments??1)&&(l.installments??1)>=1&&(l.installments??1)<=360&&[1,3,6,12].includes(l.periodMonths??12),'Financiamento: confira parcelas, periodicidade e sistema.');check(dateOk(l.due)&&l.due>=l.date,'Financiamento: o primeiro vencimento deve ser depois da contratação.');check(l.annualRate==null||l.annualRate<=100,'Juros anuais acima de 100%.');if(l.kind==='cpr')check(l.cprBags==null||num(l.cprBags)&&l.cprBags>0,'CPR: informe as sacas.');}
 for(const p of f.expansion?.loanPayments||[]){const l=(f.expansion.loans||[]).find(l=>l.id===p.loanId);check(l&&Number.isInteger(p.installment)&&p.installment>=1&&p.installment<=(l.system==='unica'?1:l.installments||1)&&num(p.amount)&&p.amount>0&&p.date<=today(),'Pagamento de parcela inválido.');}
 for(const l of active(f,'leases')){check(['tomado','cedido'].includes(l.direction)&&l.party?.trim()&&num(l.areaHa)&&l.areaHa>0&&['sacas','reais'].includes(l.unit)&&num(l.perHa)&&l.perHa>0,'Arrendamento: confira tipo, parte, área e valor.');check(dateOk(l.start)&&(!l.end||dateOk(l.end)&&l.end>=l.start)&&(l.dueMonth==null||Number.isInteger(l.dueMonth)&&l.dueMonth>=1&&l.dueMonth<=12),'Arrendamento: confira as datas e o mês de pagamento.');check(!l.plotIds||Array.isArray(l.plotIds)&&l.plotIds.every(id=>plots.has(id)),'Arrendamento: talhão não encontrado.');if(l.cycleId)check(cycles.get(l.cycleId)?.activity===l.activity,'Safra do arrendamento inválida.');}
 for(const c of active(f,'contractors'))check(c.provider?.trim()&&CONTRACTOR_SERVICES.includes(c.service)&&CONTRACTOR_UNITS.includes(c.unit)&&num(c.quantity)&&c.quantity>0&&num(c.price)&&c.price>0,'Serviço terceirizado: confira prestador, serviço, unidade, quantidade e preço.');
 const tags=new Set(),sisbov=new Set();
 for(const a of active(f,'animals')){check(a.activity==='cattle'&&a.tag?.trim()&&a.tag.length<=40&&['F','M'].includes(a.sex)&&ANIMAL_STATUS.includes(a.status||'ativo'),'Animal: informe brinco, sexo e situação.');const t=a.tag.trim().toUpperCase();check(!tags.has(t),'Brinco repetido: '+a.tag);tags.add(t);if(a.sisbov){check(/^\d{15}$/.test(a.sisbov),'Número SISBOV deve ter 15 dígitos.');check(!sisbov.has(a.sisbov),'Número SISBOV repetido.');sisbov.add(a.sisbov);}check(!a.birth||dateOk(a.birth)&&a.birth<=today(),'Nascimento inválido.');if((a.status||'ativo')!=='ativo')check(dateOk(a.exitDate)&&(!a.birth||a.exitDate>=a.birth),'Informe a data de saída do animal.');}
 for(const e of f.expansion?.animalEvents||[]){const a=(f.expansion.animals||[]).find(a=>a.id===e.animalId);check(a&&EVENT_KINDS.includes(e.kind)&&e.date<=today()&&(!a.birth||e.date>=a.birth),'Evento do animal inválido.');if(e.kind==='pesagem')check(num(e.weightKg)&&e.weightKg>0&&e.weightKg<=2000,'Informe o peso (kg).');if(['parto','cobertura','prenhez','secagem'].includes(e.kind))check(a.sex==='F','Evento reprodutivo só para fêmeas.');}
 const mods=active(f,'moduleSettings');check(mods.length<=1,'Mantenha uma configuração de módulos por fazenda.');for(const m of mods)check(Array.isArray(m.hidden||[])&&(m.hidden||[]).every(p=>typeof p==='string'&&p.length<=60)&&!(m.hidden||[]).includes('modulos'),'Lista de módulos inválida.');
}

// ---------- Parceria / meação ----------
const brl=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
function plotsArea(f,ids){return (ids||[]).reduce((n,id)=>n+(Number((f.talhoes||[]).find(p=>p.id===id)?.areaHa)||0),0);}
function partnershipReport(f,p,X){
 const c=(f.agriculture?.cycles||[]).find(c=>c.id===p.cycleId),plots=new Set(p.plotIds||[]),area=plotsArea(f,p.plotIds)||p.areaHa||0;
 const share=c&&c.areaHa>0&&area>0?Math.min(1,area/c.areaHa):null,inWindow=d=>d>=p.start&&(!p.end||d<=p.end);
 let producedKg=0,producedBags=0;
 for(const h of f.agriculture?.harvests||[]){if(!inWindow(h.date))continue;const hc=(f.agriculture.cycles||[]).find(x=>x.id===h.cycleId),bagKg=hc?.bagKg||60;let kg=0;
  if(h.plotId){if(plots.has(h.plotId)&&(!p.cycleId||h.cycleId===p.cycleId))kg=h.netKg;}else if(p.cycleId&&h.cycleId===p.cycleId&&share!=null)kg=h.netKg*share;
  producedKg+=kg;producedBags+=kg/bagKg;}
 const entries=(f.expansion?.partnerEntries||[]).filter(e=>e.partnershipId===p.id&&!e.archived),sum=(k,field)=>entries.filter(e=>e.kind===k).reduce((n,e)=>n+(e[field]||0),0);
 const farmCosts=p.shareFarmCosts&&c&&share!=null&&X?X.costLines(f,{activity:'coffee',from:p.start,to:p.end||'9999-12-31',targetType:'cycle',targetId:c.id}).reduce((n,r)=>n+r.amount,0)*share:0;
 const sharedCosts=round(farmCosts+sum('custo','amount')),partnerCost=round(sharedCosts*(p.costShare||0)/100),partnerBags=round(producedBags*p.productionShare/100,3);
 const delivered=round(sum('entrega','bags'),3),soldBags=round(sum('venda','bags'),3),soldAmount=round(sum('venda','amount')),advances=round(sum('adiantamento','amount')),paid=round(sum('pagamento','amount'));
 const bagsBalance=round(partnerBags-delivered-soldBags,3),money=round(soldAmount-partnerCost-advances-paid);
 return {producedKg:round(producedKg),producedBags:round(producedBags,3),partnerBags,ownerBags:round(producedBags-partnerBags,3),farmCosts:round(farmCosts),sharedCosts,partnerCost,delivered,soldBags,soldAmount,advances,paid,bagsBalance,money,
  areaShare:share,text:(bagsBalance>0.0005?`Faltam entregar ${String(round(bagsBalance,2)).replace('.',',')} sacas ao parceiro. `:bagsBalance<-0.0005?`O parceiro recebeu ${String(round(-bagsBalance,2)).replace('.',',')} sacas a mais. `:'Sacas acertadas. ')+(money>0.005?`A fazenda deve R$ ${brl(money)} ao parceiro.`:money<-0.005?`O parceiro deve R$ ${brl(-money)} à fazenda.`:'Valores acertados.')};
}

// ---------- Funrural / Senar ----------
function taxSetting(f){return active(f,'taxSettings')[0]||null;}
function rates(setting){const base=REGIMES[setting?.regime||'pf']||REGIMES.pf;return {regime:setting?.regime||'pf',label:base.label,funrural:num(setting?.funruralRate)?setting.funruralRate:base.funrural,rat:num(setting?.ratRate)?setting.ratRate:base.rat,senar:num(setting?.senarRate)?setting.senarRate:base.senar,buyerWithholds:setting?.buyerWithholds!==false,configured:Boolean(setting)};}
function funrural(gross,r){const c=v=>Math.round(gross*v)/100,funr=c(r.funrural),rat=c(r.rat),senar=c(r.senar),total=round(funr+rat+senar);return {gross:round(gross),funrural:funr,rat,senar,total,net:r.buyerWithholds?round(gross-total):round(gross),toCollect:r.buyerWithholds?0:total};}
function funruralReport(f,{from='0000-01-01',to='9999-12-31'}={}){
 const r=rates(taxSetting(f)),rows=[],add=(o,gross)=>{if(gross>0&&o.date>=from&&o.date<=to)rows.push({...o,...funrural(gross,r)});};
 for(const s of f.agriculture?.sales||[])if(!s.archived&&num(s.pricePerKg))add({kind:'venda',id:s.id,date:s.date,activity:(f.agriculture.cycles||[]).find(c=>c.id===s.cycleId)?.activity||'coffee',label:(s.buyer||'Venda')+' · '+round(s.kg/(s.bagKg||60),2)+' sc'},s.kg*s.pricePerKg);
 for(const c of f.management?.salesContracts||[]){if(c.status==='canceled')continue;const delivered=(c.deliveries||[]).reduce((n,d)=>n+(d.kg||0),0),left=Math.max(0,c.quantityKg-delivered);add({kind:'contrato',id:c.id,date:c.deliveryEnd,activity:c.activity,label:'Contrato '+(c.number||'')+' · '+c.buyer+' (a entregar)'},left*c.pricePerKg);}
 for(const m of active(f,'milkStatements'))add({kind:'leite',id:m.id,date:m.to,activity:'cattle',label:'Leite · '+m.dairy},m.liters*m.unitPrice+(m.bonus||0)-(m.discount||0));
 rows.sort((a,b)=>a.date.localeCompare(b.date));
 const months=new Map();for(const x of rows){const k=month(x.date),m=months.get(k)||{month:k,gross:0,total:0,toCollect:0};m.gross=round(m.gross+x.gross);m.total=round(m.total+x.total);m.toCollect=round(m.toCollect+x.toCollect);months.set(k,m);}
 return {rates:r,rows,months:[...months.values()],gross:round(rows.reduce((n,x)=>n+x.gross,0)),total:round(rows.reduce((n,x)=>n+x.total,0)),toCollect:round(rows.reduce((n,x)=>n+x.toCollect,0))};
}

// ---------- Financiamentos ----------
function loanSchedule(l,payments=[],on=today()){
 const n=l.system==='unica'?1:l.installments||1,period=l.periodMonths||12,a=(l.annualRate||0)/100,i=(1+a)**(period/12)-1,P=l.principal,factor=(from,to)=>(1+a)**(Math.max(0,days(from,to))/365)-1;
 const pmt=l.system==='price'||!l.system?(i>0?P*i/(1-(1+i)**-n):P/n):null;
 let balance=P,prev=l.date;const rows=[];
 for(let k=1;k<=n;k++){const date=addMonths(l.due,(k-1)*period),interest=round(balance*factor(prev,date));let amort=l.system==='sac'?P/n:l.system==='unica'?balance:pmt-balance*i;if(k===n)amort=balance;amort=round(amort);const amount=round(amort+interest);balance=round(balance-amort);
  const paid=round(payments.filter(p=>p.installment===k&&!p.archived).reduce((s,p)=>s+p.amount,0)),status=paid>=amount-0.01?'paga':date<on?'atrasada':'a vencer';
  rows.push({n:k,date,amount,interest,amortization:amort,balance:Math.max(0,balance),paid,open:round(Math.max(0,amount-paid)),status,bags:l.kind==='cpr'&&k===n?l.cprBags||null:null});prev=date;}
 const open=rows.filter(r=>r.status!=='paga');
 return {rows,totalInterest:round(rows.reduce((s,r)=>s+r.interest,0)),total:round(rows.reduce((s,r)=>s+r.amount,0)),outstanding:round(open.reduce((s,r)=>s+r.open,0)),overdue:open.filter(r=>r.status==='atrasada'),next:open.find(r=>r.status==='a vencer')||null};
}
function loansReport(f,on=today()){return active(f,'loans').map(l=>({loan:l,...loanSchedule(l,(f.expansion?.loanPayments||[]).filter(p=>p.loanId===l.id),on)}));}

// ---------- Arrendamentos ----------
function leaseYearValue(l,bagPrice){const perHa=l.unit==='sacas'?(num(l.bagPrice)&&l.bagPrice>0?l.bagPrice:bagPrice):1;return perHa>0?round(l.areaHa*l.perHa*perHa):null;}
// Um pagamento por ano, no mês combinado (ou no mês de início), no mesmo dia do início.
function leaseDueDates(l,from,to){const out=[],m=l.dueMonth||Number(l.start.slice(5,7)),day=Number(l.start.slice(8,10));for(let y=Number(l.start.slice(0,4));y<=Number(to.slice(0,4));y++){const last=new Date(Date.UTC(y,m,0)).getUTCDate(),iso=new Date(Date.UTC(y,m-1,Math.min(day,last))).toISOString().slice(0,10);if(iso>=l.start&&(!l.end||iso<=l.end)&&iso>=from&&iso<=to)out.push(iso);}return out;}
function leaseCostRows(f,on=today()){const rows=[];for(const l of active(f,'leases')){if(l.direction!=='tomado')continue;const v=leaseYearValue(l);if(!v)continue;for(const d of leaseDueDates(l,l.start,on))rows.push({key:'lease:'+l.id+':'+d,activity:l.activity,date:d,cycleId:l.cycleId||'',lotId:'',amount:v,category:'fixos',label:'Arrendamento · '+l.party});}return rows;}

// ---------- Prestadores ----------
function contractorAmount(c){return round(c.quantity*c.price);}
function contractorCostRows(f){return active(f,'contractors').map(c=>({key:'contractor:'+c.id,activity:c.activity,date:c.date,cycleId:c.cycleId||'',lotId:'',amount:contractorAmount(c),category:c.service==='colheita'?'mao-de-obra':'operacoes',label:c.provider+' · '+c.service}));}
// Compara o custo por saca da colheita terceirizada com a colheita manual (fechamentos da Mão de obra) na mesma safra.
// Cada lado usa as sacas dos próprios talhões: a manual, os talhões apontados pela turma (sem os da máquina); a
// terceirizada por hectare, a produtividade do talhão do serviço (ou a da safra, quando o talhão não foi informado).
function contractorComparison(f,X){
 const out=[];for(const c of (f.agriculture?.cycles||[]).filter(c=>c.activity==='coffee'&&!c.archived)){
  const bagKg=c.bagKg||60,cyclePlots=new Set(c.plotIds?.length?c.plotIds:[c.plotId]),harvests=(f.agriculture.harvests||[]).filter(h=>h.cycleId===c.id),bags=harvests.reduce((n,h)=>n+h.netKg,0)/bagKg,perHaBags=c.areaHa>0?bags/c.areaHa:0;
  const plotBags=id=>harvests.filter(h=>h.plotId===id).reduce((n,h)=>n+h.netKg,0)/bagKg,plotArea=id=>Number((f.talhoes||[]).find(p=>p.id===id)?.areaHa)||0;
  const manual=X?X.laborClosingCosts(f).filter(r=>r.cycleId===c.id).reduce((n,r)=>n+r.amount,0):0;
  const hired=active(f,'contractors').filter(r=>r.cycleId===c.id&&r.service==='colheita');if(!hired.length&&!manual)continue;
  const hiredPlots=new Set(hired.map(r=>r.plotId).filter(Boolean)),manualPlots=new Set((f.labor?.entries||[]).filter(e=>!e.voided&&cyclePlots.has(e.plotId)&&!hiredPlots.has(e.plotId)).map(e=>e.plotId));
  const manualBags=manualPlots.size?[...manualPlots].reduce((n,id)=>n+plotBags(id),0):bags;
  const hiredRows=hired.map(r=>{const y=r.plotId&&plotArea(r.plotId)>0&&plotBags(r.plotId)>0?plotBags(r.plotId)/plotArea(r.plotId):perHaBags;return {id:r.id,provider:r.provider,unit:r.unit,total:contractorAmount(r),perBag:r.unit==='saca'?r.price:r.unit==='ha'&&y>0?round(r.price/y):null};});
  const hiredPerBag=hiredRows.filter(r=>r.perBag!=null),avgHired=hiredPerBag.length?round(hiredPerBag.reduce((n,r)=>n+r.perBag,0)/hiredPerBag.length):null;
  const manualPerBag=manual>0&&manualBags>0?round(manual/manualBags):null;
  out.push({cycleId:c.id,name:c.name,bags:round(bags,2),manualBags:round(manualBags,2),manual:round(manual),manualPerBag,hired:hiredRows,hiredPerBag:avgHired,difference:avgHired!=null&&manualPerBag!=null?round(avgHired-manualPerBag):null});}
 return out;
}

// ---------- Animais e leite ----------
function animalHistory(f,id){return (f.expansion?.animalEvents||[]).filter(e=>e.animalId===id&&!e.archived).sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));}
function animalWeight(f,id){const w=animalHistory(f,id).filter(e=>e.kind==='pesagem'),last=w.at(-1),prev=w.at(-2),gap=last&&prev?days(prev.date,last.date):0;return {last:last||null,gainDay:gap>0?round((last.weightKg-prev.weightKg)/gap,3):null};}
const GESTATION=283,LACTATION=305,DRY_BEFORE=60;
function milkIndicators(f,on=today()){
 const out=[];for(const a of active(f,'animals').filter(a=>a.sex==='F'&&(a.status||'ativo')==='ativo')){
  const ev=animalHistory(f,a.id),births=ev.filter(e=>e.kind==='parto').map(e=>e.date);if(!births.length&&!ev.some(e=>e.kind==='prenhez'))continue;
  const last=births.at(-1)||null,dried=last&&ev.some(e=>e.kind==='secagem'&&e.date>=last),gaps=births.slice(1).map((d,i)=>days(births[i],d)),iep=gaps.length?Math.round(gaps.reduce((n,d)=>n+d,0)/gaps.length):null;
  const service=ev.filter(e=>e.kind==='cobertura'&&(!last||e.date>last)).at(-1),pregnant=service&&ev.some(e=>e.kind==='prenhez'&&e.date>=service.date);
  const calving=pregnant?addDays(service.date,GESTATION):null,dryOff=dried?null:calving?addDays(calving,-DRY_BEFORE):last?addDays(last,LACTATION):null;
  out.push({animalId:a.id,tag:a.tag,name:a.name||'',lastCalving:last,lactating:Boolean(last&&!dried),del:last&&!dried?days(last,on):null,calvings:births.length,iep,iepMonths:iep?round(iep/30.4,1):null,pregnant:Boolean(pregnant),expectedCalving:calving,dryOff,dryOffIn:dryOff?days(on,dryOff):null});}
 return out.sort((a,b)=>(a.dryOffIn??9999)-(b.dryOffIn??9999));
}
// Planilha para o cadastro no SISBOV (preparação; o envio é feito pela certificadora credenciada).
function sisbovRows(f){return active(f,'animals').filter(a=>(a.status||'ativo')==='ativo').map(a=>{const missing=[!/^\d{15}$/.test(a.sisbov||'')&&'número SISBOV',!a.birth&&'nascimento',!a.breed&&'raça',!a.origin&&'origem'].filter(Boolean);return {tag:a.tag,sisbov:a.sisbov||'',sex:a.sex,birth:a.birth||'',breed:a.breed||'',origin:a.origin||'',lot:(f.cattle?.lots||[]).find(l=>l.id===a.lotId)?.name||'',missing};});}
function csv(rows){return rows.map(r=>r.map(v=>{const s=String(v??'');return /[;"\n\r]/.test(s)||/^[=+\-@]/.test(s)?'"'+s.replace(/^([=+\-@])/,"'$1").replace(/"/g,'""')+'"':s;}).join(';')).join('\r\n');}
// Arquivo de balança: "brinco;peso" (aceita vírgula decimal, tab ou vírgula como separador e uma linha de cabeçalho).
function parseScale(text,animals){const byTag=new Map(animals.map(a=>[a.tag.trim().toUpperCase(),a])),ok=[],errors=[];String(text||'').split(/\r?\n/).forEach((line,i)=>{const t=line.trim();if(!t)return;const parts=(/[;\t]/.test(t)?t.split(/[;\t]/):t.split(/,(?=\s*\d+(?:\.\d+)?\s*$)/)).map(s=>s.trim());if(parts.length<2){errors.push(`Linha ${i+1}: use brinco;peso`);return;}const kg=Number(parts[1].replace(/\s/g,'').replace(',','.'));if(!Number.isFinite(kg)||kg<=0||kg>2000){if(i>0||!/peso|kg/i.test(t))errors.push(`Linha ${i+1}: peso inválido`);return;}const a=byTag.get(parts[0].toUpperCase());if(!a){errors.push(`Linha ${i+1}: brinco ${parts[0]} não cadastrado`);return;}ok.push({animalId:a.id,tag:a.tag,weightKg:round(kg,1)});});return {ok,errors};}

// ---------- Fluxo de caixa projetado ----------
function cashFlow(f,{months=12,on=today(),bagPrice=null}={}){
 const start=month(on)+'-01',end=addMonths(start,months),list=[],add=(date,amount,label,kind)=>{if(!amount)return;const d=date<on?on:date;if(d>=end)return;list.push({date:d,amount:round(amount),label,kind,overdue:date<on});};
 const opening=round((f.finances||[]).filter(r=>r.date<=on&&!r.archived).reduce((n,r)=>n+(r.type==='entrada'?1:r.type==='saida'?-1:0)*(Number(r.value)||0),0));
 for(const p of f.management?.payables||[])if(p.status==='open')add(p.dueDate,-p.amount,'Conta: '+p.supplier+' · '+p.description,'conta');
 for(const s of f.agriculture?.sales||[])for(const i of s.installments||[]){const paid=(f.operations?.payments||[]).filter(r=>r.saleId===s.id&&r.installmentId===i.id).reduce((n,r)=>n+r.amount,0);add(i.date,i.amount-paid,'Recebimento: '+(s.buyer||'venda'),'receber');}
 const tax=rates(taxSetting(f));
 for(const c of f.management?.salesContracts||[]){if(c.status!=='open')continue;const left=Math.max(0,c.quantityKg-(c.deliveries||[]).reduce((n,d)=>n+(d.kg||0),0));if(left>0)add(c.deliveryEnd,funrural(left*c.pricePerKg,tax).net,'Contrato: '+c.buyer,'contrato');}
 for(const r of loansReport(f,on))for(const x of r.rows)if(x.status!=='paga')add(x.date,-x.open,(r.loan.kind==='cpr'?'CPR: ':'Parcela: ')+r.loan.name+' ('+x.n+')','parcela');
 for(const l of active(f,'leases')){const v=leaseYearValue(l,bagPrice);if(!v)continue;for(const d of leaseDueDates(l,on,addDays(end,-1)))add(d,l.direction==='tomado'?-v:v,'Arrendamento '+(l.direction==='tomado'?'a pagar':'a receber')+': '+l.party,'arrendamento');}
 for(const c of active(f,'contractors'))if(c.paid===false)add(c.date,-contractorAmount(c),'Prestador: '+c.provider,'prestador');
 const fixed=active(f,'yearWorkers').filter(w=>w.active!==false&&w.kind==='fixo'&&w.monthlyRate>0);for(let k=0;k<months;k++){const d=addMonths(start,k).slice(0,8)+'05';for(const w of fixed)if(d>=on)add(d,-w.monthlyRate,'Salário: '+w.name,'salario');}
 const rows=[];let balance=opening;for(let k=0;k<months;k++){const m=month(addMonths(start,k)),items=list.filter(x=>month(x.date)===m),inflow=round(items.filter(x=>x.amount>0).reduce((n,x)=>n+x.amount,0)),outflow=round(-items.filter(x=>x.amount<0).reduce((n,x)=>n+x.amount,0));balance=round(balance+inflow-outflow);rows.push({month:m,inflow,outflow,net:round(inflow-outflow),balance,items});}
 const lowest=rows.reduce((m,r)=>!m||r.balance<m.balance?r:m,null);
 return {opening,rows,lowest,firstNegative:rows.find(r=>r.balance<0)||null,missingBagPrice:active(f,'leases').some(l=>l.unit==='sacas'&&!(l.bagPrice>0)&&!(bagPrice>0))};
}

// ---------- Avisos ----------
function alerts(f,on=today()){const out=[];for(const r of loansReport(f,on))for(const x of r.rows){if(x.status==='paga')continue;const left=days(on,x.date);if(left<=30)out.push({id:'loan:'+r.loan.id+':'+x.n+':'+(left<0?'late':left<=7?7:30),page:'financiamentos',title:(r.loan.kind==='cpr'?'CPR ':'Parcela ')+r.loan.name+(left<0?' atrasada':left===0?' vence hoje':' vence em '+left+' dias'),severity:left<=7?'high':'attention'});}
 for(const m of milkIndicators(f,on))if(m.dryOffIn!=null&&m.dryOffIn<=7)out.push({id:'dry:'+m.animalId+':'+m.dryOff,page:'animais',title:'Secar a vaca '+m.tag+(m.dryOffIn<0?' (atrasado)':' até '+m.dryOff.split('-').reverse().join('/')),severity:'attention'});
 return out;}

// ---------- Módulos ----------
const CORE_PAGES=['dashboard','perfil','fazendas','usuarios','assinatura','modulos','meus-dados','campo','historico'];
const TEMPLATES={
 'cafe-familiar':{name:'Café familiar (dono e família)',hidden:['mao-de-obra','colheita-campo','equipe-anual','emissao-fiscal','conciliacao','pedidos-compra','acesso-contador','certificacoes','comparador-coletivo','prestadores','arrendamentos','parcerias','estoque-cafe']},
 'cafe-meacao':{name:'Café com meeiros / parceiros',hidden:['emissao-fiscal','conciliacao','pedidos-compra','comparador-coletivo']},
 'cafe-empresa':{name:'Café com equipe de colheita',hidden:[]},
 'leite':{name:'Gado de leite',hidden:['etapas-gado','emissao-fiscal','conciliacao','pedidos-compra','comparador-coletivo']},
 'corte':{name:'Gado de corte',hidden:['leite','qualidade-leite','emissao-fiscal','conciliacao','pedidos-compra']},
 'graos':{name:'Grãos',hidden:['pos-colheita','rastreabilidade','emissao-fiscal','conciliacao']},
 'completo':{name:'Tudo ligado',hidden:[]}
};
function hiddenPages(farms){const sets=(farms||[]).map(f=>new Set(active(f,'moduleSettings')[0]?.hidden||[]));if(!sets.length)return new Set();return new Set([...sets[0]].filter(p=>sets.every(s=>s.has(p))&&!CORE_PAGES.includes(p)));}

// ---------- Comparação anônima ----------
function quantile(v,q){if(!v.length)return null;const s=[...v].sort((a,b)=>a-b),pos=(s.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);return round(s[lo]+(s[hi]-s[lo])*(pos-lo),2);}
function benchmark(rows,{activity,uf}){const m=rows.filter(r=>r.activity===activity&&(!uf||r.uf===uf)&&(num(r.bagsHa)||num(r.costBag)));const farms=new Set(m.map(r=>r.farmKey)),groups=new Set(m.map(r=>r.groupKey));if(farms.size<3||groups.size<3)return {available:false,reason:'Ainda não há fazendas parecidas suficientes (mínimo de três fazendas de três grupos que aceitaram participar).'};const stat=k=>{const v=m.map(r=>r[k]).filter(v=>num(v)&&v>0);return v.length>=3?{p25:quantile(v,.25),median:quantile(v,.5),p75:quantile(v,.75),n:v.length}:null;};return {available:true,farms:farms.size,bagsHa:stat('bagsHa'),costBag:stat('costBag'),areaHa:stat('areaHa')};}
function farmIndicators(f,X,activity){const cycles=(f.agriculture?.cycles||[]).filter(c=>c.activity===activity&&!c.archived);const lastYear=String(Number(today().slice(0,4))-2);const recent=cycles.filter(c=>(c.startDate||'')>=lastYear+'-01-01');const use=recent.length?recent:cycles;let bags=0,area=0,cost=0;const units=X?X.unitCosts(f,activity):[];for(const c of use){const s=D.cycleStats(f,c);bags+=s.harvestedKg/(c.bagKg||60);area+=c.areaHa||0;cost+=units.find(u=>u.id===c.id)?.cost||0;}return {bagsHa:area>0&&bags>0?round(bags/area,2):null,costBag:bags>0&&cost>0?round(cost/bags,2):null,areaHa:area>0?round(area,2):null};}

return {PAGES,META,GLOBAL_KEYS,REGIMES,ENTRY_KINDS,LOAN_KINDS,LOAN_SYSTEMS,CONTRACTOR_SERVICES,CONTRACTOR_UNITS,ANIMAL_STATUS,EVENT_KINDS,TEMPLATES,CORE_PAGES,
 validate,partnershipReport,plotsArea,taxSetting,rates,funrural,funruralReport,loanSchedule,loansReport,leaseYearValue,leaseDueDates,leaseCostRows,contractorAmount,contractorCostRows,contractorComparison,
 animalHistory,animalWeight,milkIndicators,sisbovRows,csv,parseScale,cashFlow,alerts,hiddenPages,benchmark,farmIndicators,quantile,addMonths};
});
