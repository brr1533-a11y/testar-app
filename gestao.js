/* Telas de gestão (financeiro, fiscal, conciliação, contratos, pedidos de compra) e compra de insumos pelo menor preço.
   As regras ficam em gestao-domain.js e são aplicadas de novo pelo servidor antes de gravar. */
const gEsc = v => escapeHTML(v ?? '');
const gNum = (v, d = 2) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
const G_PAGES = { 'gestao': 'Gestão', 'financeiro-gestao': 'Financeiro', 'fiscal': 'Fiscal', 'conciliacao': 'Conciliação bancária', 'contratos': 'Contratos de venda', 'pedidos-compra': 'Pedidos de compra', 'insumos': 'Compra de insumos' };
// O que cada perfil abre. O ADM não vê o dinheiro da fazenda (mesma regra do balanço).
function gestaoAllowed(page) {
  if (!currentUser || currentUser.role === 'contribuinte') return false;
  if (currentUser.role === 'ceo') return true;
  // ADM: as páginas que o CEO liberou em Usuários > Permissões do ADM (padrão: fiscal, pedidos de compra e insumos).
  return typeof canSee === 'function' ? canSee(page) : ['gestao', 'fiscal', 'pedidos-compra', 'insumos'].includes(page);
}
function gestaoExtraPages() { return Object.keys(G_PAGES).filter(gestaoAllowed); }

// Menu: "Gestão" e "Compra de insumos" entram depois do Estoque, para CEO e ADM.
{
  const navBefore = navItems;
  navItems = function () {
    const items = navBefore();
    if (!currentUser || currentUser.role === 'contribuinte') return items;
    const at = items.findIndex(i => i[0] === 'estoque');
    items.splice(at < 0 ? items.length : at + 1, 0, ...[['insumos', 'box', 'Compra de insumos'], ['gestao', 'wallet', 'Gestão']].filter(([page]) => gestaoAllowed(page)));
    return items;
  };
}

// Sempre grava na versão atual da fazenda (buscada pelo id na hora de salvar): uma atualização do servidor
// que chegou depois da tela ser desenhada troca os objetos de `data`, e gravar na cópia antiga perderia a alteração.
function gestaoChange(farm, change) {
  try {
    const live = data.farms.find(x => x.id === farm.id) || farm;
    const f = JSON.parse(JSON.stringify(live));
    FarmManagement.init(f); change(f); FarmManagement.validateFarm(f);
    Object.assign(live, f); if (live !== farm) Object.assign(farm, f);
    saveData(); return true;
  } catch (e) { toast(e.message); return false; }
}
// Telas de cadastro pedem uma fazenda específica (na visão geral só há consulta).
function gestaoFarmOrNotice() {
  if (!isGeneralView()) { const f = activeFarm(); if (f) FarmManagement.init(f); return f; }
  $('#pageContent').innerHTML = `<div class="card soft"><h2>Escolha uma fazenda</h2><p class="muted">Para registrar ou alterar, selecione uma fazenda específica no seletor "Fazenda ativa".</p></div>`;
  return null;
}
// A central "Gestão" saiu do menu (as telas ficam no grupo Financeiro e fiscal): sem botão de voltar.
function gestaoBack() { return '<span></span>'; }
function bindBack() { if ($('#gBack')) $('#gBack').onclick = () => goToPage('gestao'); }
function gestaoReadFile(accept) {
  return new Promise(resolve => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = accept;
    input.onchange = async () => { const file = input.files?.[0]; if (!file) return resolve(null); if (file.size > 3 * 1024 * 1024) { toast('Arquivo grande demais (máximo 3 MB).'); return resolve(null); } resolve({ name: file.name, text: await file.text() }); };
    input.click();
  });
}

// ---------- Central de Gestão ----------
function renderGestao() {
  setHeader('GESTÃO', 'Gestão da fazenda');
  const ceo = currentUser.role === 'ceo';
  const tools = [
    ['financeiro-gestao', 'Financeiro', 'Contas a pagar e receber, custos e rateios.'],
    ['fiscal', 'Fiscal', 'Emitir e receber notas fiscais (NF-e e MDF-e).'],
    ['conciliacao', 'Conciliação bancária', 'Conferir se os lançamentos batem com o extrato do banco.'],
    ['contratos', 'Contratos de venda', 'Registrar a venda da produção para o comprador e controlar as entregas.'],
    ['pedidos-compra', 'Pedidos de compra', 'Organizar e aprovar internamente o que a fazenda vai comprar, não comprar pelo sistema.']
  ].filter(([page]) => gestaoAllowed(page));
  $('#pageContent').innerHTML = `
    <div class="hero-surface"><div><h2>Ferramentas de gestão</h2><p>Financeiro, fiscal, conciliação bancária e contratos de venda são ferramentas de gestão: servem para organizar o dinheiro, as notas e as vendas da fazenda, não para comprar insumos.</p></div></div>
    <div class="grid two g-tools">${tools.map(([page, title, desc]) => `<article class="card g-tool"><h3>${title}</h3><p>${desc}</p><button class="btn primary g-open" data-page="${page}">Abrir ${title.toLowerCase()}</button></article>`).join('')}</div>
    ${gestaoAllowed('insumos') ? `<div class="card soft g-buy"><div><h3>Precisa comprar insumos?</h3><p>Em <b>Compra de insumos</b> você vê o que está acabando no estoque, compara as cotações dos fornecedores e o último preço pago, e pesquisa o menor preço. A compra é feita com o fornecedor; o sistema só organiza a decisão.</p></div><button class="btn" id="gGoInputs">Abrir compra de insumos</button></div>` : ''}
    ${ceo || tools.length === 5 ? '' : '<p class="muted">As demais ferramentas dependem de liberação do CEO (Usuários > Permissões do ADM).</p>'}`;
  $$('.g-open').forEach(b => b.onclick = () => goToPage(b.dataset.page));
  if ($('#gGoInputs')) $('#gGoInputs').onclick = () => goToPage('insumos');
}

