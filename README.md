# Gestão Rural v22 — Produção e Segurança

> **Segurança:** as correções da revisão da v22 estão aplicadas nesta versão. Veja `SEGURANCA.md` (o que mudou e o que fazer no Render) e `CHECKLIST-PRODUCAO.md`. Testes: `tests/seguranca.test.cjs`.

## Gestão da fazenda e compra de insumos

No painel, o CEO e o ADM têm duas entradas novas no menu: **Gestão** e **Compra de insumos**.

Financeiro, fiscal, conciliação bancária e contratos de venda são ferramentas de gestão: servem para organizar o dinheiro, as notas e as vendas da fazenda, não para comprar insumos.

- **Financeiro:** contas a pagar e receber, custos e rateios. Contas a pagar com vencimento e rateio opcional para safra ou lote; ao marcar como paga, a saída é lançada uma vez no Financeiro. Atalhos para Contas a receber, Custos e rateios e Balanço. Só o CEO.
- **Fiscal:** emitir e receber notas fiscais (NF-e e MDF-e). Importa o XML das NF-e recebidas (emitente, chave, itens e preços) e registra as NF-e emitidas e os MDF-e de transporte. A emissão e a transmissão oficiais à SEFAZ continuam no emissor autorizado, com o certificado digital da fazenda; aqui as notas ficam organizadas. Documento registrado não é apagado: pode ser marcado como cancelado, com motivo. CEO e ADM.
- **Conciliação bancária:** conferir se os lançamentos batem com o extrato do banco. Importa extrato OFX ou CSV (data;descrição;valor), sugere o lançamento do Financeiro com o mesmo valor e data até 3 dias, e mostra o que ficou pendente. Só o CEO.
- **Contratos de venda:** registrar a venda da produção para o comprador e controlar as entregas (romaneios), com saldo a entregar e aviso de entrega atrasada. Recebimentos continuam em Contas a receber. Só o CEO.
- **Pedidos de compra:** organizar e aprovar internamente o que a fazenda vai comprar, não comprar pelo sistema. O ADM pede, só o CEO aprova ou recusa; ao marcar "Recebido", a quantidade entra no estoque uma única vez.
- **Compra de insumos:** lista os itens do estoque zerados, abaixo do mínimo ou perto dele (até 25% acima), com a melhor cotação registrada (preço por unidade já com o frete), o último preço pago em NF-e de entrada e atalhos para pesquisar o produto no Google Shopping e no Mercado Livre. Vale para qualquer item de estoque: adubo, defensivo, diesel S10, sal mineral, ração, peças. "Pedir compra" abre o pedido já com a quantidade sugerida (até o dobro do mínimo), o fornecedor e o preço da melhor cotação. O sistema não compra: as cotações são registradas por quem consultou o fornecedor.
- **Preço sempre atualizado:** cotação com link do site do fornecedor é conferida pelo servidor a cada `PRICE_WATCH_HOURS` (padrão 6 h; `0` desliga) e pelo botão "Conferir preços agora". Se o preço mudou, a cotação é atualizada, o histórico guarda o valor anterior e a tela mostra "▲ subiu" ou "▼ caiu". Mudança acima de 60% fica para conferir. Cotação de WhatsApp ou telefone vira "peça de novo" depois de 7 dias, com botão que abre a conversa no WhatsApp com a pergunta pronta, e "Preço novo" registra a resposta. A leitura de sites só aceita https público (bloqueia rede interna, inclusive por DNS e redirecionamento). Código: `price-watch.js`; testes: `tests/precos.test.cjs`. Inventário completo do sistema: `LEVANTAMENTO-DO-SITE.md`.

As regras ficam em `gestao-domain.js`, usado pela tela e pelo servidor. O servidor revalida tudo antes de gravar, esconde do ADM contas a pagar, extrato e contratos, e não deixa apagar registros (contas pagas, pedidos encerrados, entregas, notas e linhas de extrato). Testes: `tests/gestao.test.cjs` (`npm test`).

## Operação integrada: safras, qualidade e pecuária

