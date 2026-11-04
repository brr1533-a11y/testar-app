/* Movimento apenas visual. Nenhuma alteração de permissão, página ou salvamento. */
(()=>{
 'use strict';
 const nav=document.getElementById('navMenu');if(!nav)return;
 let surface='transparent';try{surface=localStorage.getItem('rural-sidebar-surface')==='solid'?'solid':'transparent';}catch{}
 const footer=document.querySelector('.sidebar-footer'),toggle=document.createElement('button');
 toggle.type='button';toggle.className='btn sidebar-surface-toggle';toggle.id='sidebarSurfaceToggle';
 const paint=()=>{document.body.dataset.sidebarSurface=surface;toggle.textContent=surface==='transparent'?'Menu: transparente':'Menu: com fundo';toggle.setAttribute('aria-pressed',String(surface==='transparent'));toggle.title='Alternar o fundo do menu lateral';};
 toggle.onclick=()=>{surface=surface==='transparent'?'solid':'transparent';try{localStorage.setItem('rural-sidebar-surface',surface);}catch{}paint();};
 footer?.prepend(toggle);paint();
 let queued=false,last=null;
 function position(){
  queued=false;let marker=nav.querySelector('.nav-selection');
  if(!marker){marker=document.createElement('span');marker.className='nav-selection';marker.setAttribute('aria-hidden','true');nav.prepend(marker);}
  const selected=nav.querySelector('.nav-btn.active[data-page]'),r=selected?.getBoundingClientRect(),n=nav.getBoundingClientRect();
  const visible=Boolean(r?.width&&r?.height&&innerWidth>900);marker.hidden=!visible;nav.classList.toggle('has-selection',visible);
  if(!visible){last=null;return;}
  const next={x:r.left-n.left+nav.scrollLeft,y:r.top-n.top+nav.scrollTop,w:r.width,h:r.height};
  const apply=box=>{marker.style.width=box.w+'px';marker.style.height=box.h+'px';marker.style.transform=`translate(${box.x}px,${box.y}px)`;};
  if(!marker.dataset.positioned){marker.dataset.positioned='true';marker.style.transition='none';apply(last||next);void marker.offsetWidth;marker.style.transition='';}
  apply(next);last=next;
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(position);}}
 new MutationObserver(records=>{if(records.some(r=>r.target!==nav.querySelector('.nav-selection')&&!(r.target===nav&&r.type==='attributes')))schedule();}).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 nav.addEventListener('toggle',schedule,true);window.addEventListener('resize',schedule);new ResizeObserver(schedule).observe(nav);schedule();
})();
