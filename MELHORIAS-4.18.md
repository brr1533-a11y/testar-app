# Gestão Rural 4.18.0 — campo, custos, alertas, fechamento

Esta versão segue o plano em quatro frentes: fila e modo campo, custos e estoque, alertas e aprovação, fechamento e margem. Também traz três ideias extras: contas recorrentes, o cenário "e se eu vender agora?" e a validade dos insumos. A entrada por voz ficou de fora, como combinado.

## 1. Fila e modo campo (`fila-campo.js`, `fila-campo.css`)

- **A fila agora aparece.** Ao lado do aviso de sincronização há um botão com a situação: "N na fila", "Enviando N", "N para corrigir" ou "Fila vazia".
- **A janela da fila mostra:**
  - **Precisa de correção:** o servidor recusou. Mostra o motivo e tem o botão **Retirar**.
  - **Enviando agora**.
  - **Guardado, esperando envio:** diz se está no cofre cifrado do aparelho ou só nesta aba.
  - **Chegou ao escritório:** só aparece quando o servidor confirma.
- **Na mesma janela:** os botões **Sincronizar agora** e **Baixar cópia**, que reaproveitam o cofre e o envio que já existiam.
- **Modo campo:** letras e botões grandes. Vem ligado para o Contribuinte no celular. Liga e desliga no "Meu dia", no campo e na colheita.
- **Teste de aceite** (`tests/fila-campo-browser.cjs`), que passa:
  1. O fiscal registra 3 sacos e uma diária em modo avião.
  2. Fecha o app e reabre com o PIN do cofre.
  3. Reconecta, e a primeira resposta do servidor "se perde" de propósito.
  4. Confirma que cada lançamento chega ao servidor uma única vez, mesmo depois de recarregar.

## 2. Checklist do trator (`checklist-trator.js`)

- **Itens:** óleo, água do radiador, pneus, freios, luzes, vazamentos, combustível, engraxe e cabine, mais o horímetro e uma observação.
- **Sem internet:** usa a mesma fila dos apontamentos.
- **Item com problema:** vira aviso para o escritório. O checklist mais novo de cada equipamento é o que vale, e avisos de mais de 14 dias somem.

## 3. Custos e estoque (`custos-estoque.js`)

- **Centro de custo obrigatório em toda saída do Financeiro:** uma safra, um lote ou **Geral**. Ao digitar o fornecedor, o sistema sugere o centro usado na última compra dele.
- **Ordens de serviço com insumos:** a ordem diz quais insumos vai usar. O botão **Dar baixa** tira o estoque e lança o custo na safra uma única vez. O id é fixo, então clicar de novo não dá baixa duas vezes.
- **Mínimo pelo consumo real:**
  - O sistema sugere o mínimo pelo gasto dos últimos 90 dias, com cobertura de 30 dias.
  - O botão **Usar** só libera depois de **Conferir saldo**, que registra a contagem física.
  - Sem saldo conferido nos últimos 30 dias, a sugestão não vale.

## 4. Alertas e aprovação (`alertas-acao.js`)

- **A notificação abre o próprio pedido** (`/app?abrir=…&item=…`). O pedido vem destacado e com o foco em **Aprovar**, e o CEO decide no celular. O endereço é limpo depois de abrir, e telas sem permissão não abrem.
- **Alertas que pedem decisão vão só para o CEO:**
  - **Parcela sem caixa previsto:** a parcela vence em até 30 dias e o caixa projetado não cobre. O título diz quanto falta. O push não mostra valores.
  - **Pedido de compra aguardando**.
- **O que fica para depois:** os alertas de adubo e de preço esperam os dados que os alimentam ficarem confiáveis.

## 5. Fechamento e margem (`fechamento.js`)

- **Fechamento do mês (piloto em PDF):**
  - Mostra entradas, saídas, resultado e as **pendências**: conta vencida, recebimento atrasado, ordem concluída sem baixa, semana da colheita sem fechamento, estoque no mínimo, checklist com problema e saídas sem centro de custo.
  - Separa os **custos sem rateio** em dois: o **Geral**, escolhido de propósito, e o **sem destino**, que ninguém definiu.
- **Margem por hectare:** compara as fazendas com o mesmo período, a mesma cultura e o mesmo critério de custo. Dá para incluir o Geral dividido pela área. Cada fazenda abre o detalhe por safra.

## 6. Ideias extras

- **Contas recorrentes** (Fluxo de caixa):
  - Energia, aluguel, salário, arrendamento.
  - Cada conta tem fornecedor, valor, dia do vencimento, centro de custo, início e fim. Quando o dia não existe no mês (31 em fevereiro), vale o último dia.
  - Os meses futuros já entram na projeção do caixa.
  - O botão **Lançar em Contas a pagar** cria as do mês com id fixo (`rec_<conta>_<AAAAMM>`). Clicar de novo não duplica, e a conta lançada sai da previsão para não contar duas vezes.
  - Conta do mês não lançada perto do vencimento vira aviso para o CEO.
- **E se eu vender agora?** (Fluxo de caixa):
  - O CEO informa as sacas e o preço; o preço do mercado já vem preenchido.
  - O sistema mostra o novo menor saldo e se ainda falta caixa.
  - Quando o caixa fica negativo, a tela diz quantas sacas vender para cobrir.
  - É só simulação: não lança nada. O que foi digitado não se perde quando a cotação chega e redesenha a tela.
- **Validade dos insumos** (Estoque):
  - Lote e validade no cadastro e em cada item.
  - Um quadro lista o que está vencido ou vence em até 30 dias, com destaque na última semana.
  - Aviso em dois momentos: 30 dias antes e 7 dias antes. Item vencido também avisa. Item sem saldo não avisa.

## Ideias que ficaram para depois

- Foto com localização no apontamento e no checklist.
- Pix em lote para pagar a semana da colheita.
- Conciliação automática do extrato com Contas a pagar e receber.
- Cotação com 3 fornecedores antes do pedido de compra.
- Entrada por voz, fora desta versão a pedido.

## Testes

- `npm test` roda os testes de unidade e de API. Os novos estão em `tests/campo-418.test.cjs` e `tests/minhas-418.test.cjs`.
- `npm run test:campo418:browser` roda os seis testes de navegador desta versão:
  - fila,
  - checklist,
  - custos e estoque,
  - alertas,
  - fechamento,
  - recorrentes, cenário e validade.
- `tests/ajustes-browser.cjs` agora escolhe o centro de custo na saída lançada à mão.

## 4.18.1

- Histórico de combustível: o controle deslizante "Consultar mês" saiu. O mês é escolhido tocando ou arrastando o dedo direto no gráfico (no computador, passando o mouse). O ponto do mês fica marcado e o valor aparece acima do gráfico. Sem caixa de foco nem destaque azul ao tocar; no teclado, as setas mudam o mês. Teste: `tests/combustivel-grafico-browser.cjs`.
