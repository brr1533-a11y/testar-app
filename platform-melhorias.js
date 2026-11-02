/* Super Admin: backup automático (com teste de restauração), métricas de uso por página e exclusões pedidas pelos clientes. */
{
  const prior = load;
  load = async function () { await prior(); mhOps().catch(() => {}); };
}
async function mhOps() {
  const host = $("#mhOps"); if (!host) return;
  const [b, u, d] = await Promise.all([api("/api/platform/backups"), api("/api/platform/usage"), api("/api/platform/deletions")].map(p => p.catch(e => ({ error: e.message }))));
  const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  const when = v => v ? new Date(v).toLocaleString("pt-BR") : "—";
  const last = b.log?.[0];
  host.innerHTML = `<div class="table-card"><div class="table-head"><div><h2>Backup automático</h2><p>${b.error ? esc(b.error) : `A cada ${esc(b.everyHours || "—")} h, guarda os ${esc(b.keep)} mais recentes${b.encrypted ? ", cifrados" : " (defina BACKUP_KEY para cifrar)"}. Cada cópia é aberta de novo e conferida logo depois de gravada.`}</p></div><div class="table-tools"><button id="mhBackupNow">Fazer backup agora</button></div></div>
    <div class="table-wrap"><table><thead><tr><th>Quando</th><th>Arquivo</th><th>Tamanho</th><th>Motivo</th><th>Teste de restauração</th></tr></thead><tbody>${(b.log || []).slice(0, 10).map(x => `<tr><td>${when(x.at)}</td><td>${esc(x.file)}</td><td>${kb(x.size || 0)}</td><td>${esc(x.reason)}</td><td>${x.test?.ok ? `OK · ${x.test.groups} grupo(s), ${x.test.farms} fazenda(s), ${x.test.ms} ms${x.test.warnings?.length ? ` · ${x.test.warnings.length} aviso(s) de validação` : ""}` : `<b>Falhou</b> ${esc(x.test?.error || (x.test?.warnings || []).join("; "))}`}</td></tr>`).join("") || '<tr><td colspan="5" class="empty-row">Nenhum backup ainda.</td></tr>'}</tbody></table></div>${last ? `<p class="dica">Último: ${when(last.at)}. No Render, use um disco persistente (BACKUP_DIR) ou o backup do banco PostgreSQL: a pasta do serviço é apagada a cada publicação.</p>` : ""}</div>
  <div class="table-card"><div class="table-head"><div><h2>Uso por página · ${esc(u.month || "")}</h2><p>Só contagens: quantas vezes cada tela foi aberta e por quantos Grupos. Nenhum conteúdo é registrado.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Página</th><th>Aberturas</th><th>Grupos</th><th>CEO / ADM / equipe</th></tr></thead><tbody>${(u.pages || []).slice(0, 40).map(p => `<tr><td>${esc(p.page)}</td><td>${p.views}</td><td>${p.groups}</td><td>${p.roles?.ceo || 0} / ${p.roles?.adm || 0} / ${p.roles?.contribuinte || 0}</td></tr>`).join("") || `<tr><td colspan="4" class="empty-row">${esc(u.error || "Sem uso registrado neste mês.")}</td></tr>`}</tbody></table></div></div>
  <div class="table-card"><div class="table-head"><div><h2>Exclusões pedidas pelos clientes</h2><p>O Grupo é apagado sozinho depois do prazo; o cliente pode cancelar até lá.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Grupo</th><th>Pedido em</th><th>Apaga em</th><th>Por</th></tr></thead><tbody>${(d.pending || []).map(x => `<tr><td>${esc(x.name)} (${esc(x.code)})</td><td>${when(x.requestedAt)}</td><td>${when(x.executeAfter)}</td><td>${esc(x.by)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty-row">${esc(d.error || "Nenhum pedido em aberto.")}</td></tr>`}</tbody></table></div><p class="dica">${(d.done || []).length} exclusão(ões) concluída(s) registradas.</p></div>`;
  $("#mhBackupNow").onclick = async e => { const btn = e.target; btn.disabled = true; btn.textContent = "Gravando…"; try { await api("/api/platform/backups/run", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } }); await mhOps(); } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = "Fazer backup agora"; } };
}
// A página já abre logada quando há sessão: nesse caso o painel é carregado antes deste arquivo.
if (token) mhOps().catch(() => {});
