/* Adaptado dos exemplos 26 (anel) e 27 (linha), canal Não Codei.
 * Valores reais, SVG acessível, casos vazios/zero e movimento reduzido. */
(function(){
 'use strict';
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function line(svg,values,labels,unit=''){
  const data=values.map(Number);if(!data.length||data.some(v=>!Number.isFinite(v)))return;
  const path=svg.querySelector('.traco'),dots=svg.querySelector('.pontos');
  const min=Math.min(0,...data),max=Math.max(0,...data),range=max-min||1,pad=12,L=300,A=120;
  const points=data.map((v,i)=>[data.length===1?150:pad+i*(L-2*pad)/(data.length-1),A-pad-(v-min)/range*(A-pad*2)]);
  path.setAttribute('d',points.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' '));
  dots.replaceChildren();const distance=[0];for(let i=1;i<points.length;i++)distance.push(distance[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  points.forEach((p,i)=>{const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',p[0]);c.setAttribute('cy',p[1]);c.setAttribute('r','3.5');c.setAttribute('class','ponto');const title=document.createElementNS(c.namespaceURI,'title');title.textContent=labels[i]+': '+data[i].toLocaleString('pt-BR')+' '+unit;c.append(title);dots.append(c);});
  const length=path.getTotalLength();path.style.strokeDasharray=length||1;path.style.strokeDashoffset=length;
  const start=performance.now();function frame(t){if(!svg.isConnected)return;const p=reduced()?1:Math.min(1,(t-start)/1600),drawn=length*(1-Math.pow(1-p,3));path.style.strokeDashoffset=length-drawn;[...dots.children].forEach((c,i)=>{c.style.opacity=drawn+0.01>=distance[i]?1:0;});if(p<1)requestAnimationFrame(frame);}requestAnimationFrame(frame);
 }
 function ring(card,value,options={}){
  const arc=card.querySelector('.valor'),text=card.querySelector('.centro'),target=Math.max(0,Math.min(100,Number(value)||0)),turn=2*Math.PI*62;
  arc.style.strokeDasharray=turn;arc.style.strokeDashoffset=turn;card.setAttribute('role','img');card.setAttribute('aria-label',options.label?options.label+': '+target.toLocaleString('pt-BR',{maximumFractionDigits:options.maximumFractionDigits??1})+'%':'Colheita concluída em '+target.toLocaleString('pt-BR',{maximumFractionDigits:1})+'% dos talhões');
  const start=performance.now();function frame(t){if(!card.isConnected)return;const p=reduced()?1:Math.min(1,(t-start)/1400),v=target*(1-Math.pow(1-p,3));arc.style.strokeDashoffset=turn*(1-v/100);text.textContent=v.toLocaleString('pt-BR',{maximumFractionDigits:options.maximumFractionDigits??1})+'%';if(p<1)requestAnimationFrame(frame);}requestAnimationFrame(frame);
 }
 window.RuralCharts={line,ring};
})();
