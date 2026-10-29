(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SubscriptionDomain=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const activities=[{id:'coffee',name:'Café'},{id:'cattle',name:'Gado'},{id:'grains',name:'Grãos',detail:'Soja, milho e trigo'}];
 function normalize(input){
  if(!Array.isArray(input)||input.length<1||input.length>3||new Set(input).size!==input.length||input.some(a=>!activities.some(x=>x.id===a)))throw Object.assign(new Error('Escolha de uma a três atividades válidas.'),{statusCode:400});
  return activities.map(a=>a.id).filter(id=>input.includes(id));
 }
 function licensed(state){return state?.subscriptionActivities===undefined?activities.map(a=>a.id):normalize(state.subscriptionActivities);}
 function key(input){return normalize(input).join('+');}
 function quote(planId,cycle,selection,pricing){
  const chosen=normalize(selection),monthly=pricing?.[planId]?.[key(chosen)];
  if(typeof monthly!=='number'||!Number.isFinite(monthly)||monthly<=0)return {ready:false,activities:chosen,monthly:null,amount:null};
  const round=n=>Math.round((n+Number.EPSILON)*100)/100;
  // Valor por mês com o desconto do período, arredondado para baixo em reais inteiros (tabela: R$ 149 → R$ 141 no trimestral).
  const perMonth=cycle.discount?Math.floor(round(monthly*(1-cycle.discount))):round(monthly);
  return {ready:true,activities:chosen,monthly:round(monthly),perMonth,amount:round(perMonth*cycle.months)};
 }
 function parsePricing(value){
  if(!value)return {};
  let parsed;try{parsed=JSON.parse(value);}catch{throw Error('ACTIVITY_PRICES_JSON deve ser um JSON válido.');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Tabela de preços inválida.');
  for(const [plan,rows] of Object.entries(parsed)){
   if(!['essential','pro','group'].includes(plan)||!rows||typeof rows!=='object'||Array.isArray(rows))throw Error('Porte inválido na tabela de preços.');
   for(const [combination,price] of Object.entries(rows)){
    if(key(combination.split('+'))!==combination)throw Error('Use a ordem coffee+cattle+grains nas combinações.');
    if(price!==null&&(typeof price!=='number'||!Number.isFinite(price)||price<=0))throw Error('Os valores devem ser positivos ou null para a definir.');
   }
  }
  return parsed;
 }
 return {activities,normalize,licensed,key,quote,parsePricing};
});
