# Vagas compartilhadas por grupo — 4.8.0

Substitui o limite de funcionários por fazenda da versão 4.7. Agora cada grupo tem um único total de funcionários operacionais ativos, distribuído livremente entre suas fazendas. Novos grupos começam com 50 vagas; somente o Super Admin pode escolher outra quantidade inteira, inclusive zero. CEO e administradores não consomem vagas operacionais.

## Onde fica

- **Super Admin → Grupos → Funcionários:** define um único total para aquele grupo e consulta a distribuição por fazenda. O cadastro manual de grupo também informa o total.
- **CEO → Usuários:** mostra o contador, como “35 de 50 funcionários”.
- **CEO → Fazendas:** mostra a quantidade da fazenda e o uso total do grupo. Criar uma fazenda não cria novas vagas.
- **Minha assinatura:** mostra o total usado no grupo e a distribuição, sem impor um teto individual por fazenda.

Ao ocupar todas as vagas, novos cadastros, aprovações, reativações e mudança de cargo administrativo para operacional são bloqueados. Transferir um funcionário ativo entre fazendas do mesmo grupo continua permitido, mesmo com o grupo cheio, pois não muda o total. Desativar libera uma vaga. Excluir/apagar registros antigos não é necessário para liberar vagas.

Reduzir a quantidade abaixo do uso atual é recusado: o Super Admin precisa primeiro solicitar a desativação dos excedentes. O CEO e o ADM não alteram o total por formulário, importação ou requisição genérica. Pedidos concorrentes são conferidos contra os dados mais recentes no servidor. O preço da assinatura não é alterado automaticamente.

## Migração

Na inicialização, configurações antigas por fazenda são convertidas em um total: somam-se as vagas das fazendas existentes, incluindo as exceções individuais. Clientes sem configuração explícita recebem 50; se já houver mais funcionários ativos, a migração conserva esse número como total, sem desativar ninguém. O Super Admin pode revisar o total depois. A conversão é persistida e não se repete. Criar fazendas posteriormente não aumenta o total migrado.

## Verificação

264 testes automatizados passaram, sem falhas. Entre os cenários: 50 funcionários divididos em 20+15+15, bloqueio do 51º, transferência com grupo cheio, liberação por desativação, reativação bloqueada quando a vaga foi ocupada, disputa concorrente pela última vaga, aprovação de cadastro, proteção contra importação e alterações pelo CEO, migração idempotente e escolha de 75 vagas em novo grupo.

Pelo navegador, em instância fictícia: Super Admin abriu e salvou o total de 50, sem campos de limite por fazenda; o CEO visualizou “1 de 50 funcionários”. A troca de usuário e senha da versão anterior permanece funcionando.

Arquivos principais alterados: `employee-limits.js`, `employee-access-server.js`, `server.js`, `app.js`, `platform-employees.js`, `platform.js`, `platform.html`, páginas públicas `index.html`, `cafe.html`, `gado.html`, `graos.html`, testes `employee-access.test.cjs`, versões e cache offline. `FUNCIONARIOS-E-LOGIN-4.7.md` registra a versão anterior e recebeu aviso de substituição.

Entrega local, sem nova publicação no GitHub/Render nesta rodada. O ZIP não inclui banco, credenciais ou dados fictícios dos testes. A auditoria geral de segurança anterior continua parcial; os testes não equivalem a garantia de ausência de vulnerabilidades.
