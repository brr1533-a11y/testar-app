/* Funções por plano (Essencial, Profissional, Grupo). Usado pela tela (menu e botões) e pelo servidor (o que grava e envia).
   Tabela de referência:
   - todos: Visão geral, Mercado, Agenda, atividades contratadas, estoque e equipamentos, aviso do que está acabando,
     contas a pagar e receber, resultados e custos, notas fiscais (NF-e, MDF-e, XML) e os módulos de campo;
   - Profissional e Grupo: melhor cotação e preço automático, conciliação bancária, contratos de venda, pedidos de compra
     com aprovação, permissão por fazenda e atividade, histórico de alterações e visão consolidada das fazendas;
   - só Grupo: atendimento prioritário e implantação acompanhada (serviços, não telas). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PlanFeatures = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const ORDER = ['essential', 'pro', 'group'];
  const NAMES = { essential: 'Essencial', pro: 'Profissional', group: 'Grupo' };
  const FEATURES = {
    quotes: { min: 'pro', label: 'Compra de insumos: melhor cotação e preço automático' },
    reconciliation: { min: 'pro', label: 'Conciliação bancária' },
    contracts: { min: 'pro', label: 'Contratos de venda' },
    purchaseOrders: { min: 'pro', label: 'Pedidos de compra com aprovação' },
    userScopes: { min: 'pro', label: 'Permissão por fazenda e atividade' },
    audit: { min: 'pro', label: 'Histórico de alterações' },
    consolidated: { min: 'pro', label: 'Visão consolidada de todas as fazendas' },
    prioritySupport: { min: 'group', label: 'Atendimento prioritário' },
    guidedSetup: { min: 'group', label: 'Implantação acompanhada' }
  };
  // Páginas que dependem de uma função do plano.
  const PAGE_FEATURE = { conciliacao: 'reconciliation', contratos: 'contracts', 'pedidos-compra': 'purchaseOrders', historico: 'audit' };
  // Listas do módulo de gestão travadas quando o plano não tem a função.
  const MGMT_FEATURE = { quotes: 'quotes', bankEntries: 'reconciliation', salesContracts: 'contracts', purchaseOrders: 'purchaseOrders' };
  // Grupo antigo sem plano gravado continua com tudo o que tinha (Profissional).
  const planOf = plan => ORDER.includes(plan) ? plan : 'pro';
  function has(plan, feature) { const f = FEATURES[feature]; return !f || ORDER.indexOf(planOf(plan)) >= ORDER.indexOf(f.min); }
  function pageAllowed(plan, page) { return !PAGE_FEATURE[page] || has(plan, PAGE_FEATURE[page]); }
  function minPlanName(feature) { return NAMES[FEATURES[feature]?.min] || ''; }
  // Servidor: o que o plano não inclui volta a ser exatamente o que estava gravado.
  function restoreLocked(before, after, plan) {
    const locked = Object.entries(MGMT_FEATURE).filter(([, f]) => !has(plan, f)).map(([k]) => k);
    if (!locked.length) return after;
    for (const f of after.farms || []) {
      const old = (before.farms || []).find(x => x.id === f.id);
      f.management ||= {};
      for (const k of locked) f.management[k] = JSON.parse(JSON.stringify(old?.management?.[k] || []));
    }
    return after;
  }
  return { ORDER, NAMES, FEATURES, PAGE_FEATURE, planOf, has, pageAllowed, minPlanName, restoreLocked };
});
