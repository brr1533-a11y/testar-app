/* Consolidado em Equipamentos, exclusivamente na visão Geral. Usa a rota de transferência existente. */
(()=>{
 'use strict';
 let selected='overview';
 const before=renderEquipmentAdmin;
 renderEquipmentAdmin=function(...args){
  const result=before(...args);
  if(currentPage!=='equipamentos'||!isGeneralView()||!['ceo','adm'].includes(currentUser?.role))return result;
  const root=document.getElementById('pageContent'),original=[...root.children],hidden=new Map(original.map(c=>[c,c.hidden])),tabs=document.createElement('div'),board=document.createElement('section');
  tabs.className='tractor-general-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Visualização dos equipamentos');
  tabs.innerHTML='<button type="button" class="btn" data-tractor-tab="overview">Visão geral</button><button type="button" class="btn" data-tractor-tab="tractors">Tratores · todas as fazendas</button>';
  board.className='tractor-general-board';const rows=data.farms.flatMap(farm=>(farm.tractors||[]).map(tractor=>({farm,tractor})));
  const ceo=currentUser.role==='ceo',farms=data.farms.filter(f=>!f.archived||f.tractors?.length);
  const cardHTML=({farm,tractor},i)=>`<article class="card tractor-general-card" data-general-card="${i}" ${ceo?'draggable="true"':''}><div class="tractor-card-top"><span class="badge">${escapeHTML(tractor.status||'Sem status')}</span>${ceo?`<button type="button" class="tractor-grip" data-tractor-grip="${i}" aria-label="Mover ${escapeHTML(tractor.name)}" title="Arraste para outra fazenda ou clique para escolher">⠿</button>`:''}</div><h3>${escapeHTML(tractor.name)}</h3><p>${escapeHTML(tractor.model||'Modelo não informado')}${tractor.plate?' · '+escapeHTML(tractor.plate):''}</p><p>Fazenda atual: <b>${escapeHTML(farm.name)}</b></p>${ceo?`<button type="button" class="btn" data-general-tractor="${i}">Escolher destino</button>`:''}</article>`;
  board.innerHTML=`<div class="section-head"><div><h2>Tratores do grupo</h2><p>${ceo?'Arraste o cartão para outra fazenda ou clique em Escolher destino. A transferência só acontece depois da confirmação. No celular, arraste pelo botão de pontos.':'Consulte em qual fazenda cada trator está. Só o CEO realiza transferências.'}</p></div><span class="badge">${rows.length} trator(es)</span></div><p class="sr-only" id="tractorDragHelp">Para mover sem arrastar, use o botão Escolher destino.</p><div class="tractor-farm-board" aria-label="Tratores organizados por fazenda">${farms.map(farm=>`<section class="tractor-farm-lane" data-tractor-farm="${escapeHTML(farm.id)}" ${farm.archived?'data-drop-disabled="true"':''} aria-label="Tratores de ${escapeHTML(farm.name)}"><header><h3>${escapeHTML(farm.name)}</h3><span class="badge">${rows.filter(r=>r.farm.id===farm.id).length}</span></header><div class="tractor-farm-cards">${rows.map((r,i)=>r.farm.id===farm.id?cardHTML(r,i):'').join('')}</div><div class="tractor-drop-hint">${ceo&&!farm.archived?'Solte o trator aqui':'Sem outros tratores'}</div></section>`).join('')}</div><p class="muted" role="status" aria-live="polite" id="tractorDragStatus"></p>`;
  root.prepend(tabs,board);
  const show=()=>{board.hidden=selected!=='tractors';for(const child of original){child.hidden=selected==='tractors'||hidden.get(child);child.classList.toggle('tractor-pane-hidden',selected==='tractors');}tabs.querySelectorAll('[data-tractor-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tractorTab===selected)));};
  tabs.querySelectorAll('[data-tractor-tab]').forEach(b=>b.onclick=()=>{selected=b.dataset.tractorTab;show();});
  board.querySelectorAll('[data-general-tractor]').forEach(b=>b.onclick=()=>{const row=rows[Number(b.dataset.generalTractor)];equipmentTransferDialog(row.farm,row.tractor);});
  if(ceo)bindTractorDragging(board,rows);
  show();return result;
 };
 function bindTractorDragging(board,rows){
  let dragged=null,pointer=null,ghost=null,suppressUntil=0;
  const status=board.querySelector('#tractorDragStatus'),lanes=[...board.querySelectorAll('[data-tractor-farm]')];
  const clear=()=>{lanes.forEach(l=>l.classList.remove('drop-ready'));board.querySelectorAll('.is-dragging').forEach(c=>c.classList.remove('is-dragging'));ghost?.remove();ghost=null;};
  const targetAt=(x,y)=>{const l=document.elementFromPoint(x,y)?.closest('[data-tractor-farm]');return l&&board.contains(l)&&!l.dataset.dropDisabled?l:null;};
  const highlight=lane=>{lanes.forEach(l=>l.classList.toggle('drop-ready',l===lane));};
  const move=(i,lane)=>{clear();const row=rows[i],to=lane?.dataset.tractorFarm;if(!row||!to)return;if(to===row.farm.id){status.textContent='O trator já está nesta fazenda.';return;}status.textContent='Destino escolhido. Confirme a transferência na janela.';equipmentTransferDialog(row.farm,row.tractor,to);};
  board.querySelectorAll('[data-general-card]').forEach(card=>{
   card.setAttribute('aria-describedby','tractorDragHelp');
   card.addEventListener('dragstart',e=>{dragged=Number(card.dataset.generalCard);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-rural-tractor',String(dragged));card.classList.add('is-dragging');status.textContent='Arraste para a fazenda de destino.';});
   card.addEventListener('dragend',()=>{dragged=null;clear();});
  });
  for(const lane of lanes){
   lane.addEventListener('dragover',e=>{if(dragged===null||lane.dataset.dropDisabled)return;e.preventDefault();e.dataTransfer.dropEffect='move';highlight(lane);});
   lane.addEventListener('dragleave',e=>{if(!lane.contains(e.relatedTarget))lane.classList.remove('drop-ready');});
   lane.addEventListener('drop',e=>{if(dragged===null||lane.dataset.dropDisabled)return;e.preventDefault();const i=dragged;dragged=null;move(i,lane);});
  }
  board.querySelectorAll('[data-tractor-grip]').forEach(grip=>{
   grip.onclick=()=>{if(performance.now()<suppressUntil)return;const row=rows[Number(grip.dataset.tractorGrip)];equipmentTransferDialog(row.farm,row.tractor);};
   grip.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();pointer={id:e.pointerId,i:Number(grip.dataset.tractorGrip),x:e.clientX,y:e.clientY,moving:false};grip.setPointerCapture(e.pointerId);});
   grip.addEventListener('pointermove',e=>{
    if(!pointer||pointer.id!==e.pointerId)return;
    if(!pointer.moving&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>8){pointer.moving=true;const card=grip.closest('[data-general-card]');card.classList.add('is-dragging');ghost=document.createElement('div');ghost.className='tractor-drag-ghost';ghost.textContent=rows[pointer.i].tractor.name;document.body.append(ghost);}
    if(pointer.moving){e.preventDefault();ghost.style.left=e.clientX+14+'px';ghost.style.top=e.clientY-22+'px';highlight(targetAt(e.clientX,e.clientY));}
   });
   grip.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const current=pointer;pointer=null;suppressUntil=performance.now()+400;if(current.moving)move(current.i,targetAt(e.clientX,e.clientY));else{const row=rows[current.i];equipmentTransferDialog(row.farm,row.tractor);}clear();});
   grip.addEventListener('pointercancel',()=>{pointer=null;clear();});
   grip.addEventListener('lostpointercapture',()=>{if(pointer){pointer=null;clear();}});
  });
 }
})();
