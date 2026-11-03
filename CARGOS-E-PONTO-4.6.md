# Cargos e ponto — 4.6.0

## Onde fica

- CEO: Configurações → Cargos e permissões; Início → Ponto da equipe.
- ADM e operacionais (Campo, Tratorista, Fiscal de colheita): Início → Meu ponto.

Só o CEO cria e atribui cargos. O cargo escolhe o nível Administrador ou Operacional e reaproveita as proteções existentes. Administrador usa as Permissões do ADM do grupo (definidas em Usuários); não há uma matriz independente por cargo nesta versão. Operacional usa Campo, Tratorista ou Fiscal de colheita como rotina-base, com fazenda e atividade liberadas. Não é possível transformar o CEO por esse formulário. Para trocar o nível de um cargo já em uso, crie outro cargo e transfira as pessoas. A troca encerra as sessões do usuário, que precisa entrar novamente.

O ponto usa o horário do servidor e exige internet: entrada, intervalo, retorno e saída. Não aceita horário ou pessoa enviados pelo navegador para bater ponto; cada usuário registra somente o próprio. ADM não consulta colegas nem gerencia cargos. O CEO consulta os pontos do grupo e pode corrigir registros encerrados com motivo obrigatório, preservando a versão anterior. Horários e períodos mensais usam Brasília; jornadas que atravessam meses são repartidas no resumo, descontando intervalos. Pontos abertos ficam identificados e não entram no total de jornadas encerradas. O horário de saída pode encerrar também um intervalo em aberto.

Horas e custos/hora-máquina continuam separados do ponto: bater ponto não duplica salário/despesa nem representa folha automática. Não é uma homologação de conformidade de sistema oficial de registro eletrônico de ponto.

## Segurança e dados

Cargo e ponto são gravados por rota própria e preservados contra adulteração pelo PUT genérico de estado. O servidor controla autoria e horário, impede duas entradas abertas e restringe as consultas ao próprio usuário ou CEO. Os registros têm histórico; a limpeza pedida diz respeito aos logs do ambiente administrativo local limpo, que foi conferido com zero registros. Os logs da produção não foram apagados. Registros de novas ações continuam sendo gerados.

O ambiente local de primeiro acesso continua separado dos dados fictícios usados nos testes. O ZIP não contém banco, senhas, credenciais, node_modules nem iniciador de primeiro acesso local.

## Arquivos e verificação

- `equipe-domain.js`: transições de ponto, cálculo de horas, cargos e projeção de dados.
- `equipe-server.js`: rota autenticada por grupo, atribuição e invalidação de sessões, auditoria.
- `equipe.js`: telas de cargos, próprio ponto e acompanhamento do CEO.
- `server.js`: integrações, publicação dos arquivos estáticos e preservação/projeção dos dados.
- `app.html`, `app.js`: carregamento e navegação.
- `tests/equipe.test.cjs`: nove testes de regras e API, incluindo concorrência, permissões, projeção, preservação e meses.
- `package.json`, `package-lock.json`, `campo-sw.js`: versão e cache offline atualizados.
- `ALTERACOES-EQUIPE.json`: manifesto de arquivos e hashes.

256 testes automatizados passaram, zero falhas. Conferência pelo navegador: criação de cargo e ponto operacional (entrada, pausa, retorno e saída). Validação visual em tamanho de celular complementa os testes, sem substituir aparelhos físicos. A auditoria geral de segurança iniciada anteriormente continua parcial; este pacote não é uma declaração de ausência de vulnerabilidades.

Sem publicação no GitHub/Render nesta rodada. IA permanece desligada.
