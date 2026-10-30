# Revisão das etapas 3 a 8 — 30/10/2026

Pacote revisado: `gestao-rural-etapas-3-a-8-local.zip`. O pacote não foi alterado; ele foi extraído para esta pasta e testado aqui.

## O que foi conferido e passou
- **Base:** o pacote parte do zip da Etapa 2. Nada da Etapa 2 sumiu: carência, medicamentos, valor automático do fiscal, Mercado com reserva, "Limpar dados" e "Manter conectado".
- **Inventário:** os SHA-256 do `ALTERACOES-ETAPAS.json` batem com os 25 arquivos.
- **Dependências:** `npm ci` instala sem erro, incluindo o novo `web-push`. Todos os `.js` e `.cjs` passam na verificação de sintaxe.
- **Testes:** `npm test` dá **122 de 122 aprovados**, incluindo os 101 da Etapa 2.
- **Navegador, CEO, café:** as 14 telas novas abrem sem erro.
- **Navegador, gado:** Qualidade do leite, Ocupação de piquetes e Custo por unidade abrem sem erro. Foram abertas forçando a atividade gado, porque o grupo de teste só tem café.
- **Comercialização com dados de teste:**
  - 500 sacas colhidas, 100 vendidas a R$ 1.800 e 400 disponíveis: tudo certo;
  - a referência de mercado ao vivo apareceu;
  - simular mais que o disponível é recusado.
- **Service worker:** inclui os módulos novos e os da Etapa 2. O portal `/contador` responde.
- **Permissões** (teste próprio, pela API):
  - fiscal de colheita, tratorista e ADM sem liberação não recebem nada de `farm.expansion`, nem salário;
  - quando tentam gravar na equipe anual, o servidor descarta e a equipe do CEO fica intacta.

## Problemas encontrados
1. **Custo contado em dobro.** Uma compra de insumo lançada em Contas a pagar e ligada à safra entra no custo. O consumo do mesmo insumo do estoque, também ligado à safra, entra de novo. No teste, um adubo de R$ 1.000 virou R$ 2.000 no custo da saca. É preciso escolher uma regra: ou a compra vira estoque (não é custo) e só o consumo conta, ou o consumo não soma quando a compra já foi ligada.
2. **"Falta vender para cobrir custos: 0 sacas" sem nenhum custo lançado.** Isso parece "já cobriu", quando na verdade não há custo registrado. Deveria aparecer "sem custos lançados para esta safra".
3. **A mão de obra da colheita (Etapa 2) cai em "outros" e sem safra.** A conta gerada pelo fechamento semanal entra no custo como categoria "outros" e sem destino. Por isso fica fora do custo por saca e do orçamento em "mão de obra", a menos que alguém faça o rateio à mão toda semana. Deveria entrar como mão de obra, ligada à safra de café do período ou dos talhões apontados.
4. **O banho não entra no custo.** O banho concluído baixa o estoque, mas não gera consumo valorizado. Os defensivos aplicados ficam de fora do custo por saca e do orçamento.

## Correções feitas nesta revisão
1. **Custo em dobro:**
   - Contas a pagar tem a pergunta **"É compra de insumo para o estoque?"**. Se a resposta for sim, a compra não entra no custo da safra; o custo entra quando o insumo for consumido.
   - O servidor recusa compra para estoque com rateio.
   - Lançamentos de saída marcados com `toStock` também ficam de fora.
   - **Limite:** contas antigas, já gravadas sem essa marca, continuam contando como custo direto. Conta paga não pode ser alterada.
2. **Cobertura sem custo:** mostra "Sem custos lançados nesta safra" em vez de "0 sacas".
3. **Mão de obra da colheita:**
   - a conta do fechamento entra como **mão de obra**, dividida entre as safras de café dos talhões apontados naquela semana, pelo valor apontado em cada talhão;
   - com uma safra só, a chave da conta continua igual, então um rateio manual antigo segue valendo.
4. **Banho:**
   - o banho concluído entra como **insumo**: produtos que o servidor baixou do estoque × custo do item, divididos pela área dos talhões, ou em partes iguais quando falta área;
   - produto que não foi baixado não vira custo;
   - **limite:** usa o custo atual do item no estoque, não o do dia do banho.

**Arquivos alterados:** `expansao-domain.js`, `expansao.js`, `gestao.js`, `gestao-domain.js`.
**Teste novo:** `tests/revisao-custos.test.cjs`, com 6 casos. `npm test` passou a dar **128 de 128**.
**Conferido na tela:** a cobertura sem custos e a conta "para o estoque" gravada com a marca.

