# Seletor de letras — 4.13.4

Em Leitura e botões, a lista nativa de tamanho de letra foi substituída por três cartões: Padrão, Grande e Muito grande. Cada cartão mostra Aa no tamanho correspondente, descrição curta e marca de seleção. Mantidas as preferências por usuário/aparelho e os botões Leitura fácil e Voltar ao padrão. Não há brilho ou animação.

Controles são rádios nativos agrupados por fieldset/legend: clique no cartão, Tab e setas do teclado. O estilo inclui foco visível e organização em uma coluna abaixo de 480 px.

Arquivos: rotina-rural.js (estrutura e leitura da opção escolhida), visual-painel.css (cartões), campo-sw.js (cache), package.json e package-lock.json (versão). Verificação no navegador: seleção por setas aplica Grande; seleção por clique aplica Muito grande; apenas uma opção selecionada; largura da página não excedeu a janela no desktop; retorno a Padrão. Nove testes de rotina existentes passaram. Não foi repetida a suíte completa de 310 testes da versão base.

Sem envio ao GitHub/Render. Prévia local em http://127.0.0.1:62734/fiscal (Configurações → Leitura e botões).
