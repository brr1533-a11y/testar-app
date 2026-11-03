 > Histórico da versão 4.7: o limite por fazenda foi substituído pelo total compartilhado do grupo na versão 4.8. Consulte VAGAS-POR-GRUPO-4.8.md.

# Funcionários por fazenda e login do comprador — 4.7.0

## Quantidades: somente Super Admin

Em `/platform`, cada grupo tem o botão **Funcionários**. O Super Admin escolhe uma quantidade padrão para novas fazendas e pode informar uma quantidade diferente para cada fazenda existente. No cadastro manual de novo grupo também há o campo **Funcionários por nova fazenda**.

Não há o teto fixo de 10 quando o Super Admin configura outro número. São aceitos números inteiros não negativos representáveis com precisão pelo sistema. Zero não libera novos usuários operacionais. Fazendas sem definição individual herdam o padrão do grupo; clientes antigos sem configuração mantêm o padrão anterior de 10. Este cadastro não altera preço ou cobrança automaticamente.

O CEO e o ADM do grupo não podem mudar essas quantidades. Em Fazendas, o CEO consulta o número de funcionários ativos e a quantidade disponível; ao criar uma fazenda, ela recebe o padrão definido pelo Super Admin. As vagas contam os perfis operacionais (`contribuinte`), vinculados a uma fazenda. CEO e administradores, com acesso administrativo, não consomem vagas operacionais.

Ao atingir a quantidade, o servidor bloqueia o cadastro de mais funcionários, a aprovação de solicitações, a reativação de um usuário e a transferência/atribuição de cargo operacional para aquela fazenda. Importações e pedidos simultâneos também respeitam o limite. Não é permitido reduzir abaixo da quantidade ativa: primeiro desative ou transfira as pessoas excedentes. Desativar um funcionário libera a vaga sem apagar seus registros.

As configurações do Super Admin são preservadas contra o PUT genérico e a migração local. O plano não volta a impor o valor fixo de 10 sobre uma quantidade explicitamente liberada. As alterações ficam na auditoria do Super Admin.

## Usuário e senha do comprador

O comprador continua recebendo o perfil CEO do próprio grupo. Em **Perfil → Segurança**, ele tem **Alterar meu usuário** e **Trocar minha senha**. Alterar o usuário exige a senha atual; o novo nome é validado e não pode repetir outro usuário do mesmo grupo, desconsiderando maiúsculas/minúsculas. A identidade interna, o cargo e os dados da fazenda permanecem.

A alteração encerra as sessões antigas e renova a sessão do aparelho atual. A senha não muda ao trocar o nome de usuário. A troca de senha permanece no formulário próprio, com confirmação e as regras já existentes. O PUT genérico do perfil não serve como atalho para renomear o login sem confirmar a senha. Ninguém recebe acesso a outro grupo ou ao Super Admin por essa alteração.

## Arquivos e verificação

- `employee-limits.js`: resolução, validação e preservação das quantidades.
- `employee-access-server.js`: configuração restrita ao Super Admin e troca autenticada do próprio usuário pelo CEO.
- `employee-access.js`: formulário de troca de usuário.
- `platform-employees.js`: quantidades padrão e individuais no Super Admin.
- `server.js`: aplicação dos limites em cadastro, aprovação, importação, transferência, reativação e alteração de plano; proteção do usuário de login no PUT genérico.
- `app.js`, `app.html`, `platform.js`, `platform.html`: cadastro e consulta das quantidades, carregamento dos módulos e acessos na interface.
- `tests/employee-access.test.cjs`: configuração acima de 10, concorrência na última vaga, aprovação, reativação, transferência, importação e fluxo do comprador com troca de credenciais.
- `package.json`, `package-lock.json`, `campo-sw.js`: versão e cache atualizados.
- `ALTERACOES-FUNCIONARIOS.json`: manifesto com hashes dos arquivos.

262 testes automatizados aprovados, zero falhas. Sintaxe de 153 arquivos conferida e 77 recursos estáticos do app carregados. Pelo navegador, em grupo fictício: Super Admin salvou padrão de 25 e limite individual de 1; CEO visualizou 1/1 e o novo formulário de alteração de usuário. A mudança real de credenciais foi exercitada pela API em conta fictícia descartável; a senha pessoal é preenchida pelo próprio usuário.

Entrega local, sem nova publicação no GitHub/Render nesta rodada. O banco do ambiente de testes não acompanha o pacote. A auditoria geral de segurança anterior continua parcial; os testes não garantem ausência de vulnerabilidades.
