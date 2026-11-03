# Melhorias de café, grãos e gado — 4.10.0

Sistema completo baseado na versão 4.9.2. Não publicado no GitHub/Render. Dados de demonstração não estão incluídos no ZIP.

## Onde encontrar

- **Café → Safras e produção → Qualidade e resultado:** comparativo de qualidade por talhão, Rastrear um lote de café e Conferir fechamento da colheita. O rastreio reúne talhão, colheita, código do lote, manejos com o mesmo código e depósitos vinculados à colheita. Vendas da safra e transferências de qualidade são apresentadas como informações compartilhadas, sem afirmar rastreabilidade individual inexistente.
- **Resultados e custos:** comparativo de talhões com sacas/ha, custos operacionais/ha e por saca; CEO vê também vendas menos custos por hectare. Não há rateio inventado para safras compartilhadas. Sem área/vínculo, o valor correspondente fica pendente.
- **Café → Conferir fechamento da colheita:** produção, última posição de café caído/levantado por talhão, custos operacionais vinculados e apontamentos de mão de obra por talhão e período. É uma conferência, sem travar ou encerrar a safra, gerar pagamento ou duplicar produção/custos. Registros de mão de obra podem se sobrepor a safras que usam o mesmo talhão no mesmo período; o painel explica essa limitação.
- **Grãos → Safras e produção:** produção colhida, vendas, saldo comercial e compromissos contratuais ainda a entregar. Contratos sem safra não entram. Reservas e vendas são mantidas separadas porque não há vínculo único entre os dois cadastros, evitando dupla subtração.
- **Grãos → Entregas → Conferir entrega:** peso na saída, recebido, desconto manual em kg, umidade, impurezas, desconto financeiro e romaneio. Peso aceito = recebido − desconto em kg. Diferença de balanças não prova perda física. Umidade e impurezas não geram descontos automáticos; nenhum estoque/caixa é baixado novamente. O servidor valida e preserva a entrega confirmada.
- **Gado → Rebanho e lotes:** alertas de pesagem antiga, ganho diário baixo e tarefas vencidas; ajuste de referências para esta consulta. Não é prescrição zootécnica.
- **Gado → Rebanho e lotes → Simular venda (CEO):** preço/@, base viva ou carcaça, rendimento e despesas adicionais. A simulação informa a data da pesagem e as cabeças atuais, aplica o rendimento apenas uma vez e desconta custos operacionais vinculados mais os adicionais. Despesas não vinculadas não são presumidas. Não grava venda nem altera contas.
- **Gado → Rebanho e lotes → Consultar animal pelo brinco:** busca por brinco/nome e histórico individual por ID, sem misturar animais de mesmo nome. Os cadastros completos permanecem em Animais.

## Arquivos

- Novos `decisoes-domain.js`, `decisoes.js`, `decisoes.css` e `tests/decisoes.test.cjs`.
- `operacao-domain.js`: validação da conferência de grãos e correção do total de talhões no progresso por atividade.
- `app.html`, `server.js`: carga e liberação dos três recursos estáticos.
- `campo-sw.js`: cache atualizado; o servidor continua gerando a versão pelos arquivos.
- `package.json` e `package-lock.json`: 4.10.0.

Os valores financeiros adicionais são exibidos somente ao CEO nas novas consultas. O ADM continua usando as páginas e os dados já liberados pelo servidor. Não há integrações externas novas ou chamadas pagas. IA permanece desligada no exemplo.
