/* Notificação que leva à decisão: /app?abrir=<tela>&item=<id>. Depois de entrar, abre a tela (se o perfil puder)
   e destaca o item, com o foco no botão de decidir. O endereço é limpo logo em seguida. */
(() => {
  const url = new URL(location.href), page = url.searchParams.get('abrir'), item = url.searchParams.get('item');
  if (!page) return;
  let done = false;
  function highlight(id) {
    if (!id) return;
    const el = [...document.querySelectorAll('[data-id]')].find(e => e.dataset.id === id), row = el?.closest('tr,.card,li');
    if (!row) return toast('Este item já foi resolvido ou não está mais disponível.');
    row.classList.add('item-destaque'); row.scrollIntoView({ block: 'center' });
    (row.querySelector('.g-approve') || row.querySelector('button'))?.focus();
  }
  const prior = renderPage;
  renderPage = function (options) {
    prior(options);
    if (done || !currentUser || typeof data === 'undefined' || !data?.farms) return;
    done = true;
    url.searchParams.delete('abrir'); url.searchParams.delete('item'); history.replaceState({}, '', url.pathname + (url.search || ''));
    if (!/^[a-z0-9-]{2,40}$/.test(page)) return;
    const allowed = navItems().some(i => i[0] === page) || (typeof gestaoExtraPages === 'function' && gestaoExtraPages().includes(page));
    if (!allowed) return toast('Esta tela não está liberada para o seu perfil.');
    goToPage(page);
    setTimeout(() => highlight(item), 250);
  };
})();
