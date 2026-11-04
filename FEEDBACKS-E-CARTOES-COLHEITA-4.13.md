# Feedbacks e cartões da panha — 4.13.0

## Caixa de feedbacks

O usuário envia em Configurações → Feedbacks. A mensagem continua no grupo e aparece também na Caixa de feedbacks do `/platform`, abaixo dos grupos. Feedbacks já existentes também aparecem, sem migração manual. Há busca por grupo, código ou mensagem, filtro de situação e paginação de 50 registros. O Super Admin marca novo, em análise ou resolvido. A revisão da plataforma é separada da situação registrada pelo CEO, com data e auditoria administrativa.

Somente o Super Admin acessa a caixa global. Nenhum grupo recebe feedbacks de outros grupos. Não há mensagem automática por WhatsApp/e-mail. A tela e a privacidade informam o destino dos feedbacks.

## Cartão individual da colheita manual

No modo Café: Lavoura → Mão de obra da colheita → Pessoas → Cartão QR ao lado da pessoa ativa. CEO e ADM com permissão de Mão de obra podem gerar. Baixar cartão para imprimir gera um SVG vetorial com nome, QR e código da pessoa. Abra o SVG no navegador para imprimir.

O fiscal lê o QR pela câmera do celular, abre o link e entra com seu próprio login. O app abre Apontar colheita na fazenda e pessoa autorizadas. Escolha talhão/data, acrescente sacos ou diária e salve. Ler o QR repetidamente não cria apontamentos. Mostrar todas as pessoas remove o filtro. O cartão não é um login do trabalhador.

O código também pode ser colado em Apontar colheita → Usar código do cartão. Com o modo de campo já preparado, essa seleção usa a lista local e o salvamento segue o cofre existente. Não foi acrescentado leitor de câmera dentro do site; a leitura é pela câmera/leitor do aparelho. A leitura física, impressão e o fluxo offline completo ainda precisam de teste no celular.

O QR contém apenas a URL e IDs opacos de fazenda/pessoa, sem CPF, Pix, salário ou token. Exige acesso autorizado; pessoa inativa ou fazenda fora do acesso não é selecionada. Em produção, PUBLIC_BASE_URL deve ser o HTTPS público correto: cartões da prévia localhost não servem para celulares fora do computador. Gere novamente no servidor publicado.

## Arquivos alterados

- feedback-colheita-server.js (novo): caixa global autenticada, revisão com controle de concorrência e QR privado de pessoa ativa.
- server.js: registro das novas rotas.
- platform.html e platform.js: caixa, filtros, paginação e revisão.
- rotina-rural.js, ia-ajuda.js e privacidade.html: informação ao usuário sobre o destino do feedback.
- maodeobra.js: geração/baixar cartão, seleção por link/código e filtros na tela do fiscal.
- tests/feedback-colheita.test.cjs (novo): acesso à caixa, validação de revisão e preservação, decodificação do SVG, permissões e seleção sem lançamento automático.
- campo-sw.js: cache gerado novamente; package.json e package-lock.json: versão.

310 testes automáticos passaram. 176 arquivos de sintaxe e 93 recursos estáticos conferidos. No navegador: feedback fictício chegou à caixa e foi revisado; cartão foi baixado e o QR da imagem real da tela foi decodificado por leitor independente; link abriu a pessoa no acesso do fiscal, com zero sacos e Salvar desabilitado. Não foram excluídos grupos reais ou usados serviços pagos. Mantidas as limitações de dependências registradas nas versões anteriores. Pacote local, sem publicação no GitHub/Render nesta rodada.
