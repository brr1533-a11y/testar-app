# Assistente rural 4.3.0 — preparado e desligado

Abra **Início → Assistente IA** como CEO. A tela mantém o tema do sistema e informa que a IA está desligada. Não há chamadas nem consumo de créditos enquanto `AI_ENABLED=false`, mesmo se houver chave configurada.

## Ativar mais tarde

Configure no ambiente do servidor (não em código ou no chat):

```dotenv
AI_ENABLED=false
OPENAI_API_KEY=
OPENAI_MODEL=
AI_DAILY_REQUEST_LIMIT=10
AI_ALLOWED_GROUP_IDS=
```

Após cadastrar uma chave de projeto e escolher um modelo compatível com Responses API e web_search no painel da OpenAI, defina `OPENAI_MODEL` e só então mude `AI_ENABLED=true` e reinicie o servidor. A chave nunca é enviada ao navegador. Não é necessário build. Nunca publique `.env` com segredos. Caso use um arquivo de ambiente local, o projeto não o lê automaticamente: use o mecanismo de variáveis do seu serviço, ou o suporte `node --env-file=.env server.js` em Node 20.6+.

`AI_ALLOWED_GROUP_IDS` aceita IDs internos (não os códigos de login) dos grupos permitidos, separados por vírgula; vazio permite a todos os CEOs dos grupos ativos. ADM, fiscal, tratorista e outros contribuintes não têm acesso nesta primeira versão. Sem chave ou modelo, a integração permanece indisponível.

## O que faz

- **Buscar preços na internet:** exige busca externa e referências clicáveis. Solicita data, região, unidade, moeda e condições da cotação. Resposta sem fonte válida não é apresentada como cotação confirmada. Não altera Mercado nem registra compra/venda.
- **Explicar uma dúvida:** resposta consultiva sobre gestão rural, sem busca obrigatória nem garantia de dados atuais.
- Somente a pergunta digitada é enviada, após a confirmação na tela. O banco da fazenda não é anexado. Não analisa automaticamente contas, notas, estoque ou laudos. Cada pergunta é independente; não há histórico de conversa.
- Não executa ações no sistema. Não compra, não lança, não emite notas nem altera cadastros. Não substitui profissional responsável.

## Créditos e limites

A cobrança é da conta de API configurada, incluindo busca externa e tokens do modelo. Não mede nem promete saldo no painel; uma resposta 429 do provedor pode indicar limite ou créditos indisponíveis. Confira Billing/Usage no provedor.

Limite inicial de **10 tentativas/dia UTC** no servidor e **5 por grupo** (`AI_DAILY_GROUP_LIMIT`), contando erros. Desde a 4.16.4 o contador fica guardado no banco: não zera ao reiniciar e vale para todas as cópias do servidor. Há uma consulta simultânea por processo, até 1 chamada de ferramenta e até 1.200 tokens de saída por consulta. Perguntas até 1.500 caracteres. Timeout de 45 segundos sem repetição automática.

O contador fica na configuração do banco e é o mesmo depois de reiniciar o servidor. Duas cópias do servidor gravando no mesmo instante podem, raramente, contar uma tentativa a menos. É uma proteção operacional, **não um teto financeiro**. Configure controles adicionais no provedor e mantenha a IA desligada até decidir o orçamento. `store=false` não equivale a zero retenção no provedor. Os tratamentos do provedor continuam aplicáveis.

## Validação e limites da entrega

227 testes automatizados passaram: os 222 anteriores e 5 novos, incluindo configuração desligada, chave não exposta, CEO exclusivo, consentimento, limites, respostas com fontes e erros do provedor. As chamadas pagas foram simuladas, sem chave real e sem consumir créditos. A integração real com o modelo escolhido ainda precisa ser validada depois da ativação e da disponibilidade de créditos.

Arquivos adicionados: `ia-server.js`, `ia.js`, `ia.css`, `tests/ia.test.cjs`, este guia e manifesto da versão. Alterados: `server.js` (rotas e arquivos públicos), `app.js` (página), `app.html` (scripts/estilo), `.env.example` (configuração), `privacidade.html` (envio opcional), `package.json`, `package-lock.json` e `campo-sw.js` (cache atualizado).

O pacote mantém todas as melhorias 4.2.0. Não foi enviado ao GitHub ou ao Render.

Documentação oficial consultada:
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://developers.openai.com/api/docs/guides/migrate-to-responses
- https://developers.openai.com/api/docs/pricing
- https://developers.openai.com/api/docs/guides/chatgpt-api-credits
