# Gestão Rural 4.21.0: resumo da semana, balança Bluetooth, Open Finance e WhatsApp prontos

Estes são os itens que faltavam da crítica de design e da comparação com os concorrentes.

## O que mudou

- **Resumo da semana no celular** (`melhorias-domain.js` com `weeklySummary`, mais `expansao-server.js`).
  - O resumo entra como aviso para o CEO de segunda a quarta-feira e tem um código por semana, então o push sai uma vez só.
  - O push sai a partir das 7h de Brasília e não mostra valores em R$, porque aparece na tela bloqueada. Exemplo: "Resumo da semana: 1 conta(s) vencem · 100 sc colhidas · caixa positivo nos próximos 6 meses."
  - Dentro do app, o aviso mostra os valores e abre o Resumo do dono.
  - Com o WhatsApp ligado, o resumo sai pelo WhatsApp também.
- **Centro de comando com a semana.** Em vez de só repetir o nome da fazenda, a Visão geral mostra "Esta semana: … conta(s) vencem em 7 dias (R$ …) · … sc colhidas · caixa positivo…".
- **Cabeçalho do celular mais limpo.**
  - "Sair" e o tema claro/escuro passam a ficar no menu **Mais**. O "Sair" já estava lá; "Usar tema claro" ou "Usar tema escuro" é novo.
  - No alto ficam só a fazenda, o "IA" e o "Salvo".
- **Balança por Bluetooth** (Animais › "Ler da balança (Bluetooth)").
  - Funciona no Chrome e no Edge, no Android e no computador. O iPhone não tem Bluetooth no navegador, e a tela avisa.
  - Há dois jeitos de ler:
    - **padrão oficial de balanças** (Weight Scale), que vai até 327 kg e serve para pessoa, bezerro, carneiro e porco;
    - **texto por Bluetooth** (UART da Nordic), o mais comum nos indicadores de balança de curral, que mandam "452,5 kg" como pelo cabo.
  - O peso só é gravado quando fica estável: duas leituras seguidas com até 0,2 kg de diferença, acima de 1 kg.
- **Open Finance, só leitura de extrato** (Conciliação › "Buscar extrato do banco (Open Finance)", só para o CEO).
  - Liga com `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` no servidor.
  - O CEO cola uma vez o código da conta da fazenda na Pluggy.
  - O sistema traz os últimos 30 dias no mesmo formato do arquivo OFX e não repete o que já entrou.
  - Não faz pagamento nem Pix.
- **WhatsApp** (Meta WhatsApp Cloud API).
  - Liga com `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_ID`. O modelo padrão é `rural_alert`, com as variáveis {{1}} fazenda e {{2}} aviso, em `pt_BR`.
  - Os avisos e o resumo da semana passam a sair também por WhatsApp para quem marcou WhatsApp nas preferências.
- **Correção da barra de baixo (4.20.0).** O nome curto das telas fora da lista era cortado na letra "s", e não no espaço. Corrigido, com teste.
- **Teste instável do gráfico de combustível: causa encontrada.**
  - O teste chamava o desenho da tela direto, e o sistema continuava "na Visão geral". Quando a cotação chegava, a Visão geral era redesenhada por cima do gráfico.
  - Sob carga, ele falhava 5 vezes em 18. Agora entra pela navegação, como a pessoa faz: 0 falhas em 18.

## O que ainda depende de você

| Item | O que fazer | Onde |
| --- | --- | --- |
| WhatsApp | Criar o app no Meta for Developers, aprovar o modelo `rural_alert` (2 variáveis) e pôr `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_ID` no Render | Render › Environment |
| Open Finance | Contratar a Pluggy, pôr `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` no Render, conectar o banco da fazenda pelo painel da Pluggy e colar o código da conta na Conciliação | Render e Conciliação |
| Nota fiscal real | Escolher o emissor (por exemplo, Focus NFe, NFe.io ou PlugNotas) e ter o certificado digital A1 do produtor. Sem isso não dá para emitir na SEFAZ. O encaixe `fiscal` continua desligado | Escolha comercial |
| Balança de curral | Testar com o modelo de vocês: se ela não aparecer na lista do Bluetooth, me diga a marca e o modelo | Celular Android |

## Testes

- **Novos testes de unidade:**
  - `tests/resumo-semanal.test.cjs`: conteúdo, dias da semana, só CEO, push sem R$ e caixa negativo;
  - `tests/balanca-bluetooth.test.cjs`: kg, libra, leitura com falha, peso estável e texto da balança de curral;
  - `tests/integracoes-provedores.test.cjs`: WhatsApp e Pluggy com `fetch` falso, sem internet, e as rotas do Open Finance (só CEO, sem chave avisa, conta inválida recusada).
- **Roteiros atualizados:**
  - `tests/combustivel-grafico-browser.cjs` entra pela navegação;
  - `tests/visual-420-browser.cjs` confere o nome curto da barra.
- **Resultado:** 358 testes de unidade. Também rodam numa segunda-feira simulada.

## Revisão de segurança (agente revisor-seguranca)

- **Média, corrigido:** a conta da Pluggy fica presa ao primeiro grupo que a registrar, então outro grupo não consegue ler o extrato colando o código.
- **Baixa, corrigido:** o WhatsApp usa o texto sem R$, igual ao push.
- **Baixa, corrigido:** o Open Finance aceita no máximo 10 buscas por hora por grupo e exige a Conciliação no plano.
- **Baixa, corrigido:** a leitura do Bluetooth respeita a posição dos dados no pacote.
- **Falta:** um teste com dois grupos para a trava da conta.
