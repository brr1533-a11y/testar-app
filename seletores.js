/* Seletores acessíveis: o select original continua responsável pelo formulário. */
(()=>{
 'use strict';
 let serial=0,active=null;
 const widgets=new WeakMap();
 const disabled=o=>o.disabled||o.parentElement?.disabled===true;
 const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 function enhance(select){
  if(select.multiple||select.size>1||widgets.has(select))return;
  const wrap=document.createElement('span');wrap.className='rural-select';
  select.before(wrap);wrap.append(select);select.classList.add('rural-select-native');
  const button=document.createElement('button'),value=document.createElement('span'),arrow=document.createElement('span');
  button.type='button';button.className='rural-select-trigger';button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
  value.className='rural-select-value';arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');button.append(value,arrow);wrap.append(button);
  const list=document.createElement('div');list.className='rural-select-list';list.id='rural-options-'+(++serial);list.setAttribute('role','listbox');list.hidden=true;button.setAttribute('aria-controls',list.id);
  // O foco fica no botão; o portal evita cortes em cartões e janelas.
  wrap.append(list);
  let current=-1,options=[],search='',timer;
  const label=()=>{const direct=select.getAttribute('aria-label');if(direct)return direct;return [...(select.labels||[])].map(l=>{const c=l.cloneNode(true);c.querySelectorAll('select,.rural-select').forEach(n=>n.remove());return c.textContent.trim();}).join(' ')||select.name||'Escolher opção';};
  function sync(){
   value.textContent=select.selectedOptions[0]?.textContent||'Selecione';button.disabled=select.matches(':disabled');
   button.setAttribute('aria-label',label());button.setAttribute('aria-required',String(select.required));
   button.title=value.textContent;wrap.hidden=select.hidden;
  }
  function position(){
   const rect=button.getBoundingClientRect(),space=innerHeight-rect.bottom-12,up=space<180&&rect.top>space;
   list.style.width=Math.min(rect.width,innerWidth-24)+'px';list.style.left=Math.max(12,Math.min(rect.left,innerWidth-list.getBoundingClientRect().width-12))+'px';
   list.style.maxHeight=Math.max(80,Math.min(280,up?rect.top-12:space))+'px';
   list.style.top=up?'auto':rect.bottom+6+'px';list.style.bottom=up?innerHeight-rect.top+6+'px':'auto';
  }
  function close(){list.hidden=true;if(button.isConnected)wrap.append(list);else list.remove();button.setAttribute('aria-expanded','false');button.removeAttribute('aria-activedescendant');if(active===widget)active=null;}
  function highlight(index){
   if(index<0||!options[index]||disabled(options[index]))return;
   current=index;list.querySelectorAll('[role=option]').forEach(n=>n.classList.toggle('focused',Number(n.dataset.index)===index));
   const row=list.querySelector('[data-index="'+index+'"]');button.setAttribute('aria-activedescendant',row.id);row.scrollIntoView({block:'nearest'});
  }
  function choose(index){if(!options[index]||disabled(options[index])||select.matches(':disabled'))return;select.selectedIndex=index;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));sync();close();button.focus();}
  function open(){
   sync();if(button.disabled)return;active?.close();options=[...select.options];list.replaceChildren();
   options.forEach((o,i)=>{const row=document.createElement('div');row.id=list.id+'-'+i;row.dataset.index=i;row.setAttribute('role','option');row.setAttribute('aria-selected',String(o.selected));row.textContent=o.textContent;row.className='rural-select-option';
    row.setAttribute('aria-disabled',String(disabled(o)));row.addEventListener('pointerdown',e=>e.preventDefault());row.addEventListener('click',()=>choose(i));list.append(row);
   });
   document.body.append(list);list.hidden=false;active=widget;button.setAttribute('aria-expanded','true');position();highlight(select.selectedIndex>=0&&!disabled(options[select.selectedIndex])?select.selectedIndex:options.findIndex(o=>!disabled(o)));
  }
  const widget={close,sync,button,list};widgets.set(select,widget);
  button.addEventListener('click',()=>list.hidden?open():close());
  button.addEventListener('focus',sync);select.addEventListener('change',()=>{sync();if(!list.hidden)close();});
  select.addEventListener('invalid',e=>{e.preventDefault();button.focus();open();});
  select.addEventListener('focus',()=>button.focus());
  select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  button.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&!list.hidden){e.preventDefault();e.stopPropagation();close();return;}
   if(e.key==='Tab'){close();return;}
   if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
    e.preventDefault();if(list.hidden)open();const enabled=options.map((o,i)=>disabled(o)?-1:i).filter(i=>i>=0);if(!enabled.length)return;
    const at=enabled.indexOf(current),next=e.key==='Home'?enabled[0]:e.key==='End'?enabled.at(-1):enabled[Math.max(0,Math.min(enabled.length-1,at+(e.key==='ArrowDown'?1:-1)))];highlight(next);return;
   }
   if(e.key==='Enter'||e.key===' '&&!search){e.preventDefault();if(list.hidden)open();else choose(current);return;}
   if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(list.hidden)open();clearTimeout(timer);search+=normalize(e.key);const i=options.findIndex(o=>!disabled(o)&&normalize(o.textContent.trim()).startsWith(search));if(i>=0)highlight(i);timer=setTimeout(()=>search='',700);}
  });
  select.form?.addEventListener('reset',()=>queueMicrotask(sync));sync();
 }
 function scan(root){if(root.nodeType!==1&&root!==document)return;if(root.matches?.('select'))enhance(root);root.querySelectorAll?.('select').forEach(enhance);}
 new MutationObserver(records=>{for(const r of records){if(r.type==='childList')r.addedNodes.forEach(scan);const s=r.target.closest?.('select');if(s)widgets.get(s)?.sync();}if(active&&!active.button.isConnected)active.close();}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','required','selected','hidden']});
 document.addEventListener('pointerdown',e=>{if(active&&!active.button.contains(e.target)&&!active.list.contains(e.target))active.close();});
 document.addEventListener('scroll',e=>{if(active&&e.target!==active.list&&!active.list.contains(e.target))active.close();},true);window.addEventListener('resize',()=>active?.close());
 scan(document);
})();
