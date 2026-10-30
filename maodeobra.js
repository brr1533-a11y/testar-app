/* Telas da mão de obra da colheita: "Mão de obra" (pessoas, valores por talhão, lançamentos e fechamentos, para CEO/ADM)
   e "Apontar colheita" (tela do fiscal no celular: talhão, data, sacos por pessoa ou diária; funciona sem internet pelo
   Modo de campo). Regras e cálculo em maodeobra-domain.js; o servidor recalcula e congela os valores. */
const lbEsc = v => escapeHTML(v ?? '');
const lbNum = (v, d = 2) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
const isFiscal = () => currentUser?.role === 'contribuinte' && currentUser.function === HarvestLabor.FISCAL;
const isLaborManager = () => currentUser?.role === 'ceo' || (currentUser?.role === 'adm' && typeof canSee === 'function' && canSee('mao-de-obra'));
function laborFarm() {
  if (isFiscal()) { const f = data.farms.find(x => x.id === currentUser.allowedFarmId) || data.farms[0]; if (f) HarvestLabor.init(f); return f; }
  const f = typeof gestaoFarmOrNotice === 'function' ? gestaoFarmOrNotice() : activeFarm(); if (f) HarvestLabor.init(f); return f;
}
// Grava na versão atual da fazenda; para o gestor, valida antes (o fiscal não tem os valores: o servidor confere).
function laborChange(farm, change) {
  try {
    const live = data.farms.find(x => x.id === farm.id) || farm;
    const f = JSON.parse(JSON.stringify(live)); HarvestLabor.init(f); change(f.labor, f);
    if (!isFiscal()) { for (const e of f.labor.entries) if (e.rate == null && !e.voided) { const r = HarvestLabor.rateFor(f.labor, e); if (r) e.rate = r; } HarvestLabor.validateFarm(f); }
    Object.assign(live, f); saveData(); return true;
  } catch (e) { toast(e.message); return false; }
}

// Menu: o fiscal só vê a tela de apontamento (e o Modo de campo e o Perfil). CEO/ADM no café veem as duas telas.
{
  const navBefore = navItems;
  navItems = function () {
    const items = navBefore();
    if (!currentUser) return items;
    if (isFiscal()) return [['colheita-campo', 'check', 'Apontar colheita'], ['campo', 'check', 'Modo de campo'], ['perfil', 'users', 'Perfil']];
    if (currentUser.role !== 'contribuinte' && selectedType() === 'coffee') {
      if (isLaborManager()) items.push(['mao-de-obra', 'users', 'Mão de obra da colheita']);
      items.push(['colheita-campo', 'check', 'Apontar colheita']);
    }
    return items;
  };
}