- **Resultados e custos:** comparativo entre safras, custo por saca, custos por lote, gráficos de linha com dados reais e distribuição por peso. Safras sem colheita não são apresentadas como produtividade zero no gráfico. Animações de linha/anel adaptadas dos exemplos 27 e 26 enviados pelo usuário, do canal Não Codei; respeitam movimento reduzido, dados vazios e valores zero.
- **Desenvolvimento:** cada talhão conta uma vez no período da safra. Marque "Sim, talhão concluído" na colheita. Uma conclusão em dez talhões cadastrados é 10%; colheitas parciais e períodos antigos não somam conclusões. O denominador inclui os talhões das fazendas selecionadas/participantes.
- **Várias fazendas:** em Safras, use "Safra em várias fazendas". Defina os participantes, área e talhões por propriedade. Cada fazenda mantém seus registros próprios; "Qualidade e resultado" reúne os participantes do mesmo grupo de safra. É possível mudar o peso de referência da saca preservando kg e vendas já registradas.
- **Café:** Especial acima de COC 01 a COC 16. O CEO mantém as qualidades, preços e peso da saca de referência. Os valores COC iniciais vieram da primeira coluna de preços da imagem fornecida pelo proprietário (sem aplicar a coluna adicional ou os 10% da imagem). Especial inicia sem preço. Esses valores não são cotações atuais de mercado. Percentuais e índice interno são ponderados pelos kg: Especial=0, COC 01=1, ... COC 16=16; registros sem classificação aparecem separadamente. Classificar ou reclassificar um registro atualiza a composição e gera histórico.
- **Terreirão:** em "Qualidade e resultado", registre limpeza, secagem, revolvimento, entrada/saída e inspeções, com lote, temperatura observada, data e observações. CEO e ADM adicionam orientações e faixas de temperatura definidas pela propriedade. O sistema não prescreve temperaturas. Autoria é gravada pelo servidor; registros são preservados. O contribuinte da atividade/fazenda autorizada consulta orientações e manejos sem acessar valores financeiros.
- **Grãos:** registre a umidade de cada colheita. O painel mostra a distribuição por medição e a média ponderada pelos kg medidos, informando a cobertura. Não aplica desconto nem inventa umidade para registros sem medição. Informe cotação manual por saca para a estimativa.
- **Estimativa da safra:** vendas comerciais + saldo não vendido estimado − custos operacionais registrados. No Café, o saldo usa a cotação média ponderada dos kg colhidos e a unidade de cada qualidade. A estimativa fica pendente quando faltam preços/classificações. Vendas ainda não alocam saídas por qualidade. Não representa caixa, lucro final nem custos futuros.
- **Agenda:** tarefas por atividade, responsável, data e vínculo com safra/lote; filtros de pendentes, atrasadas e concluídas. Previsões de colheita e manejos aparecem com a origem identificada. Plantio e entrega também podem ser planejados como tarefas.
- **Consumo de estoque:** registre insumo, quantidade e vínculo com safra/lote/procedimento. O servidor desconta uma vez, valida saldo e valoriza o custo unitário. Custo manual e consumo são custos operacionais; não geram pagamento de caixa. Evite registrar duas vezes o mesmo custo em ambas as origens.
- **Contas a receber:** o CEO cria parcelas de vendas existentes, registra recebimentos totais/parciais e acompanha saldo/vencidos. Cada recebimento confirmado gera uma entrada financeira identificada e preservada; não deve ser repetido em lançamento manual. Parcelas fecham centavos e respeitam fim de mês. Vendas com recebimentos/entregas são preservadas. Entregas comerciais têm conferência por kg, sem descontar novamente o estoque comercial.
- **Gado:** etapas predefinidas pelo CEO (Bezerros, Recria, Engorda, Reprodução e Terminação), com possibilidade de adicionar/desativar. Compras/entradas, vendas/saídas, mortes, transferências e mudanças de piquete têm histórico; transferências entre lotes preservam o total de cabeças. Em Resultados, informe cotação, data/origem e base da arroba: peso vivo ou carcaça com rendimento informado. Valor estimado do lote menos custos registrados é separado do caixa; não é lucro final. Não há rendimento presumido.
- **Preservação:** safras são arquivadas e podem ser reativadas. Lotes sem animais podem ser arquivados sem apagar pesagens; primeiro registre a saída/transferência dos animais. Fazendas com produção/histórico não podem ser apagadas pelo painel.
- **Site:** /demo apresenta o vídeo sem áudio do painel completo, também disponível nas páginas de apresentação. A reprodução é manual, com controles nativos e preload=none. O painel tem primeiros passos. Mercado mostra apenas a atividade selecionada; em Grãos, usa preços das próprias vendas identificados como tal. Preços de novos planos continuam a definir nas páginas, no perfil e na troca de porte; cobranças existentes mantêm o valor efetivo do contrato.

