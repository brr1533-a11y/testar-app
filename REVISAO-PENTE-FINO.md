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
