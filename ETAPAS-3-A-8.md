# Gestão Rural — etapas 3 a 8, versão local

Esta entrega parte do ZIP `gestao-rural-etapa2.zip`. Não houve envio ao GitHub nem publicação no Render. O código mantém Node + Express, telas sem build e os armazenamentos JSON local/PostgreSQL existentes. Os dados novos ficam em `farm.expansion`; não há migração que apague registros anteriores.

## O que está disponível

| Etapa | No painel | Situação |
| --- | --- | --- |
| 3 — Fiscal | Financeiro e fiscal › Emissão e busca de NF-e; rascunhos com itens, destinatário, CFOP, GTA e campos IBS/CBS; classificação das compras por produto, princípio ativo, embalagem e região | Cadastro local pronto. Transmissão e distribuição SEFAZ desligadas, aguardando provedor/certificado e homologação. Importação XML já existente preservada e com metadados adicionais. |
| 4 — Custo por unidade | Financeiro e fiscal › Custo por unidade; rateios percentuais por safra, lote ou leite; custo/saca, custo/ha, custo/@ e custo/L; comparação também na tela Mercado | Usa os lançamentos vinculados, respeita peso da saca e base/rendimento da arroba. Mostra custos sem rateio; não considera que ausência de custo significa que todos os gastos foram registrados. |
| 5 — Comercialização | Financeiro e fiscal › Posição de comercialização | Previsão, colhido, vendido, disponível, preço médio, cobertura dos custos e simulação limitada ao saldo colhido. Preços-alvo de café, grãos e arroba; avisos de preço exigem referência recente. |
| 6 — Orçamento | Lavoura › Orçamento de safra | Categorias de insumos, operações, mão de obra, máquinas, fixos e outros; cópia do orçamento/custos anteriores; orçado, realizado, desvio e equilíbrio em sc/ha. |
| 7 — Campo | Início › App de campo e ordens de serviço | Abastecimento com medidor, pragas do café, pesagem, ordenha, atividade geral; ordens do gerente e andamento pelo responsável. Chuva fica em Chuva e clima. Usa o cofre e a sincronização existentes. |
| 7 — Café | Lavoura › Café em armazéns | Depósitos, cooperativas/armazéns, número do depósito, transferências e saldos por qualidade/local. Entrada vinculada à colheita e saída à venda; bloqueio de saldo negativo. |
| 7 — Leite | Pecuária › Qualidade e pagamento do leite | CCS, CBT, gordura, proteína e conferência manual do demonstrativo do laticínio. Produção em descarte fica fora do volume liberado e do cálculo de custo/L. |
| 7 — Pasto | Pecuária › Ocupação e suplementação | Ocupação, descanso, UA/ha e suplementação/custo por cabeça/dia registrado. Evita ocupações simultâneas para o mesmo lote ou piquete. |
| 7 — Clima | Início › Chuva e clima | Pluviômetro geral ou por talhão, acumulados 7/30/90 dias. Não soma estações diferentes no acumulado geral. Previsão externa desligada. |
| 7 — Documentos | Configurações › Documentos e vencimentos | CAR, CCIR, ITR, licença, CNH, NR-31, máquinas e outros; anexos e avisos nas faixas de 30/15/7 dias e vencidos. |
| 7 — Certificações | Lavoura › Certificações e caderno de campo | Checklist interno 4C/Certifica Minas e exportação CSV do caderno. É preparação documental interna, não emissão de certificado. |
| 7 — Equipe | Lavoura › Mão de obra o ano todo | Diaristas e fixos, valores congelados nos apontamentos e contas a pagar geradas uma vez. Não duplica o custo ao pagar a conta. A colheita da Etapa 2 permanece separada. |
| 7 — Avisos | Configurações › Notificações | Consulta de avisos no painel e preferências próprias por usuário/fazenda. Push preparado e desligado por padrão. WhatsApp aguardando adaptador. |
| 8 — Comparador | Estoque e compras › Preços da região | Consulta agregada 30/60/90 dias, por região/produto/princípio ativo/unidade. Consentimento obrigatório e mínimo de três fazendas de três grupos. Só notas verificadas no servidor; sem elas aparece “dados insuficientes”. |
| 8 — Contador | Configurações › Acesso do contador; portal `/contador` | Convites por fazendas selecionadas, conta separada, consulta/exportação JSON e CSV e revogação imediata. Não permite editar o painel. |
| 8 — Implantação | Configurações › Implantação e importação | Modelos CSV de talhões/estoque com prévia e confirmação. Roteiros café + leite e café + corte preparam talhão, safra e piquete com dados informados, sem inventar animais ou produção. |

## Como executar e conferir

