# Levantamento do site — Gestão Rural (versão única)

Tudo o que existe no sistema hoje: as páginas públicas, o painel de cada perfil, o Super Admin, as rotas do servidor, as proteções e as configurações. A união da versão 23 com o V1 e a mão de obra da colheita estão em detalhe em `VERSAO-UNICA-E-ETAPA-1.md`.

## 0. Novidades da versão única

- **Vindas do V1:** Manutenção e combustível, Rastreabilidade dos lotes, Mapa da fazenda (croqui), Central de alertas, grupos do menu que recolhem, alçada de aprovação dos pedidos e entrada dos bezerros no lote pelo parto.
- **Mão de obra da colheita** (`maodeobra-domain.js` + `maodeobra.js`):
  - **Telas:** Pessoas, Valores por talhão, Lançamentos da semana e Fechamentos.
  - **Fechamento:** semanal, cria uma conta a pagar por pessoa e gera recibos.
  - **Apontar colheita:** tela do fiscal no celular.
    - O fiscal cadastra uma pessoa nova só com nome e função; aparece "Completar dados" para o CEO.
    - O fiscal pode apontar sem valor do saco; o fechamento da semana fica bloqueado até o valor ser definido.
- **Perfil "Fiscal de colheita":**
  - **Vê:** só Apontar colheita, Modo de campo e Perfil.
  - **Não recebe:** CPF, Pix, telefone nem valores.
- **Análises de solo e foliar** (`analise-solo-domain.js` + `analise-solo.js`).
- **Função travada no perfil:** o contribuinte não troca a própria função. Veja `PERFIL-FUNCAO-BLOQUEADA.md`.
- **Fazendas:**
  - **Sistema novo:** começa com uma fazenda vazia ("Minha Fazenda"), sem as 4 de exemplo.
  - **Limpar dados:** o CEO tem esse botão em Configurações › Fazendas.
    - **Confirmação:** pede o nome da fazenda e a senha do CEO.
    - **O que apaga:** o conteúdo da fazenda.
    - **O que mantém:** a fazenda, o nome e os usuários.
    - **Histórico:** fica registrado.
    - Não tem volta.

### Planos, preços e funções

### Planos, preços e funções
- **Preços** (por mês, em `planos-atividades.json`): Essencial de R$ 149 (só gado) a R$ 397 (as três); Profissional de R$ 397 a R$ 997; Grupo de R$ 597 a R$ 1.497. Descontos: trimestral 5%, semestral 10% e anual 20%, com o valor mensal arredondado para baixo (ex.: R$ 149 → R$ 141 → R$ 134 → R$ 119). O Grupo vai até 15 fazendas.
- **Funções por plano** (`plan-features.js`, aplicado na tela e no servidor):
  - **Todos:** visão geral, Mercado e Agenda, estoque e equipamentos, aviso de insumos acabando, contas a pagar e receber, resultados e custos, notas fiscais, Livro Caixa e os módulos de campo.
  - **Profissional e Grupo:** melhor cotação e preço automático, conciliação bancária, contratos de venda, pedidos de compra com aprovação, permissão por fazenda e atividade, histórico de alterações e visão consolidada.
  - **Só Grupo:** atendimento prioritário e implantação acompanhada (são serviços, não telas).
- **No Essencial o servidor:** não grava conciliação, cotações, contratos nem pedidos de compra; não envia o histórico de alterações; não faz a conferência automática de preços; e o contribuinte trabalha em todas as atividades contratadas.
- **Teste grátis:** 14 dias (`TRIAL_DAYS`, de 7 a 14) com as funções do Profissional, sem cartão e um por e-mail. Ao vencer, o acesso pausa. Na assinatura, "Já tenho um Grupo de teste" liga o pagamento ao mesmo Grupo e mantém os dados. Rota: `POST /api/public/trial`.

