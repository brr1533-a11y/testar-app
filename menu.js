/* Menu em grupos (Início, Lavoura, Pecuária, Estoque e compras, Financeiro e fiscal, Configurações) e abas dentro das páginas.
   Roda depois dos ajustes por perfil (adm-acesso.js) e decide também o que o plano do Grupo inclui (plan-features.js). */
function planHas(feature) { return PlanFeatures.has(currentGroup?.plan, feature); }
function planUpsell(feature) { return `<div class="card soft plan-upsell"><span class="badge gold">Plano ${PlanFeatures.minPlanName(feature)}</span><p><b>${escapeHTML(PlanFeatures.FEATURES[feature].label)}</b> faz parte dos planos ${feature === 'prioritySupport' || feature === 'guidedSetup' ? 'Grupo' : 'Profissional e Grupo'}. ${currentUser?.role === 'ceo' ? 'Para trocar de plano, abra Configurações › Assinatura.' : 'Fale com o CEO do Grupo.'}</p></div>`; }

// Grupo, ordem e nome de cada página no menu.
const MENU_GROUPS = ['Início', 'Lavoura', 'Pecuária', 'Estoque e compras', 'Financeiro e fiscal', 'Configurações'];
const MENU_LAYOUT = {
  dashboard: ['Início', 1], mercado: ['Início', 2], planejamento: ['Início', 3], alertas: ['Início', 4, 'Central de alertas'], mapa: ['Início', 5, 'Mapa da fazenda'], campo: ['Início', 6, 'Modo de campo'],
  talhoes: ['Lavoura', 1, 'Talhões'], 'analises-solo': ['Lavoura', 1.5, 'Análises de solo e foliar'], safras: ['Lavoura', 2], 'mao-de-obra': ['Lavoura', 2.5, 'Mão de obra da colheita'], 'colheita-campo': ['Lavoura', 2.6, 'Apontar colheita'], 'pos-colheita': ['Lavoura', 3], rastreabilidade: ['Lavoura', 3.5, 'Rastreabilidade dos lotes'], pragas: ['Lavoura', 4], banho: ['Lavoura', 5], entregas: ['Lavoura', 6],
  gado: ['Pecuária', 1, 'Rebanho e lotes'], manejos: ['Pecuária', 2], reproducao: ['Pecuária', 3], leite: ['Pecuária', 4], movimentacoes: ['Pecuária', 5], 'etapas-gado': ['Pecuária', 6, 'Etapas'],
  estoque: ['Estoque e compras', 1], insumos: ['Estoque e compras', 2], equipamentos: ['Estoque e compras', 3, 'Equipamentos'], manutencao: ['Estoque e compras', 4, 'Manutenção e combustível'],
  financeiro: ['Financeiro e fiscal', 1, 'Resumo financeiro'], lancamentos: ['Financeiro e fiscal', 1, 'Lançar entradas e saídas'],
  'financeiro-gestao': ['Financeiro e fiscal', 2, 'Contas a pagar e receber'], resultados: ['Financeiro e fiscal', 3, 'Resultados e custos'],
  fiscal: ['Financeiro e fiscal', 4, 'Notas fiscais'], conciliacao: ['Financeiro e fiscal', 5, 'Conciliação bancária'], contratos: ['Financeiro e fiscal', 6, 'Contratos de venda'],
  'pedidos-compra': ['Financeiro e fiscal', 7, 'Pedidos de compra'], lcdpr: ['Financeiro e fiscal', 8, 'Livro Caixa (LCDPR)'],
  fazendas: ['Configurações', 1], usuarios: ['Configurações', 2], pagamentos: ['Configurações', 3, 'Assinatura'], historico: ['Configurações', 4], perfil: ['Configurações', 5]
};
const MENU_ICONS = { 'financeiro-gestao': 'wallet', fiscal: 'receipt', conciliacao: 'swap', contratos: 'receipt', 'pedidos-compra': 'box', lcdpr: 'receipt' };
// Abas: a página do menu (primeira) e as que viraram aba dentro dela.
const PAGE_TABS = [
  ['talhoes', 'Talhões', 'historico-talhoes', 'Histórico dos talhões'],
  ['equipamentos', 'Equipamentos', 'log-equipamentos', 'Log de uso'],
  ['financeiro-gestao', 'Contas a pagar', 'recebimentos', 'Contas a receber'],
  ['fiscal', 'NF-e e MDF-e', 'notas', 'Comprovantes e anexos']
];
const TAB_PARENT = Object.fromEntries(PAGE_TABS.map(t => [t[2], t[0]]));
// Páginas que só existem pela central de Gestão (que saiu do menu) entram direto no grupo Financeiro e fiscal.
const FINANCE_PAGES = ['financeiro-gestao', 'fiscal', 'conciliacao', 'contratos', 'pedidos-compra'];

