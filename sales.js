const moneyBR = v => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toast = msg => { const el=document.querySelector("#salesToast"); el.textContent=msg; el.classList.add("show"); clearTimeout(window.__salesToast); window.__salesToast=setTimeout(()=>el.classList.remove("show"),3500); };
const qs = s => document.querySelector(s);
const escHTML = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
let paymentConfigured = false;
let currentPurchaseId = new URLSearchParams(location.search).get("purchase") || "";
let selectedCycle = "monthly";
let activityPricing = {};
let selectedActivities = [document.body.dataset.landing].filter(a => ["coffee","cattle","grains"].includes(a));
let planCatalog = {
  essential:{id:"essential",name:"Essencial",monthlyPrice:null},
  pro:{id:"pro",name:"Profissional",monthlyPrice:null},
  group:{id:"group",name:"Grupo",monthlyPrice:null}
};
let cycles = {
  monthly:{id:"monthly",label:"Mensal",months:1,discount:0},
  quarterly:{id:"quarterly",label:"Trimestral",months:3,discount:.05},
  semiannual:{id:"semiannual",label:"Semestral",months:6,discount:.10},
  annual:{id:"annual",label:"Anual",months:12,discount:.20}
};

const roundMoney=v=>Math.round((Number(v)+Number.EPSILON)*100)/100;
async function jsonFetch(url, options={}){
  const r=await fetch(url,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});
  let j={}; try{j=await r.json()}catch(_){ }
  if(!r.ok) throw new Error(j.error||`Erro ${r.status}`);
  return j;
}

function updatePricing(){
  const cycle=cycles[selectedCycle]||cycles.monthly;
  document.querySelectorAll("#billingSwitch [data-cycle]").forEach(b=>{const active=b.dataset.cycle===selectedCycle;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});
  document.querySelectorAll('[name="subscriptionActivity"]').forEach(input=>{input.checked=selectedActivities.includes(input.value);input.closest('label').classList.toggle('selected',input.checked);});
  const labels=SubscriptionDomain.activities.filter(a=>selectedActivities.includes(a.id)).map(a=>a.name);
  qs('#activitySelectionSummary').textContent=labels.length ? labels.length+' atividade'+(labels.length>1?'s':'')+': '+labels.join(' + ') : 'Escolha pelo menos uma atividade.';
  document.querySelectorAll('.plan-card[data-plan]').forEach(card=>{
    const features={coffee:'Café: safras, talhões, colheitas e aplicações',cattle:'Gado: lotes, piquetes, pesagens e manejos',grains:'Grãos: soja, milho e trigo por safra'};
    const included=card.querySelector('.included-activity-features');
    if(included)included.textContent=selectedActivities.length?selectedActivities.map(a=>features[a]).join(' · '):'Selecione as atividades acima.';
    const result=selectedActivities.length?SubscriptionDomain.quote(card.dataset.plan,cycle,selectedActivities,activityPricing):{ready:false};
    card.querySelector('[data-price]').textContent=result.ready?moneyBR(result.amount):'—';
    const currency=card.querySelector('[data-currency]');if(currency)currency.hidden=!result.ready;
    card.querySelector('[data-period]').textContent=result.ready?(cycle.months===1?'/mês':cycle.months===3?'/trimestre':cycle.months===6?'/semestre':'/ano'):'';
    card.querySelector('[data-saving]').textContent=result.ready?(cycle.months>1?'Equivale a R$ '+moneyBR(result.perMonth)+'/mês · ':'')+labels.join(' + '):'Escolha as atividades para ver o preço.';
    card.querySelector('.buy-plan').textContent=result.ready?'Continuar com '+planCatalog[card.dataset.plan].name:'Selecionar este porte';
  });
}
document.querySelectorAll('[name="subscriptionActivity"]').forEach(input=>input.addEventListener('change',()=>{selectedActivities=[...document.querySelectorAll('[name="subscriptionActivity"]:checked')].map(el=>el.value);qs('#subscriptionChoice').classList.add('hidden');updatePricing();}));
qs('#selectAllActivities').addEventListener('click',()=>{selectedActivities=SubscriptionDomain.activities.map(a=>a.id);qs('#subscriptionChoice').classList.add('hidden');updatePricing();});

async function loadConfig(){
  try{
    const c=await jsonFetch("/api/public/config");
    if(Array.isArray(c.plans)) planCatalog=Object.fromEntries(c.plans.map(p=>[p.id,p]));
    if(Array.isArray(c.billingCycles)) cycles=Object.fromEntries(c.billingCycles.map(x=>[x.id,{...x,discount:Number(x.discount||0)}]));
    activityPricing=c.activityPricing||{};
    paymentConfigured=Boolean(c.paymentConfigured);
    updatePricing();
  }catch(_){ updatePricing(); }
}

