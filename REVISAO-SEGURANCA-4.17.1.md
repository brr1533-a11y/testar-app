# Revisão de segurança — 4.17.1 e 4.17.2

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

## 4. Corrigido na 4.17.2: o cursor pulava para a data no meio da digitação

**Sintoma:** na nota fiscal (e em qualquer janela de cadastro), às vezes um campo recém-digitado ficava vazio, como a quantidade ou o preço do item. O rascunho era recusado com "Item fiscal incompleto".

**Causa** (achada com um vigia de eventos dentro do roteiro completo):
- quando uma janela abre, o sistema põe o cursor no primeiro campo depois de 30 ms (`app.js`, `openDialog`);
- com a tela ocupada (sincronização, modo de campo), essa espera atrasa;
- se a pessoa já estava digitando em outro campo, o cursor era puxado para a data e o resto do texto se perdia.

Pode acontecer com gente de verdade em celular lento.

**Correção:** o cursor só vai para o primeiro campo se a pessoa ainda não estiver em um campo da janela, e se a janela não tiver sido fechada.

**Prova:**
- `expansao-browser`: falhava em cerca de 1 de cada 3 rodadas e passou em **12 de 12** depois da correção;
- teste novo `tests/foco-janela-browser.cjs` (`npm run test:focus:browser`): passa com a correção e **falha sem ela**.

## 4.1 Também na 4.17.2: o painel abre na metade do tempo no celular

**Antes:** a entrada do painel baixava 102 arquivos de script e estilo, com 1,5 MB, sem compressão.

**Agora:** o servidor comprime páginas, scripts, estilos, SVG e JSON com a biblioteca `compression`, da equipe do Express. Fica em cerca de 0,5 MB.

**Medido no "celular fraco"** (CPU 4 vezes mais lenta e 3G de 1,6 Mbps): a tela de entrada caiu de **9,1 s para 4,5 s**.

**Respostas da API:** ficam **sem** compressão de propósito. Comprimir respostas que misturam a sessão com texto digitado pela pessoa abre brecha para o ataque BREACH.

**Conferido nas sondas de segurança:** os arquivos do site saem comprimidos, e a API não.

**Biblioteca nova:** `compression` ^1.8.2. No `package-lock.json` entram só ela e 3 dependências dela, sem mudar nenhuma outra.

## 5. O que não foi feito

- **Os 9 avisos moderados das bibliotecas do ExcelJS:** trocar a biblioteca pode quebrar a importação de planilhas.
- **Teste em celular de verdade e câmera lendo o QR.**
- **Teste de carga** (muitos usuários ao mesmo tempo).
