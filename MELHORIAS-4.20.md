# Gestão Rural 4.20.0 — telas mais claras no celular e primeira tela útil

Ajustes da crítica de design de 5/11/2026: 16 telas olhadas no computador e no celular, com dados de demonstração.

## O que mudou

- **Título uma vez só.**
  - O cabeçalho de cima já mostra o nome da tela, e a primeira faixa da página repetia o rótulo e o título.
  - Agora fica só a frase de ajuda. No celular, o conteúdo começa bem mais acima.
- **Cabeçalho do celular mais baixo.**
  - Sai a linha "OPERAÇÃO • FAZENDA … • CAFÉ", porque a fazenda e a atividade já aparecem no seletor.
  - O título ficou menor.
  - O seletor de fazenda ocupa uma linha sem o texto "Fazenda ativa" em cima. O texto continua para leitor de tela.
  - O "Centro de comando" ficou enxuto.
- **Barra de baixo do celular.**
  - Cada item tem um ícone diferente. Antes, vários eram o mesmo quadradinho.
  - Os nomes são curtos: Resumo, Início, Mercado, Campo, Ajuda e Mais. Antes apareciam cortados, como "Resumo d…" e "App de ca…".
  - O nome completo continua para leitor de tela e no computador.
- **Visão geral começa pelo dinheiro.** A ordem agora é resultado acumulado, depois a cotação, e só então tratores e implementos.
- **Financeiro abre num mês com movimento.**
  - Se o mês atual está vazio, abre no último mês com lançamentos e avisa: "Sem lançamentos em novembro. Mostrando outubro…".
  - Isso só acontece na primeira vez. Depois, quem escolhe o mês é a pessoa.
- **Cotação legível.** O cartão dourado passa a ter texto escuro, porque o texto claro não tinha contraste suficiente.
- **Botão "IA" flutuante.** A página ganhou um espaço no fim para ele não cobrir a última linha.
- **Planos da página inicial.** Com as atividades escolhidas e o preço ainda não definido, aparece "Sob consulta" com o convite para o WhatsApp, em vez de um traço.

Arquivos:
- `visual-420.css` (novo, carregado por último);
- `app.js`: ícones, nomes curtos e ordem da Visão geral;
- `prioridades.js`: mês do Financeiro;
- `sales.js` e `sales.css`: planos.

## Concorrentes: o que fica para depois e por quê

- **Extrato automático pelo Open Finance**, só leitura. Precisa contratar um provedor, como Pluggy ou Belvo. A conciliação por OFX/CSV já existe e passaria a receber o extrato sozinha.
- **Nota fiscal do produtor emitida de verdade.** Precisa de provedor de emissão e certificado digital. Já era uma pendência conhecida.
- **Resumo semanal no WhatsApp.** O WhatsApp Business ainda não está contratado. O resumo pode começar pelo push que já funciona.
- **Balança por Bluetooth.** Cada balança fala de um jeito, então precisa de um modelo de referência para testar. Hoje funciona por cabo USB.

## Testes

- `tests/visual-420-browser.cjs` (novo). Confere:
  - **no celular:** seletor de fazenda visível, dinheiro primeiro, um ícone por item da barra, nomes curtos, título sem repetir e botão Simular do tamanho das caixas;
  - **no computador:** Financeiro no mês com movimento, com o aviso uma vez só, e cotação com texto escuro.
- Rodaram 346 testes de unidade e 32 roteiros de navegador antes do teste novo.
