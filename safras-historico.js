function renderSeasonHistory(farmId,cycleId,filter={from:'',to:'',type:''}){
 if(!['ceo','adm'].includes(currentUser.role)||selectedType()==='cattle')return;
 ruralSeasonSelection={farmId,cycleId,filter};
 const farm=farmsInContext().find(f=>f.id===farmId),cycle=farm?.agriculture?.cycles.find(c=>c.id===cycleId&&c.activity===selectedType());
 if(!cycle)return renderAgriculture();
 const linkedPlots=(farm.talhoes||[]).filter(p=>RuralOps.plotIds(cycle).includes(p.id)),plot=linkedPlots[0],stats=RuralDomain.cycleStats(farm,cycle);
 const all=SeasonHistory.events(farm,cycle,[...new Map(linkedPlots.flatMap(p=>PlotHistory.events(farm,p.id,cycle.activity)).map(e=>[e.id,e])).values()]);
 const rows=all.filter(e=>(!filter.from||e.date>=filter.from)&&(!filter.to||e.date<=filter.to)&&(!filter.type||e.type===filter.type));
 setHeader('MEMÓRIA DA PRODUÇÃO','Histórico de safras');
 $('#pageContent').innerHTML=`<div class="section-head"><div><span class="eyebrow">${escapeHTML(cycle.crop)} · ${escapeHTML(cycle.stage)}</span><h2>${escapeHTML(cycle.name)}</h2><p>${escapeHTML(farm.name)} · ${escapeHTML(linkedPlots.map(p=>p.name).join(', ')||'Sem talhão vinculado')} · Início: ${dateBR(cycle.startDate)}</p></div><button class="btn" id="seasonBack">Voltar às safras</button></div>
 <div class="grid kpis">${ruralKpi('Colhido',ruralNum(ruralSacks(stats.harvestedKg,cycle))+' sacas')}${ruralKpi('Vendido',ruralNum(ruralSacks(stats.soldKg,cycle))+' sacas')}${ruralKpi('Disponível',ruralNum(ruralSacks(stats.availableKg,cycle))+' sacas')}${ruralKpi('Produtividade',ruralNum(stats.yieldKgHa/cycle.bagKg)+' sc/ha')}</div>
 <div class="card soft">O diário guarda alterações de etapa a partir desta atualização. Procedimentos do talhão aparecem entre o início e o encerramento registrado da safra (ou até hoje). São registros do talhão nesse período e podem envolver outras safras no mesmo local. Vendas representam saídas de produção; recebimentos ficam no Financeiro.</div>
 <form id="seasonFilters" class="card rural-filters"><label>De<input name="from" type="date" value="${escapeHTML(filter.from)}"></label><label>Até<input name="to" type="date" value="${escapeHTML(filter.to)}"></label><label>Tipo<select name="type"><option value="">Todos</option>${['Cadastro','Etapa','Colheita','Venda','Exclusão','Talhão','Classificação','Terreiro'].map(t=>`<option ${filter.type===t?'selected':''}>${t}</option>`).join('')}</select></label><button class="btn primary">Filtrar</button></form>
 <div class="section-head"><h2>${rows.length} registro(s)</h2><button class="btn" id="exportSeasonHistory">Exportar CSV</button></div>
 <div class="plot-timeline">${rows.map(e=>`<article class="card plot-event season-event"><div class="inline"><span class="badge">${escapeHTML(e.type)}</span><span>${e.date?dateBR(e.date):'Data não informada'}</span></div><h3>${escapeHTML(e.title)}</h3><p>${escapeHTML(e.notes||'')}</p><p class="muted">${escapeHTML(e.source)}${e.responsible?' · '+escapeHTML(e.responsible):''}</p></article>`).join('')||'<div class="card empty">Nenhum registro neste filtro.</div>'}</div>`;
 $('#seasonBack').onclick=()=>{ruralSeasonSelection=null;renderAgriculture();};
 $('#seasonFilters').onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));if(v.from&&v.to&&v.from>v.to)return toast('A data inicial deve ser anterior à final.');renderSeasonHistory(farmId,cycleId,v);};
 $('#exportSeasonHistory').onclick=()=>downloadCSV('historico-safra-'+cycle.activity+'.csv',['Data','Fazenda','Safra','Cultura','Tipo','Registro','Detalhes','Origem','Responsável'],rows.map(e=>[e.date,farm.name,cycle.name,cycle.crop,e.type,e.title,e.notes,e.source,e.responsible]));
}
