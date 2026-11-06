/* Leitura da produção registrada. Não altera safras, preços ou lançamentos. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SeasonComparison=factory();})(globalThis,function(){
 'use strict';
 const month=d=>{if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d+'T12:00:00Z')))return null;return Number(d.slice(0,4))*12+Number(d.slice(5,7))-1;};
 function series(farm,cycle,{bagKg=60,metric='sacks',asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date())}={}){
  if(!cycle||!['coffee','grains'].includes(cycle.activity)||!Number.isFinite(bagKg)||bagKg<=0||!['sacks','yield'].includes(metric))return null;
  const start=month(cycle.startDate),today=month(asOf),area=Number(cycle.areaHa);
  if(start===null||today===null||metric==='yield'&&!(Number.isFinite(area)&&area>0))return null;
  const monthly=Array(36).fill(0);let recorded=0,excluded=0;
  for(const h of farm.agriculture?.harvests||[]){if(h.cycleId!==cycle.id)continue;const m=month(h.date),kg=Number(h.netKg);if(m===null||!Number.isFinite(kg)||kg<0||h.date>asOf)continue;const i=m-start;if(h.date<cycle.startDate||i<0||i>=36){excluded++;continue;}monthly[i]+=kg;recorded++;}
  let sum=0;const elapsed=Math.max(0,Math.min(36,today-start+1));
  const values=monthly.map((kg,i)=>{sum+=kg;return i<elapsed?sum/bagKg/(metric==='yield'?area:1):null;});
  return {id:farm.id+'|'+cycle.id,name:cycle.name,farmName:farm.name,crop:cycle.crop,startDate:cycle.startDate,values,monthly,recorded,excluded,bagKg,areaHa:area,lastMonth:Math.max(11,monthly.findLastIndex(v=>v>0)),elapsed};
 }
 function compare(a,b,options){
  if(!a||!b||a.cycle.activity!==b.cycle.activity||a.cycle.crop!==b.cycle.crop||a.farm.id===b.farm.id&&a.cycle.id===b.cycle.id)return null;
  const first=series(a.farm,a.cycle,options),second=series(b.farm,b.cycle,options);if(!first||!second)return null;
  const length=Math.min(36,Math.max(12,first.lastMonth+1,second.lastMonth+1));
  return {series:[first,second].map(s=>({...s,values:s.values.slice(0,length)})),length,labels:Array.from({length},(_,i)=>'Mês '+(i+1)),maximum:Math.max(0,...first.values.slice(0,length).filter(v=>v!==null),...second.values.slice(0,length).filter(v=>v!==null)),bagKg:first.bagKg};
 }
 return {series,compare};
});