Verificações: npm test; npm run test:operations; npm run test:browser; npm run test:marketing; npm run test:pages; npm run test:plots; npm run test:seasons.

## Histórico de procedimentos dos talhões

No modo Café ou Grãos, abra **Histórico dos talhões** ou o botão **Histórico** de um talhão. CEO e ADM podem registrar procedimentos realizados, com tipo, descrição, data, responsável, insumos/equipamentos informados e observações. O sistema grava a autoria no servidor. Um procedimento manual não pode ser apagado nem reescrito; correções usam anulação com motivo, preservando o original.

A linha do tempo reúne também trabalhos do log de equipamentos, ordens de aplicação concluídas e colheitas de safras vinculadas ao talhão. Cada origem aparece identificada; trabalhos registrados não são apresentados como aplicações concluídas. Essas entradas automáticas refletem os registros de origem. Há filtros por talhão, período e origem e exportação em CSV. Lançamentos manuais não dão baixa automática no estoque.

Históricos de Café e Grãos ficam separados. Nos registros de equipamentos anteriores sem indicação de módulo, a atividade é tratada como Café por compatibilidade; vínculos antigos pelo nome do talhão são considerados apenas quando não há ambiguidade. Talhões com referências históricas ficam protegidos contra exclusão.

Teste específico: `npm run test:plots`.

## Páginas e módulo separados neste pacote

- `/` ou `index.html`: nova Visão geral, com o objetivo do sistema e acesso às atividades.
- `/cafe` ou `cafe.html`: página exclusiva do Café, com a frase “Do grão à saca”.
- `/gado` ou `gado.html`: página inicial de Gado, com paisagem de pastagem e prévia de lotes.
- `/graos` ou `graos.html`: página inicial de Grãos, com soja, milho e trigo.
- `/app`: painel, incluindo a seleção de atividade Grãos.
- `graos.js`: tela do modo Grãos, categorias próprias e rotinas de produção agrícola reutilizadas pelo Café.
- `rural-modules.js`: helpers comuns e telas de desempenho e manejo do Gado.

As três páginas estão interligadas. As ilustrações ficam em `assets/` e não dependem de imagens remotas. Abra `LEIA-PRIMEIRO.txt` para executar. No Windows, `INICIAR.cmd` instala as dependências e inicia o servidor a partir da pasta correta. O projeto depende de Node.js; abrir o HTML com Live Server não substitui o backend.

Na página de Gado, a marca aparece somente como **Gestão**, sem o grão de café. A prévia é exclusiva da pecuária: visão geral, lotes, piquetes, pesagens, desempenho e metas, manejos, estoque do gado e balanço financeiro.

## Café, Gado e Grãos

O menu **Atividade** permite escolher Café, Gado ou Grãos. Grãos inclui soja, milho e trigo, com estoque, notas e categorias financeiras próprios. Máquinas e talhões são compartilhados pela fazenda.

### Safras e produção (Café e Grãos)

