// Espera o GitHub Actions do commit atual (HEAD) terminar e diz se passou. Usa a API pública do GitHub (repositório público).
// Uso: node tools/acompanhar-actions.cjs [sha]     (sai com erro se falhar ou demorar mais de 15 minutos)
const { execFileSync } = require('node:child_process');
const REPO = process.env.GITHUB_REPO || 'brr1533-a11y/testar-app';
const sha = process.argv[2] || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const H = { 'User-Agent': 'gestao-rural-entrega', Accept: 'application/vnd.github+json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const fim = Date.now() + 15 * 60000;
  let visto = false;
  while (Date.now() < fim) {
    const r = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?head_sha=${sha}&per_page=5`, { headers: H });
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
    await sleep(visto ? 20000 : 10000);
  }
  console.error('O GitHub Actions não terminou em 15 minutos.'); process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });
