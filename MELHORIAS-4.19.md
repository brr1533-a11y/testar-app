# Gestão Rural 4.19.0 — insumo realmente usado e fechamento do mês pelo CEO

## 1. Insumo realmente usado na ordem de serviço (`custos-estoque.js`, `melhorias-domain.js`)

- **Quem faz o serviço informa o usado.**
  - Na tela de campo, o funcionário vê "Ordens com insumos" e o botão **Concluir e informar o usado**.
  - Para cada insumo previsto, ele diz quanto saiu (0 se não usou), com observação opcional.
  - Funciona sem internet, pela mesma fila do campo.
- **O escritório confere e escolhe o lote.**
  - **Dar baixa** abre uma janela com o que o campo informou ou, se o campo não informou, com o previsto e um aviso.
  - A quantidade já vem dividida entre os lotes do mesmo insumo (mesmo nome e unidade): primeiro o que vence antes, depois os vencidos e os sem saldo.
  - Lote vencido aparece marcado como **VENCIDO**.
- **A baixa desconta só o usado.**
  - Previsto 20 L, usados 16 L: saem 16 L e os 4 L ficam no estoque.
  - O custo de cada lote usa o preço daquele lote.
  - O histórico da aplicação guarda o lote, o previsto e o usado.
- **Avisos antes de gravar:**
  - mais de 20% acima do previsto;
  - lote vencido;
  - insumo que não foi usado (ele sai das pendências do fechamento sem mexer no estoque).
- **A baixa recusa:**
  - saldo insuficiente no lote, somando o lote inteiro;
  - lote de outro produto.
- **Continua valendo:** cada lote tem id fixo, então clicar de novo não dá baixa duas vezes.
- **A tabela das ordens mostra por insumo:** "previsto 20 L · usado 16 L (lote B2, A1)", "campo informou 16 L" ou "não usado".

## 2. Fechamento do mês confirmado pelo CEO (`fechamento-domain.js`, `fechamento.js`)

- **Fechar mês** (só o CEO, e só depois que o mês terminou):
  - Pede confirmação, avisando quando ainda há pendências.
  - O **servidor** calcula o relatório com os próprios dados e guarda a versão: número, data, quem fechou, pendências e um **código de conferência** (SHA-256). O navegador não consegue alterar o relatório.
- **PDF da versão:** com o mês fechado, o PDF sai da versão guardada, e não dos dados de hoje. O cabeçalho traz o número da versão, quem fechou e o código. Com o mês aberto, o PDF diz que é provisório.
- **Mês travado:**
  - Lançamentos do Financeiro, despesas, consumos de estoque e recebimentos com data no mês fechado não podem ser incluídos, alterados, apagados nem mudados de data.
  - A trava vale para todos (CEO, ADM e fila do campo). A mensagem diz qual mês está fechado e pede para o CEO reabrir.
- **Reabrir mês:**
  - Só o CEO, com motivo (pelo menos 5 letras).
  - O motivo, quem reabriu e qual versão estava valendo ficam no histórico.
  - Fechar de novo gera a versão 2, e a versão 1 continua guardada.
- **Histórico:** versões e reaberturas não podem ser apagadas nem reescritas. Cada versão tem o seu botão de PDF.
- **Quem vê o quê:**
  - O CEO e o ADM com páginas de dinheiro liberadas veem as versões.
  - Os outros ADMs só sabem quais meses estão fechados.
  - O funcionário do campo não recebe nada disso.
- **Contador:** no portal do contador, a fazenda mostra "Fechamentos confirmados pelo CEO", com o PDF de cada versão, as reaberturas e a indicação de qual versão vale. O pacote JSON leva os fechamentos.

## 3. Correções de defeitos antigos encontrados no caminho

- **Ordem com insumos travava o funcionário do campo.** A validação exigia que cada insumo da ordem estivesse no estoque, mas o funcionário não recebe o estoque. Com uma ordem com insumos atribuída a ele, qualquer gravação na tela de campo era recusada. Agora a validação só confere o item quando ele está na lista. A ordem guarda o nome e a unidade do insumo, e um item removido depois não trava mais a fazenda.
- **Tela de campo regravando sem parar.** Ao abrir a tela de campo, o app criava uma seção "Gestão" vazia na fazenda do funcionário. O servidor não manda essa seção para ele, então depois de qualquer gravação o celular via "mudança" e gravava de novo, milhares de vezes por minuto. Corrigido em `gestao.js`, com teste que confere que o celular parado não grava de novo.

## Testes

- `npm test`: 343 testes. Os novos estão em `tests/fechamento-419.test.cjs`:
  - baixa pelo usado com lotes;
  - recusas e avisos;
  - funcionário sem estoque;
  - fechar, travar, reabrir e versão 2;
  - API com ADM e contador.
- Roteiros de navegador novos:
  - `tests/insumo-usado-browser.cjs`: o operador conclui no celular com 16 de 20 L, e o escritório dá baixa nos dois lotes;
  - `tests/fechamento-mes-browser.cjs`: fechar, PDF da versão, recusa no mês fechado, reabrir com motivo e versão 2.
