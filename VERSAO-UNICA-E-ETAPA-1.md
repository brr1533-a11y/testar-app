# Versão única + Etapa 1 (mão de obra da colheita)

Esta pasta junta as duas versões que existiam e acrescenta a Etapa 1:

- **GitHub `main`** (versão 23), que é a base;
- **V1**, a versão local feita por outro chat.

Está publicada no repositório `testar-app`.

## 1. O que veio de cada versão

| Parte | Escolhida | Por quê |
|---|---|---|
| Segurança, planos e preços, funções por plano, teste grátis | versão 23 | O V1 não tinha. |
| Compras, cotações com preço automático, pedidos, contas a pagar, contratos, conciliação, XML | versão 23 | Já integradas a planos, permissões e LCDPR. O XML guarda os itens das notas, o que ajuda no comparador de preços futuro. |
| Livro Caixa | versão 23 | Gera o arquivo oficial (leiaute 1.3); o V1 só exportava para conferência. |
| Mercado ao vivo | versão 23 | Arroba corrigida, mais café e grãos. |
| Pós-colheita, pragas, reprodução, sanidade, GTA, leite | versão 23 | Mais completos (lotes com rendimento, cadastro de vacas, GTA que não pode ser apagada). |
| Permissões do ADM por página | versão 23 | Já ligadas ao menu, aos planos e ao servidor. |
| **Manutenção e combustível** | **V1** | A versão 23 não tinha. |
| **Rastreabilidade dos lotes** | **V1** | A versão 23 não tinha. |
| **Mapa da fazenda (croqui)** | **V1** | A versão 23 não tinha. |
| **Central de alertas** | **V1**, adaptada | Lê os dados da versão única: estoque, agenda, contas, pedidos, manutenção, vacinas, pragas e análises. |
| **Uso sem internet (Modo de campo)** | **V1** | Cofre **cifrado com PIN**; a versão 23 guardava uma cópia sem cifra. |
| **Grupos do menu que recolhem** | **V1** | — |
| **Alçada de aprovação** | **V1**, levada para os pedidos da versão 23 | O CEO define até quanto o ADM aprova sozinho. |
| **Parto dá entrada dos bezerros no lote** | **V1**, levado para a reprodução da versão 23 | Entra uma única vez, sem lançar despesa. |

Itens do V1 que **não** entraram, porque a versão 23 já cobre:
- fornecedores, cotações e pedidos;
- contas com pagamento parcial;
- contratos, extrato e XML;
- leite, reprodução e pragas do V1;
- o livro caixa só de conferência;
- a consulta de preço de fornecedor do V1.

Se houver dados de teste do V1 nessas áreas, eles continuam guardados, mas não aparecem nas telas.

## 2. Etapa 1 — Mão de obra da colheita de café

**Telas novas (Lavoura):**
- **Mão de obra da colheita**, para o CEO, e para o ADM se o CEO liberar. Tem quatro abas:
  - **Pessoas:** panhador, safrista ou diarista, com CPF opcional e validado, Pix, WhatsApp, diária combinada e valor por saco próprio opcional.
  - **Valores por talhão:** valor do saco com data de início. Mudar o valor não mexe no que já foi apontado.
  - **Lançamentos da semana:** prévia do fechamento, apontamentos, adiantamentos e descontos, estornos com motivo.
  - **Fechamentos:** fechar a semana, recibos para imprimir e WhatsApp com o texto pronto.
- **Apontar colheita**, a tela do fiscal no celular:
  - escolhe o talhão e a data;
  - botões grandes de **+ / −** saco e **Diária** por pessoa, e Salvar;
  - funciona **sem internet** no Modo de campo.

**Regras (o servidor confere):**
- O valor de cada apontamento fica **congelado** no dia do lançamento. O valor que a tela manda é ignorado.
- **Fechamento** semanal (segunda a domingo): sacos × valor + diárias − adiantamentos − descontos, em centavos.
  - Se o total ficar negativo, a pessoa recebe R$ 0 e o resto passa como **saldo devedor** para a semana seguinte.
- Fechar a semana **trava** os lançamentos dela e cria **uma conta a pagar por pessoa**, sem duplicar.
  - O valor e a pessoa dessa conta não podem ser alterados. O pagamento segue o fluxo normal de Contas a pagar.
- Apontamento e adiantamento não são apagados, só **estornados** com motivo.

**Perfil "Fiscal de colheita"** (Usuários › função do perfil de campo):
- Só vê **Apontar colheita**, **Modo de campo** e **Perfil**.
- Recebe os nomes da turma e os talhões. **Não** recebe CPF, Pix, telefone, valores, adiantamentos nem nada financeiro.
- Só cria apontamentos, e só corrige os próprios enquanto a semana está aberta.

**Telas afetadas:**
- **Safras e produção (café):** quadro "Colheita manual · sacos da roça" por talhão, só leitura.
- **Contas a pagar:** recebe as contas do fechamento, na categoria "Mão de obra (colheita)".
- **Usuários:** nova função "Fiscal de colheita".
- **Permissões do ADM:** nova página "Mão de obra da colheita" (mostra valores).

## 3. App de celular (fiscal e tratoristas)

- **Instalável** no Android ("Instalar app") e no iPhone (Compartilhar › Adicionar à Tela de Início), com ícone próprio.
- O **Modo de campo** aparece para todos, inclusive o fiscal e o tratorista, com o passo a passo:
  - habilitar com PIN (conectado);
  - instalar;
  - sem sinal, abrir com o PIN.
- **Tratorista:** usa sem internet o Meu trabalho hoje, os Equipamentos e os Banhos liberados, e tudo sincroniza ao pegar sinal.
- **Conexão:** o cofre offline não expira por tempo; a sessão do servidor continua sujeita à validação quando houver conexão. O PIN não tem recuperação.
- **Atualização do app:** o servidor gera o service worker (`/campo-sw.js`) ao iniciar, com a versão calculada pelos arquivos. Não há passo manual.

## 4. Testes

`npm test` roda **82 testes**, todos passando. Eles cobrem:
- o que já existia;
- as partes do V1 (rastreabilidade, manutenção, mapa, parto e alçada);
- a Etapa 1: cálculo do fechamento, saldo devedor, valor congelado, semana travada, contas a pagar sem duplicar e o fiscal sem CPF, Pix ou valores, inclusive pela API.

**Conferido no navegador:**
- o fiscal no celular, apontando e salvando;
- sem internet: guardado cifrado e enviado ao voltar o sinal;
- o tratorista;
- o CEO fechando a semana e abrindo os recibos.

**Não testado:** a instalação num celular de verdade (Android e iPhone) e a impressão em papel.

## 5. Fica para depois (não feito)

- Rendimento por talhão.
- Quantos sacos da roça rendem uma saca beneficiada.
- Custo de colheita por saca.
- Ligação com o café armazenado.
