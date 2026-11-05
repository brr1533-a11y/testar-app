---
name: entregar
description: Entrega uma versão nova do Gestão Rural no GitHub (testar-app, main) — troca a versão, gera o service worker, roda todos os testes, documenta, faz commit e push e espera o GitHub Actions ficar verde. Use quando o dono pedir para entregar, publicar, subir ou mandar para o GitHub.
argument-hint: "<versão nova, ex.: 4.19.2> [resumo curto do que mudou]"
disable-model-invocation: true
---

# Entregar uma versão

Argumentos: `$ARGUMENTS` (primeiro a versão, depois um resumo). Se faltar a versão, proponha a próxima
(correção → último número; novidade → número do meio) e siga.

Mantenha a lista de tarefas atualizada e fale com o dono em português simples.

1. **Ponto de partida limpo.** `git fetch` e `git status -sb`. Se o `main` remoto tiver commits que não estão aqui,
   `git pull --ff-only`. Se houver mudança local que não é desta entrega, pare e pergunte.
2. **Versão e service worker:** `npm run versao -- <versão>` (troca package.json, package-lock.json e gera o campo-sw.js).
3. **Documentação:**
   - uma linha nova no topo do `README.md`: `> **Versão X.Y.Z:** <o que mudou, em linguagem do dono>`;
   - uma seção em `MELHORIAS-<X.Y>.md` (crie o arquivo se a versão do meio mudou) com o que mudou, por quê e os testes.
4. **Testes — todos precisam passar:**
   - `npm test`;
   - `npm run sw:conferir`;
   - `npm run test:navegador` (rode em segundo plano; demora alguns minutos).
   Se um roteiro falhar, rode ele de novo sozinho com `REPETIR=5`. Se falhar de vez em quando, é defeito: investigue
   (agente `cacador-teste-instavel`) antes de entregar. Não entregue com teste vermelho sem o dono concordar.
5. **Commit e push:** `git add -A`, confira `git diff --cached --stat` (nada de `.env`, `.local-cloud.json`,
   `node_modules`, `test-results`), commit com mensagem `X.Y.Z: <resumo>` e `git push origin main`.
6. **GitHub Actions:** `node tools/acompanhar-actions.cjs` até terminar. Vermelho → leia o log, corrija e volte ao passo 4.
7. **Avise o dono:** versão, commit, o que mudou (curto), resultado dos testes e do Actions, e o que não foi conferido
   (por exemplo, se o Render já publicou).