{
  const navBefore = navItems;
  navItems = function () {
    const items = navBefore();
    if (!currentUser || currentUser.role === 'contribuinte') return items;
    const have = new Set(items.map(i => i[0]));
    for (const page of FINANCE_PAGES) if (!have.has(page) && typeof gestaoAllowed === 'function' && gestaoAllowed(page)) { items.push([page, MENU_ICONS[page], page]); have.add(page); }
    // A central "Gestão" sai do menu (continua abrindo por link antigo).
    const out = [];
    for (const item of items) {
      const [id, icon, label] = item;
      if (!PlanFeatures.pageAllowed(currentGroup?.plan, id)) continue;
      if (id === 'gestao') { out.push([id, icon, label, '', 'tab']); continue; }
      const parent = TAB_PARENT[id];
      // Aba cujo "pai" o perfil não abre vira a entrada do menu no lugar dele (ex.: ADM só com o histórico dos talhões).
      if (parent && have.has(parent)) { out.push([id, icon, label, '', 'tab']); continue; }
      const layout = MENU_LAYOUT[parent || id];
      if (!layout) { out.push([id, icon, label, '', '']); continue; }
      const name = layout[2] && !(id === 'financeiro' && isGeneralView()) ? layout[2] : (id === 'financeiro' ? 'Resumo financeiro geral' : label);
      out.push([id, icon || MENU_ICONS[id] || 'grid', name, layout[0], '', layout[1]]);
    }
    return out.sort((a, b) => (MENU_GROUPS.indexOf(a[3]) + 1 || 99) - (MENU_GROUPS.indexOf(b[3]) + 1 || 99) || (a[5] || 0) - (b[5] || 0));
  };
}
// Página do menu que fica marcada quando uma aba está aberta.
function menuActive(page) { return TAB_PARENT[page] || ({ 'finance-entradas': 'financeiro', 'finance-gastos': 'financeiro', gestao: 'financeiro-gestao' }[page]) || page; }

// Abas no topo das páginas que juntaram duas telas.
{
  const pageBefore = renderPage;
  renderPage = function () {
    pageBefore();
    // Teste grátis: dias restantes no topo (o CEO vê o atalho para assinar).
    const trial = currentGroup?.trial;
    if (trial && currentUser && currentUser.role !== 'contribuinte') {
      const left = Math.max(0, Math.ceil((Date.parse(trial.endsAt) - Date.now()) / 86400000));
      $('#pageContent').insertAdjacentHTML('afterbegin', `<div class="trial-banner"><span><b>Teste grátis:</b> ${left === 0 ? 'termina hoje' : `faltam ${left} dia${left > 1 ? 's' : ''}`} (até ${new Date(trial.endsAt).toLocaleDateString('pt-BR')}). Seus dados continuam quando você assinar.</span>${currentUser.role === 'ceo' ? '<a class="btn small primary" href="/#planos" target="_blank" rel="noopener">Assinar</a>' : ''}</div>`);
    }
    const set = PAGE_TABS.find(t => t[0] === currentPage || t[2] === currentPage);
    if (!set || !currentUser || currentUser.role === 'contribuinte') return;
    const ids = navItems().map(i => i[0]);
    const tabs = [[set[0], set[1]], [set[2], set[3]]].filter(([id]) => ids.includes(id));
    if (tabs.length < 2) return;
    const bar = `<div class="page-tabs" role="tablist">${tabs.map(([id, label]) => `<button type="button" role="tab" class="page-tab ${id === currentPage ? 'active' : ''}" aria-selected="${id === currentPage}" data-tab="${id}">${escapeHTML(label)}</button>`).join('')}</div>`;
    $('#pageContent').insertAdjacentHTML('afterbegin', bar);
    $$('.page-tab').forEach(b => b.onclick = () => { if (b.dataset.tab !== currentPage) goToPage(b.dataset.tab); });
  };
}
