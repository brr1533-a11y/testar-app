# Gestão Rural 4.5.0 — café, horas de máquinas e leitura fácil

Este é o sistema completo. Mantém as melhorias anteriores, sem publicação no GitHub ou Render. A IA externa permanece **desligada**, sem chave e sem consumo de créditos nesta validação. Os guias de versões anteriores são históricos; este arquivo descreve a entrega atual.

## IA no canto e Ajuda no rodapé

O botão **IA**, no canto inferior direito, abre uma conversa em janela própria, sem tirar a pessoa da tela que estava usando. O painel pode ser fechado pelo botão Fechar ou Esc. O guia local fica em **Ajuda**, a última entrada do menu de Configurações; no celular, Ajuda é mantida entre os atalhos inferiores. O botão antigo de interrogação foi substituído por essa organização.

Ajuda contém 83 guias pesquisáveis e abre apenas telas disponíveis no menu do perfil. Não precisa de chave da IA. A conversa continua exigindo a ativação posterior descrita no guia 4.4: `OPENAI_API_KEY`, `OPENAI_MODEL` e `AI_ENABLED=true` no servidor. A chave não vai ao navegador. Os limites de chamadas e a autorização opcional do resumo continuam valendo.

Os canais de WhatsApp e vídeo, quando configurados no servidor, ficam na área Contato do suporte da Ajuda. Abrir essa área não envia mensagem; os links são apresentados para o usuário escolher.

## Exclusivo do café

Em **Lavoura → Café no chão**, escolha a fazenda, safra e talhão:

- **Informar kg e calcular a porcentagem:** registre o total caído e o acumulado já levantado.
- **Informar porcentagem e calcular kg:** indique o percentual e a base total em kg; o servidor calcula o caído.
- Referência **0** usa o peso líquido colhido registrado naquele talhão/safra. Sem esse peso, o modo percentual exige informar uma base manual. No modo kg, pode haver quantidade registrada sem porcentagem quando não há base.
- No modo percentual, a base usada fica guardada no registro para a porcentagem informada não mudar com uma nova colheita. No modo kg com referência 0, a porcentagem acompanha a base automática.
- Caído não pode superar a referência; já levantado não pode superar o caído. Falta levantar = caído − levantado. A tela mostra kg, sacas com o peso cadastrado na safra e porcentagem de recuperação.

Exemplo: referência 1.000 kg e caído 20% → 200 kg. Se levantou 50 kg, faltam 150 kg, ou 2,5 sacas de 60 kg. Esse controle não acrescenta produção, venda ou lançamento financeiro. Não registre outra colheita só porque atualizou a conferência. Use pesos na mesma base: café em coco não equivale a beneficiado.

Há uma conferência atual por talhão/safra, com data e autor. A edição atualiza essa conferência; o histórico geral registra a operação, mas não é um diário de cada carga recuperada. CEO e ADM com acesso a Safras podem alterar. As telas não aparecem em Gado ou Grãos.

Em **Lavoura → Orientações do café**, há áreas de pré-colheita, pós-colheita e tratamentos/cuidados. CEO e ADM com acesso a Pós-colheita ou Banho podem adicionar e corrigir orientações do grupo. Usuários com Café liberado podem consultar. Os textos iniciais são lembretes de registro/conferência; o sistema não prescreve produtos, doses, temperaturas ou tratamentos. As orientações técnicas são fornecidas pelo responsável.

## Horas, remuneração e máquinas

Abra **Estoque e compras → Horas e custos** numa fazenda específica.

O CEO escolhe a remuneração do trabalhador e os valores:

- **Por hora:** horas conferidas × valor/hora.
- **Diária:** número de datas distintas conferidas × valor/diária.
- **Mensal:** valor mensal contratado + horas acima da carga configurada × valor adicional/hora configurado.

A carga inicial de 220 h é apenas um exemplo editável, não uma determinação legal. O mensal usa o valor contratual completo, sem proporcionalidade automática por admissão, afastamentos ou faltas. Não calcula férias, 13º, encargos, tributos ou folha legal. Não há fechamento ou pagamento automático; é uma estimativa operacional para conferir com o responsável. Se há contrato dividido entre fazendas, defina e confira o rateio antes de somar resultados.

As políticas têm **mês de vigência**: cadastrar uma configuração para dezembro mantém a de novembro. Corrigir uma configuração do mesmo trabalhador/equipamento no mesmo mês altera as estimativas desse mês; não há folha fechada congelada neste módulo.

A hora-máquina usa:

`(aquisição − residual) ÷ vida útil em horas + consumo L/h × preço/L + reserva de manutenção/h`

