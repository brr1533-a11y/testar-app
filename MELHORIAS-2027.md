# Melhorias 2027 — versão local

Base: a versão das 5 correções e dos 3 ajustes (GitHub `brr1533-a11y/testar-app`, commit `0a6d4f9`).

**Esta entrega é só o ZIP.** Nada foi enviado ao GitHub nem publicado no Render.

A ordem seguiu o plano "Próximas melhorias do sistema":
1. push e comparador;
2. meação e Funrural;
3. módulos e resumo do dono;
4. financiamentos e fluxo de caixa;
5. o restante.

## 1. O que estava desligado e foi ligado

| Item | Como ficou |
| --- | --- |
| **Push no celular** | Ligado por padrão, sem configurar nada. Na primeira vez, o servidor gera as chaves VAPID e guarda no banco; nas próximas, usa as mesmas. Quem quiser chaves próprias coloca no ambiente. `PUSH_ENABLED=false` desliga. |
| **Previsão do tempo** | Open-Meteo, gratuito e sem chave. Mostra 7 dias pelo município e UF cadastrados em Implantação: chuva, temperatura, chance de chuva e os dias mais secos para pulverizar. O município fica guardado por 3 horas. `WEATHER_PROVIDER=off` desliga. |
| **Comparador de preços** | Passa a usar as notas XML importadas. Só entram notas com chave de acesso válida (44 dígitos, modelo 55/65, dígito verificador). A mesma nota conta uma vez, mesmo que seja importada em vários Grupos. Cada fazenda vale um voto (a mediana das compras dela), para que uma fazenda com muitas notas não puxe o preço. A tela avisa quando há notas importadas ainda não conferidas na SEFAZ. Continua exigindo consentimento e três fazendas de três grupos. |

## 2. Funções novas

Todas entram no menu e usam o mesmo mecanismo das etapas 3–8:
- validação no servidor;
- permissão por perfil (o CEO libera para o ADM em Usuários › Permissões do ADM);
- histórico;
- gravação sem internet.

