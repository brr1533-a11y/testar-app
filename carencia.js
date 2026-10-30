/* Telas da carência de defensivos (regras em carencia-domain.js):
   - Banho (CEO/ADM): talhões em carência e colheitas lançadas dentro dela, para permitir (fica no histórico) ou estornar.
   - Banho do tratorista: "não entrar no talhão até…" e "colher só a partir de…".
   O aviso na tela do fiscal fica em maodeobra.js; o da colheita da safra, em graos.js. */
const grWhen = iso => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const grPlot = (farm, id) => (farm.talhoes || []).find(t => t.id === id)?.name || '—';

// Linhas "não entrar até" / "colher a partir de" de cada talhão com restrição valendo agora.
function graceStatusTable(farm) {
  const rows = Carencia.plotStatus(farm);
  if (!rows.length) return '';
  return `<div class="table-wrap"><table><thead><tr><th>Talhão</th><th>Entrada no talhão</th><th>Colheita</th></tr></thead><tbody>${rows.map(s => `<tr><td><b>${escapeHTML(grPlot(farm, s.plotId))}</b></td><td>${s.reentryUntil ? `<span class="badge red">Não entrar até ${grWhen(s.reentryUntil)}</span><div class="subtle">${escapeHTML(s.reentryOrder)}</div>` : 'Liberada'}</td><td>${s.harvestFrom ? `<span class="badge gold">Colher a partir de ${dateBR(s.harvestFrom)}</span><div class="subtle">${escapeHTML(s.harvestOrder)}</div>` : 'Liberada'}</td></tr>`).join('')}</tbody></table></div>`;
}

async function graceAllow(farm, d) {
  const v = await askForm({ title: 'Permitir colheita na carência', text: `${grPlot(farm, d.plotId)} · ${dateBR(d.date)}. O talhão só libera em ${dateBR(d.alert.harvestFrom)} (${d.alert.order}). A decisão fica registrada no histórico com o seu nome.`, fields: [{ name: 'note', label: 'Motivo', type: 'textarea', required: true, placeholder: 'Ex.: produto aplicado só na bordadura; colheita fora da área tratada' }] });
  if (!v) return false;
  const decision = { status: 'allowed', note: v.note.trim() };
  if (d.kind === 'labor') return laborChange(farm, L => { L.entries.find(e => e.id === d.id).graceDecision = decision; });
  const h = (farm.agriculture?.harvests || []).find(x => x.id === d.id); if (!h) return false;
  h.graceDecision = decision; saveData(); return true;
}
async function graceVoid(farm, d) {
  const v = await askForm({ title: 'Estornar apontamento', text: 'O apontamento continua no histórico, marcado como estornado, e não entra no pagamento.', fields: [{ name: 'reason', label: 'Motivo', required: true, value: 'Colheita dentro da carência de defensivo' }] });
  if (!v) return false;
  return laborChange(farm, L => { const e = L.entries.find(x => x.id === d.id); e.voided = true; e.voidReason = v.reason.trim(); });
}

{
  const pageBefore = renderPage;
  renderPage = function (options) {
    pageBefore(options);
    if (currentPage !== 'banho' || selectedType() !== 'coffee' || isGeneralView() || typeof Carencia === 'undefined') return;
    const farm = activeFarm(); if (!farm) return;
    const status = graceStatusTable(farm);
    if (currentUser.role === 'contribuinte') {
      if (status) $('#pageContent').insertAdjacentHTML('afterbegin', `<div class="card grace-card"><h3>Talhões com restrição</h3><p class="muted">Por causa dos banhos aplicados. Respeite as datas.</p>${status}</div>`);
      return;
    }
    const pend = Carencia.pendingDecisions(farm);
    const worker = id => farm.labor?.workers?.find(w => w.id === id)?.name || '—';
    const what = d => d.kind === 'labor' ? `Apontamento: ${escapeHTML(worker(d.workerId))} · ${d.entryKind === 'diaria' ? 'diária' : Number(d.bags).toLocaleString('pt-BR') + ' sc'}` : `Colheita da safra: ${Number(d.netKg || 0).toLocaleString('pt-BR')} kg`;
    const html = `${pend.length ? `<div class="card grace-pending"><h3>${pend.length} colheita${pend.length > 1 ? 's' : ''} lançada${pend.length > 1 ? 's' : ''} dentro da carência</h3><p class="muted">Decida se permite seguir. A semana da mão de obra só fecha depois da decisão.</p><ul>${pend.map(d => `<li><span><b>${escapeHTML(grPlot(farm, d.plotId))}</b> · ${dateBR(d.date)} · ${what(d)}<br><span class="subtle">${escapeHTML(d.alert.order)} · libera em ${dateBR(d.alert.harvestFrom)}</span></span><span class="inline"><button class="btn small grace-allow" data-k="${d.kind}" data-id="${escapeHTML(d.id)}">Permitir</button>${d.kind === 'labor' ? `<button class="btn small danger grace-void" data-id="${escapeHTML(d.id)}">Estornar</button>` : ''}</span></li>`).join('')}</ul></div>` : ''}
      ${status ? `<div class="card grace-card"><h3>Talhões em carência</h3><p class="muted">Calculado pelos banhos concluídos e pela carência e reentrada de cada produto.</p>${status}</div>` : ''}`;
    if (html.trim()) $('#pageContent').insertAdjacentHTML('afterbegin', html);
    const find = b => pend.find(d => d.id === b.dataset.id && (!b.dataset.k || d.kind === b.dataset.k));
    $$('.grace-allow').forEach(b => b.onclick = async () => { if (await graceAllow(farm, find(b))) { toast('Colheita permitida e registrada no histórico.'); renderPage(); } });
    $$('.grace-void').forEach(b => b.onclick = async () => { if (await graceVoid(farm, find(b))) { toast('Apontamento estornado.'); renderPage(); } });
  };
}
