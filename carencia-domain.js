/* Carência dos defensivos do banho: cada produto tem carência (dias até poder colher) e reentrada (horas até poder entrar
   no talhão). Banho concluído abre uma janela por talhão. Colheita lançada dentro da janela (apontamento do fiscal ou
   colheita da safra) recebe um alerta gravado pelo servidor; o CEO/ADM decide se permite seguir e a decisão vai para o
   histórico. Usado pela tela e pelo servidor. O fiscal não recebe as ordens de banho: o servidor manda as janelas
   prontas em talhao.carencia, para o app avisar também sem internet. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Carencia = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const fail = (m, s = 422) => { throw Object.assign(new Error(m), { statusCode: s }); };
  const check = (ok, m, s) => { if (!ok) fail(m, s); };
  const clone = x => JSON.parse(JSON.stringify(x));
  const isNum = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const addDays = (iso, n) => { const d = new Date(iso.slice(0, 10) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const DECIDERS = ['ceo', 'adm'];

  // Quando o banho foi aplicado: a hora informada pelo celular (feito sem sinal) vale mais que a hora do envio.
  const appliedAt = o => o.reportedAt || o.completedAt || '';

  // Janelas de carência de uma fazenda: uma por talhão de cada banho concluído com produto que tenha carência ou reentrada.
  // Sem as ordens (visão do fiscal), usa as janelas que o servidor mandou prontas em cada talhão.
  function windows(farm) {
    const orders = (farm.banho?.orders || []).filter(o => o.status === 'completed' && appliedAt(o));
    if (!orders.length) return (farm.talhoes || []).flatMap(t => (t.carencia || []).map(w => ({ ...w, plotId: t.id })));
    const products = farm.banho?.products || [];
    const out = [];
    for (const o of orders) {
      const at = appliedAt(o);
      let days = 0, hours = 0;
      for (const p of o.products || []) {
        const cur = products.find(x => x.id === p.productId) || {};
        days = Math.max(days, Number(p.graceDays ?? cur.graceDays ?? 0) || 0);
        hours = Math.max(hours, Number(p.reentryHours ?? cur.reentryHours ?? 0) || 0);
      }
      if (!days && !hours) continue;
      for (const plotId of o.talhaoIds || []) out.push({ plotId, orderId: o.id, order: o.title || 'Banho', appliedOn: at.slice(0, 10), harvestFrom: addDays(at, days), reentryUntil: new Date(Date.parse(at) + hours * 3600_000).toISOString() });
    }
    return out;
  }
  // Colheita no talhão nesta data cai dentro de alguma carência? Devolve a janela que libera mais tarde.
  function harvestBlock(farm, plotId, date) {
    if (!plotId || !date) return null;
    return windows(farm).filter(w => w.plotId === plotId && w.appliedOn <= date && date < w.harvestFrom).sort((a, b) => b.harvestFrom.localeCompare(a.harvestFrom))[0] || null;
  }
  // Situação atual de cada talhão: até quando não colher e até quando não entrar (só o que ainda vale).
  function plotStatus(farm, now = new Date()) {
    const today = now.toISOString().slice(0, 10), iso = now.toISOString(), map = {};
    for (const w of windows(farm)) {
      const s = map[w.plotId] ||= { plotId: w.plotId };
      if (w.harvestFrom > today && (!s.harvestFrom || w.harvestFrom > s.harvestFrom)) Object.assign(s, { harvestFrom: w.harvestFrom, harvestOrder: w.order });
      if (w.reentryUntil > iso && (!s.reentryUntil || w.reentryUntil > s.reentryUntil)) Object.assign(s, { reentryUntil: w.reentryUntil, reentryOrder: w.order });
    }
    return Object.values(map).filter(s => s.harvestFrom || s.reentryUntil);
  }
  // Janelas recentes de cada talhão para a visão do fiscal (sem as ordens de banho).
  function forFiscalPlots(farm, now = new Date()) {
    const since = addDays(now.toISOString(), -60), all = windows(farm), out = {};
    for (const w of all) if (w.harvestFrom >= since) (out[w.plotId] ||= []).push({ order: w.order, appliedOn: w.appliedOn, harvestFrom: w.harvestFrom, reentryUntil: w.reentryUntil });
    return out;
  }

  // Colheitas com alerta de carência ainda sem decisão (apontamentos do fiscal e colheitas da safra).
  function pendingDecisions(farm) {
    const out = [];
    for (const e of farm.labor?.entries || []) if (e.graceAlert && !e.graceDecision && !e.voided) out.push({ kind: 'labor', id: e.id, plotId: e.plotId, date: e.date, alert: e.graceAlert, workerId: e.workerId, bags: e.bags, entryKind: e.kind });
    for (const h of farm.agriculture?.harvests || []) if (h.graceAlert && !h.graceDecision) out.push({ kind: 'harvest', id: h.id, plotId: h.plotId, date: h.date, alert: h.graceAlert, cycleId: h.cycleId, netKg: h.netKg });
    return out;
  }

  function validateProducts(farm) {
    for (const p of farm.banho?.products || []) check((p.graceDays == null || (isNum(p.graceDays, 0, 365) && Number.isInteger(p.graceDays))) && (p.reentryHours == null || isNum(p.reentryHours, 0, 720)), 'Carência: de 0 a 365 dias; reentrada: de 0 a 720 horas.');
  }

  // Servidor: grava o alerta nas colheitas novas (o que o celular manda é ignorado), mantém os alertas antigos, aceita a
  // decisão só do CEO/ADM (com autor e hora do servidor) e devolve as linhas do histórico. Roda depois das outras regras.
  function stamp(before, after, user, now = new Date().toISOString()) {
    const audit = [], who = user.name || user.username, canDecide = DECIDERS.includes(user.role);
    for (const f of after.farms || []) {
      validateProducts(f);
      const old = (before.farms || []).find(x => x.id === f.id) || {};
      const plotName = id => (old.talhoes || f.talhoes || []).find(t => t.id === id)?.name || '—';
      const lists = [['labor', f.labor?.entries || [], old.labor?.entries || []], ['harvest', f.agriculture?.harvests || [], old.agriculture?.harvests || []]];
      for (const [kind, items, prevItems] of lists) for (const x of items) {
        const prev = prevItems.find(p => p.id === x.id);
        const sentDecision = x.graceDecision;
        if (prev) { if (prev.graceAlert) x.graceAlert = clone(prev.graceAlert); else delete x.graceAlert; }
        else {
          const w = harvestBlock(old, x.plotId, x.date);
          if (w) x.graceAlert = { harvestFrom: w.harvestFrom, order: w.order, appliedOn: w.appliedOn }; else delete x.graceAlert;
        }
        if (prev?.graceDecision) { x.graceDecision = clone(prev.graceDecision); continue; }
        if (!x.graceAlert || !sentDecision) { delete x.graceDecision; continue; }
        check(canDecide, 'Só o CEO ou o ADM decide sobre colheita dentro da carência.', 403);
        x.graceDecision = { status: 'allowed', note: String(sentDecision.note || '').slice(0, 300), by: who, at: now };
        audit.push({ action: 'permitiu colheita na carência', area: 'Carência de defensivo', label: `${plotName(x.plotId)} · ${x.date.split('-').reverse().join('/')} · ${x.graceAlert.order} (libera em ${x.graceAlert.harvestFrom.split('-').reverse().join('/')})`.slice(0, 200), farm: f.name });
      }
    }
    return audit;
  }

  return { windows, harvestBlock, plotStatus, forFiscalPlots, pendingDecisions, validateProducts, stamp, addDays };
});
