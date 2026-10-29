function varietyFields(crop,existing=''){
 const known=(RuralInputs.VARIETIES[crop]||[]).includes(existing);
 return [{name:'variety',label:'Variedade / cultivar',type:'select',options:RuralInputs.varietyOptions(crop),value:known?existing:existing?'__other':''},{name:'otherVariety',label:'Outra variedade / cultivar',value:known?'':existing,hint:'Use este campo quando a cultivar não estiver na lista.'}];
}
function bindVarieties(form,existing=''){
 const crop=form?.elements.namedItem('crop'),select=form?.elements.namedItem('variety'),other=form?.elements.namedItem('otherVariety');if(!crop||!select||!other)return;
 const toggle=()=>{other.closest('label').hidden=select.value!=='__other';other.required=select.value==='__other';};
 crop.addEventListener('change',()=>{select.innerHTML=RuralInputs.varietyOptions(crop.value).map(([v,l])=>`<option value="${escapeHTML(v)}">${escapeHTML(l)}</option>`).join('');other.value='';toggle();});select.addEventListener('change',toggle);toggle();
}
function finishVariety(v){v.variety=v.variety==='__other'?String(v.otherVariety||'').trim():v.variety||'';delete v.otherVariety;return v;}
function quantityFields(name,bagKg,unit='kg',kg=null){return [
 {name,label:'Quantidade',type:'number',min:'.000001',step:'any',required:true,value:kg==null?'':unit==='bags'?kg/bagKg:kg},
 {name:name+'Unit',label:'Unidade informada',type:'select',options:[['kg','Quilos (kg)'],['bags','Sacas / sacos de '+ruralNum(bagKg)+' kg']],value:unit},
 {name:name+'Preview',label:'Conversão automática',type:'preview',value:'Informe a quantidade para ver a equivalência.',wide:true}
 ];}
function bindQuantity(form,name,bagKg){
 const input=form.elements.namedItem(name),unit=form.elements.namedItem(name+'Unit'),output=form.querySelector('[data-preview="'+name+'Preview"]');if(!input||!unit||!output)return;
 const update=()=>{try{const kg=RuralInputs.toKg(input.value,unit.value,bagKg);output.textContent=ruralNum(kg,6)+' kg = '+ruralNum(kg/bagKg,6)+' sacas de '+ruralNum(bagKg)+' kg';}catch{output.textContent='Informe a quantidade para ver a equivalência.';}};
 input.addEventListener('input',update);unit.addEventListener('change',update);update();
}
