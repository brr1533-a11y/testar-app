# Gestão Rural 4.4.0 — assistente e revisão dos roteiros

Este ZIP é o sistema completo e mantém as melhorias anteriores. **Não foi enviado ao GitHub ou Render. A IA externa continua desligada.** As instruções deste arquivo substituem as descrições do assistente 4.3.0; os guias anteriores permanecem como histórico das versões.

## Ajuda para usar o sistema

Entre em **Início → Assistente e ajuda**, ou use o botão **Assistente** da tela em que estiver.

O **Guia do sistema** tem 78 orientações locais e pesquisa por assunto: safras, colheita, sacas/kg, talhões, satélite, solo/foliar, terreiro, gado, leite, tratores, tanque, planilhas, financeiro, contas, LCDPR, fiscal, permissões, Modo de campo e demais módulos. Os botões abrem telas já disponíveis no menu do usuário. Os guias funcionam sem chave de IA; não fazem chamada paga. Não são respostas de um modelo e não devem ser apresentados como IA online. Depois que os arquivos do app foram armazenados pelo service worker, os guias também podem ser usados sem rede, com o acesso offline já habilitado.

## Conversa com IA (preparada; requer ativação posterior)

- **Ajuda para usar o sistema:** a pergunta vai acompanhada de trechos do manual verificado e perfil/função, para orientar os passos e explicar dificuldades sem inventar integrações.
- **Dúvida sobre a rotina rural:** conversa consultiva sobre os conceitos, cálculos e cadastros. Não substitui agrônomo, veterinário ou contador.
- **Pesquisar preços:** exige busca na internet e fontes clicáveis. Consulta independente, sem anexar resumo da fazenda nem histórico de conversa. Confira data, praça, unidade, qualidade, frete e tributos antes de negociar.
- **Analisar resumo da fazenda:** somente CEO/ADM. Primeiro selecione a fazenda, confira o resumo e autorize o envio. Ele contém contagens, área, produção histórica, estoque, tanque e até 12 meses de totais financeiros quando o perfil tem a tela de balanço liberada. Não responde sobre campos não incluídos. Não faz análise automática de cada registro, documento ou laudo.

A conversa usa até oito mensagens anteriores, truncadas a 1.500 caracteres por mensagem na interface. O servidor limita a 12.000 caracteres de histórico e 2.500 da pergunta. O histórico fica apenas na memória da página, separado por grupo, usuário, acesso, fazenda e atividade. Sair, recarregar, limpar a conversa ou mudar o escopo encerra esse histórico. Não há arquivo com conversas nem histórico persistente entre aparelhos.

Todos os usuários autenticados podem consultar o guia e, quando habilitada, conversar. Fiscal e tratorista não têm resumo de dados da fazenda. ADM só recebe campos permitidos, e valores financeiros exigem a página específica de balanço; poder lançar entradas/saídas não libera leitura de saldos. Atividade e fazenda são conferidas no servidor. O resumo vem da projeção autorizada e não de dados enviados pelo navegador. Um hash vincula a autorização à identidade, escopo e valores mostrados; mudança antes do envio exige nova conferência.

Não são anexados: usuários/senhas, CPF, Pix, dados bancários, coordenadas, anexos ou banco completo. Não digite esses dados na pergunta. Uma resposta de análise pode reaparecer no histórico enviado nas perguntas seguintes autorizadas; pesquisa de preços começa sem esse histórico. A IA não compra, paga, emite notas, apaga, edita, libera permissões ou executa operações no site.

## Ativar depois, mantendo desligado agora

Configure apenas no ambiente do servidor:

```dotenv
AI_ENABLED=false
OPENAI_API_KEY=
OPENAI_MODEL=
AI_DAILY_REQUEST_LIMIT=10
AI_ALLOWED_GROUP_IDS=
```

Quando tiver crédito e chave de projeto da OpenAI, escolha um modelo compatível com Responses API e web_search, configure `OPENAI_API_KEY` e `OPENAI_MODEL`, mude `AI_ENABLED=true` e reinicie. Vazio em `AI_ALLOWED_GROUP_IDS` libera todos os grupos ativos; para restringir, informe IDs internos separados por vírgula. Não use o código de login como ID interno. Não envie a chave no chat nem no ZIP.

Sem chave, modelo ou ativação explícita, a conversa permanece indisponível. O projeto não lê `.env` sozinho: use as variáveis do serviço ou `node --env-file=.env server.js` em Node 20.6+. A configuração é de servidor, não uma senha digitada no navegador.

Limites: 10 tentativas/dia UTC globalmente por processo, uma consulta simultânea, timeout de 45 s, até uma chamada de busca e 1.800 tokens de saída por resposta. Contam também tentativas com erro, sem repetição automática. O contador reinicia com o servidor; várias instâncias têm contadores distintos. Isso é proteção operacional, não um teto financeiro persistente. Confira cobrança/limites no provedor antes de ativar. `store=false` não significa zero retenção pelo provedor.

## Validação

- 238 testes automatizados de domínio/API/auxiliares passaram (zero falhas), incluindo os 222 originais, testes de IA simulada, isolamento do resumo, consentimento e navegação.
- Os 59 arquivos de teste `.cjs` na raiz de `tests` foram conferidos por `node --check`.
- Navegador local: pesquisa no guia, abertura por ajuda contextual, abas da conversa com IA desligada, resumo para conferência sem envio ao provedor, abertura de categoria do menu antes de Talhões e expansão de Lavoura antes de marcar módulos.
- As chamadas ao provedor foram simuladas. Não foi usada chave real nem consumido crédito. Ainda é necessário validar respostas reais com o modelo escolhido após a ativação.
- Os roteiros antigos de navegador foram corrigidos, mas **a bateria completa de 20 roteiros não foi reexecutada nesta rodada**. Os 238 testes acima não substituem essa bateria, modo avião, Android/iPhone reais ou banco PostgreSQL de produção.

## Roteiros de navegador e túnel

Veja `REVISAO-ROTEIROS-E-PREVIA.md`. As categorias do site continuam fechadas por padrão; os testes passam a abri-las antes de interagir, sem `force: true` nem mudança de permissão. Na verificação desta entrega não havia processo `cloudflared` em execução. A demonstração em `127.0.0.1` permanece apenas local. Não foi criado outro túnel.

## Arquivos desta rodada

- `ia-ajuda.js`: manual local e pesquisa.
- `ia-assistente.js`, `ia.css`, `app.html`: guia, conversa, atalhos e conferência do resumo.
- `ia-contexto.js`: resumo mínimo com validação de acesso e confirmação por hash.
- `ia-server.js`, `server.js`: manual na consulta, histórico limitado e rotas autenticadas.
- `privacidade.html`: transparência do envio opcional.
- `tests/ia.test.cjs`, `tests/ia-completa.test.cjs`: validação da integração preparada.
- `tests/support/navigation.cjs`, `tests/navigation.test.cjs` e nove roteiros listados no relatório: adaptação às categorias.
- `package.json`, `package-lock.json`, `campo-sw.js`: versão 4.4.0 e cache dos novos arquivos.
- Este guia, relatório e `ALTERACOES-ASSISTENTE.json`: instruções e hashes para revisão.

Documentação oficial consultada: https://developers.openai.com/api/docs/guides/conversation-state e https://developers.openai.com/api/docs/guides/tools-web-search.
