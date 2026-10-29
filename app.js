const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const ROLE_NAMES = { ceo: "CEO", adm: "Administrador", contribuinte: "Contribuinte" };
const COFFEE_STOCK = ["Adubos", "Fertilizantes", "Defensivos", "Combustível", "Peças", "EPIs", "Sacaria", "Ferramentas", "Outros"];
const CATTLE_STOCK = ["Ração", "Sal mineral", "Medicamentos", "Vacinas", "Combustível", "Cercas", "Peças", "EPIs", "Ferramentas", "Outros"];
const COFFEE_FINANCE = ["Venda de café", "Adubos", "Fertilizantes", "Defensivos", "Combustível", "Manutenção", "Mão de obra", "Frete", "Impostos", "Serviços", "Outros"];
const CATTLE_FINANCE = ["Venda de gado", "Compra de gado", "Ração", "Sal mineral", "Medicamentos", "Vacinas", "Veterinário", "Combustível", "Manutenção", "Mão de obra", "Frete", "Impostos", "Serviços", "Outros"];
const STORAGE_KEY = "fazendaCloudCacheV21";
const PLAN_LIMITS = { essential: { name: "Essencial", maxFarms: 1, usersPerFarm: 10 }, pro: { name: "Profissional", maxFarms: 5, usersPerFarm: 10 }, group: { name: "Grupo", maxFarms: Infinity, usersPerFarm: 10 } };
function cacheStorageKey(slug = "") { return `${STORAGE_KEY}:${slug || localStorage.getItem("lastGroupSlug") || "default"}`; }

const ICONS = {
  grid: `<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>`,
  tractor: `<circle cx="7" cy="16.5" r="3.5"/><circle cx="18" cy="17.5" r="2.5"/><path d="M10.5 16.5h5M3.5 13V9h6l2 4h7v2.5M9.5 9V5.5H13"/>`,
  cattle: `<path d="M5 6C3.5 6 2.5 7 2.5 8.5S4 11 6 11M19 6c1.5 0 2.5 1 2.5 2.5S20 11 18 11"/><path d="M6 9c0-2 1.5-3.5 3-3.5h6c1.5 0 3 1.5 3 3.5v4c0 3-2 6-6 6s-6-3-6-6z"/><path d="M9.5 15.5h5"/>`,
  box: `<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>`,
  chart: `<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>`,
  receipt: `<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>`,
  wallet: `<path d="M3.5 7.5a2 2 0 0 1 2-2H18v3"/><rect x="3.5" y="8.5" width="17" height="11" rx="2"/><circle cx="16.5" cy="14" r="1"/>`,
  home: `<path d="M3.5 11 12 4l8.5 7M5.5 9.5V20h13V9.5M10 20v-5h4v5"/>`,
  users: `<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 5a3 3 0 0 1 0 6M18 14.8c2 .6 3.5 2.3 3.5 5.2"/>`,
  check: `<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.3 2.5 2.5 4.5-5"/>`,
  swap: `<path d="M7 4v14M3.5 14.5 7 18l3.5-3.5M17 20V6M13.5 9.5 17 6l3.5 3.5"/>`,
  gear: `<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>`,
  hash: `<path d="M9 4 7 20M17 4l-2 16M4 9h16M3.5 15h16"/>`,
  at: `<circle cx="12" cy="12" r="3.5"/><path d="M15.5 8.5v5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.5 6.9"/>`,
  up: `<path d="M7 17 17 7M8 7h9v9"/>`,
  down: `<path d="m7 7 10 10M17 8v9H8"/>`,
  bean: `<ellipse cx="12" cy="12" rx="6" ry="8.5" transform="rotate(35 12 12)"/><path d="M9 8.5c2.5 1 3.5 2.5 3 4.5s.5 3 3 3.5"/>`,
  logout: `<path d="M14 4h4.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H14M10 8l-4 4 4 4M6 12h10"/>`
};
function ico(n) { return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`; }


// ---------- Janelas próprias (substituem confirm/prompt/alert do navegador) ----------
function openDialog(build) {
  return new Promise(resolve => {
    const back = document.createElement("div");
    back.className = "dlg-back";
    back.innerHTML = build();
    document.body.appendChild(back);
    const form = back.querySelector("form");
    const previous = document.activeElement;
    const close = value => { back.classList.add("closing"); setTimeout(() => back.remove(), 160); if (previous && previous.focus) previous.focus(); resolve(value); };
    back.addEventListener("mousedown", e => { if (e.target === back) close(null); });
    back.querySelectorAll("[data-dlg-cancel]").forEach(b => b.onclick = () => close(null));
    back.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); close(null); } });
    form.onsubmit = e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const out = {};
      new FormData(form).forEach((v, k) => { out[k] = v; });
      form.querySelectorAll("select[multiple][name]").forEach(el=>{out[el.name]=[...el.selectedOptions].map(o=>o.value);});
      form.querySelectorAll('[data-choice-name]').forEach(group=>{out[group.dataset.choiceName]=[...group.querySelectorAll('input:checked')].map(c=>c.value);});
      const empty=[...form.querySelectorAll('[data-choice-required]')].find(g=>!g.querySelector('input:checked'));if(empty){toast('Escolha pelo menos uma opção em '+empty.querySelector('legend').textContent);empty.querySelector('input')?.focus();return;}
      form.querySelectorAll("input[type=checkbox][name]:not([data-choice])").forEach(c => { out[c.name] = c.checked; });
      close(out);
    };
    setTimeout(() => (form.querySelector("[autofocus]") || form.querySelector("input,select,textarea,button[type=submit]"))?.focus(), 30);
  });
}
async function ask(message, { title = "Confirmar", okText = "Confirmar", danger = false } = {}) {
  const r = await openDialog(() => `<form class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">
    <h3 id="dlgTitle">${escapeHTML(title)}</h3><p>${escapeHTML(message)}</p>
    <div class="dlg-actions"><button type="button" class="btn" data-dlg-cancel>Cancelar</button><button type="submit" class="btn ${danger ? "danger strong" : "primary"}">${escapeHTML(okText)}</button></div></form>`);
  return Boolean(r);
}
const confirmDelete = (what, extra = "") => ask(`${what} será excluído${extra ? `. ${extra}` : ""}. Essa ação não pode ser desfeita.`, { title: "Excluir?", okText: "Excluir", danger: true });
function fieldHTML(f) {
  const id = `dlg_${f.name}`;
  const common = `id="${id}" name="${f.name}" ${f.required ? "required" : ""} ${f.autofocus ? "autofocus" : ""} ${f.readOnly ? "readonly" : ""}`;
  let input;
  if(f.type==='choices')return `<fieldset class="choice-field ${f.wide?'wide':''}" data-choice-name="${escapeHTML(f.name)}" ${f.required?'data-choice-required':''}><legend>${escapeHTML(f.label)}</legend><div class="choice-grid">${(f.options||[]).map(([v,l])=>`<label class="choice-card"><input type="checkbox" data-choice name="${escapeHTML(f.name)}" value="${escapeHTML(v)}" ${(f.value||[]).includes(v)?'checked':''}><span>${escapeHTML(l)}</span></label>`).join('')}</div></fieldset>`;
  if(f.type==='preview')return `<div class="quantity-preview wide"><span>${escapeHTML(f.label)}</span><output data-preview="${escapeHTML(f.name)}" aria-live="polite">${escapeHTML(f.value||'')}</output></div>`;
  if (f.type === "select") input = `<select ${common}>${(f.options || []).map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${escapeHTML(v)}" ${String(v) === String(f.value ?? "") ? "selected" : ""}>${escapeHTML(l)}</option>`; }).join("")}</select>`;
  else if (f.type === "multiselect") input = `<select ${common} multiple>${(f.options || []).map(([v,l])=>`<option value="${escapeHTML(v)}" ${(f.value||[]).includes(v)?'selected':''}>${escapeHTML(l)}</option>`).join('')}</select>`;
  else if (f.type === "textarea") input = `<textarea ${common} rows="3">${escapeHTML(f.value ?? "")}</textarea>`;
  else input = `<input ${common} type="${f.type || "text"}" value="${escapeHTML(f.value ?? "")}" ${f.min != null ? `min="${f.min}"` : ""} ${f.step != null ? `step="${f.step}"` : ""} ${f.minlength ? `minlength="${f.minlength}"` : ""} ${f.autocomplete ? `autocomplete="${f.autocomplete}"` : ""} ${f.placeholder ? `placeholder="${escapeHTML(f.placeholder)}"` : ""}>`;
  return `<label class="${f.wide ? "wide" : ""}" for="${id}">${escapeHTML(f.label)}${input}${f.hint ? `<small>${escapeHTML(f.hint)}</small>` : ""}</label>`;
}
function askForm({ title, text = "", fields = [], okText = "Salvar", danger = false, wide = false, onReady = null }) {
  const pending = openDialog(() => `<form class="dlg ${wide ? "dlg-wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="dlgTitle" novalidate>
    <h3 id="dlgTitle">${escapeHTML(title)}</h3>${text ? `<p>${escapeHTML(text)}</p>` : ""}
    <div class="dlg-grid">${fields.map(fieldHTML).join("")}</div>
    <div class="dlg-actions"><button type="button" class="btn" data-dlg-cancel>Cancelar</button><button type="submit" class="btn ${danger ? "danger strong" : "primary"}">${escapeHTML(okText)}</button></div></form>`);
  onReady?.(document.querySelector('.dlg-back:not(.closing) form'));
  return pending;
}

// ---------- Junção de alterações (três vias) ----------
// base = última versão do servidor que esta tela conhecia; local = como está nesta tela; remote = versão nova do servidor.
// O que só um lado mudou é mantido. Itens de listas são casados pelo id, então dois lançamentos novos nunca se apagam.
const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function isIdList(arr) { return Array.isArray(arr) && arr.length > 0 && arr.every(x => x && typeof x === "object" && "id" in x); }
function merge3(base, local, remote) {
  if (sameJSON(local, base)) return remote === undefined ? undefined : JSON.parse(JSON.stringify(remote));
  if (sameJSON(remote, base) || remote === undefined && base === undefined) return local === undefined ? undefined : JSON.parse(JSON.stringify(local));
  if (Array.isArray(local) && Array.isArray(remote)) {
    if (!(isIdList(local) || isIdList(remote) || isIdList(base || []))) return JSON.parse(JSON.stringify(local));
    const bm = new Map((base || []).map(x => [String(x.id), x]));
    const lm = new Map(local.map(x => [String(x.id), x]));
    const rm = new Map(remote.map(x => [String(x.id), x]));
    const out = [];
    for (const r of remote) {
      const id = String(r.id), b = bm.get(id), l = lm.get(id);
      if (!l) { if (!b) out.push(r); else if (!sameJSON(r, b)) out.push(r); continue; }
      out.push(b ? merge3(b, l, r) : l);
    }
    for (const l of local) { const id = String(l.id); if (!rm.has(id) && !bm.has(id)) out.push(l); }
    return out;
  }
  if (local && remote && typeof local === "object" && typeof remote === "object" && !Array.isArray(local) && !Array.isArray(remote)) {
    const out = {};
    const keys = new Set([...Object.keys(remote), ...Object.keys(local), ...Object.keys(base || {})]);
    for (const k of keys) {
      const v = merge3(base ? base[k] : undefined, local[k], remote[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return local === undefined ? undefined : JSON.parse(JSON.stringify(local));
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function newFarm(name) {
  return {
    id: uid(),
    name,
    type: "mixed",
    photo: "",
    tractors: [],
    implements: [],
    stock: [],
    finances: [],
    notes: [],
    assignments: [],
    equipmentLogs: [],
    talhoes: [],
    plotProcedures: [],
    soilAnalyses: [],
    banho: { products: [], orders: [] },
    agriculture: { cycles: [], harvests: [], sales: [] },
    cattle: { paddocks: [], lots: [], weighings: [], healthEvents: [] }
  };
}

function defaultData() {
  return {
    version: 21,
    interfaceMode: "coffee",
    users: [],
    pendingRegistrations: [],
    farms: [
      newFarm("Fazenda Santa Clara"),
      newFarm("Fazenda Boa Vista"),
      newFarm("Fazenda Monte Verde"),
      newFarm("Fazenda São Bento")
    ],
    receipts: []
  };
}

function dataUserFunctionFallback(users, username) {
  const u = (users || []).find(x => x.username === username);
  return u?.function || "Campo";
}

function migrateData(raw) {
  const d = raw && typeof raw === "object" ? raw : defaultData();
  d.version = 21;
  d.interfaceMode = RuralDomain.ACTIVITIES.includes(d.interfaceMode) ? d.interfaceMode : "coffee";
  d.users = Array.isArray(d.users) ? d.users : [];
  d.pendingRegistrations = Array.isArray(d.pendingRegistrations) ? d.pendingRegistrations : [];
  d.farms = Array.isArray(d.farms) && d.farms.length ? d.farms : defaultData().farms;
  d.receipts = Array.isArray(d.receipts) ? d.receipts : [];

  d.users.forEach(u => {
    u.id = u.id || uid();
    u.active = u.active !== false;
    u.function = u.function || "";
    u.pixKey = u.pixKey || "";
    if (u.role === "contribuinte") {
      u.function = ["Tratorista", "Campo", "Fiscal de colheita"].includes(u.function) ? u.function : "Campo";
      const validFarm = d.farms.some(f => f.id === u.allowedFarmId);
      u.allowedFarmId = validFarm ? u.allowedFarmId : (d.farms[0]?.id || "");
      u.allowedActivity = RuralDomain.PERMISSIONS.includes(u.allowedActivity) ? u.allowedActivity : "both";
    } else {
      if (u.role === "adm" && (!u.function || ["Tratorista", "Campo"].includes(u.function))) u.function = "Administração";
      if (u.role === "ceo" && !u.function) u.function = "CEO";
      u.allowedFarmId = "";
      u.allowedActivity = "both";
    }
  });

  d.pendingRegistrations.forEach(r => {
    r.id = r.id || uid();
    r.role = ["adm", "contribuinte"].includes(r.role) ? r.role : "contribuinte";
    if (r.role === "contribuinte") {
      r.function = ["Tratorista", "Campo"].includes(r.function) ? r.function : "Campo";
      r.allowedActivity = RuralDomain.PERMISSIONS.includes(r.allowedActivity) ? r.allowedActivity : "both";
    } else {
      r.function = "Administração";
      r.allowedActivity = "both";
    }
    r.pixKey = r.pixKey || "";
  });

  d.farms.forEach(f => {
    f.id = f.id || uid();
    f.name = f.name || "Fazenda";
    const legacyActivity = f.type === "cattle" ? "cattle" : "coffee";
    f.type = "mixed";
    f.photo = f.photo || "";
    f.tractors = Array.isArray(f.tractors) ? f.tractors : [];
    f.implements = Array.isArray(f.implements) ? f.implements : [];
    f.stock = Array.isArray(f.stock) ? f.stock : [];
    f.finances = Array.isArray(f.finances) ? f.finances : [];
    f.notes = Array.isArray(f.notes) ? f.notes : [];
    f.assignments = Array.isArray(f.assignments) ? f.assignments : [];
    f.talhoes = Array.isArray(f.talhoes) ? f.talhoes : [];
    f.plotProcedures = Array.isArray(f.plotProcedures) ? f.plotProcedures : [];
    f.soilAnalyses = Array.isArray(f.soilAnalyses) ? f.soilAnalyses : [];
    f.talhoes.forEach(t => { t.id = t.id || uid(); t.name = t.name || "Talhão"; t.reference = String(t.reference || ""); });
    f.banho = f.banho && typeof f.banho === "object" ? f.banho : {};
    f.banho.products = Array.isArray(f.banho.products) ? f.banho.products : [];
    f.banho.orders = Array.isArray(f.banho.orders) ? f.banho.orders : [];
    f.banho.products.forEach(p => {
      p.id = p.id || uid(); p.name = p.name || "Produto"; p.unit = p.unit === "kg" ? "kg" : "L"; p.active = p.active !== false;
    });
    f.banho.orders.forEach(o => {
      o.id = o.id || uid(); o.title = o.title || "Banho";
      o.talhaoIds = Array.isArray(o.talhaoIds) ? o.talhaoIds : [];
      o.talhaoNames = Array.isArray(o.talhaoNames) ? o.talhaoNames : [];
      o.products = Array.isArray(o.products) ? o.products : [];
      o.status = ["draft", "released", "completed", "cancelled"].includes(o.status) ? o.status : "draft";
      o.notes = o.notes || "";
    });
    f.equipmentLogs = Array.isArray(f.equipmentLogs) ? f.equipmentLogs : f.assignments.map(a => ({
      id: uid(), date: a.date, loggedAt: a.loggedAt || `${a.date || todayISO()}T12:00:00`,
      user: a.user, userName: a.userName, activity: a.activity, tractorId: a.tractorId, tractorName: a.tractorName,
      implementId: a.implementId, implementName: a.implementName,
      talhaoIds: Array.isArray(a.talhaoIds) ? a.talhaoIds : [], talhaoNames: Array.isArray(a.talhaoNames) ? a.talhaoNames : []
    }));
    f.equipmentLogs.forEach(log => {
      log.talhaoIds = Array.isArray(log.talhaoIds) ? log.talhaoIds : [];
      log.talhaoNames = Array.isArray(log.talhaoNames) ? log.talhaoNames : [];
      log.userFunction = log.userFunction || dataUserFunctionFallback(d.users, log.user);
    });
    RuralDomain.farmData(f);
    f.cattle = f.cattle || {};
    f.cattle.paddocks = Array.isArray(f.cattle.paddocks) ? f.cattle.paddocks : [];
    f.cattle.paddocks.forEach(p => {
      p.id = p.id || uid();
      p.name = String(p.name || "Piquete").trim() || "Piquete";
      p.reference = String(p.reference || "");
      p.notes = String(p.notes || "");
    });
    f.cattle.lots = Array.isArray(f.cattle.lots) ? f.cattle.lots : [];
    f.cattle.lots.forEach(l => {
      l.id = l.id || uid();
      l.piquete = String(l.piquete || "").trim();
      l.paddockId = String(l.paddockId || "");
      if (!l.paddockId && l.piquete) {
        let paddock = f.cattle.paddocks.find(p => p.name.toLowerCase() === l.piquete.toLowerCase());
        if (!paddock) {
          paddock = { id: uid(), name: l.piquete, reference: "", notes: "", createdAt: new Date().toISOString() };
          f.cattle.paddocks.push(paddock);
        }
        l.paddockId = paddock.id;
      }
      const currentPaddock = f.cattle.paddocks.find(p => p.id === l.paddockId);
      if (currentPaddock) l.piquete = currentPaddock.name;
    });
    f.cattle.weighings = Array.isArray(f.cattle.weighings) ? f.cattle.weighings : [];
    f.cattle.weighings.forEach(w => {
      w.id = w.id || uid();
      w.heads = Number(w.heads || 0);
      w.totalKg = Number(w.totalKg || 0);
      w.avgKg = Number(w.avgKg || (w.heads > 0 ? w.totalKg / w.heads : 0));
      w.totalArrobas = Number(w.totalArrobas || w.totalKg / 15);
      w.avgArrobas = Number(w.avgArrobas || w.avgKg / 15);
    });
    f.stock.forEach(s => {
      s.id = s.id || uid(); s.category = s.category || "Outros"; s.unitCost = Number(s.unitCost || 0);
      s.activity = RuralDomain.ACTIVITIES.includes(s.activity) ? s.activity : legacyActivity;
    });
    f.finances.forEach(fin => { fin.activity = RuralDomain.ACTIVITIES.includes(fin.activity) ? fin.activity : legacyActivity; });
    f.notes.forEach(n => {
      n.fileName = n.fileName || ""; n.fileType = n.fileType || "";
      n.activity = RuralDomain.ACTIVITIES.includes(n.activity) ? n.activity : legacyActivity;
    });
  });
  return d;
}

function findLegacyLocalData() {
  for (const key of ["fazendaDataV20", "fazendaDataV19", "fazendaDataV18", "fazendaDataV17", "fazendaDataV16", "fazendaDataV15"]) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try { return { key, state: migrateData(JSON.parse(raw)) }; } catch (_) {}
  }
  return null;
}

function loadData() {
  const key = cacheStorageKey();
  const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
  if (raw) {
    try { const parsed = migrateData(JSON.parse(raw)); sessionStorage.setItem(key, JSON.stringify(parsed)); localStorage.removeItem(key); return parsed; } catch (_) {}
  }
  return defaultData();
}

let data = loadData();
let currentUser = null;
let currentPage = "dashboard";
let activeFarmId = data.farms[0]?.id || "";
let quote = null;
let marketRefreshTimer = null;
let cloudToken = sessionStorage.getItem("gestaoRuralToken") || "";
let currentGroup = null;
let cloudSaveTimer = null;
let cloudSyncTimer = null;
let cloudSaving = false;
let cloudSaveAgain = false;
let serverBase = null;      // última versão do servidor conhecida por esta tela
let serverRev = 0;
let syncRetryTimer = null;
let pendingRerender = false;
let formDirty = false;
let cattleSubView = "lots";
let selectedCattleLotId = "";

function modeStorageKey(user = currentUser) {
  const group = currentGroup?.slug || localStorage.getItem("lastGroupSlug") || "grupo";
  return `fazendaModo:${group}:${user?.username || "usuario"}`;
}

function safeLocalState(state = data) {
  const copy = JSON.parse(JSON.stringify(state));
  (copy.users || []).forEach(u => { delete u.password; delete u.passwordHash; });
  (copy.pendingRegistrations || []).forEach(r => { delete r.password; delete r.passwordHash; });
  return copy;
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (cloudToken) headers.Authorization = `Bearer ${cloudToken}`;
  const response = await fetch(path, { ...options, headers });
  let payload = null;
  try { payload = await response.json(); } catch (_) {}
  if (!response.ok) {
    const error = new Error(payload?.error || `Erro ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

// ---------- Anexos: enviados à parte e abertos sob demanda ----------
async function uploadFile(file) {
  const dataUrl = await fileToDataURL(file);
  return api("/api/files", { method: "POST", body: JSON.stringify({ name: file.name, type: file.type, data: dataUrl }) });
}
async function openStoredFile(fileId, fileName = "anexo") {
  const win = window.open("", "_blank");
  try {
    const r = await fetch(`/api/files/${encodeURIComponent(fileId)}`, { headers: { Authorization: `Bearer ${cloudToken}` } });
    if (!r.ok) throw new Error(r.status === 403 ? "Você não tem acesso a este arquivo." : "Arquivo não encontrado.");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    if (win) win.location.href = url;
    else { const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) { if (win) win.close(); toast(e.message); }
}
function fileButton(item, label = "Abrir") {
  if (item.fileId) return `<button type="button" class="btn small open-file" data-file="${escapeHTML(item.fileId)}" data-name="${escapeHTML(item.fileName || "anexo")}">${label}</button>`;
  if (item.fileData) return `<a class="btn small" href="${escapeHTML(item.fileData)}" download="${escapeHTML(item.fileName || "anexo")}">${label}</a>`;
  return "—";
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest(".open-file");
  if (b) { e.preventDefault(); openStoredFile(b.dataset.file, b.dataset.name); }
});

// ---------- Exportar planilhas (CSV que abre direto no Excel) ----------
function downloadCSV(filename, header, rows) {
  // Texto que começa com = + - @ (ou tabulação) vira fórmula no Excel: ganha um apóstrofo na frente.
  // Números já formatados (ex.: "-300,00") ficam como estão, para continuarem sendo números na planilha.
  const cell = v => { const raw = v == null ? "" : String(v); const numeric = /^-?\d[\d.]*(,\d+)?$/.test(raw.trim()); const t = typeof v === "string" && !numeric && /^[\s]*[=+@\-\t\r]/.test(raw) ? "'" + raw : raw; return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const csv = "\ufeff" + [header, ...rows].map(r => r.map(cell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
const csvNumber = v => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });

function availableInterfaceModes() {
  const licensed = SubscriptionDomain.licensed(data);
  return currentUser?.role === "contribuinte" ? RuralDomain.activitiesFor(currentUser.allowedActivity).filter(a => licensed.includes(a)) : licensed;
}
function selectedType() {
  const modes = availableInterfaceModes();
  const personal = localStorage.getItem(modeStorageKey());
  if (modes.includes(personal)) return personal;
  return modes.includes(data.interfaceMode) ? data.interfaceMode : modes[0];
}
async function switchInterfaceMode() {
  if (!currentUser) return;
  const modes = availableInterfaceModes();
  if (modes.length < 2) return;
  const choice = await openDialog(() => `<form class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgTitle"><h3 id="dlgTitle">Escolher atividade</h3><div class="rural-mode-options">${modes.map(mode => `<button type="submit" name="mode" value="${mode}" class="btn ${mode === selectedType() ? 'primary' : ''}">${ico(mode === 'cattle' ? 'cattle' : mode === 'coffee' ? 'bean' : 'hash')}${RuralDomain.LABELS[mode]}${mode === selectedType() ? ' · atual' : ''}</button>`).join('')}</div><div class="dlg-actions"><button type="button" class="btn" data-dlg-cancel>Cancelar</button></div></form>`);
  const nextMode = choice?.mode;
  if (!modes.includes(nextMode) || nextMode === selectedType()) return;
  localStorage.setItem(modeStorageKey(), nextMode);
  if (currentUser.role === "ceo" && isGeneralView()) activeFarmId = 'general-' + nextMode;
  currentPage = currentUser.role === "contribuinte" ? (nextMode === "cattle" ? "gado-campo" : "meu-dia") : "dashboard";
  renderFarmSelector(); renderNav(); renderPage();
  if (nextMode === "coffee" && currentUser.role !== "contribuinte") refreshQuote();
  else { quote = null; $("#quoteMini").classList.add("hidden"); }
  toast('Atividade alterada para ' + RuralDomain.LABELS[nextMode] + '.');
}


function activeFarmStorageKey(user = currentUser) {
  return user?.username ? `fazendaAtiva:${user.username}` : "fazendaAtiva";
}

function preferredFarmForUser(user) {
  if (!user) return data.farms[0]?.id || "";
  if (user.role === "contribuinte") {
    const allowed = data.farms.find(f => f.id === user.allowedFarmId);
    return allowed?.id || data.farms[0]?.id || "";
  }
  const stored = localStorage.getItem(activeFarmStorageKey(user));
  const expectedGeneral = "general-" + selectedType();
  if (user.role === "ceo" && stored === expectedGeneral) return stored;
  if (data.farms.some(f => f.id === stored)) return stored;
  // Sem seleção salva, o CEO entra na primeira fazenda para ver os formulários de cadastro.
  if (user.role === "ceo") return data.farms[0]?.id || expectedGeneral;
  return data.farms[0]?.id || "";
}


// As telas guardam referências aos dados (a fazenda aberta, o item em edição) e gravam nelas ao salvar.
// Por isso uma atualização do servidor nunca troca `data` por um objeto novo: o conteúdo é aplicado nos
// mesmos objetos, casados pelo id. Assim o cadastro feito durante uma atualização cai no lugar certo.
function isPlainObject(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
function patchInPlace(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    const byId = new Map(target.filter(x => isPlainObject(x) && "id" in x).map(x => [String(x.id), x]));
    const out = source.map(s => {
      const t = isPlainObject(s) && "id" in s ? byId.get(String(s.id)) : null;
      return t ? patchInPlace(t, s) : s;
    });
    target.length = 0;
    target.push(...out);
    return target;
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    if (target === source) return target;
    for (const k of Object.keys(target)) if (!(k in source)) delete target[k];
    for (const k of Object.keys(source)) {
      const t = target[k], s = source[k];
      const sameShape = (Array.isArray(t) && Array.isArray(s)) || (isPlainObject(t) && isPlainObject(s));
      target[k] = sameShape ? patchInPlace(t, s) : s;
    }
    return target;
  }
  return source;
}
function replaceData(next) {
  data = data && next && data !== next ? patchInPlace(data, next) : next;
  return data;
}

function absorbServerPayload(payload) {
  const base = serverBase;
  const fresh = adoptServerPayload(payload);
  replaceData(base && hasLocalChangesAgainst(base) ? merge3(base, data, fresh) : fresh);
  currentUser = data.users.find(u => u.id === currentUser?.id) || currentUser;
  writeCache();
}
function hasLocalChangesAgainst(base) { return !sameJSON(data, base); }
function writeCache() {
  // A cópia local é só um atalho. Se o navegador recusar (memória cheia, aba anônima), o sistema continua salvando no servidor.
  try { sessionStorage.setItem(cacheStorageKey(currentGroup?.slug || ""), JSON.stringify(safeLocalState(data))); } catch (_) {}
  // Modo de campo: atualiza o cofre cifrado deste aparelho (quando habilitado com PIN).
  if (typeof FieldMode !== "undefined") FieldMode.schedule();
}

function setSyncStatus(kind, text) {
  const el = $("#syncStatus");
  if (!el) return;
  el.dataset.kind = kind;
  el.querySelector("span").textContent = text;
  el.title = text;
}
function hasLocalChanges() { return Boolean(serverBase) && !sameJSON(data, serverBase); }
function saveData() {
  formDirty = false;
  writeCache();
  try { if (currentUser) localStorage.setItem(activeFarmStorageKey(currentUser), activeFarmId); } catch (_) {}
  if (!currentUser || !cloudToken) return;
  setSyncStatus("saving", "Salvando…");
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(pushStateToServer, 220);
}
function adoptServerPayload(payload) {
  const fresh = migrateData(JSON.parse(JSON.stringify(payload.state)));
  serverBase = JSON.parse(JSON.stringify(fresh));
  serverRev = Number(payload.rev || fresh._rev || 0);
  if (typeof FieldMode !== "undefined") FieldMode.verified();
  if (payload.group) currentGroup = payload.group;
  return fresh;
}

async function pushStateToServer(attempt = 0) {
  if (!currentUser || !cloudToken) return;
  // Sem sinal: fica no cofre do aparelho e sobe quando a conexão voltar.
  if (!navigator.onLine) { setSyncStatus("offline", "Modo de campo · alterações guardadas no aparelho"); if (typeof FieldMode !== "undefined") FieldMode.schedule(); return; }
  if (cloudSaving) { cloudSaveAgain = true; return; }
  if (!hasLocalChanges() && attempt === 0 && serverBase) { setSyncStatus("ok", "Salvo"); return; }
  cloudSaving = true;
  clearTimeout(syncRetryTimer);
  const sent = JSON.parse(JSON.stringify(data));
  try {
    const payload = await api("/api/state", { method: "PUT", body: JSON.stringify({ state: sent, baseRev: serverRev }) });
    const fresh = adoptServerPayload(payload);
    // Se a pessoa mexeu em algo enquanto salvava, essas mudanças continuam por cima do que voltou do servidor.
    replaceData(merge3(sent, data, fresh));
    afterServerUpdate(false);
    setSyncStatus(hasLocalChanges() ? "saving" : "ok", hasLocalChanges() ? "Salvando…" : "Salvo");
    if (hasLocalChanges()) cloudSaveAgain = true;
  } catch (error) {
    if (error.status === 409 && error.payload?.state && attempt < 4) {
      // Alguém salvou antes: junta as duas versões e tenta de novo.
      setSyncStatus("saving", "Juntando alterações…");
      const base = serverBase;
      const remote = adoptServerPayload(error.payload);
      replaceData(merge3(base, data, remote));
      afterServerUpdate(true);
      cloudSaving = false;
      return pushStateToServer(attempt + 1);
    }
    if (error.status === 401) return logout(true);
    if (error.status === 403 && error.payload?.status === "suspended") return logout(true);
    if (error.status === 402 && error.payload?.trialExpired) { logout(true); return showTrialEnded(error.message); }
    if (error.status === 428) return mustChangePasswordAgain();
    if (error.status === 400 || error.status === 403 || error.status === 422) {
      // O servidor recusou a alteração (máquina já reservada, atividade não contratada, histórico protegido...):
      // a tela volta ao que está gravado, em vez de manter o que não foi salvo e reenviar a cada sincronização.
      if (serverBase) { replaceData(JSON.parse(JSON.stringify(serverBase))); afterServerUpdate(true); }
      setSyncStatus("error", "Não salvo");
      await ask(error.message, { title: "Não foi possível salvar", okText: "Entendi" });
    }
    else {
      console.error("Falha ao sincronizar:", error);
      setSyncStatus("offline", hasLocalChanges() ? "Sem internet · lançamentos guardados no aparelho" : "Sem conexão. Tentando de novo…");
      syncRetryTimer = setTimeout(() => pushStateToServer(), 15000);
    }
  } finally {
    cloudSaving = false;
    if (cloudSaveAgain) { cloudSaveAgain = false; pushStateToServer(); }
  }
}
function isUserEditing() {
  const el = document.activeElement;
  const typing = el && el.closest && el.closest("#pageContent, .dlg") && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
  return Boolean(typing || formDirty || document.querySelector(".dlg-back"));
}
function afterServerUpdate(forceRender) {
  const previousUsername = currentUser?.username;
  currentUser = data.users.find(u => u.id === currentUser?.id) || data.users.find(u => u.username === previousUsername) || currentUser;
  writeCache();
  updateGroupBrand();
  if ($("#appView").classList.contains("hidden") || !currentUser) return;
  if (isUserEditing() && !forceRender) { pendingRerender = true; return; }
  rerenderAfterSync();
}
function rerenderAfterSync() {
  pendingRerender = false;
  if (currentUser.role === "contribuinte") activeFarmId = preferredFarmForUser(currentUser);
  else if (!isGeneralView() && !data.farms.some(f => f.id === activeFarmId)) activeFarmId = preferredFarmForUser(currentUser);
  const y = window.scrollY;
  renderFarmSelector(); renderNav(); renderPage();
  window.scrollTo(0, y);
}

async function pullStateFromServer({ rerender = true } = {}) {
  if (!cloudToken) return false;
  if (cloudSaving) return true;
  try {
    const known = serverBase && rerender ? `?rev=${serverRev}` : "";
    const payload = await api(`/api/state${known}`);
    if (payload.unchanged) {
      if (typeof FieldMode !== "undefined") FieldMode.verified();
      if (hasLocalChanges() && !cloudSaving) pushStateToServer();
      else if ($("#syncStatus")?.dataset.kind === "offline") setSyncStatus("ok", "Salvo");
      return payload;
    }
    const local = hasLocalChanges();
    const base = serverBase;
    const fresh = adoptServerPayload(payload);
    replaceData(local ? merge3(base, data, fresh) : fresh);
    const previousUsername = currentUser?.username;
    currentUser = data.users.find(u => u.id === payload.userId) || data.users.find(u => u.username === previousUsername) || null;
    writeCache();
    updateGroupBrand();
    if (!currentUser) throw Object.assign(new Error("Usuário não encontrado"), { status: 401 });
    if (local) pushStateToServer();
    if (rerender) afterServerUpdate(false);
    return payload;
  } catch (error) {
    if (error.status === 428) mustChangePasswordAgain();
    else if (error.status === 402 && error.payload?.trialExpired) { logout(true); showTrialEnded(error.message); }
    else if (error.status === 401 || error.status === 403) logout(true);
    else if (rerender) setSyncStatus("offline", hasLocalChanges() ? "Sem internet · lançamentos guardados no aparelho" : "Sem conexão. Tentando de novo…");
    return false;
  }
}

function startCloudSync() {
  clearInterval(cloudSyncTimer);
  cloudSyncTimer = setInterval(() => { if (!document.hidden) pullStateFromServer({ rerender: true }); }, 12000);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && cloudToken && currentUser) pullStateFromServer({ rerender: true }); });
document.addEventListener("input", e => { if (e.target.closest && e.target.closest("#pageContent form")) formDirty = true; });
document.addEventListener("focusout", () => setTimeout(() => { if (pendingRerender && !isUserEditing()) rerenderAfterSync(); }, 400));
window.addEventListener("online", () => { if (cloudToken && currentUser) pushStateToServer(); });

function updateGroupBrand() {
  const name = currentGroup?.name || "Gestão Rural";
  if ($("#groupBrandName")) $("#groupBrandName").textContent = name;

  document.title = currentGroup?.name ? `${currentGroup.name} • Gestão Rural` : "Gestão Rural • Acesso";
}

function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function compactMoney(v) {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1e6) return `R$ ${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(n) >= 1e3) return `R$ ${(n / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return money(n);
}

function escapeHTML(v = "") {
  return String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateBR(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.classList.remove("show"), 2600);
}

function isGeneralView() {
  return RuralDomain.ACTIVITIES.some(a => activeFarmId === "general-" + a);
}

function activeFarm() {
  return data.farms.find(f => f.id === activeFarmId) || data.farms[0] || null;
}

function farmsInContext() {
  return isGeneralView() ? data.farms : (activeFarm() ? [activeFarm()] : []);
}

function contextName() {
  if (activeFarmId === "general-coffee") return "Geral • Café";
  if (activeFarmId === "general-cattle") return "Geral • Gado";
  if (activeFarmId === "general-grains") return "Geral • Grãos";
  return activeFarm()?.name || "Fazenda";
}

function farmTypeLabel() {
  return RuralDomain.LABELS[selectedType()];
}

function stockCategories() {
  return selectedType() === "cattle" ? CATTLE_STOCK : selectedType() === "grains" ? GRAINS_STOCK : COFFEE_STOCK;
}

function financeCategories() {
  return selectedType() === "cattle" ? CATTLE_FINANCE : selectedType() === "grains" ? GRAINS_FINANCE : COFFEE_FINANCE;
}

function currentPlanLimits() {
  return PLAN_LIMITS[currentGroup?.plan] || PLAN_LIMITS.pro;
}

function contributorsOnFarm(farmId, excludeUserId = "") {
  return data.users.filter(u => u.active !== false && u.role === "contribuinte" && String(u.allowedFarmId || "") === String(farmId || "") && String(u.id) !== String(excludeUserId || "")).length;
}

function financialTotals(farm) {
  const finances = (farm?.finances || []).filter(x => (x.activity || "coffee") === selectedType());
  const income = finances.filter(x => x.type === "entrada").reduce((a, b) => a + Number(b.value || 0), 0);
  const expense = finances.filter(x => x.type === "saida").reduce((a, b) => a + Number(b.value || 0), 0);
  return { income, expense, profit: income - expense };
}

function contextFinances() {
  return farmsInContext().flatMap(f => (f.finances || []).filter(fin => (fin.activity || "coffee") === selectedType()).map(fin => ({ ...fin, farmName: f.name, farmId: f.id, farmType: selectedType() })));
}

function contextNotes() {
  return farmsInContext().flatMap(f => (f.notes || []).filter(note => (note.activity || "coffee") === selectedType()).map(note => ({ ...note, farmName: f.name, farmId: f.id, farmType: selectedType() })));
}

function contextStock() {
  return farmsInContext().flatMap(f => (f.stock || []).filter(item => (item.activity || "coffee") === selectedType()).map(item => ({ ...item, farmName: f.name, farmId: f.id, farmType: selectedType() })));
}

function contextEquipment(type) {
  return farmsInContext().flatMap(f => ((type === "tractor" ? f.tractors : f.implements) || []).map(item => ({ ...item, farmName: f.name })));
}

function contextLots() {
  return farmsInContext().flatMap(f => (f.cattle?.lots || []).filter(l=>!l.archived).map(lot => ({ ...lot, farmName: f.name, farmId: f.id })));
}

function contextWeighings() {
  return farmsInContext().flatMap(f => (f.cattle?.weighings || []).map(w => ({ ...w, farmName: f.name, farmId: f.id })));
}

async function login(groupCode, username, password) {
  try {
    const payload = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ groupCode, username, password })
    });
    cloudToken = payload.token;
    currentGroup = payload.group;
    sessionStorage.setItem("gestaoRuralToken", cloudToken);
    localStorage.setItem("lastGroupCode", currentGroup.code || groupCode);
    localStorage.setItem("lastGroupSlug", currentGroup.slug || "");
    if ($("#loginGroup")) $("#loginGroup").value = currentGroup.code || groupCode;
    if ($("#registerGroup")) $("#registerGroup").value = currentGroup.code || groupCode;

    if (payload.mustChangePassword) {
      const changed = await forcePasswordChange(password);
      if (!changed) { await logout(); toast("Para continuar, troque a senha."); return false; }
    }
    let statePayload = await pullStateFromServer({ rerender: false });
    if (!statePayload) return false;

    const legacy = findLegacyLocalData();
    if (currentUser?.role === "ceo" && currentGroup?.cloudInitialized === false && legacy?.state?.users?.length) {
      const shouldImport = await ask("Encontramos dados da versão antiga neste navegador. Quer importar esses dados para a nuvem deste Grupo agora?", { title: "Importar dados antigos", okText: "Importar" });
      if (shouldImport) {
        try {
          const imported = await api("/api/state/import-local", { method: "POST", body: JSON.stringify({ state: legacy.state }) });
          replaceData(adoptServerPayload(imported));
          currentGroup = { ...currentGroup, ...(imported.group || {}), cloudInitialized: true };
          currentUser = data.users.find(u => String(u.username || "").toLowerCase() === String(username || "").toLowerCase()) || data.users.find(u => u.role === "ceo");
          writeCache();
          toast("Dados da v20 importados para a nuvem.");
        } catch (error) {
          console.error(error);
          toast(error.message || "Não foi possível importar os dados locais.");
        }
      }
    }

    activeFarmId = preferredFarmForUser(currentUser);
    openApp();
    startCloudSync();
    return true;
  } catch (error) {
    console.error(error);
    if (error.payload?.suspended) { showSuspended(error.payload.isCeo); return false; }
    if (error.payload?.trialExpired) { showTrialEnded(error.message); return false; }
    toast(error.message || "Código do Grupo, usuário ou senha incorretos.");
    return false;
  }
}

function showTrialEnded(message) {
  openDialog(() => `<form class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">
    <h3 id="dlgTitle">Seu teste grátis terminou</h3><p>${escapeHTML(message)}</p><p>Nenhum dado foi apagado.</p>
    <div class="dlg-actions"><a class="btn primary" href="/#planos">Ver planos</a><button type="submit" class="btn">Fechar</button></div></form>`);
}

function showSuspended(isCeo) {
  openDialog(() => `<form class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">
    <h3 id="dlgTitle">Acesso do Grupo suspenso</h3>
    <p>${isCeo ? "A assinatura deste Grupo não está ativa, por isso o acesso foi pausado. Nenhum dado foi apagado: assim que o pagamento for regularizado, tudo volta como estava." : "O acesso deste Grupo está pausado no momento. Fale com o responsável pela fazenda (CEO) para regularizar."}</p>
    <div class="dlg-actions">${isCeo ? `<a class="btn" href="/#planos">Ver planos</a>` : ""}<button type="submit" class="btn primary">Entendi</button></div></form>`);
}

async function forcePasswordChange(currentPassword) {
  for (let i = 0; i < 3; i++) {
    const v = await askForm({
      title: "Troque sua senha",
      text: "Sua senha atual é fácil de adivinhar ou já foi divulgada. Crie uma nova para continuar.",
      okText: "Salvar nova senha",
      fields: [
        { name: "newPassword", label: "Nova senha", type: "password", required: true, minlength: 8, autocomplete: "new-password", autofocus: true, hint: "Mínimo de 8 caracteres." },
        { name: "confirm", label: "Repita a nova senha", type: "password", required: true, minlength: 8, autocomplete: "new-password" }
      ]
    });
    if (!v) return false;
    if (v.newPassword !== v.confirm) { toast("As duas senhas não são iguais."); continue; }
    try {
      const r = await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword: v.newPassword }) });
      cloudToken = r.token; sessionStorage.setItem("gestaoRuralToken", cloudToken);
      toast("Senha alterada.");
      return true;
    } catch (e) { toast(e.message); }
  }
  return false;
}