Multiplica-se o valor/hora pelas horas da máquina conferidas. A remuneração do operador é mostrada separadamente para não ser somada duas vezes. O consumo é estimado e não substitui as baixas reais do tanque. Estes cálculos não criam contas, pagamentos, despesas nem movimentações de combustível.

O apontamento registra data, pessoa, máquina, horímetro inicial/final, pausa e horas da pessoa. Pessoa e máquina podem ter horas diferentes. O tratorista registra somente para si e sua fazenda/atividade liberada. Seus apontamentos entram como pendentes; o responsável confere antes de usar no cálculo. CEO/ADM autorizado podem anular com motivo sem apagar o histórico. Intervalos sobrepostos da máquina e mais de 24 h da pessoa no mesmo dia são recusados.

ADM precisa de Manutenção para conferir as horas e também de Resumo financeiro para consultar valores. Somente CEO configura os valores. Tratorista não recebe salários/custos pela API. Registros antigos sem horas não são convertidos automaticamente nem presumidos como horas trabalhadas; esta rotina usa seus apontamentos próprios.

## Feedbacks

Em **Configurações → Feedbacks**, qualquer usuário do grupo pode registrar problema, ideia ou dificuldade. O usuário vê seus próprios relatos; o CEO vê os relatos do grupo e atualiza a situação. Não há envio automático para WhatsApp/e-mail, desenvolvedores ou terceiros. Evite dados pessoais e senhas nas mensagens.

## Letras e botões maiores

Em **Configurações → Leitura e botões**, escolha:

- letras padrão, grandes (20 px) ou muito grandes (24 px) nas áreas de leitura e controles;
- botões maiores (mínimo de 56 px), espaço de toque e caixas de seleção maiores;
- mais contraste;
- redução de animações.

**Ativar leitura fácil** combina letras grandes, botões maiores, contraste e menos movimento. **Voltar ao padrão** restaura a apresentação. A preferência fica neste navegador, separada por grupo/usuário, sem alterar dados da fazenda. Algumas visualizações, imagens e gráficos mantêm suas escalas próprias; não se declara certificação de acessibilidade.

## Persistência, testes e limites

- Registros novos são gravados pelo servidor, com revisão e validação de permissão. Um PUT genérico do estado não pode forjar horas, configurações de remuneração ou feedbacks protegidos.
- Os novos formulários de café no chão, orientações, horas e feedbacks precisam de conexão para salvar. **Ainda não foram integrados à fila cifrada offline.** Não feche um formulário não salvo esperando que vá ao cofre.
- 247 testes automatizados de domínio/API/auxiliares passaram, zero falhas. Há testes específicos para porcentagem manual/automática, recuperação, horas pendentes, remuneração, vigência, hora-máquina, anulação, edição de orientação, feedbacks e privacidade.
- Navegador local com dados fictícios: IA em janela no canto, café por kg/porcentagem com persistência, 8 h × R$ 20 = R$ 160 e máquina 8 h × R$ 45 = R$ 360, Ajuda separada, leitura fácil e layout em 390 px sem rolagem horizontal na tela conferida.
- Não substitui teste em aparelhos reais, modo avião e PostgreSQL de produção. Os 20 roteiros antigos de navegador não foram todos reexecutados nesta rodada; as correções de navegação anteriores permanecem incluídas.
- Não foi usada chave real nem ativado um modelo de IA. Respostas reais ainda precisam ser conferidas após configurar créditos/modelo.
- Foi corrigida uma corrida na abertura rápida: a restauração da sessão aguarda o carregamento dos módulos do HTML, e as referências às novas telas são resolvidas ao abrir cada página.

## Arquivos para revisão

- `rotina-rural-domain.js`: regras, cálculos, preservação e projeção por perfil.
- `rotina-rural-server.js`: endpoint autenticado com revisão do estado e auditoria.
- `rotina-rural.js`, `rotina-rural.css`: telas, formulários, IA no canto e leitura fácil.
- `ia-assistente.js`, `ia-ajuda.js`: separação da ajuda/conversa e guias novos.
- `server.js`: registro da rota, proteção dos campos e projeção das respostas.
- `app.js`: páginas e atalho inferior da Ajuda.
- `app.html`, `campo-sw.js`: carregamento e cache dos arquivos.
- `package.json`, `package-lock.json`: versão 4.5.0.
- `tests/rotina-rural.test.cjs`, este guia e `ALTERACOES-ROTINA.json`: validação e manifesto.
- `tests/melhorias-browser.cjs`: a verificação do WhatsApp passa pela nova aba Ajuda, em vez do botão antigo de interrogação.

O ZIP não inclui credenciais, banco da demonstração, `.env`, `node_modules` ou executável de túnel. Não foi criado túnel público nesta rodada; a prévia é somente local.
