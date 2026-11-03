(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EquipmentInsights=api;})(globalThis,function(){
 'use strict';
 const number=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
 const round=v=>Math.round(v*1000)/1000;
 function monthly(farms,end){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(end))throw Error('Mês inválido');const rows=[];for(let i=5;i>=0;i--){const d=new Date(end+'-15T12:00:00Z');d.setUTCMonth(d.getUTCMonth()-i);rows.push({month:d.toISOString().slice(0,7),litres:0});}for(const f of farms||[])for(const r of f.management?.fuel||[]){if(r.voided||r.archived||!date(r.date)||!number(r.litres))continue;const row=rows.find(m=>r.date.startsWith(m.month));if(row)row.litres+=r.litres;}return rows.map(r=>({...r,litres:round(r.litres)}));}
 function summary(farms,id,today){const fuel=[],work=[],maintenance=[],events=[];for(const f of farms||[]){for(const r of f.management?.fuel||[])if(r.equipmentId===id&&!r.voided&&!r.archived&&date(r.date)&&r.date<=today&&number(r.litres)){fuel.push({...r,farmName:f.name});events.push({date:r.date,title:'Abastecimento',detail:round(r.litres)+' L · '+f.name});}for(const r of f.routine?.work||[])if(r.equipmentId===id&&!r.voided&&date(r.date)&&r.date<=today){work.push(r);events.push({date:r.date,title:'Atividade registrada',detail:(r.machineHours??0)+' h · '+f.name});}for(const r of f.management?.maintenance||[])if(r.equipmentId===id&&!r.voided&&!r.archived&&r.status==='scheduled')maintenance.push({...r,farmName:f.name});}
 fuel.sort((a,b)=>a.date.localeCompare(b.date)||String(a.at||a.id||'').localeCompare(String(b.at||b.id||'')));
 const meters=[...fuel.map(r=>r.meter),...work.map(r=>r.endMeter)].filter(number),meter=meters.length?Math.max(...meters):null;
 maintenance.sort((a,b)=>{const da=number(a.nextMeter)&&meter!==null?a.nextMeter-meter:Infinity,db=number(b.nextMeter)&&meter!==null?b.nextMeter-meter:Infinity;return da-db||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'));});
 // Comparar marcadores sem a unidade explícita pode misturar horas e km.
 // Por isso a média usa somente intervalos de trabalho registrados em horas.
 const hours=work.filter(r=>number(r.startMeter)&&number(r.endMeter)&&r.endMeter>r.startMeter).sort((a,b)=>a.startMeter-b.startMeter);
 let consumption=null;if(hours.length){const start=hours[0].date,end=hours.map(r=>r.date).sort().at(-1),selected=fuel.filter(r=>r.date>=start&&r.date<=end),valid=hours.every((r,i)=>!i||r.startMeter>=hours[i-1].endMeter);const totalHours=hours.reduce((n,r)=>n+(number(r.machineHours)?r.machineHours:0),0);if(valid&&totalHours>0&&selected.length)consumption=round(selected.reduce((n,r)=>n+r.litres,0)/totalHours);}
 events.sort((a,b)=>b.date.localeCompare(a.date));return {meter,totalLitres:round(fuel.reduce((n,r)=>n+r.litres,0)),lastFuel:fuel.at(-1)||null,nextMaintenance:maintenance[0]||null,consumption,events};
 }
 return {monthly,summary};
});