async function changeOwnPassword() {
  const v = await askForm({
    title: "Trocar minha senha",
    okText: "Trocar senha",
    fields: [
      { name: "currentPassword", label: "Senha atual", type: "password", required: true, autocomplete: "current-password", autofocus: true },
      { name: "newPassword", label: "Nova senha", type: "password", required: true, minlength: 8, autocomplete: "new-password", hint: "Mínimo de 8 caracteres." },
      { name: "confirm", label: "Repita a nova senha", type: "password", required: true, minlength: 8, autocomplete: "new-password" }
    ]
  });
  if (!v) return;
  if (v.newPassword !== v.confirm) return toast("As duas senhas não são iguais.");
  try {
    const r = await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: v.currentPassword, newPassword: v.newPassword }) });
    cloudToken = r.token; sessionStorage.setItem("gestaoRuralToken", cloudToken);
    absorbServerPayload(r);
    toast("Senha alterada. Os outros aparelhos foram desconectados.");
  } catch (e) { toast(e.message); }
}

async function restoreSession() {
  cloudToken = sessionStorage.getItem("gestaoRuralToken") || "";
  const urlGroup = new URLSearchParams(location.search).get("grupo");
  const lastGroup = urlGroup || localStorage.getItem("lastGroupCode") || "1001";
  if ($("#loginGroup")) $("#loginGroup").value = lastGroup;
  if ($("#registerGroup")) $("#registerGroup").value = lastGroup;
  if (!cloudToken) return;
  const payload = await pullStateFromServer({ rerender: false });
  if (payload && currentUser) {
    activeFarmId = preferredFarmForUser(currentUser);
    openApp();
    startCloudSync();
  }
}

// O servidor exige troca de senha (por exemplo, a página foi recarregada no meio da troca obrigatória).
// Sem a senha atual não dá para trocar aqui: volta ao login, que pede a troca logo depois de entrar.
async function mustChangePasswordAgain() {
  await logout(true);
  toast("Entre de novo e troque sua senha para continuar.");
}

async function logout(silent = false) {
  // Modo de campo: grava o que falta no cofre e tranca (o cofre continua no aparelho, protegido pelo PIN).
  if (typeof FieldMode !== "undefined") { await FieldMode.flush(); FieldMode.lock(); }
  const tokenBefore = cloudToken;
  cloudToken = "";
  clearInterval(cloudSyncTimer);
  clearTimeout(cloudSaveTimer);
  sessionStorage.removeItem("gestaoRuralToken");
  clearTimeout(syncRetryTimer);
  // Sessão vencida (saída automática) não apaga lançamentos feitos sem internet que ainda não foram enviados; sair pelo botão apaga.
  try { Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY)).forEach(k => localStorage.removeItem(k)); Object.keys(sessionStorage).filter(k => k.startsWith(STORAGE_KEY)).forEach(k => sessionStorage.removeItem(k)); } catch (_) {}
  data = defaultData(); serverBase = null; serverRev = 0; pendingRerender = false; formDirty = false;
  document.querySelectorAll(".dlg-back").forEach(d => d.remove());
  currentUser = null;
  currentGroup = null;
  $("#appView").classList.add("hidden");
  $("#loginView").classList.remove("hidden");
  showAuthMode("login");
  $("#loginPassword").value = "";
  updateGroupBrand();
  if (tokenBefore && !silent) {
    try { await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${tokenBefore}` } }); } catch (_) {}
  }
}

let passwordResetContext = null;
function showAuthMode(mode) {
  $(".auth-switch").classList.remove("hidden");
  $(".auth-switch").dataset.mode = mode;
  const loginVisible = mode === "login";
  $("#loginForm").classList.toggle("hidden", !loginVisible);
  $("#registerForm").classList.toggle("hidden", loginVisible);
  $("#forgotForm").classList.add("hidden");
  $("#resetForm").classList.add("hidden");
  $("#showLoginBtn").classList.toggle("active", loginVisible);
  $("#showRegisterBtn").classList.toggle("active", !loginVisible);
  const urlGroup = new URLSearchParams(location.search).get("grupo");
  const lastGroup = urlGroup || localStorage.getItem("lastGroupCode") || "1001";
  if ($("#loginGroup") && !$("#loginGroup").value) $("#loginGroup").value = lastGroup;
  if ($("#registerGroup") && !$("#registerGroup").value) $("#registerGroup").value = lastGroup;
}
function showPasswordRecovery(stage = "request") {
  $(".auth-switch").classList.add("hidden");
  $("#loginForm").classList.add("hidden");
  $("#registerForm").classList.add("hidden");
  $("#forgotForm").classList.toggle("hidden", stage !== "request");
  $("#resetForm").classList.toggle("hidden", stage !== "confirm");
  if (stage === "request") {
    $("#forgotGroup").value = $("#loginGroup").value || localStorage.getItem("lastGroupCode") || "1001";
    $("#forgotUser").value = $("#loginUser").value || "";
  }
}

async function createPendingRegistration(values) {
  try {
    const groupCode = String(values.groupCode || $("#registerGroup")?.value || "").replace(/\D/g, "").trim();
    await api("/api/auth/register-request", { method: "POST", body: JSON.stringify({ ...values, groupCode }) });
    localStorage.setItem("lastGroupCode", groupCode);
    toast("Solicitação enviada para aprovação do CEO.");
    $("#registerForm").reset();
    $("#loginGroup").value = groupCode;
    $("#registerGroup").value = groupCode;
    showAuthMode("login");
    return true;
  } catch (error) {
    toast(error.message || "Não foi possível enviar a solicitação.");
    return false;
  }
}

async function createUser(values, after) {
  try {
    const payload = await api("/api/users", { method: "POST", body: JSON.stringify(values) });
    absorbServerPayload(payload);
    toast("Usuário criado com sucesso.");
    if (after) after();
    return true;
  } catch (error) {
    toast(error.message || "Não foi possível criar o usuário.");
    return false;
  }
}

async function approveRegistration(id, allowedFarmId = "", allowedActivity = "both") {
  try {
    const payload = await api(`/api/registrations/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: JSON.stringify({ allowedFarmId, allowedActivity })
    });
    absorbServerPayload(payload);
    toast("Solicitação aprovada.");
    renderUsers();
  } catch (error) { toast(error.message || "Não foi possível aprovar."); }
}

async function rejectRegistration(id) {
  try {
    const payload = await api(`/api/registrations/${encodeURIComponent(id)}/reject`, { method: "POST", body: "{}" });
    absorbServerPayload(payload);
    toast("Solicitação recusada.");
    renderUsers();
  } catch (error) { toast(error.message || "Não foi possível recusar."); }
}

function renderFarmSelector() {
  const select = $("#farmSelect");
  if (!select || !currentUser) return;

  let visibleFarms = data.farms;
  if (currentUser.role === "contribuinte") {
    const allowed = data.farms.find(f => f.id === currentUser.allowedFarmId);
    visibleFarms = allowed ? [allowed] : [];
    if (allowed) activeFarmId = allowed.id;
  } else if (!isGeneralView() && !data.farms.some(f => f.id === activeFarmId)) {
    activeFarmId = preferredFarmForUser(currentUser);
  }

  const options = [];
  // Visão consolidada de todas as fazendas: planos Profissional e Grupo.
  const consolidated = typeof planHas !== "function" || planHas("consolidated");
  if (!consolidated && isGeneralView()) activeFarmId = data.farms[0]?.id || "";
  if (currentUser.role === "ceo" && consolidated) {
    const generalId = "general-" + selectedType();
    const generalLabel = "Geral • " + farmTypeLabel();
    options.push(`<option value="${generalId}">${generalLabel}</option>`);
  }
  options.push(...visibleFarms.map(f => `<option value="${f.id}">${escapeHTML(f.name)} • ${farmTypeLabel()}</option>`));

  if (!options.length) {
    select.innerHTML = `<option value="">Nenhuma fazenda liberada</option>`;
    select.disabled = true;
    return;
  }

  const expectedGeneral = "general-" + selectedType();
  if (isGeneralView() && activeFarmId !== expectedGeneral) activeFarmId = expectedGeneral;

  select.innerHTML = options.join("");
  select.value = activeFarmId;
  if (!select.value) {
    activeFarmId = currentUser.role === "ceo" && consolidated ? expectedGeneral : (visibleFarms[0]?.id || data.farms[0]?.id || "");
    select.value = activeFarmId;
  }

  select.disabled = currentUser.role === "contribuinte";
  select.title = currentUser.role === "contribuinte" ? "Fazenda definida pelo CEO no perfil" : "Selecionar fazenda";
  if (currentUser) localStorage.setItem(activeFarmStorageKey(currentUser), activeFarmId);

  select.onchange = () => {
    activeFarmId = select.value;
    localStorage.setItem(activeFarmStorageKey(currentUser), activeFarmId);
    currentPage = currentUser.role === "contribuinte"
      ? (selectedType() === "cattle" ? "gado-campo" : "meu-dia")
      : "dashboard";
    renderNav();
    renderPage();
    if (selectedType() === "coffee" && currentUser.role !== "contribuinte") refreshQuote(); else $("#quoteMini").classList.add("hidden");
  };
}

function baseNavItems() {
  const cattle = selectedType() === "cattle";
  if (currentUser.role === "ceo") {
    return [
      ["dashboard", "grid", "Visão geral"],
      ["mercado", "chart", "Mercado"],
      ...(cattle ? [["gado", "cattle", isGeneralView() ? "Gado geral" : "Gado"], ["manejos", "check", "Desempenho e manejos"]] : [["safras", "bean", "Safras e produção"], ["historico-talhoes", "hash", "Histórico dos talhões"], ["equipamentos", "tractor", isGeneralView() ? "Equipamentos gerais" : "Equipamentos"], ["talhoes", "hash", isGeneralView() ? "Talhões gerais" : "Talhões"], ...(selectedType() === "coffee" ? [["banho", "receipt", "Banho"]] : [])]),
      ["estoque", "box", isGeneralView() ? "Estoque geral" : "Estoque"],
      ["financeiro", "chart", isGeneralView() ? "Balanço geral" : "Balanço financeiro"],
      ["notas", "receipt", isGeneralView() ? "Notas gerais" : "Notas fiscais"],
      ["pagamentos", "wallet", "Pagamentos"],
      ["fazendas", "home", "Fazendas"],
      ["usuarios", "users", "Usuários"],
      ["log-equipamentos", "receipt", "Log equipamentos"],
      ["historico", "swap", "Histórico de alterações"],
      ["perfil", "users", "Perfil"]
    ];
  }
  if (currentUser.role === "adm") {
    return [
      ["dashboard", "grid", "Visão geral"],
      ["mercado", "chart", "Mercado"],
      ...(cattle ? [["gado", "cattle", "Gado"], ["manejos", "check", "Desempenho e manejos"]] : [["safras", "bean", "Safras e produção"], ["historico-talhoes", "hash", "Histórico dos talhões"], ["equipamentos", "tractor", "Equipamentos"], ...(selectedType() === "coffee" ? [["banho", "receipt", "Banho"]] : [])]),
      ["estoque", "box", "Estoque"],
      ["lancamentos", "swap", "Lançar entradas/saídas"],
      ["notas", "receipt", "Notas fiscais"],
      ["perfil", "users", "Perfil"]
    ];
  }
  if (selectedType() === "cattle") {
    return [["gado-campo", "cattle", "Gado"], ["meus-comprovantes", "receipt", "Meus comprovantes"], ["perfil", "users", "Perfil"]];
  }
  const coffeeItems = [["meu-dia", "check", "Meu trabalho hoje"], ["safras", "bean", "Safras e colheitas"]];
  if (selectedType() === "coffee" && currentUser.function === "Tratorista") coffeeItems.push(["banho", "receipt", "Banhos liberados"]);
  coffeeItems.push(["equipamentos-campo", "tractor", "Equipamentos disponíveis"], ["meus-comprovantes", "receipt", "Meus comprovantes"], ["perfil", "users", "Perfil"]);
  return coffeeItems;
}

