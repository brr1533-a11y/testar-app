# Correção de leitura — 4.5.1

O modo Grande/Muito grande passa a permitir quebras de linha nos menus e controles, ajusta a largura do menu lateral e reorganiza os formulários. No celular, o espaço reservado ao rodapé acompanha sua altura real. O cursor de café foi removido: são usados os cursores nativos do navegador.

Arquivos alterados e motivos:

- `leitura-ajustes.css`: ajustes de layout para letras e botões maiores.
- `app.html` e `server.js`: carregar e servir a nova folha de estilos.
- `rotina-rural.js`: medir o rodapé para não cobrir conteúdo e assistência.
- `theme.css` e `temas-atividades.css`: remover os cursores personalizados.
- `tests/themes-inputs-browser.cjs`: atualizar a expectativa para cursores nativos.
- `campo-sw.js`: atualizar o cache offline com os arquivos atuais.
- `package.json` e `package-lock.json`: versão 4.5.1.
- `ALTERACOES-LEITURA.json`: manifesto com hashes dos arquivos modificados.

Verificação: 247 testes automatizados passaram, sem falhas. Conferência visual no navegador em 731 px e 390 px, com Muito grande e botões maiores: sem corte nos rótulos do menu e sem transbordamento horizontal da página. Cursor do corpo nativo e dos botões como ponteiro. A lista extensa de opções dos seletores continua usando o controle nativo do navegador.

Não houve publicação no GitHub/Render. IA continua desligada. A prévia usa somente dados fictícios locais. Testes em aparelho físico continuam recomendados; a simulação de tamanho não substitui Safari/Android reais.
