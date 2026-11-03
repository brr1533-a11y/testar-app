# Primeiro acesso — 4.6.1

Nova apresentação do primeiro acesso local: verde escuro, fundo claro, identificação do grupo/usuário, campos com rótulos permanentes e requisitos próximos da senha. Layout em duas colunas em telas largas e uma coluna no celular, foco visível e suporte a movimento reduzido. Erros voltam ao próprio formulário, sem repetir a senha.

## Limite entre local e produção

`primeiro-acesso-template.html` é o modelo visual e `tools/primeiro-acesso-local.cjs` é um adaptador para o iniciador exclusivamente local. Ele não é registrado pelo `server.js`, não abre uma rota pública de redefinição e não altera contas no Render. A inicialização local deste computador permanece em um iniciador separado, fora do ZIP/GitHub, com credencial temporária apenas em memória. Senhas novas são definidas pessoalmente pelo usuário.

O adaptador confere origem, CSRF e tamanho do formulário; exige confirmação e 10–128 caracteres; a API original confere os demais requisitos e altera o hash. O formulário funciona sem JavaScript ou serviços externos. A conclusão invalida a sessão usada para preparar o primeiro acesso e encaminha ao login. A configuração é de uso único por inicialização local pendente.

## Verificação antes da publicação

- 257 testes automatizados passaram, sem falhas: 256 testes de regras/API do sistema e uma integração nova de primeiro acesso com servidor real e conta fictícia.
- Integração nova: origem e CSRF inválidos, tipo de corpo incorreto, senhas divergentes/curtas/fracas, limite de corpo, troca efetiva, senha antiga recusada, senha nova aceita e conclusão única.
- Conferência visual do formulário em 320, 390, largura padrão de 731 e 1024 pixels; nenhuma rolagem horizontal da página. Campos de senha com 54 px e botão de 56 px de altura.
- Os testes de cargos/ponto incluem acesso restrito ao CEO, isolamento dos pontos por usuário, dupla entrada concorrente, jornada com intervalo e divisão entre meses, correção com histórico e preservação contra o PUT genérico.
- A validação visual anterior de cargos e ciclo completo de ponto operacional continua aplicável: o código dessas telas não mudou nesta revisão.

Não houve teste em iPhone/Android físico ou teste integrado de cobrança, e-mail, IA ou emissão fiscal externa. A auditoria geral de segurança anterior continua parcial. Estes resultados não significam ausência de bugs ou garantia de segurança total.

## Arquivos desta revisão

- `primeiro-acesso-template.html`: novo visual.
- `tools/primeiro-acesso-local.cjs`: apresentação dos erros e controles do formulário local.
- `tests/primeiro-acesso.test.cjs`: integração de criação de senha em instância fictícia descartável.
- `package.json`, `package-lock.json`: versão 4.6.1.
- `ALTERACOES-ACESSO.json`: manifesto do pacote com hashes.

O pacote inclui também os cargos e o ponto da versão 4.6.0. Bancos, senhas, credenciais, dependências instaladas e iniciador deste computador não são distribuídos. IA continua desligada por padrão.
