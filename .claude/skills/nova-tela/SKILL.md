---
name: nova-tela
description: Cria uma tela nova no Gestão Rural com todos os passos que o projeto exige (regra em *-domain.js com teste, página no menu, permissão do ADM, ordem no app.html, PUBLIC_FILES no server.js, roteiro de navegador em celular). Use quando for adicionar uma página ou um módulo novo ao painel.
argument-hint: "<id-da-tela> <Nome que aparece no menu> [grupo do menu]"
---

# Tela nova

Argumentos: `$ARGUMENTS` (id em minúsculas com hífen, nome do menu, grupo). Exemplo pronto para copiar o jeito:
`fechamento.js` + `fechamento-domain.js` + `tests/fechamento-419.test.cjs` + `tests/fechamento-mes-browser.cjs`.

Siga em ordem e marque na lista de tarefas. Textos que a pessoa vê: português do Brasil, frases curtas.

1. **Regra primeiro** (`<nome>-domain.js`, ou dentro de `melhorias-domain.js` se for pequena):
   - módulo UMD como os outros (`(function(root,factory){...})(globalThis,function(){...})`), sem acesso a DOM;
   - validação com `check(ok,'mensagem em português')` (statusCode 422) para tudo que entra no estado;
   - teste de unidade em `tests/<nome>.test.cjs` (o hook roda esses testes a cada edição da regra).
2. **Servidor valida de novo.** Se a tela grava dados: chame a validação no caminho do `PUT /api/state`
   (`saveStateRoute` em `server.js`, ou `validateFarm`/`prepare` do domínio) e confira papel e grupo.
   Dados que nem todo papel pode ver: corte em `stateForUser` (veja `MonthClosing.project`).
   Cadastro simples? Use uma chave `META` em `melhorias-domain.js` (campos, página, `field:true` se o campo pode gravar).
3. **Página no menu:** `{id:'<id>',name:'<Nome>',group:'<Grupo>'[,finance:true]}` em `PAGES` de `melhorias-domain.js`.
   Se o ADM pode receber essa página: inclua em `adm-access.js` (lista `PAGES.push(...)`).
   Ajuda da IA: `guide(...)` em `ia-ajuda.js`.
4. **Tela** (`<nome>.js` + `<nome>.css`): embrulhe `renderExpansionPage` (ou `renderPage`) guardando a anterior,
   confira `XR.can(currentUser, page, AdmAccess.pagesFor(data))`, use `escapeHTML` em todo texto do usuário,
   `askForm`/`openDialog` para janelas e `xChange`/`saveData` para gravar.
   Nada que chega da internet pode redesenhar a tela com formulário aberto: `isUserEditing()` + `pendingRerender`.
5. **Ligar os arquivos:**
   - `app.html`: `<script>`/`<link>` depois dos módulos de que depende (a ordem importa por causa dos embrulhos);
   - `server.js`: os arquivos novos em `PUBLIC_FILES` (senão o site responde 404);
   - o service worker se atualiza sozinho pelo hook (confira com `npm run sw:conferir`).
6. **Roteiro de navegador** `tests/<nome>-browser.cjs` (copie a estrutura de `tests/fechamento-browser.cjs`):
   celular 390×844, quem pode e quem não pode ver, gravar e conferir no servidor (`/api/state`), sem erros de página.
   Rode com `npm run test:navegador -- <nome>-browser.cjs`.
7. **Revisão:** agente `revisor-campo` (texto e uso no celular) e, se mexe em dinheiro/permissão, `revisor-seguranca`.
8. Rode `npm test` e diga ao dono o que foi criado. Entrega só com `/entregar`.