// ---------- Apontar colheita (fiscal, celular) ----------
let hfPlot = '', hfDate = '', hfCounts = {}, hfSearch = '';
// Carência do banho no talhão escolhido: não entrar até… / colheita só a partir de… (funciona sem internet).
function hfGraceNotice(farm) {
  const block = Carencia.harvestBlock(farm, hfPlot, hfDate), now = Carencia.plotStatus(farm).find(s => s.plotId === hfPlot);
  const parts = [];
  if (now?.reentryUntil) parts.push(`<b>Não entrar no talhão até ${new Date(now.reentryUntil).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</b> (${lbEsc(now.reentryOrder)}).`);
  if (block) parts.push(`<b>Talhão em carência: colheita só a partir de ${dateBR(block.harvestFrom)}</b> (${lbEsc(block.order)}). Se lançar agora, o apontamento fica marcado para o CEO ou ADM decidir.`);
  return parts.length ? `<div class="card hf-grace" role="alert">${parts.join('<br>')}</div>` : '';
}
function renderHarvestField() {
  setHeader('COLHEITA', 'Apontar colheita');
  const farm = laborFarm(); if (!farm) return;
  const L = farm.labor, plots = farm.talhoes || [];
  hfDate ||= todayISO(); if (!plots.some(p => p.id === hfPlot)) hfPlot = plots[0]?.id || '';
  const closed = HarvestLabor.closingFor(L, hfDate);
  const workers = L.workers.filter(w => w.active !== false && (!hfSearch || w.name.toLocaleLowerCase('pt-BR').includes(hfSearch.toLocaleLowerCase('pt-BR')))).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const done = L.entries.filter(e => !e.voided && e.date === hfDate && e.plotId === hfPlot);
  const doneBy = id => done.filter(e => e.workerId === id);
  const pending = Object.entries(hfCounts).filter(([, c]) => c.bags > 0 || c.diaria);
  const me = currentUser.name || currentUser.username;
  // O valor entra sozinho (do talhão ou da pessoa); o app só avisa na hora o que vai ficar pendente para o escritório.
  const plotRated = hfPlot && L.plotRates.some(r => r.plotId === hfPlot && r.validFrom <= hfDate);
  const noDaily = w => !HarvestLabor.hasRate(L, { kind: 'diaria', workerId: w.id });
  $('#pageContent').innerHTML = `<div class="hf">
    <div class="hf-top card">
      <label>Talhão<select id="hfPlot">${plots.map(p => `<option value="${lbEsc(p.id)}" ${p.id === hfPlot ? 'selected' : ''}>${lbEsc(p.name)}</option>`).join('') || '<option value="">Nenhum talhão cadastrado</option>'}</select></label>
      <label>Data<input type="date" id="hfDate" value="${hfDate}" max="${todayISO()}"></label>
    </div>
    ${closed ? '<div class="card hf-closed">Esta semana já foi fechada e paga. Pode lançar: o que salvar agora vai para revisão do escritório e entra no próximo pagamento.</div>' : ''}
    ${hfPlot && typeof Carencia !== 'undefined' ? hfGraceNotice(farm) : ''}
    ${!closed && hfPlot && !plotRated ? `<div class="card hf-norate" role="status"><b>Este talhão ainda não tem valor do saco.</b> Pode apontar normalmente: os sacos ficam pendentes e o escritório define o valor antes de fechar a semana.</div>` : ''}
    ${!L.workers.length ? `<div class="card empty">Nenhuma pessoa cadastrada ainda. Toque em <b>+ Nova pessoa</b> para incluir quem está colhendo.</div>` : ''}
    <div class="hf-tools">${L.workers.length > 12 ? `<input class="hf-search" id="hfSearch" type="search" placeholder="Procurar pessoa" value="${lbEsc(hfSearch)}">` : ''}<button type="button" class="btn hf-new" id="hfNewWorker">+ Nova pessoa</button></div>
    <div class="hf-list">${workers.map(w => { const c = hfCounts[w.id] || { bags: 0, diaria: false }, prev = doneBy(w.id), prevBags = prev.filter(e => e.kind === 'saco').reduce((n, e) => n + e.bags, 0), prevDay = prev.some(e => e.kind === 'diaria');
      return `<div class="hf-row ${c.bags || c.diaria ? 'on' : ''}"><div class="hf-name"><b>${lbEsc(w.name)}</b><small>${lbEsc(HarvestLabor.ROLES[w.role] || '')}${w.pendingData ? ' · cadastro novo' : ''}${prevBags ? ` · já lançado: ${lbNum(prevBags, 1)} sc` : ''}${prevDay ? ' · diária lançada' : ''}${c.diaria && noDaily(w) ? ' · <span class="hf-warn">diária sem valor: fica pendente</span>' : ''}</small></div>
        <div class="hf-ctrl">${w.role === 'diarista' ? '' : `<button type="button" class="hf-btn" data-w="${lbEsc(w.id)}" data-d="-1" aria-label="Menos um saco">−</button><span class="hf-count" aria-live="polite">${lbNum(c.bags, 1)}</span><button type="button" class="hf-btn plus" data-w="${lbEsc(w.id)}" data-d="1" aria-label="Mais um saco">+</button>`}
        <button type="button" class="hf-day ${c.diaria ? 'on' : ''}" data-w="${lbEsc(w.id)}" ${prevDay ? 'disabled' : ''}>Diária</button></div></div>`; }).join('')}</div>
    <div class="hf-save"><button class="btn primary hf-save-btn" id="hfSave" ${pending.length ? '' : 'disabled'}>Salvar ${pending.length ? pending.length + (pending.length > 1 ? ' pessoas' : ' pessoa') : ''}</button><span class="muted">${navigator.onLine ? 'Conectado' : 'Sem internet: fica guardado no aparelho (Modo de campo) e envia quando pegar sinal.'}</span></div>
    ${done.length ? `<div class="card"><h3>Já lançado · ${lbEsc(plots.find(p => p.id === hfPlot)?.name)} · ${dateBR(hfDate)}</h3><p class="muted">${lbNum(done.filter(e => e.kind === 'saco').reduce((n, e) => n + e.bags, 0), 1)} sacos · ${done.filter(e => e.kind === 'diaria').length} diária(s)</p>
      <ul class="hf-done">${done.map(e => `<li><span>${lbEsc(L.workers.find(w => w.id === e.workerId)?.name || '—')} · ${e.kind === 'diaria' ? 'Diária' : lbNum(e.bags, 1) + ' sc'}</span>${!closed && (isLaborManager() || e.recordedBy === me) ? `<button class="btn small hf-fix" data-id="${lbEsc(e.id)}">Corrigir</button>` : ''}</li>`).join('')}</ul></div>` : ''}
  </div>`;
  $('#hfPlot').onchange = e => { hfPlot = e.target.value; hfCounts = {}; renderHarvestField(); };
  $('#hfDate').onchange = e => { hfDate = e.target.value || todayISO(); hfCounts = {}; renderHarvestField(); };
  if ($('#hfSearch')) $('#hfSearch').oninput = e => { hfSearch = e.target.value; const pos = e.target.selectionStart; renderHarvestField(); const i = $('#hfSearch'); i.focus(); i.setSelectionRange(pos, pos); };
  $$('.hf-btn').forEach(b => b.onclick = () => { const c = hfCounts[b.dataset.w] ||= { bags: 0, diaria: false }; c.bags = Math.max(0, Math.min(200, c.bags + Number(b.dataset.d))); renderHarvestField(); });
  $$('.hf-day').forEach(b => b.onclick = () => { const c = hfCounts[b.dataset.w] ||= { bags: 0, diaria: false }; c.diaria = !c.diaria; renderHarvestField(); });
  $('#hfSave').onclick = async () => {
    if (!hfPlot) return toast('Escolha o talhão.');
    const rows = Object.entries(hfCounts).flatMap(([workerId, c]) => [...(c.bags > 0 ? [{ id: uid(), date: hfDate, plotId: hfPlot, workerId, kind: 'saco', bags: c.bags }] : []), ...(c.diaria ? [{ id: uid(), date: hfDate, plotId: hfPlot, workerId, kind: 'diaria' }] : [])]);
    if (!rows.length) return;
    const grace = typeof Carencia !== 'undefined' && Carencia.harvestBlock(farm, hfPlot, hfDate);
    if (grace && !await ask(`Este talhão está em carência até ${dateBR(grace.harvestFrom)} (${grace.order}). Os apontamentos ficam marcados para o CEO ou ADM decidir. Salvar mesmo assim?`, { title: 'Talhão em carência', okText: 'Salvar marcado' })) return;
    const noRate = rows.filter(r => !HarvestLabor.hasRate(farm.labor, r)).length;
    const warn = !noRate ? '' : isFiscal() ? ` ${noRate} sem valor definido: ficam pendentes para o escritório completar.` : ` ${noRate} sem valor: defina a diária ou o valor do saco antes de fechar a semana.`;
    const lateNote = closed ? ' A semana já foi paga: vão para revisão do escritório e entram no próximo pagamento.' : '';
    if (laborChange(farm, Lb => Lb.entries.push(...rows))) { hfCounts = {}; toast(`${rows.length} apontamento(s) salvo(s).` + warn + lateNote); renderHarvestField(); }
  };
  $('#hfNewWorker').onclick = async () => {
    const v = await askForm({ title: 'Nova pessoa', text: isFiscal() ? 'Só o nome e a função. O escritório completa CPF, Pix e valores depois.' : 'Cadastro rápido. Complete CPF, Pix e diária em Mão de obra › Pessoas.', fields: [{ name: 'name', label: 'Nome', required: true, autofocus: true }, { name: 'role', label: 'Função', type: 'select', value: 'panhador', options: Object.entries(HarvestLabor.ROLES) }] });
    if (!v || !v.name.trim()) return;
    const name = v.name.trim();
    if (farm.labor.workers.some(w => w.active !== false && w.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) return toast('Já existe uma pessoa ativa com esse nome.');
    if (laborChange(farm, Lb => Lb.workers.push({ id: uid(), name, role: v.role, active: true, pendingData: true }))) { toast(name + ' incluído(a). Já pode lançar.'); renderHarvestField(); }
  };
  $$('.hf-fix').forEach(b => b.onclick = async () => {
    const e = farm.labor.entries.find(x => x.id === b.dataset.id); if (!e) return;
    const v = await askForm({ title: 'Corrigir apontamento', text: (farm.labor.workers.find(w => w.id === e.workerId)?.name || '') + ' · ' + dateBR(e.date), fields: [
      ...(e.kind === 'saco' ? [{ name: 'bags', label: 'Sacos', type: 'number', min: '0.5', step: '0.5', value: e.bags, required: true }] : []),
      { name: 'voidReason', label: 'Para cancelar este apontamento, escreva o motivo', type: 'textarea', wide: true }
    ] });
    if (!v) return;
    if (laborChange(farm, Lb => { const x = Lb.entries.find(y => y.id === e.id); if (v.voidReason.trim()) { x.voided = true; x.voidReason = v.voidReason.trim(); } else if (e.kind === 'saco') x.bags = Number(v.bags); })) { toast('Apontamento corrigido.'); renderHarvestField(); }
  });
}

// ---------- Mão de obra (CEO/ADM) ----------
let lbTab = 'pessoas', lbWeek = '';
function renderHarvestLabor() {
  setHeader('LAVOURA', 'Mão de obra da colheita');
  if (!isLaborManager()) { $('#pageContent').innerHTML = '<div class="card">Sem permissão para esta tela.</div>'; return; }
  const farm = laborFarm(); if (!farm) return;
  const L = farm.labor;
  lbWeek ||= HarvestLabor.weekStart(todayISO());
  const preview = HarvestLabor.computeClosing(L, lbWeek), closedWeek = L.closings.find(c => c.weekStart === lbWeek);
  const tabs = [['pessoas', 'Pessoas'], ['valores', 'Valores por talhão'], ['lancamentos', 'Lançamentos da semana'], ['fechamentos', 'Fechamentos']];
  const kpis = `<div class="grid kpis">${ruralKpi('Pessoas ativas', L.workers.filter(w => w.active !== false).length)}${ruralKpi('Sacos na semana', lbNum(preview.lines.reduce((n, l) => n + l.bags, 0), 1))}${ruralKpi('Diárias na semana', preview.lines.reduce((n, l) => n + l.days, 0))}${ruralKpi('A pagar na semana', money(preview.total))}</div>`;
  // Pendências de valor (semanas abertas): aparecem em todas as abas, com atalho para completar antes do fechamento.
  const pend = HarvestLabor.pendingSummary(L), plotName = id => (farm.talhoes || []).find(t => t.id === id)?.name || '—';
  const graceN = (L.entries || []).filter(e => e.graceAlert && !e.graceDecision && !e.voided).length;
  const graceBox = graceN ? `<div class="card lb-pending" role="status"><div class="section-head"><div><h3>${graceN} apontamento${graceN > 1 ? 's' : ''} dentro da carência de defensivo</h3><p class="muted">Permita ou estorne em Banho. A semana só fecha depois da decisão.</p></div><button class="btn small" id="lbGoGrace">Decidir</button></div></div>` : '';
  // Apontamentos que chegaram depois de a semana ser paga: o escritório aprova (entram no próximo pagamento) ou recusa.
  const lateList = HarvestLabor.lateOpen(L), name0 = id => L.workers.find(w => w.id === id)?.name || '—';
  const lateBox = lateList.length ? `<div class="card lb-pending" role="status"><h3>${lateList.length} apontamento${lateList.length > 1 ? 's' : ''} atrasado${lateList.length > 1 ? 's' : ''} (semana já paga)</h3><p class="muted">Chegaram depois do fechamento, por exemplo do celular que ficou sem internet. A semana paga não muda: se aprovar, entram no pagamento da semana indicada, como acerto. A semana de acerto só fecha depois da revisão.</p><ul>${lateList.map(e => `<li><span><b>${lbEsc(name0(e.workerId))}</b> · ${dateBR(e.date)} · ${lbEsc(plotName(e.plotId))} · ${e.kind === 'diaria' ? 'diária' : lbNum(e.bags, 1) + ' sc'}${e.rate != null ? ' · ' + money(HarvestLabor.entryAmount(e)) : ''}<br><span class="muted">Semana de ${dateBR(e.late.closedWeek)} já paga · entra na semana de ${dateBR(e.late.settleWeek)} · lançado por ${lbEsc(e.recordedBy || '—')}</span></span><span class="inline"><button class="btn small primary lb-late" data-id="${lbEsc(e.id)}" data-s="approved">Aprovar</button><button class="btn small danger lb-late" data-id="${lbEsc(e.id)}" data-s="rejected">Recusar</button></span></li>`).join('')}</ul></div>` : '';
  // Mesma pessoa no mesmo dia lançada por celulares diferentes (ou duas diárias): pode ser repetição feita sem internet.
  const dups = HarvestLabor.duplicateGroups(L);
  const what = e => `${e.kind === 'diaria' ? 'diária' : lbNum(e.bags, 1) + ' sc'} · ${lbEsc(plotName(e.plotId))} · por ${lbEsc(e.recordedBy || '—')}`;
  const dupBox = dups.length ? `<div class="card lb-pending" role="status"><h3>${dups.length} possível${dups.length > 1 ? 'is' : ''} lançamento${dups.length > 1 ? 's' : ''} repetido${dups.length > 1 ? 's' : ''}</h3><p class="muted">A mesma pessoa no mesmo dia, lançada por celulares diferentes ou com duas diárias (acontece quando dois fiscais anotam sem internet). Estorne o que estiver repetido ou confirme que são lançamentos diferentes. A semana só fecha depois disso.</p><ul>${dups.map(g => `<li><span><b>${lbEsc(name0(g.workerId))}</b> · ${dateBR(g.date)}<br>${g.entries.map(e => `<span class="muted">${what(e)}</span> <button class="btn small danger lb-dup-void" data-id="${lbEsc(e.id)}">Estornar este</button>`).join('<br>')}</span><button class="btn small lb-dup-ok" data-ids="${lbEsc(g.entries.map(e => e.id).join(','))}">São diferentes</button></li>`).join('')}</ul></div>` : '';
  const pendBox = dupBox + lateBox + graceBox + (!pend.total ? '' : `<div class="card lb-pending" role="status"><h3>${pend.total} apontamento${pend.total > 1 ? 's' : ''} sem valor</h3><p class="muted">A semana só fecha depois que todos tiverem valor. Ao definir, os apontamentos pendentes recebem o valor sozinhos.</p><ul>
    ${pend.plots.map(p => `<li><span><b>${lbEsc(plotName(p.plotId))}</b>: ${p.count} apontamento${p.count > 1 ? 's' : ''} de sacos desde ${dateBR(p.from)}</span><button class="btn small lb-fix-plot" data-plot="${lbEsc(p.plotId)}" data-from="${p.from}">Definir valor do saco</button></li>`).join('')}
    ${pend.workers.map(p => `<li><span><b>${lbEsc(L.workers.find(w => w.id === p.workerId)?.name || '—')}</b>: ${p.count} diária${p.count > 1 ? 's' : ''} sem valor</span><button class="btn small lb-fix-day" data-id="${lbEsc(p.workerId)}">Definir diária</button></li>`).join('')}</ul></div>`);
  let body = '';
  if (lbTab === 'pessoas') {
    body = `<div class="section-head"><div><h2>Pessoas da colheita</h2><p>Panhadores, safristas e diaristas. CPF e Pix aparecem só aqui; o fiscal vê apenas o nome.</p></div><button class="btn primary" id="lbNewWorker">Nova pessoa</button></div>
      ${L.workers.length ? `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Função</th><th>CPF</th><th>Pix</th><th>WhatsApp</th><th>Diária</th><th>Saco (próprio)</th><th>Situação</th><th></th></tr></thead><tbody>${[...L.workers].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(w => `<tr><td><b>${lbEsc(w.name)}</b>${w.pendingData ? '<br><span class="badge gold">Completar dados</span>' : ''}</td><td>${lbEsc(HarvestLabor.ROLES[w.role])}</td><td>${w.cpf ? lbEsc(w.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')) : '—'}</td><td>${lbEsc(w.pix || '—')}</td><td>${lbEsc(w.phone || '—')}</td><td>${w.dailyRate ? money(w.dailyRate) : '—'}</td><td>${w.bagRate ? money(w.bagRate) : 'do talhão'}</td><td><span class="badge ${w.active === false ? '' : 'green'}">${w.active === false ? 'Inativo' : 'Ativo'}</span></td><td><button class="btn small lb-edit" data-id="${lbEsc(w.id)}">Editar</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty">Cadastre a turma da colheita.</div>'}`;
  } else if (lbTab === 'valores') {
    const plots = farm.talhoes || [];
    body = `<div class="section-head"><div><h2>Valor do saco por talhão</h2><p>Lavoura carregada paga diferente de lavoura fraca. Cada apontamento guarda o valor do dia em que foi lançado: mudar o valor não mexe no que já foi apontado.</p></div><div class="inline"><button class="btn" id="lbDefaultDaily">Diária padrão: ${L.settings.defaultDailyRate ? money(L.settings.defaultDailyRate) : 'não definida'}</button><button class="btn primary" id="lbNewRate" ${plots.length ? '' : 'disabled'}>Definir valor</button></div></div>
      ${plots.length ? `<div class="table-wrap"><table><thead><tr><th>Talhão</th><th>Valor hoje</th><th>Histórico</th></tr></thead><tbody>${plots.map(p => { const hist = L.plotRates.filter(r => r.plotId === p.id).sort((a, b) => b.validFrom.localeCompare(a.validFrom)); const now = HarvestLabor.plotRate(L, p.id, todayISO()); return `<tr><td><b>${lbEsc(p.name)}</b></td><td>${now ? money(now) + ' / saco' : '<span class="badge gold">Sem valor</span>'}</td><td class="muted">${hist.map(r => `${money(r.ratePerBag)} desde ${dateBR(r.validFrom)}`).join('<br>') || '—'}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="card empty">Cadastre os talhões em Lavoura › Talhões.</div>'}`;
  } else if (lbTab === 'lancamentos') {
    const end = HarvestLabor.weekEnd(lbWeek), inWeek = r => r.date >= lbWeek && r.date <= end;
    const entries = L.entries.filter(inWeek).sort((a, b) => b.date.localeCompare(a.date)), adj = L.adjustments.filter(inWeek);
    const name = id => L.workers.find(w => w.id === id)?.name || '—', plot = id => (farm.talhoes || []).find(t => t.id === id)?.name || '—';
    body = `<div class="section-head"><div class="inline lb-week"><button class="btn small" id="lbPrev">‹</button><b>Semana ${dateBR(lbWeek)} a ${dateBR(end)}</b><button class="btn small" id="lbNext">›</button>${closedWeek ? '<span class="badge green">Fechada</span>' : '<span class="badge gold">Aberta</span>'}</div><div class="inline"><button class="btn" id="lbGoField">Apontar colheita</button><button class="btn" id="lbAdj" ${closedWeek ? 'disabled' : ''}>Adiantamento ou desconto</button></div></div>
      <h3>Prévia do fechamento</h3>
      ${preview.lines.length ? `<div class="table-wrap"><table><thead><tr><th>Pessoa</th><th>Sacos</th><th>Valor sacos</th><th>Diárias</th><th>Valor diárias</th><th>Adiantamentos</th><th>Descontos</th><th>Saldo anterior</th><th>A receber</th></tr></thead><tbody>${preview.lines.map(l => `<tr><td><b>${lbEsc(l.name)}</b></td><td>${lbNum(l.bags, 1)}</td><td>${money(l.bagsValue)}</td><td>${l.days}</td><td>${money(l.daysValue)}</td><td>${l.advances ? '−' + money(l.advances) : '—'}</td><td>${l.discounts ? '−' + money(l.discounts) : '—'}</td><td>${l.previousDebt ? '−' + money(l.previousDebt) : '—'}</td><td><b>${money(l.total)}</b>${l.newDebt ? `<br><span class="muted">fica −${money(l.newDebt)}</span>` : ''}${l.pending ? `<br><span class="badge gold">${l.pending} sem valor</span>` : ''}</td></tr>`).join('')}</tbody></table></div>${preview.lines.some(l => l.pending) ? '<p class="muted">Há apontamentos sem valor: defina a diária da pessoa (aba Pessoas) ou o valor do saco do talhão (aba Valores por talhão). A semana só fecha depois disso.</p>' : ''}` : '<div class="card empty">Nenhum apontamento nesta semana.</div>'}
      <h3>Apontamentos</h3>
      ${entries.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Pessoa</th><th>Talhão</th><th>Tipo</th><th>Valor</th><th>Lançado por</th><th></th></tr></thead><tbody>${entries.map(e => `<tr class="${e.voided ? 'lb-void' : ''}"><td>${dateBR(e.date)}</td><td>${lbEsc(name(e.workerId))}</td><td>${lbEsc(plot(e.plotId))}</td><td>${e.kind === 'diaria' ? 'Diária' : lbNum(e.bags, 1) + ' sc' + (e.rate == null ? '' : ' × ' + money(e.rate))}</td><td>${e.voided ? 'Estornado: ' + lbEsc(e.voidReason) : e.rate == null ? '<span class="badge gold">Sem valor</span>' : money(HarvestLabor.entryAmount(e))}${e.graceAlert && !e.voided ? `<br><span class="badge ${e.graceDecision ? 'green' : 'red'}">${e.graceDecision ? 'Carência: permitido por ' + lbEsc(e.graceDecision.by || '') : 'Na carência: decidir'}</span>` : ''}</td><td>${lbEsc(e.recordedBy || 'Salvando')}</td><td>${!closedWeek && !e.voided ? `<button class="btn small lb-void" data-id="${lbEsc(e.id)}" data-k="entries">Estornar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${adj.length ? `<h3>Adiantamentos e descontos</h3><div class="table-wrap"><table><thead><tr><th>Data</th><th>Pessoa</th><th>Tipo</th><th>Valor</th><th>Motivo</th><th></th></tr></thead><tbody>${adj.map(a => `<tr class="${a.voided ? 'lb-void' : ''}"><td>${dateBR(a.date)}</td><td>${lbEsc(name(a.workerId))}</td><td>${a.kind === 'adiantamento' ? 'Adiantamento' : 'Desconto'}</td><td>${money(a.amount)}</td><td>${lbEsc(a.voided ? 'Estornado: ' + a.voidReason : a.reason)}</td><td>${!closedWeek && !a.voided ? `<button class="btn small lb-void" data-id="${lbEsc(a.id)}" data-k="adjustments">Estornar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
  } else {
    body = `<div class="section-head"><div><h2>Fechamentos semanais</h2><p>O fechamento soma sacos × valor + diárias − adiantamentos − descontos, trava a semana e cria uma conta a pagar por pessoa em Contas a pagar.</p></div><div class="inline"><button class="btn" id="lbAccountant">Dados para o contador</button><button class="btn primary" id="lbClose">Fechar semana</button></div></div>
      ${L.closings.length ? `<div class="table-wrap"><table><thead><tr><th>Semana</th><th>Pessoas</th><th>Total</th><th>Fechado por</th><th></th></tr></thead><tbody>${[...L.closings].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).map(c => `<tr><td><b>${dateBR(c.weekStart)} a ${dateBR(c.weekEnd)}</b></td><td>${c.lines.length}</td><td>${money(c.total)}</td><td>${lbEsc(c.closedBy || 'Salvando')}${c.closedAt ? '<br><span class="muted">' + dateBR(c.closedAt.slice(0, 10)) + '</span>' : ''}</td><td><button class="btn small lb-open" data-id="${lbEsc(c.id)}">Recibos</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty">Nenhuma semana fechada ainda.</div>'}`;
  }
  $('#pageContent').innerHTML = `<div class="hero-surface"><div><h2>Colheita manual sem caderno.</h2><p>O fiscal aponta no celular quantos sacos cada pessoa colheu (ou a diária), mesmo sem internet. Aqui você cadastra a turma, define o valor do saco por talhão, lança adiantamentos e fecha a semana com recibo para imprimir ou mandar por WhatsApp.</p></div></div>${kpis}${pendBox}
    <div class="page-tabs">${tabs.map(([id, l]) => `<button type="button" class="page-tab ${lbTab === id ? 'active' : ''}" data-lb="${id}">${l}</button>`).join('')}</div>${body}`;
  $$('[data-lb]').forEach(b => b.onclick = () => { lbTab = b.dataset.lb; renderHarvestLabor(); });
  if ($('#lbNewWorker')) $('#lbNewWorker').onclick = () => laborWorkerDialog(farm, null);
  $$('.lb-edit').forEach(b => b.onclick = () => laborWorkerDialog(farm, L.workers.find(w => w.id === b.dataset.id)));
  const rateDialog = async (plotId, from) => {
    const v = await askForm({ title: 'Valor do saco no talhão', fields: [{ name: 'plotId', label: 'Talhão', type: 'select', value: plotId || '', options: (farm.talhoes || []).map(t => [t.id, t.name]), required: true }, { name: 'ratePerBag', label: 'Valor por saco (R$)', type: 'number', min: '0.01', step: '0.01', required: true }, { name: 'validFrom', label: 'Vale a partir de', type: 'date', value: from || todayISO(), required: true, hint: from ? 'Começa no primeiro apontamento pendente, para todos receberem o valor.' : '' }] });
    if (v && laborChange(farm, Lb => Lb.plotRates.push({ id: uid(), plotId: v.plotId, ratePerBag: Number(v.ratePerBag), validFrom: v.validFrom }))) { toast('Valor definido.'); renderHarvestLabor(); }
  };
  if ($('#lbNewRate')) $('#lbNewRate').onclick = () => rateDialog();
  $$('.lb-fix-plot').forEach(b => b.onclick = () => rateDialog(b.dataset.plot, b.dataset.from));
  if ($('#lbGoGrace')) $('#lbGoGrace').onclick = () => goToPage('banho');
  $$('.lb-dup-ok').forEach(b => b.onclick = async () => {
    if (!await ask('Os lançamentos deste dia são de trabalhos diferentes (por exemplo, manhã e tarde ou talhões diferentes) e os dois serão pagos.', { title: 'Confirmar que não é repetição', okText: 'São diferentes' })) return;
    const ids = b.dataset.ids.split(',');
    if (laborChange(farm, Lb => Lb.entries.filter(e => ids.includes(e.id)).forEach(e => { e.dupOk = true; }))) { toast('Confirmado.'); renderHarvestLabor(); }
  });
  $$('.lb-dup-void').forEach(b => b.onclick = async () => {
    const v = await askForm({ title: 'Estornar lançamento repetido', text: 'Fica no histórico como estornado e não entra no pagamento.', fields: [{ name: 'reason', label: 'Motivo', required: true, value: 'Lançamento repetido (mesma pessoa e dia)' }] });
    if (v && laborChange(farm, Lb => { const e = Lb.entries.find(x => x.id === b.dataset.id); e.voided = true; e.voidReason = v.reason.trim(); })) { toast('Estornado.'); renderHarvestLabor(); }
  });
  $$('.lb-late').forEach(b => b.onclick = async () => {
    const approve = b.dataset.s === 'approved';
    const v = await askForm({ title: approve ? 'Aprovar apontamento atrasado' : 'Recusar apontamento atrasado', text: approve ? 'Ele entra no pagamento da semana de acerto. A semana já paga não muda.' : 'O apontamento fica no histórico como estornado e não entra em pagamento.', fields: approve ? [] : [{ name: 'reason', label: 'Motivo', required: true, value: 'Apontamento atrasado recusado na revisão.' }] });
    if (!v) return;
    if (laborChange(farm, Lb => { const e = Lb.entries.find(x => x.id === b.dataset.id); e.lateStatus = b.dataset.s; if (!approve) e.voidReason = v.reason.trim(); })) { toast(approve ? 'Aprovado: entra no próximo pagamento.' : 'Recusado e estornado.'); renderHarvestLabor(); }
  });
  $$('.lb-fix-day').forEach(b => b.onclick = () => laborWorkerDialog(farm, L.workers.find(w => w.id === b.dataset.id)));
  if ($('#lbDefaultDaily')) $('#lbDefaultDaily').onclick = async () => {
    const v = await askForm({ title: 'Diária padrão', text: 'Vale para quem não tem diária combinada no cadastro. Diárias pendentes recebem este valor ao salvar.', fields: [{ name: 'rate', label: 'Diária padrão (R$)', type: 'number', min: '0', step: '0.01', value: L.settings.defaultDailyRate ?? '', hint: 'Deixe vazio para não usar.' }] });
    if (v && laborChange(farm, Lb => { Lb.settings.defaultDailyRate = v.rate === '' ? null : Number(v.rate); })) { toast('Diária padrão salva.'); renderHarvestLabor(); }
  };
  if ($('#lbPrev')) { const move = n => { const d = new Date(lbWeek + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 7 * n); lbWeek = d.toISOString().slice(0, 10); renderHarvestLabor(); }; $('#lbPrev').onclick = () => move(-1); $('#lbNext').onclick = () => move(1); }
  if ($('#lbGoField')) $('#lbGoField').onclick = () => goToPage('colheita-campo');
  if ($('#lbAdj')) $('#lbAdj').onclick = async () => {
    const active = L.workers.filter(w => w.active !== false);
    const v = await askForm({ title: 'Adiantamento ou desconto', fields: [{ name: 'workerId', label: 'Pessoa', type: 'select', options: active.map(w => [w.id, w.name]), required: true }, { name: 'kind', label: 'Tipo', type: 'select', options: [['adiantamento', 'Adiantamento (vale)'], ['desconto', 'Desconto']] }, { name: 'amount', label: 'Valor (R$)', type: 'number', min: '0.01', step: '0.01', required: true }, { name: 'date', label: 'Data', type: 'date', value: todayISO(), required: true }, { name: 'reason', label: 'Motivo', required: true, placeholder: 'Ex.: vale para mercado, ferramenta perdida' }] });
    if (v && laborChange(farm, Lb => Lb.adjustments.push({ id: uid(), workerId: v.workerId, kind: v.kind, amount: Number(v.amount), date: v.date, reason: v.reason.trim() }))) { toast('Lançado.'); renderHarvestLabor(); }
  };
  $$('.lb-void').forEach(b => b.onclick = async () => {
    const v = await askForm({ title: 'Estornar', text: 'O registro continua no histórico, marcado como estornado.', fields: [{ name: 'reason', label: 'Motivo', required: true }] });
    if (v && laborChange(farm, Lb => { const x = Lb[b.dataset.k].find(y => y.id === b.dataset.id); x.voided = true; x.voidReason = v.reason.trim(); })) renderHarvestLabor();
  });
  if ($('#lbClose')) $('#lbClose').onclick = () => laborCloseDialog(farm);
  // Safristas e diaristas: planilha com o que foi fechado no período, para o contador decidir contrato e eSocial.
  if ($('#lbAccountant')) $('#lbAccountant').onclick = async () => {
    const first = [...L.closings].map(c => c.weekStart).sort()[0] || todayISO();
    const v = await askForm({ title: 'Dados para o contador', text: 'Uma linha por pessoa com o que foi fechado nas semanas do período: CPF, função, primeiro e último dia trabalhado, dias, sacos, diárias e valores. O contador confere o que a lei exige (contrato de safra, eSocial) a partir destes números; o sistema não envia nada ao governo.', fields: [{ name: 'from', label: 'De (semana que começa em)', type: 'date', value: first, required: true }, { name: 'to', label: 'Até', type: 'date', value: todayISO(), required: true }] });
    if (!v) return;
    const rows = HarvestLabor.accountantRows(L, v.from, v.to);
    if (!rows.length) return toast('Nenhuma semana fechada nesse período.');
    const r2 = n => Number(n).toFixed(2).replace('.', ',');
    downloadCSV(`colheita-contador-${v.from}-a-${v.to}.csv`, ['Nome', 'CPF', 'Função', 'Primeiro dia', 'Último dia', 'Dias trabalhados', 'Semanas pagas', 'Sacos', 'Diárias', 'Valor sacos (R$)', 'Valor diárias (R$)', 'Adiantamentos (R$)', 'Descontos (R$)', 'Líquido pago (R$)', 'Chave Pix'],
      rows.map(r => [r.name, r.cpf || 'SEM CPF', r.role, r.firstDay ? dateBR(r.firstDay) : '', r.lastDay ? dateBR(r.lastDay) : '', r.days, r.weeks, String(r.bags).replace('.', ','), r.dailies, r2(r.bagsValue), r2(r.dailiesValue), r2(r.advances), r2(r.discounts), r2(r.net), r.pix]));
    const noCpf = rows.filter(r => !r.cpf).length;
    toast(`${rows.length} pessoa(s) na planilha.` + (noCpf ? ` ${noCpf} sem CPF: complete em Pessoas antes de mandar ao contador.` : ''));
  };
  $$('.lb-open').forEach(b => b.onclick = () => laborReceipts(farm, L.closings.find(c => c.id === b.dataset.id)));
}
async function laborWorkerDialog(farm, w) {
  const v = await askForm({ title: w ? 'Editar · ' + w.name : 'Nova pessoa', wide: true, fields: [
    { name: 'name', label: 'Nome', value: w?.name || '', required: true },
    { name: 'role', label: 'Função', type: 'select', value: w?.role || 'panhador', options: Object.entries(HarvestLabor.ROLES) },
    { name: 'cpf', label: 'CPF (opcional)', value: w?.cpf || '', placeholder: 'Somente números' },
    { name: 'pix', label: 'Chave Pix', value: w?.pix || '' },
    { name: 'phone', label: 'WhatsApp (DDD + número, para o recibo)', type: 'tel', value: w?.phone || '' },
    { name: 'dailyRate', label: 'Diária combinada (R$)', type: 'number', min: '0', step: '0.01', value: w?.dailyRate ?? '' },
    { name: 'bagRate', label: 'Valor por saco combinado com a pessoa (R$, opcional)', type: 'number', min: '0', step: '0.01', value: w?.bagRate ?? '', hint: 'Deixe vazio para usar o valor do talhão.' },
    ...(w ? [{ name: 'active', label: 'Situação', type: 'select', value: w.active === false ? 'false' : 'true', options: [['true', 'Ativo'], ['false', 'Inativo (sai da tela do fiscal)']] }] : [])
  ] });
  if (!v) return;
  const cpf = String(v.cpf || '').replace(/\D/g, ''), phone = String(v.phone || '').replace(/\D/g, '');
  if (cpf && !HarvestLabor.validCPF(cpf)) return toast('CPF inválido.');
  const row = { name: v.name.trim(), role: v.role, cpf, pix: v.pix.trim(), phone, dailyRate: v.dailyRate === '' ? null : Number(v.dailyRate), bagRate: v.bagRate === '' ? null : Number(v.bagRate), active: v.active !== 'false', pendingData: false };
  if (laborChange(farm, Lb => { if (w) Object.assign(Lb.workers.find(x => x.id === w.id), row); else Lb.workers.push({ id: uid(), ...row }); })) { toast(w ? 'Pessoa atualizada.' : 'Pessoa cadastrada.'); renderHarvestLabor(); }
}
async function laborCloseDialog(farm) {
  const L = farm.labor, open = [];
  for (let i = 0; i < 8; i++) { const d = new Date(HarvestLabor.weekStart(todayISO()) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 7 * i); const s = d.toISOString().slice(0, 10); if (!L.closings.some(c => c.weekStart === s)) open.push(s); }
  if (!open.length) return toast('Não há semanas abertas recentes.');
  const v = await askForm({ title: 'Fechar semana', fields: [{ name: 'week', label: 'Semana', type: 'select', options: open.map(s => [s, `${dateBR(s)} a ${dateBR(HarvestLabor.weekEnd(s))}`]) }] });
  if (!v) return;
  const calc = HarvestLabor.computeClosing(L, v.week);
  if (!calc.lines.length) return toast('Nada para fechar nesta semana.');
  const missing = [...new Set(HarvestLabor.pendingRates(L, v.week).map(e => L.workers.find(w => w.id === e.workerId)?.name || '—'))];
  if (HarvestLabor.duplicateGroups(L, v.week).length) { toast('Há lançamentos que parecem repetidos nesta semana. Resolva no aviso do topo antes de fechar.'); return; }
  if (HarvestLabor.lateOpen(L, v.week).length) { toast('Há apontamentos atrasados (de semana já paga) para revisar. Aprove ou recuse no aviso do topo antes de fechar.'); return; }
  if (HarvestLabor.graceOpen(L, v.week).length) { toast('Há colheita dentro da carência de defensivo nesta semana sem decisão. Decida em Banho antes de fechar.'); return; }
  if (missing.length) { toast('Há apontamentos sem valor (' + missing.join(', ') + '). Use o aviso no topo da página para completar.'); lbWeek = v.week; lbTab = 'lancamentos'; renderHarvestLabor(); return; }
  const ok = await ask(`${calc.lines.length} pessoa(s), total ${money(calc.total)}. A semana fica travada e cada pessoa com valor a receber ganha uma conta em Contas a pagar. Confirmar?`, { title: 'Fechar semana ' + dateBR(v.week), okText: 'Fechar semana' });
  if (!ok) return;
  const id = uid();
  if (laborChange(farm, Lb => Lb.closings.push({ id, weekStart: v.week, weekEnd: HarvestLabor.weekEnd(v.week), lines: [] }))) {
    toast('Semana fechada. As contas aparecem em Contas a pagar depois de salvar.');
    lbTab = 'fechamentos'; renderHarvestLabor();
  }
}
// Recibos do fechamento: imprimir (todos ou um) e mandar por WhatsApp com o texto pronto.
async function laborReceipts(farm, c) {
  if (!c) return;
  const L = farm.labor, w = id => L.workers.find(x => x.id === id) || {};
  const card = l => `<div class="receipt"><h4>Recibo de colheita · ${lbEsc(farm.name)}</h4><p>Semana ${dateBR(c.weekStart)} a ${dateBR(c.weekEnd)}</p><p><b>${lbEsc(l.name)}</b>${w(l.workerId).cpf ? ' · CPF ' + lbEsc(w(l.workerId).cpf) : ''}${w(l.workerId).pix ? ' · Pix ' + lbEsc(w(l.workerId).pix) : ''}</p>
    <table><tbody>${l.bags ? `<tr><td>Sacos: ${lbNum(l.bags, 1)}</td><td>${money(l.bagsValue)}</td></tr>` : ''}${l.days ? `<tr><td>Diárias: ${l.days}</td><td>${money(l.daysValue)}</td></tr>` : ''}${l.advances ? `<tr><td>Adiantamentos</td><td>−${money(l.advances)}</td></tr>` : ''}${l.discounts ? `<tr><td>Descontos</td><td>−${money(l.discounts)}</td></tr>` : ''}${l.previousDebt ? `<tr><td>Saldo devedor anterior</td><td>−${money(l.previousDebt)}</td></tr>` : ''}<tr class="total"><td>A receber</td><td>${money(l.total)}</td></tr>${l.newDebt ? `<tr><td>Fica para a próxima semana</td><td>−${money(l.newDebt)}</td></tr>` : ''}</tbody></table>
    <p class="sign">Recebi o valor acima. ______________________________ Data: ___/___/______</p></div>`;
  // Pagamento em lote: Pix copia e cola de cada pessoa (chave, nome e valor prontos; a pessoa confere no app do banco) e a
  // lista de pagamento em planilha. O arquivo de remessa do banco (CNAB) depende do banco da fazenda e não é gerado aqui.
  const city = (farm.expansion?.profiles || []).find(p => p.city)?.city || '';
  const pays = HarvestLabor.paymentList(L, c), payOf = id => pays.find(p => p.workerId === id);
  const pixOf = p => { try { return p && PixBR.payload({ pixKey: p.pix, name: p.name, city, amount: p.amount, txid: 'COL' + c.weekStart.replace(/-/g, '') + String(p.workerId).replace(/[^A-Za-z0-9]/g, '').slice(0, 10), description: 'Colheita ' + dateBR(c.weekStart) }); } catch { return ''; } };
  const keyLabel = p => { const k = p && PixBR.key(p.pix); return !p ? '—' : k ? `${lbEsc(k.type)}: ${lbEsc(k.value)}` : `<span class="badge gold">${p.pix ? 'Chave Pix não reconhecida' : 'Sem chave Pix'}</span>`; };
  const pixTotal = pays.filter(p => pixOf(p)).reduce((n, p) => n + p.amount, 0), noPix = pays.filter(p => !pixOf(p));
  const pending = openDialog(() => `<form class="dlg dlg-wide" role="dialog" aria-modal="true" aria-labelledby="dlgTitle"><h3 id="dlgTitle">Recibos e pagamentos · semana ${dateBR(c.weekStart)}</h3><input type="hidden" name="act">
    <p class="muted">${pays.length} pagamento(s), total ${money(pays.reduce((n, p) => n + p.amount, 0))}. ${noPix.length ? `<b>${noPix.length} sem chave Pix válida</b> (complete em Pessoas). ` : ''}Use "Copiar Pix" e cole em "Pix copia e cola" no app do banco: nome e valor já vêm preenchidos; confira antes de confirmar.</p>
    <div class="table-wrap"><table><thead><tr><th>Pessoa</th><th>A receber</th><th>Chave Pix</th><th></th></tr></thead><tbody>${c.lines.map(l => { const p = payOf(l.workerId), code = pixOf(p); return `<tr><td>${lbEsc(l.name)}</td><td><b>${money(l.total)}</b></td><td>${keyLabel(p)}</td><td><div class="row-actions">${code ? `<button type="button" class="btn small primary lb-pix" data-code="${lbEsc(code)}" data-name="${lbEsc(l.name)}">Copiar Pix</button>` : ''}<button type="button" class="btn small lb-act" data-act="print:${lbEsc(l.workerId)}">Imprimir</button><a class="btn small" target="_blank" rel="noopener noreferrer" href="https://wa.me/${w(l.workerId).phone ? '55' + lbEsc(w(l.workerId).phone) : ''}?text=${encodeURIComponent(HarvestLabor.receiptText(farm.name, c, l))}">WhatsApp</a></div></td></tr>`; }).join('')}</tbody></table></div>
    <div class="dlg-actions"><button type="button" class="btn lb-act" data-act="csv:all">Lista de pagamento (planilha)</button><button type="button" class="btn lb-act" data-act="print:all">Imprimir todos</button><button type="submit" class="btn primary">Fechar</button></div></form>`);
  const form = document.querySelector('.dlg-back:not(.closing) form');
  form?.querySelectorAll('.lb-act').forEach(b => b.onclick = () => { form.elements.act.value = b.dataset.act; form.requestSubmit(); });
  form?.querySelectorAll('.lb-pix').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.code); b.textContent = 'Copiado'; toast('Pix de ' + b.dataset.name + ' copiado. Cole em "Pix copia e cola" no app do banco.'); } catch { prompt('Copie o Pix copia e cola:', b.dataset.code); } });
  const out = await pending; const [act, who] = String(out?.act || '').split(':');
  if (act === 'csv') {
    downloadCSV(`pagamentos-colheita-${c.weekStart}.csv`, ['Pessoa', 'CPF', 'Tipo de chave', 'Chave Pix', 'Valor (R$)', 'Pix copia e cola', 'Semana'], pays.map(p => { const k = PixBR.key(p.pix); return [p.name, p.cpf, k?.type || 'sem chave válida', k?.value || p.pix, p.amount.toFixed(2).replace('.', ','), pixOf(p), `${dateBR(c.weekStart)} a ${dateBR(c.weekEnd)}`]; }));
    return toast(`Lista de pagamento gerada: ${money(pixTotal)} com Pix pronto${noPix.length ? `; ${noPix.length} pessoa(s) sem chave` : ''}.`);
  }
  if (act !== 'print') return;
  const area = document.createElement('div'); area.className = 'print-receipts';
  area.innerHTML = c.lines.filter(l => who === 'all' || l.workerId === who).map(card).join('');
  document.body.appendChild(area); document.body.classList.add('printing-receipts');
  setTimeout(() => { window.print(); document.body.classList.remove('printing-receipts'); area.remove(); }, 50);
}

// Safras e produção (café): sacos colhidos da roça por talhão, só leitura. Rendimento e custo por saca ficam para depois.
{
  const pageBefore = renderPage;
  renderPage = function (options) {
    pageBefore(options);
    if (currentPage !== 'safras' || selectedType() !== 'coffee' || !isLaborManager() || isGeneralView() || (typeof ruralSeasonSelection !== 'undefined' && ruralSeasonSelection)) return;
    const farm = activeFarm(); if (!farm?.labor?.entries?.length) return;
    const open = (farm.agriculture?.cycles || []).filter(c => c.activity === 'coffee' && c.stage !== 'Encerrada' && !c.archived);
    const from = open.map(c => c.startDate).sort()[0] || HarvestLabor.weekStart(todayISO());
    const totals = {};
    for (const e of farm.labor.entries) if (!e.voided && e.kind === 'saco' && e.date >= from) totals[e.plotId] = (totals[e.plotId] || 0) + e.bags;
    const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return;
    $('#pageContent').insertAdjacentHTML('beforeend', `<div class="card lb-safra"><div class="section-head"><div><h3>Colheita manual · sacos da roça</h3><p class="muted">Apontados pelo fiscal desde ${dateBR(from)}. Não é café beneficiado: o rendimento por talhão vem numa próxima etapa.</p></div><button class="btn" id="lbGoLabor">Mão de obra</button></div><div class="table-wrap"><table><thead><tr><th>Talhão</th><th>Sacos da roça</th></tr></thead><tbody>${rows.map(([p, n]) => `<tr><td>${lbEsc((farm.talhoes || []).find(t => t.id === p)?.name || '—')}</td><td><b>${lbNum(n, 1)}</b></td></tr>`).join('')}</tbody></table></div></div>`);
    $('#lbGoLabor').onclick = () => goToPage('mao-de-obra');
  };
}
