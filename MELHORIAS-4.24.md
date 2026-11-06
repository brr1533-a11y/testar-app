# Gestão Rural 4.24.0: achados do teste "usuário bagunceiro"

Um agente navegou por todas as telas, no celular e no computador, como CEO, ADM e funcionário do campo. Ele preencheu tudo errado de propósito. Estas são as correções.

## O que mudou
- **O servidor confere Financeiro, custos, Estoque e Talhões** (`lancamentos-domain.js`).
  - Antes, valor -500, "abc", 1e300, tipo "roubo", data 202620-01-01, descrição com 300 mil letras e id repetido voltavam 200 e ficavam gravados. Valia também para o ADM.
  - Agora a resposta é 422, com mensagem simples.
  - Só são conferidos registros novos ou alterados: um dado antigo fora da regra não trava o grupo.
  - O saldo do estoque pode ficar negativo quando o banho usou mais do que havia, porque a falta fica anotada.
- **Limites na tela.**
  - Campos de número vão até 10 bilhões, e campos de data aceitam de 1950 a 2100.
  - Campo obrigatório preenchido só com espaços é barrado antes de enviar.
  - O servidor confere de novo.
- **Valor enorme não alarga mais a tela do celular.** O cartão quebra a linha.
- **Diálogo recusado reabre com o que foi digitado.** Antes, um vencimento antes da data fechava a janela e apagava tudo. Vale para os cadastros genéricos: documentos, tarefas, ordens, registros de campo, arrendamentos e financiamentos.
- **Trocar de fazenda com formulário pela metade** pergunta antes.
- **Avisos sem nome técnico.** "Campo inválido: mm" virou "Confira os números: use valores de 0 até 1 trilhão." ou "Texto longo demais: use até 2.000 letras."

## Ainda pendente
- Os diálogos da Gestão (conta a pagar, pedido de compra, contrato, NF-e) ainda fecham quando os dados são recusados, porque usam outro caminho.
- O botão Voltar do celular com um diálogo aberto sai do sistema.
- No Financeiro, a categoria não muda quando o tipo muda.
- Número com vírgula ("1.234,56") não é aceito.

## Testes
- `tests/lancamentos-validacao.test.cjs`: os casos do relatório no servidor.
- `tests/bagunca-424-browser.cjs`: celular.
- **Resultado:** 372 de unidade e 35 roteiros de navegador.
