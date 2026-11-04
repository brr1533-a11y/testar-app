# Cliques e transições — 4.15.6

Adaptação do vídeo de referência, mantendo o tema do Gestão Rural.

- `safras-comparacao.css`: expansão/recolhimento da coluna em 280 ms; seleção com desaceleração suave; resposta discreta ao pressionar botões; entrada dos cartões em sequência rápida. As preferências de reduzir movimento do sistema e do painel desativam os efeitos.
- `visual-painel.js`: encerra a classe de entrada após 460 ms e a remove nas atualizações da mesma tela, evitando repetir efeitos na sincronização.
- `package.json` e `package-lock.json`: versão 4.15.6.
- `campo-sw.js`: cache regenerado.

Conferência no navegador: menu recolhe/expande, categorias abrem, navegação chega à tela de equipamentos, seleção alinhada e sem rolagem horizontal. A classe de entrada termina após a transição. Suíte de 317 testes passou; sintaxe do JavaScript alterado validada. Não publicado no GitHub.
