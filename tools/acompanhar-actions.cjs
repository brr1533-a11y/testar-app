// Espera o GitHub Actions do commit atual (HEAD) terminar e diz se passou. Usa a API pública do GitHub (repositório público).
// Uso: node tools/acompanhar-actions.cjs [sha]     (sai com erro se falhar ou demorar mais de 15 minutos)
const { execFileSync } = require('node:child_process');
const REPO = process.env.GITHUB_REPO || 'brr1533-a11y/testar-app';
const sha = process.argv[2] || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const H = { 'User-Agent': 'gestao-rural-entrega', Accept: 'application/vnd.github+json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const fim = Date.now() + 20 * 60000;
  // O commit precisa estar no GitHub; senão o Actions nunca começa.
  try { const remoto = execFileSync('git', ['ls-remote', 'origin', 'refs/heads/main'], { encoding: 'utf8' }).split(/\s/)[0]; if (remoto && !remoto.startsWith(sha) && !sha.startsWith(remoto.slice(0, sha.length))) { const contem = execFileSync('git', ['branch', '-r', '--contains', sha], { encoding: 'utf8' }).trim(); if (!contem) { console.error(`O commit ${sha.slice(0, 7)} ainda não está no GitHub (main está em ${remoto.slice(0, 7)}). Envie antes ("Push origin" no GitHub Desktop ou git push).`); process.exit(1); } } } catch (_) {}
  let visto = false;
  while (Date.now() < fim) {
    const r = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?head_sha=${sha}&per_page=5`, { headers: H });
    // Sem login, a API do GitHub aceita 60 consultas por hora: no limite, espera liberar em vez de desistir.
    if ((r.status === 403 || r.status === 429) && r.headers.get('x-ratelimit-remaining') === '0') {
      const reset = Number(r.headers.get('x-ratelimit-reset')) * 1000, espera = Math.max(5000, Math.min(reset - Date.now() + 2000, fim - Date.now()));
      console.log(`Limite de consultas do GitHub atingido; esperando ${Math.ceil(espera / 60000)} min para tentar de novo…`);
      await sleep(espera); continue;
    }
    if (!r.ok) { console.error('GitHub respondeu ' + r.status); process.exit(1); }
    const runs = (await r.json()).workflow_runs || [];
    if (runs.length) {
      visto = true;
      const pend = runs.filter(x => x.status !== 'completed');
      if (!pend.length) {
        const ruins = runs.filter(x => x.conclusion !== 'success');
        for (const x of runs) console.log(`${x.name}: ${x.conclusion} · ${x.html_url}`);
        process.exit(ruins.length ? 1 : 0);
      }
      console.log(`Aguardando: ${pend.map(x => x.name + ' (' + x.status + ')').join(', ')}`);
    } else console.log(`Aguardando o GitHub Actions começar para ${sha.slice(0, 7)}…`);
    await sleep(visto ? 30000 : 15000);
  }
  console.error('O GitHub Actions não terminou em 15 minutos.'); process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });
