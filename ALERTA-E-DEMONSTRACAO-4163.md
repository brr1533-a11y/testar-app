# Alerta e demonstração — 4.16.3

- `equipment-insights.css`: borda completa de 1 px nos alertas, mantendo 4 px na lateral de aviso. Remove apenas os pontos visuais do gráfico de combustível; preserva linha, resumo e outros gráficos.
- `package.json`, `package-lock.json`, `campo-sw.js`: versão e cache atualizados.

Conferência no navegador: fundo do alerta rgb(32,43,41), borda superior 1 px e lateral 4 px; grupo de pontos com display:none. Nenhuma alteração de regra ou permissão. Suíte de 318 testes passou na base 4.16.2.

Demonstração local isolada, com dados fictícios:

- Safras, colheitas e vendas de café e soja em 2024, 2025 e 2026.
- 210 lançamentos financeiros e 68 tarefas por fazenda.
- 34 registros mensais de chuva e uso das máquinas por fazenda; revisões anuais e implementos.
- Lotes, piquetes e pesagens do gado no período.
- Mantidos os 36 meses de combustível, 144 abastecimentos e saldos de 286 L e 28 L.

Os exemplos ficam na prévia local, separados do banco real. Este ZIP não insere dados fictícios em produção. Não publicado no GitHub.
