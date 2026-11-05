/* 4.18 · Fechamento do mês (PDF piloto) e margem por hectare.
   O fechamento destaca pendências e custos sem rateio, para o mês ficar limpo antes de ir ao contador.
   A margem compara as fazendas com o mesmo período, cultura e critério de custo. */
let fechMes = new Date().toISOString().slice(0, 7), margemFiltro = null;
const fmBRL = v => money(Number(v) || 0), fmMes = m => { const [y, mm] = m.split('-'); return ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][Number(mm) - 1] + ' de ' + y; };

function fechamentoHTML(f, r, print) {
  const t = (h, rows) => rows.length ? `<div class="table-wrap"><table><thead><tr>${h.map(x => `<th>${escapeHTML(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => '<tr>' + row.map(c => `<td>${c}</td>`).join('') + '</tr>').join('')}</tbody></table></div>` : '<p class="muted">Nada.</p>';
  const groups = [...new Set(r.pendencies.map(p => p.kind))];
  return `${print ? `<h1>Fechamento de ${escapeHTML(fmMes(r.month))}</h1><small>${escapeHTML(f.name)} · gerado em ${escapeHTML(dateBR(todayISO()))} pelo Gestão Rural</small>` : ''}
    <h${print ? 2 : 3}>Resultado do mês</h${print ? 2 : 3}>
    ${print ? `<div class="k"><div>Entradas<b>${fmBRL(r.income)}</b></div><div>Saídas<b>${fmBRL(r.spend)}</b></div><div>Resultado<b>${fmBRL(r.result)}</b></div></div>` : xKpis([['Entradas', fmBRL(r.income)], ['Saídas', fmBRL(r.spend)], ['Resultado', fmBRL(r.result)], ['Pendências', String(r.pendencies.length)]])}
    <h${print ? 2 : 3}>Pendências para resolver</h${print ? 2 : 3}>
    ${r.pendencies.length ? groups.map(g => `<p><b>${escapeHTML(g)}</b></p>` + t(['Item', 'Valor'], r.pendencies.filter(p => p.kind === g).map(p => [escapeHTML(p.text), p.amount != null ? fmBRL(p.amount) : '—']))).join('') : '<p>Nenhuma pendência. O mês está pronto para o contador.</p>'}
    <h${print ? 2 : 3}>Custos sem rateio</h${print ? 2 : 3}>
    <p>Geral (escolhido de propósito, custo da fazenda toda): <b>${fmBRL(r.general)}</b></p>
    <p>Sem destino (ninguém definiu se é de uma safra, de um lote ou geral): <b>${fmBRL(r.noTargetTotal)}</b></p>
    ${t(['Data', 'Custo', 'Categoria', 'Valor'], r.noTarget.map(x => [escapeHTML(dateBR(x.date)), escapeHTML(x.label), escapeHTML(x.category || ''), fmBRL(x.amount)]))}
    <h${print ? 2 : 3}>Custos por destino</h${print ? 2 : 3}>
    ${t(['Destino', 'Valor'], r.costs.map(c => [escapeHTML(c.name), fmBRL(c.amount)]))}
    <p class="muted">Piloto: confira com o contador antes de usar como fechamento oficial. Os custos seguem os mesmos critérios das telas de custo (pagos uma vez, vales fora do custo, insumo no consumo).</p>`;
}
function renderFechamento(meta) {
  const farms = isGeneralView() ? farmsInContext() : [activeFarm()].filter(Boolean);
  $('#pageContent').innerHTML = `<header class="exp-head"><div><span class="eyebrow">${escapeHTML(meta.group)}</span><h2>${escapeHTML(meta.name)}</h2><p class="muted">Resultado, pendências e custos sem rateio do mês. Resolva as pendências antes de mandar ao contador.</p></div></header>
    <div class="exp-actions"><label>Mês <input type="month" id="fechMes" value="${fechMes}" max="${todayISO().slice(0, 7)}"></label><button class="btn primary" id="fechPdf">Abrir para imprimir / salvar PDF</button></div>
    ${farms.map(f => `<section class="exp-section"><h3>${escapeHTML(f.name)}</h3>${fechamentoHTML(f, RuralMelhorias.monthClose(f, fechMes, XR, todayISO()), false)}</section>`).join('') || '<p class="muted">Escolha uma fazenda.</p>'}`;
  $('#fechMes').onchange = e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) { fechMes = e.target.value; renderFechamento(meta); } };
  $('#fechPdf').onclick = () => mhPrint('Fechamento ' + fmMes(fechMes), farms.map(f => fechamentoHTML(f, RuralMelhorias.monthClose(f, fechMes, XR, todayISO()), true)).join('<hr>'));
}

function renderMargem(meta) {
  const crops = [...new Set((data.farms || []).flatMap(f => (f.agriculture?.cycles || []).filter(c => !c.archived).map(c => c.crop)))].sort();
  margemFiltro ||= { from: todayISO().slice(0, 4) + '-01-01', to: todayISO(), crop: crops[0] || '', general: false };
  if (!crops.includes(margemFiltro.crop)) margemFiltro.crop = crops[0] || '';
  const list = margemFiltro.crop ? RuralMelhorias.marginReport(data.farms || [], XR, margemFiltro) : [];
  const ha = v => v == null ? '—' : fmBRL(v) + '/ha';
  $('#pageContent').innerHTML = `<header class="exp-head"><div><span class="eyebrow">${escapeHTML(meta.group)}</span><h2>${escapeHTML(meta.name)}</h2><p class="muted">Receita das vendas menos o custo, dividido pela área. Todas as fazendas com o mesmo período, a mesma cultura e o mesmo critério de custo.</p></div></header>
    <form class="exp-actions" id="margemForm"><label>De <input type="date" name="from" value="${margemFiltro.from}"></label><label>Até <input type="date" name="to" value="${margemFiltro.to}" max="${todayISO()}"></label>
      <label>Cultura <select name="crop">${crops.map(c => `<option ${c === margemFiltro.crop ? 'selected' : ''}>${escapeHTML(c)}</option>`).join('')}</select></label>
      <label class="fila-modo"><input type="checkbox" name="general" ${margemFiltro.general ? 'checked' : ''}> Incluir custo Geral dividido pela área</label><button class="btn primary">Comparar</button></form>
    ${list.length ? xTable(['Fazenda', 'Área', 'Sacas', 'Receita', 'Custo direto', 'Geral rateado', 'Margem', 'Margem por ha'], list.map(r => [`<b>${escapeHTML(r.farm)}</b>`, xNum(r.areaHa) + ' ha', xNum(r.bags), fmBRL(r.revenue), fmBRL(r.direct), margemFiltro.general ? fmBRL(r.general) : '—', `<span class="${r.margin < 0 ? 'exp-bad' : 'exp-good'}">${fmBRL(r.margin)}</span>`, `<b>${ha(r.marginHa)}</b>`]))
      + list.map(r => `<details class="exp-section"><summary>${escapeHTML(r.farm)}: por safra</summary>${xTable(['Safra', 'Área', 'Sacas', 'Receita', 'Custo', 'Margem por ha'], r.rows.map(x => [escapeHTML(x.name), xNum(x.areaHa) + ' ha', xNum(x.bags), fmBRL(x.revenue), fmBRL(x.cost), ha(x.marginHa)]))}</details>`).join('')
      : '<p class="exp-help">Sem vendas, colheitas ou custos dessa cultura no período.</p>'}
    <p class="muted">Critério: custo direto é o que foi lançado na safra (saídas com a safra como centro de custo, consumo de insumos, mão de obra e prestadores). "Geral rateado" divide o custo marcado como Geral pela área das safras da mesma atividade. Custo sem destino fica fora: resolva no Fechamento do mês.</p>`;
  $('#margemForm').onsubmit = e => { e.preventDefault(); const v = new FormData(e.target); margemFiltro = { from: v.get('from'), to: v.get('to'), crop: v.get('crop'), general: v.get('general') === 'on' }; if (margemFiltro.from > margemFiltro.to) return toast('A data inicial precisa ser antes da final.'); renderMargem(meta); };
}

{
  const prior = renderExpansionPage;
  renderExpansionPage = function (page) {
    if (!['fechamento-mes', 'margem-hectare'].includes(page)) return prior(page);
    const meta = XR.PAGES.find(p => p.id === page); if (!meta || !XR.can(currentUser, page, AdmAccess.pagesFor(data))) return;
    setHeader(meta.group, meta.name);
    return page === 'fechamento-mes' ? renderFechamento(meta) : renderMargem(meta);
  };
}
