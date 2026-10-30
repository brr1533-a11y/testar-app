/* Módulos de campo: pós-colheita do café (secagem, tulha, beneficiamento e rendimento), monitoramento de pragas do café,
   reprodução e sanidade do gado (estação de monta, prenhez, partos, desmame, vacinas e GTA) e gado de leite.
   Tudo fica em farm.field; cada registro tem a atividade (coffee/cattle) para respeitar o que o Grupo contratou.
   Usado pela tela e pelo servidor (o servidor valida de novo e grava autor e data). */
(function (root, factory) {
  const api = factory(typeof require === 'function' ? require('./rural-domain.js') : root.RuralDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FieldOps = api;
})(typeof self !== 'undefined' ? self : this, function (D) {
  const KEYS = ['postHarvest', 'pests', 'seasons', 'reproduction', 'vaccines', 'gta', 'dairyCows', 'milk'];
  const ACTIVITY = { postHarvest: 'coffee', pests: 'coffee', seasons: 'cattle', reproduction: 'cattle', vaccines: 'cattle', gta: 'cattle', dairyCows: 'cattle', milk: 'cattle' };
  const DRYING = { terreiro: 'Terreiro', secador: 'Secador', misto: 'Terreiro + secador' };
  // Nível de controle usual (% de infestação na amostragem). Acima dele, a tela avisa para o técnico decidir o controle.
  const PESTS = { broca: { name: 'Broca-do-café', control: 3, unit: '% de frutos broqueados' }, ferrugem: { name: 'Ferrugem', control: 5, unit: '% de folhas com ferrugem' }, 'bicho-mineiro': { name: 'Bicho-mineiro', control: 30, unit: '% de folhas minadas' }, cercospora: { name: 'Cercosporiose', control: 10, unit: '% de folhas atacadas' }, outra: { name: 'Outra', control: null, unit: '%' } };
  const REPRO = { cobertura: 'Cobertura / monta natural', iatf: 'Inseminação (IATF/IA)', diagnostico: 'Diagnóstico de prenhez', parto: 'Parto', desmame: 'Desmame' };
  const GTA_PURPOSE = ['Abate', 'Recria', 'Engorda', 'Reprodução', 'Exposição/leilão', 'Outra'];
  const fail = msg => { throw Object.assign(new Error(msg), { statusCode: 422 }); };
  const check = (ok, msg) => { if (!ok) fail(msg); };
  const text = (v, max) => v == null || v === '' || (typeof v === 'string' && v.length <= max);
  const filled = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  const num = (v, min = 0, max = 1e9) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const optNum = (v, min, max) => v == null || num(v, min, max);
  const date = v => D.validDate(v);
  const optDate = v => v == null || v === '' || D.validDate(v);
  const today = () => new Date().toISOString().slice(0, 10);
  function init(farm) { farm.field ||= {}; for (const k of KEYS) farm.field[k] ||= []; return farm.field; }

  // ---- Pós-colheita ----
  function lotStage(l) { return l.processing ? 'beneficiado' : l.storage ? 'tulha' : l.drying?.end ? 'seco' : 'secando'; }
  // Rendimento: % do peso em coco que vira café beneficiado, sacas de 60 kg e litros de café da roça por saca beneficiada.
  function lotYield(l) {
    const p = l.processing; if (!p || !p.cocoKg || !p.beneficiadoKg) return null;
    const bags = p.beneficiadoKg / 60;
    return { pct: p.beneficiadoKg / p.cocoKg * 100, bags, litersPerBag: l.volumeL ? l.volumeL / bags : null, cocoPerBag: p.cocoKg / bags };
  }
  // ---- Pragas ----
  function pestAlert(r) { const lim = PESTS[r.pest]?.control; return lim != null && r.infestationPct >= lim; }
  function latestPests(field) { const out = new Map(); for (const r of [...(field.pests || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)))) out.set(r.plotId + '|' + r.pest, r); return [...out.values()]; }
  // ---- Reprodução ----
  function reproStats(field, seasonId) {
    const ev = (field.reproduction || []).filter(e => !seasonId || e.seasonId === seasonId);
    const diag = ev.filter(e => e.type === 'diagnostico'), pregnant = diag.filter(e => e.result === 'prenhe');
    const heads = (e) => Number(e.heads || 1);
    const sum = list => list.reduce((n, e) => n + heads(e), 0);
    return { diagnosed: sum(diag), pregnant: sum(pregnant), rate: sum(diag) ? sum(pregnant) / sum(diag) * 100 : null, births: sum(ev.filter(e => e.type === 'parto')), weaned: sum(ev.filter(e => e.type === 'desmame')), served: sum(ev.filter(e => e.type === 'cobertura' || e.type === 'iatf')) };
  }
  function vaccineStatus(v, on = today()) { return v.doneDate ? 'feita' : v.dueDate < on ? 'atrasada' : (Date.parse(v.dueDate) - Date.parse(on)) / 86400000 <= 15 ? 'proxima' : 'agendada'; }
  // ---- Leite ----
  function milkSummary(field, on = today()) {
    // Leite de vaca em carência de medicamento (marcado pelo servidor como descarte) não entra na produção entregue.
    const recs = (field.milk || []).filter(r => !r.discard), day = d => recs.filter(r => r.date === d).reduce((n, r) => n + r.liters, 0);
    const back = n => new Date(Date.parse(on) - n * 86400000).toISOString().slice(0, 10);
    const last7 = Array.from({ length: 7 }, (_, i) => day(back(i)));
    const lactating = (field.dairyCows || []).filter(c => c.status === 'lactacao').length;
    const avg7 = last7.reduce((a, b) => a + b, 0) / 7;
    return { today: day(on), avg7, lactating, perCow: lactating ? avg7 / lactating : null, days: Array.from({ length: 14 }, (_, i) => ({ date: back(13 - i), liters: day(back(13 - i)) })) };
  }
  function cowAverage(field, cowId, on = today()) {
    const from = new Date(Date.parse(on) - 29 * 86400000).toISOString().slice(0, 10);
    const recs = (field.milk || []).filter(r => r.cowId === cowId && r.date >= from && r.date <= on);
    const days = new Set(recs.map(r => r.date)).size;
    return days ? recs.reduce((n, r) => n + r.liters, 0) / days : null;
  }

  function validateFarm(farm) {
    const f = init(farm), plots = new Set((farm.talhoes || []).map(t => t.id)), lots = new Set((farm.cattle?.lots || []).map(l => l.id));
    for (const k of KEYS) {
      check(Array.isArray(f[k]) && f[k].length <= 50000, 'Lista grande demais.');
      const ids = new Set();
      for (const r of f[k]) { check(r && typeof r.id === 'string' && r.id && r.id.length <= 80 && !ids.has(r.id), 'Identificação de registro de campo inválida ou repetida.'); ids.add(r.id); check(r.activity === ACTIVITY[k], 'Atividade do registro de campo inválida.'); check(text(r.notes, 1000), 'Observação longa demais.'); }
    }
    for (const l of f.postHarvest) {
      check(filled(l.name, 80) && date(l.harvestDate) && optNum(l.volumeL, 0) && (!l.plotId || plots.has(l.plotId)), 'Confira nome, data da colheita, volume e talhão do lote.');
      if (l.drying) check(DRYING[l.drying.method] && date(l.drying.start) && optDate(l.drying.end) && (!l.drying.end || l.drying.end >= l.drying.start) && optNum(l.drying.finalMoisture, 5, 70), 'Confira a secagem: método, datas e umidade final (5 a 70%).');
      if (l.storage) check(filled(l.storage.place, 80) && date(l.storage.date) && (!l.drying?.start || l.storage.date >= l.drying.start), 'Confira o local da tulha e a data de entrada.');
      if (l.processing) check(date(l.processing.date) && num(l.processing.cocoKg, 0.001) && num(l.processing.beneficiadoKg, 0.001) && l.processing.beneficiadoKg <= l.processing.cocoKg && optNum(l.processing.defectsPct, 0, 100), 'Beneficiamento: o peso beneficiado não pode passar do peso em coco.');
    }
    for (const r of f.pests) check(date(r.date) && r.date <= today() && plots.has(r.plotId) && PESTS[r.pest] && num(r.infestationPct, 0, 100) && optNum(r.samples, 1, 100000), 'Confira data, talhão, praga e % de infestação (0 a 100).');
    const seasons = new Set(f.seasons.map(s => s.id));
    for (const s of f.seasons) check(filled(s.name, 80) && date(s.start) && date(s.end) && s.end >= s.start && (s.lotIds || []).every(id => lots.has(id)), 'Confira nome, datas e lotes da estação de monta.');
    for (const e of f.reproduction) {
      check(REPRO[e.type] && date(e.date) && e.date <= today() && (!e.lotId || lots.has(e.lotId)) && (!e.seasonId || seasons.has(e.seasonId)) && text(e.animal, 40) && optNum(e.heads, 1, 100000), 'Confira tipo, data, lote e quantidade do evento reprodutivo.');
      if (e.type === 'diagnostico') check(['prenhe', 'vazia'].includes(e.result), 'Informe o resultado do diagnóstico (prenhe ou vazia).');
      if (e.type === 'parto') check((e.calfSex == null || ['M', 'F'].includes(e.calfSex)) && (e.births == null || Number.isInteger(e.births) && e.births >= 0 && e.births <= (e.heads || 1) * 3) && (!e.birthLotId || lots.has(e.birthLotId)) && (!e.births || e.lotId || e.birthLotId), 'Confira os nascidos vivos e o lote que recebe os bezerros.');
      if (e.type === 'desmame' || e.type === 'parto') check(optNum(e.weightKg, 0, 2000), 'Peso inválido.');
    }
    for (const v of f.vaccines) check(filled(v.name, 80) && date(v.dueDate) && optDate(v.doneDate) && (!v.lotId || lots.has(v.lotId)) && optNum(v.heads, 1, 100000) && typeof (v.mandatory ?? false) === 'boolean', 'Confira vacina, data prevista, lote e cabeças.');
    for (const g of f.gta) check(filled(g.number, 30) && date(g.date) && filled(g.origin, 120) && filled(g.destination, 120) && GTA_PURPOSE.includes(g.purpose) && num(g.heads, 1, 100000) && (!g.lotId || lots.has(g.lotId)), 'Confira número, data, origem, destino, finalidade e cabeças da GTA.');
    const cows = new Set(f.dairyCows.map(c => c.id));
    for (const c of f.dairyCows) check(filled(c.tag, 40) && text(c.name, 60) && ['lactacao', 'seca', 'descarte'].includes(c.status) && (!c.lotId || lots.has(c.lotId)) && optDate(c.calvingDate), 'Confira brinco, situação e lote da vaca.');
    for (const m of f.milk) check(date(m.date) && m.date <= today() && num(m.liters, 0, 100000) && (m.cowId ? cows.has(m.cowId) : m.lotId ? lots.has(m.lotId) : true) && ['manha', 'tarde', 'dia'].includes(m.period || 'dia'), 'Confira data, litros e vaca/lote da ordenha.');
  }
  // Servidor: autor e data dos registros novos; registros de sanidade e GTA não são apagados (são documentos).
  function prepare(before, after, user, now = new Date().toISOString()) {
    const who = user.name || user.username;
    for (const f of after.farms || []) {
      const field = init(f), old = (before.farms || []).find(x => x.id === f.id)?.field || {};
      for (const k of KEYS) for (const r of field[k]) { const prev = (old[k] || []).find(x => x.id === r.id); if (prev) { r.recordedBy = prev.recordedBy; r.createdAt = prev.createdAt; } else { r.recordedBy = who; r.createdAt = now; } }
      for (const k of ['gta', 'vaccines']) for (const r of old[k] || []) check(field[k].some(x => x.id === r.id), k === 'gta' ? 'GTA registrada não pode ser apagada.' : 'Vacina registrada não pode ser apagada; deixe-a sem data de aplicação.');
      validateFarm(f);
    }
  }
  // Parto com nascidos vivos: entrada dos bezerros no lote, uma única vez (vem do V1). Roda antes das movimentações do gado,
  // que aplicam a entrada no saldo do lote. Não cria despesa de compra.
  function applyBirths(before, after) {
    for (const f of after.farms || []) {
      const oldEvents = (before.farms || []).find(x => x.id === f.id)?.field?.reproduction || [];
      for (const e of f.field?.reproduction || []) {
        if (e.type !== 'parto' || !(e.births > 0) || oldEvents.some(o => o.id === e.id)) continue;
        f.operations ||= {}; f.operations.cattleMoves ||= [];
        const id = 'birth_' + e.id;
        if (!f.operations.cattleMoves.some(m => m.id === id)) f.operations.cattleMoves.push({ id, activity: 'cattle', date: e.date, kind: 'purchase', lotId: e.birthLotId || e.lotId, heads: e.births, reason: 'Nascimento' + (e.animal ? ' · ' + e.animal : '') });
      }
    }
  }
  return { KEYS, ACTIVITY, DRYING, PESTS, REPRO, GTA_PURPOSE, applyBirths, init, lotStage, lotYield, pestAlert, latestPests, reproStats, vaccineStatus, milkSummary, cowAverage, validateFarm, prepare };
});
