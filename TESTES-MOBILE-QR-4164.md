# Conferência de celular e QR — 4.16.4

Data: 04/11/2026. Ambiente local isolado com dados fictícios. Não é validação em iPhone ou Android físico nem confirmação do deploy do Render.

## Passou

- 318 testes automatizados; zero falhas. Incluem geração e leitura dos QRs por decodificador independente, permissões, isolamento de grupos, cofre, financeiro e demais módulos cobertos pela suíte.
- 183 arquivos JavaScript/CJS com sintaxe válida, 100 recursos estáticos carregados, APIs sem autenticação bloqueadas e preparação local indisponível no servidor normal.
- Painel e menu móveis a 390 px: navegação, pesquisa de telas, seletor de fazenda e cartão da colheita.
- Cartão QR exibido no celular e SVG para impressão baixado; arquivo sem token ou senha.
- Como fiscal, abrir o link do cartão seleciona a pessoa sem registrar produção. Somar um saco e salvar, depois recarregar: permanece um saco, sem duplicação, indicador Salvo.
- QR de lote: link abre a ficha correta, com genealogia e saldo. A API de geração/decodificação e acesso restrito passou na suíte. A leitura por câmera física não foi realizada.
- Após correção, tela do fiscal sem excesso horizontal em 320, 360, 390, 430 e 768 px.

## Corrigido localmente

Em 320 px, os controles da colheita aumentavam a largura da página até 341 px. `maodeobra.css` ajusta largura mínima, quebra dos botões e tamanho dos controles sem reduzir alvos de toque abaixo de 44 px. `package.json`, `package-lock.json` e `campo-sw.js` atualizados. A correção ainda não foi publicada no GitHub.

## Achado pendente

A tela Meu trabalho hoje do tratorista mostra o talhão Soja Baixada mesmo no contexto Café. O código da lista usa todos os talhões da fazenda. Esta rodada não alterou o filtro nem a validação das atribuições. Precisa de correção e teste específico por atividade; não declarar o site 100% validado.

## Não validado nesta rodada

- Câmera e leitura de QR em aparelhos físicos; Safari/iOS e Chrome/Android reais.
- Instalação PWA, reabertura sem sinal e sincronização após modo avião em aparelho físico.
- Todas as telas manualmente em todas as larguras; os 318 testes cobrem fluxos específicos, não todas as combinações possíveis.
- Integrações externas desligadas e atualização do Render.

As simulações de largura foram feitas no navegador de desenvolvimento, sem emular o motor WebKit do Safari. Prévia deixada no CEO e tamanho do navegador restaurado.
