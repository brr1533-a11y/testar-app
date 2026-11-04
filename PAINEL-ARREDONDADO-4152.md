# Painel lateral visível — 4.15.2

Entrega local, sem publicação no GitHub ou Render. Inclui o sistema completo e a correção de recorte da versão 4.15.1.

O fundo transparente da prévia anterior ocultava o contorno do painel arredondado, embora o raio de borda continuasse definido. O padrão volta a ser painel com fundo, borda discreta, sombra e cantos de 22 px; o espaço ao redor do painel permanece sem preenchimento adicional. O botão Menu: com fundo permite alternar a preferência neste navegador.

Arquivos alterados:

- `navegacao-suave.js`: fundo sólido como padrão e nova chave local `rural-sidebar-surface-v2`, evitando que a preferência antiga de transparência esconda o painel ao atualizar. Continua sendo apenas uma preferência visual do dispositivo.
- `safras-comparacao.css`: aplica o contorno arredondado também entre 721 e 900 px, mantendo a navegação inferior do celular. Preserva os limites de largura e cantos da seleção corrigidos na versão anterior.
- `campo-sw.js`: cache regenerado.
- `package.json` e `package-lock.json`: versão 4.15.2, sem dependências novas.
- Este guia e `ALTERACOES-PAINEL-4152.json`: registro da entrega.

Conferência no navegador: menu aberto em Equipamentos, painel com fundo em gradiente, borda visível e raio de 22 px. Preferências e rotinas do sistema não foram alteradas.