const mobileNav = window.matchMedia("(max-width: 720px)");
function goToPage(page, focusForm = false) {
  ruralSeasonSelection=null;opsQualityView=false;
  currentPage = page;
  renderNav(); renderPage();
  window.scrollTo(0, 0);
  if (focusForm) setTimeout(() => {
    const form = $("#pageContent form");
    if (!form) return;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    form.querySelector("input:not([type=hidden]),select,textarea")?.focus({ preventScroll: true });
  }, 60);
}
function renderNav() {
  // Itens marcados como "tab" são abas dentro de outra página (veja menu.js); o 4º campo é o grupo do menu.
  const items = navItems().filter(i => i[4] !== "tab");
  const activeId = typeof menuActive === "function" ? menuActive(currentPage) : currentPage;
  const canSwitchMode = availableInterfaceModes().length > 1;
  const modeLabel = "Atividade: " + farmTypeLabel();
  // No celular cabem 4 abas na barra de baixo; o resto fica em "Mais".
  let shown = items, extra = [];
  if (mobileNav.matches && items.length > 5) {
    const activeIndex = items.findIndex(i => i[0] === activeId);
    shown = activeIndex >= 4 ? [...items.slice(0, 3), items[activeIndex]] : items.slice(0, 4);
    extra = items.filter(i => !shown.includes(i));
  }
  const button = ([id, icon, label]) => `<button class="nav-btn ${activeId === id ? "active" : ""}" data-page="${id}" ${activeId === id ? 'aria-current="page"' : ""}>${mobileNav.matches ? ico(icon) : ""}<span class="nav-label">${label}</span></button>`;
  // No computador, cada grupo pode ser recolhido; a escolha fica neste navegador e o grupo da página aberta fica sempre aberto.
  let closedGroups = []; try { closedGroups = JSON.parse(localStorage.getItem("grNavClosed") || "[]"); } catch (_) {}
  const groups = [...new Set(shown.map(i => i[3] || ""))];
  const menu = mobileNav.matches || groups.every(g => !g) ? shown.map(button).join("")
    : groups.map(g => { const list = shown.filter(i => (i[3] || "") === g); if (!g) return list.map(button).join(""); const open = list.some(i => i[0] === activeId) || !closedGroups.includes(g); return `<details class="nav-group" data-group="${escapeHTML(g)}" ${open ? "open" : ""}><summary>${escapeHTML(g)}</summary>${list.map(button).join("")}</details>`; }).join("");
  const more = extra.length || (mobileNav.matches && canSwitchMode) ? `<button class="nav-btn nav-more" id="navMore" type="button" aria-haspopup="dialog">${mobileNav.matches ? ico("grid") : ""}<span class="nav-label">Mais</span></button>` : "";
  const modeSwitch = canSwitchMode && !mobileNav.matches
    ? `<button class="nav-btn mode-switch-btn" id="modeSwitchBtn" type="button"><span class="nav-label">${modeLabel}</span></button>`
    : "";
  $("#navMenu").innerHTML = menu + (mobileNav.matches ? more : "") + modeSwitch;
  $$("#navMenu .nav-btn[data-page]").forEach(btn => btn.onclick = () => goToPage(btn.dataset.page));
  $$("#navMenu details.nav-group").forEach(d => d.addEventListener("toggle", () => { try { const set = new Set(JSON.parse(localStorage.getItem("grNavClosed") || "[]")); d.open ? set.delete(d.dataset.group) : set.add(d.dataset.group); localStorage.setItem("grNavClosed", JSON.stringify([...set])); } catch (_) {} }));
  const modeBtn = $("#modeSwitchBtn");
  if (modeBtn) modeBtn.onclick = switchInterfaceMode;
  const moreBtn = $("#navMore");
  if (moreBtn) moreBtn.onclick = async () => {
    const choice = await openDialog(() => `<form class="dlg sheet" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">
      <h3 id="dlgTitle">Mais opções</h3>
      <div class="sheet-list">${extra.map(([id, icon, label, group], i) => `${group && group !== extra[i - 1]?.[3] ? `<div class="sheet-group">${escapeHTML(group)}</div>` : ""}<button type="submit" name="go" value="${id}" class="sheet-item ${activeId === id ? "active" : ""}">${ico(icon)}<span>${label}</span></button>`).join("")}
      ${canSwitchMode ? `<button type="submit" name="go" value="__mode" class="sheet-item">${ico("swap")}<span>${modeLabel}</span></button>` : ""}
      <button type="submit" name="go" value="__logout" class="sheet-item danger">${ico("logout")}<span>Sair</span></button></div>
      <div class="dlg-actions"><button type="button" class="btn" data-dlg-cancel>Fechar</button></div></form>`);
    const go = choice?.go;
    if (!go) return;
    if (go === "__mode") return switchInterfaceMode();
    if (go === "__logout") return logout();
    goToPage(go);
  };
}
mobileNav.addEventListener?.("change", () => { if (currentUser && !$("#appView").classList.contains("hidden")) renderNav(); });
// O botão clicado num formulário de diálogo vira o valor enviado.
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest(".dlg button[type=submit][name]");
  if (b) { const f = b.form; let h = f.querySelector(`input[type=hidden][name="${b.name}"]`); if (!h) { h = document.createElement("input"); h.type = "hidden"; h.name = b.name; f.appendChild(h); } h.value = b.value; }
}, true);

function setHeader(eyebrow, title) {
  $("#pageEyebrow").textContent = `${eyebrow} • ${contextName().toUpperCase()} • ${farmTypeLabel().toUpperCase()}`;
  $("#pageTitle").textContent = title;
}

function openApp() {
  const requested=new URLSearchParams(location.search).get("activity");if(availableInterfaceModes().includes(requested))localStorage.setItem(modeStorageKey(),requested);
  updateGroupBrand();
  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  $("#userName").textContent = currentUser.name;
  $("#userRole").textContent = ROLE_NAMES[currentUser.role] || currentUser.role;
  $("#userAvatar").textContent = currentUser.name?.[0]?.toUpperCase() || "U";
  activeFarmId = preferredFarmForUser(currentUser);
  if (currentUser.role === "contribuinte") {
    currentUser.allowedActivity = RuralDomain.PERMISSIONS.includes(currentUser.allowedActivity) ? currentUser.allowedActivity : "both";
    const allowed = data.farms.find(f => f.id === currentUser.allowedFarmId);
    if (!allowed && data.farms[0]) {
      currentUser.allowedFarmId = data.farms[0].id;
      activeFarmId = data.farms[0].id;
      saveData();
    }
    if (RuralDomain.ACTIVITIES.includes(currentUser.allowedActivity)) {
      localStorage.setItem(modeStorageKey(), currentUser.allowedActivity);
    }
  }
  currentPage = currentUser.role === "contribuinte" ? (selectedType() === "cattle" ? "gado-campo" : "meu-dia") : "dashboard";
  renderFarmSelector();
  renderNav();
  renderPage();
  if (selectedType() === "coffee" && currentUser.role !== "contribuinte") refreshQuote(); else $("#quoteMini").classList.add("hidden");
}

function renderPage() {
  document.body.dataset.activity=selectedType()||"coffee";
  formDirty = false;
  pendingRerender = false;
  if (currentPage !== "mercado" && marketRefreshTimer) { clearInterval(marketRefreshTimer); marketRefreshTimer = null; }
  renderFarmSelector();
  const allowed = navItems().map(n => n[0]);
  const financeDetailPages = canSee("financeiro") ? ["finance-entradas", "finance-gastos"] : [];
  // Páginas abertas a partir da central de Gestão (cada perfil só vê as suas; veja gestao.js).
  const managementPages = typeof gestaoExtraPages === "function" ? gestaoExtraPages() : [];
  if (![...allowed, ...financeDetailPages, ...managementPages].includes(currentPage)) currentPage = allowed[0];
  const pages = {
    resultados: renderResults,
    "analises-solo": renderSoilAnalyses,
    planejamento: renderAgenda,
    movimentacoes: renderCattleMovements,
    recebimentos: renderReceivables,
    entregas: renderDeliveries,
    "etapas-gado": renderCattleStages,
    dashboard: renderDashboard,
    mercado: renderMarket,
    equipamentos: renderEquipmentAdmin,
    talhoes: renderTalhoes,
    "historico-talhoes": renderPlotHistory,
    banho: renderBanho,
    estoque: renderStock,
    financeiro: renderFinanceCEO,
    "finance-entradas": () => renderFinanceFiltered("entrada"),
    "finance-gastos": () => renderFinanceFiltered("saida"),
    lancamentos: renderFinanceAdmin,
    notas: renderNotes,
    pagamentos: renderPayments,
    fazendas: renderFarms,
    usuarios: renderUsers,
    "log-equipamentos": renderEquipmentLog,
    historico: renderAudit,
    perfil: renderProfile,
    gado: renderCattle,
    safras: () => selectedType() === "grains" ? renderGrains() : renderAgriculture(),
    manejos: renderCattleManagement,
    "meu-dia": renderContributorDay,
    "equipamentos-campo": renderContributorEquipment,
    "meus-comprovantes": renderMyReceipts,
    "gado-campo": renderCattleReadOnly,
    gestao: renderGestao,
    insumos: renderInputs,
    "financeiro-gestao": renderFinanceHub,
    fiscal: renderFiscal,
    conciliacao: renderReconciliation,
    contratos: renderContracts,
    "pedidos-compra": renderPurchaseOrders,
    "pos-colheita": renderPostHarvest,
    "mao-de-obra": renderHarvestLabor,
    "colheita-campo": renderHarvestField,
    pragas: renderPests,
    reproducao: renderReproduction,
    leite: renderDairy,
    lcdpr: renderLcdpr,
    alertas: renderCentralAlerts,
    mapa: renderFarmMap,
    campo: renderFieldMode,
    manutencao: () => renderManagement(["maintenance", "fuel"].includes(mgTab) ? mgTab : "maintenance"),
    rastreabilidade: renderTraceability
  };
  pages[currentPage]();
  enhanceTables();
}

async function refreshQuote() {
  if (selectedType() !== "coffee") return;
  $("#quoteMini").classList.remove("hidden");
  $("#quoteMini").classList.add("is-loading");
  try {
    const r = await fetch("/api/cotacao-cafe");
    if (!r.ok) throw new Error();
    quote = await r.json();
    $("#quoteMini").classList.remove("is-loading");
    $("#quoteMiniValue").textContent = money(quote.brlPerSaca);
    if (["dashboard", "financeiro", "lancamentos"].includes(currentPage)) renderPage();
  } catch (_) {
    quote = null;
    $("#quoteMini").classList.remove("is-loading");
    $("#quoteMini").classList.add("hidden");
  }
}


function marketNumber(v, digits = 2) {
  return Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function marketVariation(item) {
  if (!item || typeof item.changePct !== "number") return `<span class="market-var neutral">—</span>`;
  const cls = item.changePct > 0 ? "up" : (item.changePct < 0 ? "down" : "neutral");
  const sign = item.changePct > 0 ? "+" : "";
  return `<span class="market-var ${cls}">${sign}${marketNumber(item.changePct, 2)}%</span>`;
}

function marketTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR"); } catch (_) { return "—"; }
}

async function loadMarketPanel(){return loadActivityMarket();}
function renderMarket(){
 setHeader('MERCADO','Mercado de '+farmTypeLabel());
 $('#pageContent').innerHTML='<div class="hero-surface"><div><span class="eyebrow">'+farmTypeLabel()+'</span><h2>Referências da sua atividade.</h2><p>Confira a origem e a data da referência antes de comparar com suas negociações.</p></div></div><div id="marketContent" class="card">Carregando...</div>';
 loadActivityMarket();if(marketRefreshTimer)clearInterval(marketRefreshTimer);marketRefreshTimer=setInterval(()=>{if(currentPage==='mercado')loadActivityMarket();},30000);
}

function contributorQuickForm() {
  if (currentUser.role !== "ceo") return "";
  return `<div class="section-head"><div><h2>Cadastro rápido de contribuinte</h2><p>Crie o colaborador e o login direto da página inicial.</p></div></div>
  <form id="quickContributorForm" class="form-card accent-card"><div class="form-grid">
    <label>Nome<input name="name" required placeholder="Nome completo"></label>
    <label>E-mail<input name="email" type="email" required placeholder="nome@empresa.com"></label>
    <label>Função<select name="function" required><option value="">Selecione</option><option value="Tratorista">Tratorista</option><option value="Campo">Campo</option><option value="Fiscal de colheita">Fiscal de colheita</option></select></label>
    <label>Chave PIX (opcional)<input name="pixKey" placeholder="CPF, telefone, e-mail ou chave aleatória"></label>
    <label>Fazenda permitida<select name="allowedFarmId" required>${data.farms.map(f => `<option value="${f.id}">${escapeHTML(f.name)} • Café + Gado + Grãos</option>`).join("")}</select></label>
    <label>Usuário<input name="username" required placeholder="Ex.: joao.silva"></label>
    <label>Senha inicial<input name="password" type="password" minlength="8" required placeholder="Mínimo 8 caracteres"></label>
  </div><div class="form-actions"><button class="btn primary">Cadastrar contribuinte</button></div></form>`;
}

function bindQuickContributor() {
  const form = $("#quickContributorForm");
  if (!form) return;
  form.onsubmit = e => {
    e.preventDefault();
    const f = new FormData(form);
    createUser({
      name: f.get("name"),
      email: f.get("email"),
      function: f.get("function"),
      pixKey: f.get("pixKey"),
      allowedFarmId: f.get("allowedFarmId"),
      username: f.get("username"),
      password: f.get("password"),
      role: "contribuinte"
    }, renderDashboard);
  };
}

function renderCeoBalanceDonut(finances) {
  if (!currentUser || currentUser.role !== "ceo") return "";
  const income = finances.filter(x => x.type === "entrada").reduce((s, x) => s + Number(x.value || 0), 0);
  const expense = finances.filter(x => x.type === "saida").reduce((s, x) => s + Number(x.value || 0), 0);
  const result = income - expense;
  const total = income + expense;
  const incomePct = total > 0 ? (income / total) * 100 : 100;
  const expensePct = total > 0 ? 100 - incomePct : 0;
  const ring = total > 0
    ? `conic-gradient(var(--accent) 0 ${incomePct.toFixed(2)}%, var(--danger) ${incomePct.toFixed(2)}% 100%)`
    : `conic-gradient(var(--line) 0 100%)`;

  return `
    <div class="section-head ceo-donut-heading"><div><h2>Resumo financeiro</h2><p>Entradas, gastos e resultado da visão selecionada.</p></div><span class="badge green">Somente CEO</span></div>
    <div class="ceo-balance-card">
      <div class="ceo-donut-wrap">
        <div class="ceo-donut" style="background:${ring}" role="img" aria-label="Entradas ${incomePct.toFixed(1)}%, gastos ${expensePct.toFixed(1)}%">
          <div class="ceo-donut-center"><span>Resultado</span><strong class="${result >= 0 ? "text-green" : "text-red"}">${money(result)}</strong></div>
        </div>
      </div>
      <div class="ceo-donut-stats">
        <div class="ceo-donut-stat"><span class="ceo-dot income"></span><div><small>Entradas</small><strong>${money(income)}</strong></div></div>
        <div class="ceo-donut-stat"><span class="ceo-dot expense"></span><div><small>Gastos</small><strong>${money(expense)}</strong></div></div>
        <div class="ceo-donut-stat result"><span class="ceo-dot result"></span><div><small>Lucro / resultado</small><strong class="${result >= 0 ? "text-green" : "text-red"}">${money(result)}</strong></div></div>
      </div>
    </div>`;
}

function renderDashboard() {
  const farms = farmsInContext();
  const type = selectedType();
  const finances = contextFinances();
  const totals = {
    income: finances.filter(x => x.type === "entrada").reduce((s, x) => s + Number(x.value || 0), 0),
    expense: finances.filter(x => x.type === "saida").reduce((s, x) => s + Number(x.value || 0), 0)
  };
  totals.profit = totals.income - totals.expense;
  const stock = contextStock();
  const stockValue = stock.reduce((s, x) => s + Number(x.quantity || 0) * Number(x.unitCost || 0), 0);
  const lowStock = stock.filter(x => Number(x.quantity || 0) <= Number(x.min || 0));

  setHeader("OPERAÇÃO", isGeneralView() ? `Painel geral de ${farmTypeLabel().toLowerCase()}` : "Visão geral");

  let modeCards = "";
  if (type === "coffee") {
    const tractors = contextEquipment("tractor");
    const implementsList = contextEquipment("implement");
    modeCards = `
      <div class="card"><div class="kpi-label"><span>Tratores</span><span class="kpi-icon">${ico("tractor")}</span></div><div class="kpi-value">${tractors.length}</div><div class="kpi-foot">${isGeneralView() ? "em todas as fazendas de café" : "cadastrados nesta fazenda"}</div></div>
      <div class="card"><div class="kpi-label"><span>Implementos</span><span class="kpi-icon">${ico("gear")}</span></div><div class="kpi-value">${implementsList.length}</div><div class="kpi-foot">equipamentos cadastrados</div></div>`;
  } else if (type === "grains") {
    modeCards = ruralAgricultureSummary();
  } else {
    const lots = contextLots();
    const weighings = contextWeighings();
    const heads = lots.reduce((s, l) => s + Number(l.heads || 0), 0);
    const herd = RuralDomain.herdStats(farmsInContext());
    modeCards = `
      <div class="card"><div class="kpi-label"><span>Lotes</span><span class="kpi-icon">${ico("cattle")}</span></div><div class="kpi-value">${lots.length}</div><div class="kpi-foot">${isGeneralView() ? "em todas as fazendas de gado" : "lotes cadastrados"}</div></div>
      <div class="card"><div class="kpi-label"><span>Cabeças</span><span class="kpi-icon">${ico("hash")}</span></div><div class="kpi-value">${heads}</div><div class="kpi-foot">total informado nos lotes</div></div>
      <div class="card"><div class="kpi-label"><span>Peso vivo médio atual</span><span class="kpi-icon">${ico("at")}</span></div><div class="kpi-value">${herd.avgKg == null ? "—" : ruralNum(herd.avgKg, 1) + " kg"}</div><div class="kpi-foot">${herd.coveredHeads} de ${herd.heads} cabeças com pesagem</div></div>`;
  }

  const financeCard = canSee("financeiro")
    ? `<div class="card"><div class="kpi-label"><span>Resultado acumulado</span><span class="kpi-icon">${ico("chart")}</span></div><div class="kpi-value ${totals.profit >= 0 ? "text-green" : "text-red"}">${money(totals.profit)}</div><div class="kpi-foot">${isGeneralView() ? "resultado consolidado" : currentUser.role === "ceo" ? "visível somente para CEO" : "liberado pelo CEO"}</div></div>`
    : `<div class="card"><div class="kpi-label"><span>Estoque</span><span class="kpi-icon">${ico("box")}</span></div><div class="kpi-value">${stock.length}</div><div class="kpi-foot">valor estimado ${money(stockValue)}</div></div>`;

  $("#pageContent").innerHTML = `
    <div class="hero-surface">
      <div><span class="eyebrow">CENTRO DE COMANDO</span><h2>${isGeneralView() ? `Visão consolidada • ${farmTypeLabel()}` : contextName()}</h2><p>${isGeneralView() ? "Aqui você acompanha o consolidado de todas as fazendas desse tipo." : "Acompanhe indicadores, estoques, operação e desempenho desta fazenda."}</p></div>
      <div class="hero-badges"><span class="badge ${type === "cattle" ? "gold" : "green"}">${farmTypeLabel()}</span>${currentUser.role === "ceo" ? `<span class="badge">Modo ${isGeneralView() ? "geral" : "individual"}</span>` : ""}</div>
    </div>
    <div class="grid kpis">${modeCards}${financeCard}${type === "coffee" ? `<div class="card ${quote ? "quote-card" : ""}"><div class="kpi-label"><span>Cotação estimada • saca 60 kg</span><span class="kpi-icon">${ico("bean")}</span></div><div class="kpi-value">${quote ? money(quote.brlPerSaca) : "Indisponível"}</div><div class="kpi-foot">referência Coffee C convertida para BRL</div></div>` : `<div class="card"><div class="kpi-label"><span>Valor em estoque</span><span class="kpi-icon">${ico("box")}</span></div><div class="kpi-value">${money(stockValue)}</div><div class="kpi-foot">baseado em quantidade × custo unitário</div></div>`}</div>
    ${type === "coffee" ? `<div class="section-head"><h2>Produção de café</h2></div><div class="grid kpis">${ruralAgricultureSummary()}</div>` : ""}

    ${opsGettingStarted()}
    ${todayPanel()}
    <div class="section-head"><div><h2>Alertas de estoque</h2><p>Itens que chegaram ao mínimo.</p></div></div>
    ${lowStock.length ? `<div class="grid three">${lowStock.slice(0, 9).map(s => `<div class="card"><span class="badge red">Estoque baixo</span><h3 style="margin-top:12px">${escapeHTML(s.item)}</h3><p class="muted">${escapeHTML(s.category)} • ${s.quantity} ${escapeHTML(s.unit)}${isGeneralView() ? ` • <b>${escapeHTML(s.farmName)}</b>` : ""}</p></div>`).join("")}</div>` : `<div class="card empty">Nenhum item abaixo do mínimo.</div>`}
    ${renderCeoBalanceDonut(finances)}`;
  $$("#pageContent .go-page").forEach(b => b.onclick = () => goToPage(b.dataset.page, b.dataset.focus === "1"));
}

function daysSince(iso) {
  if (!iso) return Infinity;
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return Math.floor((Date.now() - Date.UTC(y, m - 1, d)) / 86400000);
}
function lotLastWeighing(farm, lot) {
  return (farm.cattle?.weighings || []).filter(w => w.lotId === lot.id).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
}
function lotWeighingBadge(farm, lot) {
  const last = lotLastWeighing(farm, lot);
  if (!last) return ` <span class="badge gold">Sem pesagem</span>`;
  const d = daysSince(last.date);
  return d > 30 ? ` <span class="badge gold" title="Última pesagem em ${dateBR(last.date)}">Pesar • ${d} dias</span>` : "";
}
function attentionItems() {
  const farms = farmsInContext();
  const type = selectedType();
  const out = [];
  const list = (arr, key = "name") => arr.slice(0, 3).map(x => x[key] || x.title || "—").join(" • ") + (arr.length > 3 ? ` e mais ${arr.length - 3}` : "");
  if (currentUser.role === "ceo" && data.pendingRegistrations.length) out.push({ tone: "gold", title: `${data.pendingRegistrations.length} pedido(s) de acesso esperando você`, text: list(data.pendingRegistrations), page: "usuarios", action: "Revisar" });
  if (type === "coffee") {
    const orders = farms.flatMap(f => (f.banho?.orders || []).map(o => ({ ...o, farmName: f.name })));
    const drafts = orders.filter(o => o.status === "draft");
    const released = orders.filter(o => o.status === "released");
    if (drafts.length) out.push({ tone: "gold", title: `${drafts.length} banho(s) em rascunho, ainda não liberado(s)`, text: list(drafts, "title"), page: "banho", action: "Liberar" });
    if (released.length) out.push({ tone: "blue", title: `${released.length} banho(s) liberado(s) aguardando aplicação`, text: list(released, "title"), page: "banho", action: "Acompanhar" });
    const stopped = farms.flatMap(f => [...(f.tractors || []), ...(f.implements || [])]).filter(t => /manuten|parado/i.test(t.status || ""));
    if (stopped.length) out.push({ tone: "red", title: `${stopped.length} equipamento(s) parado(s) ou em manutenção`, text: list(stopped), page: "equipamentos", action: "Ver" });
  } else if (type === "cattle") {
    const late = farms.flatMap(f => (f.cattle?.lots || []).filter(l => daysSince(lotLastWeighing(f, l)?.date) > 30));
    if (late.length) out.push({ tone: "gold", title: `${late.length} lote(s) sem pesagem há mais de 30 dias`, text: list(late), page: "gado", action: "Pesar" });
  }
  if (type !== "cattle") {
    const delayed = farms.flatMap(f => (f.agriculture?.cycles || []).filter(c => c.activity === type && c.stage !== "Encerrada" && c.expectedDate && c.expectedDate < todayISO()));
    if (delayed.length) out.push({ tone: "gold", title: delayed.length + " safra(s) com previsão de colheita vencida", text: list(delayed), page: "safras", action: "Revisar" });
  } else {
    const due = farms.flatMap(f => (f.cattle?.healthEvents || []).filter(e => e.status === "scheduled" && e.date <= todayISO()));
    if (due.length) out.push({ tone: "gold", title: due.length + " manejo(s) previsto(s) para hoje ou atrasado(s)", text: list(due, "title"), page: "manejos", action: "Acompanhar" });
  }
  const low = contextStock().filter(x => Number(x.min || 0) > 0 && Number(x.quantity || 0) <= Number(x.min || 0));
  if (low.length) out.push({ tone: "red", title: `${low.length} item(ns) no estoque mínimo ou abaixo`, text: list(low, "item"), page: "estoque", action: "Repor" });
  return out;
}
function todayPanel() {
  if (!["ceo", "adm"].includes(currentUser.role)) return "";
  const items = attentionItems();
  const type = selectedType();
  const actions = [
    { page: currentUser.role === "ceo" ? "financeiro" : "lancamentos", icon: "swap", label: "Novo lançamento" },
    { page: "notas", icon: "receipt", label: "Lançar nota fiscal" },
    type === "coffee" ? { page: "safras", icon: "bean", label: "Produção de café" } : type === "grains" ? { page: "safras", icon: "bean", label: "Safra e colheita" } : { page: "gado", icon: "cattle", label: "Nova pesagem" },
    { page: "estoque", icon: "box", label: "Item de estoque" }
  ];
  return `<div class="section-head"><div><h2>Hoje</h2><p>O que precisa da sua atenção e atalhos para lançar.</p></div></div>
    <div class="today-grid">
      <div class="card attention">${items.length ? `<ul class="attention-list">${items.map(i => `<li class="tone-${i.tone}"><div><b>${escapeHTML(i.title)}</b><span>${escapeHTML(i.text)}</span></div><button type="button" class="btn small go-page" data-page="${i.page}">${i.action}</button></li>`).join("")}</ul>` : `<div class="all-good">${ico("check")}<div><b>Tudo em dia</b><span>Nenhuma pendência ${isGeneralView() ? "nas fazendas" : "nesta fazenda"} agora.</span></div></div>`}</div>
      <div class="card quick"><h3>Atalhos</h3><div class="quick-grid">${actions.map(a => `<button type="button" class="quick-btn go-page" data-page="${a.page}" data-focus="1">${ico(a.icon)}<span>${a.label}</span></button>`).join("")}</div></div>
    </div>`;
}