| Página | Menu | O que faz |
| --- | --- | --- |
| **Parceria e meação** | Lavoura (café) | O meeiro é cadastrado por talhão, com a parte dele na produção e nos custos. A colheita dos talhões entra sozinha. A colheita lançada sem talhão entra pela proporção da área. Os custos lançados na safra podem ser divididos (opção), além dos lançamentos próprios: custo, adiantamento, entrega de sacas, venda das sacas do parceiro e pagamento. O acerto mostra sacas e reais (quem deve a quem) e tem **Recibo do acerto** para imprimir e assinar. O mesmo talhão não pode estar em duas parcerias no mesmo período. |
| **Funrural e Senar** | Financeiro e fiscal | Calcula sobre as vendas, os contratos ainda a entregar e o leite. Regimes:<ul><li>pessoa física: 1,2% + RAT 0,1% + Senar 0,2%;</li><li>pessoa jurídica: 1,7% + 0,1% + 0,25%;</li><li>quem optou pela folha: só Senar 0,2%;</li><li>isento.</li></ul>As alíquotas podem ser trocadas. Mostra se o comprador desconta ou se o produtor recolhe, o resumo por mês e exporta planilha. |
| **Financiamentos e dívidas** | Financeiro e fiscal | Custeio, Pronaf, investimento, CPR e outras dívidas. Parcelas Price, SAC ou pagamento único, anuais, semestrais, trimestrais ou mensais. Os juros contam por dias corridos. A CPR guarda as sacas. As parcelas pagas são marcadas, as atrasadas aparecem em vermelho e as que vencem em 30 e em 7 dias viram aviso (painel, push). |
| **Fluxo de caixa projetado** | Financeiro e fiscal | Mostra 12 meses a partir do saldo de hoje do Financeiro. Entram:<ul><li>contas a pagar;</li><li>recebimentos de vendas parceladas;</li><li>contratos a entregar, já sem o Funrural;</li><li>parcelas;</li><li>arrendamentos;</li><li>prestadores a pagar;</li><li>salários fixos.</li></ul>Avisa o primeiro mês em que o caixa fica negativo. |
| **Arrendamentos** | Lavoura | Terra arrendada (você paga) e terra cedida (você recebe), em sacas ou reais por ha, com pagamento uma vez por ano. A terra arrendada ligada a uma safra entra no custo por saca. |
| **Prestadores terceirizados** | Lavoura | Serviço por ha, saca, diária, hora ou valor fechado. O custo entra na safra. A colheita terceirizada é comparada com a manual (fechamentos da Mão de obra) em R$ por saca. |
| **Animais individuais** | Pecuária | Brinco, número SISBOV (15 dígitos), sexo, raça, nascimento, lote, mãe, origem e situação. O histórico guarda pesagem, parto, cobertura, prenhez, secagem, vacina e tratamento, com ganho por dia. Também tem:<ul><li>**Planilha para o SISBOV**, que mostra o que falta em cada animal;</li><li>**pesagens da balança** por arquivo (brinco;peso) ou pelo cabo USB/serial (Chrome ou Edge no computador);</li><li>**leite:** dias em lactação, intervalo entre partos, previsão de parto e de secagem, com aviso 7 dias antes.</li></ul> |
| **Resumo do dono** | Início (primeiro no celular) | Caixa, vencimentos em 30 dias, se o caixa fica negativo, café disponível com valor de mercado, colheita da semana, rebanho, leite e avisos. Cada quadro leva à tela de detalhe. |
| **Módulos e modelo da fazenda** | Configurações (CEO) | Modelos prontos:<ul><li>café familiar;</li><li>café com meeiros;</li><li>café com equipe;</li><li>leite;</li><li>corte;</li><li>grãos;</li><li>tudo ligado.</li></ul>Também dá para ligar e desligar página por página. Esconder não apaga dados. |
| **Relatório para crédito** | Financeiro e fiscal | Identificação, área, produção e custo por saca de cada safra, entradas e saídas de 12 meses, dívidas e patrimônio informado. Botão para imprimir ou salvar em PDF. |
| **Comparar com fazendas parecidas** | Financeiro e fiscal | Produtividade (sc/ha), custo por saca e área: sua fazenda contra a faixa de 25% a 75% e a mediana da UF ou do Brasil. Só com quem aceitou participar e no mínimo três fazendas de três grupos, sem nomes. A própria fazenda fica fora da conta. |
| **Meus dados e privacidade** | Configurações (CEO) | Baixa tudo em JSON: fazendas, lançamentos, usuários sem senha, histórico e anexos (até 20 MB). Mostra quando os termos foram aceitos. A **exclusão da conta** pede senha, a palavra EXCLUIR e o Código do Grupo. Ela fica agendada por 7 dias e dá para cancelar; depois o servidor apaga o Grupo, os anexos e cancela a assinatura. O Grupo inicial 1001 é protegido. |

### Em todas as telas
- **Botão de ajuda (?):** mostra o texto da tela, o vídeo (`SUPPORT_VIDEO_URL/<página>`) e o **WhatsApp do suporte** (`SUPPORT_WHATSAPP`), com a mensagem já dizendo a tela. O WhatsApp abre no celular da pessoa; o sistema não envia nada.
- **Contagem de uso:** cada tela aberta é contada (página, mês, perfil), sem conteúdo nenhum.

### Site e Super Admin
- **`/termos` e `/privacidade`:**
  - estão nos rodapés;
  - criar um Grupo (teste grátis ou depois da compra) exige marcar o aceite;
  - a versão e a data do aceite ficam guardadas pelo servidor, e o navegador não consegue mudar.
- **`/platform`:**
  - **Backup automático:** a cada `BACKUP_HOURS` (24 h); guarda os `BACKUP_KEEP` mais recentes (14); cifra com `BACKUP_KEY`.
  - **Teste de restauração:** logo depois de gravar, abre a cópia, confere o conteúdo de cada Grupo e valida as fazendas.
  - **Uso por página** e **pedidos de exclusão**.

## 3. Teste em celular fraco

Tela de 360 px, CPU 4 vezes mais lenta e rede 3G (1,6 Mbps, 150 ms), no Brave:

| Etapa | Tempo |
| --- | --- |
| Tela de entrada | 6,0 s |
| Painel depois do login | 0,8 s |
| Resumo do dono | 0,1 s |

O resumo cabe na largura, sem rolagem para o lado.

**Limite deste teste:** é uma simulação. Não substitui um Android simples de verdade. A tela de entrada é a parte mais pesada, porque baixa todos os scripts. No celular, eles ficam guardados pelo modo offline depois da primeira vez.