### Menu em grupos
| Grupo | Itens |
|---|---|
| Início | Visão geral · Mercado · Agenda · Central de alertas · Mapa da fazenda · Modo de campo |
| Lavoura (café/grãos) | Talhões (com a aba Histórico dos talhões) · Análises de solo e foliar · Safras e produção · Mão de obra da colheita · Apontar colheita · Pós-colheita · Rastreabilidade dos lotes · Pragas do café · Banho · Entregas |
| Pecuária (gado) | Rebanho e lotes · Desempenho e manejos · Reprodução e sanidade · Gado de leite · Movimentações · Etapas |
| Estoque e compras | Estoque · Compra de insumos · Equipamentos (com a aba Log de uso) · Manutenção e combustível |
| Financeiro e fiscal | Resumo financeiro · Lançar entradas e saídas · Contas a pagar e receber (com a aba Contas a receber) · Resultados e custos · Notas fiscais (com a aba Comprovantes) · Conciliação bancária · Contratos de venda · Pedidos de compra · Livro Caixa (LCDPR) |
| Configurações | Fazendas · Usuários · Assinatura · Histórico de alterações · Perfil |

A central "Gestão" saiu do menu. Código: `menu.js`.

### Módulos novos (`campo-domain.js` + `campo.js`; ficam em `farm.field`)
- **Pós-colheita do café:**
  - lote por talhão ou por dia, secagem (terreiro, secador ou misto, com umidade final), tulha e beneficiamento;
  - rendimento calculado: % do café em coco que vira beneficiado, sacas de 60 kg e litros por saca.
- **Pragas do café:**
  - monitoramento por talhão de broca, ferrugem, bicho-mineiro e cercosporiose;
  - alerta acima do nível de controle usual (3%, 5%, 30% e 10%), para o agrônomo confirmar.
- **Reprodução e sanidade:**
  - estação de monta, cobertura e IATF, diagnóstico de prenhez (com taxa de prenhez), parto e desmame;
  - calendário de vacinas com aviso de atraso;
  - registro das GTAs. GTA e vacina não podem ser apagadas.
- **Gado de leite:** vacas (em lactação, seca ou descarte) e ordenha por vaca, por lote ou do rebanho, com produção diária, média de 7 dias, litros por vaca e média de 30 dias por vaca.

### Livro Caixa Digital do Produtor Rural (`lcdpr.js`)
- **Formato:** gera o arquivo no leiaute 1.3 (código 0013) do Manual de Preenchimento da Receita, com os registros 0000, 0010, 0030, 0040, 0045, 0050, Q100, Q200 e 9999. Os valores vão em centavos, as datas como ddmmaaaa e os saldos são acumulados com natureza P/N.
- **De onde vêm os dados:**
  - os lançamentos saem do Financeiro;
  - cada fazenda cadastrada com CAFIR vira um imóvel;
  - em cada lançamento dá para informar o CPF/CNPJ do participante, o tipo e o número do documento e a conta.
- **Pendências:** a tela lista o que falta antes de entregar.
- **Transmissão:** o arquivo deve ser conferido e transmitido no programa oficial da Receita.
- **Quem vê:** os dados do produtor (CPF e endereço) ficam com o CEO, ou com o ADM que tiver a página liberada.

### App no celular e uso sem internet (Modo de campo)
- **Instalação:** o app instala na tela inicial do Android e do iPhone (`manifest.webmanifest`, ícones em `assets/`).
- **Telas sem internet:** o service worker (`/campo-sw.js`) guarda as telas, nunca os dados da API.
  - O servidor gera esse arquivo ao iniciar (`gerar-worker.cjs`), com a versão calculada pelos próprios arquivos.
  - Código novo gera cache novo e os celulares atualizam sozinhos, sem passo manual.
- **Cofre do aparelho:** os dados ficam num cofre cifrado com PIN (AES-GCM, `campo-offline.js`).
  - Sem sinal, o app abre com o PIN sem prazo de expiração offline.
  - O PIN não tem recuperação.