- Cadastre a cultura, safra, talhão, variedade, área em hectares, etapa, datas, custo planejado e peso de referência da saca.
- Registre colheitas em kg líquidos secos; para café, use peso beneficiado/seco. A umidade é informativa e não gera desconto automático.
- Registre vendas com quantidade em kg e preço por saca. O saldo considera a data das colheitas e das vendas, impedindo saídas sem cobertura e exclusões que deixem saldo negativo.
- Veja produtividade em kg/ha e sacas/ha, produção disponível, filtros por cultura/etapa, consulta geral por fazendas e exportação CSV.
- Valores das vendas são registros comerciais. **Recebimentos continuam sendo lançados no Financeiro**; o custo da safra é um orçamento, não uma apuração automática de lucro.

### Desempenho e manejos do gado

- O painel usa a última pesagem de cada lote, ponderada pelas cabeças atuais, e informa quantas cabeças possuem referência de peso.
- A página **Desempenho e manejos** mostra ganho médio diário entre as duas últimas datas distintas, meta de peso vivo por cabeça e projeção de dias até a meta quando há ganho positivo.
- Edite nome, categoria, raça e observações do lote. Agende vacinações, inspeções, tratamentos e outros manejos definidos pelo responsável técnico, com data, responsável, observações e conclusão manual.
- Pesagens aceitam apenas cabeças inteiras, quantidade até o total do lote, peso positivo e data válida até hoje. Lotes com registros de manejo ficam protegidos contra exclusão acidental.
- Pesos e metas são apresentados em kg vivos. As colunas antigas de kg ÷ 15 são identificadas como equivalência de peso vivo.

### Permissões e compatibilidade

Dados anteriores continuam preservados. A permissão antiga `both` mantém Café + Gado. O CEO pode liberar `grains` ou `all` explicitamente. Contribuintes consultam a produção apenas da fazenda e atividade autorizadas, sem custo planejado, preços ou compradores, e não podem alterar safras, vendas ou manejos pelo servidor. CEO e ADM podem operar os novos módulos; o ADM mantém a restrição ao balanço financeiro.

### Verificação local

```text
npm install
npm test
npx playwright install chromium
npm run test:browser
npm run test:marketing
```

Os testes de navegador exigem Node.js 20 ou superior. Os testes de API e navegador iniciam um servidor temporário com credenciais geradas para o teste e banco isolado, removido ao finalizar. Não usam o banco operacional. O teste de navegador exercita as três culturas, colheita, venda, filtros, CSV, recarga, consolidado, café, pesagens, metas, manejos, menu móvel e navegação nos três modos. O teste de marketing verifica a oferta inicial, preços e descontos, FAQ, links da prévia, layout em cinco larguras e botões durante a animação. O checkout é simulado, sem cobrança. Capturas ficam em `test-results/`, que é ignorado pelo Git. Cotações externas são simuladas como indisponíveis nesses testes.

Esta versão parte da v21.7 e foca em segurança, administração e preparação para clientes pagantes, mantendo o tema e os módulos de Café/Gado.

## Ao atualizar da v21.7

Antes do primeiro deploy da v22 no Render, adicione estas duas variáveis novas:

```text
PLATFORM_ADMIN_EMAIL=seu-email-administrativo
PLATFORM_ADMIN_PASSWORD=uma-senha-forte-e-exclusiva
```

A tela `/platform` passa a usar essas credenciais. A antiga `PLATFORM_SETUP_KEY` não é mais o login normal em produção.

## Principais mudanças

### Super Admin profissional
- `/platform` agora usa **e-mail + senha**, em vez de depender da chave técnica no navegador.
- Sessão administrativa separada e temporária (padrão: 12 horas).
- **2FA por código de e-mail** opcional com Resend (`PLATFORM_REQUIRE_2FA=true`).
- Auditoria do Super Admin: login, criação, suspensão, reativação, alteração de plano, arquivamento e exclusão de Grupo.
- A chave antiga `PLATFORM_SETUP_KEY` fica apenas como compatibilidade local/desenvolvimento; em produção ela não é aceita por padrão.

