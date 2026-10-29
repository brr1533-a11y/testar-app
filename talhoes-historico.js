let plotHistoryFilter={plot:'',source:'',from:'',to:''};
function openPlotHistory(farmId,plotId){plotHistoryFilter={plot:farmId+'|'+plotId,source:'',from:'',to:''};goToPage('historico-talhoes');}
function renderPlotHistory(){
 if(!['ceo','adm'].includes(currentUser.role)||selectedType()==='cattle')return;
 const farms=farmsInContext(),activity=selectedType();
 const plots=farms.flatMap(farm=>(farm.talhoes||[]).map(plot=>({farm,plot,key:farm.id+'|'+plot.id})));
 if(plotHistoryFilter.plot&&!plots.some(p=>p.key===plotHistoryFilter.plot))plotHistoryFilter.plot='';
 const all=plots.flatMap(p=>PlotHistory.events(p.farm,p.plot.id,activity).map(event=>({...p,event})));
 const rows=all.filter(r=>(!plotHistoryFilter.plot||r.key===plotHistoryFilter.plot)&&(!plotHistoryFilter.source||r.event.source===plotHistoryFilter.source)&&(!plotHistoryFilter.from||r.event.date>=plotHistoryFilter.from)&&(!plotHistoryFilter.to||r.event.date<=plotHistoryFilter.to)).sort((a,b)=>String(b.event.date).localeCompare(String(a.event.date))||String(b.event.createdAt).localeCompare(String(a.event.createdAt)));
 setHeader('HISTÓRICO DO CAMPO','Procedimentos por talhão');
 $('#pageContent').innerHTML=`<div class="hero-surface"><div><span class="eyebrow">${farmTypeLabel().toUpperCase()}</span><h2>O que já foi registrado em cada talhão.</h2><p>Procedimentos manuais, trabalhos da equipe, aplicações concluídas, colheitas e análises laboratoriais vinculadas ao local. Cada origem fica identificada.</p></div></div>
 <form id="plotHistoryFilters" class="card rural-filters"><label>Talhão<select name="plot"><option value="">Todos os talhões do contexto</option>${plots.map(p=>`<option value="${escapeHTML(p.key)}" ${p.key===plotHistoryFilter.plot?'selected':''}>${escapeHTML(p.farm.name)} · ${escapeHTML(p.plot.name)}</option>`).join('')}</select></label><label>Origem<select name="source"><option value="">Todas</option>${[['manual','Procedimento manual'],['work','Trabalho da equipe'],['application','Aplicação concluída'],['harvest','Colheita'],['analysis','Análise laboratorial']].map(([id,label])=>`<option value="${id}" ${plotHistoryFilter.source===id?'selected':''}>${label}</option>`).join('')}</select></label><label>De<input name="from" type="date" value="${escapeHTML(plotHistoryFilter.from)}"></label><label>Até<input name="to" type="date" value="${escapeHTML(plotHistoryFilter.to)}"></label><button class="btn primary">Filtrar</button></form>
 <div class="section-head"><div><h2>${rows.length} registro(s)</h2><p>Registros anulados permanecem no histórico, com o motivo.</p></div><div class="row-actions"><button type="button" id="newPlotProcedure" class="btn primary" ${plots.length?'':'disabled'}>Registrar procedimento</button><button type="button" id="exportPlotHistory" class="btn">Exportar CSV</button></div></div>
 ${!plots.length?'<div class="card empty">Cadastre um talhão na fazenda para começar o histórico.</div>':''}
 <div class="plot-timeline">${rows.map(({farm,plot,event:e})=>`<article class="card plot-event ${e.voided?'plot-event-void':''}"><div class="inline"><span class="badge ${e.voided?'red':'green'}">${escapeHTML(e.status)}</span><span class="badge">${escapeHTML(e.origin)}</span><time class="right">${dateBR(e.date)}</time></div><h3>${escapeHTML(e.title)}</h3><p class="muted">${escapeHTML(farm.name)} · ${escapeHTML(plot.name)} · ${escapeHTML(farmTypeLabel())}</p><dl class="rural-facts"><div><dt>Procedimento</dt><dd>${escapeHTML(e.type)}</dd></div><div><dt>Responsável informado</dt><dd>${escapeHTML(e.responsible)}</dd></div>${e.inputs?`<div><dt>Insumos / equipamentos registrados</dt><dd>${escapeHTML(e.inputs)}</dd></div>`:''}${e.recordedByName?`<div><dt>Registrado por</dt><dd>${escapeHTML(e.recordedByName)}</dd></div>`:''}</dl>${e.notes?`<p>${escapeHTML(e.notes)}</p>`:''}${e.voided?`<p class="muted"><strong>Anulação:</strong> ${escapeHTML(e.voidReason)} · ${escapeHTML(e.voidedBy||'')}</p>`:''}${e.source==='manual'&&!e.voided?`<button type="button" class="btn small danger void-plot-procedure" data-farm="${escapeHTML(farm.id)}" data-id="${escapeHTML(e.id)}">Anular com motivo</button>`:''}</article>`).join('')|| (plots.length?'<div class="card empty">Nenhum procedimento neste filtro.</div>':'')}</div>`;
 $('#plotHistoryFilters').onsubmit=e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.target));if(values.from&&values.to&&values.from>values.to)return toast('A data inicial deve ser anterior à final.');plotHistoryFilter=values;renderPlotHistory();};
 $('#newPlotProcedure').onclick=async()=>{
  const v=await askForm({title:'Registrar procedimento realizado',wide:true,text:'Este registro não dá baixa automática em estoque. Use a data real do serviço e informe o responsável.',fields:[
   {name:'plot',label:'Fazenda / talhão',type:'select',options:plots.map(p=>[p.key,p.farm.name+' · '+p.plot.name]),value:plotHistoryFilter.plot||plots[0]?.key,required:true},
   {name:'type',label:'Tipo',type:'select',options:PlotHistory.TYPES,value:'Outro'},
   {name:'title',label:'Procedimento / serviço',required:true,placeholder:'Ex.: Adubação de cobertura'},
   {name:'date',label:'Data de realização',type:'date',value:todayISO(),required:true},
   {name:'responsible',label:'Responsável pelo serviço',value:currentUser.name,required:true},
   {name:'inputs',label:'Insumos, quantidades ou equipamentos — opcional',type:'textarea'},
   {name:'notes',label:'Observações',type:'textarea',wide:true}
  ]});if(!v)return;
  const target=plots.find(p=>p.key===v.plot);if(!target)return;
  const row={id:uid(),plotId:target.plot.id,activity,type:v.type,title:v.title.trim(),date:v.date,responsible:v.responsible.trim(),inputs:v.inputs,notes:v.notes,recordedBy:currentUser.username,recordedByName:currentUser.name,createdAt:new Date().toISOString(),voided:false};
  const candidate=JSON.parse(JSON.stringify(target.farm));candidate.plotProcedures=[...(candidate.plotProcedures||[]),row];
  try{PlotHistory.validateFarm(candidate);}catch(error){return toast(error.message);}
  target.farm.plotProcedures=candidate.plotProcedures;saveData();renderPlotHistory();toast('Procedimento registrado no talhão.');
 };
 $$('.void-plot-procedure').forEach(btn=>btn.onclick=async()=>{
  const farm=farms.find(f=>f.id===btn.dataset.farm),row=farm?.plotProcedures?.find(p=>p.id===btn.dataset.id);if(!row)return;
  const v=await askForm({title:'Anular procedimento',text:'O registro original será preservado no histórico.',fields:[{name:'reason',label:'Motivo da anulação',type:'textarea',required:true,minlength:3}]});if(!v)return;
  if(v.reason.trim().length<3)return toast('Informe o motivo da anulação.');
  Object.assign(row,{voided:true,voidReason:v.reason.trim(),voidedAt:new Date().toISOString(),voidedBy:currentUser.username});saveData();renderPlotHistory();toast('Anulação registrada com motivo.');
 });
 $('#exportPlotHistory').onclick=()=>downloadCSV('historico-talhoes-'+activity+'.csv',['Data','Fazenda','Talhão','Atividade','Origem','Tipo','Procedimento','Status','Responsável','Insumos/equipamentos','Observações','Motivo da anulação'],rows.map(({farm,plot,event:e})=>[e.date,farm.name,plot.name,farmTypeLabel(),e.origin,e.type,e.title,e.status,e.responsible,e.inputs,e.notes,e.voidReason]));
}
