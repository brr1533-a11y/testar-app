# Gestão Rural 4.22.0 — primeira impressão da conta nova

Sugestões 1, 2 e 3 do agente de melhorias, a falha baixa B1 do teste de segurança e um defeito de dinheiro achado pelo revisor sênior.

## O que mudou

- **Login sem o Grupo de outro cliente.**
  - Num aparelho novo, o código do Grupo vinha preenchido com "1001", e o funcionário entrava no grupo errado e lia "senha incorreta". Agora o campo vem vazio, ou com o último código usado no aparelho.
  - Botão **"Esqueci o código do Grupo"**: manda para o e-mail cadastrado os grupos em que a pessoa tem conta, com o código e o usuário. A resposta é sempre a mesma, para ninguém descobrir quais e-mails estão cadastrados. Há limite de 5 pedidos a cada 15 minutos por rede e de 3 por hora por e-mail.
- **Conta nova do teste grátis:**
  - a fazenda nasce com o nome digitado no cadastro (antes era "Minha Fazenda");
  - na primeira vez, o CEO responde **"Como é a sua fazenda?"** (café familiar, com meeiros, com equipe, leite, corte, grãos ou tudo ligado), e o menu já fica enxuto. Isso acontece só em conta de teste grátis, uma vez por fazenda e por aparelho, e muda depois em Módulos.
- **Tela vazia sem coisas falsas.**
  - Sem dados, o Centro de comando mostra "Comece por aqui" (antes mostrava "caixa positivo").
  - Fazenda sem tanque registrado não aparece mais como "combustível abaixo do limite" (era 0 L).
  - O histórico de combustível só aparece depois do primeiro abastecimento.
- **Fluxo de caixa: salário em dobro.** O salário do fixo já lançado no mês era projetado de novo (R$ 6.000 em vez de R$ 3.000), e isso podia disparar o aviso "caixa não cobre" sem motivo.
- **Erro de JSON malformado** mostra uma mensagem simples, sem o texto técnico do leitor de JSON. Era a falha baixa B1 do teste de segurança.

## Testes
- tests/acesso-422.test.cjs: esqueci o código (mesma resposta para qualquer e-mail) e JSON malformado.
- tests/conta-nova-browser.cjs: celular, conta nova de ponta a ponta.
- tests/minhas-418.test.cjs: salário sem dobra.
- Resultado: 364 de unidade e 34 roteiros de navegador.
