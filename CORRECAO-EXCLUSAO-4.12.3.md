# Exclusão de grupos — 4.12.3

Corrigido `platform.js`: o campo de código do formulário de exclusão definitiva agora se chama `confirmCode`, como exige a API. Antes era enviado como `code`, causando "Confirmação inválida" mesmo com o código correto.

Teste de regressão `tests/platform-delete.test.cjs`: executa o manipulador do formulário e envia seu resultado a um servidor temporário; verifica exclusão do grupo fictício arquivado, proteção do grupo 1001, exigência de arquivamento, código/texto inválidos, ausência de autenticação e atualização da lista. Nenhum grupo real foi excluído.

Inclui os preços locais da versão 4.12.2. A publicação depende de autorização nesta rodada; este ZIP não altera sozinho o site do Render.
