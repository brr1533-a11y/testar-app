/* Telas dos módulos de campo: Pós-colheita e Pragas (café), Reprodução e sanidade e Leite (gado). Regras em campo-domain.js. */
const fEsc = v => escapeHTML(v ?? '');
const fNum = (v, d = 1) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
// Grava na versão atual da fazenda (buscada pelo id), valida e salva; o servidor confere de novo.
function fieldChange(farm, change) {
  try {
    const live = data.farms.find(x => x.id === farm.id) || farm;
    const f = JSON.parse(JSON.stringify(live));
    FieldOps.init(f); change(f.field, f); FieldOps.validateFarm(f); if (typeof Medicamentos !== 'undefined') Medicamentos.validateFarm(f);
    Object.assign(live, f); saveData(); return true;
  } catch (e) { toast(e.message); return false; }
}
function fieldFarm() { const f = gestaoFarmOrNotice(); if (f) FieldOps.init(f); return f; }
const plotOptions = farm => [['', 'Sem talhão'], ...(farm.talhoes || []).map(t => [t.id, t.name])];
const lotOptions = (farm, empty = 'Sem lote') => [['', empty], ...(farm.cattle?.lots || []).map(l => [l.id, l.name || l.id])];
const plotName = (farm, id) => (farm.talhoes || []).find(t => t.id === id)?.name || '—';
const lotName = (farm, id) => (farm.cattle?.lots || []).find(l => l.id === id)?.name || '—';
const numOrNull = v => v === '' || v == null ? null : Number(v);
function fieldSection(title, desc, button, body) { return `<div class="section-head"><div><h2>${title}</h2>${desc ? `<p>${desc}</p>` : ''}</div>${button || ''}</div>${body}`; }
function fieldTable(head, rows, empty) { return rows.length ? `<div class="table-wrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : `<div class="card empty">${empty}</div>`; }

// Menu: entram para CEO e ADM conforme a atividade (o menu.js põe cada uma no seu grupo).
{
  const navBefore = navItems;
  navItems = function () {
    const items = navBefore();
    if (!currentUser || currentUser.role === 'contribuinte') return items;
    if (selectedType() === 'coffee') items.push(['pos-colheita', 'bean', 'Pós-colheita'], ['pragas', 'check', 'Pragas do café']);
    if (selectedType() === 'cattle') items.push(['reproducao', 'cattle', 'Reprodução e sanidade'], ['leite', 'cattle', 'Gado de leite']);
    items.push(['lcdpr', 'receipt', 'Livro Caixa (LCDPR)']);
    return items;
  };
}

// ---------- Pós-colheita do café ----------
const STAGE = { secando: ['gold', 'Secando'], seco: ['green', 'Seco'], tulha: ['', 'Na tulha'], beneficiado: ['green', 'Beneficiado'] };
function renderPostHarvest() {
  setHeader('LAVOURA', 'Pós-colheita do café');
  const farm = fieldFarm(); if (!farm) return;
  const lots = [...farm.field.postHarvest].sort((a, b) => String(b.harvestDate).localeCompare(String(a.harvestDate)));
  const done = lots.map(FieldOps.lotYield).filter(Boolean);
  const bags = done.reduce((n, y) => n + y.bags, 0), coco = lots.filter(l => l.processing).reduce((n, l) => n + l.processing.cocoKg, 0), benef = lots.filter(l => l.processing).reduce((n, l) => n + l.processing.beneficiadoKg, 0);
  const lpb = done.filter(y => y.litersPerBag);
  $('#pageContent').innerHTML = `<div class="hero-surface"><div><h2>Da colheita à saca beneficiada.</h2><p>Acompanhe cada lote no terreiro ou no secador, a entrada na tulha e o beneficiamento. O sistema calcula o rendimento: quanto do café em coco vira beneficiado e quantos litros de café da roça foram para cada saca.</p></div></div>
    <div class="grid kpis">${ruralKpi('Lotes secando', lots.filter(l => ['secando', 'seco'].includes(FieldOps.lotStage(l))).length)}${ruralKpi('Lotes na tulha', lots.filter(l => FieldOps.lotStage(l) === 'tulha').length)}${ruralKpi('Sacas beneficiadas', fNum(bags))}${ruralKpi('Rendimento médio', coco ? fNum(benef / coco * 100) + '%' : '—')}${ruralKpi('Litros por saca', lpb.length ? fNum(lpb.reduce((n, y) => n + y.litersPerBag, 0) / lpb.length, 0) : '—')}</div>
    ${fieldSection('Lotes', 'Um lote por talhão ou por dia de colheita, como a fazenda separa no terreiro.', '<button class="btn primary" id="phNew">Novo lote</button>', fieldTable(['Lote', 'Etapa', 'Colheita', 'Secagem', 'Tulha', 'Beneficiamento', 'Rendimento', 'Ações'], lots.map(l => {
      const [c, label] = STAGE[FieldOps.lotStage(l)], y = FieldOps.lotYield(l), d = l.drying, p = l.processing;
      return `<tr><td><b>${fEsc(l.name)}</b><br><span class="muted">${fEsc(plotName(farm, l.plotId))}</span></td><td><span class="badge ${c}">${label}</span></td><td>${dateBR(l.harvestDate)}${l.volumeL ? `<br><span class="muted">${fNum(l.volumeL, 0)} L</span>` : ''}</td><td>${d ? `${FieldOps.DRYING[d.method]}<br><span class="muted">${dateBR(d.start)}${d.end ? ' a ' + dateBR(d.end) : ''}${d.finalMoisture ? ' · ' + fNum(d.finalMoisture) + '% umid.' : ''}</span>` : '—'}</td><td>${l.storage ? `${fEsc(l.storage.place)}<br><span class="muted">${dateBR(l.storage.date)}</span>` : '—'}</td><td>${p ? `${fNum(p.cocoKg, 0)} kg coco → ${fNum(p.beneficiadoKg, 0)} kg<br><span class="muted">${dateBR(p.date)}</span>` : '—'}</td><td>${y ? `<b>${fNum(y.pct)}%</b><br><span class="muted">${fNum(y.bags)} sc${y.litersPerBag ? ' · ' + fNum(y.litersPerBag, 0) + ' L/sc' : ''}</span>` : '—'}</td><td><div class="row-actions"><button class="btn small ph-act" data-act="dry" data-id="${fEsc(l.id)}">Secagem</button><button class="btn small ph-act" data-act="store" data-id="${fEsc(l.id)}">Tulha</button><button class="btn small primary ph-act" data-act="process" data-id="${fEsc(l.id)}">Beneficiar</button></div></td></tr>`;
    }), 'Nenhum lote ainda. Crie um lote quando o café sair da lavoura.'))}`;
  $('#phNew').onclick = async () => {
    const v = await askForm({ title: 'Novo lote de café', fields: [{ name: 'name', label: 'Nome do lote', required: true, placeholder: 'Ex.: Talhão 3 · 12/06' }, { name: 'plotId', label: 'Talhão', type: 'select', options: plotOptions(farm) }, { name: 'harvestDate', label: 'Data da colheita', type: 'date', value: todayISO(), required: true }, { name: 'volumeL', label: 'Volume colhido (litros, opcional)', type: 'number', min: '0', step: '1' }, { name: 'method', label: 'Secagem', type: 'select', options: Object.entries(FieldOps.DRYING) }, { name: 'notes', label: 'Observações', type: 'textarea', wide: true }] });
    if (!v) return;
    if (fieldChange(farm, fd => fd.postHarvest.push({ id: uid(), activity: 'coffee', name: v.name.trim(), plotId: v.plotId || '', harvestDate: v.harvestDate, volumeL: numOrNull(v.volumeL), drying: { method: v.method, start: v.harvestDate }, notes: v.notes.trim() }))) { toast('Lote criado.'); renderPostHarvest(); }
  };
  $$('.ph-act').forEach(b => b.onclick = async () => {
    const lot = farm.field.postHarvest.find(l => l.id === b.dataset.id); if (!lot) return;
    let v, apply;
    if (b.dataset.act === 'dry') {
      v = await askForm({ title: 'Secagem · ' + lot.name, fields: [{ name: 'method', label: 'Método', type: 'select', value: lot.drying?.method || 'terreiro', options: Object.entries(FieldOps.DRYING) }, { name: 'start', label: 'Início', type: 'date', value: lot.drying?.start || lot.harvestDate, required: true }, { name: 'end', label: 'Fim (café seco)', type: 'date', value: lot.drying?.end || '' }, { name: 'finalMoisture', label: 'Umidade final (%)', type: 'number', min: '5', max: '70', step: '0.1', value: lot.drying?.finalMoisture ?? '', hint: 'O ponto usual de armazenamento é 11% a 12%.' }] });
      apply = l => { l.drying = { method: v.method, start: v.start, end: v.end || '', finalMoisture: numOrNull(v.finalMoisture) }; };
    } else if (b.dataset.act === 'store') {
      v = await askForm({ title: 'Tulha · ' + lot.name, fields: [{ name: 'place', label: 'Tulha / local', value: lot.storage?.place || '', required: true }, { name: 'date', label: 'Entrada', type: 'date', value: lot.storage?.date || todayISO(), required: true }] });
      apply = l => { l.storage = { place: v.place.trim(), date: v.date }; };
    } else {
      v = await askForm({ title: 'Beneficiamento · ' + lot.name, text: 'Informe o peso que entrou em coco e o que saiu beneficiado. O rendimento é calculado sozinho.', fields: [{ name: 'date', label: 'Data', type: 'date', value: lot.processing?.date || todayISO(), required: true }, { name: 'cocoKg', label: 'Café em coco (kg)', type: 'number', min: '0.001', step: '0.001', value: lot.processing?.cocoKg ?? '', required: true }, { name: 'beneficiadoKg', label: 'Café beneficiado (kg)', type: 'number', min: '0.001', step: '0.001', value: lot.processing?.beneficiadoKg ?? '', required: true }, { name: 'defectsPct', label: 'Catação / defeitos (%, opcional)', type: 'number', min: '0', max: '100', step: '0.1', value: lot.processing?.defectsPct ?? '' }] });
      apply = l => { l.processing = { date: v.date, cocoKg: Number(v.cocoKg), beneficiadoKg: Number(v.beneficiadoKg), defectsPct: numOrNull(v.defectsPct) }; };
    }
    if (!v) return;
    if (fieldChange(farm, fd => apply(fd.postHarvest.find(l => l.id === lot.id)))) { toast('Lote atualizado.'); renderPostHarvest(); }
  });
}

// ---------- Monitoramento de pragas do café ----------
function renderPests() {
  setHeader('LAVOURA', 'Pragas do café');
  const farm = fieldFarm(); if (!farm) return;
  const latest = FieldOps.latestPests(farm.field), alerts = latest.filter(FieldOps.pestAlert);
  const recent = [...farm.field.pests].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 200);
  $('#pageContent').innerHTML = `<div class="hero-surface"><div><h2>Broca, ferrugem e bicho-mineiro por talhão.</h2><p>Registre a amostragem de cada talhão. Quando a infestação passa do nível de controle usual, o talhão aparece em alerta para o agrônomo decidir o manejo.</p></div></div>
    <div class="grid kpis">${ruralKpi('Talhões em alerta', alerts.length)}${ruralKpi('Monitoramentos registrados', farm.field.pests.length)}${ruralKpi('Talhões monitorados', new Set(farm.field.pests.map(r => r.plotId)).size)}</div>
    <div class="card soft"><b>Níveis de controle usados no alerta:</b> ${Object.values(FieldOps.PESTS).filter(p => p.control != null).map(p => `${p.name} ${p.control}% (${p.unit})`).join(' · ')}. São referências gerais: confirme com o agrônomo da fazenda.</div>
    ${fieldSection('Situação atual', 'Última amostragem de cada praga em cada talhão.', `<button class="btn primary" id="pestNew" ${(farm.talhoes || []).length ? '' : 'disabled title="Cadastre os talhões primeiro"'}>Registrar monitoramento</button>`, fieldTable(['Talhão', 'Praga', 'Infestação', 'Data', 'Situação'], latest.sort((a, b) => b.infestationPct - a.infestationPct).map(r => `<tr><td>${fEsc(plotName(farm, r.plotId))}</td><td>${FieldOps.PESTS[r.pest].name}</td><td><b>${fNum(r.infestationPct)}%</b></td><td>${dateBR(r.date)}</td><td>${FieldOps.pestAlert(r) ? '<span class="badge red">Acima do nível de controle</span>' : '<span class="badge green">Abaixo do nível</span>'}</td></tr>`), (farm.talhoes || []).length ? 'Nenhum monitoramento ainda.' : 'Cadastre os talhões em Lavoura › Talhões para começar.'))}
    ${fieldSection('Histórico', '', '', fieldTable(['Data', 'Talhão', 'Praga', 'Infestação', 'Amostras', 'Obs.', 'Registrado por'], recent.map(r => `<tr><td>${dateBR(r.date)}</td><td>${fEsc(plotName(farm, r.plotId))}</td><td>${FieldOps.PESTS[r.pest].name}</td><td>${fNum(r.infestationPct)}%</td><td>${r.samples ?? '—'}</td><td>${fEsc(r.notes || '')}</td><td>${fEsc(r.recordedBy || 'Salvando')}</td></tr>`), 'Sem registros.'))}`;
  if ($('#pestNew')) $('#pestNew').onclick = async () => {
    const v = await askForm({ title: 'Monitoramento de pragas', fields: [{ name: 'plotId', label: 'Talhão', type: 'select', options: (farm.talhoes || []).map(t => [t.id, t.name]), required: true }, { name: 'pest', label: 'Praga ou doença', type: 'select', options: Object.entries(FieldOps.PESTS).map(([k, p]) => [k, p.name]) }, { name: 'date', label: 'Data', type: 'date', value: todayISO(), required: true }, { name: 'infestationPct', label: 'Infestação (%)', type: 'number', min: '0', max: '100', step: '0.1', required: true }, { name: 'samples', label: 'Plantas/frutos amostrados (opcional)', type: 'number', min: '1', step: '1' }, { name: 'notes', label: 'Observações', type: 'textarea', wide: true }] });
    if (!v) return;
    const row = { id: uid(), activity: 'coffee', plotId: v.plotId, pest: v.pest, date: v.date, infestationPct: Number(v.infestationPct), samples: numOrNull(v.samples), notes: v.notes.trim() };
    if (fieldChange(farm, fd => fd.pests.push(row))) { toast(FieldOps.pestAlert(row) ? 'Registrado. Atenção: acima do nível de controle.' : 'Monitoramento registrado.'); renderPests(); }
  };
}

// ---------- Reprodução, sanidade e GTA ----------
let reproView = 'repro';
function renderReproduction() {
  setHeader('PECUÁRIA', 'Reprodução e sanidade');
  const farm = fieldFarm(); if (!farm) return;
  const fd = farm.field, st = FieldOps.reproStats(fd), late = fd.vaccines.filter(v => FieldOps.vaccineStatus(v, todayISO()) === 'atrasada').length;
  const tabs = [['repro', 'Reprodução'], ['vacinas', 'Sanidade e vacinas'], ['gta', 'GTA']];
  let body = '';
  if (reproView === 'repro') {
    body = fieldSection('Estações de monta', 'Período de cobertura e lotes que participam.', '<button class="btn" id="rpSeason">Nova estação</button>', fieldTable(['Estação', 'Período', 'Lotes', 'Prenhez'], fd.seasons.map(s => { const x = FieldOps.reproStats(fd, s.id); return `<tr><td><b>${fEsc(s.name)}</b></td><td>${dateBR(s.start)} a ${dateBR(s.end)}</td><td>${(s.lotIds || []).map(id => fEsc(lotName(farm, id))).join(', ') || '—'}</td><td>${x.rate == null ? '—' : fNum(x.rate) + '% (' + x.pregnant + '/' + x.diagnosed + ')'}</td></tr>`; }), 'Nenhuma estação de monta cadastrada.'))
      + fieldSection('Eventos', 'Cobertura, inseminação, diagnóstico de prenhez, parto e desmame.', '<button class="btn primary" id="rpEvent">Registrar evento</button>', fieldTable(['Data', 'Evento', 'Lote / animal', 'Cabeças', 'Resultado', 'Obs.'], [...fd.reproduction].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 300).map(e => `<tr><td>${dateBR(e.date)}</td><td>${FieldOps.REPRO[e.type]}</td><td>${fEsc(lotName(farm, e.lotId))}${e.animal ? ' · ' + fEsc(e.animal) : ''}</td><td>${e.heads || 1}</td><td>${e.type === 'diagnostico' ? (e.result === 'prenhe' ? '<span class="badge green">Prenhe</span>' : '<span class="badge red">Vazia</span>') : e.type === 'parto' ? (e.calfSex ? (e.calfSex === 'M' ? 'Macho' : 'Fêmea') : '') + (e.weightKg ? ' · ' + fNum(e.weightKg) + ' kg' : '') : e.weightKg ? fNum(e.weightKg) + ' kg' : ''}</td><td>${fEsc(e.notes || '')}</td></tr>`), 'Nenhum evento registrado.'));
  } else if (reproView === 'vacinas') {
    const S = { feita: ['green', 'Aplicada'], atrasada: ['red', 'Atrasada'], proxima: ['gold', 'Nos próximos 15 dias'], agendada: ['', 'Agendada'] };
    const W = Object.fromEntries(Medicamentos.windows(farm).map(w => [w.id, w])), today = todayISO();
    const free = d => !d ? '—' : d > today ? `<span class="badge red">${dateBR(d)}</span>` : dateBR(d);
    const target = v => v.cowId ? 'Vaca ' + fEsc(fd.dairyCows.find(c => c.id === v.cowId)?.tag || '—') : v.lotId ? fEsc(lotName(farm, v.lotId)) : 'Rebanho todo';
    body = fieldSection('Calendário de vacinas e medicamentos', 'Vacinas obrigatórias (aftosa, brucelose, raiva, conforme o estado), as do manejo e os medicamentos aplicados. Com carência informada, o sistema calcula quando o animal libera para abate e para o leite.', '<div class="inline"><button class="btn" id="rpMedApply">Registrar medicamento aplicado</button><button class="btn primary" id="rpVac">Agendar vacina</button></div>', fieldTable(['Vacina / medicamento', 'Vaca / lote', 'Prevista', 'Aplicada', 'Cabeças', 'Situação', 'Libera abate', 'Libera leite', ''], [...fd.vaccines].sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))).map(v => { const [c, l] = S[FieldOps.vaccineStatus(v, today)], w = W[v.id]; return `<tr><td><b>${fEsc(v.name)}</b>${v.mandatory ? ' <span class="badge">Obrigatória</span>' : ''}</td><td>${target(v)}</td><td>${dateBR(v.dueDate)}</td><td>${v.doneDate ? dateBR(v.doneDate) : '—'}</td><td>${v.heads || '—'}</td><td><span class="badge ${c}">${l}</span></td><td>${free(w?.slaughterFree)}</td><td>${free(w?.milkFree)}</td><td>${v.doneDate ? '' : `<button class="btn small rp-done" data-id="${fEsc(v.id)}">Marcar aplicada</button>`}</td></tr>`; }), 'Nenhuma vacina agendada.'))
      + fieldSection('Produtos (carência)', 'Cadastre vacinas e medicamentos com a carência da bula. A aplicação guarda os dias do momento em que foi registrada.', '<button class="btn" id="rpMed">Novo produto</button>', fieldTable(['Produto', 'Carência de abate', 'Carência de leite', ''], (fd.medicines || []).map(m => `<tr><td><b>${fEsc(m.name)}</b></td><td>${m.slaughterDays != null ? m.slaughterDays + ' dia(s)' : '—'}</td><td>${m.milkDays != null ? m.milkDays + ' dia(s)' : '—'}</td><td><button class="btn small rp-med-edit" data-id="${fEsc(m.id)}">Editar</button></td></tr>`), 'Nenhum produto cadastrado.'));
  } else {
    body = fieldSection('Guias de Trânsito Animal (GTA)', 'Registre as GTAs emitidas no órgão de defesa do estado para ter tudo junto da movimentação do rebanho. A emissão continua no sistema oficial.', '<button class="btn primary" id="rpGta">Registrar GTA</button>', fieldTable(['Número', 'Data', 'Origem → destino', 'Finalidade', 'Cabeças', 'Lote'], [...fd.gta].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(g => `<tr><td><b>${fEsc(g.number)}</b></td><td>${dateBR(g.date)}</td><td>${fEsc(g.origin)} → ${fEsc(g.destination)}</td><td>${fEsc(g.purpose)}${g.withdrawalAlert ? `<br><span class="badge red">Em carência até ${dateBR(g.withdrawalAlert.until)}</span>` : ''}</td><td>${g.heads}</td><td>${fEsc(lotName(farm, g.lotId))}</td></tr>`), 'Nenhuma GTA registrada.'));
  }
  $('#pageContent').innerHTML = `<div class="hero-surface"><div><h2>Reprodução e sanidade do rebanho.</h2><p>Estação de monta, diagnóstico de prenhez, partos e desmame; calendário de vacinas com aviso de atraso; e as GTAs da fazenda.</p></div></div>
    <div class="grid kpis">${ruralKpi('Taxa de prenhez', st.rate == null ? '—' : fNum(st.rate) + '%')}${ruralKpi('Partos', st.births)}${ruralKpi('Desmamados', st.weaned)}${ruralKpi('Vacinas atrasadas', late)}</div>
    <div class="page-tabs">${tabs.map(([id, l]) => `<button type="button" class="page-tab ${reproView === id ? 'active' : ''}" data-view="${id}">${l}</button>`).join('')}</div>${body}`;
  $$('.page-tab[data-view]').forEach(b => b.onclick = () => { reproView = b.dataset.view; renderReproduction(); });
  const lots = lotOptions(farm);
  if ($('#rpSeason')) $('#rpSeason').onclick = async () => {
    const v = await askForm({ title: 'Estação de monta', fields: [{ name: 'name', label: 'Nome', required: true, placeholder: 'Ex.: Estação 2026/27' }, { name: 'start', label: 'Início', type: 'date', required: true }, { name: 'end', label: 'Fim', type: 'date', required: true }, { name: 'lotIds', label: 'Lotes (segure Ctrl para vários)', type: 'multiselect', options: lots.slice(1) }] });
    if (v && fieldChange(farm, d => d.seasons.push({ id: uid(), activity: 'cattle', name: v.name.trim(), start: v.start, end: v.end, lotIds: v.lotIds || [] }))) renderReproduction();
  };
  if ($('#rpEvent')) $('#rpEvent').onclick = async () => {
    const v = await askForm({ title: 'Evento reprodutivo', wide: true, fields: [{ name: 'type', label: 'Evento', type: 'select', options: Object.entries(FieldOps.REPRO) }, { name: 'date', label: 'Data', type: 'date', value: todayISO(), required: true }, { name: 'lotId', label: 'Lote', type: 'select', options: lots }, { name: 'seasonId', label: 'Estação de monta', type: 'select', options: [['', '—'], ...fd.seasons.map(s => [s.id, s.name])] }, { name: 'animal', label: 'Animal (brinco, opcional)' }, { name: 'heads', label: 'Cabeças', type: 'number', min: '1', step: '1', value: '1' }, { name: 'result', label: 'Resultado do diagnóstico', type: 'select', options: [['', '—'], ['prenhe', 'Prenhe'], ['vazia', 'Vazia']] }, { name: 'calfSex', label: 'Sexo do bezerro (parto)', type: 'select', options: [['', '—'], ['M', 'Macho'], ['F', 'Fêmea']] }, { name: 'births', label: 'Nascidos vivos (parto)', type: 'number', min: '0', step: '1', hint: 'Entram no lote abaixo uma única vez, sem lançar despesa.' }, { name: 'birthLotId', label: 'Lote que recebe os bezerros', type: 'select', options: lotOptions(farm, 'O mesmo lote do evento') }, { name: 'weightKg', label: 'Peso (kg, parto ou desmame)', type: 'number', min: '0', step: '0.1' }, { name: 'notes', label: 'Observações (touro, sêmen, protocolo...)', type: 'textarea', wide: true }] });
    if (!v) return;
    const e = { id: uid(), activity: 'cattle', type: v.type, date: v.date, lotId: v.lotId || '', seasonId: v.seasonId || '', animal: v.animal.trim(), heads: Number(v.heads || 1), notes: v.notes.trim() };
    if (v.type === 'diagnostico') e.result = v.result;
    if (v.type === 'parto' && v.calfSex) e.calfSex = v.calfSex;
    if (['parto', 'desmame'].includes(v.type)) e.weightKg = numOrNull(v.weightKg);
    if (v.type === 'parto' && v.births !== '') { e.births = Math.round(Number(v.births)); if (v.birthLotId) e.birthLotId = v.birthLotId; }
    if (fieldChange(farm, d => d.reproduction.push(e))) { toast('Evento registrado.'); renderReproduction(); }
  };
  // Produto escolhido: nome e carências copiados para a aplicação (mudar o produto depois não mexe no que já foi aplicado).
  const meds = fd.medicines || [], medOptions = [['', 'Sem produto cadastrado (sem carência)'], ...meds.map(m => [m.id, m.name])];
  const fromMed = (id, name) => { const m = meds.find(x => x.id === id); return m ? { medicineId: m.id, name: m.name, ...(m.slaughterDays != null ? { slaughterDays: m.slaughterDays } : {}), ...(m.milkDays != null ? { milkDays: m.milkDays } : {}) } : { name: String(name || '').trim() }; };
  const targetOptions = [['', 'Rebanho todo'], ...(farm.cattle?.lots || []).map(l => ['lot:' + l.id, 'Lote ' + (l.name || l.id)]), ...fd.dairyCows.map(c => ['cow:' + c.id, 'Vaca ' + c.tag + (c.name ? ' · ' + c.name : '')])];
  const targetOf = t => { const [k, id] = String(t || '').split(':'); return { lotId: k === 'lot' ? id : '', cowId: k === 'cow' ? id : '' }; };
  if ($('#rpVac')) $('#rpVac').onclick = async () => {
    const v = await askForm({ title: 'Agendar vacina', fields: [{ name: 'medicineId', label: 'Produto cadastrado', type: 'select', options: medOptions }, { name: 'name', label: 'Vacina (se não escolheu o produto)', placeholder: 'Ex.: Febre aftosa, Brucelose, Raiva, Clostridioses' }, { name: 'target', label: 'Lote ou vaca', type: 'select', options: targetOptions }, { name: 'dueDate', label: 'Data prevista', type: 'date', required: true }, { name: 'heads', label: 'Cabeças (opcional)', type: 'number', min: '1', step: '1' }, { name: 'mandatory', label: 'Obrigatória (calendário oficial)', type: 'select', options: [['false', 'Não'], ['true', 'Sim']] }, { name: 'notes', label: 'Observações', type: 'textarea', wide: true }] });
    if (!v) return;
    const p = fromMed(v.medicineId, v.name); if (!p.name) return toast('Escolha o produto ou informe o nome da vacina.');
    if (fieldChange(farm, d => d.vaccines.push({ id: uid(), activity: 'cattle', ...p, ...targetOf(v.target), dueDate: v.dueDate, doneDate: '', heads: numOrNull(v.heads), mandatory: v.mandatory === 'true', notes: v.notes.trim() }))) renderReproduction();
  };
  if ($('#rpMedApply')) $('#rpMedApply').onclick = async () => {
    if (!meds.length) return toast('Cadastre o produto com a carência em Produtos (carência), logo abaixo.');
    const v = await askForm({ title: 'Medicamento aplicado', fields: [{ name: 'medicineId', label: 'Produto', type: 'select', options: meds.map(m => [m.id, `${m.name} · abate ${m.slaughterDays ?? 0} d · leite ${m.milkDays ?? 0} d`]), required: true }, { name: 'target', label: 'Vaca, lote ou rebanho', type: 'select', options: targetOptions }, { name: 'date', label: 'Data da aplicação', type: 'date', value: todayISO(), max: todayISO(), required: true }, { name: 'heads', label: 'Cabeças (opcional)', type: 'number', min: '1', step: '1' }, { name: 'notes', label: 'Observações (dose, motivo)', type: 'textarea', wide: true }] });
    if (!v) return;
    const p = fromMed(v.medicineId);
    if (fieldChange(farm, d => d.vaccines.push({ id: uid(), activity: 'cattle', ...p, ...targetOf(v.target), dueDate: v.date, doneDate: v.date, heads: numOrNull(v.heads), mandatory: false, notes: v.notes.trim() }))) {
      const end = [p.slaughterDays ? 'abate liberado em ' + dateBR(Medicamentos.addDays(v.date, p.slaughterDays)) : '', p.milkDays ? 'leite liberado em ' + dateBR(Medicamentos.addDays(v.date, p.milkDays)) : ''].filter(Boolean).join(' · ');
      toast('Aplicação registrada.' + (end ? ' Carência: ' + end + '.' : '')); renderReproduction();
    }
  };
  const medDialog = async m => {
    const v = await askForm({ title: m ? 'Editar · ' + m.name : 'Novo produto (vacina ou medicamento)', text: 'Valores da bula. Valem para as próximas aplicações.', fields: [{ name: 'name', label: 'Nome', value: m?.name || '', required: true }, { name: 'slaughterDays', label: 'Carência de abate (dias)', type: 'number', min: '0', max: '365', step: '1', value: m?.slaughterDays ?? '' }, { name: 'milkDays', label: 'Carência de leite (dias)', type: 'number', min: '0', max: '365', step: '1', value: m?.milkDays ?? '' }] });
    if (!v) return;
    const row = { name: v.name.trim(), slaughterDays: v.slaughterDays === '' ? null : Math.round(Number(v.slaughterDays)), milkDays: v.milkDays === '' ? null : Math.round(Number(v.milkDays)) };
    if (fieldChange(farm, d => { d.medicines ||= []; if (m) Object.assign(d.medicines.find(x => x.id === m.id), row); else d.medicines.push({ id: uid(), activity: 'cattle', ...row }); })) renderReproduction();
  };
  if ($('#rpMed')) $('#rpMed').onclick = () => medDialog(null);
  $$('.rp-med-edit').forEach(b => b.onclick = () => medDialog(meds.find(m => m.id === b.dataset.id)));
  $$('.rp-done').forEach(b => b.onclick = async () => {
    const v = await askForm({ title: 'Vacina aplicada', fields: [{ name: 'doneDate', label: 'Data da aplicação', type: 'date', value: todayISO(), required: true }] });
    if (v && fieldChange(farm, d => { d.vaccines.find(x => x.id === b.dataset.id).doneDate = v.doneDate; })) renderReproduction();
  });
  if ($('#rpGta')) $('#rpGta').onclick = async () => {
    const v = await askForm({ title: 'Registrar GTA', fields: [{ name: 'number', label: 'Número da GTA', required: true }, { name: 'date', label: 'Data de emissão', type: 'date', value: todayISO(), required: true }, { name: 'origin', label: 'Origem', value: farm.name, required: true }, { name: 'destination', label: 'Destino', required: true }, { name: 'purpose', label: 'Finalidade', type: 'select', options: FieldOps.GTA_PURPOSE }, { name: 'heads', label: 'Cabeças', type: 'number', min: '1', step: '1', required: true }, { name: 'lotId', label: 'Lote', type: 'select', options: lots }, { name: 'notes', label: 'Observações', type: 'textarea', wide: true }] });
    if (!v) return;
    const wd = v.purpose === 'Abate' && Medicamentos.slaughterBlock(farm, v.lotId, v.date);
    if (wd && !await ask(`${v.lotId ? 'O lote' : 'O rebanho'} está em carência de abate até ${dateBR(wd.slaughterFree)} (${wd.name}). A GTA fica registrada com o alerta. Continuar?`, { title: 'Animais em carência', okText: 'Registrar com alerta', danger: true })) return;
    if (fieldChange(farm, d => d.gta.push({ id: uid(), activity: 'cattle', number: v.number.trim(), date: v.date, origin: v.origin.trim(), destination: v.destination.trim(), purpose: v.purpose, heads: Number(v.heads), lotId: v.lotId || '', notes: v.notes.trim() }))) { toast('GTA registrada.'); renderReproduction(); }
  };
}

// ---------- Gado de leite ----------
function renderDairy() {
  setHeader('PECUÁRIA', 'Gado de leite');
  const farm = fieldFarm(); if (!farm) return;
  const fd = farm.field, s = FieldOps.milkSummary(fd, todayISO()), max = Math.max(1, ...s.days.map(d => d.liters));
  const COW = { lactacao: ['green', 'Em lactação'], seca: ['gold', 'Seca'], descarte: ['', 'Descarte'] };
  // Carência de leite valendo hoje (vaca, lote ou rebanho) e litros descartados nos últimos 7 dias.
  const wd = Medicamentos.status(farm).milk, who = w => w.cowId ? 'Vaca ' + (fd.dairyCows.find(c => c.id === w.cowId)?.tag || '—') : w.lotId ? 'Lote ' + lotName(farm, w.lotId) : 'Rebanho todo';
  const discarded7 = Array.from({ length: 7 }, (_, i) => Medicamentos.milkTotals(fd, Medicamentos.addDays(todayISO(), -i)).discarded).reduce((a, b) => a + b, 0);
  const discardBox = wd.length ? `<div class="card milk-discard" role="alert"><h3>Leite para descarte</h3><ul>${wd.sort((a, b) => a.milkFree.localeCompare(b.milkFree)).map(w => `<li><b>${fEsc(who(w))}</b>: o leite deve ser descartado até ${dateBR(Medicamentos.addDays(w.milkFree, -1))} (${fEsc(w.name)}, aplicado em ${dateBR(w.appliedOn)}).</li>`).join('')}</ul><p class="muted">As ordenhas nesse período ficam marcadas como descarte e não entram na produção entregue.</p></div>` : '';
  $('#pageContent').innerHTML = `<div class="hero-surface"><div><h2>Produção de leite por vaca ou por lote.</h2><p>Lance a ordenha do dia por vaca (controle leiteiro) ou o total do lote. O sistema mostra a produção diária, a média dos últimos 7 dias e a média por vaca em lactação.</p></div></div>
    <div class="grid kpis">${ruralKpi('Litros hoje', fNum(s.today))}${ruralKpi('Média 7 dias (L/dia)', fNum(s.avg7))}${ruralKpi('Vacas em lactação', s.lactating)}${ruralKpi('Litros por vaca/dia', s.perCow == null ? '—' : fNum(s.perCow))}${discarded7 ? ruralKpi('Descartado em 7 dias (L)', fNum(discarded7)) : ''}</div>${discardBox}
    <div class="card"><h3>Últimos 14 dias</h3><div class="milk-bars">${s.days.map(d => `<div class="milk-bar" title="${dateBR(d.date)}: ${fNum(d.liters)} L"><span style="height:${Math.round(d.liters / max * 100)}%"></span><small>${d.date.slice(8)}</small></div>`).join('')}</div></div>
    ${fieldSection('Ordenhas', '', '<div class="inline"><button class="btn primary" id="mkNew">Lançar ordenha</button><button class="btn" id="mkCow">Nova vaca</button></div>', fieldTable(['Data', 'Período', 'Vaca / lote', 'Litros', 'Registrado por'], [...fd.milk].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 200).map(m => `<tr><td>${dateBR(m.date)}</td><td>${{ manha: 'Manhã', tarde: 'Tarde', dia: 'Dia' }[m.period || 'dia']}</td><td>${m.cowId ? fEsc(fd.dairyCows.find(c => c.id === m.cowId)?.tag) : m.lotId ? 'Lote ' + fEsc(lotName(farm, m.lotId)) : 'Rebanho'}</td><td><b>${fNum(m.liters)}</b>${m.discard ? `<br><span class="badge red">Descarte · ${fEsc(m.discard.name)}</span>` : ''}</td><td>${fEsc(m.recordedBy || 'Salvando')}</td></tr>`), 'Nenhuma ordenha lançada.'))}
    ${fieldSection('Vacas', '', '', fieldTable(['Brinco', 'Nome', 'Situação', 'Lote', 'Último parto', 'Média 30 dias', ''], fd.dairyCows.map(c => { const [cl, l] = COW[c.status]; const avg = FieldOps.cowAverage(fd, c.id, todayISO()); return `<tr><td><b>${fEsc(c.tag)}</b></td><td>${fEsc(c.name || '')}</td><td><span class="badge ${cl}">${l}</span></td><td>${fEsc(lotName(farm, c.lotId))}</td><td>${c.calvingDate ? dateBR(c.calvingDate) : '—'}</td><td>${avg == null ? '—' : fNum(avg) + ' L/dia'}</td><td><button class="btn small mk-status" data-id="${fEsc(c.id)}">Situação</button></td></tr>`; }), 'Cadastre as vacas para lançar a produção por vaca. Para lançar só o total do lote, não precisa.'))}`;
  $('#mkCow').onclick = async () => {
    const v = await askForm({ title: 'Nova vaca', fields: [{ name: 'tag', label: 'Brinco', required: true }, { name: 'name', label: 'Nome (opcional)' }, { name: 'status', label: 'Situação', type: 'select', options: [['lactacao', 'Em lactação'], ['seca', 'Seca'], ['descarte', 'Descarte']] }, { name: 'lotId', label: 'Lote', type: 'select', options: lotOptions(farm) }, { name: 'calvingDate', label: 'Último parto (opcional)', type: 'date' }] });
    if (v && fieldChange(farm, d => d.dairyCows.push({ id: uid(), activity: 'cattle', tag: v.tag.trim(), name: v.name.trim(), status: v.status, lotId: v.lotId || '', calvingDate: v.calvingDate || '' }))) renderDairy();
  };
  $('#mkNew').onclick = async () => {
    const v = await askForm({ title: 'Lançar ordenha', fields: [{ name: 'date', label: 'Data', type: 'date', value: todayISO(), required: true }, { name: 'period', label: 'Período', type: 'select', options: [['dia', 'Dia todo'], ['manha', 'Manhã'], ['tarde', 'Tarde']] }, { name: 'target', label: 'Vaca ou lote', type: 'select', options: [['', 'Rebanho (total)'], ...fd.dairyCows.filter(c => c.status === 'lactacao').map(c => ['cow:' + c.id, 'Vaca ' + c.tag + (c.name ? ' · ' + c.name : '')]), ...(farm.cattle?.lots || []).map(l => ['lot:' + l.id, 'Lote ' + (l.name || l.id)])] }, { name: 'liters', label: 'Litros', type: 'number', min: '0', step: '0.1', required: true }] });
    if (!v) return;
    const [kind, id] = String(v.target || '').split(':');
    const rec = { id: uid(), activity: 'cattle', date: v.date, period: v.period, cowId: kind === 'cow' ? id : '', lotId: kind === 'lot' ? id : '', liters: Number(v.liters) };
    // Vaca em carência: o leite é descarte. Fica marcado já no aparelho (o servidor confere ao receber).
    const block = Medicamentos.milkBlock(farm, rec);
    if (block) { if (!await ask(`O leite deve ser descartado até ${dateBR(Medicamentos.addDays(block.milkFree, -1))} (${block.name}). A ordenha fica registrada como descarte e não entra na produção entregue.`, { title: 'Leite em carência', okText: 'Registrar como descarte' })) return; rec.discard = { until: block.milkFree, name: block.name }; }
    if (fieldChange(farm, d => d.milk.push(rec))) { toast(block ? 'Ordenha registrada como descarte.' : 'Ordenha lançada.'); renderDairy(); }
  };
  $$('.mk-status').forEach(b => b.onclick = async () => {
    const cow = fd.dairyCows.find(c => c.id === b.dataset.id);
    const v = await askForm({ title: 'Vaca ' + cow.tag, fields: [{ name: 'status', label: 'Situação', type: 'select', value: cow.status, options: [['lactacao', 'Em lactação'], ['seca', 'Seca'], ['descarte', 'Descarte']] }, { name: 'calvingDate', label: 'Último parto', type: 'date', value: cow.calvingDate || '' }] });
    if (v && fieldChange(farm, d => { const c = d.dairyCows.find(x => x.id === cow.id); c.status = v.status; c.calvingDate = v.calvingDate || ''; })) renderDairy();
  });
}
