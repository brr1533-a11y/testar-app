# Cinco correções da revisão — versão local

Base: `brr1533-a11y/testar-app`, commit `32fe388109476cf3d8306c70133be1b8dabd5458`. Esta entrega é um ZIP completo. Não foi enviada ao GitHub nem publicada no Render.

## O que mudou

1. **Custo da colheita separado do pagamento.** O custo vem do trabalho bruto do fechamento (sacos e diárias). Vales, descontos e saldos devedor/credor continuam no cálculo do que a pessoa recebe, sem reduzir o custo do trabalho. Exemplo: R$ 200 de trabalho e R$ 100 de vale = R$ 200 de custo e R$ 100 na conta a pagar. Se o vale quitar todo o valor, o custo continua existindo sem criar uma conta fictícia. Pagamentos identificados não entram de novo no custo.

2. **CEO e ADM com o mesmo custo.** Quando o ADM pode consultar custos, mas não pode abrir Mão de obra, o servidor envia os valores de custo já distribuídos por safra. Não envia o cadastro de trabalhadores, CPF, Pix ou a folha. O valor é só para consulta; o servidor descarta alterações desse resumo que venham do cliente. A permissão de editar salários/contas não foi ampliada.

3. **Preço do banho congelado na aplicação.** Na baixa do estoque, o servidor guarda produto, quantidade efetiva, unidade, preço unitário, total e distribuição usados no cálculo. Atualizar o preço, renomear ou remover o item do estoque não reavalia aplicações já registradas. O cliente não pode substituir esse registro de custo, nem forçar outra baixa do mesmo banho.

4. **Fiscais identificados pelo usuário.** Os apontamentos novos recebem o ID e o usuário do fiscal no servidor, além do nome. Dois fiscais chamados João passam a ser distinguidos. Na conferência, aparece também o usuário ao lado do nome. Registros antigos só recebem uma identificação automaticamente quando a correspondência é inequívoca; se o nome for ambíguo, vão para revisão, sem adivinhar o autor. Essa indicação já aparece na consulta. Um fiscal não corrige o lançamento de outro fiscal com o mesmo nome, e confirmações de duplicidade continuam sendo do escritório.

5. **Modo de campo preserva a página selecionada.** Se o cadastro do aparelho demorar e a pessoa navegar para outra tela, a conclusão do cadastro não desenha novamente a tela do cofre por cima. A habilitação continua e o aviso de conclusão aparece normalmente.

## Atenção aos dados antigos

Versões anteriores não guardavam o preço histórico do produto usado no banho. Esse preço não pode ser recuperado com certeza a partir do preço atual. Na primeira gravação, aplicações antigas sem esse registro recebem uma avaliação **estimada**, usando o estado anterior à edição, e ela é congelada. A tela de custo identifica essa situação. Para aplicações novas, o preço fica registrado na baixa. Preços ausentes ficam identificados no registro como desconhecidos; não são inventados.

Não houve limpeza de grupos, fazendas, usuários, lançamentos ou pagamentos existentes. A prévia usa uma fazenda isolada com dados fictícios, fora do ZIP e fora dos bancos reais.

## Validação

- `npm test`: **165 testes aprovados, zero falhas**.
- Novos testes de regressão: custo bruto com vale parcial/integral, consulta do ADM, proteção do resumo de custo, preço congelado do banho, preço desconhecido, cadastro posterior de insumo, fiscais homônimos, mudança do nome e autoria antiga ambígua.
- API completa: fechamento, conta líquida, baixa única de estoque, atualização de preço, tentativa de alterar o preço congelado e comparação do custo entre CEO e ADM.
- `node tests/cinco-correcoes-browser.cjs`: cadastro do cofre com resposta de rede atrasada, troca de página e lançamento salvo depois da conclusão — aprovado.
- `node tests/expansao-browser.cjs`: módulos, formulários, tela móvel, cofre cifrado, reabertura sem internet e sincronização — aprovado. A verificação do rascunho fiscal agora espera sua confirmação no servidor.
- `node tests/piscada-browser.cjs`: preservação dos cartões e dos formulários em edição durante sincronização — aprovado.
- Conferência em aba local visível: custo total de R$ 400 (R$ 200 de trabalho + R$ 200 de banho) mantido depois de mudar o preço atual do produto de R$ 100 para R$ 150; alerta dos dois fiscais com o mesmo nome visível.

Não houve teste novo em um iPhone físico nem em PostgreSQL/Render de produção. As integrações externas continuam como estavam na base; este pacote não habilita emissor fiscal, clima, WhatsApp ou cobranças.

## Arquivos alterados