- `tests/custos-estoque-browser.cjs` foi atualizado para a nova janela de baixa.
- Os dois roteiros novos entraram em `npm run test:campo418:browser`.

## 4.19.1

- **Formulário apagado pela cotação.** A cotação do café chega alguns instantes depois de a tela abrir e redesenhava a página inteira. Quem já estava preenchendo uma saída no Financeiro perdia o que tinha digitado, principalmente com internet lenta. A cotação do mercado fazia o mesmo nas telas de gestão (por exemplo, no cenário do fluxo de caixa). Agora, se houver um formulário sendo preenchido, a tela só se atualiza depois que ele for salvo ou deixado de lado (`app.js`, `refreshQuote`; `expansao.js`, `xLoadMarket`).
- Esse defeito era a causa das falhas de vez em quando do teste `tests/custos-estoque-browser.cjs`: depois da correção, passou 15 vezes seguidas.
- Teste novo: `tests/cotacao-formulario-browser.cjs` segura a cotação, preenche o formulário e só então solta a cotação. Ele falha sem a correção e passa com ela.

## 4.19.2

Versão só de ferramentas de trabalho. **Nada muda nas telas** nem nos dados.

- **Entrega pelo git.** O projeto passou a ser trabalhado no clone do GitHub Desktop. A entrega agora é um commit e um envio (`/entregar`), e não mais o envio de arquivos pelo site do GitHub.
- **Fim de linha igual ao do servidor (`.gitattributes`).** O Git do Windows trocava o fim de linha dos arquivos ao baixar. Com isso, o `campo-sw.js` calculado no computador saía diferente do calculado no Render e no GitHub Actions.
- **GitHub Actions confere o `campo-sw.js`** (`npm run sw:conferir`). Um service worker desatualizado não passa mais despercebido, como aconteceu no zip da 4.19.0.
- **Comandos novos:**
  - `npm run test:navegador` roda os roteiros de navegador; com `REPETIR=10` repete o mesmo roteiro para achar teste instável.
  - `npm run versao -- X.Y.Z` troca a versão e gera de novo o service worker.
  - `node tools/acompanhar-actions.cjs` espera o GitHub Actions terminar.
  - Os scripts saíram de pastas temporárias e agora ficam em `tools/`.
- **Claude Code** (`CLAUDE.md` e `.claude/`):
  - regras do projeto;
  - hooks que conferem a sintaxe dos `.js`, atualizam o service worker e bloqueiam edição de `.env` e `.local-cloud.json`;
  - agentes `revisor-seguranca`, `cacador-teste-instavel` e `revisor-campo` (texto simples, celular, sem internet);
  - hook que roda os testes de unidade de uma regra (`*-domain.js`) assim que ela é editada;
  - trava contra edição direta do `campo-sw.js`;
  - skill `/nova-tela` com o passo a passo de uma tela nova.
- **Revisão de segurança da 4.18 e da 4.19:**
  - nada de gravidade alta ou média;
  - conferidos: fechamento do mês, alertas e notificações, insumo informado pelo campo, contador e proteção contra código malicioso (XSS) nas telas novas.

## 4.19.3

- **Dia de hoje no horário de Brasília, no navegador e no servidor.**
  - O Render roda em UTC. Das 21h à meia-noite o servidor já contava o dia seguinte.
  - O que errava nesse horário:
    - o custo da mão de obra de semana fechada sumia da safra, porque a data do fechamento caía "no futuro";
    - os avisos de vencimento contavam um dia a menos;
    - o "saldo conferido" do estoque não valia;
    - o fechamento de mês aceitava fechar o mês na noite do último dia;
    - o limite diário da IA virava à meia-noite UTC.
  - A correção:
    - todo cálculo de "hoje" usa `America/Sao_Paulo`, em 25 arquivos;
    - os horários gravados (`closedAt`, `countedAt`, `completedAt` e outros) viram data pelo dia de Brasília;
    - data simples (`AAAA-MM-DD`) continua como está.
- **Testes novos** em `tests/datas-brasilia.test.cjs`:
  - um impede voltar a calcular o dia em UTC;
  - um simula 22h30 de Brasília;
  - um simula a virada do mês às 22h de 30/11.
  Os três falham no código antigo e passam no novo.
- **Testes ajustados** para o mesmo dia de Brasília. Eles calculavam "hoje" em UTC e quebrariam à noite.
- **Botão "Simular"** do cenário de venda:
  - tem efeito de mola (vitrine do canal Não Codei, efeito 14);
  - funciona com o dedo, para sozinho quando assenta e respeita "menos movimento";
  - ficou menor e alinhado às caixas.
- **Preço por saca** do cenário arredondado para 2 casas. Antes aparecia `2013,3854497008656`.
- **Acompanhamento do Actions** (`tools/acompanhar-actions.cjs`):
  - avisa quando o commit ainda não foi enviado;
  - no limite da API do GitHub, usa o selo do workflow.
