/* Primeira versão consultiva, exclusiva do CEO. Não envia o banco da fazenda. */
let aiPageGeneration = 0;
function renderRuralAssistant() {
  const generation = ++aiPageGeneration, host = document.getElementById('pageContent');
  if (currentUser?.role !== 'ceo') { host.textContent = 'Acesso exclusivo do CEO.'; return; }
  document.getElementById('pageTitle').textContent = 'Assistente IA';
  host.innerHTML = `<section class="card rural-ai"><span class="badge">Assistente rural</span><h2>Pesquise antes de decidir.</h2><p>Consulte preços com fontes ou tire dúvidas sobre gestão rural. O assistente não altera seus registros nem faz compras.</p><p id="aiStatus" role="status">Conferindo configuração…</p><form id="aiForm"><label>Tipo de consulta<select id="aiMode"><option value="prices">Buscar preços na internet</option><option value="explain">Explicar uma dúvida</option></select></label><label>Sua pergunta<textarea id="aiQuestion" rows="4" maxlength="1500" required placeholder="Ex.: preço da saca de café arábica de 60 kg no Sul de Minas, com data e fonte"></textarea></label><label class="ai-consent"><input id="aiConsent" type="checkbox" required> Autorizo enviar esta pergunta à OpenAI. Não incluí senhas nem dados pessoais.</label><p>Somente o texto digitado é enviado. Os cadastros e lançamentos da fazenda não são anexados. Na busca, o provedor também pode consultar páginas externas.</p><button id="aiSubmit" class="btn primary" type="submit" disabled>Consultar IA</button><p>É necessário estar conectado. Cotações devem ser conferidas antes de negociar.</p></form><div id="aiAnswer" aria-live="polite"></div></section>`;
  const form = host.querySelector('#aiForm'), status = host.querySelector('#aiStatus'), button = host.querySelector('#aiSubmit'), result = host.querySelector('#aiAnswer');
  let enabled = false;
  const active = () => generation === aiPageGeneration && currentPage === 'assistente-ia' && currentUser?.role === 'ceo' && document.contains(host) && host.contains(form);
  const refresh = async () => {
    try { const s = await api('/api/ai/status'); if (!active()) return;
      enabled = s.enabled;
      status.textContent = s.enabled ? `IA disponível · ${s.usedToday} de ${s.groupLimit} tentativa(s) deste grupo hoje (limite geral do servidor: ${s.dailyLimit}/dia).` : 'IA desligada. O responsável pode configurar a chave e o modelo no servidor quando quiser ativar.';
      button.disabled = !enabled || !navigator.onLine;
    } catch (e) { if (active()) { enabled = false; button.disabled = true; status.textContent = e.message; } }
  };
  form.onsubmit = async event => {
    event.preventDefault(); if (!enabled || button.disabled) return;
    if (!navigator.onLine) { status.textContent = 'Conecte-se à internet para consultar a IA.'; return; }
    const question = host.querySelector('#aiQuestion').value.trim(), mode = host.querySelector('#aiMode').value;
    button.disabled = true; result.textContent = 'Consultando…';
    try {
      const data = await api('/api/ai/ask', { method: 'POST', body: JSON.stringify({ question, mode, consent: host.querySelector('#aiConsent').checked }) });
      if (!active()) return;
      result.replaceChildren();
      for (const segment of data.segments) {
        const p = document.createElement('p'); p.className = 'ai-response'; let cursor = 0;
        for (const c of [...segment.citations].sort((a, b) => a.start - b.start)) {
          if (c.start < cursor) continue;
          p.append(document.createTextNode(segment.text.slice(cursor, c.start)));
          const link = document.createElement('a'); link.href = c.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = segment.text.slice(c.start, c.end) || c.title; link.title = c.title; p.append(link); cursor = c.end;
        }
        p.append(document.createTextNode(segment.text.slice(cursor))); result.append(p);
      }
      const footer = document.createElement('p'); footer.textContent = 'Consulta: ' + new Date(data.consultedAt).toLocaleString('pt-BR') + '. Resposta gerada por IA; confira as fontes. Nenhum registro foi alterado.'; result.append(footer);
    } catch (e) { if (active()) result.textContent = e.message; }
    finally { if (active()) await refresh(); }
  };
  refresh();
}
{
  const before = navItems;
  navItems = function () {
    const rows = before();
    if (currentUser?.role === 'ceo') rows.push(['assistente-ia', 'grid', 'Assistente IA', 'Início', '', 7]);
    return rows;
  };
}
