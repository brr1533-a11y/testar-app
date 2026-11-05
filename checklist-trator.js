/* Checklist do trator antes de sair: marca o que está OK, anota o problema e o horímetro. Vira um registro de campo
   (expansion.fieldLogs, tipo "checklist"), entra na mesma fila de lançamentos e no cofre, e avisa o escritório quando
   algum item tem problema. */
const CHECKLIST_ITENS = ['Óleo do motor', 'Água do radiador', 'Pneus', 'Freios', 'Luzes e sinalização', 'Vazamentos', 'Combustível', 'Engraxe', 'Cinto e cabine'];
function checklistPodeUsar() { return Boolean(currentUser) && typeof XR !== 'undefined' && XR.can(currentUser, 'campo-completo', AdmAccess.pagesFor(data)); }
async function abrirChecklistTrator() {
  const f = activeFarm(); if (!f) return toast('Escolha uma fazenda.');
  const equipment = [...(f.tractors || []), ...(f.implements || [])].filter(e => !e.archived && e.status !== 'Inativo');
  if (!equipment.length) return toast('Nenhum trator ou implemento cadastrado nesta fazenda.');
  const v = await askForm({ title: 'Checklist antes de sair', text: 'Desmarque o que estiver com problema. O escritório é avisado na hora (ou quando o celular pegar sinal).', wide: true, fields: [
    { name: 'equipmentId', label: 'Trator ou implemento', type: 'select', required: true, options: equipment.map(e => [e.id, e.name + (e.model ? ' · ' + e.model : '')]) },
    { name: 'ok', label: 'Está OK', type: 'choices', wide: true, options: CHECKLIST_ITENS.map(i => [i, i]), value: [...CHECKLIST_ITENS] },
    { name: 'meter', label: 'Horímetro (opcional)', type: 'number', min: 0, step: 'any' },
    { name: 'description', label: 'Problema encontrado (se houver)', type: 'textarea', wide: true }
  ] });
  if (!v) return;
  const ok = new Set(v.ok || []), checks = CHECKLIST_ITENS.map(item => ({ item, ok: ok.has(item) })), bad = checks.filter(c => !c.ok);
  const row = { id: uid(), activity: xActivity(f), date: todayISO(), notes: '', archived: false, kind: 'checklist', equipmentId: v.equipmentId, checks, description: String(v.description || '').trim().slice(0, 500) };
  if (v.meter !== '' && v.meter != null && Number.isFinite(Number(v.meter))) row.meter = Number(v.meter);
  if (xChange(f, c => c.expansion.fieldLogs.push(row))) toast(bad.length ? `Checklist guardado. ${bad.length} problema(s) avisado(s) ao escritório.` : 'Checklist guardado: tudo certo.');
}
{
  const prior = renderPage;
  renderPage = function (options) {
    prior(options);
    if (!['campo-completo', 'equipamentos-campo', 'meu-dia'].includes(currentPage) || !checklistPodeUsar() || isGeneralView()) return;
    const f = activeFarm(); if (!f || ![...(f.tractors || []), ...(f.implements || [])].length) return;
    const last = (f.expansion?.fieldLogs || []).filter(r => r.kind === 'checklist' && !r.archived).sort((a, b) => String(b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || '')))[0];
    const host = document.createElement('div'); host.className = 'card checklist-cta';
    host.innerHTML = `<div><b>Checklist antes de sair</b><span class="muted">${last ? 'Último: ' + escapeHTML(dateBR(last.date)) + ((last.checks || []).some(c => !c.ok) ? ' · com problema' : ' · tudo certo') : 'Confira óleo, água, pneus e freios antes de ligar.'}</span></div><button type="button" class="btn primary" id="checklistNovo">Fazer checklist</button>`;
    const anchor = $('#pageContent .fila-resumo'); if (anchor) anchor.after(host); else $('#pageContent').prepend(host);
    host.querySelector('#checklistNovo').onclick = abrirChecklistTrator;
  };
}
