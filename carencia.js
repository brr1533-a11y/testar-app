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

// Custo por unidade: banhos antigos com valor estimado (sem preço guardado na época). Quem vê os valores informa o
// preço pago em cada produto; o servidor recalcula, tira a marca de estimado e registra no histórico.
{
  const pageBefore = renderPage;
  renderPage = function (options) {
    pageBefore(options);
    if (currentPage !== 'custos-unidade' || isGeneralView()) return;
    const farm = activeFarm(); if (!farm) return;
    const list = (farm.banho?.orders || []).filter(o => o.stockCostSnapshot?.estimated && o.stockCostSnapshot.items?.length);
    if (!list.length) return;
    const total = list.reduce((n, o) => n + (o.stockCostSnapshot.total || 0), 0);
    $('#pageContent').insertAdjacentHTML('beforeend', `<div class="card grace-card bath-estimated"><h3>${list.length} banho${list.length > 1 ? 's' : ''} antigo${list.length > 1 ? 's' : ''} com valor estimado (${money(total)})</h3><p class="muted">Esses banhos são de antes de o sistema guardar o preço na hora da aplicação; o valor foi estimado pelo preço do estoque no dia da atualização. Se souber quanto pagou na época, informe: o custo da safra passa a usar esse preço e a troca fica no histórico.</p><div class="table-wrap"><table><thead><tr><th>Banho</th><th>Aplicado em</th><th>Produtos</th><th>Estimado</th><th></th></tr></thead><tbody>${list.map(o => `<tr><td><b>${escapeHTML(o.title || 'Banho')}</b></td><td>${dateBR(String(o.reportedAt || o.completedAt || '').slice(0, 10))}</td><td>${o.stockCostSnapshot.items.map(i => `${escapeHTML(i.name)}: ${Number(i.quantity).toLocaleString('pt-BR')} ${escapeHTML(i.unit)} × ${i.unitCost == null ? '<span class="badge gold">sem preço</span>' : money(i.unitCost)}`).join('<br>')}</td><td>${money(o.stockCostSnapshot.total)}</td><td><button class="btn small bath-price" data-id="${escapeHTML(o.id)}">Informar preço da época</button></td></tr>`).join('')}</tbody></table></div></div>`);
    $$('.bath-price').forEach(b => b.onclick = async () => {
      const o = list.find(x => x.id === b.dataset.id); if (!o) return;
      const v = await askForm({ title: 'Preço da época · ' + (o.title || 'Banho'), text: 'Preço por unidade pago em cada produto quando o banho foi aplicado (nota fiscal ou pedido da época).', fields: o.stockCostSnapshot.items.map(i => ({ name: 'p' + i.productIndex, label: `${i.name} (R$ por ${i.unit}) · usados ${Number(i.quantity).toLocaleString('pt-BR')} ${i.unit}`, type: 'number', min: '0', step: '0.01', value: i.unitCost ?? '', required: true })) });
      if (!v) return;
      try {
        const r = await api('/api/banho/preco-epoca', { method: 'POST', body: JSON.stringify({ farmId: farm.id, orderId: o.id, prices: o.stockCostSnapshot.items.map(i => ({ productIndex: i.productIndex, unitCost: Number(v['p' + i.productIndex]) })) }) });
        absorbServerPayload(r); writeCache(); renderPage(); toast('Preço da época registrado. O custo da safra foi atualizado.');
      } catch (e) { toast(e.message); }
    });
  };
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