## 4. Validação

| Teste | Resultado |
| --- | --- |
| `npm test` | 191 de 191: 172 antigos, 17 novos de regras e 2 roteiros de API |
| `tests/melhorias.test.cjs` | Meação, Funrural, Price/SAC/CPR, arrendamento no custo, prestador × manual, ADM com o mesmo custo do CEO, fluxo de caixa, animais e leite, balança, módulos, comparação anônima, XML no comparador, Open-Meteo (simulado), backup cifrado com restauração e arquivo corrompido, exclusão vencida |
| `tests/melhorias-api.test.cjs` | Servidor de verdade: arquivos públicos e privados, push, registros novos e recusa de dados inválidos, ADM sem permissão, exportação sem senhas, comparação, Grupo 1001 protegido, aceite dos termos, exclusão (senha, confirmação, agendar e cancelar), métricas, backup pelo Super Admin |
| `tests/melhorias-browser.cjs` | No Brave: menu, parceria pelo formulário, todas as telas novas, ajuda com WhatsApp, animais no modo Gado, modelo de módulos e celular fraco |
| Roteiros de navegador | 20 de 20 no Brave (perfil temporário e vazio): os 19 antigos e o novo, rodados em sequência |

**Previsão real:** a consulta ao Open-Meteo foi feita uma vez de verdade (Alfenas/MG, 7 dias). Nos testes automáticos ela é simulada, para não depender da internet.

## 4.1 Teste no site fictício (31/10/2026)

Rodei uma cópia isolada do sistema, com banco próprio e dados inventados:
- **Fazenda Boa Esperança:** café, soja e gado; talhões, safras, colheitas, vendas, Financeiro, contas a pagar, contrato de venda, turma de colheita com semana fechada, meeiro, três financiamentos (custeio, Pronaf e CPR), arrendamentos, prestadores e NF-e importada por XML.
- **Três fazendas vizinhas,** de outros grupos, para a comparação anônima e o comparador.

O teste foi feito no Brave, como uma pessoa usaria:

| Teste | Resultado |
| --- | --- |
| Todas as telas do menu nos modos Café, Gado e Grãos, e todos os formulários "Adicionar" | Nenhum erro |
| Funções novas usadas pela tela: salvar pelos formulários e conferir os números | 39 de 39 OK |
| Funções do servidor: previsão real de Alfenas/MG, comparador com 4 notas XML, comparação com 3 fazendas, avisos, push, exportação | OK |

**Exemplos do que foi conferido:**
- Meação de 100 sc com 20 sacas a acertar; o pagamento baixa o saldo.
- Funrural: PF 1,5% e PJ 2,05%.
- Parcela do Pronaf paga some dos avisos e do fluxo de caixa.
- Arrendamento com talhão marcado: R$ 12.000 por ano.
- Balança por arquivo e planilha SISBOV.
- Vaca com 90 dias de lactação.
- Módulos: o modelo esconde páginas e o "Tudo ligado" devolve os dados.
- Exclusão da conta: pedida e cancelada.
- Backup do Super Admin conferido.

**O teste achou e corrigi:**
- **Previsão do tempo não ligava no servidor de verdade.** Uma linha não tinha entrado no arquivo, e os testes automáticos não pegavam porque desligam o clima. Agora tem teste com o clima ligado.
- **Comparativo de prestadores enganava.** A colheita manual era dividida pelas sacas da safra inteira (dava R$ 2,33/sc). Agora a turma usa as sacas dos talhões que ela colheu, e a máquina usa a produtividade do talhão do serviço: R$ 21/sc × R$ 116/sc no exemplo.
- **Painel do Super Admin:** o quadro de backup, uso e exclusões não aparecia quando a página já abria logada.
- **Celular estreito:** valores como "R$ 589.000,00" quebravam no meio do número.
- **Acerto da meação:** o valor saía sem ponto de milhar.
- **Comparador:** um texto ainda dizia que XML importado não entrava.

## 5. O que não foi feito e por quê

