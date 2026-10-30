# Validação da entrega local — 30/10/2026

## Executado

- `npm test`: **122 testes aprovados, zero falhas**, incluindo os 101 testes da Etapa 2 e os testes novos das etapas 3–8.
- `node tests/expansao-browser.cjs`: aprovado em Chromium, com navegação nas atividades Café/Gado/Grãos, formulários de equipe, apontamentos, orçamento, rascunho fiscal e registros de campo. Tela de 390 × 844 sem transbordamento horizontal da página.
- Offline: habilitar cofre com PIN, lançar sem conexão, guardar no cofre cifrado, recarregar o app sem internet, abrir novamente com PIN e sincronizar ao reconectar: aprovado.
- `node tests/piscada-browser.cjs`: aprovado. Sincronizações idênticas e alterações só de metadados preservam o DOM; mudanças reais atualizam sem animação; edição aberta não é apagada.
- Instalação limpa das dependências de produção: `npm ci --omit=dev --ignore-scripts --no-audit --no-fund`: aprovado. Carregamento da biblioteca `web-push` conferido.
- Sintaxe dos arquivos alterados e geração do service worker: conferidas. O worker inclui os módulos novos, mantém APIs fora do cache e trata cliques de notificação apenas em `/app`.

## Casos cobertos pelos testes novos

- Rateio com preservação dos centavos e bloqueio acima de 100%; custos por peso configurado da saca, hectare, arroba e litro; proteção contra duplicação de pagamento.
- Simulação limitada ao volume disponível; previsão separada da produção real; cobertura do custo e orçamento por categoria.
- Saldos de café por local/qualidade, origem da colheita, transferência e bloqueio de retirada excessiva.
- Carência do leite mantida nos lançamentos de campo, exclusão do descarte, pesagem e pragas projetadas uma vez nos módulos existentes.
- Ocupações de piquete sem sobreposição; cálculo de UA/ha e descanso; pluviômetros separados e avisos de documentos.
- Apontamento anual com valor congelado e conta única; registros confirmados preservados; gravação sem mudança não altera metadados.
- ADM com dinheiro bloqueado, permissão apenas de consulta de custo sem liberar edição de salários/contas; autor atribuído pelo servidor e funcionário restrito à fazenda/atividade.
- Região e preferências gerais preservadas ao mudar a atividade contratada.
- Comparador com consentimento, verificação da compra, mínimo de participantes e retorno sem identidades.
- Convite do contador, aceite único, login, exportação autorizada, bloqueio de outra fazenda, bloqueio de escrita e revogação imediata.
- Serviços fiscal/clima desligados retornando indisponibilidade explícita; versão pública do comparador desligada.
- Push com assinatura de teste: destinos locais, HTTP, portas e hosts não permitidos rejeitados; autorização e cancelamento do aparelho sem disparar mensagens reais.
- Importação CSV com prévia, números pt-BR, aspas, validação das colunas e preservação dos cadastros; modelos sem rebanho/produção inventados.
- Alerta de preço descartando referência antiga ou marcada como desatualizada; último andamento da ordem respeitado.

## Ainda depende do ambiente/aparelho

- Não houve publicação, mudança no GitHub, teste em banco PostgreSQL de produção ou operação sobre os dados reais dos grupos.
- Android e iPhone físicos ainda precisam ser testados com HTTPS, instalação pela Tela de Início, modo avião e permissões de notificação. O teste automatizado usa Chromium com viewport móvel, não um Safari de iPhone real.
- Não houve emissão/busca real na SEFAZ, certificação 4C/Certifica Minas, consulta de previsão por novo provedor nem envio real de push/WhatsApp. Esses serviços estão desligados ou aguardam configuração/homologação, conforme `INTEGRACOES-ETAPAS.md`.

Os testes criam dados e credenciais aleatórios em pastas temporárias isoladas, removidas ao terminar. O ZIP não contém banco operacional, `.env` real ou `node_modules`.
