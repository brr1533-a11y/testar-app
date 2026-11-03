# Gestão Rural 4.9 — visual do painel

Sistema completo baseado na versão local 4.8.0, com as funções existentes e dados reais do grupo ao entrar. Não contém a fazenda fictícia da prévia nem um banco de dados preenchido.

## Alterações

- `visual-painel.css`: cores, cartões separados, menu, campos, tabelas, gráficos e adaptação ao celular, seguindo a prévia aprovada.
- `visual-painel.js`: botão de tema claro/escuro, preferência neste navegador, ícone de lavoura e transição curta ao mudar de tela. Atualizações de sincronização não repetem a animação.
- `app.html`: carrega o tema após os estilos existentes.
- `graficos-rurais.js`: linhas desenhadas em um segundo, com pontos aparecendo conforme o caminho avança. Mantém movimento reduzido e valores reais.
- `server.js`: libera apenas os dois novos arquivos estáticos. Nenhuma mudança nas regras de acesso ou dados.
- `campo-sw.js`: inclui os arquivos visuais no cache e renova a versão do cache offline.
- `package.json` e `package-lock.json`: versão 4.9.0.

Os anéis reais mantêm sua porcentagem e a identificação externa da safra. Não é preciso colocar uma frase dentro do círculo.

## Executar

Use as instruções de instalação e produção que acompanham o sistema. Instale Node.js, execute `npm install` e `npm start` na pasta `gestao-rural`. Configure `.env` a partir de `.env.example`, definindo os segredos no seu ambiente. Nenhuma senha real é incluída neste ZIP. O cadastro inicial de senha da prévia local não é uma rota pública de produção.

Integrações externas continuam condicionadas à configuração. IA permanece desligada no exemplo. O ZIP não publica o site nem altera a instalação que já está em uso.
