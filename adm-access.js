/* Páginas do cargo ADM, configuradas pelo CEO (Usuários > Permissões do ADM). Usado pela tela e pelo servidor.
   A tela usa a lista para montar o menu; o servidor usa a mesma lista para decidir o que o ADM recebe e o que pode gravar:
   página tirada = o servidor descarta o que o ADM tentar mudar nela; página de dinheiro liberada = o ADM passa a ver valores. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AdmAccess = api;
})(typeof self !== 'undefined' ? self : this, function () {
  // finance: página que mostra dinheiro da fazenda (balanço, preços de venda, custos). mgmt: lista do módulo de gestão liberada.
  // farm / ops / mgmtWrite: o que a página grava (o servidor guarda a versão anterior quando a página está tirada).
  const PAGES = [
    { id: 'dashboard', label: 'Visão geral', group: 'Painel', def: true },
    { id: 'mercado', label: 'Mercado', group: 'Painel', def: true },
    { id: 'alertas', label: 'Central de alertas', group: 'Painel', def: true },
    { id: 'mapa', label: 'Mapa da fazenda (croqui)', group: 'Painel', def: true, mgmtWrite: ['mapAreas'] },
    { id: 'planejamento', label: 'Agenda', group: 'Operação', def: true, ops: ['tasks'] },
    { id: 'resultados', label: 'Resultados e custos', group: 'Operação', def: true, ops: ['expenses', 'stockUses'] },
    { id: 'safras', label: 'Safras e produção', group: 'Operação', def: true, farm: ['agriculture'], ops: ['dryingLogs', 'dryingGuidelines'] },
    { id: 'historico-talhoes', label: 'Histórico dos talhões', group: 'Operação', def: true, farm: ['plotProcedures'] },
    { id: 'talhoes', label: 'Cadastro de talhões', group: 'Operação', def: false, farm: ['talhoes'] },
    { id: 'analises-solo', label: 'Análises de solo e foliar', group: 'Operação', def: true, farm: ['soilAnalyses'] },
    { id: 'equipamentos', label: 'Equipamentos', group: 'Operação', def: true, farm: ['tractors', 'implements'] },
    { id: 'manutencao', label: 'Manutenção e combustível', group: 'Operação', def: true, mgmtWrite: ['maintenance', 'fuel'] },
    { id: 'log-equipamentos', label: 'Log de equipamentos', group: 'Operação', def: false },
    { id: 'rastreabilidade', label: 'Rastreabilidade dos lotes', group: 'Operação', def: true, mgmtWrite: ['traceLots'] },
    { id: 'pos-colheita', label: 'Pós-colheita do café (secagem, tulha, beneficiamento)', group: 'Operação', def: true, field: ['postHarvest'] },
    { id: 'pragas', label: 'Monitoramento de pragas do café', group: 'Operação', def: true, field: ['pests'] },
    { id: 'mao-de-obra', label: 'Mão de obra da colheita (pessoas, valores e fechamentos)', group: 'Operação', def: false, finance: true },
    { id: 'banho', label: 'Banho (café)', group: 'Operação', def: true, farm: ['banho'] },
    { id: 'entregas', label: 'Entregas', group: 'Operação', def: true, ops: ['deliveries'] },
    { id: 'gado', label: 'Rebanho e lotes', group: 'Gado', def: true, farm: ['cattle'] },
    { id: 'reproducao', label: 'Reprodução, sanidade e GTA', group: 'Gado', def: true, field: ['seasons', 'reproduction', 'vaccines', 'gta'] },
    { id: 'leite', label: 'Gado de leite', group: 'Gado', def: true, field: ['dairyCows', 'milk'] },
    { id: 'manejos', label: 'Desempenho e manejos', group: 'Gado', def: true, farm: ['cattle'] },
    { id: 'movimentacoes', label: 'Movimentações do gado', group: 'Gado', def: true, ops: ['cattleMoves'] },
    { id: 'estoque', label: 'Estoque', group: 'Compras e estoque', def: true, farm: ['stock'] },
    { id: 'insumos', label: 'Compra de insumos (cotações)', group: 'Compras e estoque', def: true, mgmtWrite: ['quotes'] },
    { id: 'pedidos-compra', label: 'Pedidos de compra', group: 'Compras e estoque', def: true, mgmtWrite: ['purchaseOrders'] },
    { id: 'lancamentos', label: 'Lançar entradas e saídas', group: 'Dinheiro', def: true },
    { id: 'notas', label: 'Notas fiscais e comprovantes', group: 'Dinheiro', def: true, farm: ['notes'] },
    { id: 'fiscal', label: 'Fiscal (NF-e e MDF-e)', group: 'Dinheiro', def: true, mgmtWrite: ['fiscalDocs'] },
    { id: 'financeiro', label: 'Resumo financeiro', group: 'Dinheiro', def: false, finance: true },
    { id: 'recebimentos', label: 'Contas a receber', group: 'Dinheiro', def: false, finance: true, ops: ['payments'] },
    { id: 'financeiro-gestao', label: 'Contas a pagar e rateios', group: 'Dinheiro', def: false, finance: true, mgmt: ['payables'] },
    { id: 'conciliacao', label: 'Conciliação bancária', group: 'Dinheiro', def: false, finance: true, mgmt: ['bankEntries'] },
    { id: 'contratos', label: 'Contratos de venda', group: 'Dinheiro', def: false, finance: true, mgmt: ['salesContracts'] },
    { id: 'lcdpr', label: 'Livro Caixa (LCDPR)', group: 'Dinheiro', def: false, finance: true },
    { id: 'historico', label: 'Histórico de alterações', group: 'Controle', def: false }
  ];
  // Sempre do CEO, nunca liberadas ao ADM: usuários, fazendas, assinatura e padrões do Grupo.
  const CEO_ONLY = ['usuarios', 'fazendas', 'pagamentos', 'etapas-gado'];
  PAGES.push(...[{"id":"custos-unidade","label":"Custo por unidade","group":"Financeiro e fiscal","finance":true,"def":false},{"id":"comercializacao","label":"Posição de comercialização","group":"Financeiro e fiscal","finance":true,"def":false},{"id":"orcamento-safra","label":"Orçamento de safra","group":"Lavoura","finance":true,"def":false},{"id":"emissao-fiscal","label":"Emissão e busca de NF-e","group":"Financeiro e fiscal","finance":true,"def":false},{"id":"estoque-cafe","label":"Café em armazéns","group":"Lavoura","finance":false,"def":true},{"id":"qualidade-leite","label":"Qualidade e pagamento do leite","group":"Pecuária","finance":true,"def":false},{"id":"rotacao-piquetes","label":"Ocupação e suplementação","group":"Pecuária","finance":true,"def":false},{"id":"clima","label":"Chuva e clima","group":"Início","finance":false,"def":true},{"id":"documentos","label":"Documentos e vencimentos","group":"Configurações","finance":false,"def":true},{"id":"certificacoes","label":"Certificações e caderno de campo","group":"Lavoura","finance":false,"def":true},{"id":"equipe-anual","label":"Mão de obra o ano todo","group":"Lavoura","finance":true,"def":false},{"id":"campo-completo","label":"App de campo e ordens de serviço","group":"Início","finance":false,"def":true},{"id":"comparador-coletivo","label":"Preços da região","group":"Estoque e compras","finance":true,"def":false},{"id":"notificacoes","label":"Notificações","group":"Configurações","finance":false,"def":true}]);
  const IDS = PAGES.map(p => p.id);
  const DEFAULTS = PAGES.filter(p => p.def).map(p => p.id);
  function normalize(list) { return Array.isArray(list) ? IDS.filter(id => list.includes(id)) : DEFAULTS.slice(); }
  function pagesFor(state) { return normalize(state && state.admAccess && state.admAccess.pages); }
  // Alçada: até quanto (R$) o ADM aprova pedidos de compra sozinho. 0 = só o CEO aprova.
  function approvalLimit(state) { const v = Number(state && state.admAccess && state.admAccess.approvalLimit); return Number.isFinite(v) && v > 0 ? Math.min(Math.round(v * 100) / 100, 10000000) : 0; }
  function can(state, page) {
    if (page === 'perfil' || page === 'campo') return true;
    if (page === 'gestao') return pagesFor(state).some(p => GESTAO_PAGES.includes(p));
    if (page === 'finance-entradas' || page === 'finance-gastos') page = 'financeiro';
    return pagesFor(state).includes(page);
  }
  const GESTAO_PAGES = ['financeiro-gestao', 'fiscal', 'conciliacao', 'contratos', 'pedidos-compra'];
  const byId = id => PAGES.find(p => p.id === id);
  function financeVisible(state) { return pagesFor(state).some(id => byId(id).finance); }
  function mgmtKeys(state) { return pagesFor(state).flatMap(id => byId(id).mgmt || []); }
  // Partes da fazenda que o ADM não pode mudar (as páginas que gravam nelas estão todas tiradas).
  function lockedParts(state) {
    const allowed = pagesFor(state), lock = { farm: new Set(), ops: new Set(), mgmt: new Set(), field: new Set() };
    const add = (kind, key) => { if (!PAGES.some(p => allowed.includes(p.id) && (p[kind === 'mgmt' ? 'mgmtWrite' : kind] || []).includes(key))) lock[kind].add(key); };
    for (const p of PAGES) { (p.farm || []).forEach(k => add('farm', k)); (p.ops || []).forEach(k => add('ops', k)); (p.mgmtWrite || []).forEach(k => add('mgmt', k)); (p.field || []).forEach(k => add('field', k)); }
    return lock;
  }
  return { approvalLimit, PAGES, CEO_ONLY, IDS, DEFAULTS, GESTAO_PAGES, normalize, pagesFor, can, financeVisible, mgmtKeys, lockedParts };
});