async function checkPurchase(){
  if(!currentPurchaseId) return;
  try{
    const status=await jsonFetch(`/api/public/purchases/${encodeURIComponent(currentPurchaseId)}/status`);
    if(status.used){ toast("Esta compra já foi usada para criar um Grupo."); return; }
    if(status.canOnboard){
      qs("#onboarding").classList.remove("hidden");
      qs("#onboarding").scrollIntoView({behavior:"smooth",block:"start"});
      const p=planCatalog[status.planId]; const c=cycles[status.billingCycle];
      toast(`Assinatura ${p?.name||""} ${c?.label||""} confirmada. Agora crie seu Grupo e o primeiro CEO.`.trim());
    }else toast(`Assinatura: ${status.status || "aguardando confirmação"}. Atualize a página após a aprovação do pagamento.`);
  }catch(e){ toast(e.message); }
}

document.querySelectorAll("#billingSwitch [data-cycle]").forEach(btn=>btn.addEventListener("click",()=>{selectedCycle=btn.dataset.cycle;updatePricing()}));

function askEmail(planId){
  return new Promise(resolve=>{
    const plan=planCatalog[planId]||{}, cycle=cycles[selectedCycle]||cycles.monthly;
    const total=SubscriptionDomain.quote(planId,cycle,selectedActivities,activityPricing).amount;
    const back=document.createElement("div"); back.className="mail-back";
    back.innerHTML=`<form class="mail-dlg" role="dialog" aria-modal="true" aria-labelledby="mailTitle"><h3 id="mailTitle">Plano ${plan.name||""} • ${cycle.label}</h3><p>R$ ${moneyBR(total)}${cycle.months>1?` a cada ${cycle.months} meses (equivale a R$ ${moneyBR(total/cycle.months)}/mês)`:" por mês"}. Informe o e-mail que vai receber a assinatura e os dados de acesso.</p><label>E-mail<input type="email" name="email" required autocomplete="email" placeholder="voce@empresa.com.br"></label><div class="mail-actions"><button type="button" class="mail-cancel" data-x>Cancelar</button><button type="submit" class="btn btn-cafe">Ir para o pagamento</button></div></form>`;
    document.body.appendChild(back);
    const f=back.querySelector("form"), done=v=>{back.remove();resolve(v)};
    back.querySelector("[data-x]").onclick=()=>done("");
    back.addEventListener("mousedown",e=>{if(e.target===back)done("")});
    back.addEventListener("keydown",e=>{if(e.key==="Escape")done("")});
    f.onsubmit=e=>{e.preventDefault();done(f.email.value.trim())};
    setTimeout(()=>f.email.focus(),30);
  });
}

document.querySelectorAll(".buy-plan").forEach(button=>button.addEventListener("click",async()=>{
  const planId=button.dataset.plan;
  if(!selectedActivities.length){toast("Escolha pelo menos uma atividade.");qs("#t-activities").scrollIntoView({behavior:"smooth",block:"center"});return;}
  const quote=SubscriptionDomain.quote(planId,cycles[selectedCycle],selectedActivities,activityPricing);
  if(!quote.ready){const chosen=SubscriptionDomain.activities.filter(a=>selectedActivities.includes(a.id)).map(a=>a.name).join(" + ");const summary=qs("#subscriptionChoice");summary.textContent="Sua escolha: "+chosen+" · "+planCatalog[planId].name+" · "+cycles[selectedCycle].label+". Valores a definir. Nenhuma cobrança foi realizada.";summary.classList.remove("hidden");summary.scrollIntoView({behavior:"smooth",block:"center"});return;}
  let email=qs("#buyerEmail").value.trim();
  if(!/^\S+@\S+\.\S+$/.test(email)){ email=await askEmail(planId); if(!email) return; qs("#buyerEmail").value=email; }
  const plan=planCatalog[planId], cycle=cycles[selectedCycle];
  button.disabled=true; const original=button.textContent; button.textContent="Abrindo pagamento...";
  try{
    const j=await jsonFetch("/api/public/checkout",{method:"POST",body:JSON.stringify({email,planId,billingCycle:selectedCycle,activities:SubscriptionDomain.normalize(selectedActivities)})});
    localStorage.setItem("gestaoRuralPurchaseId",j.purchaseId||"");
    location.href=j.checkoutUrl;
  }catch(e){ toast(e.message||"Checkout indisponível."); }
  finally{ button.disabled=false; button.textContent=original; }
}));