## Correções do dia 30/10 (segunda rodada)
1. **Safra em várias fazendas, caixas de seleção das fazendas:**
   - **Problema:** dentro da janela, a caixa ficava enorme e o clique mostrava um retângulo amarelo em volta dela.
   - **Correção:** agora fica uma caixa pequena ao lado do nome, o cartão inteiro destaca quando marcado e o contorno só aparece navegando pelo teclado (`temas-atividades.css`). Vale para todas as telas que usam esses cartões.
   - Conferido salvando uma safra em duas fazendas.
2. **Troca de senha no celular:**
   - **Problema:** o servidor encerra as sessões antigas na troca. Uma sincronização que tinha saído antes com o token antigo voltava "não autorizado" e o app desconectava a pessoa no meio da troca, o que é mais comum no 4G.
   - **Correção:** essa resposta agora é ignorada e a gravação tenta de novo em 2 segundos.
   - Depois da troca, o cofre do modo de campo é regravado com o acesso novo.
3. **Regras de senha:**
   - **O que saiu:** os padrões proibidos antigos (lista de senhas fracas e a sequência divulgada).
   - **A regra agora:** 8 a 128 caracteres, com **letra maiúscula, minúscula, número e símbolo (ex.: @)**. Vale em todo lugar: login, troca, cadastro, compra, senha temporária, contador e Super Admin.
   - **Quem tem senha antiga fora da regra:** entra normalmente, mas o app pede uma senha nova antes de abrir o painel.
   - **Continua bloqueado no login:** quem usa exatamente uma das senhas padrão que ficaram públicas só entra pelo "Esqueci minha senha".
   - **Senhas configuradas no Render** (Super Admin e CEO inicial): se estiverem fora da regra, o servidor só avisa no log e não deixa de subir. Senha com menos de 8 caracteres continua impedindo a subida.
   - **Mensagens e textos de ajuda:** a tela avisa exatamente o que falta ("Falta na senha: letra maiúscula, símbolo").

**Arquivos:** `app.js`, `server.js`, `temas-atividades.css`, `app.html`, `index.html`, `cafe.html`, `gado.html`, `graos.html`, `platform.html`, `sales.js`. Os testes `tests/support/server.cjs`, `tests/seguranca.test.cjs` e `tests/expansao-api.test.cjs` passaram a usar senhas dentro da regra, e há um teste novo da troca obrigatória. **`npm test`: 129 de 129.**

## Pontos de atenção corrigidos (30/10, terceira rodada)
1. **Cofre do celular perdido:**
   - **Limite de PIN:**
     - depois de **5 PINs errados seguidos**, o cofre trava por 5 min;
     - cada novo erro dobra a espera, até 24 h;
     - com **10 erros**, o cofre só abre depois de entrar com usuário e senha, com internet.
   - **Aparelhos registrados:** cada cofre ganha uma identificação, registrada no servidor ao habilitar. Cofres antigos ganham a identificação quando forem abertos com internet.
   - **Usuários › Aparelhos com modo de campo:** o CEO ou ADM desconecta o aparelho. Isso faz três coisas:
     - encerra as sessões da pessoa na hora;
     - registra a ação no Histórico;
     - faz o app apagar o cofre na primeira vez que esse aparelho tiver internet. Sem internet, o que protege é o PIN com o limite acima.
   - **Limite que continua:** o contador de tentativas fica no próprio aparelho. Quem souber mexer no navegador pode tentar zerá-lo; a proteção de verdade continua sendo um PIN difícil, de 6 ou mais caracteres.
2. **Apontamento atrasado em semana paga:**
   - **Não reabre a semana nem dá erro:** o apontamento fica "atrasado, aguardando revisão", com o valor do dia em que a colheita aconteceu.
   - **Revisão no escritório:** aparece em Mão de obra para o escritório aprovar ou recusar.
     - **Aprovado:** entra no pagamento da semana de acerto (a primeira semana aberta), e o recibo mostra quanto veio de atraso.
     - **Recusado:** vira estorno com motivo.
     - **Fechamento:** a semana de acerto só fecha depois da revisão.
   - **Na tela do fiscal:** ele pode lançar em semana fechada, com o aviso de que vai para revisão.
