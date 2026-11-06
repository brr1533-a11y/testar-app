/* Notificação que leva à decisão: /app?abrir=<tela>&item=<id>&fazenda=<id>. Depois de entrar, troca para a fazenda do aviso,
   abre a tela (se o perfil puder) e destaca o item, com o foco no botão de decidir. O endereço é limpo logo em seguida. */
(() => {
  const url = new URL(location.href), page = url.searchParams.get('abrir'), item = url.searchParams.get('item'), fazenda = url.searchParams.get('fazenda');
  if (!page) return;
  let done = false;
  // Espera o item aparecer na tela (até 3 s), em vez de um tempo fixo que podia ler a tela antes de ela ser desenhada.
  function highlight(id, tentativas = 30) {
    if (!id) return;
    const el = [...document.querySelectorAll('[data-id]')].find(e => e.dataset.id === id), row = el?.closest('tr,.card,li');
    if (!row) return tentativas > 0 ? setTimeout(() => highlight(id, tentativas - 1), 100) : toast('Este item já foi resolvido ou não está mais disponível.');
    row.classList.add('item-destaque'); row.scrollIntoView({ block: 'center' });
    (row.querySelector('.g-approve') || row.querySelector('button'))?.focus();
  }
  const prior = renderPage;
  renderPage = function (options) {
    prior(options);
    if (done || !currentUser || typeof data === 'undefined' || !data?.farms) return;
    done = true;
    for (const k of ['abrir', 'item', 'fazenda']) url.searchParams.delete(k);
    history.replaceState({}, '', url.pathname + (url.search || ''));
    if (!/^[a-z0-9-]{2,40}$/.test(page)) return;
    // Aviso de outra fazenda: troca antes de abrir (antes abria na fazenda ativa e dizia "item já resolvido").
    if (fazenda && fazenda !== activeFarmId && data.farms.some(f => String(f.id) === fazenda)) activeFarmId = fazenda;
    const allowed = navItems().some(i => i[0] === page) || (typeof gestaoExtraPages === 'function' && gestaoExtraPages().includes(page));
    if (!allowed) return toast('Esta tela não está liberada para o seu perfil.');
    goToPage(page);
    highlight(item);
  };
})();
