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
