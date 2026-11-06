/* Melhorias 2027: parceria/meação, Funrural, financiamentos, fluxo de caixa projetado, arrendamentos, prestadores,
   animais individuais, indicadores do leite, módulos ativos e comparação anônima. Regras compartilhadas pelo navegador
   e pelo servidor. Os registros usam o mesmo mecanismo das etapas 3–8 (farm.expansion), com validação, histórico e
   permissão por página. Cálculos que precisam de custos recebem a API de RuralExpansion (X) como parâmetro. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./rural-domain'):root.RuralDomain);if(typeof module==='object'&&module.exports)module.exports=api;else root.RuralMelhorias=api;})(globalThis,function(D){
'use strict';
const num=x=>typeof x==='number'&&Number.isFinite(x),round=(x,n=2)=>Math.round((x+Number.EPSILON)*10**n)/10**n;
const check=(ok,message)=>{if(!ok)throw Object.assign(new Error(message),{statusCode:422});};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()),days=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/86400000);
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
 {id:'meus-dados',name:'Meus dados e privacidade',group:'Configurações',ceo:true},
 {id:'fechamento-mes',name:'Fechamento do mês',group:'Financeiro e fiscal',finance:true},
 {id:'margem-hectare',name:'Margem por hectare',group:'Financeiro e fiscal',finance:true}
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
 moduleSettings:{page:'modulos',name:'Módulos da fazenda',fields:{hidden:'array',template:'text'}},
 recurringBills:{page:'fluxo-caixa',name:'Conta recorrente',fields:{supplier:'text',description:'text',amount:'number',dayOfMonth:'number',costCenter:'text',start:'text',end:'text',active:'boolean'}}
};
const GLOBAL_KEYS=['taxSettings','loans','loanPayments','leases','moduleSettings','recurringBills'];
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
 validateCosts(f);
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
function cashFlow(f,{months=12,on=today(),bagPrice=null,extra=[]}={}){
 const start=month(on)+'-01',end=addMonths(start,months),list=[],add=(date,amount,label,kind,ref)=>{if(!amount)return;const d=date<on?on:date;if(d>=end)return;list.push({date:d,amount:round(amount),label,kind,overdue:date<on,...(ref?{ref}:{})});};
 const opening=round((f.finances||[]).filter(r=>r.date<=on&&!r.archived).reduce((n,r)=>n+(r.type==='entrada'?1:r.type==='saida'?-1:0)*(Number(r.value)||0),0));
 for(const p of f.management?.payables||[])if(p.status==='open')add(p.dueDate,-p.amount,'Conta: '+p.supplier+' · '+p.description,'conta');
 for(const s of f.agriculture?.sales||[])for(const i of s.installments||[]){const paid=(f.operations?.payments||[]).filter(r=>r.saleId===s.id&&r.installmentId===i.id).reduce((n,r)=>n+r.amount,0);add(i.date,i.amount-paid,'Recebimento: '+(s.buyer||'venda'),'receber');}
 const tax=rates(taxSetting(f));
 for(const c of f.management?.salesContracts||[]){if(c.status!=='open')continue;const left=Math.max(0,c.quantityKg-(c.deliveries||[]).reduce((n,d)=>n+(d.kg||0),0));if(left>0)add(c.deliveryEnd,funrural(left*c.pricePerKg,tax).net,'Contrato: '+c.buyer,'contrato');}
 for(const r of loansReport(f,on))for(const x of r.rows)if(x.status!=='paga')add(x.date,-x.open,(r.loan.kind==='cpr'?'CPR: ':'Parcela: ')+r.loan.name+' ('+x.n+')','parcela',{loanId:r.loan.id,n:x.n,name:r.loan.name,due:x.date});
 for(const l of active(f,'leases')){const v=leaseYearValue(l,bagPrice);if(!v)continue;for(const d of leaseDueDates(l,on,addDays(end,-1)))add(d,l.direction==='tomado'?-v:v,'Arrendamento '+(l.direction==='tomado'?'a pagar':'a receber')+': '+l.party,'arrendamento');}
 for(const c of active(f,'contractors'))if(c.paid===false)add(c.date,-contractorAmount(c),'Prestador: '+c.provider,'prestador');
 // Contas recorrentes ainda não lançadas (as lançadas já entram como conta a pagar) e cenários do tipo "e se eu vender agora".
 for(const r of recurringDue(f,on,addDays(end,-1)))if(!(f.management?.payables||[]).some(p=>p.id===r.id))add(r.dueDate,-r.amount,'Recorrente: '+r.supplier+' · '+r.description,'recorrente');
 for(const x of extra||[])add(x.date||on,Number(x.amount)||0,x.label||'Cenário','cenario');
 const fixed=active(f,'yearWorkers').filter(w=>w.active!==false&&w.kind==='fixo'&&w.monthlyRate>0);for(let k=0;k<months;k++){const d=addMonths(start,k).slice(0,8)+'05';for(const w of fixed)if(d>=on)add(d,-w.monthlyRate,'Salário: '+w.name,'salario');}
 const rows=[];let balance=opening;for(let k=0;k<months;k++){const m=month(addMonths(start,k)),items=list.filter(x=>month(x.date)===m),inflow=round(items.filter(x=>x.amount>0).reduce((n,x)=>n+x.amount,0)),outflow=round(-items.filter(x=>x.amount<0).reduce((n,x)=>n+x.amount,0));balance=round(balance+inflow-outflow);rows.push({month:m,inflow,outflow,net:round(inflow-outflow),balance,items});}
 const lowest=rows.reduce((m,r)=>!m||r.balance<m.balance?r:m,null);
 return {opening,rows,lowest,firstNegative:rows.find(r=>r.balance<0)||null,missingBagPrice:active(f,'leases').some(l=>l.unit==='sacas'&&!(l.bagPrice>0)&&!(bagPrice>0))};
}

// ---------- Avisos ----------
// Parcela que vence em até 30 dias e o caixa previsto (saldo de hoje + o que entra e sai até lá) não cobre.
function cashGapAlerts(f,on=today()){const flow=cashFlow(f,{months:3,on}),items=flow.rows.flatMap(r=>r.items).sort((a,b)=>a.date.localeCompare(b.date)||b.amount-a.amount);let run=flow.opening;const out=[];for(const it of items){run=round(run+it.amount);if(it.kind!=='parcela'||!it.ref||days(on,it.date)>30||run>=0)continue;const missing=round(Math.min(-run,-it.amount));out.push({id:'loan-cash:'+it.ref.loanId+':'+it.ref.n+':'+it.ref.due,page:'fluxo-caixa',role:'ceo',severity:'high',open:{page:'fluxo-caixa'},push:'Parcela de financiamento sem caixa previsto. Abra para conferir.',title:'Parcela '+it.ref.name+' ('+it.ref.n+') de R$ '+brl(-it.amount)+(it.overdue?' está atrasada':' vence em '+it.date.split('-').reverse().join('/'))+' e o caixa previsto não cobre: faltam R$ '+brl(missing)});}return out;}
// Pedido de compra esperando a decisão do CEO.
function purchaseAlerts(f){return (f.management?.purchaseOrders||[]).filter(o=>o.status==='pending').map(o=>{const total=round((o.items||[]).reduce((n,i)=>n+(Number(i.quantity)||0)*(Number(i.unitPrice)||0),0));return {id:'po:'+o.id,page:'pedidos-compra',role:'ceo',severity:'attention',open:{page:'pedidos-compra',item:o.id},push:'Pedido de compra aguardando sua aprovação.',title:'Pedido de compra aguardando aprovação: '+(o.items||[]).map(i=>i.name).slice(0,3).join(', ')+(o.supplier?' · '+o.supplier:'')+(total?' · R$ '+brl(total):'')};});}
// Endereço que a notificação abre: a tela do aviso e, quando houver, o item para conferir e decidir.
function alertLink(a){const p=new URLSearchParams();p.set('abrir',a.open?.page||a.page||'alertas');if(a.open?.item)p.set('item',String(a.open.item));return '/app?'+p.toString();}
// 4.21 · Balança por Bluetooth no padrão oficial (GATT Weight Scale 0x181D, característica Weight Measurement 0x2A9D).
// Byte 0: opções (bit 0 = libras); bytes 1-2: peso em 16 bits (little endian), 0,005 kg ou 0,01 lb por unidade; 0xFFFF = falhou.
function parseBleWeight(bytes){const b=Array.from(bytes||[]);if(b.length<3)return null;const raw=b[1]|(b[2]<<8);if(raw===0xFFFF)return null;const lb=(b[0]&1)===1;const kg=lb?raw*0.01*0.45359237:raw*0.005;return {kg:round(kg,1),unit:lb?'lb':'kg'};}
// O padrão vai até 327 kg (16 bits × 0,005). Balanças de curral com Bluetooth costumam mandar texto, como pelo cabo
// ("452,5 kg" + quebra de linha), num canal UART por Bluetooth: parseScaleText lê esse texto.
function parseScaleText(text){const m=String(text||'').match(/(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:kg)?\s*[\r\n]/i);if(!m)return null;const kg=Number(m[1].replace(',','.'));return kg>0&&kg<5000?round(kg,1):null;}
// Peso estável: o mesmo valor (até 0,2 kg de diferença) em duas leituras seguidas, acima de 1 kg (balança vazia não conta).
function stableWeight(readings){for(let i=1;i<readings.length;i++){const a=readings[i-1],b=readings[i];if(a>1&&b>1&&Math.abs(a-b)<=0.2)return round(b,1);}return null;}
// 4.21 · Resumo da semana (segunda a quarta, uma vez por semana): o que vence nos próximos 7 dias, a colheita dos últimos
// 7 dias, até quando o caixa fica positivo e o estoque no mínimo. O push sai a partir das 7h de Brasília, sem valores em R$
// (aparece na tela bloqueada); o título, dentro do app, traz os valores.
const MESES_CURTOS=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const mesCurto=m=>MESES_CURTOS[Number(m.slice(5,7))-1]+'/'+m.slice(2,4);
function weekStartOf(on){const d=new Date(on+'T12:00:00Z'),w=(d.getUTCDay()+6)%7;return addDays(on,-w);}
function weeklySummary(f,on=today()){
 const fim=addDays(on,6),ini=addDays(on,-7),ontem=addDays(on,-1);
 const contas=(f.management?.payables||[]).filter(p=>p.status==='open'&&p.dueDate>=on&&p.dueDate<=fim);
 const parcelas=[];for(const r of loansReport(f,on))for(const x of r.rows)if(x.status!=='paga'&&x.date>=on&&x.date<=fim)parcelas.push(x);
 const recorrentes=recurringDue(f,on,fim).filter(r=>!(f.management?.payables||[]).some(p=>p.id===r.id));
 const vencem=contas.length+parcelas.length+recorrentes.length,valor=round(contas.reduce((n,p)=>n+(Number(p.amount)||0),0)+parcelas.reduce((n,x)=>n+(Number(x.open)||0),0)+recorrentes.reduce((n,r)=>n+(Number(r.amount)||0),0));
 const ciclos=new Map((f.agriculture?.cycles||[]).map(c=>[c.id,c]));
 const sacas=round((f.agriculture?.harvests||[]).filter(h=>h.date>=ini&&h.date<=ontem).reduce((n,h)=>n+(Number(h.netKg)||0)/(ciclos.get(h.cycleId)?.bagKg||60),0),1);
 const fluxo=cashFlow(f,{months:6,on}),neg=fluxo.firstNegative?.month||null;
 const minimo=(f.stock||[]).filter(x=>Number(x.min)>0&&Number(x.quantity||0)<=Number(x.min)).length;
 const partes=[vencem?vencem+' conta(s) vencem':'nenhuma conta vence',sacas?String(sacas).replace('.',',')+' sc colhidas':null,neg?'caixa fica negativo em '+mesCurto(neg):'caixa positivo nos próximos 6 meses',minimo?minimo+' item(ns) no estoque mínimo':null].filter(Boolean);
 return {weekStart:weekStartOf(on),dueCount:vencem,dueAmount:valor,bags:sacas,firstNegative:neg,lowStock:minimo,
  push:'Resumo da semana: '+partes.join(' · ')+'.',
  title:'Resumo da semana: '+(vencem?vencem+' conta(s) vencem (R$ '+brl(valor)+')':'nenhuma conta vence nos próximos 7 dias')+(sacas?' · '+String(sacas).replace('.',',')+' sc colhidas nos últimos 7 dias':'')+' · '+(neg?'caixa fica negativo em '+mesCurto(neg):'caixa positivo nos próximos 6 meses')+(minimo?' · '+minimo+' item(ns) no estoque mínimo':'')};
}
function alerts(f,on=today()){const out=[...cashGapAlerts(f,on),...purchaseAlerts(f)];
 const dow=(new Date(on+'T12:00:00Z').getUTCDay()+6)%7;if(dow<=2){const w=weeklySummary(f,on);out.push({id:'weekly:'+w.weekStart,page:'resumo-dono',role:'ceo',severity:'info',pushAfterHour:7,open:{page:'resumo-dono'},push:w.push,title:w.title});}
 const rp=recurringPending(f,on).filter(r=>r.dueDate<=addDays(on,5));if(rp.length)out.push({id:'recurring:'+on.slice(0,7)+':'+rp.map(r=>r.id).sort().join(','),page:'fluxo-caixa',role:'ceo',severity:'attention',open:{page:'fluxo-caixa'},push:'Contas recorrentes do mês para lançar.',title:rp.length+' conta(s) recorrente(s) do mês ainda não lançada(s): '+rp.map(r=>r.supplier).slice(0,3).join(', ')});
 for(const x of expiringStock(f,on))out.push({id:'expires:'+x.item.id+':'+x.item.expires+':'+(x.left<0?'vencido':x.left<=7?7:30),page:'estoque',severity:x.left<=7?'high':'attention',title:x.item.item+(x.item.batch?' (lote '+x.item.batch+')':'')+(x.left<0?' está vencido':' vence em '+x.left+' dia(s)')+' · '+x.item.quantity+' '+x.item.unit+' em estoque'});
 // Checklist do trator: o último de cada equipamento, dos últimos 14 dias, com algum item com problema.
 const lastCheck=new Map();for(const r of (f.expansion?.fieldLogs||[]))if(r.kind==='checklist'&&!r.archived&&days(r.date,on)<=14){const p=lastCheck.get(r.equipmentId);if(!p||r.date>p.date||r.date===p.date&&String(r.createdAt||'')>String(p.createdAt||''))lastCheck.set(r.equipmentId,r);}
 for(const r of lastCheck.values()){const bad=(r.checks||[]).filter(c=>!c.ok);if(!bad.length)continue;const eq=[...(f.tractors||[]),...(f.implements||[])].find(x=>x.id===r.equipmentId);out.push({id:'checklist:'+r.id,page:'campo-completo',title:'Checklist '+(eq?.name||'do equipamento')+': '+bad.map(c=>c.item).join(', '),severity:'high'});}
for(const r of loansReport(f,on))for(const x of r.rows){if(x.status==='paga')continue;const left=days(on,x.date);if(left<=30)out.push({id:'loan:'+r.loan.id+':'+x.n+':'+(left<0?'late':left<=7?7:30),page:'financiamentos',title:(r.loan.kind==='cpr'?'CPR ':'Parcela ')+r.loan.name+(left<0?' atrasada':left===0?' vence hoje':' vence em '+left+' dias'),severity:left<=7?'high':'attention'});}
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

// ---------- 4.18: centro de custo, insumos da ordem de serviço e mínimo de estoque ----------
const normSupplier=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
// Centro de custo de uma saída: 'geral' (fazenda toda), 'cycle:<id>' (safra) ou 'lot:<id>' (lote). Grava também cycleId/lotId para o custo cair no destino.
function costCenterOf(r){return r.costCenter||(r.cycleId?'cycle:'+r.cycleId:r.lotId?'lot:'+r.lotId:'');}
function costCenterOptions(f,activity){const out=[['geral','Geral (fazenda toda)']];for(const c of (f.agriculture?.cycles||[]).filter(c=>c.activity===activity&&!c.archived))out.push(['cycle:'+c.id,'Safra · '+c.name]);if(activity==='cattle')for(const l of (f.cattle?.lots||[]).filter(l=>!l.archived))out.push(['lot:'+l.id,'Lote · '+l.name]);return out;}
// Sugestão pelo fornecedor: o centro de custo da última saída (ou conta a pagar) do mesmo fornecedor nesta atividade.
function suggestCostCenter(f,supplier,activity){const s=normSupplier(supplier);if(!s)return null;const rows=[...(f.finances||[]).filter(r=>r.type==='saida').map(r=>({who:r.supplier,cc:costCenterOf(r),date:r.date,activity:r.activity})),...(f.management?.payables||[]).map(r=>({who:r.supplier,cc:costCenterOf(r),date:r.dueDate,activity:r.activity}))].filter(r=>r.cc&&r.activity===activity&&normSupplier(r.who)===s).sort((a,b)=>String(b.date).localeCompare(String(a.date)));const valid=new Set(costCenterOptions(f,activity).map(o=>o[0]));const hit=rows.find(r=>valid.has(r.cc));return hit?{costCenter:hit.cc,date:hit.date}:null;}
// Contas recorrentes: uma conta a pagar por mês, no dia escolhido (ou no último dia do mês), com id fixo por mês.
function recurringDue(f,from,to){const out=[];for(const b of active(f,'recurringBills')){if(b.active===false)continue;let m=(b.start>from?b.start:from).slice(0,7)+'-01';const stop=(b.end&&b.end<to?b.end:to);for(let k=0;k<36&&m<=stop;k++,m=addMonths(m,1)){const last=Number(monthEnd(m.slice(0,7)).slice(8)),due=m.slice(0,8)+String(Math.min(b.dayOfMonth||1,last)).padStart(2,'0');if(due<b.start||due>stop||due<from)continue;const cc=b.costCenter||'geral';out.push({id:('rec_'+b.id+'_'+due.slice(0,7).replace('-','')).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100),activity:b.activity,supplier:b.supplier,description:b.description,amount:b.amount,dueDate:due,status:'open',costCenter:cc,...(cc.startsWith('cycle:')?{cycleId:cc.slice(6)}:cc.startsWith('lot:')?{lotId:cc.slice(4)}:{}),recurringId:b.id});}}return out;}
// Contas recorrentes deste mês (até hoje) que ainda não viraram conta a pagar.
function recurringPending(f,on=today()){const have=new Set((f.management?.payables||[]).map(p=>p.id));return recurringDue(f,on.slice(0,8)+'01',monthEnd(on.slice(0,7))).filter(r=>!have.has(r.id));}
// Validade dos insumos: vencido ou vencendo em até 30 dias, com saldo.
function expiringStock(f,on=today()){return (f.stock||[]).filter(s=>s.expires&&Number(s.quantity||0)>0).map(s=>({item:s,left:days(on,s.expires)})).filter(x=>x.left<=30).sort((a,b)=>a.left-b.left);}
function validateCosts(f){
 for(const b of active(f,'recurringBills')){check(b.supplier?.trim()&&b.description?.trim()&&num(b.amount)&&b.amount>0&&Number.isInteger(b.dayOfMonth)&&b.dayOfMonth>=1&&b.dayOfMonth<=31&&D.validDate(b.start)&&(!b.end||D.validDate(b.end)&&b.end>=b.start),'Conta recorrente: informe fornecedor, descrição, valor, dia do mês (1 a 31) e início.');const cc=b.costCenter||'geral';check(cc==='geral'||cc.startsWith('cycle:')&&(f.agriculture?.cycles||[]).some(c=>c.id===cc.slice(6)&&c.activity===b.activity)||cc.startsWith('lot:')&&b.activity==='cattle'&&(f.cattle?.lots||[]).some(l=>l.id===cc.slice(4)),'Centro de custo da conta recorrente inválido.');}
 for(const s of f.stock||[]){if(s.expires!=null&&s.expires!=='')check(D.validDate(s.expires),'Validade do insumo inválida.');if(s.batch!=null)check(typeof s.batch==='string'&&s.batch.length<=40,'Lote do insumo longo demais.');}
 const cycles=new Map((f.agriculture?.cycles||[]).map(c=>[c.id,c])),lots=new Set((f.cattle?.lots||[]).map(l=>l.id)),stock=new Map((f.stock||[]).map(s=>[s.id,s]));
 for(const r of f.finances||[]){
  if(r.supplier!=null)check(typeof r.supplier==='string'&&r.supplier.length<=120,'Fornecedor longo demais.');
  if(r.costCenter==null)continue;
  check(r.type==='saida','Centro de custo só vale para saídas.');
  if(r.costCenter==='geral'){check(!r.cycleId&&!r.lotId,'Saída geral não pode ter safra ou lote.');continue;}
  const [kind,id]=String(r.costCenter).split(':');
  if(kind==='cycle')check(cycles.get(id)?.activity===(r.activity||'coffee')&&r.cycleId===id&&!r.lotId,'Safra do centro de custo inválida.');
  else if(kind==='lot')check(lots.has(id)&&r.lotId===id&&!r.cycleId&&(r.activity||'coffee')==='cattle','Lote do centro de custo inválido.');
  else check(false,'Centro de custo inválido.');
 }
 // 4.19: o funcionário do campo não recebe o estoque, e um item pode ter sido removido depois; só confere o item quando ele está na lista.
 for(const o of f.expansion?.workOrders||[]){if(o.inputs==null)continue;check(Array.isArray(o.inputs)&&o.inputs.length<=30,'Insumos da ordem inválidos.');for(const i of o.inputs){const s=stock.get(i?.stockId);check(typeof i?.stockId==='string'&&i.stockId&&i.stockId.length<=100&&(!s||(s.activity||'coffee')===o.activity)&&(s||!stock.size||i.itemName)&&num(i.quantity)&&i.quantity>0&&i.quantity<=1e7&&(i.itemName==null||typeof i.itemName==='string'&&i.itemName.length<=120)&&(i.unit==null||typeof i.unit==='string'&&i.unit.length<=20)&&(i.skipped==null||typeof i.skipped==='boolean'),'Insumo da ordem de serviço inválido.');}check(new Set(o.inputs.map(i=>i.stockId)).size===o.inputs.length,'Insumo repetido na ordem de serviço.');}
 for(const s of f.stock||[])if(s.countedAt!=null)check(D.validDate((v=>{v=String(v??'');return v.length<=10||isNaN(Date.parse(v))?v.slice(0,10):new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(v))})(s.countedAt)),'Data da conferência do estoque inválida.');
}
// Baixa dos insumos de uma ordem concluída: um consumo por item, com identificador fixo (não baixa duas vezes).
const orderUseId=(orderId,stockId)=>('os_'+orderId+'_'+stockId).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);
// 4.19: a baixa usa o que foi realmente gasto. Cada insumo previsto vira um consumo por lote (embalagem) de onde saiu;
// a sobra fica no estoque. Insumo informado como não usado fica marcado na ordem (skipped) e sai das pendências.
const sameProduct=(a,b)=>(a.activity||'coffee')===(b.activity||'coffee')&&normSupplier(a.item)===normSupplier(b.item)&&String(a.unit||'')===String(b.unit||'');
function orderInputDone(f,order,input){return Boolean(input.skipped)||(f.operations?.stockUses||[]).some(u=>u.workOrderId===order.id&&(u.inputStockId||u.stockId)===input.stockId);}
function orderPendingInputs(f,order){return (order.inputs||[]).filter(i=>!orderInputDone(f,order,i));}
// Lotes do mesmo produto (mesmo nome e unidade): com saldo e dentro da validade primeiro, o que vence antes na frente.
function orderLotOptions(f,stockId,on=today()){const base=(f.stock||[]).find(s=>s.id===stockId);if(!base)return [];return (f.stock||[]).filter(s=>s.id===stockId||sameProduct(s,base)).map(s=>({item:s,expired:Boolean(s.expires&&s.expires<on),daysLeft:s.expires?days(on,s.expires):null})).sort((a,b)=>(a.expired-b.expired)||((Number(b.item.quantity)>0)-(Number(a.item.quantity)>0))||String(a.item.expires||'9999').localeCompare(String(b.item.expires||'9999'))||(a.item.id===stockId?-1:b.item.id===stockId?1:0));}
// O que o funcionário informou ao concluir a ordem no campo (o andamento "Concluída" mais recente com quantidades).
function orderFieldUsage(f,order){const ev=(f.expansion?.workOrderEvents||[]).filter(e=>e.orderId===order.id&&e.status==='done'&&Array.isArray(e.used)).sort((a,b)=>a.date.localeCompare(b.date)||String(a.createdAt||'').localeCompare(String(b.createdAt||''))).at(-1);return ev?{date:ev.date,by:ev.recordedBy,used:new Map(ev.used.map(u=>[u.stockId,Number(u.quantity)]))}:null;}
// usage: [{stockId (insumo previsto), lots:[{stockId (lote), quantity}]}] devolve {uses, skipped, warnings}.
// Sem usage, baixa o previsto do próprio item, como na 4.18 (devolve só a lista de consumos).
function orderStockUses(f,order,date,usage){
 const stock=new Map((f.stock||[]).map(s=>[s.id,s])),target={...(order.lotId&&order.activity==='cattle'?{lotId:order.lotId}:{}),...(order.cycleId?{cycleId:order.cycleId}:{})};
 const plan=orderPendingInputs(f,order).map(i=>({input:i,lots:usage?(usage.find(u=>u.stockId===i.stockId)?.lots||[]):[{stockId:i.stockId,quantity:i.quantity}]}));
 const uses=[],skipped=[],warnings=[],taken=new Map();
 for(const {input,lots} of plan){
  const base=stock.get(input.stockId);let total=0;
  for(const l of lots){
   const q=Number(l.quantity);if(l.quantity==null||l.quantity===''||q===0)continue;check(Number.isFinite(q)&&q>0&&q<=1e7,'Informe quantidades válidas.');
   const lot=stock.get(l.stockId);check(lot&&(lot.id===input.stockId||base&&sameProduct(lot,base)),'O lote escolhido não é do mesmo insumo.');
   const sum=round((taken.get(lot.id)||0)+q,3);check(sum<=Number(lot.quantity||0)+1e-9,`Saldo insuficiente em ${lot.item}${lot.batch?' (lote '+lot.batch+')':''}: há ${lot.quantity} ${lot.unit}.`);taken.set(lot.id,sum);total=round(total+q,3);
   if(lot.expires&&lot.expires<date)warnings.push(`${lot.item}${lot.batch?' lote '+lot.batch:''} venceu em ${lot.expires.split('-').reverse().join('/')}.`);
   uses.push({id:orderUseId(order.id,lot.id===input.stockId?input.stockId:input.stockId+'_'+lot.id),activity:order.activity,date,stockId:lot.id,inputStockId:input.stockId,plannedQuantity:input.quantity,quantity:round(q,3),...(lot.batch?{batch:lot.batch}:{}),reason:'Ordem de serviço: '+order.title+(lot.batch?' · lote '+lot.batch:''),workOrderId:order.id,...target});
  }
  if(!total)skipped.push(input.stockId);
  else if(total>input.quantity*1.2)warnings.push(`${base?.item||input.itemName||'Insumo'}: usado ${total} ${base?.unit||input.unit||''}, ${Math.round((total/input.quantity-1)*100)}% acima do previsto (${input.quantity}).`);
 }
 const used=new Set((f.operations?.stockUses||[]).map(u=>u.id)),fresh=uses.filter(u=>!used.has(u.id));
 return usage?{uses:fresh,skipped,warnings}:fresh;
}
// Mínimo sugerido pelo consumo real: média diária dos últimos 90 dias × dias de cobertura (padrão 30). Só vale
// usar depois de conferir o saldo físico nos últimos 30 dias.
function suggestedMin(f,item,on=today(),coverDays=30){const from=addDays(on,-90),uses=(f.operations?.stockUses||[]).filter(u=>u.stockId===item.id&&u.date>=from&&u.date<=on),used=uses.reduce((n,u)=>n+(Number(u.quantity)||0),0),perDay=used/90;const counted=item.countedAt?(v=>{v=String(v??'');return v.length<=10||isNaN(Date.parse(v))?v.slice(0,10):new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(v))})(item.countedAt):null;return {used90:round(used,3),perMonth:round(perDay*30,3),suggested:used>0?Math.ceil(perDay*coverDays*100)/100:null,countedAt:counted,countedRecently:Boolean(counted&&days(counted,on)<=30&&counted<=on)};}

// ---------- 4.18: fechamento do mês e margem por hectare ----------
const monthEnd=m=>{const [y,mm]=m.split('-').map(Number);return new Date(Date.UTC(y,mm,0)).toISOString().slice(0,10);};
const weekOf=date=>{const d=new Date(date+'T12:00:00Z'),dow=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-dow);return d.toISOString().slice(0,10);};
// Custo de uma fonte que caiu "sem destino": separa o Geral escolhido de propósito do que ninguém definiu.
function isChosenGeneral(f,key){if(!key.startsWith('finance:'))return false;const r=(f.finances||[]).find(x=>'finance:'+x.id===key);return r?.costCenter==='geral';}
function monthClose(f,month,X,on=today()){
 const from=month+'-01',to=monthEnd(month),inMonth=d=>d>=from&&d<=to,fin=(f.finances||[]).filter(r=>!r.archived&&inMonth(r.date||''));
 const income=round(fin.filter(r=>r.type==='entrada').reduce((n,r)=>n+(Number(r.value)||0),0)),spend=round(fin.filter(r=>r.type==='saida').reduce((n,r)=>n+(Number(r.value)||0),0));
 const lines=X?X.costLines(f,{from,to}):[],byTarget=new Map(),cycles=new Map((f.agriculture?.cycles||[]).map(c=>[c.id,c])),lots=new Map((f.cattle?.lots||[]).map(l=>[l.id,l]));
 let general=0;const noTarget=[];
 for(const l of lines){if(l.type==='unallocated'){if(isChosenGeneral(f,l.key))general+=l.amount;else noTarget.push({label:l.label,date:l.date,amount:round(l.amount),category:l.category});continue;}const name=l.type==='cycle'?'Safra · '+(cycles.get(l.id)?.name||'removida'):l.type==='lot'?'Lote · '+(lots.get(l.id)?.name||'removido'):l.type==='dairy'?'Leite':l.type;byTarget.set(name,round((byTarget.get(name)||0)+l.amount));}
 const pend=[],add=(kind,text,amount)=>pend.push({kind,text,...(amount!=null?{amount:round(amount)}:{})});
 for(const p of f.management?.payables||[])if(p.status==='open'&&p.dueDate<=to)add(p.dueDate<on?'Conta vencida':'Conta do mês em aberto',p.supplier+' · '+p.description+' · vence '+p.dueDate.split('-').reverse().join('/'),p.amount);
 for(const s of f.agriculture?.sales||[])for(const i of s.installments||[]){const paid=(f.operations?.payments||[]).filter(r=>r.saleId===s.id&&r.installmentId===i.id).reduce((n,r)=>n+r.amount,0);if(i.amount-paid>0.009&&i.date<=to)add(i.date<on?'Recebimento atrasado':'Recebimento do mês',(s.buyer||'Venda')+' · '+i.date.split('-').reverse().join('/'),i.amount-paid);}
 for(const o of f.expansion?.workOrders||[]){if(o.archived||!(o.inputs||[]).length)continue;const st=X?X.orderStatus(f,o.id):'';const pending=orderPendingInputs(f,o);if(st==='done'&&pending.length)add('Ordem concluída sem baixa',o.title+' · '+pending.length+' insumo(s)');}
 const closed=new Set((f.labor?.closings||[]).map(c=>c.weekStart)),weeks=new Set((f.labor?.entries||[]).filter(e=>!e.voided&&inMonth(e.date)).map(e=>weekOf(e.date)));for(const w of [...weeks].sort())if(!closed.has(w)&&addDays(w,6)<on)add('Semana da colheita sem fechamento','Semana de '+w.split('-').reverse().join('/'));
 for(const s of f.stock||[])if(Number(s.min)>0&&Number(s.quantity||0)<=Number(s.min))add('Estoque no mínimo',s.item+' · '+s.quantity+' '+s.unit+' (mínimo '+s.min+')');
 for(const r of f.expansion?.fieldLogs||[])if(r.kind==='checklist'&&!r.archived&&inMonth(r.date)&&(r.checks||[]).some(c=>!c.ok))add('Checklist com problema',(r.checks||[]).filter(c=>!c.ok).map(c=>c.item).join(', ')+' · '+r.date.split('-').reverse().join('/'));
 const noCenter=fin.filter(r=>r.type==='saida'&&!r.costCenter&&!r.cycleId&&!r.lotId&&!r.sourcePayableId&&!r.noteId&&!r.sourceLaborAdjustmentId&&!r.toStock);if(noCenter.length)add('Saídas sem centro de custo',noCenter.length+' lançamento(s) · R$ '+brl(noCenter.reduce((n,r)=>n+(Number(r.value)||0),0)));
 return {month,from,to,income,spend,result:round(income-spend),costs:[...byTarget].map(([name,amount])=>({name,amount})).sort((a,b)=>b.amount-a.amount),general:round(general),noTarget,noTargetTotal:round(noTarget.reduce((n,r)=>n+r.amount,0)),pendencies:pend};
}
// Margem por hectare com o mesmo período, cultura e critério de custo para todas as fazendas. Receita: vendas do período.
// Custo direto: o que foi lançado na safra. Com "general", o custo Geral do período da atividade é dividido entre as safras pela área.
function marginReport(farms,X,{from,to,crop,general=false}){
 const out=[];for(const f of farms){const cycles=(f.agriculture?.cycles||[]).filter(c=>!c.archived&&c.crop===crop);if(!cycles.length)continue;const activity=cycles[0].activity,inP=d=>d>=from&&d<=to;
  const rows=cycles.map(c=>{const revenue=round((f.agriculture.sales||[]).filter(s=>s.cycleId===c.id&&inP(s.date)).reduce((n,s)=>n+s.kg*(Number(s.pricePerKg)||0),0)),direct=X?round(X.costLines(f,{activity,from,to,targetType:'cycle',targetId:c.id}).reduce((n,l)=>n+l.amount,0)):0,kg=(f.agriculture.harvests||[]).filter(h=>h.cycleId===c.id&&inP(h.date)).reduce((n,h)=>n+h.netKg,0);return {cycleId:c.id,name:c.name,areaHa:Number(c.areaHa)||0,revenue,direct,bags:round(kg/(c.bagKg||60),2)};}).filter(r=>r.revenue||r.direct||r.bags);
  if(!rows.length)continue;const area=rows.reduce((n,r)=>n+r.areaHa,0);
  const gen=general&&X?round(X.costLines(f,{activity,from,to,targetType:'unallocated'}).filter(l=>isChosenGeneral(f,l.key)).reduce((n,l)=>n+l.amount,0)):0;
  for(const r of rows){r.general=area>0?round(gen*r.areaHa/area):0;r.cost=round(r.direct+r.general);r.margin=round(r.revenue-r.cost);r.marginHa=r.areaHa>0?round(r.margin/r.areaHa):null;}
  const t=k=>round(rows.reduce((n,r)=>n+r[k],0));out.push({farmId:f.id,farm:f.name,areaHa:round(area,2),revenue:t('revenue'),direct:t('direct'),general:t('general'),cost:t('cost'),margin:t('margin'),bags:t('bags'),marginHa:area>0?round(t('margin')/area):null,rows});}
 return out.sort((a,b)=>(b.marginHa??-Infinity)-(a.marginHa??-Infinity));
}

return {parseBleWeight,parseScaleText,stableWeight,weeklySummary,weekStartOf,PAGES,META,recurringDue,recurringPending,expiringStock,monthClose,marginReport,monthEnd,cashGapAlerts,purchaseAlerts,alertLink,normSupplier,costCenterOf,costCenterOptions,suggestCostCenter,validateCosts,orderUseId,orderStockUses,orderInputDone,orderPendingInputs,orderLotOptions,orderFieldUsage,suggestedMin,GLOBAL_KEYS,REGIMES,ENTRY_KINDS,LOAN_KINDS,LOAN_SYSTEMS,CONTRACTOR_SERVICES,CONTRACTOR_UNITS,ANIMAL_STATUS,EVENT_KINDS,TEMPLATES,CORE_PAGES,
 validate,partnershipReport,plotsArea,taxSetting,rates,funrural,funruralReport,loanSchedule,loansReport,leaseYearValue,leaseDueDates,leaseCostRows,contractorAmount,contractorCostRows,contractorComparison,
 animalHistory,animalWeight,milkIndicators,sisbovRows,csv,parseScale,cashFlow,alerts,hiddenPages,benchmark,farmIndicators,quantile,addMonths};
});
