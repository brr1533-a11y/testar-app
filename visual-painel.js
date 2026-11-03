/* Preferência visual local; não altera acesso, salvamento ou regras de negócio. */
(function(){
 'use strict';
 let theme='dark';try{theme=localStorage.getItem('rural-panel-theme')==='light'?'light':'dark';}catch{}
 document.body.dataset.panelTheme=theme;
 const actions=document.querySelector('.topbar-actions');
 if(actions){const b=document.createElement('button');b.id='panelThemeToggle';b.type='button';b.className='btn';const label=()=>{b.textContent=theme==='dark'?'☾':'☀';b.setAttribute('aria-label',theme==='dark'?'Ativar tema claro':'Ativar tema escuro');b.title=b.getAttribute('aria-label');};label();b.addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';document.body.dataset.panelTheme=theme;try{localStorage.setItem('rural-panel-theme',theme);}catch{}label();});actions.append(b);}
 const crop='<svg class="crop-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10h18v10H3zM3 14h18M7 20l3-10m4 10 3-10M12 10V4m0 3C8 7 7 5 7 3c3 0 5 1 5 4Zm0-1c0-3 2-4 5-4 0 3-2 4-5 4Z"/></svg>';
 const nav=document.querySelector('#navMenu');
 function polishNav(){nav?.querySelectorAll('[data-page="safras"] svg:not(.crop-symbol)').forEach(el=>{el.outerHTML=crop;});}
 if(nav){new MutationObserver(polishNav).observe(nav,{childList:true,subtree:true});polishNav();}
 const content=document.querySelector('#pageContent');
 if(content){let previous='';const observer=new MutationObserver(records=>{if(!records.some(r=>r.type==='childList'&&r.target===content))return;const title=document.querySelector('#pageTitle')?.textContent||'';if(title!==previous&&!content.classList.contains('sync-refresh')){content.classList.remove('visual-enter');void content.offsetWidth;content.classList.add('visual-enter');}previous=title;});observer.observe(content,{childList:true});}
})();

function bindMoreMenuSearch(root){
 if(!root||root.querySelector('.more-menu-search'))return;
 const groupList=[...root.querySelectorAll('.sheet-category')],initial=new Map(groupList.map(g=>[g,g.open]));
 const box=document.createElement('div');box.className='more-menu-search';
 box.innerHTML='<label for="moreMenuQuery">Buscar uma tela</label><div class="more-menu-search-field"><input id="moreMenuQuery" type="search" placeholder="Ex.: safras, estoque, financeiro…" autocomplete="off" maxlength="100"><button type="button" class="btn small" aria-label="Limpar busca">Limpar</button></div><p class="more-menu-search-status muted" role="status" aria-live="polite"></p>';
 root.querySelector('h3').after(box);
 const input=box.querySelector('input'),clear=box.querySelector('button'),status=box.querySelector('[role=status]');
 const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
 function filter(){const q=normalize(input.value);let count=0;for(const group of groupList){const category=normalize(group.dataset.menuCategory||''),buttons=[...group.querySelectorAll('.sheet-item')];let found=0;for(const b of buttons){const match=!q||normalize(b.textContent).includes(q)||category.includes(q);b.hidden=!match;if(match)found++;}group.hidden=!!q&&!found;group.open=q?found>0:initial.get(group);count+=found;}status.textContent=q?(count?count+' tela(s) encontrada(s).':'Nenhuma tela encontrada. Tente outro nome.') :'';clear.hidden=!q;}
 input.addEventListener('input',filter);clear.onclick=()=>{input.value='';filter();input.focus();};
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();root.querySelector('.sheet-category:not([hidden]) .sheet-item:not([hidden])')?.focus();}if(e.key==='Escape'&&input.value){e.preventDefault();e.stopPropagation();input.value='';filter();}});
 filter();
}
