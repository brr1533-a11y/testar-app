# Caixas sem brilho em todo o site — 4.13.3

Removida a faixa animada das opções de leitura. Caixas quadradas com cantos suavizados, borda discreta e marcação dourada. O mesmo estilo foi aplicado às caixas nativas do login, formulários, páginas públicas e Super Admin, preservando foco, teclado e estado desabilitado. Os três controles da leitura mantêm a área de toque maior. Sem mudança no funcionamento do QR: ele seleciona a pessoa; o fiscal confirma sacos/diária e salva. Não foi implementado lançamento automático por leitura.

Arquivos alterados: visual-painel.css (remove brilho e refina caixas); controles.css (novo estilo compartilhado); todas as páginas HTML da raiz (carregam a folha compartilhada); server.js (libera somente o novo CSS estático); campo-sw.js (cache regenerado); package.json e package-lock.json (versão).

Conferido no navegador: checkbox do login com appearance none, 22 × 22 px, sem animação; caixas de leitura 24 × 24 px, sem pseudo-elemento de brilho e com seleção funcional. Conferência de publicação: 176 arquivos de sintaxe válidos, 94 recursos estáticos servidos, APIs sem autenticação bloqueadas e primeiro acesso local não exposto. Os 310 testes lógicos da versão base permanecem incluídos; não foram repetidos nesta mudança de apresentação.

Sem envio ao GitHub/Render. Prévia isolada em http://127.0.0.1:62733/fiscal (Configurações → Leitura e botões).
