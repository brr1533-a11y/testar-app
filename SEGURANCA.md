# Segurança — correções da revisão da v22

Este arquivo resume as correções de segurança e de integridade dos dados feitas a partir da revisão da v22,
já juntadas ao sistema completo (Café, Gado, Grãos, histórico de talhões e de safras).
Os códigos (C1, A4...) são os da revisão.

## O que fazer no Render ao publicar

1. Confirme `NODE_ENV=production`.
2. Depois do deploy, confira no log a linha `[proteções]`. Ela deve dizer `modo: PRODUÇÃO`, `compra de teste: desligada`, `chave legada da plataforma: recusada` e `assinatura do webhook: conferida`.
3. Remova `PLATFORM_SETUP_KEY` do serviço de produção.
4. Defina `MERCADOPAGO_WEBHOOK_SECRET` com a assinatura secreta do painel do Mercado Pago.
5. **Senhas:** a sequência antiga que circulou no README agora é recusada, sozinha ou dentro de outra senha. Em produção, se `SEED_CEO_PASSWORD` ou `PLATFORM_ADMIN_PASSWORD` a contiverem, o servidor não sobe: troque antes do deploy. Quem entrar com uma senha que a contém é obrigado a trocá-la; a senha antiga pura não abre sessão (use "Reset CEO" no `/platform` ou "Esqueci minha senha").
6. Teste de compra só num serviço separado, com `TEST_MODE_UNTIL` (veja abaixo).

## Correções

### Contas e senhas
- **Senha vazada ou fácil não abre sessão.** Quem conhece uma senha da lista de bloqueadas não consegue mais entrar e "trocá-la" para tomar a conta: só o código por e-mail (ou o Super Admin) libera. A lista não diferencia maiúsculas de minúsculas.
- **Senha derivada da sequência vazada** é recusada em qualquer cadastro ou troca, e obriga a troca no login.
- **Ninguém de fora consegue bloquear o CEO (A5):** o limite de erros por usuário vale por rede (8 em 15 min); um teto de 50 erros por usuário somando todas as redes continua barrando quem tenta adivinhar a senha trocando de rede.
- **Recuperação de senha:** no máximo 5 códigos por pessoa por dia (cada código já tinha 5 tentativas).
- **Troca de e-mail de recuperação:** além do limite de tentativas, o e-mail antigo recebe um aviso (quando o envio de e-mail está configurado).
- **Senha definida pelo CEO** em qualquer tela vale como temporária e desconecta a pessoa.
- **Limites de tentativa** na troca de e-mail, no login do Super Admin (também somando todos os IPs) e na chave antiga do painel.
- Comparação de segredos em tempo constante, sem revelar o tamanho do segredo.
- O tempo de resposta do login não revela mais quais usuários existem.
- O botão "Sair" encerra a sessão também no servidor. Sessões vencidas são apagadas de hora em hora.

### Dados que sumiam (C1, C3, A4)
- **C1:** cadastro, aprovação, criação de usuário, senhas, e-mail e o painel `/platform` conferem a versão dos dados e refazem a alteração se alguém salvou no meio. Status e plano do Grupo são gravados à parte dos dados.
- **C3:** nas telas, um cadastro ou edição feito enquanto chega uma atualização do servidor não se perde mais.
- **A4:** gravação sem a versão de base (`baseRev`) é recusada em vez de sobrescrever.
- Alteração recusada pelo servidor (máquina ocupada, atividade não contratada, histórico protegido) volta a tela ao que está gravado, em vez de reenviar a cada sincronização. Recusas de atividade não contratada passam a responder 422.

