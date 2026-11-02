# Categorias de equipamentos e transferência de tratores — 4.1.3

## Onde usar

Entre como CEO em **Estoque e compras → Equipamentos**.

- Abra **Gerenciar categorias de tratores e implementos**. Escolha o tipo e crie uma categoria. É possível renomear, desativar e reativar; as categorias valem para todas as fazendas do grupo.
- No cadastro ou em **Editar**, escolha a categoria do trator ou implemento. Categorias antigas são preservadas. Renomear atualiza os equipamentos cadastrados. Desativar impede novas atribuições, sem apagar os cadastros existentes.
- Selecione a fazenda de origem e clique em **Transferir** na linha do trator. Escolha outra fazenda do mesmo grupo e informe o motivo. Aguarde o indicador Salvo antes da operação. Para encontrá-lo depois, selecione a fazenda de destino e abra Equipamentos.
- O quadro **Transferências de tratores** registra data, origem, destino, responsável e motivo nas duas fazendas.

## Histórico e permissões

Somente o CEO gerencia categorias e transfere tratores; essa regra também é verificada no servidor. O ADM com acesso a equipamentos pode escolher uma categoria já cadastrada.

O trator mantém seu identificador e categoria. Os usos, abastecimentos, manutenções e custos anteriores continuam na fazenda onde ocorreram. A origem guarda uma referência histórica protegida. Registros posteriores à transferência pertencem ao destino. Apontamentos de campo antigos aceitos para o trator transferido devem ter data anterior ao dia da transferência.

Reservas recentes ou futuras, manutenção agendada, ordens de serviço em aberto e usos com data futura bloqueiam a transferência até serem resolvidos. Transferir requer conexão e uma versão atual dos dados. Uma repetição da mesma solicitação não duplica a movimentação.

Trator com histórico de transferência não pode ser excluído; use **Editar → Status → Parado**. Não é permitido apagar a fazenda com o arquivo histórico de transferência pela edição comum.

A importação de tratores por planilha aceita a coluna opcional **Categoria**. A funcionalidade de equipamentos também está disponível no modo Gado.

## Arquivos alterados e motivos

- `equipamentos-domain.js`: catálogo, validação, preservação do histórico e regras de transferência.
- `equipamentos-server.js`: operações autenticadas do CEO, controle de revisão e auditoria.
- `equipamentos.js`, `app-minimal.css`, `app.html`: categorias, seleção nos formulários, transferência e histórico na interface.
- `server.js`: integração às permissões e ao salvamento, projeção do histórico e publicação do script de interface.
- `evolucao-domain.js`, `expansao-domain.js`, `evolucao.js`, `expansao.js`: referências históricas aos equipamentos transferidos.
- `app.js`: equipamentos no modo Gado e título da visão consolidada.
- `planilhas-domain.js`: categoria opcional na importação de tratores.
- `package.json`, `package-lock.json`: versão 4.1.3 e comando de teste específico.
- `campo-sw.js`: cache regenerado para incluir os arquivos atuais e atualizar o app.
- `tests/equipamentos.test.cjs`, `tests/equipamentos-api.test.cjs`: casos de categoria, transferência, bloqueios, histórico e permissões.
- Este guia e `ALTERACOES-EQUIPAMENTOS.json`: instruções e relação de arquivos com hashes.

## Verificação

211 testes automatizados passaram, incluindo 8 testes novos de equipamentos. Teste manual no navegador com duas fazendas fictícias: criar categoria, atribuí-la ao trator, transferir e conferir o cadastro e a categoria no destino.

O ZIP contém o sistema completo, sem dependências instaladas, credenciais ou dados do teste. Na pasta extraída, execute `npm install` e `npm start`, seguindo a configuração de ambiente já documentada. Nenhum envio ao GitHub ou Render foi feito nesta entrega.
