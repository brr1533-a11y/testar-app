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
  // Nome e unidade vão junto: o funcionário do campo não recebe o estoque e precisa saber o que está informando.
  const prior = new Map((order.inputs || []).map(i => [i.stockId, i]));
  const inputs = items.map(s => ({ stockId: s.id, quantity: Number(v['q_' + s.id]), itemName: String(s.item || '').slice(0, 120), unit: String(s.unit || '').slice(0, 20), ...(prior.get(s.id)?.skipped ? { skipped: true } : {}) })).filter(i => Number.isFinite(i.quantity) && i.quantity > 0);
  if (xChange(f, c => { const o = c.expansion.workOrders.find(x => x.id === order.id); if (o) o.inputs = inputs; })) toast(inputs.length ? 'Insumos da ordem guardados.' : 'Insumos retirados da ordem.');
}
const fmtQ = v => String(Math.round((Number(v) || 0) * 1000) / 1000).replace('.', ',');
// 4.19 · Baixa pelo que foi realmente usado: vem preenchida com o que o campo informou (ou o previsto) e dividida
// entre os lotes do mesmo insumo, o que vence antes primeiro. A sobra fica no estoque.
async function darBaixaOrdem(f, order) {
  const pending = MC.orderPendingInputs(f, order);
  if (!pending.length) return toast('Os insumos desta ordem já tiveram baixa.');
  const on = todayISO(), field = MC.orderFieldUsage(f, order), fields = [];
  if (field?.by) field.by = (data.users || []).find(u => u.username === field.by)?.name || field.by;
  pending.forEach((i, n) => {
    const lots = MC.orderLotOptions(f, i.stockId, on);
    if (!lots.length) { fields.push({ name: 'x_' + n, type: 'preview', label: `${i.itemName || 'Insumo'}: não está mais no estoque`, value: 'Fica sem baixa (marcado como não usado).' }); return; }
    const unit = lots[0].item.unit, told = field?.used.has(i.stockId);
    let need = told ? field.used.get(i.stockId) : i.quantity;
    lots.forEach((l, k) => {
      const take = l.expired ? 0 : Math.min(need, Math.max(0, Number(l.item.quantity) || 0)); need = Math.round((need - take) * 1000) / 1000;
      fields.push({ name: `q_${n}_${l.item.id}`, type: 'number', min: 0, step: 'any', wide: true, value: take || '',
        label: `${l.item.item}${l.item.batch ? ' · lote ' + l.item.batch : ''}${l.item.expires ? ` · ${l.expired ? 'VENCIDO em' : 'vence'} ${dateBR(l.item.expires)}` : ''} · saldo ${fmtQ(l.item.quantity)} ${unit}`,
        hint: k ? undefined : `Previsto: ${fmtQ(i.quantity)} ${unit}. ${told ? `Informado no campo: ${fmtQ(field.used.get(i.stockId))} ${unit}${field.by ? ' (' + field.by + ')' : ''}.` : 'O campo não informou o usado: confira com quem fez o serviço.'}` });
    });
  });
  const v = await askForm({ title: 'Dar baixa · ' + order.title, wide: true, okText: 'Dar baixa', fields,
    text: 'Informe quanto saiu de cada lote. Deixe vazio o lote que não foi usado; se o insumo inteiro não foi usado, deixe todos vazios. O que sobrou fica no estoque.' });
  if (!v) return;
  const live = activeFarm(), o = live?.expansion?.workOrders.find(x => x.id === order.id); if (!o) return;
  const usage = pending.map((i, n) => ({ stockId: i.stockId, lots: MC.orderLotOptions(live, i.stockId, on).map(l => ({ stockId: l.item.id, quantity: v[`q_${n}_${l.item.id}`] })) }));
  let r; try { r = MC.orderStockUses(live, o, on, usage); } catch (e) { return toast(e.message); }
  const name = id => o.inputs.find(i => i.stockId === id)?.itemName || live.stock.find(s => s.id === id)?.item || 'Insumo';
  const notes = [...r.warnings, ...(r.skipped.length ? [`Sem uso (não sai do estoque): ${r.skipped.map(name).join(', ')}.`] : [])];
  if (notes.length && !await ask(notes.join(' '), { title: 'Confira antes de dar baixa', okText: 'Dar baixa assim' })) return;
  if (r.uses.length && !opsChange(live, x => x.operations.stockUses.push(...r.uses))) return;
  if (r.skipped.length && !xChange(live, c => { for (const i of c.expansion.workOrders.find(x => x.id === o.id)?.inputs || []) if (r.skipped.includes(i.stockId)) i.skipped = true; })) return;
  const total = id => r.uses.filter(u => u.inputStockId === id).reduce((n, u) => n + u.quantity, 0);
  toast(pending.map(i => { const t = total(i.stockId), left = Math.round((i.quantity - t) * 1000) / 1000; return t ? `${name(i.stockId)}: ${fmtQ(t)}${left > 0 ? ` (sobra de ${fmtQ(left)} no estoque)` : ''}` : `${name(i.stockId)}: não usado`; }).join(' · '));
  renderPage({ animate: false });
}
function usoDaOrdem(f, o, i, stock) {
  const unit = stock.get(i.stockId)?.unit || i.unit || '', uses = (f.operations?.stockUses || []).filter(u => u.workOrderId === o.id && (u.inputStockId || u.stockId) === i.stockId);
  const head = `${stock.get(i.stockId)?.item || i.itemName || 'item removido'} · previsto ${fmtQ(i.quantity)} ${unit}`;
  if (i.skipped) return head + ' · não usado';
  if (uses.length) return head + ` · usado ${fmtQ(uses.reduce((n, u) => n + u.quantity, 0))} ${unit}` + (uses.some(u => u.batch) ? ` (lote ${uses.map(u => u.batch || 'sem lote').join(', ')})` : '');
  const told = MC.orderFieldUsage(f, o); return told?.used.has(i.stockId) ? head + ` · campo informou ${fmtQ(told.used.get(i.stockId))} ${unit}` : head;
}
function cardOrdens(f) {
  const orders = (f.expansion?.workOrders || []).filter(o => !o.archived && o.activity === selectedType());
  if (!orders.length) return null;
  const stock = new Map((f.stock || []).map(s => [s.id, s]));
  const card = document.createElement('section'); card.className = 'exp-section os-insumos';
  card.innerHTML = `<h3>Insumos das ordens de serviço</h3><p class="muted">Liste o que cada ordem vai usar. Quem faz o serviço informa no campo quanto usou; na baixa você confere, escolhe o lote e o estoque desconta só o usado, uma vez só. O custo entra na safra ou no lote da ordem.</p>
    <div class="table-wrap"><table><thead><tr><th>Ordem</th><th>Andamento</th><th>Insumos</th><th></th></tr></thead><tbody>${orders.map(o => {
      const st = XR.orderStatus(f, o.id), pend = MC.orderPendingInputs(f, o);
      const label = { done: 'Concluída', started: 'Iniciada', blocked: 'Impedida' }[st] || 'Aberta';
      return `<tr><td><b>${escapeHTML(o.title)}</b></td><td>${label}</td><td>${(o.inputs || []).map(i => escapeHTML(usoDaOrdem(f, o, i, stock))).join('<br>') || '—'}</td>
        <td><div class="row-actions"><button type="button" class="btn small" data-os-insumos="${escapeHTML(o.id)}">Insumos</button>${st === 'done' && (o.inputs || []).length ? (pend.length ? `<button type="button" class="btn small primary" data-os-baixa="${escapeHTML(o.id)}">Dar baixa (${pend.length})</button>` : '<span class="badge">Baixa feita</span>') : ''}</div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  card.querySelectorAll('[data-os-insumos]').forEach(b => b.onclick = () => editarInsumosOrdem(f, f.expansion.workOrders.find(o => o.id === b.dataset.osInsumos)));
  card.querySelectorAll('[data-os-baixa]').forEach(b => b.onclick = () => darBaixaOrdem(f, f.expansion.workOrders.find(o => o.id === b.dataset.osBaixa)));
  return card;
}

