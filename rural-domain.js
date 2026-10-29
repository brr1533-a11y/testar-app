/* Regras compartilhadas entre servidor e navegador. Sem dependências externas. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RuralDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ACTIVITIES = ['coffee', 'cattle', 'grains'];
  const PERMISSION_OPTIONS = [['coffee','Café'],['cattle','Gado'],['grains','Grãos'],['both','Café + Gado'],['coffee_grains','Café + Grãos'],['cattle_grains','Gado + Grãos'],['all','Café + Gado + Grãos']];
  const PERMISSIONS = PERMISSION_OPTIONS.map(([value])=>value);
  const LABELS = { coffee: 'Café', cattle: 'Gado', grains: 'Grãos' };
  const CROPS = { coffee: ['Café arábica', 'Café conilon'], grains: ['Soja', 'Milho', 'Trigo'] };
  const STAGES = ['Planejada', 'Em desenvolvimento', 'Em colheita', 'Encerrada'];
  const HEALTH_TYPES = ['Vacinação', 'Vermifugação', 'Tratamento', 'Inspeção', 'Outro manejo'];
  function activitiesFor(permission) {
    if (permission === 'all') return [...ACTIVITIES];
    if (ACTIVITIES.includes(permission)) return [permission];
    if (permission === 'coffee_grains') return ['coffee','grains'];
    if (permission === 'cattle_grains') return ['cattle','grains'];
    return ['coffee', 'cattle']; // 'both' mantém exatamente o acesso legado.
  }
  function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }
  const days = (a, b) => validDate(a) && validDate(b) ? Math.round((Date.parse(b) - Date.parse(a)) / 86400000) : 0;
  const number = v => typeof v === 'number' && Number.isFinite(v);
  function fail(message) { const e = new Error(message); e.statusCode = 400; throw e; }
  function requireValue(ok, message) { if (!ok) fail(message); }
  function farmData(farm) {
    farm.agriculture ||= {};
    for (const key of ['cycles', 'harvests', 'sales']) {
      if (!Array.isArray(farm.agriculture[key])) farm.agriculture[key] = [];
    }
    farm.cattle ||= { paddocks: [], lots: [], weighings: [] };
    if (!Array.isArray(farm.cattle.healthEvents)) farm.cattle.healthEvents = [];
    return farm.agriculture;
  }
  function cycleStats(farm, cycle) {
    const a = farm.agriculture || {};
    const harvests = (a.harvests || []).filter(h => h.cycleId === cycle.id);
    const sales = (a.sales || []).filter(s => s.cycleId === cycle.id);
    const harvestedKg = harvests.reduce((n, h) => n + h.netKg, 0);
    const soldKg = sales.reduce((n, s) => n + s.kg, 0);
    const revenue = sales.reduce((cents, s) => cents + (number(s.pricePerKg) ? Math.round((s.kg * s.pricePerKg + Number.EPSILON) * 100) : 0), 0) / 100;
    return { harvestedKg, soldKg, availableKg: harvestedKg - soldKg, revenue,
      yieldKgHa: cycle.areaHa > 0 ? harvestedKg / cycle.areaHa : null,
      costPerKg: harvestedKg > 0 ? (cycle.plannedCost || 0) / harvestedKg : null,
      bags: harvestedKg / (cycle.bagKg || 60) };
  }
  function latestWeighings(farm) {
    const index = new Map();
    for (const w of farm.cattle?.weighings || []) {
      const previous = index.get(String(w.lotId));
      if (!previous || String(w.date).localeCompare(String(previous.date)) > 0 ||
          w.date === previous.date && String(w.createdAt || w.id).localeCompare(String(previous.createdAt || previous.id)) > 0) index.set(String(w.lotId), w);
    }
    return index;
  }
  function herdStats(farms) {
    let heads = 0, coveredHeads = 0, estimatedLiveKg = 0, lots = 0;
    for (const farm of farms) {
      const index = latestWeighings(farm);
      for (const lot of farm.cattle?.lots || []) {
        if(lot.archived)continue;
        lots++; heads += Number(lot.heads || 0);
        const w = index.get(String(lot.id));
        if (!w || !number(w.avgKg) || w.avgKg <= 0) continue;
        coveredHeads += Number(lot.heads || 0);
        estimatedLiveKg += w.avgKg * Number(lot.heads || 0);
      }
    }
    return { heads, lots, coveredHeads, estimatedLiveKg, avgKg: coveredHeads ? estimatedLiveKg / coveredHeads : null };
  }
  function lotPerformance(farm, lot) {
    const ws = (farm.cattle?.weighings || []).filter(w => String(w.lotId) === String(lot.id))
      .slice().sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt || a.id).localeCompare(String(b.createdAt || b.id)));
    const latest = ws[ws.length - 1];
    // Para projeção, compara a última data com a data anterior, ignorando duplicatas no mesmo dia.
    const previous = latest && ws.slice(0, -1).reverse().find(w => w.date < latest.date);
    const interval = previous ? days(previous.date, latest.date) : 0;
    const dailyGainKg = interval > 0 ? (latest.avgKg - previous.avgKg) / interval : null;
    const remainingKg = latest && lot.targetKg > 0 ? Math.max(0, lot.targetKg - latest.avgKg) : null;
    const daysToTarget = remainingKg === 0 ? 0 : remainingKg != null && dailyGainKg > 0 ? Math.ceil(remainingKg / dailyGainKg) : null;
    return { latest: latest || null, previous: previous || null, dailyGainKg, daysToTarget, interval };
  }
  // options.maskedFinance: tela do ADM, que não recebe preço de venda nem custo planejado.
  // O servidor sempre valida sem essa opção, depois de repor os valores guardados.
  function validateFarm(farm, options = {}) {
    const masked = options.maskedFinance === true;
    const a = farm.agriculture;
    if (a != null) {
      for (const key of ['cycles', 'harvests', 'sales']) requireValue(Array.isArray(a[key]), 'Dados de safra inválidos.');
      const allIds = new Set();
      for (const row of [...a.cycles, ...a.harvests, ...a.sales]) {
        requireValue(row && typeof row.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(row.id) && !allIds.has(row.id), 'Identificação de registro da safra inválida ou repetida.');
        allIds.add(row.id);
      }
      const cycles = new Map(a.cycles.map(c => [c.id, c]));
      for (const c of a.cycles) {
        requireValue(['coffee', 'grains'].includes(c.activity) && CROPS[c.activity].includes(c.crop), 'Cultura inválida para a atividade.');
        requireValue(typeof c.name === 'string' && c.name.trim().length > 0 && c.name.length <= 120, 'Informe o nome da safra (até 120 caracteres).');
        requireValue(number(c.areaHa) && c.areaHa > 0 && number(c.bagKg) && c.bagKg > 0, 'Área e peso da saca devem ser positivos.');
        requireValue(masked && c.plannedCost === undefined || number(c.plannedCost) && c.plannedCost >= 0, 'Custo planejado inválido.');
        requireValue(STAGES.includes(c.stage) && validDate(c.startDate), 'Confira a etapa e a data inicial da safra.');
        requireValue(!c.expectedDate || validDate(c.expectedDate) && c.expectedDate >= c.startDate, 'A previsão de colheita deve ser posterior ao início da safra.');
        requireValue(!c.plotId || (farm.talhoes || []).some(p => p.id === c.plotId), 'O talhão da safra não existe nesta fazenda.');
      }
      const movements = new Map(a.cycles.map(c => [c.id, []]));
      for (const h of a.harvests) {
        const c = cycles.get(h.cycleId);
        requireValue(c && validDate(h.date) && h.date >= c.startDate, 'Safra ou data da colheita inválida.');
        requireValue(number(h.netKg) && h.netKg > 0, 'Informe o peso líquido da colheita.');
        requireValue(h.moisture == null || number(h.moisture) && h.moisture >= 0 && h.moisture <= 100, 'Umidade deve estar entre 0 e 100%.');
        movements.get(h.cycleId).push({ date: h.date, delta: h.netKg, order: 0 });
      }
      for (const s of a.sales) {
        const c = cycles.get(s.cycleId);
        requireValue(c && validDate(s.date) && s.date >= c.startDate, 'Safra ou data da venda inválida.');
        requireValue(number(s.kg) && s.kg > 0 && (masked && s.pricePerKg === undefined || number(s.pricePerKg) && s.pricePerKg > 0 && number(s.kg * s.pricePerKg)), 'Quantidade e preço de venda devem ser positivos.');
        movements.get(s.cycleId).push({ date: s.date, delta: -s.kg, order: 1 });
      }
      for (const list of movements.values()) {
        let balance = 0;
        for (const m of list.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)) {
          balance += m.delta;
          requireValue(number(balance) && balance >= -0.000001, 'A venda supera o saldo colhido na data informada. Confira também as vendas posteriores.');
        }
      }
    }
    const cattle = farm.cattle;
    if (cattle?.healthEvents != null) {
      requireValue(Array.isArray(cattle.healthEvents), 'Agenda de manejo inválida.');
      const ids = new Set();
      for (const e of cattle.healthEvents) {
        requireValue(e && typeof e.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(e.id) && !ids.has(e.id), 'Identificação do manejo inválida ou repetida.');
        ids.add(e.id);
        requireValue((cattle.lots || []).some(l => l.id === e.lotId), 'O lote do manejo não existe nesta fazenda.');
        requireValue(HEALTH_TYPES.includes(e.type) && typeof e.title === 'string' && e.title.trim().length > 0 && e.title.length <= 120, 'Informe um manejo válido (até 120 caracteres).');
        requireValue(validDate(e.date) && ['scheduled', 'done'].includes(e.status), 'Confira a data e o status do manejo.');
        requireValue(!e.completedDate || validDate(e.completedDate), 'Data de conclusão inválida.');
        requireValue(e.status !== 'done' || validDate(e.completedDate), 'Informe a data em que o manejo foi realizado.');
        requireValue(e.status !== 'done' || e.completedDate <= new Date().toISOString().slice(0, 10), 'A realização do manejo não pode estar no futuro.');
      }
    }
    for (const lot of cattle?.lots || []) {
      if (lot.targetKg != null && lot.targetKg !== '') requireValue(number(lot.targetKg) && lot.targetKg >= 0, 'Meta de peso do lote inválida.');
    }
  }
  function validateState(state, options) { for (const farm of state.farms || []) validateFarm(farm, options); return state; }
  return { ACTIVITIES, PERMISSIONS, PERMISSION_OPTIONS, LABELS, CROPS, STAGES, HEALTH_TYPES, activitiesFor, validDate, days, farmData, cycleStats, latestWeighings, herdStats, lotPerformance, validateFarm, validateState };
});
