# Manter conectado neste aparelho

Na tela de login, marcar Manter conectado neste aparelho e entrar normalmente. Ao abrir novamente conectado, o app valida a sessão no servidor e abre o painel. O prazo é o da sessão já definido pelo servidor; não há alteração nas regras de autenticação.

Somente o token da sessão e sua validade ficam persistidos neste aparelho. A senha não é armazenada. A opção começa desmarcada. Sair apaga o token persistente e encerra a sessão no servidor. Sessões vencidas, revogadas ou com troca obrigatória de senha retornam ao login. Falhas temporárias de rede não apagam uma sessão válida.

Sem internet, permanece o acesso pelo PIN do Modo de campo; o acesso salvo não abre automaticamente os dados do cofre.

Arquivos alterados nesta etapa:
- app.html: opção na tela de login e indicador durante a validação da sessão salva.
- app.js: persistência opcional do token, validade, restauração validada no servidor, atualização do token nas trocas de senha e remoção ao sair.
- app-minimal.css: aparência da opção e do indicador de entrada.
- campo-sw.js: cache offline regenerado.
- tests/login-persistente-browser.cjs: reabertura, opção desmarcada, expiração, revogação, falha temporária, remoção ao sair e ausência da senha no armazenamento.

Validação: 79 testes automatizados passaram; os testes de login persistente, PWA offline com PIN, sincronização, piscada e navegação geral também passaram. Teste em iPhone real ainda deve ser repetido após publicação.

O ZIP preserva as correções anteriores, imagens e arquivos de produção. Não contém banco, senhas reais, .env real ou node_modules.
