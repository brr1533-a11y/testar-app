# Menu sem recortes — 4.15.1

Correção local da apresentação do menu lateral. Não altera permissões ou dados. Não publicada no GitHub nesta entrega.

O grid do menu usava a largura mínima do conteúdo das categorias, ultrapassando a área útil depois da barra de rolagem. Com isso, o lado direito do destaque arredondado, os sinais de abrir/fechar e alguns botões ficavam cortados em janelas estreitas.

- `safras-comparacao.css`: coluna de grid flexível com mínimo zero, largura dos itens limitada ao menu, espaço estável da rolagem e alinhamento de título/contador/sinal. Mantém cantos de 11 px nos botões e amplia a coluna lateral em telas a partir de 901 px.
- `navegacao-suave.js`: a faixa animada nunca ultrapassa a largura útil do menu, mesmo se um item tiver largura intrínseca maior.
- `campo-sw.js`: cache regenerado para entregar os estilos novos.
- `package.json`, `package-lock.json`: versão 4.15.1, sem dependências novas.
- Este guia e `ALTERACOES-MENU-4151.json`: registro das mudanças.

Conferência no navegador nas larguras 800, 917 e 1280 px: nenhum item medido ultrapassou a largura útil do menu; largura de rolagem igual à área visível. Categoria, contador, sinal e cantos direito/esquerdo da seleção apareceram completos. O fundo transparente continua disponível, assim como a opção de voltar ao fundo anterior. A navegação inferior do celular foi preservada.