function renderEquipmentAdmin() {
  if (selectedType() === "cattle") return renderCattle();
  setHeader("PATRIMÔNIO", isGeneralView() ? "Equipamentos gerais" : "Tratores e implementos");
  if (isGeneralView()) {
    const tractors = contextEquipment("tractor");
    const implementsList = contextEquipment("implement");
    $("#pageContent").innerHTML = `
      <div class="card soft"><span class="eyebrow dark">VISÃO GERAL DE CAFÉ</span><h2>${tractors.length + implementsList.length} ativos</h2><p class="muted">Modo geral apenas para consulta. Para cadastrar ou editar, escolha uma fazenda específica.</p></div>
      <div class="section-head"><h2>Tratores</h2></div>
      ${tractors.length ? `<div class="table-wrap"><table><thead><tr><th>Fazenda</th><th>Nome</th><th>Modelo</th><th>Status</th></tr></thead><tbody>${tractors.map(t => `<tr><td>${escapeHTML(t.farmName)}</td><td><b>${escapeHTML(t.name)}</b></td><td>${escapeHTML(t.model || "—")} • ${escapeHTML(t.plate || "—")}</td><td><span class="badge ${t.status === "Disponível" ? "green" : "gold"}">${escapeHTML(t.status)}</span></td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhum trator cadastrado.</div>`}
      <div class="section-head"><h2>Implementos</h2></div>
      ${implementsList.length ? `<div class="table-wrap"><table><thead><tr><th>Fazenda</th><th>Nome</th><th>Categoria</th><th>Status</th></tr></thead><tbody>${implementsList.map(i => `<tr><td>${escapeHTML(i.farmName)}</td><td><b>${escapeHTML(i.name)}</b></td><td>${escapeHTML(i.category || "—")}</td><td><span class="badge ${i.status === "Disponível" ? "green" : "gold"}">${escapeHTML(i.status)}</span></td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhum implemento cadastrado.</div>`}`;
    return;
  }

  const farm = activeFarm();
  $("#pageContent").innerHTML = `
    <div class="grid two">
      <form id="tractorForm" class="form-card"><h3>Novo trator</h3><div class="form-grid" style="margin-top:18px"><label>Nome<input name="name" required></label><label>Modelo<input name="model"></label><label>Identificação<input name="plate"></label><label>Status<select name="status"><option>Disponível</option><option>Manutenção</option><option>Parado</option></select></label></div><div class="form-actions"><button class="btn primary">Adicionar trator</button></div></form>
      <form id="implementForm" class="form-card"><h3>Novo implemento</h3><div class="form-grid" style="margin-top:18px"><label>Nome<input name="name" required></label><label>Categoria<input name="category"></label><label class="wide">Status<select name="status"><option>Disponível</option><option>Manutenção</option><option>Parado</option></select></label></div><div class="form-actions"><button class="btn primary">Adicionar implemento</button></div></form>
    </div>
    <div class="section-head"><h2>Tratores</h2></div>${equipmentTable("tractor")}
    <div class="section-head"><h2>Implementos</h2></div>${equipmentTable("implement")}`;

  $("#tractorForm").onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    farm.tractors.push({ id: uid(), name: f.get("name"), model: f.get("model"), plate: f.get("plate"), status: f.get("status") });
    saveData(); renderEquipmentAdmin(); toast("Trator adicionado.");
  };
  $("#implementForm").onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    farm.implements.push({ id: uid(), name: f.get("name"), category: f.get("category"), status: f.get("status") });
    saveData(); renderEquipmentAdmin(); toast("Implemento adicionado.");
  };
  $$(".edit-equipment").forEach(btn => btn.onclick = async () => {
    const tractor = btn.dataset.type === "tractor";
    const item = (tractor ? farm.tractors : farm.implements).find(x => x.id === btn.dataset.id); if (!item) return;
    const v = await askForm({ title: `Editar ${item.name}`, okText: "Salvar alterações", fields: [
      { name: "name", label: "Nome", value: item.name, required: true },
      tractor ? { name: "model", label: "Modelo", value: item.model || "" } : { name: "category", label: "Categoria", value: item.category || "" },
      ...(tractor ? [{ name: "plate", label: "Identificação", value: item.plate || "" }] : []),
      { name: "status", label: "Status", type: "select", value: item.status, options: ["Disponível", "Manutenção", "Parado"] }
    ] });
    if (!v) return;
    Object.assign(item, v);
    saveData(); renderEquipmentAdmin(); toast("Equipamento atualizado.");
  });
  $$(".delete-equipment").forEach(btn => btn.onclick = async () => {
    const list = btn.dataset.type === "tractor" ? farm.tractors : farm.implements;
    const item = list.find(x => x.id === btn.dataset.id);
    if (!item || !(await confirmDelete(`${btn.dataset.type === "tractor" ? "O trator" : "O implemento"} ${item.name}`))) return;
    if (btn.dataset.type === "tractor") farm.tractors = farm.tractors.filter(x => x.id !== btn.dataset.id);
    else farm.implements = farm.implements.filter(x => x.id !== btn.dataset.id);
    saveData(); renderEquipmentAdmin(); toast("Item removido.");
  });
}

function equipmentTable(type) {
  const arr = type === "tractor" ? activeFarm().tractors : activeFarm().implements;
  if (!arr.length) return `<div class="card empty">Nenhum item cadastrado.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>${type === "tractor" ? "Modelo / ID" : "Categoria"}</th><th>Status</th><th></th></tr></thead><tbody>${arr.map(x => `<tr><td><b>${escapeHTML(x.name)}</b></td><td>${type === "tractor" ? `${escapeHTML(x.model || "—")} • ${escapeHTML(x.plate || "—")}` : escapeHTML(x.category || "—")}</td><td><span class="badge ${x.status === "Disponível" ? "green" : "gold"}">${escapeHTML(x.status)}</span></td><td><div class="row-actions"><button type="button" class="btn small edit-equipment" data-type="${type}" data-id="${x.id}">Editar</button><button class="btn danger small delete-equipment" data-type="${type}" data-id="${x.id}">Excluir</button></div></td></tr>`).join("")}</tbody></table></div>`;
}

