(function(){
 'use strict';
 const preferences={coffee:{},grains:{}};
 const colors=['var(--comparison-main,#98703c)','var(--comparison-reference,#36745b)'],NS='http://www.w3.org/2000/svg';
 const esc=v=>escapeHTML(String(v??'')),format=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:2});
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.dataset.readingMotion==='reduced'||document.getElementById('pageContent')?.classList.contains('sync-refresh');
 function draw(svg,model,indices,metric){
  const W=720,H=250,pad={left:58,right:18,top:20,bottom:38},max=model.maximum||1;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.replaceChildren();
  const node=(name,attrs,text)=>{const el=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;return el;};
  for(let i=0;i<=4;i++){const y=pad.top+(H-pad.top-pad.bottom)*i/4;svg.append(node('line',{x1:pad.left,y1:y,x2:W-pad.right,y2:y,class:'comparison-grid'}),node('text',{x:pad.left-10,y:y+4,'text-anchor':'end',class:'comparison-axis'},format(max*(1-i/4))));}
  const x=i=>pad.left+i*(W-pad.left-pad.right)/(model.length-1),y=v=>H-pad.bottom-v/max*(H-pad.top-pad.bottom);
  for(let i=0;i<model.length;i++)if(i===0||i===model.length-1||i%3===2)svg.append(node('text',{x:x(i),y:H-10,'text-anchor':'middle',class:'comparison-axis'},String(i+1)));
  const paths=[];
  // Referência é desenhada primeiro; a safra principal aparece na frente.
  for(const index of [...indices].reverse()){
   const s=model.series[index],points=s.values.map((v,i)=>v===null?null:[x(i),y(v),v,i]).filter(Boolean);if(!points.length||!s.recorded)continue;
   const d=points.map((p,i)=>(i?'L':'M')+p[0]+','+p[1]).join(' ');
   let area;
   if(index===0){area=node('path',{d:d+` L${points.at(-1)[0]},${H-pad.bottom} L${points[0][0]},${H-pad.bottom} Z`,fill:colors[index],opacity:'.10'});svg.append(area);}
   const path=node('path',{d,fill:'none',stroke:colors[index],'stroke-width':2.8,'stroke-linecap':'round','stroke-linejoin':'round',...(index===1?{'stroke-dasharray':'6 6'}:{}),class:'comparison-line'});svg.append(path);
   const dots=[];for(const p of points){const dot=node('circle',{cx:p[0],cy:p[1],r:3.5,fill:colors[index],class:'comparison-dot'});dot.append(node('title',{},`${s.name} · mês ${p[3]+1}: ${format(p[2])} ${metric==='yield'?'sc/ha':'sacas'}`));svg.append(dot);dots.push({dot,month:p[3]});}
   const maskId='season-mask-'+uid(),defs=node('defs'),mask=node('clipPath',{id:maskId}),rect=node('rect',{x:pad.left-5,y:0,width:0,height:H});mask.append(rect);defs.append(mask);svg.append(defs);path.setAttribute('clip-path','url(#'+maskId+')');if(area)area.setAttribute('clip-path','url(#'+maskId+')');paths.push({rect,dots});
  }
  const start=performance.now();function frame(t){if(!svg.isConnected)return;const p=reduced()?1:Math.min(1,(t-start)/800),e=1-Math.pow(1-p,3);for(const item of paths){item.rect.setAttribute('width',(W-pad.left+8)*e);for(const {dot,month} of item.dots)dot.style.opacity=e>=month/(model.length-1)?1:0;}if(p<1)requestAnimationFrame(frame);}requestAnimationFrame(frame);
 }
 function mount(){
  const root=document.getElementById('pageContent'),activity=selectedType();
  if(!root||!['ceo','adm'].includes(currentUser?.role)||!['coffee','grains'].includes(activity)||!root.querySelector('#ruralFilters,#opsResultsFilters')||root.querySelector('#seasonCompare'))return;
  const rows=farmsInContext().flatMap(farm=>(farm.agriculture?.cycles||[]).filter(c=>c.activity===activity).map(cycle=>({farm,cycle,key:farm.id+'|'+cycle.id}))).sort((a,b)=>String(b.cycle.startDate||'').localeCompare(String(a.cycle.startDate||'')));
  const pref=preferences[activity];if(!rows.some(r=>r.key===pref.first))pref.first=rows[0]?.key||'';
  const a=rows.find(r=>r.key===pref.first),alternatives=rows.filter(r=>r.key!==a?.key&&r.cycle.crop===a?.cycle.crop);
  if(!alternatives.some(r=>r.key===pref.second))pref.second=alternatives[0]?.key||'';
  pref.metric||='sacks';pref.view||='overlay';
  const card=document.createElement('details');card.id='seasonCompare';card.className='card season-compare';card.open=Boolean(pref.open);
  card.innerHTML=`<summary><span>Comparar safras</span><small>Linhas sobrepostas ou lado a lado</small></summary><div class="comparison-content"><p class="muted">Compare duas safras da mesma cultura, contando os meses a partir do início de cada uma.</p><div class="comparison-controls"><label>Safra principal<select id="comparisonFirst">${rows.map(r=>`<option value="${esc(r.key)}" ${r.key===pref.first?'selected':''}>${esc(r.farm.name)} · ${esc(r.cycle.name)} · ${esc(r.cycle.crop)}</option>`).join('')}</select></label><label>Comparar com<select id="comparisonSecond">${alternatives.length?alternatives.map(r=>`<option value="${esc(r.key)}" ${r.key===pref.second?'selected':''}>${esc(r.farm.name)} · ${esc(r.cycle.name)}</option>`).join(''):'<option value="">Nenhuma outra safra da mesma cultura</option>'}</select></label><label>Indicador<select id="comparisonMetric"><option value="sacks" ${pref.metric==='sacks'?'selected':''}>Sacas acumuladas</option><option value="yield" ${pref.metric==='yield'?'selected':''}>Produtividade acumulada (sc/ha)</option></select></label></div><div class="comparison-views" role="group" aria-label="Apresentação do comparativo"><button type="button" class="btn" data-comparison-view="overlay" aria-pressed="${pref.view==='overlay'}">Sobrepostos</button><button type="button" class="btn" data-comparison-view="separate" aria-pressed="${pref.view==='separate'}">Lado a lado</button></div><div id="comparisonGraph"></div></div>`;
  root.querySelector('#ruralFilters,#opsResultsFilters').after(card);
  function render(){
   const a=rows.find(r=>r.key===pref.first),b=rows.find(r=>r.key===pref.second),out=card.querySelector('#comparisonGraph');
   if(!a||!b){out.innerHTML='<p class="comparison-empty">Cadastre outra safra da mesma cultura para comparar. O gráfico usa apenas seus registros.</p>';return;}
   const bagKg=Number(a.cycle.bagKg)||60,model=SeasonComparison.compare(a,b,{bagKg,metric:pref.metric});
   if(!model){out.innerHTML='<p class="comparison-empty">Confira o início das safras e a área em hectares para calcular a produtividade.</p>';return;}
   const unit=pref.metric==='yield'?'sc/ha':'sacas',group=pref.view==='overlay'?[[0,1]]:[[0],[1]];
   out.innerHTML=`<div class="comparison-legend">${model.series.map((s,i)=>`<span><i class="${i?'reference':''}" style="--series:${colors[i]}"></i><b>${esc(s.name)}</b> · ${esc(s.farmName)}${i?' · referência':''}</span>`).join('')}</div><div class="comparison-graphs ${pref.view==='separate'?'separate':''}">${group.map(ids=>`<div><svg role="img" aria-label="${esc(ids.map(i=>model.series[i].name).join(' comparada com '))}: ${unit} acumuladas por mês da safra"></svg></div>`).join('')}</div><p class="muted">Eixo horizontal: mês da safra. Base comum: saca de ${format(bagKg)} kg para comparar os pesos de forma equivalente. Apenas colheitas registradas até hoje; meses futuros não são projetados.${model.series.some(s=>s.excluded)?' Registros fora dos 36 primeiros meses não entram neste gráfico.':''}${model.series.some(s=>!s.recorded)?' Há safra sem colheita registrada neste intervalo.':''}</p><details class="comparison-table"><summary>Ver valores por mês</summary><div class="table-wrap"><table><thead><tr><th>Mês</th>${model.series.map(s=>`<th>${esc(s.name)} (${unit})</th>`).join('')}</tr></thead><tbody>${model.labels.map((l,i)=>`<tr><td>${l}</td>${model.series.map(s=>`<td>${s.values[i]===null?'—':format(s.values[i])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
   out.querySelectorAll('svg').forEach((svg,i)=>draw(svg,model,group[i],pref.metric));
  }
  card.addEventListener('toggle',()=>{pref.open=card.open;if(card.open)render();});
  card.querySelector('#comparisonFirst').onchange=e=>{pref.first=e.target.value;pref.open=true;card.remove();mount();};
  card.querySelector('#comparisonSecond').onchange=e=>{pref.second=e.target.value;render();};
  card.querySelector('#comparisonMetric').onchange=e=>{pref.metric=e.target.value;render();};
  card.querySelectorAll('[data-comparison-view]').forEach(b=>b.onclick=()=>{pref.view=b.dataset.comparisonView;card.querySelectorAll('[data-comparison-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});
  if(card.open)render();
 }
 for(const name of ['renderAgriculture','renderResults']){if(name==='renderAgriculture'){const before=renderAgriculture;renderAgriculture=function(...args){const result=before(...args);mount();return result;};}else{const before=renderResults;renderResults=function(...args){const result=before(...args);mount();return result;};}}
})();
