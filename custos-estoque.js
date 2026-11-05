/* 4.18 · Custos e estoque.
   1. Saída do Financeiro pede o centro de custo (Geral, safra ou lote), com sugestão pelo fornecedor.
   2. Ordem de serviço com insumos: concluída, o escritório dá baixa no estoque uma única vez (consumo com id fixo).
   3. Estoque: conferir o saldo físico e só então usar o mínimo sugerido pelo consumo real para alertar compras. */
const MC = RuralMelhorias;

// ---------- 1. Centro de custo na saída ----------
{
  const prior = bindFinanceForm;
  bindFinanceForm = function (after) {
    prior(after);
    const form = document.getElementById('financeForm'), farm = activeFarm();
    if (!form || !farm) return;
    const activity = selectedType(), options = MC.costCenterOptions(farm, activity);
    const suppliers = [...new Set([...(farm.finances || []).map(r => r.supplier), ...(farm.management?.payables || []).map(r => r.supplier)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')).slice(0, 200);
    const box = document.createElement('div'); box.className = 'cost-center-box wide'; box.id = 'costCenterBox';
    box.innerHTML = `<label>Fornecedor<input name="supplier" list="supplierList" maxlength="120" autocomplete="off" placeholder="Ex.: Agro Loja"></label><datalist id="supplierList">${suppliers.map(s => `<option value="${escapeHTML(s)}">`).join('')}</datalist>
      <label>Centro de custo<select name="costCenter"><option value="">Escolha…</option>${options.map(([v, l]) => `<option value="${escapeHTML(v)}">${escapeHTML(l)}</option>`).join('')}</select></label>
      <p class="muted cost-center-hint" aria-live="polite">Para onde vai este gasto: uma safra, um lote ou a fazenda toda (Geral).</p>`;
    (form.querySelector('.form-grid') || form).appendChild(box);
    const type = form.querySelector('[name=type]'), supplier = box.querySelector('[name=supplier]'), select = box.querySelector('[name=costCenter]'), hint = box.querySelector('.cost-center-hint');
    const toggle = () => { box.hidden = type?.value !== 'saida'; };
    type?.addEventListener('change', toggle); toggle();
    let touched = false; select.addEventListener('change', () => { touched = true; });
    const suggest = () => {
      const s = MC.suggestCostCenter(farm, supplier.value, activity);
      if (s && !touched) { select.value = s.costCenter; select.dispatchEvent(new Event('change')); touched = false; hint.textContent = `Sugerido pelo último gasto com este fornecedor (${dateBR(s.date)}). Pode trocar.`; }
      else if (!s) hint.textContent = 'Para onde vai este gasto: uma safra, um lote ou a fazenda toda (Geral).';
    };
    supplier.addEventListener('change', suggest); supplier.addEventListener('blur', suggest);
    const original = form.onsubmit;
    form.onsubmit = async e => {
      e.preventDefault();
      const isOut = type?.value === 'saida', cc = select.value, who = supplier.value.trim();
      if (isOut && !cc) { toast('Escolha o centro de custo: uma safra, um lote ou Geral.'); select.focus(); return; }
      const f0 = activeFarm(), before = new Set((f0?.finances || []).map(r => String(r.id)));
      await original.call(form, e);
      const f = activeFarm(), rec = (f?.finances || []).find(r => !before.has(String(r.id)));
      if (!rec || rec.type !== 'saida') return;
      rec.supplier = who || undefined; rec.costCenter = cc;
      delete rec.cycleId; delete rec.lotId;
      if (cc.startsWith('cycle:')) rec.cycleId = cc.slice(6); else if (cc.startsWith('lot:')) rec.lotId = cc.slice(4);
      if (!rec.supplier) delete rec.supplier;
      saveData();
    };
  };
}

// ---------- 2. Insumos da ordem de serviço e baixa ----------
async function editarInsumosOrdem(f, order) {
  const items = (f.stock || []).filter(s => (s.activity || 'coffee') === order.activity).sort((a, b) => String(a.item).localeCompare(String(b.item), 'pt-BR'));
  if (!items.length) return toast('Cadastre os insumos no Estoque desta atividade.');
  const now = new Map((order.inputs || []).map(i => [i.stockId, i.quantity]));
  const v = await askForm({ title: 'Insumos · ' + order.title, text: 'Quantidade prevista de cada insumo (deixe vazio o que não usa). A baixa no estoque acontece quando a ordem estiver concluída.', wide: true,
    fields: items.slice(0, 60).map(s => ({ name: 'q_' + s.id, label: `${s.item} (${s.unit} · saldo ${String(s.quantity).replace('.', ',')})`, type: 'number', min: 0, step: 'any', value: now.get(s.id) ?? '' })) });
  if (!v) return;
  const inputs = items.map(s => ({ stockId: s.id, quantity: Number(v['q_' + s.id]) })).filter(i => Number.isFinite(i.quantity) && i.quantity > 0);
  if (xChange(f, c => { const o = c.expansion.workOrders.find(x => x.id === order.id); if (o) o.inputs = inputs; })) toast(inputs.length ? 'Insumos da ordem guardados.' : 'Insumos retirados da ordem.');
}
function darBaixaOrdem(f, order) {
  const uses = MC.orderStockUses(f, order, todayISO());
  if (!uses.length) return toast('Os insumos desta ordem já tiveram baixa.');
  if (opsChange(f, x => x.operations.stockUses.push(...uses))) { toast(`Baixa de ${uses.length} insumo(s) registrada no estoque.`); renderPage({ animate: false }); }
}
function cardOrdens(f) {
  const orders = (f.expansion?.workOrders || []).filter(o => !o.archived && o.activity === selectedType());
  if (!orders.length) return null;
  const stock = new Map((f.stock || []).map(s => [s.id, s])), done = new Set((f.operations?.stockUses || []).map(u => u.id));
  const card = document.createElement('section'); card.className = 'exp-section os-insumos';
  card.innerHTML = `<h3>Insumos das ordens de serviço</h3><p class="muted">Liste o que cada ordem vai usar. Quando a ordem for concluída no campo, dê baixa: o estoque desconta uma vez só e o custo entra na safra ou no lote da ordem.</p>
    <div class="table-wrap"><table><thead><tr><th>Ordem</th><th>Andamento</th><th>Insumos</th><th></th></tr></thead><tbody>${orders.map(o => {
      const st = XR.orderStatus(f, o.id), pend = (o.inputs || []).filter(i => !done.has(MC.orderUseId(o.id, i.stockId)));
      const label = { done: 'Concluída', started: 'Iniciada', blocked: 'Impedida' }[st] || 'Aberta';
      return `<tr><td><b>${escapeHTML(o.title)}</b></td><td>${label}</td><td>${(o.inputs || []).map(i => escapeHTML(`${stock.get(i.stockId)?.item || 'item removido'} ${String(i.quantity).replace('.', ',')} ${stock.get(i.stockId)?.unit || ''}`)).join('<br>') || '—'}</td>
        <td><div class="row-actions"><button type="button" class="btn small" data-os-insumos="${escapeHTML(o.id)}">Insumos</button>${st === 'done' && (o.inputs || []).length ? (pend.length ? `<button type="button" class="btn small primary" data-os-baixa="${escapeHTML(o.id)}">Dar baixa (${pend.length})</button>` : '<span class="badge">Baixa feita</span>') : ''}</div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  card.querySelectorAll('[data-os-insumos]').forEach(b => b.onclick = () => editarInsumosOrdem(f, f.expansion.workOrders.find(o => o.id === b.dataset.osInsumos)));
  card.querySelectorAll('[data-os-baixa]').forEach(b => b.onclick = () => darBaixaOrdem(f, f.expansion.workOrders.find(o => o.id === b.dataset.osBaixa)));
  return card;
}

// ---------- 3. Saldo físico e mínimo sugerido ----------
async function conferirSaldo(farm, item) {
  const v = await askForm({ title: 'Conferir saldo · ' + item.item, text: `Conte o que há no galpão agora. No sistema: ${String(item.quantity).replace('.', ',')} ${item.unit}.`, fields: [{ name: 'counted', label: `Quantidade contada (${item.unit})`, type: 'number', min: 0, step: 'any', required: true, autofocus: true, value: item.quantity }, { name: 'note', label: 'Observação (se a diferença tiver motivo)' }] });
  if (!v) return;
  const counted = Number(v.counted); if (!Number.isFinite(counted) || counted < 0) return toast('Informe uma quantidade válida.');
  const live = activeFarm()?.stock?.find(s => s.id === item.id); if (!live) return;
  const diff = Math.round((counted - Number(live.quantity || 0)) * 1000) / 1000;
  live.quantity = counted; live.countedAt = new Date().toISOString(); live.countedBy = currentUser.name || currentUser.username;
  if (diff) live.countNote = String(v.note || '').slice(0, 200) || undefined;
  saveData(); toast(diff ? `Saldo ajustado (${diff > 0 ? '+' : ''}${String(diff).replace('.', ',')} ${live.unit}).` : 'Saldo conferido: igual ao sistema.'); renderPage({ animate: false });
}
function cardMinimo(farm) {
  const items = (farm.stock || []).filter(s => (s.activity || 'coffee') === selectedType());
  if (!items.length) return null;
  const rows = items.map(s => ({ s, m: MC.suggestedMin(farm, s, todayISO()) }));
  const card = document.createElement('section'); card.className = 'card stock-minimo';
  card.innerHTML = `<h3>Mínimo pelo consumo real</h3><p class="muted">O sistema sugere o mínimo pelo que foi gasto nos últimos 90 dias (cobertura de 30 dias). Antes de usar a sugestão para alertar compras, confira o saldo físico: com saldo errado, o alerta também sai errado.</p>
    <div class="table-wrap"><table><thead><tr><th>Item</th><th>Saldo</th><th>Mínimo atual</th><th>Gasto em 90 dias</th><th>Sugerido</th><th>Saldo conferido</th><th></th></tr></thead><tbody>${rows.map(({ s, m }) => `<tr><td><b>${escapeHTML(s.item)}</b></td><td>${String(s.quantity).replace('.', ',')} ${escapeHTML(s.unit)}</td><td>${String(s.min ?? 0).replace('.', ',')}</td><td>${String(m.used90).replace('.', ',')}</td><td>${m.suggested == null ? '—' : String(m.suggested).replace('.', ',')}</td><td>${m.countedAt ? dateBR(m.countedAt) + (m.countedRecently ? '' : ' <span class="exp-bad">(mais de 30 dias)</span>') : '<span class="exp-bad">nunca</span>'}</td>
      <td><div class="row-actions"><button type="button" class="btn small" data-conferir="${escapeHTML(s.id)}">Conferir saldo</button>${m.suggested != null ? `<button type="button" class="btn small ${m.countedRecently ? 'primary' : ''}" data-usar-min="${escapeHTML(s.id)}" ${m.countedRecently ? '' : 'disabled title="Confira o saldo físico antes"'}>Usar ${String(m.suggested).replace('.', ',')}</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>`;
  card.querySelectorAll('[data-conferir]').forEach(b => b.onclick = () => conferirSaldo(farm, farm.stock.find(s => s.id === b.dataset.conferir)));
  card.querySelectorAll('[data-usar-min]').forEach(b => b.onclick = () => {
    const item = farm.stock.find(s => s.id === b.dataset.usarMin), m = MC.suggestedMin(farm, item, todayISO());
    if (!m.countedRecently || m.suggested == null) return toast('Confira o saldo físico antes de usar o mínimo sugerido.');
    item.min = m.suggested; saveData(); toast(`Mínimo de ${item.item} ajustado para ${String(m.suggested).replace('.', ',')} ${item.unit}.`); renderPage({ animate: false });
  });
  return card;
}

// ---------- 4. Validade dos insumos (defensivos, medicamentos, vacinas) ----------
const validadeTxt = x => x.left < 0 ? `venceu há ${-x.left} dia(s)` : x.left === 0 ? 'vence hoje' : `vence em ${x.left} dia(s)`;
async function editarValidade(farm, item) {
  const v = await askForm({ title: 'Lote e validade · ' + item.item, text: 'Informe a validade da embalagem. O sistema avisa 30 dias antes e de novo na última semana.', fields: [{ name: 'batch', label: 'Lote (opcional)', value: item.batch || '', maxlength: 40 }, { name: 'expires', label: 'Validade', type: 'date', value: item.expires || '' }] });
  if (!v) return;
  const live = activeFarm()?.stock?.find(s => s.id === item.id); if (!live) return;
  const batch = String(v.batch || '').trim().slice(0, 40), expires = String(v.expires || '');
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return toast('Informe uma validade válida.');
  if (batch) live.batch = batch; else delete live.batch;
  if (expires) live.expires = expires; else delete live.expires;
  saveData(); toast(expires ? 'Validade salva.' : 'Validade removida.'); renderPage({ animate: false });
}
function cardValidade(farm) {
  const items = (farm.stock || []).filter(s => (s.activity || 'coffee') === selectedType());
  if (!items.length) return null;
  const soon = MC.expiringStock({ stock: items }, todayISO()), withDate = items.filter(s => s.expires).length;
  const card = document.createElement('section'); card.className = 'card stock-validade';
  card.innerHTML = `<h3>Validade dos insumos</h3><p class="muted">${withDate} de ${items.length} item(ns) com validade informada. Use primeiro o que vence antes; vencido não deve ir para a lavoura nem para o rebanho.</p>
    ${soon.length ? `<div class="table-wrap"><table><thead><tr><th>Item</th><th>Lote</th><th>Validade</th><th>Saldo</th><th></th></tr></thead><tbody>${soon.map(x => `<tr class="${x.left <= 7 ? 'validade-urgente' : ''}"><td><b>${escapeHTML(x.item.item)}</b></td><td>${escapeHTML(x.item.batch || '—')}</td><td>${dateBR(x.item.expires)} <span class="${x.left <= 7 ? 'exp-bad' : ''}">(${validadeTxt(x)})</span></td><td>${String(x.item.quantity).replace('.', ',')} ${escapeHTML(x.item.unit)}</td><td><button type="button" class="btn small" data-validade="${escapeHTML(x.item.id)}">Alterar</button></td></tr>`).join('')}</tbody></table></div>` : '<p>Nada vencido nem vencendo nos próximos 30 dias.</p>'}`;
  card.querySelectorAll('[data-validade]').forEach(b => b.onclick = () => editarValidade(farm, farm.stock.find(s => s.id === b.dataset.validade)));
  return card;
}
// Lote e validade no cadastro e um botão em cada linha da tabela do estoque.
function estoqueValidadeCampos(farm) {
  const form = $('#stockForm'); if (!form || form.elements.expires) return;
  form.querySelector('.form-grid').insertAdjacentHTML('beforeend', '<label>Lote (opcional)<input name="batch" maxlength="40"></label><label>Validade (opcional)<input name="expires" type="date"></label>');
  const orig = form.onsubmit;
  form.onsubmit = e => {
    const batch = String(form.elements.batch.value || '').trim().slice(0, 40), expires = form.elements.expires.value, before = new Set((farm.stock || []).map(s => s.id));
    orig(e);
    const added = (activeFarm()?.stock || []).find(s => !before.has(s.id)); if (!added || (!batch && !expires)) return;
    if (batch) added.batch = batch; if (expires) added.expires = expires; saveData(); renderPage({ animate: false });
  };
  $$('#pageContent .stock-edit').forEach(b => {
    const s = farm.stock.find(x => x.id === b.dataset.id); if (!s) return;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn small'; btn.dataset.validadeLinha = s.id;
    btn.textContent = s.expires ? 'Val. ' + dateBR(s.expires) : 'Validade'; btn.onclick = () => editarValidade(farm, s); b.after(btn);
  });
}

{
  const prior = renderPage;
  renderPage = function (options) {
    prior(options);
    if (!currentUser || !['ceo', 'adm'].includes(currentUser.role) || isGeneralView()) return;
    const f = activeFarm(); if (!f) return;
    if (currentPage === 'campo-completo') { const c = cardOrdens(f); if (c) $('#pageContent').appendChild(c); }
    if (currentPage === 'estoque') { estoqueValidadeCampos(f); const v = cardValidade(f); if (v) $('#pageContent').appendChild(v); const c = cardMinimo(f); if (c) $('#pageContent').appendChild(c); }
  };
}