function renderTalhoes() {
  if (!canSee("talhoes")) return;
  if (selectedType() === "cattle") {
    setHeader("TALHÕES", "Talhões");
    $("#pageContent").innerHTML = `<div class="card soft"><h2>Talhões disponíveis para café</h2><p class="muted">Selecione uma fazenda de café para cadastrar os talhões.</p></div>`;
    return;
  }
  setHeader("TALHÕES", isGeneralView() ? "Talhões gerais" : "Talhões");
  if (isGeneralView()) {
    const all = data.farms.flatMap(f => (f.talhoes || []).map(t => ({ ...t, farmName: f.name })));
    $("#pageContent").innerHTML = `<div class="card soft"><span class="eyebrow dark">VISÃO GERAL</span><h2>${all.length} talhões</h2><p class="muted">Para criar ou apagar talhões, escolha uma fazenda específica.</p></div><div class="section-head"><h2>Talhões cadastrados</h2></div>${all.length ? `<div class="table-wrap"><table><thead><tr><th>Fazenda</th><th>Talhão</th><th>Referência</th></tr></thead><tbody>${all.map(t => `<tr><td>${escapeHTML(t.farmName)}</td><td><b>${escapeHTML(t.name)}</b></td><td>${escapeHTML(t.reference || "—")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhum talhão cadastrado.</div>`}`;
    return;
  }
  const farm = activeFarm();
  farm.talhoes = Array.isArray(farm.talhoes) ? farm.talhoes : [];
  $("#pageContent").innerHTML = `<div class="grid two"><form id="plotForm" class="form-card"><div class="inline"><h3>Novo talhão</h3><span class="badge gold right">Somente CEO</span></div><label>Nome do talhão<input name="name" required placeholder="Ex.: Talhão 01, Baixada, Chapadão"></label><label>Referência <span class="subtle">(opcional)</span><input name="reference" placeholder="Ex.: próximo à represa, barracão, terreiro..."></label><div class="form-actions"><button class="btn primary">Adicionar talhão</button></div></form><div class="card soft"><span class="eyebrow dark">${escapeHTML(farm.name)}</span><h2>${farm.talhoes.length} talhões</h2><p class="muted">Use a referência para facilitar a localização do talhão no campo.</p></div></div><div class="section-head"><h2>Talhões cadastrados</h2></div><div class="grid three">${farm.talhoes.map(t => `<div class="card"><div class="inline"><h3>${escapeHTML(t.name)}</h3><span class="right row-actions"><button type="button" class="btn small plot-history" data-id="${t.id}">Histórico</button><button type="button" class="btn small plot-edit" data-id="${t.id}">Editar</button><button class="btn danger small plot-del" data-id="${t.id}">Excluir</button></span></div>${t.reference ? `<p class="muted"><b>Referência:</b> ${escapeHTML(t.reference)}</p>` : `<p class="subtle">Sem referência informada</p>`}</div>`).join("") || `<div class="card empty">Nenhum talhão cadastrado.</div>`}</div>`;
  $$(".plot-history").forEach(btn => btn.onclick = () => openPlotHistory(farm.id,btn.dataset.id));
  $("#plotForm").onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const name = String(f.get("name") || "").trim();
    const reference = String(f.get("reference") || "").trim();
    if (!name) return;
    if (farm.talhoes.some(t => t.name.toLowerCase() === name.toLowerCase())) return toast("Esse talhão já existe.");
    farm.talhoes.push({ id: uid(), name, reference });
    saveData(); renderTalhoes(); toast("Talhão adicionado.");
  };
  $$(".plot-edit").forEach(btn => btn.onclick = async () => {
    const plot = farm.talhoes.find(t => t.id === btn.dataset.id); if (!plot) return;
    const v = await askForm({ title: `Editar ${plot.name}`, okText: "Salvar alterações", fields: [
      { name: "name", label: "Nome do talhão", value: plot.name, required: true },
      { name: "reference", label: "Referência (opcional)", value: plot.reference || "", placeholder: "Ex.: próximo à represa" }
    ] });
    if (!v) return;
    plot.name = v.name.trim(); plot.reference = v.reference.trim();
    saveData(); renderTalhoes(); toast("Talhão atualizado.");
  });
  $$(".plot-del").forEach(btn => btn.onclick = async () => { const plot = farm.talhoes.find(t => t.id === btn.dataset.id); if (!plot) return; if (PlotHistory.hasReferences(farm,plot.id)) return toast("Este talhão possui histórico ou registros vinculados e não pode ser excluído."); if ((farm.agriculture?.cycles || []).some(c => c.plotId === plot.id)) return toast("Este talhão está vinculado a uma safra. Remova o vínculo antes de excluir."); if (!await confirmDelete(`O ${plot.name}`)) return; farm.talhoes = farm.talhoes.filter(t => t.id !== plot.id); saveData(); renderTalhoes(); toast("Talhão excluído."); });
}

function banhoStatusLabel(status) {
  return ({ draft: "Rascunho", released: "Liberado", completed: "Concluído", cancelled: "Cancelado" })[status] || status;
}

function banhoStatusClass(status) {
  if (status === "completed") return "green";
  if (status === "released") return "gold";
  if (status === "cancelled") return "red";
  return "";
}

function renderBanho() {
  if (selectedType() !== "coffee") {
    currentPage = currentUser.role === "contribuinte" ? "gado-campo" : "dashboard";
    renderNav();
    return renderPage();
  }

  if (currentUser.role === "contribuinte" && currentUser.function !== "Tratorista") {
    currentPage = "meu-dia";
    renderNav();
    return renderContributorDay();
  }

  setHeader("APLICAÇÃO", isGeneralView() ? "Banhos gerais" : (currentUser.role === "contribuinte" ? "Banhos liberados" : "Banho"));

  if (isGeneralView()) {
    const orders = data.farms.flatMap(f => (f.banho?.orders || []).map(o => ({ ...o, farmName: f.name })));
    $("#pageContent").innerHTML = `
      <div class="card soft"><span class="eyebrow dark">VISÃO GERAL DE CAFÉ</span><h2>${orders.length} ordens de banho</h2><p class="muted">Consulta consolidada. Para criar produtos ou liberar um banho, escolha uma fazenda específica.</p></div>
      <div class="section-head"><h2>Ordens</h2></div>
      ${orders.length ? `<div class="table-wrap"><table><thead><tr><th>Fazenda</th><th>Ordem</th><th>Talhões</th><th>Produtos</th><th>Status</th><th>Criado por</th></tr></thead><tbody>${[...orders].reverse().map(o => `<tr><td>${escapeHTML(o.farmName)}</td><td><b>${escapeHTML(o.title || "Banho")}</b></td><td>${escapeHTML((o.talhaoNames || []).join(", ") || "—")}</td><td>${escapeHTML((o.products || []).map(p => `${p.name}: ${Number(p.quantity).toLocaleString("pt-BR")} ${p.unit}`).join(" • ") || "—")}</td><td><span class="badge ${banhoStatusClass(o.status)}">${banhoStatusLabel(o.status)}</span></td><td>${escapeHTML(o.createdByName || o.createdBy || "—")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhuma ordem de banho cadastrada.</div>`}`;
    return;
  }

  const farm = activeFarm();
  farm.banho = farm.banho || { products: [], orders: [] };
  farm.banho.products = Array.isArray(farm.banho.products) ? farm.banho.products : [];
  farm.banho.orders = Array.isArray(farm.banho.orders) ? farm.banho.orders : [];

  if (currentUser.role === "contribuinte") {
    const released = farm.banho.orders.filter(o => o.status === "released");
    const completedByMe = farm.banho.orders.filter(o => o.status === "completed" && o.completedBy === currentUser.username).slice().reverse().slice(0, 20);
    $("#pageContent").innerHTML = `
      <div class="assignment-hero"><div><span class="eyebrow">ORDENS LIBERADAS • TRATORISTA</span><h2>${released.length ? `${released.length} banho(s) aguardando` : "Nenhum banho liberado"}</h2><p>Confira os talhões, produtos e quantidades antes de iniciar a aplicação.</p></div><div class="assignment-status"><strong>${dateBR(todayISO())}</strong></div></div>
      <div class="section-head"><div><h2>Para executar</h2><p>Somente ordens liberadas por CEO ou ADM aparecem aqui.</p></div></div>
      ${released.length ? `<div class="grid two">${released.map(o => `<div class="card"><div class="inline"><span class="badge gold">Liberado</span><span class="subtle right">${o.releasedAt ? new Date(o.releasedAt).toLocaleString("pt-BR") : ""}</span></div><h2 style="font-size:24px;margin-top:14px">${escapeHTML(o.title || "Banho")}</h2><p class="muted"><b>Talhão(ões):</b> ${escapeHTML((o.talhaoNames || []).join(", ") || "—")}</p><div class="card soft" style="margin-top:12px"><b>Produtos e quantidades</b><div style="display:grid;gap:8px;margin-top:10px">${(o.products || []).map(p => `<div class="inline"><span>${escapeHTML(p.name)}</span><b class="right">${Number(p.quantity).toLocaleString("pt-BR")} ${escapeHTML(p.unit)}</b></div>`).join("") || `<span class="muted">Nenhum produto informado.</span>`}</div></div>${o.notes ? `<p class="muted"><b>Observação:</b> ${escapeHTML(o.notes)}</p>` : ""}<div class="form-actions"><button class="btn primary bath-complete" data-id="${o.id}">Marcar como concluído</button></div></div>`).join("")}</div>` : `<div class="card empty">Quando CEO ou ADM liberar um banho para esta fazenda, ele aparecerá aqui.</div>`}
      <div class="section-head"><h2>Concluídos por você</h2></div>
      ${completedByMe.length ? `<div class="table-wrap"><table><thead><tr><th>Ordem</th><th>Talhões</th><th>Produtos</th><th>Concluído em</th></tr></thead><tbody>${completedByMe.map(o => `<tr><td><b>${escapeHTML(o.title || "Banho")}</b></td><td>${escapeHTML((o.talhaoNames || []).join(", ") || "—")}</td><td>${escapeHTML((o.products || []).map(p => `${p.name} ${Number(p.quantity).toLocaleString("pt-BR")} ${p.unit}`).join(" • "))}</td><td>${o.completedAt ? new Date(o.completedAt).toLocaleString("pt-BR") : "—"}</td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhum banho concluído por você ainda.</div>`}`;

    $$(".bath-complete").forEach(btn => btn.onclick = async () => {
      const order = farm.banho.orders.find(o => o.id === btn.dataset.id);
      if (!order || order.status !== "released") return;
      if (!await ask(`Confirma que "${order.title || "Banho"}" foi aplicado? Os produtos usados saem do estoque.`, { title: "Concluir banho", okText: "Concluir" })) return;
      order.status = "completed";
      order.completedAt = new Date().toISOString();
      order.completedBy = currentUser.username;
      order.completedByName = currentUser.name;
      saveData();
      renderBanho();
      toast("Banho concluído.");
    });
    return;
  }

  const activeProducts = farm.banho.products.filter(p => p.active !== false);
  const orders = farm.banho.orders.slice().reverse();
  const canCreateOrder = farm.talhoes.length > 0 && activeProducts.length > 0;
  $("#pageContent").innerHTML = `
    <div class="grid two">
      <form id="bathProductForm" class="form-card"><div class="inline"><h3>Produtos para banho</h3><span class="badge gold right">CEO / ADM</span></div><div class="form-grid" style="margin-top:18px"><label>Produto<input name="name" required placeholder="Ex.: Produto A"></label><label>Unidade<select name="unit"><option value="L">Litros (L)</option><option value="kg">Quilos (kg)</option></select></label></div><div class="form-actions"><button class="btn primary">Adicionar produto</button></div></form>
      <div class="card soft"><span class="eyebrow dark">PREPARO</span><h2>${activeProducts.length} produtos ativos</h2><p class="muted">Cadastre previamente os produtos que poderão ser selecionados nas ordens de banho.</p></div>
    </div>

    <div class="section-head"><h2>Produtos cadastrados</h2></div>
    ${farm.banho.products.length ? `<div class="table-wrap"><table><thead><tr><th>Produto</th><th>Unidade</th><th>Status</th><th>Ações</th></tr></thead><tbody>${farm.banho.products.map(p => `<tr><td><b>${escapeHTML(p.name)}</b></td><td>${escapeHTML(p.unit)}</td><td><span class="badge ${p.active !== false ? "green" : "red"}">${p.active !== false ? "Ativo" : "Inativo"}</span></td><td><div class="inline"><button class="btn small bath-product-toggle" data-id="${p.id}">${p.active !== false ? "Desativar" : "Ativar"}</button><button class="btn danger small bath-product-delete" data-id="${p.id}">Excluir</button></div></td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhum produto cadastrado.</div>`}

    <div class="section-head"><div><h2>Montar novo banho</h2><p>Selecione os talhões e informe a quantidade de cada produto antes de liberar.</p></div></div>
    ${canCreateOrder ? `<form id="bathOrderForm" class="form-card"><div class="form-grid"><label>Nome da ordem<input name="title" placeholder="Ex.: Banho Talhão 01" value="Banho ${dateBR(todayISO())}"></label><label class="wide">Observação<input name="notes" placeholder="Opcional"></label></div><div class="section-head"><h2>Talhões</h2></div><div class="grid three">${farm.talhoes.map(t => `<label class="equipment-pick"><span><strong>${escapeHTML(t.name)}</strong><span>${t.reference ? `Ref.: ${escapeHTML(t.reference)}` : "Selecionar talhão"}</span></span><input type="checkbox" name="bathTalhoes" value="${t.id}"></label>`).join("")}</div><div class="section-head"><h2>Produtos e quantidades</h2></div><div class="grid two">${activeProducts.map(p => `<div class="card soft"><label style="margin:0;display:flex;grid-template-columns:auto 1fr;align-items:center;gap:10px"><input type="checkbox" name="bathProducts" value="${p.id}" style="width:auto"><b>${escapeHTML(p.name)}</b></label><label>Quantidade (${escapeHTML(p.unit)})<input type="number" min="0" step="0.01" name="bathQty_${p.id}" placeholder="0"></label></div>`).join("")}</div><div class="form-actions"><button class="btn primary">Salvar rascunho</button></div></form>` : `<div class="card empty">Para montar um banho, cadastre pelo menos <b>1 talhão</b> e <b>1 produto ativo</b>.</div>`}

    <div class="section-head"><div><h2>Ordens de banho</h2><p>Salve como rascunho, confira e depois clique em Liberar.</p></div></div>
    ${orders.length ? `<div class="table-wrap"><table><thead><tr><th>Ordem</th><th>Talhões</th><th>Produtos</th><th>Status</th><th>Responsável</th><th>Ações</th></tr></thead><tbody>${orders.map(o => `<tr><td><b>${escapeHTML(o.title || "Banho")}</b><div class="subtle">${o.createdAt ? new Date(o.createdAt).toLocaleString("pt-BR") : ""}</div></td><td>${escapeHTML((o.talhaoNames || []).join(", ") || "—")}</td><td>${escapeHTML((o.products || []).map(p => `${p.name}: ${Number(p.quantity).toLocaleString("pt-BR")} ${p.unit}`).join(" • ") || "—")}</td><td><span class="badge ${banhoStatusClass(o.status)}">${banhoStatusLabel(o.status)}</span></td><td>${o.completedByName ? escapeHTML(o.completedByName) : "—"}</td><td><div class="inline">${o.status === "draft" ? `<button class="btn primary small bath-release" data-id="${o.id}">Liberar</button><button class="btn danger small bath-delete" data-id="${o.id}">Excluir</button>` : ""}${o.status === "released" ? `<button class="btn danger small bath-cancel" data-id="${o.id}">Cancelar</button>` : ""}</div></td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhuma ordem de banho criada.</div>`}`;

  $("#bathProductForm").onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const name = String(f.get("name") || "").trim();
    if (!name) return;
    if (farm.banho.products.some(p => p.name.toLowerCase() === name.toLowerCase())) return toast("Esse produto já está cadastrado.");
    farm.banho.products.push({ id: uid(), name, unit: f.get("unit") === "kg" ? "kg" : "L", active: true });
    saveData(); renderBanho(); toast("Produto adicionado.");
  };

  $$(".bath-product-toggle").forEach(btn => btn.onclick = () => {
    const product = farm.banho.products.find(p => p.id === btn.dataset.id);
    if (!product) return;
    product.active = product.active === false;
    saveData(); renderBanho();
  });

  $$(".bath-product-delete").forEach(btn => btn.onclick = async () => {
    const product = farm.banho.products.find(p => p.id === btn.dataset.id);
    if (!product) return;
    if (!await confirmDelete(`O produto ${product.name}`, "Ordens antigas continuam com o nome e a quantidade salvos")) return;
    farm.banho.products = farm.banho.products.filter(p => p.id !== product.id);
    saveData(); renderBanho();
  });

  const orderForm = $("#bathOrderForm");
  if (orderForm) orderForm.onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const talhaoIds = f.getAll("bathTalhoes");
    const productIds = f.getAll("bathProducts");
    if (!talhaoIds.length) return toast("Escolha pelo menos um talhão.");
    if (!productIds.length) return toast("Escolha pelo menos um produto.");
    const selectedProducts = [];
    for (const productId of productIds) {
      const product = farm.banho.products.find(p => p.id === productId);
      const quantity = Number(f.get(`bathQty_${productId}`) || 0);
      if (!product || quantity <= 0) return toast(`Informe uma quantidade maior que zero para ${product?.name || "o produto selecionado"}.`);
      selectedProducts.push({ productId: product.id, name: product.name, unit: product.unit, quantity });
    }
    const talhaoNames = talhaoIds.map(id => farm.talhoes.find(t => t.id === id)?.name).filter(Boolean);
    farm.banho.orders.push({
      id: uid(),
      title: String(f.get("title") || "").trim() || `Banho ${dateBR(todayISO())}`,
      notes: String(f.get("notes") || "").trim(),
      talhaoIds,
      talhaoNames,
      products: selectedProducts,
      status: "draft",
      createdAt: new Date().toISOString(),
      createdBy: currentUser.username,
      createdByName: currentUser.name
    });
    saveData(); renderBanho(); toast("Rascunho do banho salvo.");
  };

  $$(".bath-release").forEach(btn => btn.onclick = () => {
    const order = farm.banho.orders.find(o => o.id === btn.dataset.id);
    if (!order || order.status !== "draft") return;
    order.status = "released";
    order.releasedAt = new Date().toISOString();
    order.releasedBy = currentUser.username;
    order.releasedByName = currentUser.name;
    saveData(); renderBanho(); toast("Banho liberado para os tratoristas.");
  });

  $$(".bath-cancel").forEach(btn => btn.onclick = async () => {
    const order = farm.banho.orders.find(o => o.id === btn.dataset.id);
    if (!order || order.status !== "released") return;
    if (!await ask("Os tratoristas deixam de ver esta ordem de banho.", { title: "Cancelar banho liberado?", okText: "Cancelar banho", danger: true })) return;
    order.status = "cancelled";
    order.cancelledAt = new Date().toISOString();
    order.cancelledBy = currentUser.username;
    saveData(); renderBanho(); toast("Banho cancelado.");
  });

  $$(".bath-delete").forEach(btn => btn.onclick = async () => {
    const order = farm.banho.orders.find(o => o.id === btn.dataset.id);
    if (!order || order.status !== "draft") return;
    if (!await confirmDelete("Este rascunho de banho")) return;
    farm.banho.orders = farm.banho.orders.filter(o => o.id !== order.id);
    saveData(); renderBanho();
  });
}

function renderStock() {
  const items = contextStock();
  const totalValue = items.reduce((s, x) => s + Number(x.quantity || 0) * Number(x.unitCost || 0), 0);
  setHeader("INSUMOS", isGeneralView() ? "Estoque geral" : "Estoque");

  if (isGeneralView()) {
    $("#pageContent").innerHTML = `
      <div class="card soft"><span class="eyebrow dark">VISÃO GERAL</span><h2>${items.length} itens</h2><p class="muted">Valor estimado total: <b>${money(totalValue)}</b>. Para cadastrar ou editar, escolha uma fazenda específica.</p></div>
      ${items.length ? `<div class="table-wrap" style="margin-top:18px"><table><thead><tr><th>Fazenda</th><th>Produto</th><th>Categoria</th><th>Qtd.</th><th>Unid.</th><th>Mínimo</th><th>Custo un.</th><th>Valor</th></tr></thead><tbody>${items.map(s => `<tr><td>${escapeHTML(s.farmName)}</td><td><b>${escapeHTML(s.item)}</b></td><td>${escapeHTML(s.category)}</td><td>${s.quantity}</td><td>${escapeHTML(s.unit)}</td><td>${s.min}</td><td>${money(s.unitCost)}</td><td>${money(Number(s.quantity || 0) * Number(s.unitCost || 0))}</td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhum item de estoque.</div>`}`;
    return;
  }

  const farm = activeFarm();
  const cats = stockCategories();
  $("#pageContent").innerHTML = `
    <div class="grid two">
      <form id="stockForm" class="form-card"><div class="inline"><h3>Adicionar item</h3><span class="badge green right">CEO / ADM</span></div><div class="form-grid" style="margin-top:18px"><label>Produto<input name="item" required></label><label>Categoria<select name="category">${cats.map(c => `<option>${c}</option>`).join("")}</select></label><label>Quantidade<input name="quantity" type="number" min="0" step="0.01" required></label><label>Unidade<input name="unit" required placeholder="kg, L, sacos..."></label><label>Estoque mínimo<input name="min" type="number" min="0" step="0.01" value="0"></label><label>Custo unitário<input name="unitCost" type="number" min="0" step="0.01" value="0"></label></div><div class="form-actions"><button class="btn primary">Salvar item</button></div></form>
      <div class="card soft"><span class="eyebrow dark">ESTOQUE • ${farmTypeLabel().toUpperCase()}</span><h2>${items.length} itens</h2><p class="muted">Valor estimado: <b>${money(totalValue)}</b></p></div>
    </div>
    <div class="section-head"><div><h2>Itens salvos</h2><p>Quantidade pode ser atualizada diretamente.</p></div></div>
    ${items.length ? `<div class="table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Qtd.</th><th>Unidade</th><th>Mínimo</th><th>Custo un.</th><th>Valor</th><th></th></tr></thead><tbody>${items.map(s => `<tr><td><b>${escapeHTML(s.item)}</b></td><td>${escapeHTML(s.category)}</td><td><input class="stock-q" data-id="${s.id}" type="number" min="0" step="0.01" value="${Number(s.quantity || 0)}" style="width:90px"></td><td>${escapeHTML(s.unit)}</td><td>${s.min}</td><td>${money(s.unitCost)}</td><td>${money(Number(s.quantity || 0) * Number(s.unitCost || 0))}</td><td><div class="row-actions"><button type="button" class="btn small stock-edit" data-id="${s.id}">Editar</button><button class="btn danger small stock-del" data-id="${s.id}">Excluir</button></div></td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Estoque vazio.</div>`}`;

  $("#stockForm").onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    farm.stock.push({ id: uid(), activity: selectedType(), item: f.get("item"), category: f.get("category"), quantity: Number(f.get("quantity")), unit: f.get("unit"), min: Number(f.get("min")), unitCost: Number(f.get("unitCost")) });
    saveData(); renderStock(); toast("Item salvo.");
  };
  $$(".stock-q").forEach(inp => inp.onchange = () => {
    const item = farm.stock.find(x => x.id === inp.dataset.id);
    if (!item) return;
    const before = Number(item.quantity || 0), after = Number(inp.value);
    if (!Number.isFinite(after) || after < 0) { inp.value = before; return toast("Informe uma quantidade válida."); }
    if (after === before) return;
    item.quantity = after;
    item.moves ||= [];
    item.moves.push({ id: uid(), at: new Date().toISOString(), delta: Math.round((after - before) * 1000) / 1000, reason: "Ajuste manual", by: currentUser.name });
    item.moves = item.moves.slice(-60);
    saveData(); renderStock();
  });
  $$(".stock-edit").forEach(btn => btn.onclick = async () => {
    const item = farm.stock.find(x => x.id === btn.dataset.id); if (!item) return;
    const v = await askForm({ title: `Editar ${item.item}`, okText: "Salvar alterações", wide: true, fields: [
      { name: "item", label: "Produto", value: item.item, required: true, wide: true, hint: "Para baixar sozinho no banho, use o mesmo nome do produto de banho." },
      { name: "category", label: "Categoria", type: "select", value: item.category, options: [...new Set([...stockCategories(), item.category].filter(Boolean))] },
      { name: "unit", label: "Unidade", value: item.unit || "", placeholder: "kg, L, sacos…" },
      { name: "min", label: "Estoque mínimo", type: "number", step: "0.01", min: "0", value: item.min ?? 0 },
      { name: "unitCost", label: "Custo unitário (R$)", type: "number", step: "0.01", min: "0", value: item.unitCost ?? 0 }
    ] });
    if (!v) return;
    Object.assign(item, { item: v.item.trim(), category: v.category, unit: v.unit.trim(), min: Number(v.min || 0), unitCost: Number(v.unitCost || 0) });
    saveData(); renderStock(); toast("Item atualizado.");
  });
  const moves = (farm.stock || []).flatMap(it => (it.moves || []).map(m => ({ ...m, item: it.item, unit: it.unit }))).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 25);
  if (moves.length) $("#pageContent").insertAdjacentHTML("beforeend", `<div class="section-head"><div><h2>Movimentações recentes</h2><p>Ajustes manuais e saídas automáticas dos banhos concluídos.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Quando</th><th>Produto</th><th>Quantidade</th><th>Motivo</th><th>Por</th></tr></thead><tbody>${moves.map(m => `<tr><td>${new Date(m.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td><td><b>${escapeHTML(m.item)}</b></td><td class="${m.delta < 0 ? "text-red" : "text-green"}">${m.delta > 0 ? "+" : ""}${Number(m.delta).toLocaleString("pt-BR")} ${escapeHTML(m.unit || "")}</td><td>${escapeHTML(m.reason || "—")}</td><td>${escapeHTML(m.by || "—")}</td></tr>`).join("")}</tbody></table></div>`);
  $$(".stock-del").forEach(btn => btn.onclick = async () => {
    const item = farm.stock.find(x => x.id === btn.dataset.id);
    if (!item || !(await confirmDelete(`O item ${item.item}`))) return;
    farm.stock = farm.stock.filter(x => x.id !== btn.dataset.id);
    saveData(); renderStock();
  });
}

function financeForm(admin = false) {
  const coffee = selectedType() === "coffee";
  const cats = financeCategories();
  return `<form id="financeForm" class="form-card"><div class="inline"><h3>Novo lançamento</h3>${admin ? `<span class="badge gold right">ADM não vê o balanço</span>` : ""}</div><div class="form-grid" style="margin-top:18px"><label>Tipo<select name="type" id="financeType"><option value="entrada">Entrada</option><option value="saida">Despesa / saída</option></select></label><label>Categoria<select name="category" id="financeCategory">${cats.map(c => `<option>${c}</option>`).join("")}</select></label><label class="wide">Descrição<input name="description" required></label><label>Data<input name="date" type="date" value="${todayISO()}" required></label><label>Valor manual (R$)<input name="value" type="number" min="0" step="0.01"></label>${coffee ? `<div id="coffeeFields" class="wide card soft"><b>Venda por sacas de café (60 kg)</b><div class="form-grid" style="margin-top:12px"><label>Sacas<input id="bagsInput" name="bags" type="number" min="0" step="0.01"></label><label>Cotação R$/saca<input id="quoteInput" name="quote" type="number" min="0" step="0.01" value="${quote ? quote.brlPerSaca.toFixed(2) : ""}"></label></div><p class="subtle">Valor calculado: <b id="coffeeCalc">${money(0)}</b></p></div>` : ""}</div><div class="form-actions">${coffee ? `<button type="button" id="refreshQuoteBtn" class="btn">Atualizar cotação</button>` : ""}<button class="btn primary">Registrar</button></div></form>`;
}

function bindFinanceForm(after) {
  const coffee = selectedType() === "coffee";
  if (coffee) {
    const sync = () => {
      const visible = $("#financeType").value === "entrada" && $("#financeCategory").value === "Venda de café";
      $("#coffeeFields").classList.toggle("hidden", !visible);
      const bags = Number($("#bagsInput").value || 0);
      const q = Number($("#quoteInput").value || 0);
      $("#coffeeCalc").textContent = money(bags * q);
    };
    $("#financeType").onchange = sync;
    $("#financeCategory").onchange = sync;
    $("#bagsInput").oninput = sync;
    $("#quoteInput").oninput = sync;
    sync();
    $("#refreshQuoteBtn").onclick = async () => { await refreshQuote(); if (quote) { $("#quoteInput").value = quote.brlPerSaca.toFixed(2); sync(); } };
  }
  $("#financeForm").onsubmit = e => {
    e.preventDefault();
    const farm = activeFarm();
    if (!farm) return toast("Selecione uma fazenda específica para lançar.");
    const f = new FormData(e.target);
    let value = Number(f.get("value") || 0);
    const bags = Number(f.get("bags") || 0);
    const q = Number(f.get("quote") || 0);
    if (coffee && f.get("type") === "entrada" && f.get("category") === "Venda de café" && bags > 0 && q > 0) value = bags * q;
    if (value <= 0) return toast("Informe um valor válido.");
    farm.finances.push({ id: uid(), activity: selectedType(), type: f.get("type"), category: f.get("category"), description: f.get("description"), date: f.get("date"), value, bags: coffee ? bags : 0, quoteUsed: coffee ? q : 0, createdBy: currentUser.name, createdAt: new Date().toISOString() });
    saveData(); toast("Lançamento registrado."); after();
  };
}

function monthSeries(finances) {
  const out = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const items = finances.filter(x => String(x.date || "").startsWith(key));
    const income = items.filter(x => x.type === "entrada").reduce((s, x) => s + Number(x.value || 0), 0);
    const expense = items.filter(x => x.type === "saida").reduce((s, x) => s + Number(x.value || 0), 0);
    out.push({ label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), income, expense, profit: income - expense });
  }
  return out;
}

function renderFinancialChart(finances) {
  const rows = monthSeries(finances);
  const max = Math.max(1, ...rows.flatMap(r => [r.income, r.expense, Math.abs(r.profit)]));
  return `<div class="chart-legend"><span class="legend-item"><i class="legend-dot legend-income"></i>Entradas</span><span class="legend-item"><i class="legend-dot legend-expense"></i>Gastos</span><span class="legend-item"><i class="legend-dot legend-profit"></i>Resultado</span></div><div class="finance-chart">${rows.map(r => `<div class="month-group"><div class="month-total ${r.profit >= 0 ? "up" : "down"}" data-v="${r.profit}">${compactMoney(r.profit)}</div><div class="month-bars"><div class="bar income" style="height:${Math.max(2, r.income / max * 190)}px"><span class="bar-value">${compactMoney(r.income)}</span></div><div class="bar expense" style="height:${Math.max(2, r.expense / max * 190)}px"><span class="bar-value">${compactMoney(r.expense)}</span></div><div class="bar ${r.profit >= 0 ? "profit" : "loss"}" style="height:${Math.max(2, Math.abs(r.profit) / max * 190)}px"><span class="bar-value">${compactMoney(r.profit)}</span></div></div><div class="month-label">${r.label}</div></div>`).join("")}</div>`;
}

function renderFinanceAdmin() {
  setHeader("FINANCEIRO", "Registrar entradas e despesas");
  $("#pageContent").innerHTML = `<div class="grid two">${financeForm(true)}<div class="card soft"><span class="eyebrow dark">PERMISSÃO DO ADM</span><h2>Registrar sem visualizar o balanço.</h2><p class="muted">O saldo consolidado e o histórico completo são exclusivos do CEO.</p></div></div>`;
  bindFinanceForm(renderFinanceAdmin);
}

function renderFinanceCEO() {
  const finances = contextFinances();
  const income = finances.filter(x => x.type === "entrada").reduce((s, x) => s + Number(x.value || 0), 0);
  const expense = finances.filter(x => x.type === "saida").reduce((s, x) => s + Number(x.value || 0), 0);
  const profit = income - expense;
  setHeader("FINANCEIRO", isGeneralView() ? "Balanço geral" : "Balanço financeiro");
  $("#pageContent").innerHTML = `
    <div class="grid kpis"><button type="button" class="card finance-kpi-link" id="openFinanceEntradas"><div class="kpi-label"><span>Entradas</span><span class="kpi-icon">${ico("up")}</span></div><div class="kpi-value text-green">${money(income)}</div><div class="kpi-foot">Clique para ver somente as entradas</div></button><button type="button" class="card finance-kpi-link" id="openFinanceGastos"><div class="kpi-label"><span>Gastos</span><span class="kpi-icon">${ico("down")}</span></div><div class="kpi-value text-red">${money(expense)}</div><div class="kpi-foot">Clique para ver somente os gastos</div></button><div class="card"><div class="kpi-label"><span>Resultado</span><span class="kpi-icon">${ico("chart")}</span></div><div class="kpi-value ${profit >= 0 ? "text-green" : "text-red"}">${money(profit)}</div></div><div class="card"><div class="kpi-label"><span>Escopo</span><span class="kpi-icon">${selectedType() === "cattle" ? ico("cattle") : ico("bean")}</span></div><div class="kpi-value" style="font-size:24px">${isGeneralView() ? "Geral" : contextName()}</div></div></div>
    <div class="section-head"><div><h2>Entradas, gastos e lucro</h2><p>Últimos 6 meses.</p></div></div>
    <div class="card chart-card">${renderFinancialChart(finances)}</div>
    ${isGeneralView() ? `<div class="card soft" style="margin-top:18px"><b>Modo geral</b><p class="muted" style="margin-bottom:0">No modo geral você consulta o consolidado de todas as fazendas. Para adicionar um novo lançamento, escolha uma fazenda específica.</p></div>` : `<div class="section-head"><h2>Novo lançamento</h2></div>${financeForm(false)}`}
    ${financeHistoryBlock(finances)}`;
  bindFinanceHistory(finances);
  $("#openFinanceEntradas").onclick = () => { currentPage = "finance-entradas"; renderPage(); };
  $("#openFinanceGastos").onclick = () => { currentPage = "finance-gastos"; renderPage(); };
  if (!isGeneralView()) bindFinanceForm(renderFinanceCEO);
}

let financeFilter = { q: "", month: "", type: "", category: "" };
const normText = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function filteredFinances(list) {
  const f = financeFilter, q = normText(f.q);
  return list.filter(x => (!f.month || String(x.date || "").startsWith(f.month)) && (!f.type || x.type === f.type) && (!f.category || x.category === f.category)
    && (!q || normText(`${x.description} ${x.category} ${x.farmName} ${x.createdBy}`).includes(q)))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}
function financeTableHTML(rows) {
  if (!rows.length) return `<div class="card empty">Nenhum lançamento com esses filtros.</div>`;
  const inc = rows.filter(x => x.type === "entrada").reduce((s, x) => s + Number(x.value || 0), 0);
  const exp = rows.filter(x => x.type === "saida").reduce((s, x) => s + Number(x.value || 0), 0);
  return `<div class="filter-summary"><span>${rows.length} lançamento(s)</span><span class="text-green">Entradas ${money(inc)}</span><span class="text-red">Saídas ${money(exp)}</span><b>Resultado ${money(inc - exp)}</b></div>
  <div class="table-wrap"><table class="no-tools"><thead><tr><th>Data</th><th>Fazenda</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Lançado por</th><th></th></tr></thead><tbody>${rows.map(x => `<tr><td>${dateBR(x.date)}</td><td>${escapeHTML(x.farmName || "—")}</td><td><span class="badge ${x.type === "entrada" ? "green" : "red"}">${x.type === "entrada" ? "Entrada" : "Saída"}</span></td><td>${escapeHTML(x.description)}</td><td>${escapeHTML(x.category)}</td><td><b>${money(x.value)}</b></td><td>${escapeHTML(x.createdBy || "—")}${x.editedBy ? `<small class="subtle" style="display:block">editado por ${escapeHTML(x.editedBy)}</small>` : ""}</td><td><div class="row-actions">${x.sourcePaymentId ? `<span class="subtle">Recebimento confirmado</span>` : x.noteId ? `<span class="subtle" title="Edite ou exclua pela nota fiscal">pela nota</span>` : `<button type="button" class="btn small fin-edit" data-farm="${x.farmId}" data-id="${x.id}">Editar</button><button type="button" class="btn danger small fin-del" data-farm="${x.farmId}" data-id="${x.id}">Excluir</button>`}</div></td></tr>`).join("")}</tbody></table></div>`;
}
function financeHistoryBlock(list) {
  const cats = [...new Set(list.map(x => x.category).filter(Boolean))].sort();
  const f = financeFilter;
  return `<div class="section-head"><div><h2>Histórico de lançamentos</h2><p>Filtre por mês, tipo ou categoria. A planilha sai com o que estiver filtrado.</p></div><button class="btn small" id="finExport" type="button">Exportar planilha</button></div>
    <div class="filter-bar">
      <label>Buscar<input type="search" id="finQ" value="${escapeHTML(f.q)}" placeholder="Descrição, categoria, quem lançou…"></label>
      <label>Mês<input type="month" id="finMonth" value="${escapeHTML(f.month)}"></label>
      <label>Tipo<select id="finType"><option value="">Todos</option><option value="entrada" ${f.type === "entrada" ? "selected" : ""}>Entradas</option><option value="saida" ${f.type === "saida" ? "selected" : ""}>Saídas</option></select></label>
      <label>Categoria<select id="finCat"><option value="">Todas</option>${cats.map(c => `<option ${c === f.category ? "selected" : ""}>${escapeHTML(c)}</option>`).join("")}</select></label>
      <button type="button" class="btn small" id="finClear">Limpar filtros</button>
    </div>
    <div id="finTable">${financeTableHTML(filteredFinances(list))}</div>`;
}
function bindFinanceHistory(list) {
  const refresh = () => { $("#finTable").innerHTML = financeTableHTML(filteredFinances(list)); bindFinanceRows(); };
  $("#finQ").oninput = e => { financeFilter.q = e.target.value; refresh(); };
  $("#finMonth").onchange = e => { financeFilter.month = e.target.value; refresh(); };
  $("#finType").onchange = e => { financeFilter.type = e.target.value; refresh(); };
  $("#finCat").onchange = e => { financeFilter.category = e.target.value; refresh(); };
  $("#finClear").onclick = () => { financeFilter = { q: "", month: "", type: "", category: "" }; renderPage(); };
  $("#finExport").onclick = () => {
    const rows = filteredFinances(list);
    if (!rows.length) return toast("Nada para exportar com esses filtros.");
    downloadCSV(`lancamentos-${financeFilter.month || todayISO()}.csv`, ["Data", "Fazenda", "Tipo", "Descrição", "Categoria", "Valor (R$)", "Lançado por"],
      rows.map(x => [dateBR(x.date), x.farmName || "", x.type === "entrada" ? "Entrada" : "Saída", x.description || "", x.category || "", csvNumber(x.value), x.createdBy || ""]));
  };
  bindFinanceRows();
}
function bindFinanceRows() {
  const find = btn => { const farm = data.farms.find(f => f.id === btn.dataset.farm); return { farm, item: farm?.finances.find(x => x.id === btn.dataset.id) }; };
  $$(".fin-edit").forEach(btn => btn.onclick = async () => {
    const { item } = find(btn); if (!item) return;
    const cats = [...new Set([...financeCategories(), item.category].filter(Boolean))];
    const v = await askForm({ title: "Editar lançamento", okText: "Salvar alterações", wide: true, fields: [
      { name: "type", label: "Tipo", type: "select", value: item.type, options: [["entrada", "Entrada"], ["saida", "Saída"]] },
      { name: "category", label: "Categoria", type: "select", value: item.category, options: cats },
      { name: "description", label: "Descrição", value: item.description || "", wide: true },
      { name: "date", label: "Data", type: "date", value: item.date || todayISO(), required: true },
      { name: "value", label: "Valor (R$)", type: "number", step: "0.01", min: "0.01", value: item.value, required: true }
    ] });
    if (!v) return;
    const value = Number(v.value || 0); if (!(value > 0)) return toast("Informe um valor maior que zero.");
    Object.assign(item, { type: v.type, category: v.category, description: v.description, date: v.date, value, editedBy: currentUser.name, editedAt: new Date().toISOString() });
    saveData(); renderPage(); toast("Lançamento atualizado.");
  });
  $$(".fin-del").forEach(btn => btn.onclick = async () => {
    const { farm, item } = find(btn); if (!item) return;
    if (!(await confirmDelete(`O lançamento "${item.description || item.category}" de ${money(item.value)}`))) return;
    farm.finances = farm.finances.filter(x => x.id !== item.id);
    saveData(); renderPage(); toast("Lançamento excluído.");
  });
}

function renderFinanceFiltered(type) {
  if (!canSee("financeiro")) {
    currentPage = "dashboard";
    return renderPage();
  }

  const isIncome = type === "entrada";
  const finances = contextFinances()
    .filter(x => x.type === type)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const total = finances.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const title = isIncome ? "Entradas financeiras" : "Gastos financeiros";
  const eyebrow = isIncome ? "ENTRADAS" : "GASTOS";

  setHeader(eyebrow, title);
  $("#pageContent").innerHTML = `
    <div class="finance-filter-head">
      <button type="button" class="btn" id="backFinance">← Voltar ao balanço</button>
      <span class="badge ${isIncome ? "green" : "red"}">${isIncome ? "Somente entradas" : "Somente gastos"}</span>
    </div>

    <div class="grid two finance-filter-summary">
      <div class="card">
        <div class="kpi-label"><span>${isIncome ? "Total de entradas" : "Total de gastos"}</span><span class="kpi-icon">${ico(isIncome ? "up" : "down")}</span></div>
        <div class="kpi-value ${isIncome ? "text-green" : "text-red"}">${money(total)}</div>
        <div class="kpi-foot">${finances.length} lançamento${finances.length === 1 ? "" : "s"}</div>
      </div>
      <div class="card soft">
        <span class="eyebrow dark">ESCOPO</span>
        <h2>${escapeHTML(contextName())}</h2>
        <p class="muted">${isGeneralView() ? "Valores consolidados de todas as fazendas desta atividade." : "Valores da fazenda selecionada."}</p>
      </div>
    </div>

    <div class="section-head"><div><h2>${isIncome ? "Histórico de entradas" : "Histórico de gastos"}</h2><p>${isIncome ? "Receitas e vendas registradas." : "Despesas e saídas registradas."}</p></div></div>
    ${finances.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Fazenda</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Lançado por</th></tr></thead><tbody>${finances.map(x => `<tr><td>${dateBR(x.date)}</td><td>${escapeHTML(x.farmName || "—")}</td><td><b>${escapeHTML(x.description || "—")}</b></td><td>${escapeHTML(x.category || "—")}</td><td class="${isIncome ? "text-green" : "text-red"}"><b>${money(x.value)}</b></td><td>${escapeHTML(x.createdBy || "—")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhum ${isIncome ? "lançamento de entrada" : "gasto"} registrado neste escopo.</div>`}
  `;

  $("#backFinance").onclick = () => {
    currentPage = "financeiro";
    renderPage();
  };
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function renderNotes() {
  setHeader("DOCUMENTOS", isGeneralView() ? "Notas gerais" : "Notas fiscais");
  const notes = contextNotes();
  if (isGeneralView()) {
    $("#pageContent").innerHTML = `
      <div class="card soft"><span class="eyebrow dark">VISÃO GERAL</span><h2>${notes.length} notas</h2><p class="muted">Consulta consolidada de todas as fazendas desse tipo. Para lançar uma nota, escolha uma fazenda específica.</p></div>
      <div class="section-head"><h2>Notas salvas</h2></div>
      ${notes.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Fazenda</th><th>Nº</th><th>Tipo</th><th>Parte</th><th>Categoria</th><th>Valor</th><th>Anexo</th></tr></thead><tbody>${[...notes].reverse().map(n => `<tr><td>${dateBR(n.date)}</td><td>${escapeHTML(n.farmName)}</td><td>${escapeHTML(n.number)}</td><td>${n.noteType === "venda" ? "Venda" : "Compra"}</td><td>${escapeHTML(n.party)}</td><td>${escapeHTML(n.category)}</td><td>${money(n.value)}</td><td>${(n.fileId || n.fileData) ? fileButton(n, "Abrir") : "Sem anexo"}</td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhuma nota.</div>`}`;
    return;
  }

  const farm = activeFarm();
  $("#pageContent").innerHTML = `
    <div class="grid two"><form id="noteForm" class="form-card"><h3>Lançar nota</h3><div class="form-grid" style="margin-top:18px"><label>Tipo<select name="noteType"><option value="compra">Compra / despesa</option><option value="venda">Venda / entrada</option></select></label><label>Número<input name="number" required></label><label>Fornecedor / cliente<input name="party" required></label><label>Categoria<select name="category">${financeCategories().map(c => `<option>${c}</option>`).join("")}</select></label><label>Data<input name="date" type="date" value="${todayISO()}" required></label><label>Valor<input name="value" type="number" min="0" step="0.01" required></label><label class="wide">Observação<textarea name="description" rows="3"></textarea></label><label class="wide">Foto ou arquivo da nota (imagem/PDF até 2 MB)<input name="file" type="file" accept="image/*,application/pdf"></label><label class="wide" style="display:flex;grid-template-columns:auto 1fr;align-items:center;gap:10px"><input name="postFinance" type="checkbox" checked style="width:auto">Lançar automaticamente no financeiro</label></div><div class="form-actions"><button class="btn primary">Salvar nota</button></div></form><div class="card soft"><span class="eyebrow dark">ARQUIVO • ${farmTypeLabel().toUpperCase()}</span><h2>${notes.length} notas</h2><p class="muted">Dados sincronizados no servidor e separados por fazenda e atividade.</p></div></div>
    <div class="section-head"><h2>Notas salvas</h2></div>
    ${notes.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Nº</th><th>Tipo</th><th>Parte</th><th>Categoria</th><th>Valor</th><th>Anexo</th><th></th></tr></thead><tbody>${[...notes].reverse().map(n => `<tr><td>${dateBR(n.date)}</td><td>${escapeHTML(n.number)}</td><td>${n.noteType === "venda" ? "Venda" : "Compra"}</td><td>${escapeHTML(n.party)}</td><td>${escapeHTML(n.category)}</td><td>${money(n.value)}</td><td>${(n.fileId || n.fileData) ? fileButton(n, "Abrir") : "Sem anexo"}</td><td><button class="btn danger small note-del" data-id="${n.id}">Excluir</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhuma nota.</div>`}`;

  $("#noteForm").onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const value = Number(f.get("value") || 0);
    if (value <= 0) return toast("Informe o valor.");
    const file = e.target.elements.file.files[0];
    let fileId = "", fileName = "", fileType = "";
    if (file) {
      if (file.size > 2 * 1024 * 1024) return toast("O anexo precisa ter no máximo 2 MB.");
      const btn = e.submitter; if (btn) { btn.disabled = true; btn.textContent = "Enviando anexo…"; }
      try { const up = await uploadFile(file); fileId = up.fileId; fileName = up.name; fileType = up.type; }
      catch (err) { if (btn) { btn.disabled = false; btn.textContent = "Salvar nota"; } return toast(err.message || "Não foi possível enviar o arquivo."); }
    }
    const note = { id: uid(), activity: selectedType(), noteType: f.get("noteType"), number: f.get("number"), party: f.get("party"), category: f.get("category"), date: f.get("date"), value, description: f.get("description"), fileId, fileName, fileType, createdBy: currentUser.name };
    farm.notes.push(note);
    if (f.get("postFinance")) {
      farm.finances.push({ id: uid(), activity: selectedType(), type: note.noteType === "venda" ? "entrada" : "saida", category: note.category, description: `Nota ${note.number} • ${note.party}`, date: note.date, value, noteId: note.id, createdBy: currentUser.name });
    }
    saveData(); renderNotes(); toast("Nota salva.");
  };

  $$(".note-del").forEach(btn => btn.onclick = async () => {
    const note = farm.notes.find(n => n.id === btn.dataset.id);
    if (!note || !(await confirmDelete(`A nota ${note.number || ""}`.trim(), "O lançamento financeiro ligado a ela também sai do balanço"))) return;
    farm.notes = farm.notes.filter(n => n.id !== btn.dataset.id);
    farm.finances = farm.finances.filter(fin => fin.noteId !== btn.dataset.id);
    saveData(); renderNotes();
  });
}

function renderFarms() {
  if (currentUser.role !== "ceo") return;
  setHeader("ESTRUTURA", "Fazendas");
  const modeName = farmTypeLabel();
  $("#pageContent").innerHTML = `
    <div class="grid two"><form id="newFarmForm" class="form-card"><div class="inline"><h3>Criar nova fazenda</h3><span class="badge gold right">Somente CEO</span></div><div class="form-grid" style="margin-top:18px"><label class="wide">Nome<input name="name" required placeholder="Nome da fazenda"></label></div><div class="form-actions"><button class="btn primary">Criar fazenda</button></div></form><div class="card soft"><span class="eyebrow dark">ESTRUTURA</span><h2>${data.farms.length} fazendas</h2><p class="muted">Todas as fazendas possuem os três módulos: Café, Gado e Grãos. Escolha a atividade no menu para mudar a operação visível.</p><div class="inline" style="margin-top:14px"><span class="badge green">Café</span><span class="badge gold">Gado</span><span class="badge">Grãos</span><span class="badge">Interface atual: ${modeName}</span></div></div></div>
    <div class="section-head"><h2>Fazendas cadastradas</h2></div>
    <div class="grid two">${data.farms.map(f => `<form class="form-card farm-edit" data-id="${f.id}"><div class="inline"><span class="badge green">Café</span><span class="badge gold">Gado</span><span class="badge">Grãos</span>${f.id === activeFarmId ? `<span class="badge">Ativa</span>` : ""}</div><label>Nome<input name="name" value="${escapeHTML(f.name)}" required></label><div class="form-actions">${selectedType() !== "cattle" ? `<button type="button" class="btn farm-plots" data-id="${f.id}">Gerenciar talhões</button>` : ""}<button type="button" class="btn danger farm-delete" data-id="${f.id}">Excluir</button><button class="btn primary">Salvar alterações</button></div></form>`).join("")}</div>`;

  $("#newFarmForm").onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const name = String(f.get("name") || "").trim();
    if (!name) return toast("Informe o nome da fazenda.");
    const limits = currentPlanLimits();
    if (Number.isFinite(limits.maxFarms) && data.farms.length >= limits.maxFarms) return toast(`Seu plano ${limits.name} permite até ${limits.maxFarms} fazenda${limits.maxFarms === 1 ? "" : "s"}.`);
    const farm = newFarm(name);
    data.farms.push(farm);
    activeFarmId = farm.id;
    saveData(); renderFarmSelector(); renderFarms(); toast("Fazenda criada.");
  };
  $$(".farm-edit").forEach(form => form.onsubmit = e => {
    e.preventDefault();
    const farm = data.farms.find(x => x.id === form.dataset.id);
    if (!farm) return;
    const f = new FormData(form);
    farm.name = String(f.get("name") || "").trim() || farm.name;
    saveData(); renderFarmSelector(); renderFarms(); toast("Fazenda atualizada.");
  });
  $$(".farm-plots").forEach(btn => btn.onclick = () => {
    const farm = data.farms.find(f => f.id === btn.dataset.id);
    if (!farm || selectedType() === "cattle") return;
    activeFarmId = farm.id;
    localStorage.setItem(activeFarmStorageKey(currentUser), activeFarmId);
    currentPage = "talhoes";
    renderFarmSelector();
    renderNav();
    renderPage();
  });
  $$(".farm-delete").forEach(btn => btn.onclick = async () => {
    if (data.farms.length <= 1) return toast("É necessário manter pelo menos uma fazenda.");
    const farm = data.farms.find(x => x.id === btn.dataset.id);
    if (!farm) return;
    if((farm.agriculture?.cycles||[]).length||(farm.cattle?.lots||[]).length||Object.values(farm.operations||{}).some(rows=>Array.isArray(rows)&&rows.length))return toast('Esta fazenda possui produção ou histórico. Preserve seus registros.');
    if (!await confirmDelete(`A fazenda ${farm.name}`, "Todos os dados de Café, Gado e Grãos dela também serão apagados")) return;
    data.farms = data.farms.filter(x => x.id !== farm.id);
    data.receipts = data.receipts.filter(r => r.farmId !== farm.id);
    data.users.forEach(u => { if (u.role === "contribuinte" && u.allowedFarmId === farm.id) u.allowedFarmId = data.farms[0]?.id || ""; });
    if (activeFarmId === farm.id) activeFarmId = data.farms[0].id;
    saveData(); renderFarmSelector(); renderFarms(); toast("Fazenda excluída.");
  });
}

function renderUsers() {
  if (currentUser.role !== "ceo") return;
  setHeader("ACESSOS", "Usuários e perfis");
  const farmOptions = (selected = "") => data.farms.map(f => `<option value="${f.id}" ${f.id === selected ? "selected" : ""}>${escapeHTML(f.name)} • Café + Gado + Grãos</option>`).join("");
  const functionOptions = (selected = "Campo") => `<option value="Tratorista" ${selected === "Tratorista" ? "selected" : ""}>Tratorista</option><option value="Campo" ${selected === "Campo" ? "selected" : ""}>Campo</option><option value="Fiscal de colheita" ${selected === "Fiscal de colheita" ? "selected" : ""}>Fiscal de colheita</option>`;
  const activityOptions = ruralActivityOptions;
  $("#pageContent").innerHTML = `
    <div class="grid two"><form id="userForm" class="form-card"><div class="inline"><h3>Criar login</h3><span class="badge gold right">Somente CEO</span></div><div class="form-grid" style="margin-top:18px"><label>Nome<input name="name" required></label><label>E-mail<input name="email" type="email" required></label><label id="newUserFunctionWrap">Função<select name="function" id="newUserFunction" required><option value="">Selecione</option><option value="Tratorista">Tratorista</option><option value="Campo">Campo</option><option value="Fiscal de colheita">Fiscal de colheita</option></select></label><label>Chave PIX (opcional)<input name="pixKey"></label><label>Usuário<input name="username" required></label><label>Senha inicial<input name="password" type="password" minlength="8" required></label><label>Perfil<select name="role" id="newUserRole"><option value="contribuinte">Contribuinte</option><option value="adm">Administrador</option><option value="ceo">CEO</option></select></label><label id="newUserFarmWrap">Fazenda permitida<select name="allowedFarmId">${farmOptions(data.farms[0]?.id || "")}</select></label><label id="newUserActivityWrap">Atividade permitida<select name="allowedActivity" id="newUserActivity">${ruralActivityOptions("both")}</select></label></div><div class="form-actions"><button class="btn primary">Criar login</button></div></form><div class="card soft"><span class="eyebrow dark">PERFIL DE ACESSO</span><h2>${data.users.filter(u => u.active !== false).length} ativos</h2><p class="muted">Para contribuinte, a função é obrigatória: Tratorista ou Campo. Cada contribuinte fica vinculado a uma única fazenda.</p></div></div>
    <div class="section-head"><h2>Solicitações pendentes</h2></div>
    ${data.pendingRegistrations.length ? `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Função</th><th>PIX</th><th>Fazenda ao aprovar</th><th>Atividade</th><th>Ações</th></tr></thead><tbody>${data.pendingRegistrations.map(r => `<tr><td><b>${escapeHTML(r.name)}</b></td><td>${escapeHTML(r.username)}</td><td>${escapeHTML(r.email || "—")}</td><td>${ROLE_NAMES[r.role]}</td><td>${escapeHTML(r.function || "—")}</td><td>${escapeHTML(r.pixKey || "—")}</td><td>${r.role === "contribuinte" ? `<select class="reg-farm" data-id="${r.id}" style="min-width:180px">${farmOptions(data.farms[0]?.id || "")}</select>` : "Todas"}</td><td>${r.role === "contribuinte" ? `<select class="reg-activity" data-id="${r.id}" style="min-width:130px">${activityOptions(r.allowedActivity || "both")}</select>` : "Café + Gado + Grãos"}</td><td><div class="inline"><button class="btn small reg-approve" data-id="${r.id}">Aceitar</button><button class="btn danger small reg-reject" data-id="${r.id}">Recusar</button></div></td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhuma solicitação pendente.</div>`}
    <div class="section-head"><div><h2>Usuários cadastrados</h2><p>Altere a função e a fazenda dos contribuidores diretamente aqui.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Função</th><th>PIX</th><th>Atividade</th><th>Fazenda do perfil</th><th>Status</th><th>Ações</th></tr></thead><tbody>${data.users.map(u => `<tr><td><b>${escapeHTML(u.name)}</b>${u.id === currentUser.id ? ' <span class="badge gold">Você</span>' : ""}</td><td>${escapeHTML(u.username)}</td><td>${escapeHTML(u.email || "—")}</td><td>${ROLE_NAMES[u.role]}</td><td>${u.role === "contribuinte" ? `<select class="user-function" data-id="${u.id}" style="min-width:130px">${functionOptions(u.function)}</select>` : escapeHTML(u.function || "—")}</td><td>${escapeHTML(u.pixKey || "��")}</td><td>${u.role === "contribuinte" ? `<select class="user-activity" data-id="${u.id}" style="min-width:130px">${activityOptions(u.allowedActivity || "both")}</select>` : "Café + Gado + Grãos"}</td><td>${u.role === "contribuinte" ? `<select class="user-farm" data-id="${u.id}" style="min-width:180px">${farmOptions(u.allowedFarmId)}</select>` : '<span class="badge">Todas as fazendas</span>'}</td><td><span class="badge ${u.active !== false ? "green" : "red"}">${u.active !== false ? "Ativo" : "Bloqueado"}</span></td><td><div class="inline"><button class="btn small user-pass" data-id="${u.id}">Senha</button><button class="btn small user-toggle" data-id="${u.id}">${u.active !== false ? "Desativar" : "Ativar"}</button><button class="btn danger small user-del" data-id="${u.id}">Excluir</button></div></td></tr>`).join("")}</tbody></table></div>`;

  const roleSelect = $("#newUserRole");
  const farmWrap = $("#newUserFarmWrap");
  const activityWrap = $("#newUserActivityWrap");
  const functionWrap = $("#newUserFunctionWrap");
  const functionSelect = $("#newUserFunction");
  const syncNewUserFields = () => {
    const contributor = roleSelect.value === "contribuinte";
    farmWrap.classList.toggle("hidden", !contributor);
    activityWrap.classList.toggle("hidden", !contributor);
    functionWrap.classList.toggle("hidden", !contributor);
    functionSelect.disabled = !contributor;
    functionSelect.required = contributor;
  };
  roleSelect.onchange = syncNewUserFields; syncNewUserFields();

  $("#userForm").onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); createUser(Object.fromEntries(f.entries()), renderUsers); };
  $$(".reg-approve").forEach(btn => btn.onclick = () => { const farmSelect = document.querySelector(`.reg-farm[data-id="${btn.dataset.id}"]`); const activitySelect = document.querySelector(`.reg-activity[data-id="${btn.dataset.id}"]`); approveRegistration(btn.dataset.id, farmSelect?.value || "", activitySelect?.value || "both"); });
  $$(".reg-reject").forEach(btn => btn.onclick = () => rejectRegistration(btn.dataset.id));
  $$(".user-function").forEach(sel => sel.onchange = () => { const user = data.users.find(x => x.id === sel.dataset.id); if (!user || user.role !== "contribuinte") return; user.function = sel.value; saveData(); toast("Função atualizada."); });
  $$(".user-activity").forEach(sel => sel.onchange = () => { const user = data.users.find(x => x.id === sel.dataset.id); if (!user || user.role !== "contribuinte") return; user.allowedActivity = sel.value; localStorage.setItem(`fazendaModo:${currentGroup?.slug || "grupo"}:${user.username}`, RuralDomain.activitiesFor(sel.value).filter(a=>SubscriptionDomain.licensed(data).includes(a))[0] || "coffee"); saveData(); toast("Atividade do perfil atualizada."); });
  $$(".user-farm").forEach(sel => sel.onchange = () => { const user = data.users.find(x => x.id === sel.dataset.id); if (!user || user.role !== "contribuinte") return; const oldFarmId = user.allowedFarmId; const limits = currentPlanLimits(); if (contributorsOnFarm(sel.value, user.id) >= limits.usersPerFarm) { sel.value = oldFarmId; return toast(`Limite de ${limits.usersPerFarm} usuários por fazenda atingido neste plano.`); } user.allowedFarmId = sel.value; saveData(); toast("Fazenda do perfil atualizada."); });
  $$(".user-pass").forEach(btn => btn.onclick = async () => { const user = data.users.find(x => x.id === btn.dataset.id); if (!user) return; if (String(user.id) === String(currentUser.id)) return changeOwnPassword(); const v = await askForm({ title: `Senha temporária para ${user.name}`, text: `As sessões antigas serão encerradas e ${user.name} terá que trocar a senha no próximo acesso.`, okText: "Definir senha", fields: [{ name: "p", label: "Nova senha temporária", type: "password", required: true, minlength: 8, autocomplete: "new-password", autofocus: true, hint: "Mínimo de 8 caracteres." }] }); if (!v) return; try { const r = await api(`/api/users/${encodeURIComponent(user.id)}/password`, { method: "PATCH", body: JSON.stringify({ password: v.p }) }); replaceData(adoptServerPayload(r)); afterServerUpdate(true); toast(r.message || "Senha redefinida."); } catch (e) { toast(e.message); } });
  $$(".user-toggle").forEach(btn => btn.onclick = () => { const user = data.users.find(x => x.id === btn.dataset.id); if (user.id === currentUser.id) return toast("Você não pode desativar seu próprio acesso."); if (user.role === "ceo" && user.active !== false && data.users.filter(x => x.role === "ceo" && x.active !== false).length <= 1) return toast("Mantenha pelo menos um CEO ativo."); user.active = user.active === false; saveData(); renderUsers(); });
  $$(".user-del").forEach(btn => btn.onclick = async () => { const user = data.users.find(x => x.id === btn.dataset.id); if (user.id === currentUser.id) return toast("Você não pode excluir seu próprio acesso."); if (user.role === "ceo" && user.active !== false && data.users.filter(x => x.role === "ceo" && x.active !== false).length <= 1) return toast("Mantenha pelo menos um CEO ativo."); if (!await confirmDelete(`O acesso de ${user.name}`, "Os comprovantes dessa pessoa também serão apagados")) return; data.users = data.users.filter(x => x.id !== user.id); data.receipts = data.receipts.filter(r => r.userId !== user.id); saveData(); renderUsers(); });
}

function equipmentLogsInContext() {
  if (isGeneralView()) {
    return data.farms.flatMap(f => (f.equipmentLogs || []).map(log => ({ ...log, farmName: f.name, farmId: f.id })));
  }
  const farm = activeFarm();
  if (!farm) return [];
  return (farm.equipmentLogs || []).map(log => ({ ...log, farmName: farm.name, farmId: farm.id }));
}

function usageBar(used, max) {
  const pct = max ? Math.min(100, Math.round(used / max * 100)) : 0;
  return `<div class="usage"><div class="usage-bar ${max && used >= max ? "full" : ""}"><i style="width:${max ? pct : 6}%"></i></div><span>${used}${max ? ` de ${max}` : " (ilimitado)"}</span></div>`;
}
async function loadAccountBox() {
  const box = $("#accountBox"); if (!box) return;
  try {
    const a = await api("/api/account");
    const p = a.plan, u = a.usage;
    const req = a.planRequest;
    box.innerHTML = `<div class="account-head"><div><span class="eyebrow dark">PLANO ATUAL</span><h2>${escapeHTML(p.name)}</h2><p class="muted">${a.billing ? `${escapeHTML(a.billing.cycleLabel)} • ${money(a.billing.amount)} por período • cobrança em ${escapeHTML(a.billing.email)}` : `Valores a definir`}</p></div>
      <button type="button" class="btn" id="planChangeBtn">${req ? "Alterar pedido" : "Mudar de plano"}</button></div>
      ${req ? `<div class="notice">Você pediu a mudança para o plano <b>${escapeHTML(req.planName)}</b> em ${new Date(req.at).toLocaleDateString("pt-BR")}. Vamos aplicar e avisar por e-mail. <button type="button" class="link-btn" id="planCancelBtn">Cancelar pedido</button></div>` : ""}
      <div class="usage-grid">
        <div><b>Fazendas</b>${usageBar(u.farms, p.maxFarms)}</div>
        ${u.perFarm.map(f => `<div><b>Usuários de campo • ${escapeHTML(f.name)}</b>${usageBar(f.contributors, p.usersPerFarm)}</div>`).join("")}
      </div>
      <p class="subtle" style="margin:14px 0 0">CEO e administradores não contam no limite. O limite é de usuários de campo (tratoristas e campo) por fazenda.</p>`;
    $("#planChangeBtn").onclick = async () => {
      const v = await askForm({ title: "Mudar de plano", text: "Escolha o plano novo. A mudança é aplicada pela equipe da Gestão Rural e a cobrança é ajustada no próximo período.", okText: "Enviar pedido", fields: [
        { name: "plan", label: "Plano", type: "select", value: req?.plan || "", options: a.plans.filter(x => x.id !== a.group.plan).map(x => [x.id, `${x.name} • Valor a definir • ${x.maxFarms ? `até ${x.maxFarms} fazenda${x.maxFarms > 1 ? "s" : ""}` : "fazendas ilimitadas"}`]) },
        { name: "note", label: "Observação (opcional)", type: "textarea", value: req?.note || "" }
      ] });
      if (!v) return;
      try { await api("/api/account/plan-request", { method: "POST", body: JSON.stringify(v) }); toast("Pedido enviado."); loadAccountBox(); } catch (e) { toast(e.message); }
    };
    const cancel = $("#planCancelBtn");
    if (cancel) cancel.onclick = async () => { try { await api("/api/account/plan-request", { method: "DELETE" }); loadAccountBox(); } catch (e) { toast(e.message); } };
  } catch (e) { box.innerHTML = `<p class="muted">Não foi possível carregar a assinatura agora.</p>`; }
}

function renderAudit() {
  setHeader("CONTROLE", "Histórico de alterações");
  const list = [...(data.audit || [])].reverse();
  const actionClass = a => a === "excluiu" ? "red" : a === "adicionou" || a === "criou" || a === "aprovou" ? "green" : "gold";
  $("#pageContent").innerHTML = `
    <div class="card soft"><span class="eyebrow dark">QUEM MUDOU O QUÊ</span><h2>${list.length} registro${list.length === 1 ? "" : "s"}</h2><p class="muted">Cada inclusão, alteração ou exclusão feita por você ou pela equipe fica registrada aqui, com data e nome. Visível só para o CEO.</p></div>
    <div class="section-head"><h2>Registros</h2></div>
    ${list.length ? `<div class="table-wrap"><table data-date-col="0"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Área</th><th>Item</th><th>Fazenda</th></tr></thead><tbody>${list.map(e => `<tr><td>${new Date(e.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td><td><b>${escapeHTML(e.user)}</b></td><td><span class="badge ${actionClass(e.action)}">${escapeHTML(e.action)}</span></td><td>${escapeHTML(e.area)}</td><td>${escapeHTML(e.label || "—")}</td><td>${escapeHTML(e.farm || "—")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Ainda não há registros. Eles começam a aparecer a partir desta versão.</div>`}`;
}

// ---------- Busca e planilha em qualquer tabela ----------
const tableQueries = {};
// Telas redesenhadas por qualquer caminho ganham busca e exportação automaticamente.
new MutationObserver(() => { cancelAnimationFrame(window.__tablesRaf); window.__tablesRaf = requestAnimationFrame(enhanceTables); })
  .observe(document.getElementById("pageContent") || document.body, { childList: true });
function cellText(td) {
  const sel = td.querySelector("select");
  if (sel) return sel.options[sel.selectedIndex]?.text || "";
  const inp = td.querySelector("input");
  if (inp) return inp.value;
  return td.innerText.replace(/\s+/g, " ").trim();
}
function enhanceTables() {
  const pageName = ($("#pageTitle")?.textContent || "lista").trim();
  $$("#pageContent .table-wrap").forEach((wrap, index) => {
    const table = wrap.querySelector("table");
    if (!table || table.classList.contains("no-tools") || wrap.previousElementSibling?.classList.contains("table-tools")) return;
    const rows = [...table.tBodies[0]?.rows || []];
    if (rows.length < 4) return;
    const key = `${currentPage}:${index}`;
    const heads = [...table.tHead.rows[0].cells].map(th => th.innerText.trim());
    const useCols = heads.map((h, i) => h && !/^(ações|acoes)$/i.test(h) && !rows.every(r => r.cells[i] && !cellText(r.cells[i]).replace(/excluir|editar|abrir/gi, "").trim()));
    const tools = document.createElement("div");
    tools.className = "table-tools";
    tools.innerHTML = `<label class="search"><span class="sr-only">Buscar nesta lista</span><input type="search" placeholder="Buscar nesta lista…" value="${escapeHTML(tableQueries[key] || "")}"></label><span class="count" aria-live="polite"></span><button type="button" class="btn small">Exportar planilha</button>`;
    wrap.before(tools);
    const input = tools.querySelector("input"), count = tools.querySelector(".count");
    const apply = () => {
      const q = normText(input.value); tableQueries[key] = input.value;
      let shown = 0;
      rows.forEach(r => { const hit = !q || normText(r.innerText).includes(q); r.hidden = !hit; if (hit) shown++; });
      count.textContent = q ? `${shown} de ${rows.length}` : `${rows.length} itens`;
    };
    input.oninput = apply; apply();
    tools.querySelector("button").onclick = () => {
      const visible = rows.filter(r => !r.hidden);
      downloadCSV(`${normText(pageName).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lista"}-${todayISO()}.csv`,
        heads.filter((_, i) => useCols[i]), visible.map(r => [...r.cells].filter((_, i) => useCols[i]).map(cellText)));
    };
  });
}

function renderEquipmentLog() {
  if (!canSee("log-equipamentos")) return;
  setHeader("HISTÓRICO", "Log equipamentos");
  const logs = equipmentLogsInContext().sort((a, b) => String(b.loggedAt || b.date || "").localeCompare(String(a.loggedAt || a.date || "")));
  const coffeeFarms = data.farms;
  if (selectedType() === "cattle") {
    $("#pageContent").innerHTML = `<div class="card soft"><span class="eyebrow dark">LOG DE EQUIPAMENTOS</span><h2>Disponível para fazendas de café</h2><p class="muted">Selecione uma fazenda de café ou a opção Geral • Café para consultar o histórico de responsáveis.</p></div>`;
    return;
  }
  $("#pageContent").innerHTML = `
    <div class="grid kpis"><div class="card"><div class="kpi-label"><span>Registros</span></div><div class="kpi-value">${logs.length}</div><div class="kpi-foot">responsabilidades salvas</div></div><div class="card"><div class="kpi-label"><span>Contribuintes</span></div><div class="kpi-value">${new Set(logs.map(l => l.user)).size}</div><div class="kpi-foot">pessoas no histórico</div></div><div class="card"><div class="kpi-label"><span>Fazendas de café</span></div><div class="kpi-value">${coffeeFarms.length}</div><div class="kpi-foot">disponíveis no sistema</div></div></div>
    <div class="section-head"><div><h2>Histórico de responsabilidade</h2><p>Cada confirmação ou troca gera um registro permanente, incluindo os talhões selecionados.</p></div></div>
    ${logs.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Fazenda</th><th>Contribuinte</th><th>Função</th><th>Atividade</th><th>Talhão(ões)</th><th>Trator</th><th>Implemento</th><th>Registrado em</th></tr></thead><tbody>${logs.map(log => { const fn = log.userFunction || data.users.find(u => u.username === log.user)?.function || "Campo"; const plots = (log.talhaoNames || []).join(", ") || "—"; return `<tr><td>${dateBR(log.date)}</td><td>${escapeHTML(log.farmName || "—")}</td><td><b>${escapeHTML(log.userName || log.user || "—")}</b></td><td>${escapeHTML(fn)}</td><td>${escapeHTML(log.activity || "—")}</td><td>${escapeHTML(plots)}</td><td>${escapeHTML(log.tractorName || "—")}</td><td>${escapeHTML(log.implementName || "—")}</td><td>${log.loggedAt ? new Date(log.loggedAt).toLocaleString("pt-BR") : "—"}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="card empty">Ainda não há registros. Eles aparecerão quando um contribuinte confirmar o trabalho do dia.</div>`}`;
}

function renderProfile() {
  setHeader("CONTA", "Perfil");
  const assignedFarm = currentUser.role === "contribuinte" ? data.farms.find(f => f.id === currentUser.allowedFarmId) : null;
  const farmOptions = (selected = "") => data.farms.map(f => `<option value="${f.id}" ${f.id === selected ? "selected" : ""}>${escapeHTML(f.name)} • Café + Gado + Grãos</option>`).join("");
  const functionOptions = (selected = "Campo") => `<option value="Tratorista" ${selected === "Tratorista" ? "selected" : ""}>Tratorista</option><option value="Campo" ${selected === "Campo" ? "selected" : ""}>Campo</option><option value="Fiscal de colheita" ${selected === "Fiscal de colheita" ? "selected" : ""}>Fiscal de colheita</option>`;
  const activityOptions = ruralActivityOptions;
  const contributors = data.users.filter(u => u.role === "contribuinte");
  const ceoAccessManager = currentUser.role === "ceo" ? `
    <div class="section-head"><div><h2>Perfis dos contribuidores</h2><p>Defina a função e a única fazenda que cada contribuinte poderá visualizar.</p></div></div>
    ${contributors.length ? `<div class="table-wrap"><table><thead><tr><th>Contribuinte</th><th>Usuário</th><th>Função</th><th>Atividade</th><th>Fazenda liberada</th><th>Status</th></tr></thead><tbody>${contributors.map(u => `<tr><td><b>${escapeHTML(u.name)}</b></td><td>${escapeHTML(u.username)}</td><td><select class="profile-user-function" data-id="${u.id}" style="min-width:135px">${functionOptions(u.function)}</select></td><td><select class="profile-user-activity" data-id="${u.id}" style="min-width:135px">${activityOptions(u.allowedActivity || "both")}</select></td><td><select class="profile-user-farm" data-id="${u.id}" style="min-width:210px">${farmOptions(u.allowedFarmId)}</select></td><td><span class="badge ${u.active !== false ? "green" : "red"}">${u.active !== false ? "Ativo" : "Bloqueado"}</span></td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhum contribuinte cadastrado.</div>`}` : "";

  const functionField = currentUser.role === "contribuinte"
    ? `<label>Função<select name="function" required>${functionOptions(currentUser.function)}</select></label>`
    : `<label>Função<input name="function" value="${escapeHTML(currentUser.function || "")}"></label>`;

  $("#pageContent").innerHTML = `
    <div class="grid two"><form id="profileForm" class="form-card"><div class="inline"><h3>Meus dados</h3><span class="badge right">${ROLE_NAMES[currentUser.role]}</span></div><div class="form-grid" style="margin-top:18px"><label>Nome<input name="name" value="${escapeHTML(currentUser.name || "")}" required></label><label>E-mail<input value="${escapeHTML(currentUser.email || "")}" disabled></label><label>Usuário<input value="${escapeHTML(currentUser.username || "")}" disabled></label>${functionField}<label>Chave PIX<input name="pixKey" value="${escapeHTML(currentUser.pixKey || "")}" placeholder="Opcional"></label>${currentUser.role === "contribuinte" ? `<label>Atividade permitida<input value="${ruralPermissionLabel(currentUser.allowedActivity)}" disabled></label><label>Fazenda liberada<input value="${escapeHTML(assignedFarm?.name || "Nenhuma fazenda definida")}" disabled></label>` : `<label class="wide">Acesso às fazendas<input value="Todas as fazendas" disabled></label>`}</div><div class="form-actions"><button class="btn primary">Salvar perfil</button></div></form><div class="card soft"><span class="eyebrow dark">ACESSO</span><h2>${currentUser.role === "contribuinte" ? escapeHTML(assignedFarm?.name || "Sem fazenda") : "Acesso geral"}</h2><p class="muted">${currentUser.role === "contribuinte" ? "A fazenda do seu acesso só pode ser alterada pelo CEO." : "Seu perfil pode acessar as fazendas conforme as permissões do cargo."}</p></div></div>
    <div class="section-head"><div><h2>Segurança</h2><p>Senha e e-mail de recuperação exigem confirmação da sua senha atual.</p></div><div class="inline"><button type="button" class="btn" id="logoutOthersBtn">Sair dos outros aparelhos</button><button type="button" class="btn" id="changeEmailBtn">Alterar e-mail</button><button type="button" class="btn" id="changePassBtn">Trocar minha senha</button></div></div>
    ${currentUser.role === "ceo" ? `<div class="section-head"><div><h2>Minha assinatura</h2><p>Plano do Grupo, limites e quanto já está em uso.</p></div></div><div id="accountBox" class="card"><p class="muted">Carregando…</p></div>` : ""}
    ${ceoAccessManager}`;

  $("#changePassBtn").onclick = changeOwnPassword;
  $("#logoutOthersBtn").onclick = async () => {
    if (!await ask("Encerrar todas as outras sessões deste usuário? Este aparelho continuará conectado.", { title: "Outros aparelhos", okText: "Encerrar sessões" })) return;
    try { const r = await api("/api/auth/logout-others", { method: "POST" }); cloudToken = r.token; sessionStorage.setItem("gestaoRuralToken", cloudToken); toast(r.message || "Outros aparelhos desconectados."); } catch (e) { toast(e.message); }
  };
  $("#changeEmailBtn").onclick = async () => {
    const v = await askForm({ title: "Alterar e-mail", text: "Esse e-mail é usado para recuperar sua senha.", okText: "Alterar e-mail", fields: [
      { name: "newEmail", label: "Novo e-mail", type: "email", required: true, value: currentUser.email || "", autofocus: true },
      { name: "currentPassword", label: "Senha atual", type: "password", required: true, autocomplete: "current-password" }
    ] });
    if (!v) return;
    try { const r = await api("/api/account/email", { method: "PATCH", body: JSON.stringify(v) }); replaceData(adoptServerPayload(r)); currentUser = data.users.find(u => u.id === currentUser.id) || currentUser; afterServerUpdate(true); toast("E-mail alterado."); } catch (e) { toast(e.message); }
  };
  if (currentUser.role === "ceo") loadAccountBox();
  $("#profileForm").onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const fn = String(f.get("function") || "").trim();
    if (currentUser.role === "contribuinte" && !["Tratorista", "Campo", "Fiscal de colheita"].includes(fn)) return toast("Selecione Tratorista, Campo ou Fiscal de colheita.");
    currentUser.name = String(f.get("name") || "").trim();
    currentUser.function = fn;
    currentUser.pixKey = String(f.get("pixKey") || "").trim();
    saveData();
    $("#userName").textContent = currentUser.name;
    $("#userAvatar").textContent = currentUser.name?.[0]?.toUpperCase() || "U";
    toast("Perfil atualizado.");
    renderProfile();
  };
  $$(".profile-user-function").forEach(sel => sel.onchange = () => { const user = data.users.find(u => u.id === sel.dataset.id); if (!user || user.role !== "contribuinte") return; user.function = sel.value; saveData(); toast(`Função de ${user.name} atualizada.`); });
  $$(".profile-user-activity").forEach(sel => sel.onchange = () => { const user = data.users.find(u => u.id === sel.dataset.id); if (!user || user.role !== "contribuinte") return; user.allowedActivity = sel.value; localStorage.setItem(`fazendaModo:${currentGroup?.slug || "grupo"}:${user.username}`, RuralDomain.activitiesFor(sel.value).filter(a=>SubscriptionDomain.licensed(data).includes(a))[0] || "coffee"); saveData(); toast(`Atividade de ${user.name} atualizada.`); });
  $$(".profile-user-farm").forEach(sel => sel.onchange = () => { const user = data.users.find(u => u.id === sel.dataset.id); if (!user || user.role !== "contribuinte") return; user.allowedFarmId = sel.value; saveData(); toast(`Fazenda de ${user.name} atualizada.`); });
}

function renderPayments() {
  if (currentUser.role !== "ceo") return;
  setHeader("PAGAMENTOS", "Comprovantes por usuário");
  const contributors = data.users.filter(u => u.role === "contribuinte" && u.active !== false);
  $("#pageContent").innerHTML = `
    <div class="grid two"><form id="paymentForm" class="form-card"><div class="inline"><h3>Enviar comprovante</h3><span class="badge gold right">Somente CEO</span></div><div class="form-grid" style="margin-top:18px"><label>Nome do recebedor<input name="recipientName" id="paymentRecipientName" required placeholder="Digite o nome"></label><label>Usuário cadastrado (opcional)<select name="userId" id="paymentUser"><option value="">Não vincular a um usuário</option>${contributors.map(u => `<option value="${u.id}">${escapeHTML(u.name)} • ${escapeHTML(u.function || "Contribuinte")}</option>`).join("")}</select></label><label>Fazenda<select name="farmId">${data.farms.map(f => `<option value="${f.id}" ${f.id === activeFarm()?.id ? "selected" : ""}>${escapeHTML(f.name)}</option>`).join("")}</select></label><label>Data<input name="date" type="date" value="${todayISO()}" required></label><label>Valor (R$)<input name="amount" type="number" min="0" step="0.01" required></label><label class="wide">Descrição<input name="description" required placeholder="Ex.: pagamento semanal, diária, serviço..."></label><div id="paymentRecipientInfo" class="wide card soft"><b>Dados do recebedor</b><p class="subtle" style="margin-bottom:0">Você pode apenas escrever o nome ou vincular a um usuário. Se vincular, o comprovante aparece na conta dele.</p></div><label class="wide">Comprovante (PDF ou imagem, até 2 MB)<input name="file" type="file" accept="application/pdf,image/*"></label></div><div class="form-actions"><button class="btn primary">Salvar comprovante</button></div></form><div class="card soft"><span class="eyebrow dark">PRIVACIDADE</span><h2>${data.receipts.length} comprovantes</h2><p class="muted">Com usuário vinculado, o contribuinte recebe o comprovante na conta. Sem usuário, o registro fica apenas para o CEO.</p></div></div>
    <div class="section-head"><h2>Comprovantes enviados</h2></div>
    ${data.receipts.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Recebedor</th><th>Usuário vinculado</th><th>Fazenda</th><th>Descrição</th><th>Valor</th><th>Arquivo</th><th></th></tr></thead><tbody>${[...data.receipts].reverse().map(r => { const u = data.users.find(x => x.id === r.userId); const f = data.farms.find(x => x.id === r.farmId); const recipient = r.recipientName || u?.name || "—"; return `<tr><td>${dateBR(r.date)}</td><td><b>${escapeHTML(recipient)}</b></td><td>${u ? escapeHTML(u.username) : "Não vinculado"}</td><td>${escapeHTML(f?.name || "—")}</td><td>${escapeHTML(r.description)}</td><td>${money(r.amount)}</td><td>${(r.fileId || r.fileData) ? fileButton(r, "Abrir") : "Sem arquivo"}</td><td><button class="btn danger small receipt-del" data-id="${r.id}">Excluir</button></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="card empty">Nenhum comprovante enviado.</div>`}`;

  const paymentUser = $("#paymentUser");
  const paymentRecipientName = $("#paymentRecipientName");
  const syncRecipient = () => {
    const u = data.users.find(x => x.id === paymentUser.value);
    if (u) {
      paymentRecipientName.value = u.name;
      $("#paymentRecipientInfo").innerHTML = `<b>${escapeHTML(u.name)}</b><p class="subtle" style="margin:6px 0 0">Função: ${escapeHTML(u.function || "Não informada")} • PIX: ${escapeHTML(u.pixKey || "Não informado")} • O comprovante será enviado para este usuário.</p>`;
    } else {
      $("#paymentRecipientInfo").innerHTML = `<b>Recebedor manual</b><p class="subtle" style="margin:6px 0 0">Digite o nome acima. Sem um usuário vinculado, o comprovante ficará salvo somente no painel do CEO.</p>`;
    }
  };
  paymentUser.onchange = syncRecipient;
  syncRecipient();

  $("#paymentForm").onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const file = e.target.elements.file.files[0];
    const amount = Number(f.get("amount") || 0);
    const recipientName = String(f.get("recipientName") || "").trim();
    const userId = String(f.get("userId") || "");
    if (!recipientName) return toast("Informe o nome do recebedor.");
    if (amount <= 0) return toast("Informe o valor.");
    let fileId = "", fileName = "", fileType = "";
    if (file) {
      if (file.size > 2 * 1024 * 1024) return toast("O arquivo precisa ter no máximo 2 MB.");
      const btn = e.submitter; if (btn) { btn.disabled = true; btn.textContent = "Enviando arquivo…"; }
      try { const up = await uploadFile(file); fileId = up.fileId; fileName = up.name; fileType = up.type; }
      catch (err) { if (btn) { btn.disabled = false; btn.textContent = "Salvar comprovante"; } return toast(err.message || "Não foi possível enviar o arquivo."); }
    }
    data.receipts.push({ id: uid(), recipientName, userId, farmId: f.get("farmId"), date: f.get("date"), amount, description: f.get("description"), fileId, fileName, fileType, createdAt: new Date().toISOString(), createdBy: currentUser.id });
    saveData(); renderPayments(); toast(userId ? "Comprovante salvo e enviado ao usuário." : "Comprovante salvo pelo nome do recebedor.");
  };
  $$(".receipt-del").forEach(btn => btn.onclick = async () => { const r = data.receipts.find(x => x.id === btn.dataset.id); if (!r || !(await confirmDelete(`O comprovante de ${r.recipientName || "pagamento"} (${money(r.amount)})`))) return; data.receipts = data.receipts.filter(x => x.id !== btn.dataset.id); saveData(); renderPayments(); });
}

function renderMyReceipts() {
  const list = data.receipts.filter(r => r.userId === currentUser.id);
  setHeader("PAGAMENTOS", "Meus comprovantes");
  $("#pageContent").innerHTML = `
    <div class="card soft"><span class="eyebrow dark">ÁREA PRIVADA</span><h2>${list.length} comprovantes</h2><p class="muted">Somente os comprovantes enviados para o seu usuário aparecem aqui.</p>${currentUser.pixKey ? `<p><b>PIX cadastrado:</b> ${escapeHTML(currentUser.pixKey)}</p>` : ""}</div>
    <div class="section-head"><h2>Histórico</h2></div>
    ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Fazenda</th><th>Descrição</th><th>Valor</th><th>Arquivo</th></tr></thead><tbody>${[...list].reverse().map(r => { const f = data.farms.find(x => x.id === r.farmId); return `<tr><td>${dateBR(r.date)}</td><td>${escapeHTML(f?.name || "—")}</td><td>${escapeHTML(r.description)}</td><td><b>${money(r.amount)}</b></td><td>${(r.fileId || r.fileData) ? fileButton(r, "Abrir") : "Sem arquivo"}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="card empty">Você ainda não recebeu comprovantes.</div>`}`;
}

function cattlePaddocks(farm) {
  farm.cattle ||= { paddocks: [], lots: [], weighings: [] };
  farm.cattle.paddocks = Array.isArray(farm.cattle.paddocks) ? farm.cattle.paddocks : [];
  return farm.cattle.paddocks;
}

function paddockForLot(farm, lot) {
  const paddocks = cattlePaddocks(farm);
  return paddocks.find(p => String(p.id) === String(lot?.paddockId || "")) || null;
}

function paddockLabel(farm, lot) {
  const paddock = paddockForLot(farm, lot);
  return paddock?.name || lot?.piquete || "Não informado";
}

function sortedLotWeighings(farm, lotId) {
  return (farm.cattle?.weighings || []).filter(w => String(w.lotId) === String(lotId)).sort((a, b) => {
    const da = String(a.date || "");
    const db = String(b.date || "");
    if (da !== db) return da.localeCompare(db);
    return String(a.createdAt || a.id || "").localeCompare(String(b.createdAt || b.id || ""));
  });
}

function daysBetweenIso(a, b) {
  if (!a || !b) return 0;
  const start = new Date(`${a}T00:00:00Z`).getTime();
  const end = new Date(`${b}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86400000));
}

function lotGainStats(farm, lot) {
  const weighings = sortedLotWeighings(farm, lot.id);
  const first = weighings[0] || null;
  const latest = weighings[weighings.length - 1] || null;
  const currentHeads = Number(lot.heads || latest?.heads || 0);
  const gainAvgKg = first && latest && weighings.length > 1 ? Number(latest.avgKg || 0) - Number(first.avgKg || 0) : null;
  const gainTotalKg = gainAvgKg == null ? null : gainAvgKg * currentHeads;
  const days = first && latest && weighings.length > 1 ? daysBetweenIso(first.date, latest.date) : 0;
  const dailyGainKg = gainAvgKg == null || days <= 0 ? null : gainAvgKg / days;
  return {
    weighings, first, latest, currentHeads, gainAvgKg, gainTotalKg,
    gainTotalArrobas: gainTotalKg == null ? null : gainTotalKg / 15,
    gainAvgArrobas: gainAvgKg == null ? null : gainAvgKg / 15,
    days, dailyGainKg
  };
}

function formatKg(value, digits = 1) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })} kg`;
}

function formatSignedKg(value, digits = 1) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })} kg`;
}

function addCattleWeighing(farm, lot, { date, heads, totalKg, notes = "" }) {
  heads = Number(heads || 0);
  totalKg = Number(totalKg || 0);
  if (!lot || !Number.isInteger(heads) || heads <= 0 || heads > Number(lot.heads) || !Number.isFinite(totalKg) || totalKg <= 0 || !RuralDomain.validDate(date || todayISO()) || (date || todayISO()) > todayISO()) return false;
  farm.cattle.weighings.push({
    id: uid(), lotId: lot.id, date: date || todayISO(), heads, totalKg,
    avgKg: totalKg / heads,
    totalArrobas: totalKg / 15,
    avgArrobas: (totalKg / heads) / 15,
    notes: String(notes || ""),
    createdAt: new Date().toISOString()
  });
  return true;
}

function cattleSectionTabs(farm, active = "lots") {
  const paddocks = cattlePaddocks(farm);
  return `<div class="inline" style="margin-bottom:18px">
    <button type="button" id="cattleLotsTab" class="btn ${active === "lots" ? "primary" : ""}">Lotes e pesagens</button>
    <button type="button" id="cattlePaddocksTab" class="btn ${active === "paddocks" ? "primary" : ""}">Piquetes <span class="badge">${paddocks.length}</span></button>
  </div>`;
}

function bindCattleTabs() {
  if ($("#cattleLotsTab")) $("#cattleLotsTab").onclick = () => { cattleSubView = "lots"; selectedCattleLotId = ""; renderCattle(); };
  if ($("#cattlePaddocksTab")) $("#cattlePaddocksTab").onclick = () => { cattleSubView = "paddocks"; selectedCattleLotId = ""; renderCattle(); };
}

function renderPaddockAdmin(farm) {
  setHeader("PECUÁRIA", "Piquetes");
  const paddocks = cattlePaddocks(farm);
  const lots = farm.cattle.lots || [];
  $("#pageContent").innerHTML = `${cattleSectionTabs(farm, "paddocks")}
    <div class="grid two">
      <form id="paddockForm" class="form-card">
        <div class="inline"><h3 id="paddockFormTitle">Novo piquete</h3><span class="badge gold right">Cadastro prévio</span></div>
        <input type="hidden" name="id">
        <div class="form-grid" style="margin-top:18px">
          <label>Nome do piquete<input name="name" required placeholder="Ex.: Piquete 01"></label>
          <label>Referência (opcional)<input name="reference" placeholder="Ex.: perto da represa"></label>
          <label class="wide">Observação<textarea name="notes" rows="2" placeholder="Ex.: bebedouro no fundo, acesso pela estrada de baixo"></textarea></label>
        </div>
        <div class="form-actions"><button class="btn primary" id="paddockSaveBtn">Adicionar piquete</button><button type="button" class="btn hidden" id="paddockCancelBtn">Cancelar edição</button></div>
      </form>
      <div class="card soft"><span class="eyebrow dark">PIQUETES CADASTRADOS</span><h2>${paddocks.length}</h2><p class="muted">Cadastre uma vez e depois apenas selecione o piquete ao criar ou movimentar um lote.</p></div>
    </div>
    <div class="section-head"><div><h2>Piquetes da fazenda</h2><p>Você pode editar ou excluir piquetes sem uso.</p></div></div>
    ${paddocks.length ? `<div class="table-wrap"><table><thead><tr><th>Piquete</th><th>Referência</th><th>Lotes agora</th><th>Observação</th><th>Ações</th></tr></thead><tbody>${paddocks.map(p => {
      const inUse = lots.filter(l => String(l.paddockId || "") === String(p.id)).length;
      return `<tr><td><b>${escapeHTML(p.name)}</b></td><td>${escapeHTML(p.reference || "—")}</td><td>${inUse}</td><td>${escapeHTML(p.notes || "—")}</td><td><div class="inline"><button class="btn small paddock-edit" data-id="${p.id}">Editar</button><button class="btn danger small paddock-del" data-id="${p.id}">Excluir</button></div></td></tr>`;
    }).join("")}</tbody></table></div>` : `<div class="card empty">Nenhum piquete cadastrado. Cadastre o primeiro acima.</div>`}`;

  bindCattleTabs();
  const form = $("#paddockForm");
  const resetForm = () => {
    form.reset(); form.elements.id.value = "";
    $("#paddockFormTitle").textContent = "Novo piquete";
    $("#paddockSaveBtn").textContent = "Adicionar piquete";
    $("#paddockCancelBtn").classList.add("hidden");
  };
  form.onsubmit = e => {
    e.preventDefault();
    const f = new FormData(form);
    const id = String(f.get("id") || "");
    const name = String(f.get("name") || "").trim();
    if (!name) return toast("Informe o nome do piquete.");
    const duplicate = paddocks.some(p => p.name.toLowerCase() === name.toLowerCase() && p.id !== id);
    if (duplicate) return toast("Já existe um piquete com esse nome.");
    if (id) {
      const paddock = paddocks.find(p => p.id === id);
      if (!paddock) return;
      paddock.name = name;
      paddock.reference = String(f.get("reference") || "").trim();
      paddock.notes = String(f.get("notes") || "").trim();
      paddock.updatedAt = new Date().toISOString();
      lots.filter(l => String(l.paddockId || "") === String(id)).forEach(l => { l.piquete = name; });
      saveData(); toast("Piquete atualizado.");
    } else {
      paddocks.push({ id: uid(), name, reference: String(f.get("reference") || "").trim(), notes: String(f.get("notes") || "").trim(), createdAt: new Date().toISOString() });
      saveData(); toast("Piquete cadastrado.");
    }
    renderPaddockAdmin(farm);
  };
  $("#paddockCancelBtn").onclick = resetForm;
  $$(".paddock-edit").forEach(btn => btn.onclick = () => {
    const paddock = paddocks.find(p => p.id === btn.dataset.id); if (!paddock) return;
    form.elements.id.value = paddock.id;
    form.elements.name.value = paddock.name || "";
    form.elements.reference.value = paddock.reference || "";
    form.elements.notes.value = paddock.notes || "";
    $("#paddockFormTitle").textContent = `Editar ${paddock.name}`;
    $("#paddockSaveBtn").textContent = "Salvar alterações";
    $("#paddockCancelBtn").classList.remove("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $$(".paddock-del").forEach(btn => btn.onclick = async () => {
    const paddock = paddocks.find(p => p.id === btn.dataset.id); if (!paddock) return;
    const inUse = lots.filter(l => String(l.paddockId || "") === String(paddock.id));
    if (inUse.length) return toast(`Mova ${inUse.length} lote${inUse.length > 1 ? "s" : ""} antes de excluir este piquete.`);
    if (!await confirmDelete(`O piquete ${paddock.name}`)) return;
    farm.cattle.paddocks = paddocks.filter(p => p.id !== paddock.id);
    saveData(); renderPaddockAdmin(farm); toast("Piquete excluído.");
  });
}

function renderCattleLotDetail(farm, lot, readOnly = false) {
  const stats = lotGainStats(farm, lot);
  const paddocks = cattlePaddocks(farm);
  const latest = stats.latest;
  const gainClass = Number(stats.gainAvgKg || 0) >= 0 ? "text-green" : "text-red";
  setHeader("PECUÁRIA", `Lote • ${lot.name}`);
  const historyRows = stats.weighings.map((w, index) => {
    const prev = index > 0 ? stats.weighings[index - 1] : null;
    const deltaAvg = prev ? Number(w.avgKg || 0) - Number(prev.avgKg || 0) : null;
    const deltaLot = deltaAvg == null ? null : deltaAvg * Number(lot.heads || w.heads || 0);
    return `<tr><td>${dateBR(w.date)}</td><td>${w.heads}</td><td>${Number(w.totalKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</td><td><b>${Number(w.avgKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</b></td><td>${Number(w.avgArrobas).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}@</td><td class="${deltaAvg != null && deltaAvg >= 0 ? "text-green" : deltaAvg != null ? "text-red" : ""}">${deltaAvg == null ? "Pesagem inicial" : formatSignedKg(deltaAvg)}</td><td>${deltaLot == null ? "—" : formatSignedKg(deltaLot)}</td><td>${escapeHTML(w.notes || "—")}</td>${readOnly ? "" : `<td><button class="btn danger small lot-weight-del" data-id="${w.id}">Excluir</button></td>`}</tr>`;
  }).join("");

  $("#pageContent").innerHTML = `
    <div class="inline" style="margin-bottom:18px"><button type="button" id="backToCattle" class="btn">← Voltar para lotes</button>${!readOnly ? `<button type="button" id="goPaddocksFromLot" class="btn">Gerenciar piquetes</button>` : ""}<span class="badge gold right">${escapeHTML(lot.category || "Gado")}</span></div>
    <div class="hero-surface"><div><span class="eyebrow">FICHA DO LOTE</span><h2>${escapeHTML(lot.name)}</h2><p>${lot.heads} cabeças • ${escapeHTML(paddockLabel(farm, lot))}${lot.entryDate ? ` • entrada ${dateBR(lot.entryDate)}` : ""}</p></div><div class="hero-badges"><span class="badge gold">${stats.weighings.length} pesagem${stats.weighings.length === 1 ? "" : "s"}</span></div></div>
    <div class="grid kpis" style="margin-top:18px">
      <div class="card"><div class="kpi-label"><span>Peso médio atual</span><span class="kpi-icon">${ico("cattle")}</span></div><div class="kpi-value">${latest ? Number(latest.avgKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}${latest ? " kg" : ""}</div><div class="kpi-foot">${latest ? dateBR(latest.date) : "sem pesagem"}</div></div>
      <div class="card"><div class="kpi-label"><span>Média atual</span><span class="kpi-icon">${ico("at")}</span></div><div class="kpi-value">${latest ? Number(latest.avgArrobas).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "@" : "—"}</div><div class="kpi-foot">por cabeça</div></div>
      <div class="card"><div class="kpi-label"><span>Ganho médio/cabeça</span><span class="kpi-icon">${ico("up")}</span></div><div class="kpi-value ${stats.gainAvgKg == null ? "" : gainClass}">${stats.gainAvgKg == null ? "—" : formatSignedKg(stats.gainAvgKg)}</div><div class="kpi-foot">primeira → última pesagem</div></div>
      <div class="card"><div class="kpi-label"><span>Ganho estimado do lote</span><span class="kpi-icon">${ico("chart")}</span></div><div class="kpi-value ${stats.gainTotalKg == null ? "" : gainClass}">${stats.gainTotalKg == null ? "—" : formatSignedKg(stats.gainTotalKg, 0)}</div><div class="kpi-foot">${stats.gainTotalArrobas == null ? "aguardando 2ª pesagem" : `${stats.gainTotalArrobas >= 0 ? "+" : ""}${stats.gainTotalArrobas.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}@ estimadas`}</div></div>
      <div class="card"><div class="kpi-label"><span>Ganho médio diário</span><span class="kpi-icon">${ico("up")}</span></div><div class="kpi-value ${stats.dailyGainKg == null ? "" : gainClass}">${stats.dailyGainKg == null ? "—" : `${stats.dailyGainKg >= 0 ? "+" : ""}${stats.dailyGainKg.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg`}</div><div class="kpi-foot">por cabeça/dia • ${stats.days || 0} dias</div></div>
    </div>
    ${readOnly ? "" : `<div class="grid two" style="margin-top:18px">
      <form id="lotMoveForm" class="form-card"><h3>Localização do lote</h3><div class="form-grid" style="margin-top:18px"><label class="wide">Piquete atual<select name="paddockId"><option value="">Sem piquete definido</option>${paddocks.map(p => `<option value="${p.id}" ${String(lot.paddockId || "") === String(p.id) ? "selected" : ""}>${escapeHTML(p.name)}${p.reference ? ` • ${escapeHTML(p.reference)}` : ""}</option>`).join("")}</select></label></div><div class="form-actions"><button class="btn primary">Salvar localização</button></div></form>
      <form id="lotDetailWeighForm" class="form-card"><h3>Nova pesagem deste lote</h3><div class="form-grid" style="margin-top:18px"><label>Data<input name="date" type="date" value="${todayISO()}" required></label><label>Animais pesados<input name="heads" type="number" min="1" step="1" value="${lot.heads}" required></label><label class="wide">Peso total (kg)<input name="totalKg" type="number" min="0.01" step="0.01" required placeholder="Ex.: 12850"></label><label class="wide">Observação<input name="notes" placeholder="Opcional"></label></div><div class="form-actions"><button class="btn primary">Salvar nova pesagem</button></div></form>
    </div>`}
    <div class="section-head"><div><h2>Evolução do lote</h2><p>${stats.first && stats.latest && stats.weighings.length > 1 ? `De ${dateBR(stats.first.date)} até ${dateBR(stats.latest.date)}.` : "A segunda pesagem libera os indicadores de ganho."}</p></div></div>
    ${stats.weighings.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Animais</th><th>Peso total</th><th>Média/cabeça</th><th>Equiv. peso vivo ÷ 15</th><th>Ganho médio</th><th>Ganho lote*</th><th>Observação</th>${readOnly ? "" : "<th></th>"}</tr></thead><tbody>${historyRows}</tbody></table></div><p class="subtle" style="margin-top:9px">* Ganho do lote é uma estimativa: ganho médio por cabeça × número atual de cabeças do lote.</p>` : `<div class="card empty">Nenhuma pesagem ainda. Registre a primeira pesagem para começar o histórico.</div>`}`;

  $("#backToCattle").onclick = () => { selectedCattleLotId = ""; cattleSubView = "lots"; readOnly ? renderCattleReadOnly() : renderCattle(); };
  if (readOnly) return;
  $("#goPaddocksFromLot").onclick = () => { selectedCattleLotId = ""; cattleSubView = "paddocks"; renderCattle(); };
  $("#lotMoveForm").onsubmit = e => {
    e.preventDefault();
    const paddockId = String(new FormData(e.target).get("paddockId") || "");
    const paddock = paddocks.find(p => String(p.id) === paddockId);
    lot.paddockId = paddockId;
    lot.piquete = paddock?.name || "";
    lot.piqueteUpdatedAt = new Date().toISOString();
    saveData(); renderCattleLotDetail(farm, lot, false); toast("Piquete do lote atualizado.");
  };
  $("#lotDetailWeighForm").onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (!addCattleWeighing(farm, lot, { date: f.get("date"), heads: f.get("heads"), totalKg: f.get("totalKg"), notes: f.get("notes") })) return toast("Informe animais e peso total.");
    saveData(); renderCattleLotDetail(farm, lot, false); toast("Pesagem registrada e evolução atualizada.");
  };
  $$(".lot-weight-del").forEach(btn => btn.onclick = async () => {
    if (!await confirmDelete("Esta pesagem")) return;
    farm.cattle.weighings = farm.cattle.weighings.filter(w => w.id !== btn.dataset.id);
    saveData(); renderCattleLotDetail(farm, lot, false);
  });
}

function renderCattle() {
  if (selectedType() !== "cattle") return renderEquipmentAdmin();
  setHeader("PECUÁRIA", isGeneralView() ? "Gado geral" : "Lotes e pesagens");
  if (isGeneralView()) {
    selectedCattleLotId = "";
    const lots = contextLots();
    const weighings = contextWeighings();
    const heads = lots.reduce((s, l) => s + Number(l.heads || 0), 0);
    $("#pageContent").innerHTML = `
      <div class="grid kpis"><div class="card"><div class="kpi-label"><span>Fazendas</span><span class="kpi-icon">${ico("home")}</span></div><div class="kpi-value">${farmsInContext().length}</div></div><div class="card"><div class="kpi-label"><span>Lotes</span><span class="kpi-icon">${ico("cattle")}</span></div><div class="kpi-value">${lots.length}</div></div><div class="card"><div class="kpi-label"><span>Cabeças</span><span class="kpi-icon">${ico("hash")}</span></div><div class="kpi-value">${heads}</div></div><div class="card"><div class="kpi-label"><span>Pesagens</span><span class="kpi-icon">${ico("at")}</span></div><div class="kpi-value">${weighings.length}</div></div></div>
      <div class="card soft" style="margin-top:18px"><b>Modo geral</b><p class="muted" style="margin-bottom:0">A consulta abaixo reúne todos os lotes e pesagens das fazendas de gado.</p></div>
      <div class="section-head"><h2>Lotes</h2></div>
      ${lots.length ? `<div class="table-wrap"><table><thead><tr><th>Fazenda</th><th>Lote</th><th>Categoria</th><th>Piquete atual</th><th>Cabeças</th><th>Entrada</th></tr></thead><tbody>${lots.map(l => `<tr><td>${escapeHTML(l.farmName)}</td><td><b>${escapeHTML(l.name)}</b>${l.archived?' · Arquivado':''}</td><td>${escapeHTML(l.category || "—")}</td><td><b>${escapeHTML(l.piquete || "Não informado")}</b></td><td>${l.heads}</td><td>${dateBR(l.entryDate)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhum lote cadastrado.</div>`}
      <div class="section-head"><h2>Pesagens</h2></div>
      ${weighings.length ? `<div class="table-wrap"><table><thead><tr><th>Fazenda</th><th>Data</th><th>Animais</th><th>Peso total</th><th>Média kg</th><th>Equiv. peso vivo ÷ 15</th></tr></thead><tbody>${[...weighings].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).map(w => `<tr><td>${escapeHTML(w.farmName)}</td><td>${dateBR(w.date)}</td><td>${w.heads}</td><td>${Number(w.totalKg).toLocaleString("pt-BR")} kg</td><td>${Number(w.avgKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</td><td><b>${Number(w.avgArrobas).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}@</b></td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhuma pesagem registrada.</div>`}`;
    return;
  }

  const farm = activeFarm();
  cattlePaddocks(farm);
  const lots = farm.cattle.lots;
  const ws = farm.cattle.weighings;
  if (selectedCattleLotId) {
    const selectedLot = lots.find(l => String(l.id) === String(selectedCattleLotId));
    if (selectedLot) return renderCattleLotDetail(farm, selectedLot, false);
    selectedCattleLotId = "";
  }
  if (cattleSubView === "paddocks") return renderPaddockAdmin(farm);

  const paddocks = cattlePaddocks(farm);
  $("#pageContent").innerHTML = `${cattleSectionTabs(farm, "lots")}
    <div class="grid two"><form id="lotForm" class="form-card"><div class="inline"><h3>Novo lote</h3><span class="badge gold right">Gado</span></div><div class="form-grid" style="margin-top:18px"><label>Nome do lote<input name="name" required placeholder="Ex.: Lote 01"></label><label>Cabeças<input name="heads" type="number" min="1" step="1" required></label><label>Categoria<select name="category">${["Bezerros","Bezerras","Garrotes","Novilhos","Novilhas","Vacas","Touros","Misto"].map(c=>`<option>${c}</option>`).join('')}</select></label><label>Etapa do lote<select name="stageId"><option value="">Não informada</option>${(data.cattleStages||RuralOps.defaultStages()).filter(s=>s.active!==false).map(s=>`<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('')}</select></label><label>Piquete atual<select name="paddockId"><option value="">Sem piquete definido</option>${paddocks.map(p => `<option value="${p.id}">${escapeHTML(p.name)}${p.reference ? ` • ${escapeHTML(p.reference)}` : ""}</option>`).join("")}</select></label><label>Data de entrada<input name="entryDate" type="date" value="${todayISO()}"></label><label class="wide">Observação<textarea name="notes" rows="2"></textarea></label><div class="wide card soft" style="margin-top:2px"><b>Pesagem inicial (opcional)</b><p class="subtle" style="margin:5px 0 0">Se preencher o peso total, o histórico do lote já começa na criação.</p></div><label>Animais pesados<input name="initialHeads" type="number" min="1" step="1" placeholder="Se vazio, usa as cabeças do lote"></label><label>Peso inicial total (kg)<input name="initialTotalKg" type="number" min="0.01" step="0.01" placeholder="Opcional"></label><label>Data da pesagem inicial<input name="initialDate" type="date" value="${todayISO()}"></label></div><div class="form-actions"><button class="btn primary">Salvar lote</button>${!paddocks.length ? `<button type="button" id="newLotGoPaddocks" class="btn">Cadastrar piquetes primeiro</button>` : ""}</div></form><form id="weighForm" class="form-card"><h3>Nova pesagem</h3><div class="form-grid" style="margin-top:18px"><label>Lote<select name="lotId" required><option value="">Selecione</option>${lots.map(l => `<option value="${l.id}">${escapeHTML(l.name)}</option>`).join("")}</select></label><label>Data<input name="date" type="date" value="${todayISO()}" required></label><label>Animais pesados<input name="heads" type="number" min="1" step="1" required></label><label>Peso total (kg)<input name="totalKg" type="number" min="0.01" step="0.01" required></label><label class="wide">Observação<input name="notes"></label></div><p class="subtle">Depois de salvar, a ficha do lote abre automaticamente mostrando quanto ele engordou.</p><div class="form-actions"><button class="btn primary">Salvar pesagem</button></div></form></div>
    <div class="section-head"><div><h2>Lotes</h2><p>Clique em Abrir ficha para acompanhar a evolução de cada lote.</p></div></div>
    ${lots.length ? `<div class="table-wrap"><table><thead><tr><th>Lote</th><th>Categoria</th><th>Piquete atual</th><th>Cabeças</th><th>Última média</th><th>Ganho médio</th><th>Ações</th></tr></thead><tbody>${lots.map(l => { const st = lotGainStats(farm, l); return `<tr><td><b>${escapeHTML(l.name)}</b>${lotWeighingBadge(farm, l)}</td><td>${escapeHTML(l.category || "—")}</td><td>${escapeHTML(paddockLabel(farm, l))}</td><td>${l.heads}</td><td>${st.latest ? `${Number(st.latest.avgKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg` : "—"}</td><td class="${st.gainAvgKg != null && st.gainAvgKg >= 0 ? "text-green" : st.gainAvgKg != null ? "text-red" : ""}">${st.gainAvgKg == null ? "—" : formatSignedKg(st.gainAvgKg)}</td><td><div class="inline"><button class="btn small lot-open" data-id="${l.id}">Abrir ficha</button><button class="btn danger small lot-del" data-id="${l.id}">${l.archived?'Reativar':'Arquivar'}</button></div></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="card empty">Nenhum lote cadastrado.</div>`}
    <div class="section-head"><h2>Últimas pesagens</h2></div>
    ${ws.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Lote</th><th>Animais</th><th>Peso total</th><th>Média kg</th><th>Equiv. peso vivo ÷ 15</th></tr></thead><tbody>${[...ws].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).slice(0,20).map(w => { const l = lots.find(x => x.id === w.lotId); return `<tr><td>${dateBR(w.date)}</td><td><button class="btn small lot-open" data-id="${w.lotId}">${escapeHTML(l?.name || "Lote removido")}</button></td><td>${w.heads}</td><td>${Number(w.totalKg).toLocaleString("pt-BR")} kg</td><td>${Number(w.avgKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</td><td><b>${Number(w.avgArrobas).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}@</b></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="card empty">Nenhuma pesagem registrada.</div>`}`;

  bindCattleTabs();
  if ($("#newLotGoPaddocks")) $("#newLotGoPaddocks").onclick = () => { cattleSubView = "paddocks"; renderCattle(); };
  $("#lotForm").onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const heads = Number(f.get("heads") || 0);
    if (!Number.isInteger(heads) || heads <= 0) return toast("Informe um número inteiro de cabeças.");
    const paddockId = String(f.get("paddockId") || "");
    const paddock = paddocks.find(p => String(p.id) === paddockId);
    const lot = { id: uid(), stageId: f.get("stageId") || "", name: String(f.get("name") || "").trim(), heads, category: String(f.get("category") || "").trim(), paddockId, piquete: paddock?.name || "", entryDate: f.get("entryDate"), notes: String(f.get("notes") || "").trim(), createdAt: new Date().toISOString() };
    const initialTotalKg = Number(f.get("initialTotalKg") || 0);
    if (initialTotalKg > 0) {
      const initialHeads = Number(f.get("initialHeads") || heads);
      if (!Number.isInteger(initialHeads) || initialHeads <= 0 || initialHeads > heads || !Number.isFinite(initialTotalKg)) return toast("Confira os animais da pesagem inicial.");
      if (!addCattleWeighing(farm, lot, { date: f.get("initialDate") || f.get("entryDate") || todayISO(), heads: initialHeads, totalKg: initialTotalKg, notes: "Pesagem inicial" })) return toast("Confira a data e o peso da pesagem inicial.");
    }
    lots.push(lot);
    selectedCattleLotId = lot.id;
    saveData(); renderCattle(); toast(initialTotalKg > 0 ? "Lote criado com pesagem inicial." : "Lote criado. Você já pode registrar a primeira pesagem.");
  };
  $("#weighForm").onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const lot = lots.find(l => String(l.id) === String(f.get("lotId") || ""));
    if (!lot || !addCattleWeighing(farm, lot, { date: f.get("date"), heads: f.get("heads"), totalKg: f.get("totalKg"), notes: f.get("notes") })) return toast("Preencha lote, animais e peso.");
    selectedCattleLotId = lot.id;
    saveData(); renderCattle(); toast("Pesagem registrada. Veja a evolução do lote.");
  };
  $$(".lot-open").forEach(btn => btn.onclick = () => { selectedCattleLotId = btn.dataset.id; renderCattle(); });
  $$(".lot-del").forEach(btn => btn.onclick = async () => {
    const lot=farm.cattle.lots.find(l=>l.id===btn.dataset.id);if(!lot)return;
    if(lot.heads>0)return toast('Registre a saída ou transferência dos animais em Movimentações antes de arquivar.');
    if(opsChange(farm,f=>{f.cattle.lots.find(l=>l.id===lot.id).archived=!lot.archived;}))renderCattle();
  });
}

function renderCattleReadOnly() {
  const farm = activeFarm();
  cattlePaddocks(farm);
  const lots = farm.cattle.lots;
  const ws = farm.cattle.weighings;
  if (selectedCattleLotId) {
    const lot = lots.find(l => String(l.id) === String(selectedCattleLotId));
    if (lot) return renderCattleLotDetail(farm, lot, true);
    selectedCattleLotId = "";
  }
  setHeader("PECUÁRIA", "Lotes e pesagens");
  $("#pageContent").innerHTML = `<div class="card soft"><span class="eyebrow dark">VISÃO DO CONTRIBUINTE</span><h2>${lots.reduce((s, l) => s + Number(l.heads || 0), 0)} cabeças</h2><p class="muted">Veja os lotes, piquetes e evolução de peso. Financeiro e estoque permanecem restritos.</p></div><div class="section-head"><h2>Lotes</h2></div><div class="grid three">${lots.map(l => { const st = lotGainStats(farm,l); return `<div class="card"><span class="badge gold">${escapeHTML(l.category || "Gado")}</span><h3 style="margin-top:12px">${escapeHTML(l.name)}</h3><p class="muted">${l.heads} cabeças</p><p class="muted"><b>Piquete:</b> ${escapeHTML(paddockLabel(farm,l))}</p><p class="muted"><b>Última média:</b> ${st.latest ? Number(st.latest.avgKg).toLocaleString("pt-BR",{maximumFractionDigits:1})+" kg" : "—"}</p><div class="form-actions"><button class="btn small readonly-lot-open" data-id="${l.id}">Abrir ficha</button></div></div>`; }).join("") || `<div class="card empty">Nenhum lote cadastrado.</div>`}</div><div class="section-head"><h2>Últimas pesagens</h2></div>${ws.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Lote</th><th>Média kg</th><th>Equiv. peso vivo ÷ 15</th></tr></thead><tbody>${[...ws].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).slice(0, 20).map(w => `<tr><td>${dateBR(w.date)}</td><td>${escapeHTML(lots.find(l => l.id === w.lotId)?.name || "—")}</td><td>${Number(w.avgKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</td><td><b>${Number(w.avgArrobas).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}@</b></td></tr>`).join("")}</tbody></table></div>` : `<div class="card empty">Nenhuma pesagem.</div>`}`;
  $$(".readonly-lot-open").forEach(btn => btn.onclick = () => { selectedCattleLotId = btn.dataset.id; renderCattleReadOnly(); });
}

function todayAssignment() {
  return activeFarm().assignments.find(a => a.user === currentUser.username && a.date === todayISO() && (a.activityModule || 'coffee') === selectedType());
}

function renderContributorDay() {
  const farm = activeFarm();
  if (selectedType() === "cattle") return renderCattleReadOnly();
  setHeader("CAMPO", "Meu trabalho hoje");
  farm.talhoes = Array.isArray(farm.talhoes) ? farm.talhoes : [];
  const existing = todayAssignment();
  // O servidor manda só as próprias atribuições e, à parte, as máquinas já reservadas por outras pessoas (occupancy).
  const busyToday = [...farm.assignments.filter(a => a.user !== currentUser.username), ...(farm.occupancy || [])].filter(a => a.date === todayISO());
  const busyT = new Set(busyToday.map(a => a.tractorId).filter(Boolean));
  const busyI = new Set(busyToday.map(a => a.implementId).filter(Boolean));
  const tractors = farm.tractors.filter(t => t.status === "Disponível" && !busyT.has(t.id));
  const implementsList = farm.implements.filter(i => i.status === "Disponível" && !busyI.has(i.id));
  const requiresEquipment = currentUser.function === "Tratorista";
  const selectedPlots = existing?.talhaoNames || [];
  $("#pageContent").innerHTML = `<div class="assignment-hero"><div><span class="eyebrow">RESPONSABILIDADE DO DIA • ${escapeHTML(currentUser.function || "Campo")}</span><h2>${existing ? "Trabalho do dia confirmado." : "Escolha seu trabalho do dia."}</h2><p>Selecione a atividade, um ou mais talhões e os equipamentos sob sua responsabilidade.</p></div><div class="assignment-status"><strong>${dateBR(todayISO())}</strong></div></div>${existing ? `<div class="grid two" style="margin-top:18px"><div class="card"><h3>Talhão(ões)</h3><h2 style="font-size:22px">${escapeHTML(selectedPlots.join(", ") || "—")}</h2></div><div class="card"><h3>Função</h3><h2 style="font-size:22px">${escapeHTML(existing.userFunction || currentUser.function || "Campo")}</h2></div><div class="card"><h3>Trator</h3><h2>${escapeHTML(existing.tractorName || "Não selecionado")}</h2></div><div class="card"><h3>Implemento</h3><h2>${escapeHTML(existing.implementName || "Não selecionado")}</h2></div></div><div class="card" style="margin-top:18px"><b>Atividade:</b> ${escapeHTML(existing.activity)}<div class="form-actions"><button id="changeAssignment" class="btn">Alterar</button></div></div>` : `<form id="assignmentForm"><div class="form-card"><label style="margin:0">Atividade<input name="activity" required placeholder="Ex.: roçada, aplicação, colheita, limpeza..."></label></div><div class="section-head"><div><h2>Talhão</h2><p>Escolha um ou mais talhões.</p></div></div><div class="grid three">${farm.talhoes.length ? farm.talhoes.map(t => `<label class="equipment-pick"><span><strong>${escapeHTML(t.name)}</strong><span>${t.reference ? `Ref.: ${escapeHTML(t.reference)}` : "Selecionar talhão"}</span></span><input type="checkbox" name="talhoes" value="${t.id}"></label>`).join("") : `<div class="card empty">Nenhum talhão cadastrado. Peça ao CEO para cadastrar os talhões desta fazenda.</div>`}</div><div class="section-head"><div><h2>Trator</h2><p>${requiresEquipment ? "Obrigatório para Tratorista." : "Opcional para função Campo."}</p></div></div><div class="grid two">${tractors.map(t => `<label class="equipment-pick"><span><strong>${escapeHTML(t.name)}</strong><span>${escapeHTML(t.model || "")}</span></span><input type="radio" name="tractor" value="${t.id}" ${requiresEquipment ? "required" : ""}></label>`).join("") || `<div class="card empty">Nenhum trator disponível.</div>`}</div><div class="section-head"><div><h2>Implemento</h2><p>${requiresEquipment ? "Obrigatório para Tratorista." : "Opcional para função Campo."}</p></div></div><div class="grid two">${implementsList.map(i => `<label class="equipment-pick"><span><strong>${escapeHTML(i.name)}</strong><span>${escapeHTML(i.category || "")}</span></span><input type="radio" name="implement" value="${i.id}" ${requiresEquipment ? "required" : ""}></label>`).join("") || `<div class="card empty">Nenhum implemento disponível.</div>`}</div><div class="form-actions"><button class="btn primary">Confirmar responsabilidade</button></div></form>`}`;
  if (existing) {
    $("#changeAssignment").onclick = () => { farm.assignments = farm.assignments.filter(a => !(a.user === currentUser.username && a.date === todayISO() && (a.activityModule || 'coffee') === selectedType())); saveData(); renderContributorDay(); };
  } else if ($("#assignmentForm")) {
    $("#assignmentForm").onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const talhaoIds = f.getAll("talhoes");
      if (!talhaoIds.length) return toast("Escolha pelo menos um talhão.");
      const talhaoNames = talhaoIds.map(id => farm.talhoes.find(t => t.id === id)?.name).filter(Boolean);
      const tractor = farm.tractors.find(x => x.id === f.get("tractor"));
      const implemento = farm.implements.find(x => x.id === f.get("implement"));
      if (requiresEquipment && (!tractor || !implemento)) return toast("Tratorista precisa escolher um trator e um implemento.");
      const assignment = { id: uid(), date: todayISO(), activityModule: selectedType(), user: currentUser.username, userName: currentUser.name, userFunction: currentUser.function || "Campo", activity: f.get("activity"), talhaoIds, talhaoNames, tractorId: tractor?.id || "", tractorName: tractor?.name || "", implementId: implemento?.id || "", implementName: implemento?.name || "" };
      farm.assignments.push(assignment);
      farm.equipmentLogs = Array.isArray(farm.equipmentLogs) ? farm.equipmentLogs : [];
      farm.equipmentLogs.push({ ...assignment, id: uid(), assignmentId: assignment.id, loggedAt: new Date().toISOString() });
      saveData(); renderContributorDay();
    };
  }
}

function renderContributorEquipment() {
  const farm = activeFarm();
  setHeader("CAMPO", "Equipamentos disponíveis");
  $("#pageContent").innerHTML = `<div class="section-head" style="margin-top:0"><h2>Tratores</h2></div><div class="grid three">${farm.tractors.filter(x => x.status === "Disponível").map(t => `<div class="card"><span class="badge green">Disponível</span><h3 style="margin-top:12px">${escapeHTML(t.name)}</h3><p class="muted">${escapeHTML(t.model || "")}</p></div>`).join("") || `<div class="card empty">Nenhum.</div>`}</div><div class="section-head"><h2>Implementos</h2></div><div class="grid three">${farm.implements.filter(x => x.status === "Disponível").map(i => `<div class="card"><span class="badge green">Disponível</span><h3 style="margin-top:12px">${escapeHTML(i.name)}</h3><p class="muted">${escapeHTML(i.category || "")}</p></div>`).join("") || `<div class="card empty">Nenhum.</div>`}</div>`;
}

$("#showLoginBtn").onclick = () => showAuthMode("login");
$("#showRegisterBtn").onclick = () => showAuthMode("register");
$("#loginForm").onsubmit = async e => {
  e.preventDefault();
  const btn = e.submitter || $("#loginForm button[type=submit]");
  if (btn) { btn.disabled = true; btn.textContent = "Entrando..."; }
  await login($("#loginGroup").value, $("#loginUser").value, $("#loginPassword").value);
  if (btn) { btn.disabled = false; btn.textContent = "Entrar no sistema"; }
};
$("#registerForm").onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const btn = e.submitter || $("#registerForm button[type=submit]");
  if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }
  await createPendingRegistration(Object.fromEntries(f.entries()));
  if (btn) { btn.disabled = false; btn.textContent = "Enviar solicitação"; }
};

$("#forgotPasswordBtn").onclick = () => showPasswordRecovery("request");
$$('.back-login').forEach(btn => btn.onclick = () => { passwordResetContext = null; showAuthMode("login"); });
$("#forgotForm").onsubmit = async e => {
  e.preventDefault();
  const btn = e.submitter || $("#forgotForm button[type=submit]");
  const ctx = { groupCode: $("#forgotGroup").value.replace(/\D/g, ""), username: $("#forgotUser").value.trim(), email: $("#forgotEmail").value.trim().toLowerCase() };
  if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }
  try {
    const result = await api("/api/auth/password-reset/request", { method: "POST", body: JSON.stringify(ctx) });
    passwordResetContext = ctx;
    $("#resetEmailNote").textContent = result.email ? `Código enviado para ${result.email}.` : "Se os dados conferirem, o código foi enviado para o e-mail cadastrado.";
    $("#resetCode").value = "";
    showPasswordRecovery("confirm");
    toast("Confira seu e-mail para continuar.");
  } catch (error) { toast(error.message || "Não foi possível enviar o código."); }
  finally { if (btn) { btn.disabled = false; btn.textContent = "Enviar código"; } }
};
$("#resetForm").onsubmit = async e => {
  e.preventDefault();
  if (!passwordResetContext) return showPasswordRecovery("request");
  const password = $("#resetPassword").value;
  const confirmPassword = $("#resetPasswordConfirm").value;
  if (password !== confirmPassword) return toast("As duas senhas precisam ser iguais.");
  const btn = e.submitter || $("#resetForm button[type=submit]");
  if (btn) { btn.disabled = true; btn.textContent = "Alterando..."; }
  try {
    const result = await api("/api/auth/password-reset/confirm", { method: "POST", body: JSON.stringify({ ...passwordResetContext, code: $("#resetCode").value, newPassword: password }) });
    $("#loginGroup").value = passwordResetContext.groupCode;
    $("#loginUser").value = passwordResetContext.username;
    passwordResetContext = null;
    $("#resetForm").reset();
    showAuthMode("login");
    toast(result.message || "Senha alterada com sucesso.");
  } catch (error) { toast(error.message || "Não foi possível alterar a senha."); }
  finally { if (btn) { btn.disabled = false; btn.textContent = "Alterar senha"; } }
};

const registerRole = $("#registerRole");
const registerFunctionWrap = $("#registerFunctionWrap");
const registerFunction = $("#registerFunction");
function syncRegisterFields() {
  if (!registerRole || !registerFunctionWrap || !registerFunction) return;
  const contributor = registerRole.value === "contribuinte";
  registerFunctionWrap.classList.toggle("hidden", !contributor);
  registerFunction.disabled = !contributor;
  registerFunction.required = contributor;
  if (!contributor) registerFunction.value = "";
}
if (registerRole) registerRole.onchange = syncRegisterFields;
syncRegisterFields();
// Antes, logout recebia o evento do clique como "silent" e a sessão não era encerrada no servidor.
$("#logoutBtn").onclick = () => logout(false);
$("#logoutTop").innerHTML = ico("logout");
$("#logoutTop").onclick = () => logout(false);
{
  const pc = $("#pageContent");
  let lastKey = "";
  new MutationObserver(() => {
    const key = currentPage + "|" + activeFarmId;
    if (key === lastKey) return;
    lastKey = key;
    [...pc.children].forEach((el, i) => el.style.setProperty("--i", i));
    pc.querySelectorAll(".grid").forEach(g => [...g.children].forEach((el, i) => el.style.setProperty("--i", i + 1)));
    pc.setAttribute("data-enter", "");
    clearTimeout(window.__enter);
    window.__enter = setTimeout(() => pc.removeAttribute("data-enter"), 1400);
  }).observe(pc, { childList: true });
}
showAuthMode("login");
const requestedTheme=new URLSearchParams(location.search).get("activity");if(RuralDomain.ACTIVITIES.includes(requestedTheme))document.body.dataset.loginActivity=requestedTheme;
restoreSession();

