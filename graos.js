/* Módulo de Grãos (soja, milho e trigo).
 * As rotinas de safra também são reutilizadas pelo modo Café.
 * Carregado depois de rural-modules.js e antes de app.js. */
const GRAINS_STOCK = ["Sementes", "Tratamento de sementes", "Adubos", "Fertilizantes", "Defensivos", "Combustível", "Peças", "EPIs", "Sacaria", "Outros"];
const GRAINS_FINANCE = ["Venda de soja", "Venda de milho", "Venda de trigo", "Sementes", "Adubos", "Fertilizantes", "Defensivos", "Plantio", "Colheita", "Secagem", "Armazenagem", "Combustível", "Manutenção", "Mão de obra", "Frete", "Impostos", "Serviços", "Outros"];
let ruralProductionFilter = { crop: '', stage: '', search: '', archived: '' };
let ruralSeasonSelection=null,opsQualityView=false;

function ruralProductionRows() {
  const type = selectedType();
  return farmsInContext().flatMap(farm => (farm.agriculture?.cycles || [])
    .filter(c => c.activity === type)
    .map(cycle => ({ farm, cycle, stats: RuralDomain.cycleStats(farm, cycle) })));
}
// Cada safra usa seu próprio peso de saca; a média consolidada é ponderada pela área.
function ruralSacks(kg, cycle) { return Number(kg || 0) / (Number(cycle.bagKg) || 60); }
function ruralSackTotals(rows) {
  const total = { harvested: 0, available: 0, area: 0 };
  rows.forEach(r => { const stats=r.stats||RuralDomain.cycleStats(r.farm,r.cycle); total.harvested += ruralSacks(stats.harvestedKg,r.cycle); total.available += ruralSacks(stats.availableKg,r.cycle); total.area += Number(r.cycle.areaHa)||0; });
  total.average = total.area ? total.harvested / total.area : 0;
  return total;
}
function ruralAgricultureSummary() {
  const rows = ruralProductionRows(), totals = ruralSackTotals(rows);
  return ruralKpi('Safras cadastradas', rows.length, farmTypeLabel()) + ruralKpi('Saldo da produção', ruralNum(totals.available) + ' sacas', 'Colhido menos vendas; peso da saca de cada safra') + ruralKpi('Produção colhida', ruralNum(totals.harvested) + ' sacas', 'Soma das sacas de todas as safras') + ruralKpi('Média de produtividade',ruralNum(totals.average)+' sc/ha','Total de sacas dividido pela área das safras');
}
async function ruralCycleDialog(farm, existing = null) {
  const activity = selectedType();
  const v = await askForm({ title: existing ? 'Editar safra' : 'Nova safra de ' + farmTypeLabel(), wide: true, onReady:form=>bindVarieties(form,existing?.variety||''), fields: [
    { name: 'name', label: 'Identificação da safra', value: existing?.name || '', required: true, placeholder: 'Ex.: Soja 2026/27 · Baixada', autofocus: true },
    { name: 'campaign', label: 'Período / ano da safra', required: true, value: existing?.campaign || String(existing?.startDate || todayISO()).slice(0,4), placeholder: 'Ex.: 2026/27' },
    { name: 'crop', label: 'Cultura', type: 'select', options: RuralDomain.CROPS[activity], value: existing?.crop || RuralDomain.CROPS[activity][0] },
    { name: 'plotIds', label: 'Talhões da safra (Ctrl ou toque para selecionar vários)', type: 'multiselect', options: (farm.talhoes || []).map(p => [p.id,p.name]), value: existing ? RuralOps.plotIds(existing) : [], hint: 'Na colheita você escolhe qual talhão foi trabalhado.' },
    ...varietyFields(existing?.crop||RuralDomain.CROPS[activity][0],existing?.variety||''),
    { name: 'areaHa', label: 'Área desta safra (ha)', type: 'number', min: '0.001', step: '0.001', required: true, value: existing?.areaHa || '' },
    { name: 'startDate', label: 'Início da safra / plantio', type: 'date', required: true, value: existing?.startDate || todayISO() },
    { name: 'expectedDate', label: 'Previsão de colheita', type: 'date', value: existing?.expectedDate || '' },
    { name: 'stage', label: 'Etapa', type: 'select', options: RuralDomain.STAGES, value: existing?.stage || 'Planejada' },
    { name: 'bagKg', label: 'Peso de referência da saca (kg)', type: 'number', min: '0.01', step: '0.01', required: true, value: existing?.bagKg || 60 },
    // O ADM não vê o custo das safras já cadastradas (o servidor mantém o valor guardado); numa safra nova ele informa.
    ...(currentUser.role === 'adm' && existing ? [] : [{ name: 'plannedCost', label: 'Custo total planejado (R$)', type: 'number', min: '0', step: '0.01', required: true, value: existing?.plannedCost || 0, hint: 'Orçamento da safra. Não altera o balanço financeiro.' }]),
    { name: 'notes', label: 'Observações', type: 'textarea', wide: true, value: existing?.notes || '' }
  ] });
  if (!v) return;
  finishVariety(v);
  const hasMovements = existing && [...farm.agriculture.harvests, ...farm.agriculture.sales].some(m => m.cycleId === existing.id);
  if (hasMovements && (v.crop !== existing.crop)) return toast('A cultura fica preservada após o primeiro lançamento. O peso da saca é uma referência; os lançamentos permanecem em kg.');
  const cycle = { ...existing, ...v, plotId: v.plotIds?.[0] || '', id: existing?.id || uid(), activity, areaHa: Number(v.areaHa), bagKg: Number(v.bagKg), ...(v.plannedCost !== undefined ? { plannedCost: Number(v.plannedCost) } : {}), createdAt: existing?.createdAt || new Date().toISOString() };
  if (ruralChange(farm, f => { const a = f.agriculture; const i = a.cycles.findIndex(c => c.id === cycle.id); if (i < 0) a.cycles.push(cycle); else a.cycles[i] = cycle; })) {
    renderAgriculture(); toast('Safra salva.');
  }
}
function renderAgriculture() {
  if (selectedType() === 'cattle') return renderCattle();
  if(ruralSeasonSelection?.view==='details')return renderSeasonDetails(ruralSeasonSelection.farmId,ruralSeasonSelection.cycleId);
  if(ruralSeasonSelection)return renderSeasonHistory(ruralSeasonSelection.farmId,ruralSeasonSelection.cycleId,ruralSeasonSelection.filter);
  if(opsQualityView)return renderCoffeeQualities();
  const readOnly = currentUser.role === 'contribuinte';
  const activity = selectedType();
  const all = ruralProductionRows();
  const filter = ruralProductionFilter;
  // Ao alternar atividade, um filtro de cultura da atividade anterior não esconde todas as safras.
  if (!RuralDomain.CROPS[activity].includes(filter.crop)) filter.crop = '';
  const rows = all.filter(r => (filter.archived==='all'||(filter.archived==='yes'?r.cycle.archived:!r.cycle.archived)) && (!filter.crop || r.cycle.crop === filter.crop) && (!filter.stage || r.cycle.stage === filter.stage) && (!filter.search || `${r.cycle.name} ${r.farm.name} ${r.cycle.variety || ''}`.toLocaleLowerCase('pt-BR').includes(filter.search.toLocaleLowerCase('pt-BR'))));
  const sum = key => rows.reduce((n, r) => n + r.stats[key], 0);
  setHeader('PRODUÇÃO', activity === 'coffee' ? 'Safras e colheita de café' : 'Soja, milho e trigo');
  $('#pageContent').innerHTML = `
    <div class="hero-surface"><div><span class="eyebrow">${farmTypeLabel().toUpperCase()}</span><h2>Da safra à comercialização</h2><p>${activity === 'coffee' ? 'Registre café beneficiado/seco; não misture peso de café em coco ou cereja com o de café beneficiado.' : 'Registre o peso líquido seco, já descontadas impurezas e perdas.'}</p></div></div>
    ${!readOnly?opsToolbar():''}
    <form id="ruralFilters" class="card rural-filters"><label>Buscar<input name="search" value="${escapeHTML(filter.search)}" placeholder="Safra, variedade ou fazenda"></label><label>Cultura<select name="crop"><option value="">Todas</option>${RuralDomain.CROPS[activity].map(c => `<option ${filter.crop === c ? 'selected' : ''}>${escapeHTML(c)}</option>`).join('')}</select></label><label>Etapa<select name="stage"><option value="">Todas</option>${RuralDomain.STAGES.map(s => `<option ${filter.stage === s ? 'selected' : ''}>${escapeHTML(s)}</option>`).join('')}</select></label><label>Arquivo<select name="archived"><option value="">Ativas</option><option value="yes" ${filter.archived==='yes'?'selected':''}>Arquivadas</option><option value="all" ${filter.archived==='all'?'selected':''}>Todas</option></select></label><button class="btn primary">Filtrar</button></form>
    <div class="grid kpis">${ruralKpi('Safras no filtro', rows.length)}${ruralKpi('Colhido', ruralNum(ruralSackTotals(rows).harvested) + ' sacas')}${ruralKpi('Disponível', ruralNum(ruralSackTotals(rows).available) + ' sacas')}${ruralKpi('Média de produtividade', ruralNum(ruralSackTotals(rows).average)+' sc/ha')}${!readOnly ? ruralKpi('Vendas registradas', money(sum('revenue')), 'Valor comercial; recebimentos são lançados no Financeiro') : ''}</div>
    <div class="section-head"><div><h2>Safras</h2><p>Produção em sacas e produtividade média em sacas por hectare. Cada safra usa seu peso de saca cadastrado.</p></div><div class="row-actions">${!readOnly && !isGeneralView() ? '<button type="button" class="btn primary" id="ruralNewCycle">Nova safra</button>' : ''}${!readOnly?'<button type="button" class="btn" id="opsMultiFarmCycle">Safra em várias fazendas</button>':''}<button type="button" class="btn" id="ruralExport">Exportar CSV</button></div></div>
    ${!readOnly && isGeneralView() ? '<div class="card soft">Selecione uma fazenda no topo para cadastrar safras, colheitas e vendas. Aqui você acompanha o consolidado.</div>' : ''}
    <div class="grid two">${rows.map(({ farm, cycle: c, stats: s }) => `<article class="card rural-cycle"><div class="inline"><span class="badge green">${escapeHTML(c.crop)}</span><span class="badge">${escapeHTML(c.stage)}${c.archived?' · Arquivada':''}</span></div><h3>${escapeHTML(c.name)}</h3><p class="muted">${escapeHTML(farm.name)} · ${ruralNum(c.areaHa, 3)} ha · ${ruralNum(c.bagKg)} kg/saca${c.variety ? ' · ' + escapeHTML(c.variety) : ''}</p><dl class="rural-facts"><div><dt>Colhido</dt><dd>${ruralNum(ruralSacks(s.harvestedKg,c))} sacas</dd></div><div><dt>Saldo disponível</dt><dd>${ruralNum(ruralSacks(s.availableKg,c))} sacas</dd></div><div><dt>Produtividade</dt><dd>${ruralNum(s.yieldKgHa / c.bagKg)} sc/ha</dd></div><div><dt>Previsão de colheita</dt><dd>${c.expectedDate ? dateBR(c.expectedDate) : 'Não informada'}</dd></div>${!readOnly ? `<div><dt>Custo planejado / saca colhida</dt><dd>${s.costPerKg == null ? 'Aguardando colheita' : money(s.costPerKg * c.bagKg)}</dd></div>` : ''}</dl>${c.notes ? `<p class="muted">${escapeHTML(c.notes)}</p>` : ''}${readOnly?`<button class="btn small rural-season-details" data-farm="${farm.id}" data-id="${c.id}">Manejo e orientações</button>`:''}${!readOnly ? `<div class="row-actions"><button class="btn small rural-season-details" data-farm="${farm.id}" data-id="${c.id}">Qualidade e resultado</button><button class="btn small rural-season-history" data-farm="${farm.id}" data-id="${c.id}">Histórico da safra</button></div>` : ''}${!readOnly && !isGeneralView() ? `<div class="row-actions"><button class="btn small rural-harvest" data-id="${c.id}">Colheita</button><button class="btn small rural-sale" data-id="${c.id}">Venda</button><button class="btn small rural-cycle-edit" data-id="${c.id}">Editar</button><button class="btn small danger rural-cycle-del" data-id="${c.id}">${c.archived?'Reativar':'Arquivar'}</button></div>` : ''}</article>`).join('') || '<div class="card empty">Nenhuma safra neste filtro. Cadastre a primeira safra para acompanhar a produção.</div>'}</div>
    ${ruralMovementTables(rows, readOnly)}`;
  bindOpsToolbar();
  $$('.rural-season-details').forEach(b=>b.onclick=()=>renderSeasonDetails(b.dataset.farm,b.dataset.id));
  if($('#opsMultiFarmCycle'))$('#opsMultiFarmCycle').onclick=()=>opsMultiFarmCycle();
  $('#ruralFilters').onsubmit = e => { e.preventDefault(); ruralProductionFilter = Object.fromEntries(new FormData(e.target)); renderAgriculture(); };
  $('#ruralExport').onclick = () => downloadCSV('safras-' + activity + '.csv', ['Fazenda', 'Safra', 'Cultura', 'Etapa', 'Área ha', 'Peso da saca kg', 'Colhido sacas', 'Vendido sacas', 'Disponível sacas', 'Produtividade sc/ha'], rows.map(r => [r.farm.name, r.cycle.name, r.cycle.crop, r.cycle.stage, csvNumber(r.cycle.areaHa), csvNumber(r.cycle.bagKg), csvNumber(ruralSacks(r.stats.harvestedKg,r.cycle)), csvNumber(ruralSacks(r.stats.soldKg,r.cycle)), csvNumber(ruralSacks(r.stats.availableKg,r.cycle)), csvNumber(r.stats.yieldKgHa/r.cycle.bagKg)]));
  $$('.rural-season-history').forEach(btn => btn.onclick = () => renderSeasonHistory(btn.dataset.farm, btn.dataset.id));
  if (readOnly || isGeneralView()) return;
  const farm = activeFarm(); RuralDomain.farmData(farm);
  $('#ruralNewCycle').onclick = () => ruralCycleDialog(farm);
  const cycleOf = btn => farm.agriculture.cycles.find(c => c.id === btn.dataset.id && c.activity === activity);
  $$('.rural-cycle-edit').forEach(btn => btn.onclick = () => { const c = cycleOf(btn); if (c) ruralCycleDialog(farm, c); });
  $$('.rural-cycle-del').forEach(btn => btn.onclick = async () => {
    const c = cycleOf(btn); if (!c) return;
    if (ruralChange(farm, f => {f.agriculture.cycles.find(x=>x.id===c.id).archived=!c.archived;}))renderAgriculture();
  });
  $$('.rural-harvest').forEach(btn => btn.onclick = async () => {
    const c = cycleOf(btn); if (!c) return;
    const v = await askForm({ title: 'Colheita · ' + c.name, onReady:form=>bindQuantity(form,'netKg',c.bagKg), fields: [
      { name: 'date', label: 'Data', type: 'date', required: true, value: todayISO() },
      ...quantityFields('netKg',c.bagKg,'kg'),
      { name: 'plotId', label: 'Talhão colhido', type: 'select', options: [['','Sem talhão'],...RuralOps.plotIds(c).map(id=>[id,(farm.talhoes||[]).find(p=>p.id===id)?.name||id])], value:RuralOps.plotIds(c).length===1?RuralOps.plotIds(c)[0]:'' },
      { name:'finishesPlot', label:'Esta colheita conclui o talhão?', type:'select', options:[['no','Não, colheita parcial'],['yes','Sim, talhão concluído neste período']] },
      ...(activity==='coffee'?[{name:'qualityId',label:'Qualidade do café',type:'select',options:[['','Não informada'],...(data.coffeeQualities||[]).filter(q=>q.active!==false).map(q=>[q.id,q.name])],hint:'Opções cadastradas pelo CEO em Qualidades do café.'},{name:'productionLot',label:'Identificação do lote de café'},{name:'processing',label:'Beneficiamento / processo informado pela equipe'}]:[]),
      { name: 'moisture', label: 'Umidade medida (%) — opcional', type: 'number', min: 0, step: '0.01', hint: 'Apenas registro. O sistema não aplica desconto de umidade.' },
      { name: 'storage', label: 'Armazém / terreiro / lote de armazenamento' }, { name: 'notes', label: 'Observações', type: 'textarea' }
    ] });
    if (!v) return;
    // Carência de defensivo no talhão: CEO/ADM decide na hora (vai para o histórico); os demais lançam e fica para decidir.
    const grace = typeof Carencia !== 'undefined' && Carencia.harvestBlock(farm, v.plotId, v.date);
    let graceDecision = null;
    if (grace) {
      if (['ceo', 'adm'].includes(currentUser.role)) {
        const d = await askForm({ title: 'Talhão em carência', text: `O banho "${grace.order}" só libera a colheita em ${dateBR(grace.harvestFrom)}. Para registrar mesmo assim, informe o motivo: a decisão fica no histórico com o seu nome.`, fields: [{ name: 'note', label: 'Motivo', type: 'textarea', required: true }] });
        if (!d) return;
        graceDecision = { status: 'allowed', note: d.note.trim() };
      } else if (!await ask(`O talhão está em carência até ${dateBR(grace.harvestFrom)} (${grace.order}). A colheita fica marcada para o CEO ou ADM decidir. Registrar mesmo assim?`, { title: 'Talhão em carência', okText: 'Registrar marcado' })) return;
    }
    if (ruralChange(farm, f => {
      f.agriculture.harvests.push({ ...v, ...(graceDecision ? { graceDecision } : {}), finishesPlot:v.finishesPlot==='yes', qualityName:(data.coffeeQualities||[]).find(q=>q.id===v.qualityId)?.name||'', id: uid(), cycleId: c.id, netKg: RuralInputs.toKg(v.netKg,v.netKgUnit,c.bagKg), moisture: v.moisture === '' ? null : Number(v.moisture), recordedBy: currentUser.username, recordedByName: currentUser.name, createdAt: new Date().toISOString() });
      const cycle = f.agriculture.cycles.find(x => x.id === c.id);
      if (['Planejada', 'Em desenvolvimento'].includes(cycle.stage)) cycle.stage = 'Em colheita';
    })) { renderAgriculture(); toast('Colheita registrada.'); }
  });
  $$('.rural-sale').forEach(btn => btn.onclick = async () => {
    const c = cycleOf(btn); if (!c) return;
    const v = await askForm({ title: 'Venda · ' + c.name, text: `Disponível: ${ruralNum(RuralDomain.cycleStats(farm, c).availableKg / c.bagKg, 4)} sacas de ${ruralNum(c.bagKg)} kg. Registre o recebimento separadamente no Financeiro.`, onReady:form=>bindQuantity(form,'bags',c.bagKg), fields: [
      { name: 'date', label: 'Data da saída', type: 'date', required: true, value: todayISO() },
      ...quantityFields('bags',c.bagKg,'bags'),
      { name: 'pricePerBag', label: `Preço por saca de ${ruralNum(c.bagKg)} kg (R$)`, type: 'number', min: '0.01', step: '0.01', required: true },
      { name: 'buyer', label: 'Comprador', required: true }, { name: 'notes', label: 'Observações', type: 'textarea' }
    ] });
    if (v && ruralChange(farm, f => f.agriculture.sales.push({ id: uid(), cycleId: c.id, date: v.date, kg: RuralInputs.toKg(v.bags,v.bagsUnit,c.bagKg), bagKg: c.bagKg, pricePerKg: Number(v.pricePerBag) / c.bagKg, buyer: v.buyer, notes: v.notes, createdAt: new Date().toISOString() }))) { renderAgriculture(); toast('Venda registrada no controle de produção.'); }
  });
  $$('.rural-movement-del').forEach(btn => btn.onclick = async () => {
    const key = btn.dataset.kind === 'harvests' ? 'harvests' : 'sales';
    if(key==='sales'&&[...(farm.operations?.payments||[]),...(farm.operations?.deliveries||[])].some(r=>r.saleId===btn.dataset.id))return toast('A venda possui recebimentos ou entregas e precisa ser preservada.');
    if (await confirmDelete('Este lançamento de produção')) if (ruralChange(farm, f => { f.agriculture[key] = f.agriculture[key].filter(m => m.id !== btn.dataset.id); })) renderAgriculture();
  });
}
function ruralMovementTables(rows, readOnly) {
  const canDelete = !readOnly && !isGeneralView();
  // Venda já gravada não é apagada pelo ADM (o servidor mantém); o botão some para ele.
  const canDeleteKind = kind => canDelete && !(kind === 'sales' && currentUser.role === 'adm');
  const saleValue = m => m.pricePerKg === undefined ? '—' : money(m.kg * m.pricePerKg);
  const table = (title, kind) => {
    const list = rows.flatMap(({farm, cycle}) => (farm.agriculture?.[kind] || []).filter(m => m.cycleId === cycle.id).map(m => ({farm, cycle, m}))).sort((a, b) => b.m.date.localeCompare(a.m.date));
    return `<div class="section-head"><h2>${title}</h2></div>${list.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Fazenda / safra</th><th>Quantidade</th><th>${kind === 'harvests' ? 'Armazenamento' : 'Comprador / valor comercial'}</th>${canDeleteKind(kind) ? '<th>Ação</th>' : ''}</tr></thead><tbody>${list.map(({farm, cycle, m}) => `<tr><td>${dateBR(m.date)}</td><td>${escapeHTML(farm.name)}<br>${escapeHTML(cycle.name)}</td><td>${kind === 'harvests' ? ruralNum(ruralSacks(m.netKg,cycle))+' sacas de '+ruralNum(cycle.bagKg)+' kg' : ruralNum(m.kg/RuralOps.saleBagKg(farm,m),4)+' sacas de '+ruralNum(RuralOps.saleBagKg(farm,m))+' kg'}</td><td>${kind === 'harvests' ? escapeHTML([m.storage,m.productionLot,m.qualityName,m.processing].filter(Boolean).join(' · ') || '—') : escapeHTML(m.buyer || '—') + '<br>' + saleValue(m)}</td>${canDeleteKind(kind) ? `<td><button class="btn danger small rural-movement-del" data-id="${m.id}" data-kind="${kind}">Excluir</button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<div class="card empty">Nenhum lançamento neste filtro.</div>'}`;
  };
  return table('Histórico de colheitas', 'harvests') + (readOnly ? '' : table('Histórico de vendas', 'sales'));
}

function renderGrains() {
  if (selectedType() !== 'grains') return;
  return renderAgriculture();
}
