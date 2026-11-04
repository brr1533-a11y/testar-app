# Menu lateral — 4.16.0

- `navegacao-suave.js`: categorias do modo compacto abrem um painel adjacente com as opções já autorizadas pelo menu existente. Escolher uma opção navega pela ação original e mantém a lateral compacta. Fecha com Esc, botão, clique externo ou redimensionamento. Esc devolve foco à categoria.
- `safras-comparacao.css`: coluna compacta ampliada de 104 para 132 px, rótulos maiores, painel com rolagem e títulos sem serifa. Navegação de celular mantida; painel adicional só aparece acima de 900 px. Mantém redução de movimento.
- `package.json`, `package-lock.json`: versão 4.16.0.
- `campo-sw.js`: cache regenerado.

Conferência no navegador: recolher, abrir Início, escolher Agenda sem expandir a lateral, fechar com Esc e devolver foco. Sem rolagem horizontal no tamanho testado. Sintaxe validada e 317 testes passaram. Sem publicação no GitHub.