| Item | Motivo | O que precisa |
| --- | --- | --- |
| **Emissão de NF-e** | Exige provedor fiscal homologado e certificado digital. | Escolher o provedor (ex.: Focus NFe, NFE.io, PlugNotas) e o certificado A1. O ponto de ligação já existe (`integracoes-etapas.js`). |
| **CNAB (pagamento em lote)** | O arquivo muda de banco para banco. | Saber o banco e o convênio da fazenda. |
| **WhatsApp automático** | Exige conta WhatsApp Business com modelo de mensagem aprovado pela Meta. | Contratar Meta Cloud API ou um intermediário. Hoje o WhatsApp do suporte é só um link que a pessoa abre. |
| **Lançamento por foto ou áudio** | Exige um serviço de IA pago, com chave. | Escolher o serviço e o limite de custo por cliente. |
| **Balança eletrônica** | Cada marca tem seu protocolo. | Hoje lê o arquivo exportado e o peso pelo cabo serial (Chrome/Edge no computador). Bluetooth ou app da balança dependem do modelo. |
| **SISBOV** | O envio é feito por certificadora credenciada. | O sistema prepara a planilha; a certificadora envia. |
| **Termos e privacidade** | Modelo inicial, sem revisão jurídica. | Advogado revisar e incluir razão social, CNPJ, encarregado de dados e contato. |
| **Backup no Render** | A pasta do serviço é apagada a cada publicação. | Disco persistente (`BACKUP_DIR`) ou o backup do próprio PostgreSQL. |
| **Teste em celular de verdade** | Só foi possível simular. | Abrir num Android simples e num iPhone, inclusive o push. |

**Push:** na entrega real, ainda precisa ser testado num aparelho com HTTPS.

**Cálculos:**
- **Funrural:** as alíquotas seguem a lei em vigor, mas o regime de cada produtor deve ser confirmado com o contador.
- **Financiamentos:** os valores das parcelas são uma estimativa e podem diferir do banco (dias úteis, IOF, taxas). Confira com o contrato.

## 6. Como executar

Extraia o ZIP numa pasta nova, abra a pasta com `package.json` no VS Code e rode:

```powershell
npm.cmd ci
npm.cmd start
```

Para atualizar uma instalação que já existe:
- preserve `.env`, o banco e os anexos;
- faça uma cópia de segurança antes.

As variáveis novas estão em `.env.example`: `PUSH_ENABLED`, `WEATHER_PROVIDER`, `SUPPORT_WHATSAPP`, `SUPPORT_VIDEO_URL`, `BACKUP_*`.

Testes:

```powershell
npm.cmd test
npm.cmd run test:melhorias:browser
```

Site fictício para mostrar ou testar à mão:
- abre uma cópia isolada, com dados inventados e banco próprio;
- mostra no terminal o endereço e o acesso de teste;
- Ctrl+C encerra e apaga a cópia.

```powershell
npm.cmd run demo:ficticio
```

## 7. Arquivos

| Arquivo | O que é |
| --- | --- |
| `melhorias-domain.js` | Regras novas (navegador e servidor). |
| `melhorias.js`, `melhorias.css` | Telas novas, ajuda, módulos, contagem de uso. |
| `melhorias-server.js` | Comparação anônima, exportação, exclusão, métricas, backup. |
| `clima-openmeteo.js` | Previsão do tempo (só no servidor). |
| `platform-melhorias.js` | Painel do Super Admin: backup, uso e exclusões. |
| `termos.html`, `privacidade.html` | Termos de uso e Política de privacidade. |
| `expansao-domain.js` | Inclui as páginas e registros novos, os custos de arrendamento e prestador, os avisos e o comparador com XML. |
| `expansao-server.js` | Push com chaves automáticas; Open-Meteo; comparador com XML. |
| `expansao.js` | Formulário aceita lista de talhões e novos campos de data; previsão na tela de clima. |
| `server.js` | Liga o módulo novo; aceite dos termos; arquivos públicos. |
| `adm-access.js` | Páginas novas na lista de permissões do ADM. |
| `app.js`, `app.html`, `sales.js`, `platform.html`, `index.html`, `cafe.html`, `gado.html`, `graos.html` | Ligações, aceite dos termos e links do rodapé. |
| `tests/melhorias*.cjs` | Testes novos. |
| `tests/support/server.cjs`, `tests/expansao-api.test.cjs`, `tests/novidades.test.cjs`, `tests/subscription.test.cjs` | Ajustes: clima e backup desligados no servidor de teste, push ligado e aceite dos termos. |