- **Ao voltar a internet:** se o cofre tem lançamentos guardados, o app pede o PIN ao abrir (até 3 tentativas), junta os lançamentos e envia.
- **Manter conectado neste aparelho:** caixa no login que só reage ao toque na própria caixa (`LOGIN-PERSISTENTE.md`).

## 1. Páginas públicas (sem login)

| Endereço | O que é |
|---|---|
| `/` e `/visao-geral` | Página inicial: apresenta o sistema, os planos e as atividades (café, gado e grãos). Mostra os preços quando eles estão configurados e leva à compra da assinatura. |
| `/cafe` | Página de venda do módulo Café: do grão à saca. |
| `/gado` | Página de venda do módulo Gado: lotes, pesagens e manejos. |
| `/graos` | Página de venda do módulo Grãos: soja, milho e trigo. |
| `/demo` | Vídeo de apresentação do painel (1 min 10 s, sem áudio, dados fictícios). |
| `/app` | Entrada do painel: login, pedido de cadastro, "esqueci a senha" e cadastro do Grupo depois da compra. |
| `/platform` | Login do Super Admin, que administra a plataforma. |

**Compra:**
- A pessoa escolhe o plano (Essencial, Profissional ou Grupo), o ciclo (mensal, trimestral, semestral ou anual) e as atividades (1, 2 ou 3).
- O pagamento é feito no Mercado Pago.
- Depois do pagamento, ela cria o Grupo e o usuário CEO.

## 2. Painel (`/app`), por perfil

No topo ficam o **seletor de fazenda** e o **seletor de atividade**. O seletor de fazenda tem também a "Visão geral", que junta todas as fazendas. O seletor de atividade alterna entre café, gado e grãos. O menu muda conforme a atividade escolhida.

### CEO (dono do Grupo): vê e faz tudo
| Menu | O que faz |
|---|---|
| Visão geral | Resumo da fazenda ou do Grupo: indicadores, gráficos e alertas. |
| Mercado | Ao vivo, atualizado a cada 30 s. **Café:** arábica na bolsa de Nova York (ICE), contratos futuros, variação do dia e R$/saca. **Gado:** arroba do boi gordo na praça regional (`MARKET_UF`, padrão MG) e CEPEA/Esalq SP, vaca gorda, bezerro, e Live/Feeder Cattle convertidos para R$/@. **Grãos:** soja e milho no físico brasileiro (CEPEA/Esalq), soja, milho e trigo em Chicago convertidos para R$/saca de 60 kg. Também mostra o dólar. Fontes: Yahoo Finance (bolsas, até 10 min de atraso) e AgroDoc AI (físico, CEPEA/Esalq, lido a cada 30 min) . |
| Agenda | Tarefas planejadas por fazenda e atividade. |
| Resultados e custos | Resultado da safra/lote: receita, custos e margem. |
| Safras e produção (café/grãos) | Safras, colheitas, vendas, qualidades e pesos de saca configuráveis. |
| Histórico dos talhões | Linha do tempo de cada talhão: safras, atividades e colheitas. |
| Equipamentos | Tratores e implementos, ocupação e manutenção. |
| Talhões | Cadastro dos talhões, com área e cultura. |
| Banho (café) | Produtos e ordens de banho, com baixa automática no estoque. |
| Entregas (café/grãos) | Entregas da produção vendida. |
| Contas a receber (café/grãos) | Parcelas das vendas a receber. |
| Gado / Desempenho e manejos / Movimentações / Etapas do gado (gado) | Pastos, lotes, pesagens, sanidade, ganho de peso, projeções, entradas e saídas de animais, e etapas configuráveis. |
| Estoque | Itens com quantidade, mínimo, custo e movimentações. |
| **Compra de insumos** | O que está acabando, a melhor cotação, o último preço pago em NF-e, links de busca, pedido de compra e **preço que se atualiza sozinho** (veja a seção 3). |
| **Gestão** | Central com: **Financeiro** (contas a pagar e receber, custos e rateios), **Fiscal** (NF-e e MDF-e, importação de XML), **Conciliação bancária** (importa OFX/CSV e casa com o Financeiro), **Contratos de venda** (comprador, quantidade, preço e entregas) e **Pedidos de compra** (aprovação interna). |
| Balanço financeiro | Entradas, saídas e saldo; detalhes de entradas e de gastos. |
| Notas fiscais | Notas e comprovantes anexados. |
| Pagamentos | Assinatura do Grupo: plano, ciclo e pedido de troca de plano. |
| Fazendas | Criar, renomear e configurar fazendas, dentro do limite do plano; limpar os dados de uma fazenda (com senha e nome). |
| Usuários | Criar usuários, aprovar ou recusar pedidos de cadastro, definir senha temporária e limitar cada usuário por fazenda e atividade. |
| Log equipamentos | Registro de uso de tratores e implementos. |
| Histórico de alterações | Auditoria: quem mudou o quê e quando (inclui as mudanças de preço feitas pelo monitor). |
| Perfil | Dados pessoais, e-mail, troca de senha e "sair dos outros aparelhos". |

