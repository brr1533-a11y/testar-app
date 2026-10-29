/* Permissões do cargo ADM na tela: o menu do ADM segue as páginas que o CEO liberou (regras em adm-access.js),
   e o CEO marca e desmarca as páginas em Usuários > Permissões do ADM. O servidor aplica a mesma lista ao enviar e ao gravar. */
function canSee(page) {
  if (!currentUser) return false;
  if (currentUser.role === 'ceo') return true;
  if (currentUser.role !== 'adm' || AdmAccess.CEO_ONLY.includes(page)) return false;
  return AdmAccess.can(data, page);
}

// Menu do ADM: parte do menu completo (o mesmo do CEO) e mostra só as páginas liberadas.
{
  const navBefore = navItems;
  navItems = function () {
    if (!currentUser || currentUser.role !== 'adm') return navBefore();
    const real = currentUser;
    let items;
    try { currentUser = { ...real, role: 'ceo' }; items = navBefore(); } finally { currentUser = real; }
    items = items.filter(([page]) => canSee(page));
    // "Lançar entradas/saídas" é a página do ADM que não existe no menu do CEO (o CEO lança direto no Balanço).
    if (canSee('lancamentos') && !canSee('financeiro')) {
      const at = items.findIndex(i => i[0] === 'notas');
      items.splice(at < 0 ? items.length : at, 0, ['lancamentos', 'swap', 'Lançar entradas/saídas']);
    }
    if (!items.some(i => i[0] === 'perfil')) items.push(['perfil', 'users', 'Perfil']);
    return items;
  };
}

function admAccessPanel() {
  const pages = AdmAccess.pagesFor(data), groups = [...new Set(AdmAccess.PAGES.map(p => p.group))];
  const when = data.admAccess?.updatedAt ? ` · última mudança ${new Date(data.admAccess.updatedAt).toLocaleString('pt-BR')}${data.admAccess.updatedBy ? ' por ' + escapeHTML(data.admAccess.updatedBy) : ''}` : ' · usando o padrão';
  return `<div class="section-head" id="admAccess"><div><h2>Permissões do ADM</h2><p>Escolha as páginas que o cargo ADM abre. Vale para todos os usuários ADM do Grupo${when}.</p></div></div>
  <form id="admAccessForm" class="card adm-access">
    ${groups.map(g => `<fieldset><legend>${escapeHTML(g)}</legend>${AdmAccess.PAGES.filter(p => p.group === g).map(p => `<label class="adm-access-item"><input type="checkbox" name="page" value="${p.id}" ${pages.includes(p.id) ? 'checked' : ''}><span>${escapeHTML(p.label)}${p.finance ? ' <span class="badge gold">mostra valores</span>' : ''}</span></label>`).join('')}</fieldset>`).join('')}
    <label class="adm-limit">Alçada: o ADM aprova pedidos de compra de até R$ <input type="number" name="approvalLimit" min="0" step="0.01" value="${AdmAccess.approvalLimit(data) || ''}" placeholder="0 = só o CEO aprova"></label>
    <p class="muted">Sempre do CEO: Usuários, Fazendas, Pagamentos (assinatura) e Etapas do gado. Pedidos acima da alçada (ou sem preço) continuam com o CEO. Liberar uma página com "mostra valores" faz o ADM ver o balanço, os preços de venda e os custos de todas as fazendas. Tirar uma página tira do menu e o servidor deixa de aceitar mudanças nela.</p>
    <div class="form-actions"><button type="button" class="btn" id="admAccessDefault">Voltar ao padrão</button><button class="btn primary">Salvar permissões</button></div>
  </form>`;
}
function bindAdmAccessPanel() {
  const form = $('#admAccessForm'); if (!form) return;
  $('#admAccessDefault').onclick = () => form.querySelectorAll('input[name=page]').forEach(c => { c.checked = AdmAccess.DEFAULTS.includes(c.value); });
  form.onsubmit = async e => {
    e.preventDefault();
    const pages = [...form.querySelectorAll('input[name=page]:checked')].map(c => c.value);
    const before = AdmAccess.pagesFor(data);
    const money = pages.filter(id => AdmAccess.PAGES.find(p => p.id === id).finance && !before.includes(id));
    if (money.length && !(await ask('Com essa página, os ADMs passam a ver o balanço, os preços de venda e os custos de todas as fazendas. Continuar?', { title: 'Liberar valores para o ADM?', okText: 'Liberar' }))) return;
    const approvalLimit = Math.max(0, Number(form.elements.approvalLimit.value || 0));
    data.admAccess = { ...(data.admAccess || {}), pages: AdmAccess.normalize(pages), approvalLimit };
    saveData();
    toast('Permissões do ADM salvas. Os ADMs veem a mudança na próxima atualização da tela.');
    renderPage();
  };
}
// O painel fica no fim da página Usuários (só o CEO abre essa página).
{
  const usersBefore = renderUsers;
  renderUsers = function () {
    usersBefore();
    if (currentUser?.role !== 'ceo' || currentPage !== 'usuarios') return;
    $('#pageContent').insertAdjacentHTML('beforeend', admAccessPanel());
    bindAdmAccessPanel();
  };
}
