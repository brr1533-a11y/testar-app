# Função bloqueada no perfil do funcionário

- app.js: Função passa a ser um campo desabilitado no perfil do contribuinte, como Atividade e Fazenda. O salvamento preserva a função atual e continua permitindo nome e Pix. O aviso explica que função, atividade e fazenda são definidas pelo CEO.
- campo-sw.js: cache offline regenerado.
- tests/perfil-funcao-browser.cjs: confirma o campo bloqueado, nome e Pix salvando, servidor ignorando tentativa do funcionário de mudar função/cargo/permissões e CEO podendo definir a função.

O servidor já impedia a alteração da função pelo contribuinte; nenhuma regra do servidor foi modificada. Os testes de perfil, login persistente e abertura offline com PIN passaram nesta etapa. O ZIP preserva as correções anteriores e não inclui senhas, dados operacionais ou dependências instaladas.

Integrado sobre a versão mais recente do repositório (incluindo as melhorias de colheita e cofre offline). Os 80 testes automatizados também passaram após essa integração.