### ADM (administrador da fazenda) — páginas configuradas pelo CEO
O CEO escolhe as páginas do cargo ADM em **Usuários > Permissões do ADM** (no fim da página). A escolha vale para todos os ADMs do Grupo e registra quem mudou e quando.
- **Padrão:** Visão geral, Mercado, Agenda, Resultados e custos, Safras e produção, Histórico dos talhões, Equipamentos, Banho, Entregas, Gado, Desempenho e manejos, Movimentações, Estoque, Compra de insumos, Pedidos de compra, Lançar entradas/saídas, Notas fiscais e Fiscal.
- **Pode liberar também:** Cadastro de talhões, Log de equipamentos, Histórico de alterações e as páginas que **mostram valores**: Balanço financeiro, Contas a receber, Contas a pagar e rateios, Conciliação bancária e Contratos de venda. Liberar uma página de valores faz o ADM ver o balanço, os preços de venda e os custos, e o sistema pede confirmação.
- **Pode tirar:** qualquer página do padrão. O Perfil fica sempre.
- **Nunca do ADM:** Usuários, Fazendas, Pagamentos (assinatura) e Etapas do gado. Aprovar pedidos de compra continua com o CEO.
- **No servidor:** página tirada some do menu, e o servidor descarta o que o ADM tentar mudar nela (por exemplo, o estoque volta ao valor gravado). Sem página de valores liberada, o servidor não envia o balanço, o preço de venda nem o custo planejado ao ADM, e repõe esses valores quando ele grava. O ADM não consegue mudar as próprias permissões. Código: `adm-access.js` (regras) e `adm-acesso.js` (tela); testes em `tests/adm-permissoes.test.cjs`.

### Contribuinte (funcionário de campo)
- **Café e grãos:** Meu trabalho hoje, Safras e colheitas, Banhos liberados (só para tratorista), Equipamentos disponíveis, Meus comprovantes, Modo de campo e Perfil.
- **Fiscal de colheita:** só Apontar colheita, Modo de campo e Perfil.
- **Gado:** Gado (só leitura), Meus comprovantes e Perfil.
- **O que ele pode gravar:** só o trabalho do dia e os logs, e só como acréscimo. Ele não apaga nem altera o que outra pessoa lançou.

## 3. Compra de insumos: preço sempre atualizado (novo)

**Cada cotação guarda:**
- fornecedor e canal (Site, WhatsApp, Telefone, Visita ou E-mail);
- preço, unidade, quantidade, frete e validade;
- link da oferta e WhatsApp do fornecedor;
- histórico de preços.

