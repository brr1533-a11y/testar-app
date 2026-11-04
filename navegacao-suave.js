/* Movimento apenas visual. Nenhuma alteração de permissão, página ou salvamento. */
(()=>{
 'use strict';
 const nav=document.getElementById('navMenu');if(!nav)return;
 // Restaura o painel visível; a antiga prévia transparente não deve ocultá-lo ao atualizar.
 const surfaceKey='rural-sidebar-surface-v2';
 let surface='solid';try{surface=localStorage.getItem(surfaceKey)==='transparent'?'transparent':'solid';}catch{}
 const footer=document.querySelector('.sidebar-footer'),toggle=document.createElement('button');
 toggle.type='button';toggle.className='btn sidebar-surface-toggle';toggle.id='sidebarSurfaceToggle';
 const paint=()=>{document.body.dataset.sidebarSurface=surface;toggle.textContent=surface==='transparent'?'Menu: transparente':'Menu: com fundo';toggle.setAttribute('aria-pressed',String(surface==='transparent'));toggle.title='Alternar o fundo do menu lateral';};
 toggle.onclick=()=>{surface=surface==='transparent'?'solid':'transparent';try{localStorage.setItem(surfaceKey,surface);}catch{}paint();};
 footer?.prepend(toggle);paint();
 const compactKey='rural-sidebar-compact',brand=document.querySelector('.sidebar-brand');
 const collapse=document.createElement('button'),rail=document.createElement('nav');
 collapse.type='button';collapse.id='sidebarCollapse';collapse.className='sidebar-collapse';collapse.setAttribute('aria-controls','navMenu');
 rail.className='sidebar-compact-rail';rail.setAttribute('aria-label','Categorias do menu');
 brand?.append(collapse);nav.after(rail);
 let compact=false;try{compact=localStorage.getItem(compactKey)==='true';}catch{}
 const flyout=document.createElement('section');flyout.id='sidebarCategoryPanel';flyout.className='sidebar-category-panel';flyout.hidden=true;flyout.setAttribute('aria-label','Opções da categoria');document.body.append(flyout);
 let flyoutTrigger=null;
 function closeCategory(restoreFocus=false){flyout.hidden=true;if(flyoutTrigger){flyoutTrigger.setAttribute('aria-expanded','false');if(restoreFocus&&flyoutTrigger.isConnected)flyoutTrigger.focus();}flyoutTrigger=null;}
 function openCategory(category,trigger){
  if(flyoutTrigger===trigger&&!flyout.hidden){closeCategory(true);return;}
  closeCategory();flyout.replaceChildren();flyoutTrigger=trigger;
  const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button'),list=document.createElement('div');
  title.textContent=category.dataset.menuCategory;close.type='button';close.className='btn';close.textContent='×';close.setAttribute('aria-label','Fechar opções');close.onclick=()=>closeCategory(true);header.append(title,close);list.className='sidebar-category-links';
  for(const original of category.querySelectorAll('.nav-btn[data-page]')){
   if(original.hidden||original.disabled)continue;
   const item=document.createElement('button');item.type='button';item.className='sidebar-category-link';item.textContent=original.textContent.trim();
   if(original.classList.contains('active'))item.setAttribute('aria-current','page');
   item.onclick=()=>{closeCategory();original.click();document.querySelector('#pageTitle')?.setAttribute('tabindex','-1');document.querySelector('#pageTitle')?.focus({preventScroll:true});};list.append(item);
  }
  flyout.append(header,list);const edge=document.querySelector('.sidebar').getBoundingClientRect().right+12;flyout.style.left=edge+'px';flyout.style.width=Math.min(310,innerWidth-edge-20)+'px';flyout.hidden=false;trigger.setAttribute('aria-expanded','true');list.querySelector('button')?.focus();
 }
 document.addEventListener('click',event=>{if(!flyout.hidden&&!flyout.contains(event.target)&&!rail.contains(event.target))closeCategory();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!flyout.hidden){event.preventDefault();closeCategory(true);}});
 window.addEventListener('resize',()=>closeCategory());
 function paintCompact(){
  closeCategory();
  document.body.dataset.sidebarCompact=String(compact);
  collapse.textContent=compact?'›':'‹';collapse.title=compact?'Expandir menu':'Recolher menu';
  collapse.setAttribute('aria-label',collapse.title);collapse.setAttribute('aria-expanded',String(!compact));
  rail.replaceChildren();
  const shortNames=['Início','Lavoura','Pecuária','Estoque','Financeiro','Ajustes'];
  const icons={
   'Início':'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
   'Lavoura':'<path d="M12 21V10M12 16C5 16 4 12 4 7c5 0 8 3 8 7M12 12c0-5 3-8 8-8 0 5-2 8-8 8"/>',
   'Pecuária':'<path d="M7 7 3 4v6l4 2m10-5 4-3v6l-4 2M7 8c2-3 8-3 10 0v10c0 4-10 4-10 0Z"/><path d="M9 17h6M9 11h.01M15 11h.01"/>',
   'Estoque':'<path d="m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4M12 11v10M7 5l9 4"/>',
   'Financeiro':'<path d="M4 3v18h17M8 16v-4m5 4V7m5 9V4"/>',
   'Ajustes':'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
   fallback:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
  };
  for(const category of nav.querySelectorAll('details[data-menu-category]')){
   const name=category.dataset.menuCategory,button=document.createElement('button');button.type='button';
   button.className='compact-category';button.title=name;button.setAttribute('aria-label',name);
   button.setAttribute('aria-controls',flyout.id);button.setAttribute('aria-expanded','false');
   if(category.querySelector('.nav-btn.active'))button.setAttribute('aria-current','true');
   const lower=name.toLocaleLowerCase('pt-BR');
   const label=shortNames.find(s=>lower.includes(s.toLocaleLowerCase('pt-BR')))||(lower.includes('configura')?'Ajustes':name);
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.innerHTML=icons[label]||icons.fallback;
   const caption=document.createElement('span');caption.textContent=label;button.append(svg,caption);
   button.onclick=()=>openCategory(category,button);rail.append(button);
  }
  schedule();
 }
 function setCompact(value){compact=value;try{localStorage.setItem(compactKey,String(compact));}catch{}paintCompact();}
 collapse.onclick=()=>setCompact(!compact);
 let queued=false,last=null;
 function position(){
  queued=false;let marker=nav.querySelector('.nav-selection');
  if(!marker){marker=document.createElement('span');marker.className='nav-selection';marker.setAttribute('aria-hidden','true');nav.prepend(marker);}
  const selected=nav.querySelector('.nav-btn.active[data-page]'),r=selected?.getBoundingClientRect(),n=nav.getBoundingClientRect();
  // Filhos de <details> fechado podem conservar medidas de layout no navegador.
  // A faixa só existe quando o botão selecionado está em uma categoria aberta.
  const visible=Boolean(!(compact&&innerWidth>900)&&selected&&!selected.closest('details:not([open]),[hidden]')&&r?.width&&r?.height&&innerWidth>900);marker.hidden=!visible;nav.classList.toggle('has-selection',visible);
  if(!visible){last=null;return;}
  const x=Math.max(0,r.left-n.left+nav.scrollLeft);
  const next={x,y:r.top-n.top+nav.scrollTop,w:Math.min(r.width,Math.max(0,nav.clientWidth-x)),h:r.height};
  const apply=box=>{marker.style.width=box.w+'px';marker.style.height=box.h+'px';marker.style.transform=`translate(${box.x}px,${box.y}px)`;};
  if(!marker.dataset.positioned){marker.dataset.positioned='true';marker.style.transition='none';apply(last||next);void marker.offsetWidth;marker.style.transition='';}
  apply(next);last=next;
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(position);}}
 new MutationObserver(records=>{if(records.some(r=>r.target!==nav.querySelector('.nav-selection')&&!(r.target===nav&&r.type==='attributes')))schedule();}).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class','open']});
 nav.addEventListener('toggle',schedule,true);window.addEventListener('resize',schedule);new ResizeObserver(schedule).observe(nav);schedule();
 paintCompact();
 new MutationObserver(()=>{if(compact)paintCompact();}).observe(nav,{childList:true});
})();