### Senhas e sessões
- Regra única: **mínimo de 8 caracteres** e bloqueio de senhas conhecidas/fracas.
- Senhas temporárias criadas pelo CEO obrigam o funcionário a trocar a senha no próximo login.
- A exigência de troca é aplicada também no **backend**, não apenas pela tela.
- Quando o CEO redefine a senha de outra pessoa, todas as sessões antigas daquele usuário são encerradas.
- Recuperação de senha também encerra sessões antigas.
- Alteração de e-mail de recuperação exige a senha atual.
- Solicitação pública de cadastro cria somente **Contribuinte**; ADM/CEO são criados/promovidos pelo CEO.

### Concorrência e privacidade
- Controle de versão agora vale também para Contribuintes. Duas gravações simultâneas não usam mais o caminho sem verificação de revisão.
- O cache operacional do Grupo passa a usar `sessionStorage`, reduzindo permanência de dados sensíveis em computadores compartilhados.
- O servidor continua filtrando o estado por perfil antes de enviar dados ao navegador.

### Planos e cobrança
- Downgrade é bloqueado se o Grupo estiver acima do limite de fazendas/usuários.
- Grupos com assinatura real do Mercado Pago **não podem ter o plano trocado apenas no acesso**; o backend bloqueia para evitar cliente pagando um valor e usando outro plano.
- Grupo criado manualmente no `/platform` é marcado como **Cortesia/manual** e não entra na receita mensal confirmada.
- Receita do `/platform` usa apenas compras/assinaturas reais identificadas.

### Exclusão segura
- Cliente passa por **Arquivar → Excluir definitivamente**.
- Arquivar encerra o acesso e tenta cancelar a assinatura quando aplicável, mas preserva os dados.
- Exclusão definitiva só é permitida em Grupo arquivado e exige Código do Grupo + a palavra `EXCLUIR`.
- Grupo inicial `1001` continua protegido.

### Hardening do servidor
- `Content-Security-Policy`, `Permissions-Policy`, HSTS em HTTPS de produção, `nosniff`, proteção de frame e `no-store` nas APIs.
- Em produção, erros 5xx não expõem mensagens internas; o cliente recebe um `requestId` para diagnóstico.
- `TEST_PURCHASE_MODE=true` é bloqueado em produção, a menos que `ALLOW_TEST_MODE_IN_PRODUCTION=true` seja definido explicitamente para um teste controlado.
- Produção exige PostgreSQL, senha do CEO e credenciais próprias do Super Admin.

## Configuração no Render

### Web Service

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### Variáveis mínimas de produção

```text
NODE_ENV=production
DATABASE_URL=<Internal Database URL do Postgres>
PUBLIC_BASE_URL=https://SEU-SITE.onrender.com

SEED_GROUP_CODE=1001
SEED_GROUP_NAME=Grupo Fagundes Miari
SEED_CEO_NAME=Jacques Miari
SEED_CEO_USER=jacquesmiari
SEED_CEO_PASSWORD=<senha forte>
SEED_CEO_EMAIL=<seu e-mail>

PLATFORM_ADMIN_EMAIL=<seu e-mail administrativo>
PLATFORM_ADMIN_PASSWORD=<senha forte e exclusiva>
```

Para ativar 2FA no Super Admin:

```text
RESEND_API_KEY=re_...
PASSWORD_RESET_FROM=Gestão Rural <acesso@seudominio.com.br>
PLATFORM_REQUIRE_2FA=true
```

### Teste de compra no Render

Por segurança, o modo de compra simulada é bloqueado em `NODE_ENV=production`. Para um teste temporário e controlado, use:

```text
TEST_PURCHASE_MODE=true
ALLOW_TEST_MODE_IN_PRODUCTION=true
```

Depois do teste, volte ambos para `false` ou remova as variáveis.

## Endereços

```text
/           Página comercial
/app        Sistema dos clientes
/platform   Super Admin
/api/health Saúde do servidor
```

## Planos

- Essencial: 1 fazenda; valores a definir.
- Profissional: até 5 fazendas; valores a definir.
- Grupo: fazendas ilimitadas; valores a definir.

Descontos: trimestral 3%, semestral 8%, anual 15%.

## Observações importantes