**Cotação com link do site:**
- O servidor confere o preço da página sozinho a cada `PRICE_WATCH_HOURS` (padrão: 6 h).
- Ele lê o preço do jeito padrão que as lojas publicam: dados de produto schema.org, `product:price:amount` / `og:price:amount` e `itemprop="price"`. Só aceita preço em reais.
- Se o preço mudou, a cotação é atualizada, o histórico ganha uma linha e a tela mostra **▲ subiu** ou **▼ caiu**, com a diferença.
- Se o preço mudou mais de 60%, ele **não** é trocado sozinho. A tela mostra "Site mostra R$ X: confira", porque pode ser outro produto ou outra embalagem.
- Se a página não informa o preço de um jeito legível, ou se o site bloqueia robôs (o Mercado Livre e algumas lojas grandes fazem isso), aparece "Site não conferido". Aí é preciso atualizar à mão.
- O botão **"Conferir preços agora"** confere na hora. Ele é limitado a 6 pedidos a cada 10 minutos por Grupo.

**Cotação por WhatsApp ou telefone:**
- Não existe página para o sistema ler.
- Depois de 7 dias, a cotação aparece como **"Preço de N dias: peça de novo"**.
- O botão **"Pedir preço no WhatsApp"** abre a conversa com o fornecedor com a pergunta pronta.
- Quando ele responder, use **"Preço novo"**: o valor entra no histórico e a tela mostra se subiu ou caiu.
- Ler as mensagens do WhatsApp sozinho exigiria a API oficial do WhatsApp Business, com conta, número e custos próprios.

**Segurança da leitura de sites:**
- O servidor abre endereços digitados por usuários, então ele aceita só `https` na porta 443 e recusa link com usuário/senha.
- Ele recusa endereços da rede interna (localhost, 10.x, 192.168.x, 169.254.x, IPv6 local etc.). Essa conferência vale também depois da consulta DNS e em cada redirecionamento, e a conexão vai exatamente para o endereço conferido.
- Cada conferência tem tempo máximo de 8 s, página de até 1,5 MB e no máximo 3 redirecionamentos.
- O histórico e o resultado da conferência são gravados só pelo servidor: o navegador não consegue inventar nem apagar esses dados.

## 4. Super Admin (`/platform`)
- Login próprio, com 2FA por e-mail opcional (`PLATFORM_REQUIRE_2FA`).
- Lista de Grupos: criar, ativar ou suspender, trocar plano, trocar atividades contratadas, definir uma senha temporária para o CEO, arquivar e excluir.
- Auditoria da plataforma.

## 5. Rotas do servidor (API)

- **Público:**
  - `GET /api/health`
  - `GET /api/public/config`
  - `POST /api/public/checkout`
  - `GET /api/public/purchases/:id/status`
  - `POST /api/public/purchases/:id/onboard`
  - `POST /api/public/trial`
  - `GET /api/mercado`
  - `GET /api/cotacao-cafe`
- **Webhook:** `POST /api/webhooks/mercadopago`, com assinatura HMAC conferida.
- **Login:**
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `POST /api/auth/logout-others`
  - `POST /api/auth/change-password`
  - `POST /api/auth/password-reset/request`
  - `POST /api/auth/password-reset/confirm`
  - `POST /api/auth/register-request`
- **Dados do Grupo:**
  - `GET /api/state`
  - `PUT /api/state` (com `baseRev`)
  - `POST /api/state/import-local`
- **Arquivos:**
  - `POST /api/files`
  - `GET /api/files/:id`
- **Usuários e cadastros:**
  - `POST /api/users`
  - `PATCH /api/users/:id/password`
  - `POST /api/registrations/:id/approve`
  - `POST /api/registrations/:id/reject`
- **Conta:**
  - `GET /api/account`
  - `PATCH /api/account/email`
  - `POST /api/account/plan-request`
  - `DELETE /api/account/plan-request`
- **Preços:** `POST /api/precos/conferir` (CEO/ADM).
- **Fazendas:** `POST /api/farms/:id/reset` (só CEO, com senha e nome da fazenda; 5 por hora).
- **App de campo:** `GET /campo-sw.js` (service worker gerado pelo servidor, sem cache).
- **Super Admin:**
  - `POST /api/platform/auth/login`
  - `POST /api/platform/auth/verify`
  - `POST /api/platform/auth/logout`
  - `GET /api/platform/groups`
  - `POST /api/platform/groups`
  - `PATCH /api/platform/groups/:id/status`
  - `PATCH /api/platform/groups/:id/plan`
  - `PATCH /api/platform/groups/:id/activities`
  - `PATCH /api/platform/groups/:id/ceo-password`
  - `POST /api/platform/groups/:id/archive`
  - `DELETE /api/platform/groups/:id`
  - `GET /api/platform/audit`

