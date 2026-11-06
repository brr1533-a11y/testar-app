# Gestão Rural 4.23.0: correções dos relatórios dos agentes

Quatro agentes revisaram o sistema: segurança, pico de acesso, revisor sênior e melhorias. Cada achado foi conferido no código, e muitos foram reproduzidos, antes de qualquer correção. Cada correção tem teste.

## Segurança e acesso
- **Rajada de senhas erradas.** A tentativa passou a ser contada na entrada, e não depois de conferir a senha. Antes, de 500 senhas erradas mandadas juntas, 129 eram conferidas, quando o limite é 30 por rede. Quem acerta a senha não gasta o limite, o que é importante para um escritório com várias pessoas na mesma internet. Teste: `tests/login-limite.test.cjs`.
- **Login não trava mais o servidor.** Agora são no máximo 4 conferências de senha ao mesmo tempo, e as outras esperam na fila. Antes, 50 logins juntos paravam o sistema por 5 segundos para todo mundo.
- **Preços da região.** Antes, com 3 fazendas, o mínimo, a mediana e o máximo eram o preço de cada uma, e quem participava descobria o preço das outras. Agora são 5 fazendas de pelo menos 3 grupos, e só a mediana aparece.
- **"Esqueci o código do Grupo"** responde antes de procurar e mandar o e-mail. Assim o tempo da resposta não revela se o e-mail existe. Achado da revisão automática de segurança.
- **Rotas de senha com teste.** `tests/senhas-api.test.cjs` cobre o código de recuperação com 5 tentativas, a sessão antiga encerrada depois da troca e o ADM sem poder trocar a senha de outra pessoa.

## Dinheiro e estoque
- **Mês fechado** também trava contas a pagar, manutenção, abastecimento, trabalho da equipe, suplementos e serviços de prestador. Antes, mudar qualquer um deles alterava o custo de um mês já fechado. Pagar em novembro uma conta de outubro continua permitido; cancelar uma conta de mês fechado, não.
- **Prestador ou arrendamento pago pelo Financeiro** não conta mais o custo duas vezes. A saída tem o campo "É pagamento de um serviço já lançado?": ela fica ligada ao serviço, fora da soma de custo, e o prestador fica marcado como pago. Antes, uma colheita terceirizada de R$ 24.000 virava R$ 48.000 na safra.
- **Banho concluído baixa o estoque pelos lotes.** Primeiro gasta os lotes com saldo, começando pelo que vence antes. Antes, o banho pegava o primeiro item com o mesmo nome, e um lote vazio e vencido ficava negativo enquanto o lote bom continuava cheio. Se faltar produto, a falta fica anotada no banho. "Óleo-mineral" agora casa com "Óleo mineral". Teste: `tests/banho-lotes.test.cjs`.

## Celular e sincronização
- **Notificação abre na fazenda certa.** O link leva a fazenda do aviso, e a tela troca para ela antes de abrir o pedido. A tela também espera o item aparecer, em vez de esperar um tempo fixo.
- **Service worker sem misturar versões.** A página e os scripts saem do mesmo cache. Antes, logo depois de uma atualização, a página nova com scripts velhos quebrava a tela. A versão nova entra inteira na próxima abertura.
- **Gravação grande demais (erro 413)** vira uma pendência com aviso. Antes, o app reenviava 12 MB a cada 15 segundos, para sempre.
- **Depois de um conflito (409),** o app espera um tempo aleatório antes de tentar de novo. Com 50 aparelhos gravando juntos, 96% das tentativas batiam de novo.
- **Conexão aberta por mais tempo no servidor** (65 segundos). Sob carga, o padrão de 5 segundos derrubava conexões.

## Testes e GitHub Actions
- **GitHub Actions** agora roda também os roteiros de navegador de XSS, fila sem internet, fechamento do mês, conta nova e alertas.
- **Roteiro de alertas:** espera o aviso "não está liberada" aparecer. Antes passava mesmo se nada tivesse rodado.
- **Total:** 369 testes de unidade e 34 roteiros de navegador.

## O que ficou de fora (e por quê)
- **Módulos que não escondem algumas telas** (achado 7 do revisor). Precisa mexer na ordem de todos os embrulhos de telas; é uma mudança grande, para uma versão própria.
- **Histórico limitado a 1.500 registros** e embrulhos que não fazem nada (achados 13 e 14). São melhorias de organização, não defeitos.
- **Rodada de alertas a cada 60 segundos** (achado 12). Com o número de clientes de hoje, não pesa.
