# Planos — 4.12.2

Valores mensais padrão: Essencial R$ 99; Profissional R$ 199; Grupo R$ 350.

O preço de cada porte é o mesmo para uma, duas ou três atividades. O produtor continua escolhendo quais atividades deseja usar; as permissões seguem essa escolha. Quantidade de fazendas e recursos de cada porte foram mantidos. Descontos por período seguem a regra existente.

Arquivos alterados: planos-atividades.json (21 combinações); server.js (valores de referência para compras antigas sem seleção); tests/subscription.test.cjs e tests/marketing.cjs (expectativas da tabela); package.json e package-lock.json (versão).

ACTIVITY_PRICES_JSON, quando definida no ambiente, tem prioridade sobre a tabela do arquivo e deve ser revisada na publicação. Contratos e assinaturas já criados no provedor de pagamentos não são renegociados automaticamente por esta alteração.

Mudança preparada localmente. Não publicada no GitHub nesta rodada.