- A v22 preserva as funções existentes de Café, Gado, piquetes, lotes, pesagens, banho, estoque, financeiro, usuários, notas e comprovantes.
- Antes de colocar clientes reais, configure o Resend, Mercado Pago real e backups automáticos do PostgreSQL no provedor.
- Anexos ainda ficam em `BYTEA` no PostgreSQL nesta versão; para grande escala, o próximo passo recomendado é armazenamento de objetos (S3/R2/compatível).


## Assinatura por atividade

O cliente pode escolher Café, Gado ou Grãos; qualquer combinação de duas; ou as três. Grãos inclui soja, milho e trigo. Os portes por quantidade de fazendas continuam separados da seleção de atividades.

Todos os valores novos ficam **a definir**. O arquivo `planos-atividades.json` tem as sete combinações para cada porte, todas como `null`. Sem um valor positivo configurado, o site mostra apenas o resumo da escolha e o servidor bloqueia o checkout, sem cobrar. Ao definir os preços mensais, mantenha a ordem dos nomes nas chaves (`coffee`, `cattle`, `grains`) e reinicie o servidor. A variável opcional `ACTIVITY_PRICES_JSON` pode substituir esse arquivo.

Assinaturas novas persistem as atividades escolhidas no grupo. O painel limita as opções à assinatura, e o servidor rejeita lançamentos de atividades não contratadas. A lista contratada não pode ser ampliada pelo envio de dados do navegador. Grupos anteriores sem essa lista preservam o acesso existente. Os preços de contratos antigos não são alterados por essa configuração.

### Histórico de safras

Em Café ou Grãos, abra Safras e use **Histórico da safra**. CEO e ADM podem consultar safras abertas ou encerradas, filtrar por período/tipo e exportar CSV. O diário registra alterações de etapa e cadastro no servidor a partir desta versão; registros antigos não têm etapas reconstruídas. Colheitas e vendas existentes são reunidas na linha do tempo. Exclusões futuras de lançamentos ficam referenciadas no diário. Procedimentos do talhão vinculado aparecem apenas no período da safra e são identificados como registros do talhão, sem atribuição exclusiva à safra.

Verificação da tela: `npm run test:seasons`.

## Permissões completas e interface neutra

O cadastro, as solicitações e o perfil reconhecem as sete combinações: Café, Gado, Grãos, Café + Gado, Café + Grãos, Gado + Grãos e as três atividades. As opções respeitam os módulos contratados. Os códigos antigos both (Café + Gado) e all continuam válidos. Os novos pares são coffee_grains e cattle_grains, também validados no servidor.

A entrada do painel usa uma identidade neutra, sem os grãos decorativos, cursor temático, botões texturizados ou o nome do grupo antes do acesso. O grupo continua identificado dentro da sessão autenticada. O menu conserva a rolagem por mouse, toque e teclado; a barra é fina e discreta. As páginas públicas de Café, Gado e Grãos mantêm sua identidade.

O vídeo em /demo mostra telas com dados fictícios. O gráfico real fica em Resultados e custos e usa as safras com colheita registrada.

Vendas e conferências de entregas recebem quantidades em sacas, inclusive fracionadas. O peso da saca é configurado na safra; novas vendas preservam esse peso no próprio registro, mesmo se a referência da safra mudar depois. Registros antigos sem esse campo usam a referência disponível da safra. A persistência continua em kg para preservar saldos, vendas e comparações. Contas a receber mostra as sacas da venda e exporta essa quantidade no CSV, enquanto parcelas e recebimentos continuam monetários. Colheitas e medições de umidade continuam em kg.

Validação adicional: npm run test:polish, além das demais suites.

## Temas, primeiros passos e contratação por grupo

O painel usa cenários de Café, Gado e Grãos, com paletas próprias. O cursor de café é restrito ao módulo Café; as demais atividades usam cursor padrão. A marca quadrada GR foi retirada e o topo acompanha o fundo do painel, sem faixa branca. A entrada de cada página pública abre /app com a atividade solicitada, respeitando os módulos do grupo após autenticar.

