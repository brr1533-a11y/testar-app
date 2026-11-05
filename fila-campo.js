/* Fila de lançamentos e modo campo.
   Mostra, de qualquer tela, o que ainda não chegou ao servidor: guardado (no cofre do aparelho ou só nesta aba),
   enviando, precisa de correção (o servidor recusou) e o que acabou de chegar. Usa a sincronização, o cofre
   (FieldMode) e a revisão de pendências que já existem; nada é enviado por um caminho novo. */
const FilaCampo = (() => {
  const confirmed = []; // últimos lançamentos confirmados nesta sessão (só rótulos e horário)
  let sending = null;   // chaves (caminho|id) que estão indo para o servidor agora
  const seen = new Map(); // pendências vistas: chave → rótulo (para saber quando chegaram, por qualquer caminho)
  const key = r => r.path + '|' + r.id;
  const when = t => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Rótulo de quem está no campo: pessoa, sacos ou diária, talhão e data.
  function label(r) {
    const farm = (data.farms || []).find(f => f.id === r.farmId), at = o => r.path.split('.').reduce((v, k) => v?.[k], o) || [];
    const row = at(farm).find(x => String(x.id) === String(r.id));
    if (r.path === 'labor.entries' && row) {
      const w = farm.labor?.workers?.find(x => x.id === row.workerId), p = (farm.talhoes || []).find(x => x.id === row.plotId);
      return `Apontamento · ${w?.name || 'Pessoa'} · ${row.kind === 'diaria' ? 'diária' : String(row.bags).replace('.', ',') + ' saco(s)'} · ${p?.name || 'talhão'} · ${dateBR(row.date)}`;
    }
    if (r.path === 'expansion.fieldLogs' && row) {
      const eq = [...(farm.tractors || []), ...(farm.implements || [])].find(x => x.id === row.equipmentId);
      const kinds = { checklist: 'Checklist', fuel: 'Abastecimento', pest: 'Pragas', weight: 'Pesagem', milk: 'Ordenha', general: 'Atividade' };
      const problems = row.kind === 'checklist' ? (row.checks || []).filter(c => !c.ok).length : 0;
      return `${kinds[row.kind] || 'Registro de campo'}${eq ? ' · ' + eq.name : ''}${row.kind === 'checklist' ? (problems ? ` · ${problems} problema(s)` : ' · tudo certo') : ''} · ${dateBR(row.date)}`;
    }
    return r.label;
  }
  function rows() {
    if (typeof newPendingRows !== 'function' || !currentUser || !serverBase) return [];
    const list = newPendingRows().map(r => {
      const status = syncRejected ? 'corrigir' : sending && sending.has(key(r)) ? 'enviando' : 'guardado';
      return { ...r, text: label(r), status };
    });
    reconcile(list);
    return list;
  }
  // Saiu da fila e está na versão do servidor = chegou (envio normal, nova tentativa ou junção de versões).
  function reconcile(list) {
    const now = new Set(list.map(key));
    for (const [k, text] of seen) {
      if (now.has(k)) continue;
      const [path, id] = [k.slice(0, k.lastIndexOf('|')), k.slice(k.lastIndexOf('|') + 1)];
      const arrived = (serverBase?.farms || []).some(f => (path.split('.').reduce((v, x) => v?.[x], f) || []).some(x => String(x.id) === id));
      if (arrived) confirmed.unshift({ text, at: Date.now() });
      seen.delete(k);
    }
    for (const r of list) seen.set(key(r), r.text);
    confirmed.splice(30);
  }
  const stored = () => typeof FieldMode !== 'undefined' && FieldMode.enabled();

  // Chip ao lado do indicador "Salvo": quantos lançamentos estão na fila e se algo precisa de atenção.
  function chip() {
    const status = document.getElementById('syncStatus'); if (!status) return;
    let b = document.getElementById('filaChip');
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'filaChip'; b.className = 'fila-chip'; b.onclick = open; status.after(b); }
    const list = rows(), fix = list.filter(r => r.status === 'corrigir').length, going = list.filter(r => r.status === 'enviando').length;
    b.hidden = !currentUser || (!list.length && !confirmed.length && !stored());
    b.dataset.kind = fix ? 'corrigir' : going ? 'enviando' : list.length ? 'guardado' : 'ok';
    b.textContent = fix ? `${fix} para corrigir` : going ? `Enviando ${going}` : list.length ? `${list.length} na fila` : 'Fila vazia';
    b.setAttribute('aria-label', 'Fila de lançamentos: ' + b.textContent);
  }

  function section(title, items, note, actions) {
    if (!items.length) return '';
    return `<section class="fila-grupo"><h4>${escapeHTML(title)} <span>${items.length}</span></h4>${note ? `<p class="muted">${note}</p>` : ''}<ul>${items.map(r => `<li class="fila-item" data-status="${r.status || 'ok'}"><span>${escapeHTML(r.text)}</span>${actions ? actions(r) : ''}</li>`).join('')}</ul></section>`;
  }
  function html() {
    const list = rows(), offline = !navigator.onLine;
    const where = stored() ? 'no cofre cifrado deste aparelho: continua guardado mesmo fechando o app' : '<b>só nesta aba</b>: habilite o Modo de campo para não perder se fechar o app';
    const fixable = list.filter(r => r.status === 'corrigir'), going = list.filter(r => r.status === 'enviando'), kept = list.filter(r => r.status === 'guardado');
    return `<div class="fila-topo"><p>${offline ? '<b>Sem internet.</b> ' : ''}${list.length ? `${list.length} lançamento(s) ainda não chegaram ao escritório.` : 'Tudo o que você lançou já chegou ao escritório.'}</p>
      <div class="row-actions"><button type="button" class="btn primary" id="filaSync" ${offline || !list.length ? 'disabled' : ''}>Sincronizar agora</button>${list.length ? '<button type="button" class="btn" id="filaCopy">Baixar cópia</button>' : ''}</div></div>
      ${syncRejected ? `<p class="fila-erro"><b>O servidor recusou o envio:</b> ${escapeHTML(syncRejected.message)} Corrija o lançamento indicado ou retire só ele; os outros continuam guardados.</p>` : ''}
      ${section('Precisa de correção', fixable, '', r => `<button type="button" class="btn small" data-fila-drop="${escapeHTML(key(r))}">Retirar</button>`)}
      ${section('Enviando agora', going, '')}
      ${section('Guardado, esperando envio', kept, 'Guardado ' + where + '.')}
      ${section('Chegou ao escritório', confirmed.slice(0, 15).map(c => ({ text: c.text + ' · ' + when(c.at), status: 'ok' })), 'Confirmados pelo servidor nesta sessão.')}`;
  }
  async function open() {
    let back;
    const draw = () => { if (!back?.isConnected) return; back.querySelector('.fila-corpo').innerHTML = html(); bind(); };
    const bind = () => {
      back.querySelector('#filaSync')?.addEventListener('click', async () => { await pushStateToServer(0, true); draw(); });
      back.querySelector('#filaCopy')?.addEventListener('click', downloadPendingCopy);
      back.querySelectorAll('[data-fila-drop]').forEach(btn => btn.onclick = async () => { await drop(btn.dataset.filaDrop); draw(); });
    };
    const shown = openDialog(() => `<form class="dlg fila-dlg" role="dialog" aria-modal="true" aria-labelledby="filaTitulo"><h3 id="filaTitulo">Fila de lançamentos</h3><div class="fila-corpo">${html()}</div><div class="dlg-actions"><button type="submit" class="btn">Fechar</button></div></form>`);
    back = [...document.querySelectorAll('.dlg-back')].at(-1); bind();
    const timer = setInterval(draw, 1000);
    await shown; clearInterval(timer);
  }
  // Retira só um lançamento ainda não confirmado (mesma regra da caixa de revisão).
  async function drop(k) {
    const r = rows().find(x => key(x) === k); if (!r) return;
    if (!await ask('Retirar apenas este lançamento ainda não confirmado? Os demais continuam na fila.', { title: r.text, okText: 'Retirar este lançamento' })) return;
    const farm = data.farms.find(f => f.id === r.farmId), base = serverBase?.farms?.find(f => f.id === r.farmId), parts = r.path.split('.'), at = o => parts.reduce((v, x) => v?.[x], o) || [];
    if (at(base).some(x => String(x.id) === String(r.id))) return toast('Este lançamento já foi confirmado no servidor.');
    const parent = parts.slice(0, -1).reduce((v, x) => v?.[x], farm); if (!parent) return;
    parent[parts.at(-1)] = at(farm).filter(x => String(x.id) !== String(r.id)); saveData(); renderPage();
  }

  // Envio: marca o que está indo e, ao voltar, registra o que o servidor confirmou.
  {
    const prior = pushStateToServer;
    pushStateToServer = async function (...args) {
      if (!navigator.onLine || cloudSaving || !cloudToken || !currentUser) return prior.apply(this, args);
      const before = rows(); sending = new Set(before.map(key)); chip();
      try { return await prior.apply(this, args); }
      finally { sending = null; chip(); }
    };
  }
  {
    const prior = setSyncStatus;
    setSyncStatus = function (...args) { prior.apply(this, args); chip(); };
  }
  addEventListener('online', chip); addEventListener('offline', chip);

  // Modo campo: botões e letras grandes, alto contraste. Liga sozinho para a equipe de campo no celular.
  const MODE_KEY = 'ruralModoCampo';
  function modeOn() { try { const v = localStorage.getItem(MODE_KEY); if (v != null) return v === '1'; } catch (_) {} return currentUser?.role === 'contribuinte' && matchMedia('(max-width:720px)').matches; }
  function applyMode() { document.body.classList.toggle('modo-campo', Boolean(currentUser) && modeOn()); }
  function setMode(on) { try { localStorage.setItem(MODE_KEY, on ? '1' : '0'); } catch (_) {} applyMode(); }

  return { rows, chip, open, applyMode, setMode, modeOn, confirmed };
})();

// Telas: chip atualizado a cada desenho; fila e chave do modo campo no Modo de campo e no Apontar colheita.
{
  const prior = renderPage;
  renderPage = function (options) {
    prior(options);
    FilaCampo.applyMode(); FilaCampo.chip();
    if (!['campo', 'colheita-campo', 'meu-dia'].includes(currentPage)) return;
    const n = FilaCampo.rows().length, host = document.createElement('div');
    host.className = 'card fila-resumo';
    host.innerHTML = `<div><b>${n ? n + ' lançamento(s) na fila' : 'Fila vazia'}</b><span class="muted">${n ? (navigator.onLine ? 'Enviando quando possível.' : 'Sem internet: envia quando pegar sinal.') : 'Tudo chegou ao escritório.'}</span></div><div class="row-actions"><button type="button" class="btn" id="filaVer">Ver fila</button><label class="fila-modo"><input type="checkbox" id="filaModo" ${FilaCampo.modeOn() ? 'checked' : ''}> Letras e botões grandes</label></div>`;
    $('#pageContent').prepend(host);
    host.querySelector('#filaVer').onclick = FilaCampo.open;
    host.querySelector('#filaModo').onchange = e => FilaCampo.setMode(e.target.checked);
  };
}
