# Caixas quadradas com brilho — 4.13.2

Leitura e botões: as opções Botões maiores, Mais contraste e Reduzir animações usam caixas quadradas de 26 × 26 px, com borda reta, marcação dourada e brilho breve em ciclo de 3,2 segundos. Efeito adaptado do trecho CSS fornecido pelo usuário, com crédito ao canal Não Codei.

O input nativo continua responsável pelo estado, foco e teclado. Área de toque de 44 × 44 px; o brilho não intercepta o clique. A animação desliga inteiramente com Reduzir animações e com prefers-reduced-motion. Em cores forçadas do sistema, usa cores de sistema e remove o brilho. Corrigido o texto da opção Mais contraste no tema escuro, que antes poderia ficar escuro sobre fundo escuro.

Arquivos: rotina-rural.js (estrutura dos controles, preservando os IDs/eventos); visual-painel.css (aparência, movimento e contraste); campo-sw.js (cache regenerado); package.json e package-lock.json (versão).

Conferido no navegador: tamanho e bordas, marcação das opções, tecla Espaço, aplicação de contraste e animação passando de reading-shine para none ao reduzir movimento, voltando ao desmarcar. Testes de rotina existentes executados. A suíte lógica de 310 testes da versão base permanece incluída; não foi repetida integralmente nesta alteração de apresentação.

Sem publicação no GitHub/Render. Prévia isolada: http://127.0.0.1:62732/fiscal (Configurações → Leitura e botões).