| Arquivo | Motivo |
| --- | --- |
| `expansao-domain.js` | Custo bruto da colheita, resumo de custo do ADM, registro congelado do banho e rateio em centavos. |
| `server.js` | Projeção segura do resumo/autoria e gravação/preservação do preço do banho pelo servidor. |
| `maodeobra-domain.js` | Identificação estável do fiscal, migração conservadora de autoria e validação das duplicidades/correções. |
| `maodeobra.js` | Mostrar o usuário junto do nome e oferecer correção somente ao autor correto. |
| `campo-offline.js` | Evitar que a conclusão assíncrona da habilitação substitua outra página. |
| `expansao.js` | Identificar estimativas de aplicações antigas sem preço histórico guardado. |
| `campo-sw.js` | Cache offline regenerado para incluir as novas versões dos scripts. |
| `tests/cinco-correcoes.test.cjs`, `tests/cinco-correcoes-api.test.cjs`, `tests/cinco-correcoes-browser.cjs` | Cobertura das cinco regressões. |
| `tests/revisao-custos.test.cjs` | Corrigir a expectativa antiga que tratava o saldo líquido como custo. |
| `tests/expansao-browser.cjs` | Aguardar o rascunho fiscal confirmado, evitando leitura antes do salvamento. |
| `package.json` | Atalhos dos testes novos, sem dependência adicional. |
| `README.md`, `CORRECOES-5-PONTOS.md`, `ALTERACOES-CINCO-CORRECOES.json` | Orientação da entrega e inventário verificável. |

## Ajustes da revisão (depois das 5 correções)

1. **Vale sem contar duas vezes:**
   - **No Financeiro:** o vale lançado em Mão de obra vira uma saída "Vale da colheita" feita pelo servidor, marcada com a origem. Ela não entra no custo, porque o custo é o trabalho bruto. Estornar o vale lança a entrada de volta. Desconto não mexe no Financeiro.
   - **Vale lançado à mão:** se alguém tentar lançar um vale direto no Financeiro, o app avisa e pergunta se é outro tipo de vale.
2. **Banho antigo com valor estimado:**
   - **Onde:** em Custo por unidade aparece a lista desses banhos, com o botão **Informar preço da época**. Só o CEO ou o ADM com páginas de valores pode usar.
   - **O que muda:** o servidor recalcula com o preço informado, tira a marca de estimado e registra no histórico.
   - **O que não muda:** o estoque atual. Banho com preço registrado na baixa também não é alterado por aqui.
3. **Autoria antiga:**
   - **Definir quem lançou:** o escritório escolhe qual dos usuários com aquele nome fez os lançamentos antigos, e fica registrado quem definiu. O fiscal não consegue fazer isso.
   - **Menos alarme falso:** a dúvida de autoria só vira "possível repetido" quando os lançamentos são no mesmo talhão.

**Testes novos:** `tests/tres-ajustes.test.cjs`, com 7 casos. **`npm test`: 172 de 172.**
**Conferido na tela:**
- o vale lançado e a saída no Financeiro;
- o aviso ao lançar vale à mão;
- a caixa e o formulário de preço da época;
- a caixa de autoria, com os dois "João";
- talhões diferentes sem falso repetido.

**Documento com tudo o que o site tem:** `TUDO-QUE-O-SITE-TEM.md`.

### Testes de navegador (30/10, no Brave 1.98, com perfil temporário e vazio)
- **19 roteiros de navegador, todos passando.** O novo `tests/ajustes-browser.cjs` (`npm run test:adjustments:browser`) confere, com cofre real e o próprio app:
  - **PIN:** "Restam 4…1"; trava no 5º erro; durante a espera nem o PIN certo é perguntado; depois abre e zera o contador.
  - **Vale:** vai sozinho para o Financeiro; o vale lançado à mão é avisado e não grava.
  - **Repetido:** resolvido pela tela, com "São diferentes".
  - **Pix:** o copia e cola é copiado com o código de verificação certo.
- **Instabilidade observada uma vez:** numa rodada com os 19 seguidos, dois roteiros (`cinco-correcoes-browser` e `expansao-browser`) passaram de 30 s esperando o cofre ficar habilitado. Rodados de novo, juntos com o `ajustes-browser`, passaram em 6 de 6 execuções.
- **Como rodar no Brave sem baixar o Chromium:** um gancho que só troca o navegador do Playwright: `node -r <gancho> tests/<roteiro>.cjs`. O gancho é `chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe' })`.

## Como executar

Extraia em uma pasta nova, abra a pasta que contém `package.json` no VS Code e execute:

```powershell
npm.cmd ci
npm.cmd start
```

Configure as variáveis no ambiente seguindo `.env.example`. Ao atualizar uma instalação existente, preserve seu `.env`, banco e anexos e faça uma cópia de segurança antes. Eles não estão incluídos no ZIP.

Para repetir apenas os testes novos:

```powershell
npm.cmd run test:five-fixes
npm.cmd run test:five-fixes:browser
```

O teste de navegador requer o Chromium do Playwright instalado. O inventário novo compara esta entrega com o commit-base; os inventários/documentos de versões anteriores são históricos.