### Rotas públicas e configuração (C2, C4, C5)
- **C2:** corpo de até 64 KB nas rotas públicas e de login (só os dados do Grupo e os anexos aceitam mais). Nome até 120 caracteres, PIX até 140, e-mail até 254, senha até 128. No máximo 50 cadastros pendentes por Grupo; os com mais de 30 dias saem sozinhos.
- **C4:** o código de recuperação de senha nunca aparece na resposta (em desenvolvimento ele vai para o log do servidor). Em produção, o modo de compra de teste exige `ALLOW_TEST_MODE_IN_PRODUCTION=true` e `TEST_MODE_UNTIL` (no máximo 7 dias à frente) e se desliga sozinho no prazo.
- **C5:** no Render (variável `RENDER`) ou com `DATABASE_URL`, o servidor se trata como produção mesmo sem `NODE_ENV`. Para rodar sem as proteções é preciso dizer `NODE_ENV=development`. `SESSION_DAYS` inválida impede o servidor de subir.
- **Desenvolvimento só no próprio computador:** fora de produção, o servidor escuta apenas em `127.0.0.1` (antes ficava aberto para a rede local, com a chave antiga do painel aceita). `HOST=0.0.0.0` libera, se precisar.
- **A7:** `TRUST_PROXY` define quantos proxies ficam na frente do app; a linha `[proteções]` mostra o valor em uso.
- Cotações (`/api/mercado`, `/api/cotacao-cafe`) não devolvem o motivo técnico da falha em produção.

### Pagamentos (A1, A2, A3)
- **A1:** com `MERCADOPAGO_WEBHOOK_SECRET`, o aviso do Mercado Pago só é aceito com assinatura `x-signature` válida (HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, conforme a documentação); assinatura ausente ou falsa recebe 401 e não gera consulta. Avisos de outros tipos (pagamentos) são ignorados. Rota com limite por rede.
- **A2:** o webhook e a consulta da compra não tiram mais um Grupo de "arquivado" nem desfazem uma suspensão manual. Arquivar de novo funciona mesmo com a assinatura já cancelada.
- **A3:** uma compra cria um Grupo só, mesmo com dois envios ao mesmo tempo.
- Consulta pública da compra com limite por rede e só com identificador válido.

### Campo (A9, A10, A14)
- **A9:** o servidor recusa trator ou implemento já reservado no dia ou fora de "Disponível", e o trabalhador recebe a lista de máquinas ocupadas (sem nomes).
- **A10:** o log de equipamento é só de acréscimo; os dados de cada trabalho do dia são refeitos a partir do cadastro da fazenda; a atividade (`activityModule`) precisa estar liberada para o trabalhador e contratada pelo Grupo; a hora oficial é a do servidor (a do celular fica em `reportedAt`); trabalho do dia e log entram no histórico de alterações. Como o histórico do talhão usa esses logs, ele também fica à prova de alteração.
- **A14:** quem tenta entrar com cadastro ainda pendente recebe "aguardando aprovação do CEO", sem contar como tentativa errada.

### Produção (Grãos e Café)
- O ADM não recebe preço de venda nem custo planejado (mesma regra do balanço). Ao salvar, vendas já gravadas ficam como estão (vendas novas entram, com preço obrigatório) e o custo das safras existentes vem do servidor. A tela do ADM valida sem esses campos e mostra "—" no lugar do valor.

### Anexos, exportações e armazenamento
- Anexos que chegam dentro dos dados passam pela mesma checagem do envio normal (só foto ou PDF de verdade, até 2 MB). Arquivos de outro tipo são baixados em vez de abertos na tela, e todos saem com `Content-Security-Policy: sandbox`.
- Exportações para Excel (CSV): texto que começa com `=`, `+`, `-`, `@` ou tabulação não vira fórmula; números negativos continuam sendo números.
- Tela de compra concluída: o nome do Grupo é exibido como texto (não como HTML).
- O banco local de desenvolvimento não é mais apagado se o `.local-cloud.json` estiver ilegível, e a gravação é atômica.
- Índices no banco para buscas por assinatura e sessões. Opcional: `DATABASE_SSL_STRICT=true` passa a conferir o certificado do PostgreSQL.

## Ainda em aberto (segurança)
- Limites de tentativa ficam na memória do servidor: rode uma instância só (ou mova para o banco/Redis antes de escalar).
- A8: cada consulta de 12 s carrega os dados inteiros do Grupo (desempenho).
- Enumeração de Códigos de Grupo pelo cadastro público (o código tem 4 dígitos).
- Cota de anexos por Grupo e sessões sem renovação automática.
- Sessões, desafios 2FA e auditoria do Super Admin gravados num registro único (dois logins simultâneos podem perder uma entrada).
