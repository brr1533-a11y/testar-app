# Correção de sincronização e aviso incorreto de internet

## O que as capturas mostram
O app já está instalado no iPhone. A tela reconhece conexão, mas a sincronização passa por conflitos de versão e informa Sem internet. O cofre aparece fechado ou ainda não configurado.

## Problemas reproduzidos e corrigidos
- Comparação dos dados dependia da ordem das chaves JSON. O PostgreSQL pode devolver outra ordem sem alterar os valores; isso gerava falsas pendências e junções desnecessárias. A comparação agora ignora a ordem das propriedades, preservando a ordem das listas e diferenças de valores.
- Tentativa de resolver conflito começava outra gravação antes do finally da anterior. A anterior podia liberar a trava enquanto a próxima ainda estava em andamento. As tentativas agora começam depois de liberar a operação anterior.
- Conflitos repetidos e respostas de erro HTTP caíam no aviso Sem internet. Agora cada caso mostra uma mensagem própria, mantendo as alterações pendentes para nova tentativa.
- O aviso só afirma que os dados estão no cofre se ele estiver habilitado. Sem cofre, informa pendências nesta sessão.

Não houve acesso à conta do usuário nem aos logs privados do Render. Esses defeitos foram reproduzidos localmente; a causa completa de cada resposta do servidor publicado ainda depende dos logs ou de novo teste após atualização.

## Arquivos desta correção
- app.js: comparação de JSON, trava de sincronização, tentativas e mensagens de erro.
- campo-sw.js: cache regenerado com a versão nova.
- tests/sincronizacao-browser.cjs: regressão de ordem das chaves, conflitos, limite de tentativas, preservação de pendências e erro HTTP 503.
- tests/pwa-investigacao.cjs: teste local de instalação do worker e abertura offline com PIN.

O ZIP também contém as correções anteriores de piscada, ordem dos scripts da mão de obra e preparação do Render. Nenhuma regra de negócio ou server.js foi alterado.

## Validação
- 79 testes automatizados: passaram.
- Teste de sincronização: passou, incluindo conflitos simulados e servidor temporariamente indisponível.
- Teste da piscada: passou.
- Teste geral no navegador: passou, incluindo gravação, persistência e larguras de celular/computador.
- Cache offline novo e painel com PIN sem rede: passaram em navegador de teste local.
- Ainda requer novo teste no iPhone real após publicação desta versão.

## Publicação

Atualização preparada para o repositório brr1533-a11y/testar-app após autorização do usuário. Também foram restaurados os ícones PNG e as ilustrações SVG ausentes em assets/, além da pasta tests/ com o suporte dos testes. Os ícones ausentes respondiam com HTML, mesmo com HTTP 200; o teste de PWA agora verifica tipo MIME e assinatura dos PNGs.

Após o deploy no Render, abrir o app com internet para receber o cache novo. Não remover o app nem limpar o Safari enquanto houver lançamentos pendentes. Senhas, variáveis de ambiente e banco não foram alterados.
