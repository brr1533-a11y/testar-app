# Revisão de segurança — 4.17.1

Feita sobre a 4.17.0 (`gestao-rural-completo-duo-4.17.0.zip`), de 4 para 5/11/2026. Nenhuma tela, regra, permissão ou dado de cliente mudou.

## 1. Correções trazidas da 4.16.4

A 4.17.0 foi feita em cima da 4.16.3 e não tinha as correções da 4.16.4, que já estão no GitHub do `testar-app`. Elas foram aplicadas de novo.

- **Limite diário da IA (a IA continua desligada):**
  - o contador fica guardado no banco: não zera ao reiniciar e vale para todas as cópias do servidor;
  - cada grupo tem seu limite (`AI_DAILY_GROUP_LIMIT`, padrão 5), dentro do limite geral do servidor (`AI_DAILY_REQUEST_LIMIT`, padrão 10).
- **Roteiros de navegador** que não tinham acompanhado as mudanças de propósito da 4.9, 4.10 e 4.14:
  - `browser`, `seasons` e `soil`: o clique vai no botão **Filtrar**;
  - `operacao`: confere o perfil de qualidade do café por faixas;
  - `themes-inputs`: aceita o degradê do visual do painel.

Detalhes em `REVISAO-4.16.4.md`.

## 2. Testes de segurança novos

| Teste | Como rodar | O que confere |
| --- | --- | --- |
| `tests/seguranca-sondas.test.cjs` | `npm run test:security` (também entra no `npm test`) | Ver a lista abaixo |
| `tests/xss-browser.cjs` | `npm run test:security:browser` | Ver a lista abaixo |

**O que confere `tests/seguranca-sondas.test.cjs`:**
- `server.js`, `.env`, `package.json`, banco local, testes, `node_modules` e módulos de servidor não são servidos, inclusive com `../`;
- os cabeçalhos de proteção estão presentes (CSP sem script embutido, bloqueio em moldura, `nosniff`, `Referrer-Policy`, sem `X-Powered-By`);
- erro não mostra detalhes internos, e corpo gigante é recusado;
- rotas de dados exigem login;
- o funcionário não recebe valores do Financeiro, senhas nem e-mails da equipe, e não consegue gravar no Financeiro nem criar usuário;
- depois de sair, a sessão não vale mais;
- outro Grupo não vê os dados, nem pelos QRs, nem pela exportação do contador.

**O que faz `tests/xss-browser.cjs`:**
- sobe o site fictício;
- põe uma "isca" de código em todos os nomes e textos e cria registros novos com a isca nas listas protegidas (parceria, financiamento, arrendamento, prestador, documento, equipe, ordem de serviço, animal, conta a pagar, contrato e colhedor);
- abre todas as telas nos três modos, os formulários e o Super Admin;
- falha se alguma isca virar código na tela.

## 3. Resultado

- **`npm test`:** 321 de 321 (os 319 da 4.17.0, o caso novo do contador da IA e as sondas de segurança).
- **Roteiros de navegador:** 19 de 20. O `expansao-browser` falha às vezes (2 de 6 rodadas), sempre no mesmo ponto; ver o item 4.
- **Injeção (XSS):** 45 textos com isca e 196 telas abertas; **nenhuma isca virou código**.
- **Sondas da API:** todas passaram.

## 4. Achado para investigar

**A quantidade do item da nota fiscal às vezes fica vazia.** Em Emissão e busca de NF-e › novo rascunho, o roteiro preenche nome, NCM, quantidade, unidade e preço do item. Em cerca de 1 de cada 3 rodadas, só a **quantidade** aparece vazia logo depois de digitada, e o rascunho é recusado com "Item fiscal incompleto". A janela é a única aberta, e os outros campos ficam certos.

Não foi achado nenhum código que limpe esse campo, então a causa ainda não está provada.

- **Isolado, não acontece:** com o campo vigiado (quem muda o valor, os eventos e a pilha da chamada), o formulário aberto e preenchido 25 vezes seguidas, numa sessão limpa, não falhou nenhuma vez.
- **Na sequência completa do `expansao-browser`, acontece:** antes disso o roteiro liga o modo de campo com PIN, sincroniza e abre outros formulários, inclusive o orçamento, que usa a mesma lista de itens.

A suspeita fica entre o modo de campo, a sincronização e a recuperação de rascunho da 4.2. O próximo passo é rodar a mesma vigilância dentro do `expansao-browser`. Pode afetar quem preenche a nota logo depois de usar o modo de campo.

## 5. O que não foi feito

- **Os 9 avisos moderados das bibliotecas do ExcelJS:** trocar a biblioteca pode quebrar a importação de planilhas.
- **Teste em celular de verdade e câmera lendo o QR.**
- **Teste de carga** (muitos usuários ao mesmo tempo).
