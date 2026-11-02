// Resumo mínimo gerado no servidor a partir da projeção já autorizada. Nunca serializa o estado inteiro.
const crypto = require('crypto');
const Adm = require('./adm-access'), Sub = require('./subscription-domain');
const fail = (message, statusCode = 403) => Object.assign(new Error(message), { statusCode });
const active = list => (Array.isArray(list) ? list : []).filter(r => !r.archived && !r.deleted);
const number = v => typeof v === 'number' && Number.isFinite(v) ? v : 0;
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
const moduleOf = r => r.activityModule || (['coffee', 'grains', 'cattle'].includes(r.activity) ? r.activity : 'coffee');
function build({ group, user, projected }, selection) {
  if (!['ceo', 'adm'].includes(user.role)) throw fail('Seu perfil usa a ajuda do sistema sem enviar dados da fazenda.');
  if (!selection || typeof selection.farmId !== 'string' || !['coffee','grains','cattle'].includes(selection.activity)) throw fail('Selecione uma fazenda e uma atividade.', 422);
  if (!Sub.licensed(group.state).includes(selection.activity)) throw fail('Atividade não contratada.');
  const farm = (projected.farms || []).find(f => String(f.id) === selection.farmId);
  if (!farm) throw fail('Fazenda fora do seu acesso.');
  const activity = selection.activity, can = page => user.role === 'ceo' || Adm.can(group.state, page);
  const summary = { fazenda: String(farm.name || '').slice(0, 100), atividade: ({ coffee: 'Café', grains: 'Grãos', cattle: 'Gado' })[activity], limites: 'Somente registros existentes. Sem previsão, sem laudos, documentos, nomes de pessoas, credenciais, coordenadas ou dados bancários.' };
  if (activity !== 'cattle' && can('talhoes')) {
    const plots = active(farm.talhoes).filter(r => moduleOf(r) === activity);
    summary.talhoes = { quantidade: plots.length, areaHa: round(plots.reduce((n, r) => n + number(r.areaHa), 0)) };
  }
  if (activity !== 'cattle' && can('safras')) {
    const ag = farm.agriculture || {}, cycles = active(ag.cycles).filter(r => r.activity === activity), ids = new Set(cycles.map(c => c.id));
    const harvested = active(ag.harvests).filter(h => ids.has(h.cycleId)), sales = active(ag.sales).filter(s => ids.has(s.cycleId));
    const kg = harvested.reduce((n, h) => n + number(h.netKg), 0), sold = sales.reduce((n, s) => n + number(s.kg), 0);
    const bags = cycles.reduce((n, c) => n + harvested.filter(h => h.cycleId === c.id).reduce((v, h) => v + number(h.netKg), 0) / (number(c.bagKg) > 0 ? c.bagKg : 60), 0);
    summary.producaoHistorica = { safras: cycles.length, colhidoKg: round(kg), colhidoSacas: round(bags), vendidoKg: round(sold), saldoKg: round(kg - sold), observacao: 'Acumulado de todas as safras da atividade. Sacas usam o peso cadastrado em cada safra; não é produtividade média.' };
  }
  if (activity === 'cattle' && can('gado')) {
    const lots = active(farm.cattle?.lots);
    summary.rebanho = { lotes: lots.length, cabecasInformadas: lots.reduce((n, l) => n + number(l.heads), 0), piquetes: active(farm.cattle?.paddocks).length };
  }
  if (can('estoque')) {
    const stock = active(farm.stock).filter(r => moduleOf(r) === activity);
    summary.estoque = { itensCadastrados: stock.length, observacao: 'Contagem de cadastros; não soma quantidades com unidades diferentes.' };
  }
  if (can('estoque') || can('manutencao')) {
    const P = require('./prioridades-domain');
    if (farm.fuelDepot) summary.tanque = { litros: P.litres(farm), alertaAbaixoDeLitros: P.threshold(projected) };
  }
  // É necessária a tela específica de balanço. Permitir lançar não libera leitura financeira.
  if (can('financeiro')) {
    const rows = active(farm.finances).filter(r => moduleOf(r) === activity), months = new Map();
    for (const r of rows) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date || '') || !['entrada','saida'].includes(r.type)) continue;
      const month = r.date.slice(0, 7), v = months.get(month) || { mes: month, entradasCentavos: 0, saidasCentavos: 0 };
      v[r.type === 'entrada' ? 'entradasCentavos' : 'saidasCentavos'] += Math.round(number(r.value) * 100); months.set(month, v);
    }
    summary.financeiro = { moeda: 'BRL', meses: [...months.values()].sort((a,b) => b.mes.localeCompare(a.mes)).slice(0,12).map(r => ({ mes: r.mes, entradas: r.entradasCentavos / 100, saidas: r.saidasCentavos / 100, resultado: (r.entradasCentavos - r.saidasCentavos) / 100 })), observacao: 'Até 12 meses mais recentes com lançamentos. Entradas e saídas registradas, não saldo bancário nem resultado contábil completo.' };
  }
  const text = JSON.stringify(summary, null, 2);
  // Vincula o consentimento à identidade, ao escopo e aos valores efetivamente mostrados.
  const hash = crypto.createHash('sha256').update(JSON.stringify([group.id, user.id, user.role, selection.farmId, activity, text])).digest('hex');
  return { summary, text, hash };
}
module.exports = { build };