// ---------- Compra de insumos: o que está acabando, no menor preço ----------
let gInputsFilter = 'low';
const G_LEVEL = { out: ['red', 'Sem estoque'], low: ['red', 'Abaixo do mínimo'], near: ['gold', 'Perto do mínimo'], ok: ['green', 'Em dia'] };
function renderInputs() {
  setHeader('INSUMOS', 'Compra de insumos');
  const farm = gestaoFarmOrNotice(); if (!farm) return;
  const activity = selectedType();
  const all = FarmManagement.shoppingList(farm, activity);
  const rows = gInputsFilter === 'all' ? all : all.filter(r => r.level !== 'ok');
  const urgent = all.filter(r => r.level === 'out' || r.level === 'low').length;
  const watched = (farm.management.quotes || []).filter(q => q.link && q.autoUpdate !== false && !q.discarded).length;
  // Essencial: só o aviso do que está acabando e a pesquisa; cotações, preço automático e pedido de compra são do Profissional.
  const pq = typeof planHas !== 'function' || planHas('quotes'), po = typeof planHas !== 'function' || planHas('purchaseOrders');
  $('#pageContent').innerHTML = `
    <div class="hero-surface"><div><h2>Insumos acabando, no menor preço.</h2><p>Itens do estoque no mínimo ou perto dele, com a melhor cotação registrada, o último preço pago em nota e atalhos para pesquisar na internet. Vale para qualquer item de estoque: adubo, defensivo, diesel S10, sal mineral, ração, peças... O sistema não compra: a compra é feita com o fornecedor, e o pedido passa pela aprovação do CEO.</p></div></div>
    <div class="grid kpis">${ruralKpi('Abaixo do mínimo ou zerados', urgent)}${ruralKpi('Perto do mínimo', all.filter(r => r.level === 'near').length)}${ruralKpi('Itens no estoque', all.length)}${pq ? ruralKpi('Cotações com preço conferido sozinho', watched) : ''}</div>
    ${pq ? `<div class="card soft g-watch"><div><h3>Preço sempre atualizado</h3><p>Cotação com <b>link do site</b> do fornecedor: o sistema confere o preço da página sozinho a cada poucas horas e, se mudar, atualiza a cotação e mostra se <b>subiu ou caiu</b>. Cotação passada por <b>WhatsApp</b> ou telefone não tem página para conferir: depois de ${FarmManagement.QUOTE_STALE_DAYS} dias ela aparece como "peça de novo", com o botão que abre a conversa já com a pergunta pronta.</p></div><button class="btn" id="gCheckNow" ${watched ? '' : 'disabled'}>Conferir preços agora</button></div>` : planUpsell('quotes')}
    <div class="section-head"><div><h2>${gInputsFilter === 'all' ? 'Todos os itens' : 'Precisando de compra'}</h2><p>Defina o "Estoque mínimo" de cada item em Estoque para o sistema avisar.</p></div><div class="inline"><button class="btn" id="gFilter">${gInputsFilter === 'all' ? 'Mostrar só os que estão acabando' : 'Mostrar todos'}</button>${pq ? '<button class="btn" id="gNewQuoteFree">Nova cotação</button>' : ''}</div></div>
    ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Insumo</th><th>Situação</th><th>Em estoque / mínimo</th>${pq ? '<th>Melhor cotação</th>' : ''}<th>Último preço pago</th><th>Ações</th></tr></thead><tbody>${rows.map(r => {
      const [color, label] = G_LEVEL[r.level];
      const best = r.best ? `<b>${money(r.best.unitTotal)}</b> / ${gEsc(r.best.unit)} ${gPriceBadges(r.best)}<br><span class="muted">${gEsc(r.best.supplier)} · ${gQuoteSource(r.best)}${r.quotes.length > 1 ? ` · ${r.quotes.length} cotações` : ''}</span>` : '<span class="muted">Sem cotação</span>';
      const paid = r.lastPaid ? `${money(r.lastPaid.unitPrice)} / ${gEsc(r.lastPaid.unit || r.item.unit)}<br><span class="muted">NF ${gEsc(r.lastPaid.number)} · ${dateBR(r.lastPaid.date)}</span>` : '<span class="muted">—</span>';
      const links = FarmManagement.searchLinks(r.item.item).map(l => `<a class="btn small" href="${gEsc(l.url)}" target="_blank" rel="noopener noreferrer">${gEsc(l.label)}</a>`).join('');
      return `<tr><td><b>${gEsc(r.item.item)}</b><br><span class="muted">${gEsc(r.item.category || '')}</span></td><td><span class="badge ${color}">${label}</span></td><td>${gNum(r.item.quantity, 3)} ${gEsc(r.item.unit)}<br><span class="muted">mín. ${gNum(r.item.min, 3)}</span></td>${pq ? `<td>${best}</td>` : ''}<td>${paid}</td><td><div class="row-actions g-actions">${pq ? `<button class="btn small g-quote" data-id="${gEsc(r.item.id)}">Cotação</button>` : ''}${pq && r.quotes.length ? `<button class="btn small g-quotes" data-id="${gEsc(r.item.id)}">Comparar e atualizar</button>` : ''}${po ? `<button class="btn small primary g-order" data-id="${gEsc(r.item.id)}">Pedir compra</button>` : ''}${links}</div></td></tr>`;
    }).join('')}</tbody></table></div>` : `<div class="card empty">${gInputsFilter === 'all' ? 'Nenhum item de estoque nesta atividade.' : 'Nada acabando agora. Use "Mostrar todos" para ver o estoque inteiro.'}</div>`}`;
  $('#gFilter').onclick = () => { gInputsFilter = gInputsFilter === 'all' ? 'low' : 'all'; renderInputs(); };
  if ($('#gNewQuoteFree')) $('#gNewQuoteFree').onclick = () => gestaoQuoteDialog(farm, null);
  if ($('#gCheckNow')) $('#gCheckNow').onclick = () => gestaoCheckPrices(farm, '', $('#gCheckNow'));
  $$('.g-quote').forEach(b => b.onclick = () => gestaoQuoteDialog(farm, farm.stock.find(s => s.id === b.dataset.id)));
  $$('.g-quotes').forEach(b => b.onclick = () => gestaoCompareQuotes(farm, farm.stock.find(s => s.id === b.dataset.id)));
  $$('.g-order').forEach(b => { const r = all.find(x => x.item.id === b.dataset.id); b.onclick = () => gestaoOrderDialog(farm, r); });
}
const G_CHANNEL = { site: 'Site', whatsapp: 'WhatsApp', telefone: 'Telefone', visita: 'Visita', email: 'E-mail' };
// De onde veio o preço e quando foi conferido pela última vez.
function gQuoteSource(q) {
  const pc = q.priceCheck;
  if (q.link && q.autoUpdate !== false && pc?.checkedAt && ['ok', 'review'].includes(pc.status)) return `site conferido ${dateBR(String(pc.checkedAt).slice(0, 10))}`;
  return `${G_CHANNEL[q.channel] || (q.link ? 'Site' : 'Cotação')} · ${dateBR(FarmManagement.priceDate(q))}`;
}
// Selos: subiu/caiu desde o preço anterior, preço velho, conferência com problema.
function gPriceBadges(q) {
  const pc = q.priceCheck || {}, out = [], hist = q.priceHistory || [];
  // Variação desde o preço anterior do histórico (vale para a conferência do site e para o preço trocado à mão).
  const before = hist.length >= 2 ? Number(hist[hist.length - 2].unitPrice) : null;
  if (before && Math.abs(q.unitPrice - before) >= 0.005) out.push(`<span class="badge ${q.unitPrice > before ? 'red' : 'green'}" title="Antes: ${money(before)}">${q.unitPrice > before ? '▲ subiu' : '▼ caiu'} ${money(Math.abs(q.unitPrice - before))}</span>`);
  if (pc.status === 'review') out.push(`<span class="badge gold" title="${gEsc(pc.message)}">Site mostra ${money(pc.foundPrice)}: confira</span>`);
  else if (q.link && q.autoUpdate !== false && ['notFound', 'error', 'blocked'].includes(pc.status)) out.push(`<span class="badge gold" title="${gEsc(pc.message)}">Site não conferido</span>`);
  if (FarmManagement.quoteStale(q) && !(q.link && q.autoUpdate !== false && pc.status === 'ok')) out.push(`<span class="badge gold">Preço de ${FarmManagement.quoteAgeDays(q)} dias: peça de novo</span>`);
  return out.join(' ');
}
async function gestaoCheckPrices(farm, quoteId, button) {
  if (button) { button.disabled = true; button.textContent = 'Conferindo...'; }
  try {
    const r = await api('/api/precos/conferir', { method: 'POST', body: JSON.stringify({ farmId: farm.id, quoteId }) });
    await pullStateFromServer();
    toast(r.checked ? `${r.checked} preço(s) conferido(s): ${r.changed} mudou(aram)${r.review ? `, ${r.review} para você conferir` : ''}${r.failed ? `, ${r.failed} sem leitura` : ''}.` : 'Nenhuma cotação com link para conferir.');
  } catch (e) { toast(e.message); }
  finally { if (button && button.isConnected) { button.disabled = false; button.textContent = 'Conferir preços agora'; } }
}
async function gestaoQuoteDialog(farm, item) {
  const v = await askForm({ title: item ? `Cotação · ${item.item}` : 'Nova cotação', wide: true, text: 'Registre o preço que o fornecedor passou. Com o link da oferta, o sistema confere o preço do site sozinho e atualiza quando mudar. Com o WhatsApp do fornecedor, você pede o preço novo com um toque.', fields: [
    ...(item ? [] : [{ name: 'itemName', label: 'Produto', required: true, placeholder: 'Ex.: Diesel S10, Adubo 20-05-20' }]),
    { name: 'supplier', label: 'Fornecedor', required: true },
    { name: 'channel', label: 'Como o preço chegou', type: 'select', value: 'whatsapp', options: Object.entries(G_CHANNEL) },
    { name: 'unitPrice', label: 'Preço por unidade (R$)', type: 'number', min: '0.01', step: '0.01', required: true },
    { name: 'unit', label: 'Unidade', value: item?.unit || '', required: true, placeholder: 'kg, L, saco, t...', hint: 'Com link: use a mesma unidade do anúncio (ex.: saco de 50 kg).' },
    { name: 'quantity', label: 'Quantidade cotada (opcional)', type: 'number', min: '0.001', step: '0.001' },
    { name: 'freight', label: 'Frete total (R$, opcional)', type: 'number', min: '0', step: '0.01' },
    { name: 'date', label: 'Data da cotação', type: 'date', value: todayISO(), required: true },
    { name: 'validUntil', label: 'Válida até (opcional)', type: 'date' },
    { name: 'link', label: 'Link da oferta no site (opcional, https://)', placeholder: 'https://...' },
    { name: 'autoUpdate', label: 'Conferir o preço do link sozinho', type: 'select', value: 'true', options: [['true', 'Sim, atualizar quando o site mudar'], ['false', 'Não']] },
    { name: 'whatsapp', label: 'WhatsApp do fornecedor (opcional)', type: 'tel', placeholder: 'DDD + número, ex.: 35999998888' },
    { name: 'notes', label: 'Observações', type: 'textarea', wide: true, placeholder: 'Prazo de entrega, forma de pagamento...' }
  ] });
  if (!v) return;
  const quote = { id: uid(), activity: selectedType(), stockId: item?.id || '', itemName: item?.item || String(v.itemName || '').trim(), supplier: String(v.supplier).trim(), channel: v.channel, unitPrice: Number(v.unitPrice), unit: String(v.unit).trim(), date: v.date, notes: String(v.notes || '').trim() };
  if (v.quantity) quote.quantity = Number(v.quantity);
  if (v.freight) quote.freight = Number(v.freight);
  if (v.validUntil) quote.validUntil = v.validUntil;
  if (String(v.link || '').trim()) { quote.link = String(v.link).trim(); quote.autoUpdate = v.autoUpdate !== 'false'; }
  const phone = String(v.whatsapp || '').replace(/\D/g, '');
  if (phone) quote.whatsapp = phone;
  if (gestaoChange(farm, f => f.management.quotes.push(quote))) {
    toast(quote.link && quote.autoUpdate ? 'Cotação registrada. O preço do site será conferido em seguida.' : 'Cotação registrada.');
    renderInputs();
    if (quote.link && quote.autoUpdate) setTimeout(() => gestaoCheckPrices(farm, quote.id, null), 1500);
  }
}
// Preço novo à mão (ex.: o fornecedor respondeu no WhatsApp). Entra no histórico da cotação.
async function gestaoNewPrice(farm, q) {
  const v = await askForm({ title: `Preço novo · ${q.supplier}`, text: `${q.itemName}. Preço atual: ${money(q.unitPrice)} / ${q.unit}.`, fields: [
    { name: 'unitPrice', label: 'Preço por unidade (R$)', type: 'number', min: '0.01', step: '0.01', value: q.priceCheck?.status === 'review' ? q.priceCheck.foundPrice : '', required: true, autofocus: true },
    { name: 'validUntil', label: 'Válida até (opcional)', type: 'date', value: q.validUntil || '' }
  ] });
  if (!v) return;
  if (gestaoChange(farm, f => { const x = f.management.quotes.find(y => y.id === q.id); if (!x) return; x.unitPrice = Number(v.unitPrice); x.date = todayISO(); if (v.validUntil) x.validUntil = v.validUntil; else delete x.validUntil; })) { toast('Preço atualizado.'); renderInputs(); }
}
async function gestaoCompareQuotes(farm, item) {
  const quotes = FarmManagement.quotesFor(farm, item);
  const history = q => (q.priceHistory || []).slice(-6).reverse().map(h => `${dateBR(String(h.at).slice(0, 10))}: ${money(h.unitPrice)}${h.source === 'auto' ? ' (site)' : ''}`).join('<br>');
  const pending = openDialog(() => `<form class="dlg dlg-wide" role="dialog" aria-modal="true" aria-labelledby="dlgTitle"><h3 id="dlgTitle">Cotações · ${gEsc(item.item)}</h3><p>Do menor para o maior preço por unidade, já com o frete. Cotações vencidas não aparecem.</p><input type="hidden" name="act">
    <div class="table-wrap"><table><thead><tr><th>Fornecedor</th><th>Preço/un.</th><th>Com frete</th><th>Origem do preço</th><th>Histórico</th><th>Validade</th><th>Ações</th></tr></thead><tbody>${quotes.map((q, i) => {
      const wa = FarmManagement.whatsappLink(q, item.item);
      return `<tr><td>${i === 0 ? '<span class="badge green">Menor</span> ' : ''}<b>${gEsc(q.supplier)}</b>${q.link ? `<br><a href="${gEsc(q.link)}" target="_blank" rel="noopener noreferrer">ver oferta</a>` : ''}${q.notes ? `<br><span class="muted">${gEsc(q.notes)}</span>` : ''}</td><td>${money(q.unitPrice)} / ${gEsc(q.unit)}<br>${gPriceBadges(q)}</td><td>${money(q.unitTotal)}</td><td>${gQuoteSource(q)}${q.priceCheck?.message && q.priceCheck.status !== 'ok' ? `<br><span class="muted">${gEsc(q.priceCheck.message)}</span>` : ''}</td><td class="muted">${history(q) || '—'}</td><td>${q.validUntil ? dateBR(q.validUntil) : '—'}</td><td><div class="row-actions">${wa ? `<a class="btn small" href="${gEsc(wa)}" target="_blank" rel="noopener noreferrer">Pedir preço no WhatsApp</a>` : ''}${q.link && q.autoUpdate !== false ? `<button type="button" class="btn small g-act" data-act="check:${gEsc(q.id)}">Conferir site</button>` : ''}<button type="button" class="btn small g-act" data-act="price:${gEsc(q.id)}">Preço novo</button></div></td></tr>`;
    }).join('')}</tbody></table></div>
    <div class="dlg-actions"><button type="submit" class="btn primary">Fechar</button></div></form>`);
  const form = document.querySelector('.dlg-back:not(.closing) form');
  form?.querySelectorAll('.g-act').forEach(b => b.onclick = () => { form.elements.act.value = b.dataset.act; form.requestSubmit(); });
  const out = await pending;
  const [act, id] = String(out?.act || '').split(':');
  const q = quotes.find(x => x.id === id);
  if (!q) return;
  if (act === 'price') return gestaoNewPrice(farm, q);
  if (act === 'check') { await gestaoCheckPrices(farm, q.id, null); renderInputs(); }
}
async function gestaoOrderDialog(farm, row) {
  const best = row?.best;
  const v = await askForm({ title: `Pedido de compra · ${row.item.item}`, text: 'O pedido vai para aprovação do CEO. A compra em si é feita com o fornecedor.', fields: [
    { name: 'quantity', label: `Quantidade (${row.item.unit})`, type: 'number', min: '0.001', step: '0.001', value: row.suggestedQty || '', required: true, hint: row.suggestedQty ? 'Sugestão: o suficiente para chegar ao dobro do mínimo.' : '' },
    { name: 'supplier', label: 'Fornecedor', value: best?.supplier || '' },
    { name: 'unitPrice', label: 'Preço por unidade (R$)', type: 'number', min: '0.01', step: '0.01', value: best ? best.unitTotal : '' },
    { name: 'justification', label: 'Por que comprar', type: 'textarea', value: row.level === 'ok' ? '' : `${G_LEVEL[row.level][1]}: ${gNum(row.item.quantity, 3)} ${row.item.unit} (mínimo ${gNum(row.item.min, 3)}).`, required: true }
  ] });
  if (!v) return;
  const item = { stockId: row.item.id, name: row.item.item, quantity: Number(v.quantity), unit: row.item.unit };
  if (v.unitPrice) item.unitPrice = Number(v.unitPrice);
  const order = { id: uid(), activity: selectedType(), date: todayISO(), items: [item], supplier: String(v.supplier || '').trim(), justification: String(v.justification).trim(), status: 'pending', quoteId: best?.id || '' };
  if (gestaoChange(farm, f => f.management.purchaseOrders.push(order))) { toast('Pedido enviado para aprovação.'); goToPage('pedidos-compra'); }
}

// ---------- Pedidos de compra ----------
const G_ORDER = { pending: ['gold', 'Aguardando aprovação'], approved: ['green', 'Aprovado'], rejected: ['red', 'Recusado'], received: ['green', 'Recebido'], canceled: ['', 'Cancelado'] };
function renderPurchaseOrders() {
  setHeader('FINANCEIRO E FISCAL', 'Pedidos de compra');
  const farm = gestaoFarmOrNotice(); if (!farm) return;
  const ceo = currentUser.role === 'ceo', me = currentUser.name || currentUser.username;
  // ADM aprova até a alçada definida pelo CEO (Usuários › Permissões do ADM); acima disso, só o CEO.
  const limit = currentUser.role === 'adm' ? AdmAccess.approvalLimit(data) : 0, canDecide = o => ceo || (limit > 0 && FarmManagement.orderTotal(o) != null && FarmManagement.orderTotal(o) <= limit);
  const orders = farm.management.purchaseOrders.filter(o => (o.activity || 'coffee') === selectedType()).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const total = o => o.items.reduce((n, i) => n + (i.unitPrice ? i.unitPrice * i.quantity : 0), 0);
  $('#pageContent').innerHTML = `
    <div class="section-head" style="margin-top:0">${gestaoBack()}<button class="btn primary" id="gNewOrder">Novo pedido</button></div>
    <div class="hero-surface"><div><h2>Organizar e aprovar o que a fazenda vai comprar.</h2><p>Pedidos de compra servem para organizar e aprovar internamente; a compra não é feita pelo sistema. O CEO aprova ou recusa. Quando o material chega, marque "Recebido": a quantidade entra no estoque uma única vez.</p></div></div>
    <div class="grid kpis">${ruralKpi('Aguardando aprovação', orders.filter(o => o.status === 'pending').length)}${ruralKpi('Aprovados a receber', orders.filter(o => o.status === 'approved').length)}${ruralKpi('Valor aprovado a receber', money(orders.filter(o => o.status === 'approved').reduce((n, o) => n + total(o), 0)))}</div>
    ${orders.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Itens</th><th>Fornecedor</th><th>Valor estimado</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${orders.map(o => {
      const [c, l] = G_ORDER[o.status];
      const acts = [
        o.status === 'pending' && canDecide(o) ? `<button class="btn small primary g-approve" data-id="${gEsc(o.id)}">Aprovar</button><button class="btn small danger g-reject" data-id="${gEsc(o.id)}">Recusar</button>` : '',
        o.status === 'approved' ? `<button class="btn small g-receive" data-id="${gEsc(o.id)}">Recebido</button>` : '',
        (o.status === 'pending' && (ceo || o.requestedBy === me)) || (o.status === 'approved' && ceo) ? `<button class="btn small g-cancel" data-id="${gEsc(o.id)}">Cancelar</button>` : ''
      ].join('');
      return `<tr><td>${dateBR(o.date)}<br><span class="muted">${gEsc(o.requestedBy || '')}</span></td><td>${o.items.map(i => `${gNum(i.quantity, 3)} ${gEsc(i.unit)} · <b>${gEsc(i.name)}</b>${i.unitPrice ? ` (${money(i.unitPrice)}/${gEsc(i.unit)})` : ''}`).join('<br>')}<br><span class="muted">${gEsc(o.justification)}</span></td><td>${gEsc(o.supplier || '—')}</td><td>${total(o) ? money(total(o)) : '—'}</td><td><span class="badge ${c}">${l}</span>${o.decidedBy ? `<br><span class="muted">${gEsc(o.decidedBy)}${o.decisionNote ? ': ' + gEsc(o.decisionNote) : ''}</span>` : ''}</td><td><div class="row-actions">${acts || '—'}</div></td></tr>`;
    }).join('')}</tbody></table></div>` : '<div class="card empty">Nenhum pedido de compra. Em "Compra de insumos", use "Pedir compra" no item que está acabando.</div>'}`;
  bindBack();
  $('#gNewOrder').onclick = async () => {
    const stock = (farm.stock || []).filter(s => (s.activity || 'coffee') === selectedType());
    const v = await askForm({ title: 'Novo pedido de compra', text: 'O pedido vai para aprovação do CEO.', fields: [
      { name: 'stockId', label: 'Item do estoque', type: 'select', options: [['', 'Outro (digitar abaixo)'], ...stock.map(s => [s.id, s.item])] },
      { name: 'name', label: 'Produto (se não for do estoque)' },
      { name: 'quantity', label: 'Quantidade', type: 'number', min: '0.001', step: '0.001', required: true },
      { name: 'unit', label: 'Unidade', required: true, placeholder: 'kg, L, saco...' },
      { name: 'unitPrice', label: 'Preço por unidade (R$, opcional)', type: 'number', min: '0.01', step: '0.01' },
      { name: 'supplier', label: 'Fornecedor (opcional)' },
      { name: 'justification', label: 'Por que comprar', type: 'textarea', required: true }
    ] });
    if (!v) return;
    const s = stock.find(x => x.id === v.stockId);
    const item = { name: s ? s.item : String(v.name || '').trim(), quantity: Number(v.quantity), unit: String(v.unit).trim() };
    if (s) item.stockId = s.id;
    if (v.unitPrice) item.unitPrice = Number(v.unitPrice);
    if (gestaoChange(farm, f => f.management.purchaseOrders.push({ id: uid(), activity: selectedType(), date: todayISO(), items: [item], supplier: String(v.supplier || '').trim(), justification: String(v.justification).trim(), status: 'pending' }))) { toast('Pedido enviado para aprovação.'); renderPurchaseOrders(); }
  };
  const setStatus = async (id, status, opts = {}) => {
    let note = '';
    if (opts.askNote) { const v = await askForm({ title: opts.title, fields: [{ name: 'note', label: opts.label, type: 'textarea', required: !!opts.required }] }); if (!v) return; note = String(v.note || '').trim(); }
    else if (opts.confirm && !(await ask(opts.confirm, { title: opts.title, okText: opts.ok || 'Confirmar' }))) return;
    if (gestaoChange(farm, f => { const o = f.management.purchaseOrders.find(x => x.id === id); o.status = status; if (note) o.decisionNote = note; })) { toast(opts.done); renderPurchaseOrders(); }
  };
  $$('.g-approve').forEach(b => b.onclick = () => setStatus(b.dataset.id, 'approved', { askNote: true, title: 'Aprovar pedido', label: 'Observação (opcional)', done: 'Pedido aprovado.' }));
  $$('.g-reject').forEach(b => b.onclick = () => setStatus(b.dataset.id, 'rejected', { askNote: true, title: 'Recusar pedido', label: 'Motivo', required: true, done: 'Pedido recusado.' }));
  $$('.g-receive').forEach(b => b.onclick = () => setStatus(b.dataset.id, 'received', { confirm: 'Confirmar que o material chegou? Os itens ligados ao estoque terão a quantidade somada (uma única vez).', title: 'Material recebido', ok: 'Recebido', done: 'Recebimento registrado no estoque.' }));
  $$('.g-cancel').forEach(b => b.onclick = () => setStatus(b.dataset.id, 'canceled', { confirm: 'Cancelar este pedido? Ele continua no histórico.', title: 'Cancelar pedido', ok: 'Cancelar pedido', done: 'Pedido cancelado.' }));
}

