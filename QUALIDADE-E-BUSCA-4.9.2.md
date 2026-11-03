# Qualidade, busca e textos — 4.9.2

Base: sistema completo 4.9.1. Sem publicação no GitHub.

- Lavoura → Safras e produção → Qualidade e resultado: Perfil de qualidade com barras de Especial, COC 01 a 04, COC 05 a 08 e demais qualidades. Café não classificado aparece separado. Percentuais ponderados pelos kg de toda a colheita; detalhes individuais e índice ponderado continuam disponíveis no painel recolhível. Grãos mantêm sua distribuição por umidade.
- Consumo de diesel: título e subtítulo simplificados, mantendo a explicação de que os dados são litros abastecidos.
- Botão Ver mais detalhado: tabela de todas as qualidades cadastradas, inclusive sem produção, com participação, sacas e kg. A conversão considera o peso de saca de cada safra; café sem classificação permanece separado.
- Mais opções: busca entre o título e as categorias, sem distinguir maiúsculas ou acentos. Pesquisa nomes das telas e categorias que já estão disponíveis ao usuário. Abre resultados, informa ausência, permite limpar e restaura a abertura inicial das categorias ao limpar. Não concede novas permissões.

Arquivos alterados: operacao-domain.js (agrupamento para apresentação), safra-painel.js (barras), equipment-insights.js (título), visual-painel.css e visual-painel.js (busca e estilos), app.js (ativa busca ao abrir menu), campo-sw.js (versão do cache), package.json e package-lock.json (4.9.2). Testes novos em tests/quality-bands.test.cjs.
