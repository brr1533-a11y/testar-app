# Gestão Rural — guia para o Claude

Sistema de gestão de fazendas (café, gado, grãos) para o CEO, o escritório (ADM), o pessoal do campo (contribuinte) e o contador.
Node + Express no servidor (`server.js`), JavaScript puro no navegador (sem framework), Postgres em produção (`DATABASE_URL`)
e `.local-cloud.json` localmente. Publicado no Render a partir do `main` deste repositório (`brr1533-a11y/testar-app`).

## Regras do dono do projeto

- **Tudo o que a pessoa vê é em português do Brasil**, frases curtas e simples (usuário do campo, celular, sol forte).
- **Nunca digitar senha real**, token ou chave em lugar nenhum. Senhas de teste vêm de `tests/support/server.cjs`.
- **Não mexer na pasta "antigos salvos"** (`C:\Users\000\Documents\projeto site\antigos salvos`).
- **Entrega = `git push` no `main` do testar-app com o GitHub Actions verde.** Use `/entregar`. Zip só como cópia, se pedirem.
- Não fazer merge de PR nem publicar em outro repositório (teste-segurity) sem pedido.

## Comandos

| O quê | Comando |
| --- | --- |
| Testes de unidade e API (os mesmos do GitHub Actions) | `npm test` |
| Roteiros de navegador (Brave no Windows, se instalado) | `npm run test:navegador` |
| Só alguns roteiros | `npm run test:navegador -- fechamento-mes-browser.cjs minhas-browser.cjs` |
| Caçar teste instável | `REPETIR=10 npm run test:navegador -- custos-estoque-browser.cjs` |
| Trocar a versão (package + lock + service worker) | `npm run versao -- 4.19.2` |
| Conferir/gerar o service worker | `npm run sw:conferir` / `node tools/conferir-sw.cjs --corrigir` |
| Acompanhar o GitHub Actions do último commit | `node tools/acompanhar-actions.cjs` |
| Servidor local | `npm start` → http://localhost:3000/app |

## Como o código é organizado

- **Uma tela = um arquivo `.js` (+ `.css`)**, carregados em ordem por `app.html`. Um arquivo novo servido ao navegador também
  precisa entrar em `PUBLIC_FILES` no `server.js`.
- **Regras de negócio ficam nos `*-domain.js`** (funcionam no navegador e no Node e têm teste de unidade). O servidor valida
  tudo de novo: nunca confie só no navegador.
- **Extensões por embrulho:** módulos novos trocam funções globais guardando a anterior
  (`const prior = renderPage; renderPage = function (...) { prior(...); ... }`). Mantenha a ordem dos scripts no `app.html`.
- **Cadastros genéricos** usam as chaves `META` de `melhorias-domain.js`/`expansao-domain.js` (campos, página, validação).
- **Sincronização:** `PUT /api/state` com `baseRev`; conflito 409 vira junção (`merge3`); recusa 400/403/422 vira pendência
  (`syncRejected`). Lançamento do campo precisa funcionar sem internet (fila + cofre com PIN).
- **Redesenho que vem da internet** (sincronização, cotação, mercado) **nunca** pode apagar formulário meio preenchido:
  confira `isUserEditing()` e use `pendingRerender`. Foi a causa do defeito da 4.19.1.
- **Papéis:** CEO, ADM (com páginas liberadas pelo CEO), contribuinte (campo) e contador. Cada grupo só vê os próprios dados.
- **`campo-sw.js`** é gerado por `gerar-worker.cjs` (o servidor também gera ao iniciar). Um hook atualiza sozinho.
- **Fim de linha LF** em tudo (`.gitattributes`); não volte para CRLF, senão o service worker sai diferente do servidor.

## Testes

- Cada mudança de regra ganha teste em `tests/*.test.cjs`; cada mudança de tela ganha (ou atualiza) um roteiro
  `tests/*-browser.cjs` com Playwright, usando `tests/support/server.cjs` (servidor de teste em pasta temporária).
- Teste que falha "de vez em quando" é defeito até prova em contrário: investigue a causa (veja o agente
  `cacador-teste-instavel`) em vez de só aumentar o tempo de espera.
- Documente cada versão em `MELHORIAS-<versão>.md` e numa linha no topo do `README.md`.