// Teste grátis: 14 dias com as funções do Profissional, sem cartão.
qs("#startTrial")?.addEventListener("click",()=>{
  if(!selectedActivities.length){toast("Escolha pelo menos uma atividade.");qs("#t-activities").scrollIntoView({behavior:"smooth",block:"center"});return;}
  const back=document.createElement("div"); back.className="mail-back";
  const names=SubscriptionDomain.activities.filter(a=>selectedActivities.includes(a.id)).map(a=>a.name).join(" + ");
  back.innerHTML=`<form class="mail-dlg" role="dialog" aria-modal="true" aria-labelledby="trialTitle"><h3 id="trialTitle">Teste grátis · ${escHTML(names)}</h3><p>14 dias com as funções do Profissional. Sem cartão.</p>
    <label>E-mail<input name="email" type="email" required autocomplete="email" value="${escHTML(qs("#buyerEmail")?.value||"")}"></label>
    <label>Nome do Grupo ou da fazenda<input name="groupName" required placeholder="Ex.: Fazenda Boa Vista"></label>
    <label>Seu nome<input name="ceoName" required autocomplete="name"></label>
    <label>Usuário para entrar<input name="ceoUser" required pattern="[a-zA-Z0-9._-]{3,30}" placeholder="Ex.: joaosilva"></label>
    <label>Senha<input name="ceoPassword" type="password" minlength="8" required autocomplete="new-password" placeholder="Mínimo 8 caracteres"></label>
    <div class="mail-actions"><button type="button" class="btn" data-x>Cancelar</button><button class="btn btn-cafe" type="submit">Começar teste</button></div><p class="trial-result" role="status"></p></form>`;
  document.body.appendChild(back);
  const f=back.querySelector("form"), close=()=>back.remove();
  back.querySelector("[data-x]").onclick=close; back.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
  f.onsubmit=async e=>{
    e.preventDefault(); const btn=f.querySelector("[type=submit]"); btn.disabled=true; btn.textContent="Criando...";
    try{
      const j=await jsonFetch("/api/public/trial",{method:"POST",body:JSON.stringify({...Object.fromEntries(new FormData(f).entries()),activities:SubscriptionDomain.normalize(selectedActivities)})});
      localStorage.setItem("lastGroupCode",j.group.code);
      f.innerHTML=`<h3>Teste liberado até ${new Date(j.endsAt).toLocaleDateString("pt-BR")}.</h3><p>Seu <b>Código do Grupo</b> é <strong>${escHTML(j.group.code)}</strong>. Guarde este número: ele, o usuário e a senha são o seu acesso.</p><div class="mail-actions"><a class="btn btn-cafe" href="/app?grupo=${encodeURIComponent(j.group.code)}">Entrar no painel</a></div>`;
    }catch(err){ toast(err.message); btn.disabled=false; btn.textContent="Começar teste"; }
  };
  setTimeout(()=>f.email.focus(),30);
});
// Cadastro depois do pagamento: quem já testou continua no mesmo Grupo.
qs("#hasTrial")?.addEventListener("change",e=>{
  const on=e.target.checked;
  document.querySelectorAll("#onboardingForm .trial-only").forEach(el=>el.classList.toggle("hidden",!on));
  for(const id of ["groupName","ceoName"]){const el=qs("#"+id);if(el){el.required=!on;el.closest("label").classList.toggle("hidden",on);}}
  qs("#trialGroupCode").required=on;
});

qs("#onboardingForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!currentPurchaseId) return toast("Compra não identificada.");
  const btn=e.submitter; btn.disabled=true; btn.textContent="Criando Grupo...";
  try{
    const values=Object.fromEntries(new FormData(e.target).entries());
    if(!qs("#hasTrial")?.checked) delete values.trialGroupCode;
    const j=await jsonFetch(`/api/public/purchases/${encodeURIComponent(currentPurchaseId)}/onboard`,{method:"POST",body:JSON.stringify(values)});
    qs("#onboardingForm").classList.add("hidden");
    const done=qs("#onboardingDone"); done.classList.remove("hidden");
    // Nome do Grupo é texto digitado: entra escapado. O link é sempre o do próprio app.
    done.innerHTML=j.convertedTrial?`<h3>Assinatura ligada ao Grupo ${escHTML(j.group.name)}.</h3><p>Seus dados do teste continuam. Entre com o <b>Código do Grupo</b> <strong>${escHTML(j.group.code)}</strong>, o usuário e a senha de sempre.</p><a class="btn primary xl" href="/app?grupo=${encodeURIComponent(j.group.code)}">Entrar no meu Grupo</a>`:`<h3>${escHTML(j.group.name)} criado com sucesso.</h3><p>Seu <b>Código do Grupo</b> é <strong>${escHTML(j.group.code)}</strong>. Guarde este número. Entre com ele, o usuário e a senha do CEO.</p><a class="btn primary xl" href="/app?grupo=${encodeURIComponent(j.group.code)}">Entrar no meu Grupo</a>`;
    localStorage.setItem("lastGroupCode",j.group.code);
    history.replaceState({},"",location.pathname);
    toast("Grupo e CEO criados.");
  }catch(err){ toast(err.message); }
  finally{ btn.disabled=false; btn.textContent="Criar meu Grupo"; }
});

(async()=>{
  await loadConfig();
  const params=new URLSearchParams(location.search);
  if(!currentPurchaseId) currentPurchaseId=localStorage.getItem("gestaoRuralPurchaseId")||"";
  if(params.get("checkout")==="success" && currentPurchaseId) await checkPurchase();
})();

