# Menu por categorias — versão 4.1.2

Versão local baseada em `gestao-rural-importacao-planilhas-v3.zip`, incluindo a importação Excel/CSV. Nenhum envio ao GitHub ou ao Render.

## Como usar

O menu começa com as categorias fechadas. Clique em **Início**, **Lavoura**, **Pecuária**, **Estoque e compras**, **Financeiro e fiscal** ou **Configurações** para abrir as telas disponíveis. Só aparecem categorias com páginas liberadas para a atividade e o perfil atuais.

No computador, use o botão **Organizar menu** no próprio menu. No celular, abra **Mais › Organizar menu**. Há três opções de visual:

- Categorias fechadas, padrão inicial;
- Só a categoria da página atual aberta;
- Todas as categorias abertas.

Depois de salvar, é possível abrir ou fechar as categorias normalmente. Essa preferência fica neste navegador, separada por grupo e usuário. Salvar novamente o visual redefine quais categorias ficam abertas. Não altera a conta nem as permissões e não depende de internet para guardar a preferência visual. No celular, os quatro atalhos da barra inferior continuam disponíveis e as demais telas ficam em categorias recolhidas dentro de Mais.

## Escolher as telas da fazenda

Como **CEO**, clique em **Organizar menu › Escolher telas da fazenda**. O botão leva à configuração já existente em **Configurações › Módulos e modelo da fazenda**.

Abra uma categoria, marque as telas desejadas e clique em **Salvar módulos**. É possível usar um modelo pronto ou aplicar a seleção a todas as fazendas. Essa escolha é da fazenda e vale para os demais usuários dentro das permissões de cada um. Desmarcar uma tela não apaga seus registros. Para voltar a exibi-la, marque novamente no mesmo lugar. Páginas essenciais continuam protegidas pelas regras existentes.

As abas secundárias, como Histórico dos talhões, Log de uso e Contas a receber, agora aparecem dentro da categoria correspondente na seleção, em vez de virarem categorias avulsas. A central legada Gestão não aparece como categoria extra.

## Arquivos alterados nesta rodada

- `app.js`: categorias recolhidas, preferências por usuário/grupo, botão Organizar menu, categorias em Mais e tratamento do botão acionado ao confirmar uma janela. Esse último ajuste permite que os botões de navegação de Mais e de Organizar menu sejam identificados corretamente.
- `app-minimal.css`: visual compacto, contagem de telas, foco por teclado e estilos das categorias no celular e na personalização.
- `melhorias.js`: reutiliza a seleção existente do CEO, recolhe suas categorias e posiciona abas secundárias no grupo correto.
- `package.json` e `package-lock.json`: versão 4.1.2, mantendo a dependência e os testes da importação de planilhas.

## Verificação

Conferência em navegador: início com categorias fechadas, acesso a Organizar menu, navegação até a escolha de telas, abertura de categoria, desmarcação de uma tela e gravação com redução da contagem do menu. Também foram conferidas a persistência após recarregar e a navegação de Mais em uma janela de 390 × 844. Isso é teste de layout responsivo; não equivale a teste em aparelho físico.

Os dados dessas verificações ficaram em uma cópia temporária de teste e não fazem parte do ZIP. O pacote não inclui banco, senhas, node_modules ou preferências de teste. As regras de assinatura, acesso e gravação no servidor continuam as existentes.
