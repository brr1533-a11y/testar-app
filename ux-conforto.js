/* Integração das propostas de Claude e Codex. Não altera dados nem salvamento. */
(()=>{
 'use strict';
 const root=document.getElementById('pageContent');if(!root)return;
 const hints=new Map();let queued=false;
 const update=wrapper=>{
  if(!wrapper.isConnected)return;
  const over=wrapper.clientWidth>0&&wrapper.scrollWidth>wrapper.clientWidth+2;
  let state=hints.get(wrapper);
  if(!state){const note=document.createElement('p');note.className='table-scroll-help';note.textContent='Deslize a tabela para ver mais colunas →';note.hidden=true;wrapper.before(note);state={note,tab:false,role:false,label:false};hints.set(wrapper,state);}
  state.note.hidden=!over;
  if(over){
   if(!wrapper.hasAttribute('tabindex')){wrapper.tabIndex=0;state.tab=true;}
   if(!wrapper.hasAttribute('role')){wrapper.setAttribute('role','region');state.role=true;}
   if(!wrapper.hasAttribute('aria-label')){wrapper.setAttribute('aria-label','Tabela com mais colunas: use as setas para rolar');state.label=true;}
  }else{
   if(state.tab){wrapper.removeAttribute('tabindex');state.tab=false;}
   if(state.role){wrapper.removeAttribute('role');state.role=false;}
   if(state.label){wrapper.removeAttribute('aria-label');state.label=false;}
  }
 };
 const resize=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{for(const entry of entries){const wrapper=entry.target.closest('.table-wrap');if(wrapper)update(wrapper);}}):null;
 function sync(){
  queued=false;resize?.disconnect();
  for(const [wrapper,state]of hints)if(!root.contains(wrapper)){state.note.remove();hints.delete(wrapper);}
  root.querySelectorAll('.table-wrap').forEach(wrapper=>{update(wrapper);resize?.observe(wrapper);const table=wrapper.querySelector('table');if(table)resize?.observe(table);});
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(sync);}}
 // Uma instância; cobre trocas parciais de tabela e ignora atributos de animação.
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&!n.classList.contains('table-scroll-help'))))schedule();}).observe(root,{subtree:true,childList:true});
 window.addEventListener('resize',schedule,{passive:true});
 matchMedia('(max-width:720px)').addEventListener('change',()=>{if(typeof aiContextualHelp==='function')aiContextualHelp();});
 schedule();
})();
