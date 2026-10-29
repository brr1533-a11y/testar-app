/* Projeção e preservação dos dados de módulos contratados. Uso exclusivo do servidor. */
const S=require('./subscription-domain');
const clone=x=>JSON.parse(JSON.stringify(x)),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const collections=['stock','finances','notes','plotProcedures','assignments','equipmentLogs','soilAnalyses'];
// Atividade (café, gado, grãos) do registro. No trabalho do dia e no log de equipamento, "activity" é o texto do
// serviço ("Roçada") e a atividade fica em "activityModule"; sem isso esses registros sumiam até para o CEO.
const MODULES=['coffee','cattle','grains'];
const moduleOf=r=>r.activityModule||(MODULES.includes(r.activity)?r.activity:'coffee');
const emptyCattle=()=>({paddocks:[],lots:[],weighings:[],healthEvents:[]});
function project(input){
 const state=clone(input),licensed=S.licensed(state),has=a=>licensed.includes(a);
 if(!has('coffee'))state.coffeeQualities=[];if(!has('cattle'))state.cattleStages=[];
 for(const f of state.farms||[]){
  for(const key of collections)f[key]=(f[key]||[]).filter(r=>has(moduleOf(r)));
  if(!has('coffee'))f.banho={products:[],orders:[]};if(!has('cattle'))f.cattle=emptyCattle();
  const a=f.agriculture||{cycles:[],harvests:[],sales:[]};a.cycles=(a.cycles||[]).filter(c=>has(c.activity));const ids=new Set(a.cycles.map(c=>c.id));for(const key of ['harvests','sales','history'])a[key]=(a[key]||[]).filter(r=>ids.has(r.cycleId));f.agriculture=a;
  for(const key of Object.keys(f.operations||{}))if(Array.isArray(f.operations[key]))f.operations[key]=f.operations[key].filter(r=>has(r.activity));
  // Módulos de campo (pós-colheita, pragas, reprodução, sanidade, GTA e leite): cada registro diz a atividade.
  for(const key of Object.keys(f.field||{}))if(Array.isArray(f.field[key]))f.field[key]=f.field[key].filter(r=>has(r.activity));
  // Gestão (compras, contas, manutenção...): registro sem atividade continua visível.
  for(const key of Object.keys(f.management||{}))if(Array.isArray(f.management[key]))f.management[key]=f.management[key].filter(r=>!MODULES.includes(r.activity)||has(r.activity));
 }
 if(licensed.length<3)state.audit=(state.audit||[]).filter(e=>!e.activity||has(e.activity));
 return state;
}
function restore(before,input){
 const after=clone(input),licensed=S.licensed(before),has=a=>licensed.includes(a),deny=()=>{throw Object.assign(new Error('Esta operação usa uma atividade que não faz parte da assinatura.'),{statusCode:403});};
 const rows=(old=[],next=[],activity=moduleOf)=>{const hidden=old.filter(r=>!has(activity(r)));for(const r of next.filter(r=>!has(activity(r))))if(!hidden.some(o=>o.id===r.id&&equal(o,r)))deny();return [...next.filter(r=>has(activity(r))),...hidden];};
 if(!has('coffee')){if(after.coffeeQualities?.length&&!equal(after.coffeeQualities,before.coffeeQualities))deny();if(before.coffeeQualities===undefined)delete after.coffeeQualities;else after.coffeeQualities=clone(before.coffeeQualities);}
 if(!has('cattle')){if(after.cattleStages?.length&&!equal(after.cattleStages,before.cattleStages))deny();if(before.cattleStages===undefined)delete after.cattleStages;else after.cattleStages=clone(before.cattleStages);}
 for(const f of after.farms||[]){const old=(before.farms||[]).find(p=>p.id===f.id)||{};
  for(const key of collections)f[key]=rows(old[key],f[key]);
  for(const [activity,key,empty]of [['coffee','banho',{products:[],orders:[]}],['cattle','cattle',emptyCattle()]])if(!has(activity)){const proposed=f[key]||empty;if(Object.values(proposed).some(v=>Array.isArray(v)&&v.length)&&!equal(proposed,old[key]))deny();f[key]=clone(old[key]||empty);}
  const a=f.agriculture||{cycles:[],harvests:[],sales:[]},prior=old.agriculture||{cycles:[],harvests:[],sales:[]};a.cycles=rows(prior.cycles,a.cycles,c=>c.activity);const type=id=>a.cycles.find(c=>c.id===id)?.activity||(prior.cycles||[]).find(c=>c.id===id)?.activity;
  for(const key of ['harvests','sales'])a[key]=rows(prior[key],a[key],r=>type(r.cycleId));a.history=clone(prior.history||[]);f.agriculture=a;
  f.operations||={};for(const key of new Set([...Object.keys(old.operations||{}),...Object.keys(f.operations)]))if(Array.isArray(old.operations?.[key])||Array.isArray(f.operations[key]))f.operations[key]=rows(old.operations?.[key],f.operations[key],r=>r.activity);
  if(f.field||old.field){f.field||={};for(const key of new Set([...Object.keys(old.field||{}),...Object.keys(f.field)]))if(Array.isArray(old.field?.[key])||Array.isArray(f.field[key]))f.field[key]=rows(old.field?.[key],f.field[key],r=>r.activity);}
  if(f.management||old.management){f.management||={};const act=r=>MODULES.includes(r.activity)?r.activity:licensed[0];for(const key of new Set([...Object.keys(old.management||{}),...Object.keys(f.management)]))if(Array.isArray(old.management?.[key])||Array.isArray(f.management[key]))f.management[key]=rows(old.management?.[key],f.management[key],act);}
 }
 return after;
}
module.exports={project,restore};