// 4.19 · Quem faz o serviço conclui a ordem informando quanto usou de cada insumo (vale sem internet, pela mesma fila).
async function concluirOrdemCampo(f, order) {
  const inputs = order.inputs || [];
  const v = await askForm({ title: 'Concluir · ' + order.title, okText: 'Concluir ordem', text: 'Informe quanto foi usado de cada insumo. Se sobrou, coloque só o que saiu; se não usou, coloque 0. O escritório confere e dá baixa no estoque.',
    fields: [...inputs.map((i, n) => ({ name: 'u_' + n, label: `${i.itemName || 'Insumo ' + (n + 1)} usado (${i.unit || 'quantidade'}) · previsto ${fmtQ(i.quantity)}`, type: 'number', min: 0, step: 'any', required: true, value: i.quantity, autofocus: n === 0 })), { name: 'notes', label: 'Observação (opcional)', type: 'textarea', wide: true }] });
  if (!v) return;
  const used = inputs.map((i, n) => ({ stockId: i.stockId, quantity: Number(String(v['u_' + n]).replace(',', '.')) }));
  if (used.some(u => !Number.isFinite(u.quantity) || u.quantity < 0)) return toast('Informe a quantidade usada de cada insumo (0 se não usou).');
  if (xChange(f, c => c.expansion.workOrderEvents.push({ id: uid(), activity: order.activity, date: todayISO(), orderId: order.id, status: 'done', used, notes: String(v.notes || '').trim().slice(0, 300), archived: false }))) { toast('Ordem concluída. O escritório vai conferir o que foi usado.'); renderPage({ animate: false }); }
}
function cardConcluirCampo(f) {
  const mine = (f.expansion?.workOrders || []).filter(o => !o.archived && o.assignee === currentUser.id && (o.inputs || []).length && XR.orderStatus(f, o.id) !== 'done');
  if (!mine.length) return null;
  const card = document.createElement('section'); card.className = 'exp-section os-concluir';
  card.innerHTML = `<h3>Ordens com insumos</h3><p class="muted">Ao terminar, conclua por aqui e diga quanto usou. Assim o estoque e o custo ficam certos.</p>
    <div class="table-wrap"><table><thead><tr><th>Serviço</th><th>Prazo</th><th>Insumos previstos</th><th></th></tr></thead><tbody>${mine.map(o => `<tr><td><b>${escapeHTML(o.title)}</b></td><td>${escapeHTML(dateBR(o.due))}</td><td>${o.inputs.map(i => escapeHTML(`${i.itemName || 'Insumo'} ${fmtQ(i.quantity)} ${i.unit || ''}`)).join('<br>')}</td><td><button type="button" class="btn small primary" data-os-concluir="${escapeHTML(o.id)}">Concluir e informar o usado</button></td></tr>`).join('')}</tbody></table></div>`;
  card.querySelectorAll('[data-os-concluir]').forEach(b => b.onclick = () => concluirOrdemCampo(f, f.expansion.workOrders.find(o => o.id === b.dataset.osConcluir)));
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
    if (currentUser?.role === 'contribuinte' && currentPage === 'campo-completo') { const f = activeFarm(), c = f && cardConcluirCampo(f); if (c) $('#pageContent').appendChild(c); return; }
    if (!currentUser || !['ceo', 'adm'].includes(currentUser.role) || isGeneralView()) return;
    const f = activeFarm(); if (!f) return;
    if (currentPage === 'campo-completo') { const c = cardOrdens(f); if (c) $('#pageContent').appendChild(c); }
    if (currentPage === 'estoque') { estoqueValidadeCampos(f); const v = cardValidade(f); if (v) $('#pageContent').appendChild(v); const c = cardMinimo(f); if (c) $('#pageContent').appendChild(c); }
  };
}
