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

// 4.24 · Limites nos campos de número e data (o "usuário bagunceiro" gravou 1e300 e o ano 202620).
// Ao tocar no campo, ganha o limite se não tiver um próprio; o servidor confere de novo.
(function () {
  document.addEventListener('focusin', e => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement)) return;
    if (el.type === 'number' && !el.hasAttribute('max')) el.max = '10000000000';
    if (el.type === 'date') { if (!el.min) el.min = '1950-01-01'; if (!el.max) el.max = '2100-12-31'; }
  }, true);
})();

// 4.24 · Antes de enviar qualquer formulário: obrigatório só com espaços, ou número/data fora do limite, é barrado aqui
// (o servidor também recusa, mas aí o lançamento viraria pendência no aparelho). Vale também para formulários "novalidate".
(function () {
  const nome = el => (el.closest('label')?.childNodes[0]?.textContent || el.name || 'o campo').trim();
  document.addEventListener('submit', e => {
    const form = e.target; if (!(form instanceof HTMLFormElement)) return;
    for (const el of form.querySelectorAll('input, textarea')) {
      if (el.disabled || el.type === 'hidden' || el.type === 'file') continue;
      const vazio = el.required && !['number', 'date', 'checkbox', 'radio'].includes(el.type) && !String(el.value).trim();
      const fora = ['number', 'date'].includes(el.type) && el.value !== '' && (el.validity.rangeOverflow || el.validity.rangeUnderflow || el.validity.badInput);
      if (!vazio && !fora) continue;
      e.preventDefault(); e.stopImmediatePropagation();
      if (typeof toast === 'function') toast(vazio ? `Preencha "${nome(el)}" (só espaços não vale).` : el.type === 'date' ? `"${nome(el)}": use uma data entre 1950 e 2100.` : `"${nome(el)}": valor fora do limite.`);
      el.focus(); return;
    }
  }, true);
})();