3. **Senhas comuns:** além da regra (maiúscula, minúscula, número e símbolo), são recusadas as combinações de palavra conhecida com números simples, como sequência, número repetido ou ano. Exemplos: "Fazenda@123", "Senha@2026", "Café#1234". A tela e o servidor usam a mesma lista.
4. **Super Admin com senha fora da regra:**
   - **Primeiro acesso:** só entra para trocar a senha. Todas as outras telas respondem "troque a senha".
   - **Senha nova:** fica guardada no banco, só como hash, e a do Render deixa de valer.
   - **Senha nova perdida:** `PLATFORM_ADMIN_PASSWORD_RESET=1` no ambiente volta a aceitar a senha do Render.
5. **Custo do banho pela quantidade real:**
   - **Ao concluir:** o tratorista pode informar quanto usou de cada produto em cada talhão. É opcional; em branco, vale o planejado.
   - **Com a quantidade informada:** o estoque baixa o que foi usado de verdade e cada talhão (e a safra dele) leva o próprio custo.
   - **Produtos sem quantidade informada:** continuam divididos pela área.
6. **Teste com dados reais:** continua pendente. Precisa de uma fazenda de verdade para conferir custo, comercialização e orçamento antes de vender.

**Testes novos:** `tests/pontos-atencao.test.cjs` (8 casos), `tests/cofre-pin.test.cjs` (6 casos) e mais um caso em `tests/revisao-custos.test.cjs`. **`npm test`: 144 de 144.**

### Como cada ponto foi conferido
- **PIN:**
  - **Regra:** ficou em `cofre-pin.js`, usado pelo app, com 6 testes automáticos.
  - **No navegador, com um cofre real cifrado com PIN e aberto pela função do próprio app:**
    - erros 1 a 4: "Restam 4… 1 tentativa(s)";
    - erro 5: "Cofre bloqueado por 5 min", e o PIN certo durante a espera nem é perguntado;
    - depois da espera, o PIN certo abre e zera o contador;
    - esperas a partir do 5º erro: 5, 10, 20, 40, 80 e 160 min;
    - erro 10: na tela de entrada, sem login, o PIN não é perguntado; depois de entrar, o cofre é liberado;
    - aparelho desconectado pelo CEO: o cofre foi apagado.
- **Apontamento atrasado:**
  - **Testes de regra:** 3 testes.
  - **Teste completo pelo servidor:** o CEO fecha e paga (R$ 40) → o celular do fiscal envia depois → fica em revisão e a conta paga não muda → a semana de acerto não fecha → o fiscal não aprova → o CEO aprova → o próximo fechamento gera R$ 30 numa conta nova.
- **Bug antigo achado por esse teste** (existia desde a Etapa 1):
  - **Causa:** o celular do fiscal recebe os apontamentos sem o valor e os devolve assim ao salvar. O servidor via isso como alteração de apontamento de semana fechada e recusava.
  - **Efeito:** depois de cada fechamento, o envio do fiscal falhava enquanto a semana fechada estivesse nos últimos 35 dias.
  - **Correção:** o valor volta do servidor antes da comparação (`maodeobra-domain.js`).

## O que falta, por etapa (a maior parte depende de algo externo)
- **Etapa 3, nota fiscal:**
  - emissão de NF-e e busca de notas na SEFAZ não funcionam de verdade, só existem os rascunhos;
  - falta escolher um provedor, ter o certificado digital e homologar;
  - os campos IBS/CBS existem, mas não calculam nada.
- **Etapa 5, comercialização:** o aviso de preço-alvo aparece só no painel; não chega ao celular nem ao WhatsApp.
- **Etapa 7, campo e avisos:**
  - previsão do tempo desligada (falta escolher o provedor);
  - push preparado, mas desligado (faltam as chaves VAPID e o teste no celular);
  - WhatsApp sem provedor.
- **Etapa 8, comparador e contador:**
  - **o comparador vai ficar vazio** ("dados insuficientes") até existir a busca de notas pela SEFAZ, porque só aceita notas verificadas no servidor e a importação de XML não conta;
  - a versão gratuita está desligada;
  - o contador ainda não tem "esqueci a senha".

## Não conferido
- **Teste de navegador do pacote** (`tests/expansao-browser.cjs`, que inclui o cofre offline): não rodou aqui, porque o Playwright precisa baixar o Chromium e esta máquina não tem Chrome nem Edge.
- **Cadastros pela tela das telas novas:** orçamento, armazém, documentos, convite do contador e importação de CSV não foram preenchidos pela tela nesta revisão. Eles são cobertos pelos testes automáticos do pacote.
- **Celular de verdade, PostgreSQL de produção e Render.**
