# Combustível — 4.16.2

- `equipment-insights-domain.js`: histórico mensal de até 36 meses, com soma de litros e valores por preço informado. Exclui registros anulados/arquivados e datas inválidas. Não soma reposições do tanque ao total abastecido.
- `equipment-insights.js`: filtros de 6/12/36 meses e resumo anual. Valores financeiros exibidos somente ao CEO. Aplica o contexto da fazenda ou a visão geral já selecionada.
- `equipment-insights.css`: alerta de combustível usa o mesmo fundo dos cartões, com texto legível e borda de aviso preservada. Estilos do filtro e da tabela.
- `tests/equipment-insights.test.cjs`: testa janela de 36 meses, custos, exclusão de registros inválidos e limites do período.
- `package.json`, `package-lock.json` e `campo-sw.js`: versão e cache atualizados.

318 testes passaram. Conferência no navegador: trocar de 36 para 12 meses e voltar, consolidar fazendas e comparar a cor do alerta com a de um cartão (ambos rgb(32,43,41) no tema escuro).

Demonstração local separada: 36 meses de dezembro/2023 a novembro/2026, 144 abastecimentos fictícios em duas fazendas. Saldos finais 286 L e 28 L, limite 40 L. Dados fictícios não são inseridos em grupos reais pelo código do aplicativo. O JSON de exemplo fica separado no diretório de outputs do trabalho. Não publicado no GitHub.
