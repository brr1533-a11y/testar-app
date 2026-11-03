# Equipamentos e combustível — 4.9.1

Sistema completo baseado em 4.9.0. Sem publicação no GitHub.

- Visão geral: diesel disponível, saldo por fazenda, alerta configurado pelo CEO do grupo e gráfico dos últimos seis meses.
- Estoque e compras → Equipamentos: resumo dos tanques e gráfico. Na fazenda específica, botão Ficha de cada trator ou implemento abre os destaques, dados técnicos e histórico preservado.
- As fichas consultam o mesmo equipamento em todas as fazendas, preservando registros anteriores à transferência.
- Gráfico: soma litros de abastecimentos cadastrados em Manutenção/Abastecimentos, inclusive externos. Não soma novamente as entradas de reposição do tanque. Mês sem registro aparece com zero.
- Barras de saldo: comparação relativa entre fazendas; não indicam percentual da capacidade do tanque.
- Relação L/h: litros abastecidos divididos pelas horas apontadas no período comum. Fica sem dados quando não há base suficiente ou existem intervalos sobrepostos. Não equivale a consumo real medido.
- Horímetro/hodômetro: marcador informado, explicitamente identificado como h/km porque os registros antigos não distinguem a unidade.
- Manutenção: usa serviço, data e marcador já cadastrados; não inventa um prazo.

Arquivos novos: equipment-insights-domain.js (cálculos), equipment-insights.js (telas), equipment-insights.css (visual), tests/equipment-insights.test.cjs. Alterados app.html, server.js (liberação estática), campo-sw.js (cache), package.json e package-lock.json. Regras de acesso e gravações de combustível não foram alteradas. A IA permanece desligada na configuração de exemplo.
