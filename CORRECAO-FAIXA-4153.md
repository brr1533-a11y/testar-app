# Faixa do menu em categorias fechadas — 4.15.3

Correção local, sem envio ao GitHub ou Render.

O navegador preservava medidas de layout do botão selecionado dentro de um elemento `details` fechado. A faixa dourada usava essas medidas e aparecia solta entre as categorias, mesmo quando a opção selecionada estava escondida.

Arquivos alterados:

- `navegacao-suave.js`: não mostra a faixa se o botão tiver um ancestral `details` fechado ou com o atributo `hidden`. Observa diretamente mudanças no atributo `open`, além do evento de abertura/fechamento, para atualizar o destaque junto com o menu.
- `campo-sw.js`: cache regenerado com o script corrigido.
- `package.json` e `package-lock.json`: versão 4.15.3, sem dependências novas.
- Este guia e `ALTERACOES-FAIXA-4153.json`: registro da entrega.

Conferência reproduzida no navegador real:

1. Visão geral selecionada com Início fechado: nenhuma faixa solta.
2. Abrir Estoque e compras com Início ainda fechado: nenhuma faixa solta.
3. Selecionar Equipamentos: destaque alinhado ao botão.
4. Fechar Estoque e compras: destaque oculto.
5. Reabrir: destaque alinhado novamente.
6. Abrir e fechar Lavoura, acima do item selecionado: destaque acompanha o botão.
7. Rolar o menu: destaque e botão continuam alinhados.

Nos casos visíveis, a diferença medida entre o topo e a altura do botão e do destaque foi zero. Não houve alteração em dados, permissões ou rotas do sistema.
