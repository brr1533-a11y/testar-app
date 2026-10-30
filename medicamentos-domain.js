/* Carência de medicamentos e vacinas do gado: cada produto tem carência de abate e carência de leite (dias). A aplicação
   (vaca, lote ou rebanho) abre as janelas. Ordenha dentro da janela fica marcada como descarte pelo servidor e não entra
   na produção entregue; venda ou GTA para abate de lote em carência recebe um alerta gravado. Produtos em farm.field.medicines;
   as aplicações usam a lista de vacinas (farm.field.vaccines) com medicineId, cowId e as carências copiadas do produto. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Medicamentos = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const fail = (m, s = 422) => { throw Object.assign(new Error(m), { statusCode: s }); };
  const check = (ok, m, s) => { if (!ok) fail(m, s); };
  const days = v => v == null || (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 365);
  const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

  // Janelas de carência das aplicações feitas: alvo (vaca, lote ou rebanho), até quando não abater e até quando descartar o leite.
  function windows(farm) {
    const meds = farm.field?.medicines || [];
    return (farm.field?.vaccines || []).filter(v => v.doneDate).map(v => {
      const m = meds.find(x => x.id === v.medicineId) || {};
      const sd = Number(v.slaughterDays ?? m.slaughterDays ?? 0) || 0, md = Number(v.milkDays ?? m.milkDays ?? 0) || 0;
      return { id: v.id, name: v.name, appliedOn: v.doneDate, cowId: v.cowId || '', lotId: v.cowId ? '' : v.lotId || '', slaughterFree: sd ? addDays(v.doneDate, sd) : null, milkFree: md ? addDays(v.doneDate, md) : null };
    }).filter(w => w.slaughterFree || w.milkFree);
  }
  const covers = (w, cow, lotId) => w.cowId ? cow && w.cowId === cow.id : w.lotId ? w.lotId === (cow ? cow.lotId : lotId) : true;
  const latest = (list, key) => list.sort((a, b) => b[key].localeCompare(a[key]))[0] || null;

  // Ordenha nesta data cai na carência de leite? Ordenha por vaca vale a vaca, o lote dela e o rebanho; por lote, o lote e o
  // rebanho; do rebanho todo, só aplicação no rebanho.
  function milkBlock(farm, rec) {
    const cow = rec.cowId ? (farm.field?.dairyCows || []).find(c => c.id === rec.cowId) : null;
    const list = windows(farm).filter(w => w.milkFree && w.appliedOn <= rec.date && rec.date < w.milkFree && (rec.cowId ? covers(w, cow) : rec.lotId ? !w.cowId && covers(w, null, rec.lotId) : !w.cowId && !w.lotId));
    return latest(list, 'milkFree');
  }
  // Lote em carência de abate nesta data (aplicação no lote ou no rebanho).
  function slaughterBlock(farm, lotId, date) {
    if (!date) return null;
    return latest(windows(farm).filter(w => w.slaughterFree && !w.cowId && (!w.lotId || w.lotId === lotId) && w.appliedOn <= date && date < w.slaughterFree), 'slaughterFree');
  }
  // O que vale hoje: vacas/lotes com leite para descarte e lotes que não podem ir para abate.
  function status(farm, on) {
    const today = on || new Date().toISOString().slice(0, 10), w = windows(farm).filter(x => x.appliedOn <= today);
    return { milk: w.filter(x => x.milkFree > today), slaughter: w.filter(x => x.slaughterFree > today && !x.cowId) };
  }
  // Leite entregue x descartado num dia (ordenhas marcadas pelo servidor).
  function milkTotals(field, date) {
    const recs = (field.milk || []).filter(r => r.date === date);
    return { delivered: recs.filter(r => !r.discard).reduce((n, r) => n + r.liters, 0), discarded: recs.filter(r => r.discard).reduce((n, r) => n + r.liters, 0) };
  }

  function validateFarm(farm) {
    const f = farm.field || {}, cows = new Set((f.dairyCows || []).map(c => c.id)), meds = f.medicines || [];
    check(Array.isArray(meds) && meds.length <= 2000, 'Lista de medicamentos grande demais.');
    const ids = new Set();
    for (const m of meds) { check(m && typeof m.id === 'string' && m.id.length <= 80 && !ids.has(m.id) && typeof m.name === 'string' && m.name.trim() && m.name.length <= 80 && days(m.slaughterDays) && days(m.milkDays), 'Confira nome e carências do medicamento (0 a 365 dias).'); ids.add(m.id); }
    for (const v of f.vaccines || []) check((!v.medicineId || ids.has(v.medicineId)) && (!v.cowId || cows.has(v.cowId)) && days(v.slaughterDays) && days(v.milkDays), 'Confira o medicamento, a vaca e as carências da aplicação.');
  }

  // Servidor: marca as ordenhas na carência como descarte (o celular não escolhe) e grava o alerta em venda/GTA para abate.
  function stamp(before, after) {
    for (const f of after.farms || []) {
      validateFarm(f);
      for (const r of f.field?.milk || []) { const w = milkBlock(f, r); if (w) r.discard = { until: w.milkFree, name: w.name }; else delete r.discard; }
      const old = (before.farms || []).find(x => x.id === f.id) || {};
      const flag = (list, prevList, isSlaughter) => { for (const x of list || []) { const prev = (prevList || []).find(p => p.id === x.id); if (prev) { if (prev.withdrawalAlert) x.withdrawalAlert = prev.withdrawalAlert; else delete x.withdrawalAlert; continue; } const w = isSlaughter(x) && slaughterBlock(f, x.lotId, x.date); if (w) x.withdrawalAlert = { until: w.slaughterFree, name: w.name }; else delete x.withdrawalAlert; } };
      flag(f.operations?.cattleMoves, old.operations?.cattleMoves, m => m.kind === 'sale');
      flag(f.field?.gta, old.field?.gta, g => g.purpose === 'Abate');
    }
  }

  return { windows, milkBlock, slaughterBlock, status, milkTotals, validateFarm, stamp, addDays };
});
