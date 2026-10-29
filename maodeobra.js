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
  $('#pageContent').innerHTML = `<div class="hf">
    <div class="hf-top card">
      <label>Talhão<select id="hfPlot">${plots.map(p => `<option value="${lbEsc(p.id)}" ${p.id === hfPlot ? 'selected' : ''}>${lbEsc(p.name)}</option>`).join('') || '<option value="">Nenhum talhão cadastrado</option>'}</select></label>
      <label>Data<input type="date" id="hfDate" value="${hfDate}" max="${todayISO()}"></label>
    </div>
    ${closed ? '<div class="card hf-closed">Esta semana já foi fechada. Escolha outra data.</div>' : ''}
    ${!L.workers.length ? `<div class="card empty">Nenhuma pessoa cadastrada ainda. Toque em <b>+ Nova pessoa</b> para incluir quem está colhendo.</div>` : ''}
    <div class="hf-tools">${L.workers.length > 12 ? `<input class="hf-search" id="hfSearch" type="search" placeholder="Procurar pessoa" value="${lbEsc(hfSearch)}">` : ''}<button type="button" class="btn hf-new" id="hfNewWorker">+ Nova pessoa</button></div>
    <div class="hf-list">${workers.map(w => { const c = hfCounts[w.id] || { bags: 0, diaria: false }, prev = doneBy(w.id), prevBags = prev.filter(e => e.kind === 'saco').reduce((n, e) => n + e.bags, 0), prevDay = prev.some(e => e.kind === 'diaria');
      return `<div class="hf-row ${c.bags || c.diaria ? 'on' : ''}"><div class="hf-name"><b>${lbEsc(w.name)}</b><small>${lbEsc(HarvestLabor.ROLES[w.role] || '')}${w.pendingData ? ' · cadastro novo' : ''}${prevBags ? ` · já lançado: ${lbNum(prevBags, 1)} sc` : ''}${prevDay ? ' · diária lançada' : ''}</small></div>
        <div class="hf-ctrl">${w.role === 'diarista' ? '' : `<button type="button" class="hf-btn" data-w="${lbEsc(w.id)}" data-d="-1" aria-label="Menos um saco" ${closed ? 'disabled' : ''}>−</button><span class="hf-count" aria-live="polite">${lbNum(c.bags, 1)}</span><button type="button" class="hf-btn plus" data-w="${lbEsc(w.id)}" data-d="1" aria-label="Mais um saco" ${closed ? 'disabled' : ''}>+</button>`}
        <button type="button" class="hf-day ${c.diaria ? 'on' : ''}" data-w="${lbEsc(w.id)}" ${closed || prevDay ? 'disabled' : ''}>Diária</button></div></div>`; }).join('')}</div>
    <div class="hf-save"><button class="btn primary hf-save-btn" id="hfSave" ${pending.length && !closed ? '' : 'disabled'}>Salvar ${pending.length ? pending.length + (pending.length > 1 ? ' pessoas' : ' pessoa') : ''}</button><span class="muted">${navigator.onLine ? 'Conectado' : 'Sem internet: fica guardado no aparelho (Modo de campo) e envia quando pegar sinal.'}</span></div>
    ${done.length ? `<div class="card"><h3>Já lançado · ${lbEsc(plots.find(p => p.id === hfPlot)?.name)} · ${dateBR(hfDate)}</h3><p class="muted">${lbNum(done.filter(e => e.kind === 'saco').reduce((n, e) => n + e.bags, 0), 1)} sacos · ${done.filter(e => e.kind === 'diaria').length} diária(s)</p>
      <ul class="hf-done">${done.map(e => `<li><span>${lbEsc(L.workers.find(w => w.id === e.workerId)?.name || '—')} · ${e.kind === 'diaria' ? 'Diária' : lbNum(e.bags, 1) + ' sc'}</span>${!closed && (isLaborManager() || e.recordedBy === me) ? `<button class="btn small hf-fix" data-id="${lbEsc(e.id)}">Corrigir</button>` : ''}</li>`).join('')}</ul></div>` : ''}
  </div>`;
  $('#hfPlot').onchange = e => { hfPlot = e.target.value; hfCounts = {}; renderHarvestField(); };
  $('#hfDate').onchange = e => { hfDate = e.target.value || todayISO(); hfCounts = {}; renderHarvestField(); };
  if ($('#hfSearch')) $('#hfSearch').oninput = e => { hfSearch = e.target.value; const pos = e.target.selectionStart; renderHarvestField(); const i = $('#hfSearch'); i.focus(); i.setSelectionRange(pos, pos); };
  $$('.hf-btn').forEach(b => b.onclick = () => { const c = hfCounts[b.dataset.w] ||= { bags: 0, diaria: false }; c.bags = Math.max(0, Math.min(200, c.bags + Number(b.dataset.d))); renderHarvestField(); });
  $$('.hf-day').forEach(b => b.onclick = () => { const c = hfCounts[b.dataset.w] ||= { bags: 0, diaria: false }; c.diaria = !c.diaria; renderHarvestField(); });
  $('#hfSave').onclick = () => {
    if (!hfPlot) return toast('Escolha o talhão.');
    const rows = Object.entries(hfCounts).flatMap(([workerId, c]) => [...(c.bags > 0 ? [{ id: uid(), date: hfDate, plotId: hfPlot, workerId, kind: 'saco', bags: c.bags }] : []), ...(c.diaria ? [{ id: uid(), date: hfDate, plotId: hfPlot, workerId, kind: 'diaria' }] : [])]);
    if (!rows.length) return;
    const noRate = isLaborManager() ? rows.filter(r => !HarvestLabor.rateFor(farm.labor, r)).length : 0;
    if (laborChange(farm, Lb => Lb.entries.push(...rows))) { hfCounts = {}; toast(`${rows.length} apontamento(s) salvo(s).` + (noRate ? ` ${noRate} sem valor: defina a diária ou o valor do saco antes de fechar a semana.` : '')); renderHarvestField(); }
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
  let body = '';
  if (lbTab === 'pessoas') {
    body = `<div class="section-head"><div><h2>Pessoas da colheita</h2><p>Panhadores, safristas e diaristas. CPF e Pix aparecem só aqui; o fiscal vê apenas o nome.</p></div><button class="btn primary" id="lbNewWorker">Nova pessoa</button></div>
      ${L.workers.length ? `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Função</th><th>CPF</th><th>Pix</th><th>WhatsApp</th><th>Diária</th><th>Saco (próprio)</th><th>Situação</th><th></th></tr></thead><tbody>${[...L.workers].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(w => `<tr><td><b>${lbEsc(w.name)}</b>${w.pendingData ? '<br><span class="badge gold">Completar dados</span>' : ''}</td><td>${lbEsc(HarvestLabor.ROLES[w.role])}</td><td>${w.cpf ? lbEsc(w.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')) : '—'}</td><td>${lbEsc(w.pix || '—')}</td><td>${lbEsc(w.phone || '—')}</td><td>${w.dailyRate ? money(w.dailyRate) : '—'}</td><td>${w.bagRate ? money(w.bagRate) : 'do talhão'}</td><td><span class="badge ${w.active === false ? '' : 'green'}">${w.active === false ? 'Inativo' : 'Ativo'}</span></td><td><button class="btn small lb-edit" data-id="${lbEsc(w.id)}">Editar</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty">Cadastre a turma da colheita.</div>'}`;
  } else if (lbTab === 'valores') {
    const plots = farm.talhoes || [];
    body = `<div class="section-head"><div><h2>Valor do saco por talhão</h2><p>Lavoura carregada paga diferente de lavoura fraca. Cada apontamento guarda o valor do dia em que foi lançado: mudar o valor não mexe no que já foi apontado.</p></div><button class="btn primary" id="lbNewRate" ${plots.length ? '' : 'disabled'}>Definir valor</button></div>
      ${plots.length ? `<div class="table-wrap"><table><thead><tr><th>Talhão</th><th>Valor hoje</th><th>Histórico</th></tr></thead><tbody>${plots.map(p => { const hist = L.plotRates.filter(r => r.plotId === p.id).sort((a, b) => b.validFrom.localeCompare(a.validFrom)); const now = HarvestLabor.plotRate(L, p.id, todayISO()); return `<tr><td><b>${lbEsc(p.name)}</b></td><td>${now ? money(now) + ' / saco' : '<span class="badge gold">Sem valor</span>'}</td><td class="muted">${hist.map(r => `${money(r.ratePerBag)} desde ${dateBR(r.validFrom)}`).join('<br>') || '—'}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="card empty">Cadastre os talhões em Lavoura › Talhões.</div>'}`;
  } else if (lbTab === 'lancamentos') {
    const end = HarvestLabor.weekEnd(lbWeek), inWeek = r => r.date >= lbWeek && r.date <= end;
    const entries = L.entries.filter(inWeek).sort((a, b) => b.date.localeCompare(a.date)), adj = L.adjustments.filter(inWeek);
    const name = id => L.workers.find(w => w.id === id)?.name || '—', plot = id => (farm.talhoes || []).find(t => t.id === id)?.name || '—';
    body = `<div class="section-head"><div class="inline lb-week"><button class="btn small" id="lbPrev">‹</button><b>Semana ${dateBR(lbWeek)} a ${dateBR(end)}</b><button class="btn small" id="lbNext">›</button>${closedWeek ? '<span class="badge green">Fechada</span>' : '<span class="badge gold">Aberta</span>'}</div><div class="inline"><button class="btn" id="lbGoField">Apontar colheita</button><button class="btn" id="lbAdj" ${closedWeek ? 'disabled' : ''}>Adiantamento ou desconto</button></div></div>
      <h3>Prévia do fechamento</h3>
      ${preview.lines.length ? `<div class="table-wrap"><table><thead><tr><th>Pessoa</th><th>Sacos</th><th>Valor sacos</th><th>Diárias</th><th>Valor diárias</th><th>Adiantamentos</th><th>Descontos</th><th>Saldo anterior</th><th>A receber</th></tr></thead><tbody>${preview.lines.map(l => `<tr><td><b>${lbEsc(l.name)}</b></td><td>${lbNum(l.bags, 1)}</td><td>${money(l.bagsValue)}</td><td>${l.days}</td><td>${money(l.daysValue)}</td><td>${l.advances ? '−' + money(l.advances) : '—'}</td><td>${l.discounts ? '−' + money(l.discounts) : '—'}</td><td>${l.previousDebt ? '−' + money(l.previousDebt) : '—'}</td><td><b>${money(l.total)}</b>${l.newDebt ? `<br><span class="muted">fica −${money(l.newDebt)}</span>` : ''}${l.pending ? `<br><span class="badge gold">${l.pending} sem valor</span>` : ''}</td></tr>`).join('')}</tbody></table></div>${preview.lines.some(l => l.pending) ? '<p class="muted">Há apontamentos sem valor: defina a diária da pessoa (aba Pessoas) ou o valor do saco do talhão (aba Valores por talhão). A semana só fecha depois disso.</p>' : ''}` : '<div class="card empty">Nenhum apontamento nesta semana.</div>'}
      <h3>Apontamentos</h3>
      ${entries.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Pessoa</th><th>Talhão</th><th>Tipo</th><th>Valor</th><th>Lançado por</th><th></th></tr></thead><tbody>${entries.map(e => `<tr class="${e.voided ? 'lb-void' : ''}"><td>${dateBR(e.date)}</td><td>${lbEsc(name(e.workerId))}</td><td>${lbEsc(plot(e.plotId))}</td><td>${e.kind === 'diaria' ? 'Diária' : lbNum(e.bags, 1) + ' sc' + (e.rate == null ? '' : ' × ' + money(e.rate))}</td><td>${e.voided ? 'Estornado: ' + lbEsc(e.voidReason) : e.rate == null ? '<span class="badge gold">Sem valor</span>' : money(HarvestLabor.entryAmount(e))}</td><td>${lbEsc(e.recordedBy || 'Salvando')}</td><td>${!closedWeek && !e.voided ? `<button class="btn small lb-void" data-id="${lbEsc(e.id)}" data-k="entries">Estornar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${adj.length ? `<h3>Adiantamentos e descontos</h3><div class="table-wrap"><table><thead><tr><th>Data</th><th>Pessoa</th><th>Tipo</th><th>Valor</th><th>Motivo</th><th></th></tr></thead><tbody>${adj.map(a => `<tr class="${a.voided ? 'lb-void' : ''}"><td>${dateBR(a.date)}</td><td>${lbEsc(name(a.workerId))}</td><td>${a.kind === 'adiantamento' ? 'Adiantamento' : 'Desconto'}</td><td>${money(a.amount)}</td><td>${lbEsc(a.voided ? 'Estornado: ' + a.voidReason : a.reason)}</td><td>${!closedWeek && !a.voided ? `<button class="btn small lb-void" data-id="${lbEsc(a.id)}" data-k="adjustments">Estornar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
  } else {
    body = `<div class="section-head"><div><h2>Fechamentos semanais</h2><p>O fechamento soma sacos × valor + diárias − adiantamentos − descontos, trava a semana e cria uma conta a pagar por pessoa em Contas a pagar.</p></div><button class="btn primary" id="lbClose">Fechar semana</button></div>
      ${L.closings.length ? `<div class="table-wrap"><table><thead><tr><th>Semana</th><th>Pessoas</th><th>Total</th><th>Fechado por</th><th></th></tr></thead><tbody>${[...L.closings].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).map(c => `<tr><td><b>${dateBR(c.weekStart)} a ${dateBR(c.weekEnd)}</b></td><td>${c.lines.length}</td><td>${money(c.total)}</td><td>${lbEsc(c.closedBy || 'Salvando')}${c.closedAt ? '<br><span class="muted">' + dateBR(c.closedAt.slice(0, 10)) + '</span>' : ''}</td><td><button class="btn small lb-open" data-id="${lbEsc(c.id)}">Recibos</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty">Nenhuma semana fechada ainda.</div>'}`;
  }
  $('#pageContent').innerHTML = `<div class="hero-surface"><div><h2>Colheita manual sem caderno.</h2><p>O fiscal aponta no celular quantos sacos cada pessoa colheu (ou a diária), mesmo sem internet. Aqui você cadastra a turma, define o valor do saco por talhão, lança adiantamentos e fecha a semana com recibo para imprimir ou mandar por WhatsApp.</p></div></div>${kpis}
    <div class="page-tabs">${tabs.map(([id, l]) => `<button type="button" class="page-tab ${lbTab === id ? 'active' : ''}" data-lb="${id}">${l}</button>`).join('')}</div>${body}`;
  $$('[data-lb]').forEach(b => b.onclick = () => { lbTab = b.dataset.lb; renderHarvestLabor(); });
  if ($('#lbNewWorker')) $('#lbNewWorker').onclick = () => laborWorkerDialog(farm, null);
  $$('.lb-edit').forEach(b => b.onclick = () => laborWorkerDialog(farm, L.workers.find(w => w.id === b.dataset.id)));
  if ($('#lbNewRate')) $('#lbNewRate').onclick = async () => {
    const v = await askForm({ title: 'Valor do saco no talhão', fields: [{ name: 'plotId', label: 'Talhão', type: 'select', options: (farm.talhoes || []).map(t => [t.id, t.name]), required: true }, { name: 'ratePerBag', label: 'Valor por saco (R$)', type: 'number', min: '0.01', step: '0.01', required: true }, { name: 'validFrom', label: 'Vale a partir de', type: 'date', value: todayISO(), required: true }] });
    if (v && laborChange(farm, Lb => Lb.plotRates.push({ id: uid(), plotId: v.plotId, ratePerBag: Number(v.ratePerBag), validFrom: v.validFrom }))) { toast('Valor definido.'); renderHarvestLabor(); }
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
  if (missing.length) return toast('Há apontamentos sem valor (' + missing.join(', ') + '). Defina a diária ou o valor do saco antes de fechar.');
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
  const pending = openDialog(() => `<form class="dlg dlg-wide" role="dialog" aria-modal="true" aria-labelledby="dlgTitle"><h3 id="dlgTitle">Recibos · semana ${dateBR(c.weekStart)}</h3><input type="hidden" name="act">
    <div class="table-wrap"><table><thead><tr><th>Pessoa</th><th>A receber</th><th></th></tr></thead><tbody>${c.lines.map(l => `<tr><td>${lbEsc(l.name)}</td><td><b>${money(l.total)}</b></td><td><div class="row-actions"><button type="button" class="btn small lb-act" data-act="print:${lbEsc(l.workerId)}">Imprimir</button><a class="btn small" target="_blank" rel="noopener noreferrer" href="https://wa.me/${w(l.workerId).phone ? '55' + lbEsc(w(l.workerId).phone) : ''}?text=${encodeURIComponent(HarvestLabor.receiptText(farm.name, c, l))}">WhatsApp</a></div></td></tr>`).join('')}</tbody></table></div>
    <div class="dlg-actions"><button type="button" class="btn lb-act" data-act="print:all">Imprimir todos</button><button type="submit" class="btn primary">Fechar</button></div></form>`);
  const form = document.querySelector('.dlg-back:not(.closing) form');
  form?.querySelectorAll('.lb-act').forEach(b => b.onclick = () => { form.elements.act.value = b.dataset.act; form.requestSubmit(); });
  const out = await pending; const [act, who] = String(out?.act || '').split(':');
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
