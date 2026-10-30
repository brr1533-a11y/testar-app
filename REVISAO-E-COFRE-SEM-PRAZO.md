# Revisão geral e cofre offline sem prazo

Base: repositório testar-app, commit 315473ddd27d4551130f3da738201a9c6b47f036.
Entrega local autorizada. Nenhum envio ao GitHub ou deploy no Render.

## Alterações
1. Cofre sem prazo de expiração offline, mantendo cifra AES-GCM e PIN. A sessão online continua sendo validada pelo servidor.
2. Trabalhos antigos de campo podem ser enviados depois de uma interrupção longa. Datas futuras e inválidas continuam bloqueadas; permissões, conflitos e histórico continuam validados.
3. Recusas de gravação não apagam outros lançamentos. O envio automático pausa e aparece uma área de revisão, com tentativa manual, exportação para conferência e retirada individual de novos lançamentos ainda não confirmados.
4. Falhas de armazenamento não impedem a saída da conta. Havendo pendências num cofre aberto, é solicitado o download de uma cópia cifrada com o mesmo PIN antes de concluir a saída. A cópia anterior no aparelho é mantida.
5. Falha ao criar o cofre não o marca como habilitado. A fila de gravação consegue se recuperar após uma falha.
6. Restauração de login tem prazo de dez segundos e botão Voltar à entrada. Uma falha temporária não apaga a sessão lembrada.
7. Fiscal de colheita permanece fiscal no cadastro pendente; a opção também aparece no registro.
8. Assinatura abre o plano e seus limites. Comprovantes de pagamento continuam disponíveis em entrada própria no Financeiro.
9. Formulários de Fazendas ajustados para celular; janelas mantêm o foco do teclado dentro delas.
10. Endereços e arquivos inexistentes retornam HTTP 404 e uma mensagem, sem devolver a página inicial como sucesso.
11. Roteiros de interface atualizados para preços configurados, uma fazenda inicial e navegação por abas.

## Arquivos e motivos
- app.js: preservação/revisão das pendências, cópia de emergência cifrada ao sair, prazo/cancelamento na restauração, função do cadastro pendente, página de assinatura e foco das janelas.
- app.html: área de revisão, botão para cancelar a restauração e opção Fiscal de colheita no registro.
- campo-offline.js: retirada do prazo, gravação consistente do cofre, recuperação da fila, mensagens de erro e cópia cifrada em memória sem depender do armazenamento cheio.
- server.js: aceitar trabalhos antigos enviados offline, preservar bloqueio de datas futuras e responder 404 corretamente.
- menu.js: separar Assinatura de Comprovantes de pagamento.
- app-minimal.css: formulário de Fazendas no celular e aparência da área de pendências.
- campo-sw.js: cache regenerado; o servidor também o gera automaticamente ao iniciar.
- LEVANTAMENTO-DO-SITE.md e VERSAO-UNICA-E-ETAPA-1.md: instruções do modo offline sem prazo.
- tests/marketing.cjs, operacao-browser.cjs, plots-browser.cjs, polish-browser.cjs e themes-inputs-browser.cjs: ajustes para o comportamento atual.
- tests/support/navigation.cjs: navegação dos testes pelas abas reais.
- tests/revisao-geral-browser.cjs: regressões de perda de pendências, retirada individual, armazenamento cheio, saída, cópia cifrada, PIN após um ano offline, datas antigas/futuras, restauração travada, assinatura, responsividade, foco, função do fiscal e 404.

## Validação
- npm test: 82 testes de regras e API passaram.
- Roteiros de navegador: marketing, pages, video-browser, themes-inputs-browser, browser, operacao-browser, plots-browser, polish-browser, soil-browser, seasons-browser, login-persistente-browser, perfil-funcao-browser, piscada-browser, sincronizacao-browser e pwa-investigacao passaram.
- Teste novo: node tests/revisao-geral-browser.cjs passou, incluindo abertura com PIN após um ano offline e envio de trabalho antigo, sem permitir trabalho futuro.
- Testes realizados em ambiente local isolado com dados de teste. Não alteram os dados dos grupos reais. Ainda cabe validar a instalação e os fluxos no iPhone físico após eventual publicação.

## Uso e preservação dos dados
O prazo antigo de 72 horas restringia a abertura; ele não era uma rotina de apagar os dados. Nesta versão, o app não impõe vencimento temporal ao cofre offline. Continuam necessários o PIN e a cópia existente no aparelho. Limpar os dados do navegador, remover o cofre ou perder o aparelho pode eliminar essa cópia; mantenha as cópias cifradas e sincronize quando houver conexão.

Quando o servidor recusar um lançamento, use a área de revisão para corrigi-lo ou retirar somente o registro incorreto. Os demais permanecem pendentes. O arquivo exportado para conferência nessa área é uma cópia dos dados sem senhas; a cópia de emergência do cofre ao sair é cifrada pelo PIN.

## Execução
Extraia o ZIP completo, abra a pasta que contém package.json e execute npm.cmd install e npm.cmd start. Para a revisão nova: node tests/revisao-geral-browser.cjs (requer Playwright/Chromium). Não use Live Server.

O ZIP não inclui senhas, banco de dados, .env real ou node_modules. A publicação atual do Render continua inalterada.