Os primeiros passos são atalhos operacionais: locais abre Talhões/Piquetes, produção abre o cadastro de Safra/Lote e rotina abre uma nova tarefa. O bloco fica compacto, sem o cartão externo grande; desaparece ao completar os três passos. O ADM solicita ao CEO o cadastro de talhões, conforme a permissão já existente. A seleção de fazendas participantes usa cartões com caixas de seleção lado a lado e aceita seleção múltipla sem Ctrl.

Colheitas, vendas e entregas permitem escolher kg ou sacas/sacos. A equivalência é exibida durante a digitação e a persistência continua em kg. A referência da saca da venda permanece preservada. Variedades mudam de acordo com a cultura e existe Outra variedade para informar uma cultivar ausente, incluindo registros legados.

No Super Admin (/platform), Atividades de cada grupo define os módulos liberados. Grupos criados manualmente também recebem uma escolha explícita. Assinaturas pagas só aceitam módulos correspondentes à contratação registrada. O CEO não amplia a própria assinatura. Dados de módulos não contratados são ocultados na resposta do servidor e preservados no salvamento. Ao remover todos os módulos permitidos de um contribuinte, seu acesso fica inativo até o responsável revisar as permissões.

A limpeza solicitada foi executada apenas no banco local, após backup, mantendo grupo, usuários e identidades das fazendas. Não houve limpeza do servidor publicado.

Testes adicionais: npm run test:themes e tests/group-inputs.test.cjs.

Referências dos nomes do cadastro inicial de cultivares (não são recomendações de plantio): [IAC — Café](https://www.iac.sp.gov.br/produtoseservicos/orgulhonacional/programa_cafe.php), [Incaper — Conilon](https://incaper.es.gov.br/Noticia/clones-de-cafe-impulsionam-produtividade-e-sustentabilidade-da-cafeicultura-capixaba), [Embrapa — Soja](https://www.embrapa.br/web/soja/convencional), [Embrapa — Milho BRS 1055](https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/697249), [Embrapa — Trigo BRS 264](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/570289/1/doc174.pdf).

### Análises de solo e foliar

No Café e em Grãos, CEO e ADM acessam **Análises de solo e foliar** no menu. Cada laudo é vinculado à fazenda, ao talhão, à cultura e à data da coleta; aceita resultados parciais, identificação da amostra, laboratório, método, profundidade e estádio foliar. As análises podem ser editadas e arquivadas; exclusões que apagariam seu histórico são recusadas pelo servidor. O histórico do talhão identifica os laudos como inspeções laboratoriais. Contribuintes não recebem esses registros. A assinatura do grupo limita as atividades visíveis e mantém os registros ocultos ao desativar um módulo.

As faixas de Café, Soja, Milho e Trigo são exatamente as fornecidas pelo proprietário em 29/10/2026, identificadas por owner-2026-10-29-v1. Não são apresentadas como uma recomendação agronômica universal e não calculam doses de calagem ou adubação. Mínimo e máximo são limites inclusivos de atenção; o ideal é inclusivo, exceto o alumínio (m), cujo limite superior é estritamente menor que 10%, ou 5% no Trigo. Na faixa ideal: verde; fora do ideal, mas dentro dos limites: amarelo/Atenção; abaixo do mínimo ou acima do máximo: vermelho/Atenção. Valores ausentes não viram zero.

Os anéis exibem a porcentagem real medida, sem normalizar o resultado pela meta. No solo, V e m são índices percentuais e Ca/Mg/K devem ser informados como saturação na CTC; não se aceitam resultados de teores em mg/dm³ ou cmolc/dm³ nesses campos. A análise foliar aceita % ou g/kg na matéria seca e armazena em %, com 10 g/kg = 1%. Fonte sobre unidades foliares: [Embrapa — Amostragem e diagnose foliar](https://ainfo.cnptia.embrapa.br/digital/bitstream/item/218395/1/LV-RecomendacaoSolo-2020-67-74.pdf). O CSV exporta os resultados em %, as faixas e a versão usada.

Validação: npm test e npm run test:soil.
