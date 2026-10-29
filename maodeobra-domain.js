/* Mão de obra da colheita de café: pessoas (panhador, safrista, diarista), valor do saco por talhão, apontamentos do fiscal
   (sacos ou diária), adiantamentos e descontos, e fechamento semanal que gera as contas a pagar.
   Tudo fica em farm.labor. Usado pela tela e pelo servidor: o servidor congela o valor de cada apontamento, recalcula o
   fechamento sozinho (os valores enviados pela tela são ignorados) e não deixa mexer em semana fechada.
   Valores em centavos nas contas internas, para não haver erro de arredondamento. */
(function (root, factory) {
  const api = factory(typeof require === 'function' ? require('./rural-domain.js') : root.RuralDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HarvestLabor = api;
})(typeof self !== 'undefined' ? self : this, function (D) {
  const KEYS = ['workers', 'plotRates', 'entries', 'adjustments', 'closings'];
  const ROLES = { panhador: 'Panhador', safrista: 'Safrista', diarista: 'Diarista' };
  const FISCAL = 'Fiscal de colheita';
  const fail = (m, s = 422) => { throw Object.assign(new Error(m), { statusCode: s }); };
  const check = (ok, m, s) => { if (!ok) fail(m, s); };
  const text = (v, max) => v == null || v === '' || (typeof v === 'string' && v.length <= max);
  const filled = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  const num = (v, min = 0, max = 1e9) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const cents = v => Math.round(Number(v || 0) * 100);
  const reais = c => Math.round(c) / 100;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const clone = x => JSON.parse(JSON.stringify(x));
  const id = v => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v);
  const today = () => new Date().toISOString().slice(0, 10);
  function init(farm) { farm.labor ||= {}; for (const k of KEYS) farm.labor[k] ||= []; return farm.labor; }

  // Semana de segunda a domingo.
  function weekStart(date) { const d = new Date(date + 'T12:00:00Z'), dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return d.toISOString().slice(0, 10); }
  function weekEnd(start) { const d = new Date(start + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 6); return d.toISOString().slice(0, 10); }
  function closingFor(labor, date) { return (labor.closings || []).find(c => date >= c.weekStart && date <= c.weekEnd) || null; }
  function validCPF(v) {
    const c = String(v || '').replace(/\D/g, ''); if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    const dv = len => { let s = 0; for (let i = 0; i < len; i++) s += Number(c[i]) * (len + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
  }
  // Valor do saco no talhão na data: o valor vigente mais recente até aquela data.
  function plotRate(labor, plotId, date) {
    const r = (labor.plotRates || []).filter(x => x.plotId === plotId && x.validFrom <= date).sort((a, b) => b.validFrom.localeCompare(a.validFrom) || String(b.id).localeCompare(String(a.id)))[0];
    return r ? r.ratePerBag : null;
  }
  // Valor que vale para o apontamento: saco = valor combinado da pessoa (se houver) ou do talhão; diária = diária da pessoa.
  function rateFor(labor, entry) {
    const w = (labor.workers || []).find(x => x.id === entry.workerId);
    if (!w) return null;
    if (entry.kind === 'diaria') return w.dailyRate > 0 ? w.dailyRate : null;
    return w.bagRate > 0 ? w.bagRate : plotRate(labor, entry.plotId, entry.date);
  }
  function entryAmount(e) { return e.kind === 'diaria' ? reais(cents(e.rate)) : reais(Math.round(cents(e.rate) * e.bags)); }

  // Fechamento de uma semana, por pessoa: sacos × valor + diárias − adiantamentos − descontos − saldo devedor anterior.
  // Total negativo vira R$ 0 e a diferença passa como saldo devedor para a próxima semana.
  function computeClosing(labor, start) {
    const end = weekEnd(start), inWeek = r => !r.voided && r.date >= start && r.date <= end;
    const prior = (labor.closings || []).filter(c => c.weekStart < start).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    const lastDebt = wid => { for (const c of prior) { const l = c.lines.find(x => x.workerId === wid); if (l) return l.newDebt || 0; } return 0; };
    const ids = new Set([...(labor.entries || []).filter(inWeek).map(e => e.workerId), ...(labor.adjustments || []).filter(inWeek).map(a => a.workerId)]);
    for (const w of labor.workers || []) if (lastDebt(w.id) > 0 && (labor.entries || []).some(e => e.workerId === w.id && inWeek(e))) ids.add(w.id);
    const lines = [...ids].map(wid => {
      const w = (labor.workers || []).find(x => x.id === wid) || {};
      const es = (labor.entries || []).filter(e => e.workerId === wid && inWeek(e)), as = (labor.adjustments || []).filter(a => a.workerId === wid && inWeek(a));
      const bags = Math.round(es.filter(e => e.kind === 'saco').reduce((n, e) => n + e.bags, 0) * 100) / 100;
      const bagsC = es.filter(e => e.kind === 'saco').reduce((n, e) => n + cents(entryAmount(e)), 0);
      const days = es.filter(e => e.kind === 'diaria').length, daysC = es.filter(e => e.kind === 'diaria').reduce((n, e) => n + cents(entryAmount(e)), 0);
      const advC = as.filter(a => a.kind === 'adiantamento').reduce((n, a) => n + cents(a.amount), 0), discC = as.filter(a => a.kind === 'desconto').reduce((n, a) => n + cents(a.amount), 0);
      const debtC = cents(lastDebt(wid)), grossC = bagsC + daysC, netC = grossC - advC - discC - debtC;
      return { workerId: wid, name: w.name || '—', bags, bagsValue: reais(bagsC), days, daysValue: reais(daysC), advances: reais(advC), discounts: reais(discC), previousDebt: reais(debtC), gross: reais(grossC), total: reais(Math.max(0, netC)), newDebt: reais(Math.max(0, -netC)) };
    }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return { weekStart: start, weekEnd: end, lines, total: reais(lines.reduce((n, l) => n + cents(l.total), 0)) };
  }
  // Texto do recibo (WhatsApp) de uma pessoa num fechamento.
  function receiptText(farmName, c, l) {
    const br = d => d.split('-').reverse().join('/'), m = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return [`*Recibo de colheita* · ${farmName}`, `Semana ${br(c.weekStart)} a ${br(c.weekEnd)}`, `${l.name}`, l.bags ? `Sacos: ${String(l.bags).replace('.', ',')} = ${m(l.bagsValue)}` : '', l.days ? `Diárias: ${l.days} = ${m(l.daysValue)}` : '', l.advances ? `Adiantamentos: −${m(l.advances)}` : '', l.discounts ? `Descontos: −${m(l.discounts)}` : '', l.previousDebt ? `Saldo devedor anterior: −${m(l.previousDebt)}` : '', `*A receber: ${m(l.total)}*`, l.newDebt ? `Fica para a próxima semana: −${m(l.newDebt)}` : ''].filter(Boolean).join('\n');
  }

  function validateFarm(farm) {
    const L = init(farm), plots = new Set((farm.talhoes || []).map(t => t.id));
    for (const k of KEYS) { check(Array.isArray(L[k]) && L[k].length <= 100000, 'Lista de mão de obra grande demais.'); const ids = new Set(); for (const r of L[k]) { check(r && id(r.id) && !ids.has(r.id), 'Identificação de registro de mão de obra inválida ou repetida.'); ids.add(r.id); } }
    const workers = new Set(L.workers.map(w => w.id));
    for (const w of L.workers) check(filled(w.name, 120) && ROLES[w.role] && (!w.cpf || validCPF(w.cpf)) && text(w.pix, 140) && (!w.phone || /^\d{10,13}$/.test(w.phone)) && (w.dailyRate == null || num(w.dailyRate, 0, 100000)) && (w.bagRate == null || num(w.bagRate, 0, 10000)) && typeof (w.active ?? true) === 'boolean', 'Confira nome, CPF (se informado), Pix, telefone e valores da pessoa.');
    for (const r of L.plotRates) check(plots.has(r.plotId) && num(r.ratePerBag, 0.01, 10000) && D.validDate(r.validFrom), 'Confira o talhão, o valor do saco e a data de início.');
    for (const e of L.entries) {
      check(D.validDate(e.date) && plots.has(e.plotId) && workers.has(e.workerId) && ['saco', 'diaria'].includes(e.kind), 'Confira data, talhão, pessoa e tipo do apontamento.');
      check(e.kind === 'diaria' ? e.bags == null || e.bags === 0 : num(e.bags, 0.5, 200) && Number.isInteger(e.bags * 2), 'Sacos: de meio em meio, até 200 por apontamento.');
      check(num(e.rate, 0.01, 100000), 'Apontamento sem valor: defina o valor do saco do talhão ou a diária da pessoa.');
      check(!e.voided || filled(e.voidReason, 300), 'Informe o motivo do estorno.');
    }
    for (const a of L.adjustments) check(D.validDate(a.date) && workers.has(a.workerId) && ['adiantamento', 'desconto'].includes(a.kind) && num(a.amount, 0.01, 1000000) && filled(a.reason, 300) && (!a.voided || filled(a.voidReason, 300)), 'Confira pessoa, data, valor e motivo do adiantamento ou desconto.');
    const weeks = new Set();
    for (const c of L.closings) { check(D.validDate(c.weekStart) && weekStart(c.weekStart) === c.weekStart && c.weekEnd === weekEnd(c.weekStart) && !weeks.has(c.weekStart) && Array.isArray(c.lines), 'Fechamento inválido ou repetido.'); weeks.add(c.weekStart); }
    return farm;
  }

  // Servidor. user.labor: 'manager' (CEO/ADM com a página), 'fiscal' (só apontamentos) ou nada (não mexe).
  function prepare(before, after, user, now = new Date().toISOString()) {
    const who = user.name || user.username;
    for (const f of after.farms || []) {
      const oldFarm = (before.farms || []).find(x => x.id === f.id) || {}, old = init(clone({ labor: oldFarm.labor })), L = init(f);
      // Contas geradas pelo fechamento: valor, pessoa e descrição não mudam, para nenhum perfil (o pagamento segue o fluxo normal).
      for (const p of oldFarm.management?.payables || []) if (p.laborClosingId) {
        const n = (f.management?.payables || []).find(x => x.id === p.id);
        check(n && ['amount', 'supplier', 'description', 'laborClosingId', 'workerId'].every(k => same(p[k], n[k])), 'Conta gerada pelo fechamento da colheita não pode ter valor ou pessoa alterados.', 403);
      }
      if (!user.labor) { f.labor = clone(oldFarm.labor || { workers: [], plotRates: [], entries: [], adjustments: [], closings: [] }); continue; }
      if (user.labor === 'fiscal') {
        // O fiscal não vê nem altera pessoas, valores, adiantamentos e fechamentos: ficam como estão.
        for (const k of ['workers', 'plotRates', 'adjustments', 'closings']) L[k] = clone(old[k]);
        // Ele recebe só os apontamentos recentes: o que enviou é juntado ao histórico completo (o que não veio continua igual).
        const sent = L.entries;
        L.entries = old.entries.map(o => sent.find(x => x.id === o.id) || clone(o)).concat(sent.filter(x => !old.entries.some(o => o.id === x.id)));
      }
      // Fechamento e cadastros não somem.
      for (const k of ['workers', 'plotRates', 'entries', 'adjustments', 'closings']) for (const r of old[k]) check(L[k].some(x => x.id === r.id), k === 'closings' ? 'Fechamento não pode ser apagado.' : 'Registro de mão de obra não pode ser apagado; desative ou estorne.', 403);
      for (const c of old.closings) check(same(c, L.closings.find(x => x.id === c.id)), 'Fechamento não pode ser alterado.', 403);
      const locked = date => closingFor(old, date);
      // Apontamentos: novos recebem valor congelado, autor e data; existentes só mudam sacos ou estorno, em semana aberta.
      for (const e of L.entries) {
        const prev = old.entries.find(x => x.id === e.id);
        if (!prev) {
          check(!locked(e.date), 'A semana deste apontamento já foi fechada.', 403);
          check(e.date <= today(), 'Apontamento não pode ser em data futura.');
          if (e.kind === 'diaria') delete e.bags;
          e.rate = rateFor(L, e); e.recordedBy = who; e.createdAt = now; delete e.voided; delete e.voidReason;
          continue;
        }
        if (same(prev, e)) continue;
        check(!locked(prev.date), 'A semana deste apontamento já foi fechada.', 403);
        if (user.labor === 'fiscal') check(prev.recordedBy === who, 'O fiscal só corrige os próprios apontamentos.', 403);
        const keep = { ...prev, bags: e.bags, voided: e.voided, voidReason: e.voidReason };
        if (e.voided && !prev.voided) { keep.voidedBy = who; keep.voidedAt = now; }
        if (!e.voided) { delete keep.voided; delete keep.voidReason; delete keep.voidedBy; delete keep.voidedAt; }
        Object.keys(e).forEach(k => delete e[k]); Object.assign(e, keep);
      }
      if (user.labor !== 'manager') { validateFarm(f); continue; }
      for (const a of L.adjustments) {
        const prev = old.adjustments.find(x => x.id === a.id);
        if (!prev) { check(!locked(a.date), 'A semana deste lançamento já foi fechada.', 403); a.recordedBy = who; a.createdAt = now; delete a.voided; continue; }
        if (same(prev, a)) continue;
        check(!locked(prev.date), 'A semana deste lançamento já foi fechada.', 403);
        const keep = { ...prev, voided: a.voided, voidReason: a.voidReason };
        if (a.voided && !prev.voided) { keep.voidedBy = who; keep.voidedAt = now; }
        Object.keys(a).forEach(k => delete a[k]); Object.assign(a, keep);
      }
      // Fechamentos novos: o servidor recalcula tudo e gera uma conta a pagar por pessoa com valor a receber.
      for (const c of L.closings.filter(c => !old.closings.some(o => o.id === c.id))) {
        check(D.validDate(c.weekStart) && weekStart(c.weekStart) === c.weekStart && c.weekStart <= today(), 'Escolha uma semana que já começou.');
        check(!old.closings.some(o => o.weekStart === c.weekStart), 'Esta semana já foi fechada.');
        const calc = computeClosing({ ...L, closings: old.closings }, c.weekStart);
        check(calc.lines.length > 0, 'Nada para fechar nesta semana.');
        Object.keys(c).forEach(k => { if (k !== 'id') delete c[k]; });
        Object.assign(c, calc, { closedBy: who, closedAt: now, payableIds: [] });
        const m = f.management ||= {}; m.payables ||= [];
        const br = d => d.split('-').reverse().join('/');
        for (const l of calc.lines.filter(l => l.total > 0)) {
          const pid = 'labor_' + c.id + '_' + l.workerId;
          if (m.payables.some(p => p.id === pid)) continue;
          m.payables.push({ id: pid, activity: 'coffee', supplier: l.name, description: `Colheita · semana ${br(calc.weekStart)} a ${br(calc.weekEnd)}`, category: 'Mão de obra (colheita)', amount: l.total, dueDate: today(), status: 'open', laborClosingId: c.id, workerId: l.workerId, createdBy: who, createdAt: now });
          c.payableIds.push(pid);
        }
      }
      validateFarm(f);
    }
    return after;
  }

  // O que o fiscal recebe: nomes e funções das pessoas ativas, talhões e as semanas fechadas. Sem CPF, Pix, telefone ou valores.
  function forFiscal(labor) {
    const L = init({ labor: clone(labor || {}) });
    return {
      workers: L.workers.filter(w => w.active !== false).map(w => ({ id: w.id, name: w.name, role: w.role, active: true })),
      plotRates: [], adjustments: [],
      entries: L.entries.filter(e => e.date >= new Date(Date.now() - 35 * 86400000).toISOString().slice(0, 10)).map(({ rate, ...e }) => e),
      closings: L.closings.map(c => ({ id: c.id, weekStart: c.weekStart, weekEnd: c.weekEnd, lines: [] }))
    };
  }

  return { KEYS, ROLES, FISCAL, init, weekStart, weekEnd, closingFor, validCPF, plotRate, rateFor, entryAmount, computeClosing, receiptText, validateFarm, prepare, forFiscal };
});