## 6. Proteções que já existem
- **Cabeçalhos de segurança:** CSP, `nosniff`, `X-Frame-Options`, HSTS em produção e `no-store` na API.
- **Arquivos públicos:** só os arquivos de uma lista fechada são servidos. O código do servidor, o `.env` e o banco nunca são entregues.
- **Limites de tentativas:**
  - login por usuário+IP, por IP e por conta;
  - cadastro, recuperação de senha e checkout;
  - conferência de preços.
- **Senhas:** bcrypt; troca obrigatória de senha fraca, vazada ou temporária.
- **Sessões:** sessões que vencem e são limpas de hora em hora.
- **Gravações:** controle de versão (`baseRev`), em que duas pessoas salvando ao mesmo tempo não apagam o trabalho uma da outra, e alterações do servidor com nova tentativa (`mutateGroup`).
- **Permissões refeitas no servidor:**
  - por perfil (CEO, ADM ou contribuinte);
  - por fazenda e atividade do usuário;
  - por atividades contratadas na assinatura.
- **Registros que não somem:** registros fiscais, de extrato, contratos e diário de talhão não podem ser apagados nem adulterados.
- **Mercado Pago:** assinatura do webhook conferida.
- **Modo de compra de teste:** com prazo, e desligado sozinho em produção.
- **Exportação CSV:** protegida contra fórmulas maliciosas.
- **Anexos:** abertos em sandbox.

## 7. Configurações (variáveis de ambiente) principais
- **Produção:**
  - `DATABASE_URL`
  - `PUBLIC_BASE_URL`
  - `SEED_CEO_*`
  - `PLATFORM_ADMIN_EMAIL` e `PLATFORM_ADMIN_PASSWORD`
  - `TRUST_PROXY`
- **Mercado Pago:** `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PLAN_ID` e `MERCADOPAGO_WEBHOOK_SECRET`.
- **E-mail:** `RESEND_API_KEY` e `PASSWORD_RESET_FROM`.
- **Preços das atividades:** `ACTIVITY_PRICES_JSON` (ou `planos-atividades.json`).
- **Monitor de preços:** `PRICE_WATCH_HOURS` (padrão 6; `0` desliga).
- **Teste grátis:** `TRIAL_DAYS` (7 a 14, padrão 14).
- **Mercado:** `MARKET_UF` (estado da praça do boi gordo, padrão `MG`).
- **Modo de teste:** `TEST_PURCHASE_MODE`, `ALLOW_TEST_MODE_IN_PRODUCTION` e `TEST_MODE_UNTIL`.

## 8. Testes automáticos
`npm test` (ou `node --test tests/*.test.cjs`) roda **82 testes**. Os testes ficam só na pasta `tests/`; os roteiros de navegador (`tests/*-browser.cjs`) precisam do Playwright. Eles cobrem:
- domínio rural, safras e talhões;
- gado;
- assinatura;
- gestão;
- segurança (senhas, gravações ao mesmo tempo, webhook e ADM);
- o monitor de preços (leitura do preço, bloqueio de rede interna, histórico e WhatsApp);
- as permissões do ADM (liberar e tirar páginas, valores escondidos e mudanças descartadas);
- funções por plano, tabela de preços, teste grátis, módulos de campo e o arquivo do LCDPR;
- as partes vindas do V1 (rastreabilidade, manutenção, mapa, parto e alçada);
- a mão de obra da colheita (fechamento, saldo devedor, valor congelado, semana travada, fiscal sem dados pessoais, pessoa cadastrada pelo fiscal e apontamento sem valor);
- limpar dados da fazenda e o service worker gerado pelo servidor.