// ---------- Financeiro: contas a pagar (e atalhos para receber, custos e rateios) ----------
function renderFinanceHub() {
  setHeader('FINANCEIRO E FISCAL', 'Contas a pagar e receber');
  const farm = gestaoFarmOrNotice(); if (!farm) return;
  const activity = selectedType();
  const list = farm.management.payables.filter(p => p.activity === activity).slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const open = list.filter(p => p.status === 'open'), late = open.filter(p => p.dueDate < todayISO());
  $('#pageContent').innerHTML = `
    <div class="section-head" style="margin-top:0">${gestaoBack()}<div class="inline"><button class="btn" id="gGoCosts">Resultados e custos</button><button class="btn" id="gGoBalance">Resumo financeiro</button><button class="btn primary" id="gNewPayable">Nova conta a pagar</button></div></div>
    <div class="hero-surface"><div><h2>Contas a pagar e receber, custos e rateios.</h2><p>Registre as contas a pagar com vencimento e, se quiser, o rateio para uma safra ou lote. Ao marcar como paga, a saída é lançada uma vez no Financeiro. Contas a receber ficam na aba ao lado; custos operacionais e rateios em "Resultados e custos".</p></div></div>
    <div class="grid kpis">${ruralKpi('A pagar', money(open.reduce((n, p) => n + p.amount, 0)))}${ruralKpi('Vencido', money(late.reduce((n, p) => n + p.amount, 0)), late.length ? late.length + ' conta(s)' : '')}${ruralKpi('Pago no mês', money(list.filter(p => p.status === 'paid' && String(p.paidDate).slice(0, 7) === todayISO().slice(0, 7)).reduce((n, p) => n + p.amount, 0)))}</div>
    <div class="section-head"><h2>Contas a pagar</h2><button class="btn" id="gExportPay">Exportar CSV</button></div>
    ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Vencimento</th><th>Fornecedor / descrição</th><th>Rateio</th><th>Valor</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${list.map(p => `<tr><td>${dateBR(p.dueDate)}</td><td><b>${gEsc(p.supplier)}</b><br>${gEsc(p.description)}${p.document ? `<br><span class="muted">Doc. ${gEsc(p.document)}</span>` : ''}</td><td>${gEsc(opsTargetName(farm, p) || 'Sem rateio')}</td><td>${money(p.amount)}</td><td>${p.status === 'paid' ? `<span class="badge green">Paga em ${dateBR(p.paidDate)}</span>` : p.status === 'canceled' ? `<span class="badge">Cancelada</span><br><span class="muted">${gEsc(p.cancelReason || '')}</span>` : p.dueDate < todayISO() ? '<span class="badge red">Vencida</span>' : '<span class="badge gold">Em aberto</span>'}</td><td>${p.status === 'open' ? `<div class="row-actions"><button class="btn small primary g-pay" data-id="${gEsc(p.id)}">Pagar</button><button class="btn small g-paycancel" data-id="${gEsc(p.id)}">Cancelar</button></div>` : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty">Nenhuma conta a pagar registrada.</div>'}`;
  bindBack();
  if ($('#gGoReceive')) $('#gGoReceive').onclick = () => goToPage('recebimentos');
  $('#gGoCosts').onclick = () => goToPage('resultados');
  $('#gGoBalance').onclick = () => goToPage('financeiro');
  $('#gNewPayable').onclick = async () => {
    const v = await askForm({ title: 'Nova conta a pagar', wide: true, fields: [
      { name: 'supplier', label: 'Fornecedor', required: true },
      { name: 'description', label: 'Descrição', required: true, placeholder: 'Ex.: Adubo 20-05-20, frete, manutenção do trator' },
      { name: 'category', label: 'Categoria', placeholder: 'Ex.: Insumos, Combustível, Mão de obra' },
      { name: 'amount', label: 'Valor (R$)', type: 'number', min: '0.01', step: '0.01', required: true },
      { name: 'dueDate', label: 'Vencimento', type: 'date', value: todayISO(), required: true },
      { name: 'target', label: 'Rateio (safra ou lote)', type: 'select', options: opsTargetOptions(farm, activity) },
      { name: 'document', label: 'Nº do documento / boleto (opcional)' },
      { name: 'notes', label: 'Observações', type: 'textarea', wide: true }
    ] });
    if (!v) return;
    const p = { id: uid(), activity, date: todayISO(), supplier: String(v.supplier).trim(), description: String(v.description).trim(), category: String(v.category || '').trim(), amount: Math.round(Number(v.amount) * 100) / 100, dueDate: v.dueDate, status: 'open', document: String(v.document || '').trim(), notes: String(v.notes || '').trim() };
    if (v.target) p[activity === 'cattle' ? 'lotId' : 'cycleId'] = v.target;
    if (gestaoChange(farm, f => f.management.payables.push(p))) { toast('Conta a pagar registrada.'); renderFinanceHub(); }
  };
  $$('.g-pay').forEach(b => b.onclick = async () => {
    const p = farm.management.payables.find(x => x.id === b.dataset.id);
    const v = await askForm({ title: 'Marcar como paga', text: `${p.supplier} · ${money(p.amount)}. A saída será lançada no Financeiro; não lance de novo manualmente.`, fields: [{ name: 'paidDate', label: 'Data do pagamento', type: 'date', value: todayISO(), required: true }] });
    if (!v) return;
    if (gestaoChange(farm, f => { const x = f.management.payables.find(y => y.id === p.id); x.status = 'paid'; x.paidDate = v.paidDate; })) { toast('Pagamento registrado.'); renderFinanceHub(); }
  });
  $$('.g-paycancel').forEach(b => b.onclick = async () => {
    const v = await askForm({ title: 'Cancelar conta', fields: [{ name: 'reason', label: 'Motivo', type: 'textarea', required: true }] });
    if (!v) return;
    if (gestaoChange(farm, f => { const x = f.management.payables.find(y => y.id === b.dataset.id); x.status = 'canceled'; x.cancelReason = String(v.reason).trim(); })) { toast('Conta cancelada.'); renderFinanceHub(); }
  });
  $('#gExportPay').onclick = () => downloadCSV('contas-a-pagar.csv', ['Vencimento', 'Fornecedor', 'Descrição', 'Categoria', 'Rateio', 'Valor em reais', 'Situação', 'Pago em'], list.map(p => [p.dueDate, p.supplier, p.description, p.category || '', opsTargetName(farm, p) || 'Sem rateio', csvNumber(p.amount), p.status === 'paid' ? 'Paga' : p.status === 'canceled' ? 'Cancelada' : 'Em aberto', p.paidDate || '']));
}

// ---------- Fiscal: NF-e e MDF-e ----------
const G_FISCAL = { 'nfe-entrada': 'NF-e recebida (compra)', 'nfe-saida': 'NF-e emitida (venda)', 'mdfe': 'MDF-e (transporte)' };
function renderFiscal() {
  setHeader('FINANCEIRO E FISCAL', 'Notas fiscais');
  const farm = gestaoFarmOrNotice(); if (!farm) return;
  const docs = farm.management.fiscalDocs.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  $('#pageContent').innerHTML = `
    <div class="section-head" style="margin-top:0">${gestaoBack()}<div class="inline"><button class="btn primary" id="gImportXml">Importar XML da NF-e</button><button class="btn" id="gNewNfe">Registrar NF-e</button><button class="btn" id="gNewMdfe">Registrar MDF-e</button></div></div>
    <div class="hero-surface"><div><h2>Emitir e receber notas fiscais (NF-e e MDF-e).</h2><p>Importe o XML das NF-e recebidas dos fornecedores e registre as que a fazenda emitiu e os MDF-e de transporte. A emissão e a transmissão oficiais à SEFAZ são feitas no emissor autorizado, com o certificado digital da fazenda; aqui as notas ficam organizadas, e o preço pago em cada item alimenta a "Compra de insumos".</p></div></div>
    <div class="grid kpis">${ruralKpi('NF-e recebidas', docs.filter(d => d.kind === 'nfe-entrada' && !d.canceled).length)}${ruralKpi('NF-e emitidas', docs.filter(d => d.kind === 'nfe-saida' && !d.canceled).length)}${ruralKpi('MDF-e', docs.filter(d => d.kind === 'mdfe' && !d.canceled).length)}</div>
    ${docs.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Número</th><th>Emitente / destinatário</th><th>Valor</th><th>Itens</th><th></th></tr></thead><tbody>${docs.map(d => `<tr class="${d.canceled ? 'muted' : ''}"><td>${dateBR(d.date)}</td><td>${G_FISCAL[d.kind]}${d.canceled ? '<br><span class="badge">Cancelada</span>' : ''}</td><td>${gEsc(d.number)}${d.series ? '/' + gEsc(d.series) : ''}${d.key ? `<br><span class="muted g-key">${gEsc(d.key)}</span>` : ''}</td><td>${gEsc(d.party)}${d.partyDoc ? `<br><span class="muted">${gEsc(d.partyDoc)}</span>` : ''}${d.kind === 'mdfe' ? `<br><span class="muted">${gEsc(d.plate || '')} ${gEsc(d.route || '')}</span>` : ''}</td><td>${d.total != null ? money(d.total) : '—'}</td><td>${(d.items || []).length ? (d.items || []).slice(0, 3).map(i => gEsc(i.name)).join('<br>') + ((d.items || []).length > 3 ? `<br><span class="muted">+${d.items.length - 3}</span>` : '') : '—'}</td><td>${d.canceled ? '' : `<button class="btn small g-fcancel" data-id="${gEsc(d.id)}">Marcar cancelada</button>`}</td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty">Nenhum documento fiscal registrado.</div>'}`;
  bindBack();
  const save = (doc, msg) => { if (gestaoChange(farm, f => f.management.fiscalDocs.push(doc))) { toast(msg); renderFiscal(); } };
  $('#gImportXml').onclick = async () => {
    const file = await gestaoReadFile('.xml,text/xml,application/xml'); if (!file) return;
    let n; try { n = FarmManagement.parseNFeXML(file.text); } catch (e) { return toast(e.message); }
    const v = await askForm({ title: 'Importar esta NF-e?', text: `Nº ${n.number} de ${n.date ? dateBR(n.date) : '—'} · emitente ${n.emitName || '—'} · destinatário ${n.destName || '—'} · ${money(n.total)} · ${n.items.length} item(ns).`, okText: 'Importar', fields: [{ name: 'kind', label: 'Esta nota é', type: 'select', options: [['nfe-entrada', 'Recebida pela fazenda (compra)'], ['nfe-saida', 'Emitida pela fazenda (venda)']] }] });
    if (!v) return;
    const kind = v.kind === 'nfe-saida' ? 'nfe-saida' : 'nfe-entrada';
    save({ id: uid(), activity: selectedType(), kind, number: n.number || '—', series: n.series, key: /^\d{44}$/.test(n.key) ? n.key : '', date: RuralDomain.validDate(n.date) ? n.date : todayISO(), party: (kind === 'nfe-entrada' ? n.emitName : n.destName) || 'Não informado', partyDoc: kind === 'nfe-entrada' ? n.emitDoc : n.destDoc, total: n.total, items: n.items, source: 'xml', fileName: file.name.slice(0, 120) }, 'NF-e importada.');
  };
  const manual = async kind => {
    const v = await askForm({ title: kind === 'mdfe' ? 'Registrar MDF-e' : 'Registrar NF-e', wide: true, fields: [
      ...(kind === 'mdfe' ? [] : [{ name: 'kind', label: 'Tipo', type: 'select', options: [['nfe-entrada', G_FISCAL['nfe-entrada']], ['nfe-saida', G_FISCAL['nfe-saida']]] }]),
      { name: 'number', label: 'Número', required: true }, { name: 'series', label: 'Série' },
      { name: 'key', label: 'Chave de acesso (44 dígitos, opcional)', placeholder: 'Somente números' },
      { name: 'date', label: 'Data de emissão', type: 'date', value: todayISO(), required: true },
      { name: 'party', label: kind === 'mdfe' ? 'Transportador / destino' : 'Emitente ou destinatário', required: true },
      { name: 'partyDoc', label: 'CNPJ/CPF (opcional)' },
      { name: 'total', label: 'Valor total (R$)', type: 'number', min: '0', step: '0.01' },
      ...(kind === 'mdfe' ? [{ name: 'plate', label: 'Placa do veículo' }, { name: 'route', label: 'Percurso (UF de início → fim)' }] : []),
      { name: 'notes', label: 'Observações', type: 'textarea', wide: true }
    ] });
    if (!v) return;
    const doc = { id: uid(), activity: selectedType(), kind: kind === 'mdfe' ? 'mdfe' : v.kind, number: String(v.number).trim(), series: String(v.series || '').trim(), key: String(v.key || '').replace(/\D/g, ''), date: v.date, party: String(v.party).trim(), partyDoc: String(v.partyDoc || '').trim(), notes: String(v.notes || '').trim(), items: [], source: 'manual' };
    if (v.total !== '' && v.total != null) doc.total = Math.round(Number(v.total) * 100) / 100;
    if (kind === 'mdfe') { doc.plate = String(v.plate || '').trim().toUpperCase(); doc.route = String(v.route || '').trim(); }
    save(doc, 'Documento registrado.');
  };
  $('#gNewNfe').onclick = () => manual('nfe');
  $('#gNewMdfe').onclick = () => manual('mdfe');
  $$('.g-fcancel').forEach(b => b.onclick = async () => {
    const v = await askForm({ title: 'Marcar como cancelada', text: 'O documento continua no histórico, identificado como cancelado.', fields: [{ name: 'reason', label: 'Motivo', type: 'textarea', required: true }] });
    if (!v) return;
    if (gestaoChange(farm, f => { const d = f.management.fiscalDocs.find(x => x.id === b.dataset.id); d.canceled = true; d.cancelReason = String(v.reason).trim(); })) { toast('Documento marcado como cancelado.'); renderFiscal(); }
  });
}

// ---------- Conciliação bancária ----------
function renderReconciliation() {
  setHeader('FINANCEIRO E FISCAL', 'Conciliação bancária');
  const farm = gestaoFarmOrNotice(); if (!farm) return;
  const entries = farm.management.bankEntries.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const taken = new Set(entries.filter(e => e.financeId).map(e => e.financeId));
  const fin = id => (farm.finances || []).find(x => x.id === id);
  const pending = entries.filter(e => !e.financeId);
  $('#pageContent').innerHTML = `
    <div class="section-head" style="margin-top:0">${gestaoBack()}<button class="btn primary" id="gImportBank">Importar extrato (CSV ou OFX)</button></div>
    <div class="hero-surface"><div><h2>Conferir se os lançamentos batem com o extrato do banco.</h2><p>Importe o extrato exportado pelo internet banking (OFX, ou CSV com data;descrição;valor). O sistema sugere o lançamento do Financeiro com o mesmo valor e data próxima (até 3 dias); confirme cada um. O que sobrar mostra o que falta lançar ou o que entrou/saiu sem registro.</p></div></div>
    <div class="grid kpis">${ruralKpi('Linhas do extrato', entries.length)}${ruralKpi('Conciliadas', entries.length - pending.length)}${ruralKpi('Pendentes', pending.length, pending.length ? money(pending.reduce((n, e) => n + e.amount, 0)) + ' em aberto' : '')}</div>
    ${entries.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Extrato</th><th>Valor</th><th>Lançamento do Financeiro</th><th>Ação</th></tr></thead><tbody>${entries.map(e => {
      const linked = e.financeId && fin(e.financeId);
      const sug = !e.financeId ? FarmManagement.suggestMatch(farm, e, taken) : null;
      const show = x => `${dateBR(x.date)} · ${gEsc(x.description || x.category || '')} · ${money(x.value)}`;
      return `<tr><td>${dateBR(e.date)}</td><td>${gEsc(e.description)}</td><td class="${e.amount < 0 ? 'text-red' : 'text-green'}">${money(e.amount)}</td><td>${linked ? `<span class="badge green">Conciliado</span><br>${show(linked)}` : sug ? `<span class="badge gold">Sugestão</span><br>${show(sug)}` : '<span class="muted">Nenhum lançamento com esse valor e data</span>'}</td><td><div class="row-actions">${linked ? `<button class="btn small g-unmatch" data-id="${gEsc(e.id)}">Desfazer</button>` : `${sug ? `<button class="btn small primary g-match" data-id="${gEsc(e.id)}" data-fin="${gEsc(sug.id)}">Conciliar</button>` : ''}<button class="btn small g-pick" data-id="${gEsc(e.id)}">Escolher</button>`}</div></td></tr>`;
    }).join('')}</tbody></table></div>` : '<div class="card empty">Nenhum extrato importado.</div>'}`;
  bindBack();
  const link = (entryId, financeId, msg) => { if (gestaoChange(farm, f => { const e = f.management.bankEntries.find(x => x.id === entryId); if (financeId) e.financeId = financeId; else delete e.financeId; })) { toast(msg); renderReconciliation(); } };
  $('#gImportBank').onclick = async () => {
    const file = await gestaoReadFile('.ofx,.csv,.txt,text/csv'); if (!file) return;
    const rows = FarmManagement.parseStatement(file.text, file.name);
    if (!rows.length) return toast('Nenhuma linha reconhecida. Use OFX ou CSV com data;descrição;valor.');
    const existing = new Set(farm.management.bankEntries.map(e => e.fitid ? 'f' + e.fitid : `${e.date}|${e.amount}|${e.description}`));
    const fresh = rows.filter(r => !existing.has(r.fitid ? 'f' + r.fitid : `${r.date}|${r.amount}|${r.description}`));
    if (!fresh.length) return toast('Essas linhas já foram importadas.');
    const batch = file.name.slice(0, 60);
    if (gestaoChange(farm, f => fresh.forEach(r => f.management.bankEntries.push({ id: uid(), date: r.date, description: r.description, amount: r.amount, fitid: r.fitid, batch })))) { toast(`${fresh.length} linha(s) importada(s).`); renderReconciliation(); }
  };
  $$('.g-match').forEach(b => b.onclick = () => link(b.dataset.id, b.dataset.fin, 'Conciliado.'));
  $$('.g-unmatch').forEach(b => b.onclick = () => link(b.dataset.id, null, 'Conciliação desfeita.'));
  $$('.g-pick').forEach(b => b.onclick = async () => {
    const e = entries.find(x => x.id === b.dataset.id), type = e.amount >= 0 ? 'entrada' : 'saida';
    const options = (farm.finances || []).filter(x => x.type === type && !taken.has(x.id)).sort((a, c) => Math.abs(Date.parse(a.date) - Date.parse(e.date)) - Math.abs(Date.parse(c.date) - Date.parse(e.date))).slice(0, 80).map(x => [x.id, `${dateBR(x.date)} · ${x.description || x.category || ''} · ${money(x.value)}`]);
    if (!options.length) return toast(`Nenhum lançamento de ${type} livre no Financeiro.`);
    const v = await askForm({ title: 'Escolher lançamento', text: `${dateBR(e.date)} · ${e.description} · ${money(e.amount)}`, fields: [{ name: 'fin', label: 'Lançamento do Financeiro', type: 'select', options }] });
    if (v?.fin) link(e.id, v.fin, 'Conciliado.');
  });
}

// ---------- Contratos de venda ----------
function renderContracts() {
  setHeader('FINANCEIRO E FISCAL', 'Contratos de venda');
  const farm = gestaoFarmOrNotice(); if (!farm) return;
  const activity = selectedType();
  const list = farm.management.salesContracts.filter(c => c.activity === activity).slice().sort((a, b) => a.deliveryEnd.localeCompare(b.deliveryEnd));
  const bag = c => c.bagKg || 60;
  const qty = (c, kg) => activity === 'cattle' ? gNum(kg, 1) + ' kg' : gNum(kg / bag(c), 2) + ' sc';
  $('#pageContent').innerHTML = `
    <div class="section-head" style="margin-top:0">${gestaoBack()}<button class="btn primary" id="gNewContract">Novo contrato</button></div>
    <div class="hero-surface"><div><h2>Registrar a venda da produção para o comprador e controlar as entregas.</h2><p>Cada contrato guarda comprador, produto, quantidade, preço e o período de entrega. Registre cada entrega (romaneio) e acompanhe o saldo a entregar. Recebimentos continuam em "Contas a receber".</p></div></div>
    <div class="grid kpis">${ruralKpi('Contratos em aberto', list.filter(c => c.status === 'open').length)}${ruralKpi('A entregar', list.filter(c => c.status === 'open').length ? qty({ bagKg: 60 }, list.filter(c => c.status === 'open').reduce((n, c) => n + FarmManagement.contractBalance(c) * (60 / bag(c)), 0)) : '—')}${ruralKpi('Valor contratado em aberto', money(list.filter(c => c.status === 'open').reduce((n, c) => n + c.quantityKg * c.pricePerKg, 0)))}</div>
    ${list.length ? `<div class="grid two">${list.map(c => {
      const delivered = FarmManagement.contractDelivered(c), balance = FarmManagement.contractBalance(c), pct = c.quantityKg ? Math.min(100, delivered / c.quantityKg * 100) : 0;
      const late = c.status === 'open' && balance > 0 && c.deliveryEnd < todayISO();
      return `<article class="card g-contract"><div class="inline"><h3>${gEsc(c.buyer)}</h3><span class="badge ${c.status === 'open' ? (late ? 'red' : 'gold') : c.status === 'closed' ? 'green' : ''} right">${c.status === 'open' ? (late ? 'Entrega atrasada' : 'Em aberto') : c.status === 'closed' ? 'Encerrado' : 'Cancelado'}</span></div>
        <p>${gEsc(c.product)}${c.number ? ` · contrato ${gEsc(c.number)}` : ''}<br>${qty(c, c.quantityKg)} a ${activity === 'cattle' ? money(c.pricePerKg) + '/kg' : money(c.pricePerKg * bag(c)) + '/sc'} · total ${money(c.quantityKg * c.pricePerKg)}<br>Entrega de ${dateBR(c.deliveryStart)} a ${dateBR(c.deliveryEnd)}</p>
        <div class="g-progress"><span style="width:${pct.toFixed(1)}%"></span></div>
        <p class="muted">Entregue ${qty(c, delivered)} · falta ${qty(c, balance)}</p>
        ${(c.deliveries || []).length ? `<details><summary>${c.deliveries.length} entrega(s)</summary><ul>${c.deliveries.map(d => `<li>${dateBR(d.date)} · ${qty(c, d.kg)}${d.note ? ' · ' + gEsc(d.note) : ''}</li>`).join('')}</ul></details>` : ''}
        ${c.status === 'open' ? `<div class="row-actions">${balance > 0 ? `<button class="btn small primary g-deliver" data-id="${gEsc(c.id)}">Registrar entrega</button>` : ''}<button class="btn small g-close" data-id="${gEsc(c.id)}">Encerrar</button><button class="btn small g-ccancel" data-id="${gEsc(c.id)}">Cancelar</button></div>` : ''}
      </article>`;
    }).join('')}</div>` : '<div class="card empty">Nenhum contrato de venda.</div>'}`;
  bindBack();
  $('#gNewContract').onclick = async () => {
    const cycles = (farm.agriculture?.cycles || []).filter(c => c.activity === activity && !c.archived);
    const v = await askForm({ title: 'Novo contrato de venda', wide: true, fields: [
      { name: 'buyer', label: 'Comprador', required: true }, { name: 'number', label: 'Nº do contrato (opcional)' },
      { name: 'product', label: 'Produto', required: true, value: activity === 'cattle' ? 'Boi gordo' : '', placeholder: activity === 'coffee' ? 'Ex.: Café arábica bica corrida' : 'Ex.: Soja' },
      ...(activity === 'cattle' ? [] : [{ name: 'cycleId', label: 'Safra (opcional)', type: 'select', options: [['', 'Sem vínculo'], ...cycles.map(c => [c.id, c.name])] }, { name: 'bagKg', label: 'Peso da saca (kg)', type: 'number', min: '1', step: '0.01', value: 60, required: true }]),
      { name: 'quantity', label: activity === 'cattle' ? 'Quantidade (kg)' : 'Quantidade (sacas)', type: 'number', min: '0.01', step: '0.01', required: true },
      { name: 'price', label: activity === 'cattle' ? 'Preço por kg (R$)' : 'Preço por saca (R$)', type: 'number', min: '0.01', step: '0.01', required: true },
      { name: 'deliveryStart', label: 'Entrega a partir de', type: 'date', value: todayISO(), required: true },
      { name: 'deliveryEnd', label: 'Entrega até', type: 'date', value: todayISO(), required: true },
      { name: 'notes', label: 'Condições (frete, local de entrega, pagamento...)', type: 'textarea', wide: true }
    ] });
    if (!v) return;
    const bagKg = activity === 'cattle' ? null : Number(v.bagKg);
    const c = { id: uid(), activity, date: todayISO(), buyer: String(v.buyer).trim(), number: String(v.number || '').trim(), product: String(v.product).trim(), quantityKg: Math.round(Number(v.quantity) * (bagKg || 1) * 1000) / 1000, pricePerKg: Number(v.price) / (bagKg || 1), deliveryStart: v.deliveryStart, deliveryEnd: v.deliveryEnd, status: 'open', notes: String(v.notes || '').trim(), deliveries: [] };
    if (bagKg) c.bagKg = bagKg;
    if (v.cycleId) c.cycleId = v.cycleId;
    if (gestaoChange(farm, f => f.management.salesContracts.push(c))) { toast('Contrato registrado.'); renderContracts(); }
  };
  $$('.g-deliver').forEach(b => b.onclick = async () => {
    const c = farm.management.salesContracts.find(x => x.id === b.dataset.id), balance = FarmManagement.contractBalance(c), unit = activity === 'cattle' ? 1 : bag(c);
    const v = await askForm({ title: 'Registrar entrega', text: `Falta entregar ${qty(c, balance)}.`, fields: [
      { name: 'date', label: 'Data da entrega', type: 'date', value: todayISO(), required: true },
      { name: 'qty', label: activity === 'cattle' ? 'Peso entregue (kg)' : 'Sacas entregues', type: 'number', min: '0.01', step: '0.01', required: true },
      { name: 'note', label: 'Romaneio / observação' }
    ] });
    if (!v) return;
    if (gestaoChange(farm, f => f.management.salesContracts.find(x => x.id === c.id).deliveries.push({ id: uid(), date: v.date, kg: Math.round(Number(v.qty) * unit * 1000) / 1000, note: String(v.note || '').trim() }))) { toast('Entrega registrada.'); renderContracts(); }
  });
  const setStatus = async (id, status, msg) => { if (!(await ask(status === 'closed' ? 'Encerrar este contrato? Ele continua no histórico.' : 'Cancelar este contrato? Ele continua no histórico.', { title: status === 'closed' ? 'Encerrar contrato' : 'Cancelar contrato', okText: 'Confirmar' }))) return; if (gestaoChange(farm, f => { f.management.salesContracts.find(x => x.id === id).status = status; })) { toast(msg); renderContracts(); } };
  $$('.g-close').forEach(b => b.onclick = () => setStatus(b.dataset.id, 'closed', 'Contrato encerrado.'));
  $$('.g-ccancel').forEach(b => b.onclick = () => setStatus(b.dataset.id, 'canceled', 'Contrato cancelado.'));
}
