/* Telas de produção e manejo. Usam os mesmos dados, permissões e sincronização do app. */
const ruralNum = (n, digits = 2) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: digits });
function ruralActivityOptions(selected = 'both') {
  const licensed = SubscriptionDomain.licensed(data);
  const effective = RuralDomain.activitiesFor(selected).filter(a=>licensed.includes(a));
  const options = RuralDomain.PERMISSION_OPTIONS.filter(([value])=>RuralDomain.activitiesFor(value).every(a=>licensed.includes(a)));
  const selectedValue = options.find(([value])=>JSON.stringify(RuralDomain.activitiesFor(value))===JSON.stringify(effective))?.[0];
  return options.map(([value,label])=>`<option value="${value}" ${value===selectedValue?'selected':''}>${label}</option>`).join('');
}
function ruralPermissionLabel(value) {
  return RuralDomain.activitiesFor(value).filter(a => SubscriptionDomain.licensed(data).includes(a)).map(a => RuralDomain.LABELS[a]).join(' + ');
}
function ruralChange(farm, change) {
  try {
    const candidate = JSON.parse(JSON.stringify(farm));
    RuralDomain.farmData(candidate);
    change(candidate);
    RuralDomain.validateFarm(candidate, { maskedFinance: currentUser.role === 'adm' });
    RuralOps.validate({farms:[candidate],coffeeQualities:data.coffeeQualities||RuralOps.defaultQualities(),cattleStages:data.cattleStages||RuralOps.defaultStages()});
    farm.agriculture = candidate.agriculture;
    farm.cattle = candidate.cattle;
    saveData();
    return true;
  } catch (error) { toast(error.message); return false; }
}
function ruralKpi(label, value, foot = '') {
  return `<div class="card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></div>`;
}
function renderCattleManagement() {
  if (selectedType() !== 'cattle' || !['ceo', 'adm'].includes(currentUser.role)) return;
  const farms = farmsInContext();
  const lots = farms.flatMap(farm => (farm.cattle?.lots || []).map(lot => ({ farm, lot, perf: RuralDomain.lotPerformance(farm, lot) })));
  const events = farms.flatMap(farm => (farm.cattle?.healthEvents || []).map(event => ({ farm, event })));
  const pending = events.filter(r => r.event.status === 'scheduled');
  const overdue = pending.filter(r => r.event.date < todayISO());
  const herd = RuralDomain.herdStats(farms);
  setHeader('PECUÁRIA', 'Desempenho e agenda de manejo');
  $('#pageContent').innerHTML = `<div class="hero-surface"><div><span class="eyebrow">GADO</span><h2>Planeje o manejo e acompanhe o ganho</h2><p>Pesos vivos em kg. Projeções de ganho são estimativas a partir das duas últimas datas de pesagem, não garantias.</p></div></div>
    <div class="grid kpis">${ruralKpi('Cabeças', herd.heads)}${ruralKpi('Média atual estimada', herd.avgKg == null ? '—' : ruralNum(herd.avgKg, 1) + ' kg', `${herd.coveredHeads} de ${herd.heads} cabeças com pesagem`)}${ruralKpi('Manejos pendentes', pending.length)}${ruralKpi('Manejos atrasados', overdue.length)}</div>
    <div class="section-head"><h2>Desempenho por lote</h2><button class="btn" id="ruralCattleExport">Exportar CSV</button></div>
    <div class="table-wrap"><table><thead><tr><th>Fazenda / lote</th><th>Peso médio vivo</th><th>Ganho médio diário</th><th>Meta kg/cabeça</th><th>Estimativa até meta</th>${!isGeneralView() ? '<th>Ações</th>' : ''}</tr></thead><tbody>${lots.map(({farm, lot, perf:p}) => `<tr><td>${escapeHTML(farm.name)}<br><b>${escapeHTML(lot.name)}</b></td><td>${p.latest ? ruralNum(p.latest.avgKg, 1) + ' kg' : 'Sem pesagem'}</td><td>${p.dailyGainKg == null ? 'Aguardando duas datas' : ruralNum(p.dailyGainKg, 3) + ' kg/dia'}${p.interval ? `<br><small>Intervalo de ${p.interval} dias</small>` : ''}</td><td>${lot.targetKg > 0 ? ruralNum(lot.targetKg, 1) : 'Não definida'}</td><td>${p.daysToTarget == null ? 'Sem projeção' : p.daysToTarget === 0 ? 'Meta atingida' : p.daysToTarget + ' dias'}</td>${!isGeneralView() ? `<td><button class="btn small rural-lot-goal" data-id="${lot.id}">Editar lote / meta</button></td>` : ''}</tr>`).join('') || `<tr><td colspan="6">Cadastre um lote em Gado para começar.</td></tr>`}</tbody></table></div>
    <div class="section-head"><div><h2>Agenda de manejo</h2><p>Registre o planejamento definido pelo responsável técnico e a data de realização.</p></div>${!isGeneralView() ? '<button class="btn primary" id="ruralNewHealth">Agendar manejo</button>' : ''}</div>
    ${isGeneralView() ? '<div class="card soft">Selecione uma fazenda para agendar ou concluir manejos.</div>' : ''}
    <div class="grid two">${events.slice().sort((a,b) => (a.event.status === 'done') - (b.event.status === 'done') || a.event.date.localeCompare(b.event.date)).map(({farm,event:e}) => {
      const lot = farm.cattle.lots.find(l => l.id === e.lotId);
      return `<article class="card"><div class="inline"><span class="badge ${e.status === 'done' ? 'green' : e.date < todayISO() ? 'red' : 'gold'}">${e.status === 'done' ? 'Realizado' : e.date < todayISO() ? 'Atrasado' : 'Agendado'}</span><span class="badge">${escapeHTML(e.type)}</span></div><h3>${escapeHTML(e.title)}</h3><p>${escapeHTML(farm.name)} · ${escapeHTML(lot?.name || 'Lote removido')}</p><p class="muted">Previsto: ${dateBR(e.date)}${e.completedDate ? ' · realizado: ' + dateBR(e.completedDate) : ''}<br>Responsável: ${escapeHTML(e.responsible || 'Não informado')}</p>${e.notes ? `<p class="muted">${escapeHTML(e.notes)}</p>` : ''}${!isGeneralView() ? `<div class="row-actions">${e.status === 'scheduled' ? `<button class="btn small rural-health-done" data-id="${e.id}">Concluir</button>` : ''}<button class="btn small rural-health-edit" data-id="${e.id}">Editar</button><button class="btn small danger rural-health-del" data-id="${e.id}">Excluir</button></div>` : ''}</article>`;
    }).join('') || '<div class="card empty">Nenhum manejo agendado.</div>'}</div>`;
  $('#ruralCattleExport').onclick = () => downloadCSV('desempenho-gado.csv', ['Fazenda', 'Lote', 'Cabeças', 'Última pesagem', 'Peso médio kg', 'GMD kg/dia', 'Meta kg', 'Dias estimados até meta'], lots.map(r => [r.farm.name, r.lot.name, r.lot.heads, r.perf.latest?.date || '', r.perf.latest ? csvNumber(r.perf.latest.avgKg) : '', r.perf.dailyGainKg == null ? '' : csvNumber(r.perf.dailyGainKg), r.lot.targetKg || '', r.perf.daysToTarget ?? '']));
  if (isGeneralView()) return;
  const farm = activeFarm(); RuralDomain.farmData(farm);
  $('#ruralNewHealth').onclick = () => ruralHealthDialog(farm);
  $$('.rural-lot-goal').forEach(btn => btn.onclick = async () => {
    const lot = farm.cattle.lots.find(l => l.id === btn.dataset.id); if (!lot) return;
    const v = await askForm({ title: 'Editar lote e meta', text: 'A meta é um peso vivo médio por cabeça definido por você.', fields: [
      { name: 'name', label: 'Nome', value: lot.name, required: true },
      { name: 'category', label: 'Categoria', type: 'select', options: [...new Set([lot.category || 'Não informada', 'Bezerros', 'Bezerras', 'Garrotes', 'Novilhos', 'Novilhas', 'Vacas', 'Touros', 'Misto'])], value: lot.category || 'Não informada' },
      { name:'stageId',label:'Etapa do lote',type:'select',options:[['','Não informada'],...(data.cattleStages||RuralOps.defaultStages()).filter(s=>s.active!==false||s.id===lot.stageId).map(s=>[s.id,s.name])],value:lot.stageId||'' },
      { name: 'breed', label: 'Raça / cruzamento', value: lot.breed || '' },
      { name: 'targetKg', label: 'Meta (kg/cabeça) — zero remove a meta', type: 'number', min: 0, step: '0.1', value: lot.targetKg || 0 },
      { name: 'notes', label: 'Observações', type: 'textarea', value: lot.notes || '' }
    ] });
    if (v && ruralChange(farm, f => Object.assign(f.cattle.lots.find(l => l.id === lot.id), v, { targetKg: Number(v.targetKg) }))) { renderCattleManagement(); toast('Lote atualizado.'); }
  });
  $$('.rural-health-edit').forEach(btn => btn.onclick = () => { const e = farm.cattle.healthEvents.find(x => x.id === btn.dataset.id); if (e) ruralHealthDialog(farm, e); });
  $$('.rural-health-del').forEach(btn => btn.onclick = async () => {
    if (await confirmDelete('Este registro de manejo')) if (ruralChange(farm, f => { f.cattle.healthEvents = f.cattle.healthEvents.filter(e => e.id !== btn.dataset.id); })) renderCattleManagement();
  });
  $$('.rural-health-done').forEach(btn => btn.onclick = async () => {
    const v = await askForm({ title: 'Concluir manejo', fields: [{ name: 'completedDate', label: 'Data em que foi realizado', type: 'date', value: todayISO(), required: true }] });
    if (!v) return;
    if (v.completedDate > todayISO()) return toast('A realização não pode estar no futuro.');
    if (ruralChange(farm, f => { const e = f.cattle.healthEvents.find(x => x.id === btn.dataset.id); e.status = 'done'; e.completedDate = v.completedDate; })) { renderCattleManagement(); toast('Manejo concluído.'); }
  });
}
async function ruralHealthDialog(farm, existing = null) {
  if (!farm.cattle.lots.length) return toast('Cadastre um lote em Gado antes de agendar um manejo.');
  const v = await askForm({ title: existing ? 'Editar manejo' : 'Agendar manejo', fields: [
    { name: 'lotId', label: 'Lote', type: 'select', options: farm.cattle.lots.map(l => [l.id, l.name]), value: existing?.lotId || farm.cattle.lots[0].id },
    { name: 'type', label: 'Tipo de manejo', type: 'select', options: RuralDomain.HEALTH_TYPES, value: existing?.type || 'Inspeção' },
    { name: 'title', label: 'Descrição', required: true, value: existing?.title || '' },
    { name: 'date', label: 'Data prevista', type: 'date', required: true, value: existing?.date || todayISO() },
    { name: 'responsible', label: 'Responsável / técnico', value: existing?.responsible || '' },
    { name: 'notes', label: 'Orientações registradas pelo responsável', type: 'textarea', value: existing?.notes || '' }
  ] });
  if (!v) return;
  const event = { ...existing, ...v, id: existing?.id || uid(), status: existing?.status || 'scheduled', createdAt: existing?.createdAt || new Date().toISOString() };
  if (ruralChange(farm, f => { const i = f.cattle.healthEvents.findIndex(e => e.id === event.id); if (i < 0) f.cattle.healthEvents.push(event); else f.cattle.healthEvents[i] = event; })) { renderCattleManagement(); toast('Manejo salvo.'); }
}