1. Extraia o ZIP em uma pasta nova. Para atualizar uma instalação, faça cópia do banco/arquivos antes e preserve seu `.env`, `.local-cloud.json` e `.local-files` — eles não vêm neste pacote.
2. No terminal, dentro da pasta que contém `package.json`, execute `npm.cmd ci` e depois `npm.cmd start`. Não há etapa de build.
3. Configure senhas e demais variáveis diretamente no ambiente da instalação, seguindo `.env.example` e `CHECKLIST-PRODUCAO.md`. Não reutilize senhas de documentação antiga.
4. Entre em `/app` com um usuário existente. Selecione uma fazenda específica e a atividade; os cadastros novos não são feitos na visão geral de várias fazendas.
5. Como CEO, abra Usuários › Permissões do ADM para liberar as telas desejadas. Páginas novas de dinheiro ficam desmarcadas por padrão. O fiscal de colheita mantém o menu restrito anterior.
6. Defina os rateios antes de interpretar custo por unidade. Abastecimento enviado pelo campo precisa de conferência do preço pelo escritório para entrar no custo.
7. Em Implantação, cadastre município/UF; a participação no comparador fica desmarcada até o CEO consentir.

Os rascunhos fiscais **não são notas autorizadas**, não têm DANFE válido e não são transmitidos enquanto não houver adaptador homologado. Campos IBS/CBS não substituem a apuração e a conferência fiscal. Veja `INTEGRACOES-ETAPAS.md`.

## Permissões e preservação

- A assinatura continua limitando atividades no servidor. Café, gado e grãos mantêm seus temas e dados separados.
- Região da fazenda e preferências de aviso são gerais, disponíveis ao trocar de atividade. Preferências só podem ser lidas/editadas pelo próprio usuário.
- O funcionário vê apenas sua fazenda, suas ordens e os registros de campo de seu acesso. O servidor atribui autor/data e preserva registros confirmados.
- Permitir custo ao ADM libera os dados necessários para calcular o custo. Isso não libera edição de contas ou salários quando suas páginas de origem não foram autorizadas.
- O contador só exporta as fazendas de vínculos ativos. Seu token não funciona nas APIs de escrita do painel.
- O cofre offline continua sem prazo de expiração, protegido pelo PIN. Serviços externos e a primeira habilitação exigem conexão. Não houve limpeza de grupos ou dados operacionais nesta entrega.

## Arquivos novos

| Arquivo | Motivo |
| --- | --- |
| `expansao-domain.js` | Regras, validação, permissões, cálculos, históricos e preparação/projeção das etapas 3–8. |
| `expansao-server.js` | Rotas das integrações, comparador, avisos e portal do contador. |
| `integracoes-etapas.js` | Registro isolado dos adaptadores fiscal, clima e WhatsApp, inicialmente desligados. |
| `expansao.js`, `expansao.css` | Menu, telas, formulários, detalhamento e ações dos módulos novos, no tema da atividade. |
| `implantacao-domain.js` | Leitura/validação CSV, prévia e modelos sem sobrescrever a fazenda. |
| `contador.html`, `contador.js` | Portal de consulta e exportação do contador, com identidade própria. |
| `tests/expansao.test.cjs` | Cálculos, validações, referência de mercado, preservação e isolamento dos dados. |
| `tests/expansao-api.test.cjs` | Persistência, permissões, integrações desligadas, push e revogação do contador. |
| `tests/expansao-browser.cjs` | Navegação e formulários, tela móvel e cofre offline com reabertura/sincronização. |
| `ETAPAS-3-A-8.md`, `INTEGRACOES-ETAPAS.md`, `VALIDACAO-ETAPAS.md`, `ALTERACOES-ETAPAS.json` | Guia da entrega, pendências externas, evidências de teste e inventário de alterações. |

## Arquivos alterados

| Arquivo | Motivo |
| --- | --- |
| `server.js` | Conectar validações/projeções novas, carência dos lançamentos de campo, anexos, auditoria e rotas, preservando o fluxo da Etapa 2. |
| `adm-access.js` | Cadastrar páginas novas nas permissões do ADM; dinheiro desmarcado por padrão. |
| `app.html`, `app.js` | Carregar os módulos e conectar as páginas ao roteamento existente. |
| `gestao-domain.js`, `gestao.js` | Reter código de produto, NCM, CFOP e região na importação XML para classificação posterior. |
| `gerar-worker.cjs`, `campo-sw.js` | Incluir arquivos novos no app offline e tratar notificações push/cliques com destino fixo em `/app`. |
| `package.json`, `package-lock.json` | Dependência `web-push` e comandos específicos de teste. |
| `.env.example` | Documentar variáveis opcionais, todas as novas integrações desligadas por padrão. |

O inventário JSON inclui o SHA-256 de cada arquivo modificado ou acrescentado em relação ao ZIP da Etapa 2, exceto o próprio inventário.
