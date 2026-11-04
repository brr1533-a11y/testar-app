# Navegação, comparação de safras e tratores — 4.15.0

Entrega completa e local. Nenhum envio ao GitHub ou Render.

## Onde usar

**Tratores:** selecione Geral no topo, abra Estoque e compras › Equipamentos › Tratores · todas as fazendas. Cada fazenda possui uma coluna. O CEO pode arrastar um cartão para a coluna de destino, ou arrastar pelo botão de pontos. Soltar abre uma confirmação com o destino preenchido; a mudança só ocorre ao confirmar. Também continuam disponíveis os botões Escolher destino, utilizáveis sem arrastar e pelo teclado.

Somente o CEO transfere. O ADM consulta conforme o acesso existente. A transferência usa a mesma rota protegida já utilizada pelo sistema, preserva a identificação do trator e mantém usos, custos e manutenções anteriores na origem. Bloqueios de reserva recente, manutenção e serviços pendentes continuam valendo. O histórico fica na visão geral dos equipamentos. A nova aba só aparece no modo Geral.

**Safras:** em Lavoura › Safras e produção, abra Comparar safras. A opção também aparece em Resultados e custos. Escolha duas safras da mesma cultura. Alterne entre Sobrepostos e Lado a lado e entre sacas acumuladas e produtividade acumulada em sc/ha. A safra principal usa linha cheia; a referência, linha tracejada.

Os meses são contados desde o início de cada safra, incluindo a mudança de ano. Para comparar pesos de saca diferentes, as duas séries usam uma base comum: o peso da saca da safra principal, indicado abaixo do gráfico. Os meses futuros ficam sem projeção. A tabela Ver valores por mês permite conferir os números. O gráfico usa os primeiros 36 meses e avisa quando há registros fora desse intervalo. Só mostra colheitas existentes, sem inserir exemplos nos dados do cliente. Para produtividade, ambas as safras precisam ter área válida.

**Menu:** em telas a partir de 901 px, o painel lateral tem cantos arredondados, indicador de seleção com movimento curto e transições leves ao trocar de página. O fundo foi deixado transparente a pedido do usuário. O botão Menu: transparente no rodapé permite restaurar o fundo; a preferência fica apenas neste navegador. No celular, continua a navegação inferior anterior. As animações respeitam a preferência do sistema e a opção Reduzir animações do app.

## Arquivos alterados e motivos

| Arquivo | Motivo |
| --- | --- |
| `navegacao-suave.js` | Indicador do menu, posição da seleção e preferência de fundo transparente. |
| `safras-comparacao.css` | Menu lateral, transições, gráficos, colunas por fazenda e estados de arraste. |
| `safras-comparacao-domain.js` | Cálculos de produção acumulada, meses relativos, base comum de saca e produtividade. |
| `safras-comparacao.js` | Controles de comparação, gráficos animados, legenda, apresentação sobreposta ou separada e tabela de valores. |
| `tratores-geral.js` | Aba consolidada, colunas por fazenda, arraste com mouse/toque e alternativa por botão. |
| `equipamentos.js` | Reutiliza a confirmação de transferência com destino opcional já selecionado pelo arraste. |
| `app.js` | Texto da visão geral de equipamentos passa a indicar a nova opção de transferência. |
| `app.html` | Carrega os novos módulos e estilos. |
| `server.js` | Permite servir os novos recursos estáticos; não muda a regra de transferência. |
| `campo-sw.js` | Cache offline regenerado para os novos recursos. |
| `tests/safras-comparacao.test.cjs` | Testa alinhamento de meses, mudança de ano, conversão de peso, área, dados vazios, futuros e exclusão de culturas incompatíveis. |
| `package.json`, `package-lock.json` | Versão 4.15.0, sem dependências novas. |
| Este arquivo e `ALTERACOES-VISUAL-4150.json` | Orientações e inventário com hashes das alterações em relação à versão 4.14.0. |

## Conferência

- Suíte completa: **317 testes passaram, nenhum falhou**.
- Sintaxe verificada em **183 arquivos JS/CJS**; **100 recursos estáticos** conferidos por HTTP.
- Navegador: sobreposição com duas safras fictícias, apresentação lado a lado, seleção de destino, arraste real pelo mouse e confirmação do destino preenchido.
- Transferência fictícia concluída: Trator 02 passou da fazenda de demonstração para Boa Vista; identificação preservada e histórico disponível.
- Layout de tratores conferido em largura simulada de celular, sem transbordamento horizontal medido. A captura dessa simulação apresentou redução de escala do navegador; não equivale a validação física em aparelho.
- O arraste pelo toque ainda precisa ser conferido em iPhone/Android reais. A alternativa Escolher destino continua disponível.
- Dados e logins fictícios pertencem apenas à prévia e não fazem parte do ZIP. Integrações externas e IA paga continuam sem ativação.

Para executar: instalar dependências com `npm install`, configurar o ambiente conforme `.env.example` e usar `npm start`. As orientações de produção e segurança existentes continuam válidas.
