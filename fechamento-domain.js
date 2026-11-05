/* 4.19 · Fechamento do mês confirmado pelo CEO. Regras compartilhadas pelo navegador e pelo servidor.
   - Só o CEO fecha e reabre. Fechar guarda uma versão do relatório, calculada no servidor, com código de conferência.
   - Reabrir exige motivo. Versões e reaberturas não podem ser apagadas nem reescritas.
   - Mês fechado fica travado: lançamentos de dinheiro, despesas, consumos de estoque e recebimentos com data nele
     não podem ser criados, alterados nem apagados até o CEO reabrir. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./melhorias-domain'):root.RuralMelhorias);if(node)module.exports=api;else root.RuralFechamento=api;})(globalThis,function(M){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),check=(ok,message)=>{if(!ok)throw Object.assign(new Error(message),{statusCode:422});};
const today=()=>new Date().toISOString().slice(0,10);
const MONTHS=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const monthName=m=>MONTHS[Number(m.slice(5,7))-1]+' de '+m.slice(0,4);
// O que o mês fechado trava: listas da fazenda com data e os campos que mudam valor, destino ou quantidade.
const LOCKED=[
 ['Lançamento do Financeiro',f=>f.finances],
 ['Despesa',f=>f.operations?.expenses],
 ['Consumo de estoque',f=>f.operations?.stockUses],
 ['Recebimento',f=>f.operations?.payments]
];
const KEYS=['date','type','value','amount','category','description','costCenter','cycleId','lotId','stockId','quantity','cost','archived','voided','saleId','installmentId','activity'];
const pick=r=>JSON.stringify(KEYS.map(k=>r?.[k]??null));
const list=f=>Array.isArray(f.monthClosings)?f.monthClosings:[];
const closing=(f,month)=>list(f).find(c=>c.month===month);
function isClosed(f,date){const c=closing(f,String(date||'').slice(0,7));return Boolean(c&&c.status==='closed');}
const lastVersion=c=>(c?.versions||[]).at(-1)||null;
const code=hash=>String(hash||'').slice(0,12).toUpperCase().replace(/(.{4})(?=.)/g,'$1-');
// O relatório guardado é o mesmo do Fechamento do mês, com listas limitadas para o registro não crescer sem fim.
function snapshot(f,month,X,on){const r=M.monthClose(f,month,X,on);r.noTarget=r.noTarget.slice(0,300);r.pendencies=r.pendencies.slice(0,300);r.costs=r.costs.slice(0,100);r.farm=f.name;return r;}

// Mudanças que caem em mês fechado (antes e depois). Devolve a primeira encontrada, para a mensagem dizer o que foi.
function violation(before,after){
 const months=new Set(list(before).filter(c=>c.status==='closed'&&closing(after,c.month)?.status==='closed').map(c=>c.month));
 if(!months.size)return null;
 const hit=d=>months.has(String(d||'').slice(0,7));
 for(const [label,get] of LOCKED){
  const old=new Map((get(before)||[]).map(r=>[String(r.id),r])),now=new Map((get(after)||[]).map(r=>[String(r.id),r]));
  for(const [id,r] of now){const was=old.get(id);if(was?pick(was)!==pick(r)&&(hit(was.date)||hit(r.date)):hit(r.date))return {label,month:String((was&&hit(was.date)?was:r).date).slice(0,7)};}
  for(const [id,r] of old)if(!now.has(id)&&hit(r.date))return {label,month:String(r.date).slice(0,7)};
 }
 return null;
}

// Servidor: carimba versões e reaberturas, recusa o que não pode e trava o mês fechado.
// X é a API de RuralExpansion (para o relatório) e hash(texto) devolve o SHA-256 em hexadecimal.
function prepare(before,after,user,{X,hash,now=new Date().toISOString()}={}){
 const on=now.slice(0,10);
 for(const f of after.farms||[]){
  const old=(before.farms||[]).find(x=>x.id===f.id)||{},prior=list(old);
  if(user.role!=='ceo'){if(old.monthClosings===undefined)delete f.monthClosings;else f.monthClosings=clone(old.monthClosings);}
  else{
   const next=f.monthClosings==null?[]:f.monthClosings;check(Array.isArray(next)&&next.length<=600,'Fechamentos inválidos.');
   for(const p of prior)check(next.some(c=>c.month===p.month),'O histórico de fechamento de '+monthName(p.month)+' não pode ser apagado.');
   check(new Set(next.map(c=>c?.month)).size===next.length,'Mês repetido nos fechamentos.');
   f.monthClosings=next.map(c=>{
    check(c&&/^\d{4}-(0[1-9]|1[0-2])$/.test(c.month)&&['closed','reopened'].includes(c.status),'Fechamento inválido.');
    const was=prior.find(p=>p.month===c.month),versions=Array.isArray(c.versions)?c.versions:[],reopenings=Array.isArray(c.reopenings)?c.reopenings:[];
    const oldV=was?.versions||[],oldR=was?.reopenings||[];
    check(oldV.every((v,i)=>versions[i]&&versions[i].hash===v.hash&&versions[i].n===v.n),'Versão já enviada do fechamento não pode ser alterada.');
    check(oldR.every((r,i)=>reopenings[i]&&reopenings[i].at===r.at&&reopenings[i].reason===r.reason),'Reabertura registrada não pode ser alterada.');
    const out={id:'close_'+c.month,month:c.month,status:c.status,versions:clone(oldV),reopenings:clone(oldR)};
    const status=was?.status||'open';
    if(c.status===status){check(versions.length===oldV.length&&reopenings.length===oldR.length,'Fechamento sem mudança de situação.');return out;}
    if(c.status==='closed'){
     check(versions.length===oldV.length+1&&reopenings.length===oldR.length,'Feche o mês uma vez de cada vez.');
     check(M.monthEnd(c.month)<on,'Só dá para fechar um mês que já terminou.');
     const report=snapshot(f,c.month,X,on),n=oldV.length+1,body=JSON.stringify({farmId:f.id,month:c.month,n,report});
     out.versions.push({n,closedAt:now,closedBy:user.name||user.username,pendencies:report.pendencies.length,report,hash:hash?hash(body):''});
     out.closedAt=now;out.closedBy=user.name||user.username;return out;
    }
    check(status==='closed'&&versions.length===oldV.length&&reopenings.length===oldR.length+1,'Reabra o mês com um motivo.');
    const reason=String(reopenings.at(-1)?.reason||'').trim().slice(0,300);check(reason.length>=5,'Escreva o motivo da reabertura (pelo menos 5 letras).');
    out.reopenings.push({at:now,by:user.name||user.username,reason,version:oldV.length});return out;
   });
   if(!f.monthClosings.length&&old.monthClosings===undefined)delete f.monthClosings;
  }
  const bad=violation(old,f);
  check(!bad,bad&&`${monthName(bad.month)} está fechado pelo CEO: ${bad.label.toLowerCase()} com data nesse mês não pode ser incluído, alterado ou apagado. Peça ao CEO para reabrir o mês.`);
 }
 return after;
}
// O que cada pessoa recebe: CEO e ADM com dinheiro liberado veem as versões; os outros só sabem quais meses estão fechados.
function project(f,full){if(!f.monthClosings)return f;f.monthClosings=full?clone(f.monthClosings):f.monthClosings.map(c=>({id:c.id,month:c.month,status:c.status}));return f;}

return {LOCKED,isClosed,closing,lastVersion,code,monthName,snapshot,violation,prepare,project};
});
