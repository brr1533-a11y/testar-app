# Gestão Rural: tudo o que o site tem

Versão de 30/10/2026, que soma a versão do GitHub (`32fe388`), as 5 correções do outro chat e os 3 ajustes desta revisão. São **172 testes automáticos**, todos passando.

Legenda: **(desligado)** significa que a tela existe, mas o serviço de fora ainda não foi contratado.

---

## 1. Site público (sem login)
- **Página inicial** (`/`):
  - apresentação do sistema;
  - planos e preços;
  - atividades: café, gado e grãos;
  - compra da assinatura.
- **Páginas de venda:**
  - **Café** (`/cafe`);
  - **Gado** (`/gado`);
  - **Grãos** (`/graos`).
- **Demonstração** (`/demo`): vídeo do painel.
- **Entrada do painel** (`/app`):
  - login;
  - "Manter conectado neste aparelho";
  - pedido de cadastro;
  - "Esqueci a senha".
- **Portal do contador** (`/contador`): acesso separado, só para consultar e exportar.
- **Super Admin** (`/platform`): administração da plataforma.

## 2. Planos e assinatura
- **Planos:** Essencial, Profissional e Grupo, cada um com 1, 2 ou 3 atividades.
- **Cobrança:** mensal, trimestral (5% de desconto), semestral (10%) ou anual (20%).
- **Pagamento:** pelo Mercado Pago.
- **Teste grátis:** 14 dias com as funções do Profissional, sem cartão.
- **Funções por plano:** o servidor bloqueia o que o plano não inclui.
- **Assinatura:** pedido de troca de plano; comprovantes de pagamento ficam numa tela separada.

## 3. Quem usa e o que cada um vê
- **CEO:** dono do Grupo; vê e faz tudo.
- **ADM:**
  - vê as páginas que o CEO liberar;
  - páginas que mostram valores ficam desmarcadas até o CEO liberar;
  - pode ver os custos sem ver CPF, Pix ou a folha.
- **Funcionário de campo (contribuinte):**
  - **Tratorista:** trabalho do dia, equipamentos, banhos liberados e restrições de carência.
  - **Campo:** trabalho do dia e os registros de campo.
  - **Fiscal de colheita:** só Apontar colheita, Modo de campo e Perfil; não vê valores, CPF nem Pix.
  - **Função:** travada no perfil; a pessoa não troca a própria função.
- **Contador:** só as fazendas liberadas a ele; consulta e exporta, sem alterar nada.
- **Super Admin:**
  - administra os Grupos;
  - troca plano e atividades;
  - define a senha temporária do CEO;
  - suspende, arquiva e exclui Grupos;
  - consulta a auditoria.

## 4. Menu do painel

### Início
- **Visão geral:**
  - indicadores e gráficos por atividade e fazenda;
  - visão consolidada de várias fazendas, conforme o plano.
- **Mercado ao vivo:**
  - café (Bolsa de Nova York, com contratos e R$/saca);
  - boi gordo (CEPEA e praça regional, R$/@);
  - soja, milho e trigo (físico e Chicago);
  - dólar.
  - **Quando a fonte cai:** mostra o último valor com "Atualizado em …"; sem internet, mostra a última consulta guardada no aparelho.
- **Agenda:** tarefas por fazenda e atividade.
- **Central de alertas:**
  - estoque baixo, contas vencidas, vacinas e manutenção;
  - pragas e análises de solo;
  - carência de defensivo, leite para descarte e carência de abate.
- **Mapa da fazenda:** croqui ligado a talhões e piquetes.
- **Modo de campo:** app no celular e cofre do aparelho (veja a seção 5).
- **App de campo e ordens de serviço:**
  - abastecimento, pragas, pesagem, ordenha e atividades;
  - ordens do gerente para a equipe.
- **Chuva e clima:**
  - pluviômetro geral ou por talhão;
  - acumulados de 7, 30 e 90 dias;
  - **previsão do tempo (desligado).**

### Lavoura (café e grãos)
- **Talhões:** cadastro e histórico de cada talhão.
- **Análises de solo e foliar:** faixas, histórico e anexos.
- **Safras e produção:**
  - várias fazendas na mesma safra;
  - variedades, colheitas, vendas e entregas;
  - qualidade do café: Especial e COC 01 a 16;
  - peso da saca configurável;
  - sacas por hectare.
- **Mão de obra da colheita:** veja a seção 6.
- **Apontar colheita:** a tela do fiscal no celular.
- **Pós-colheita:**
  - lotes, secagem e tulha;
  - beneficiamento e rendimento.
- **Rastreabilidade dos lotes.**
- **Pragas do café:** broca, ferrugem, bicho-mineiro e cercosporiose, com aviso acima do nível de controle.
- **Banho:**
  - produtos com carência (dias até colher) e reentrada (horas até entrar no talhão);
  - ordens de banho;
  - o tratorista conclui e pode informar quanto usou em cada talhão;
  - baixa automática no estoque.
- **Carência no campo:**
  - o app avisa "não entrar no talhão até…" e "colher só a partir de…", também sem internet;
  - colheita lançada dentro da carência só segue com a decisão do CEO ou do ADM, que vai para o histórico.
- **Entregas.**
- **Orçamento de safra:**
  - orçado × realizado por categoria (insumos, operações, mão de obra, máquinas, fixos e outros);
  - desvio;
  - ponto de equilíbrio em sacas por hectare.
- **Café em armazéns:**
  - cooperativas e depósitos, com número do depósito;
  - transferências;
  - saldo por qualidade e por local.
- **Certificações e caderno de campo:** checklist interno de 4C e Certifica Minas, com exportação.

### Pecuária (gado)
- **Rebanho e lotes:** piquetes, categorias e etapas.
- **Desempenho e manejos:** pesagens, GMD e metas.
- **Reprodução e sanidade:**
  - monta, IATF, prenhez, partos (os bezerros entram no lote) e desmame;
  - calendário de vacinas;
  - GTA.
- **Medicamentos e vacinas com carência:**
  - carência de abate e de leite;
  - aplicação na vaca, no lote ou no rebanho;
  - datas de liberação.
- **Gado de leite:**
  - vacas e ordenhas, por vaca, lote ou rebanho;
  - "leite desta vaca deve ser descartado até…";
  - ordenha em carência vira descarte e não entra na produção entregue.
- **Qualidade e pagamento do leite:** CCS, CBT, gordura e proteína, e conferência do pagamento do laticínio.
- **Ocupação e suplementação:**
  - ocupação e descanso dos piquetes;
  - UA/ha;
  - custo da suplementação por cabeça por dia.
- **Movimentações:** entradas, vendas, mortes e transferências; a venda para abate de lote em carência fica marcada.
- **Etapas do gado.**

### Estoque e compras
- **Estoque:** mínimos, custos e movimentações.
- **Compra de insumos:**
  - fornecedores e cotações;
  - preço do site conferido sozinho a cada 6 horas;
  - aviso para pedir preço novo pelo WhatsApp;
  - histórico de preços.
- **Equipamentos:** tratores e implementos, com log de uso.
- **Manutenção e combustível:** horímetro.
- **Preços da região:**
  - comparador coletivo, anônimo, com no mínimo 3 fazendas;
  - **fica vazio até existir a busca de notas na SEFAZ.**

### Financeiro e fiscal
- **Resumo financeiro e lançamentos de entrada e saída.**
- **Contas a pagar e a receber:**
  - recebimentos parciais;
  - a pergunta **"É compra para o estoque?"**, para o custo não contar duas vezes.
- **Resultados e custos.**
- **Custo por unidade:**
  - custo por saca, por hectare, por arroba e por litro;
  - rateio por safra, lote ou leite;
  - comparação com o preço de mercado.
- **Posição de comercialização:**
  - previsto, colhido, vendido e disponível;
  - preço médio;
  - quanto falta vender para cobrir os custos;
  - simulação de venda;
  - preço-alvo.
- **Notas fiscais:** cadastro e importação de XML.
- **Emissão e busca de NF-e:**
  - rascunho com itens, CFOP, GTA e campos IBS/CBS;
  - **emissão e busca na SEFAZ (desligado: falta provedor e certificado).**
- **Conciliação bancária:** importa extrato OFX ou CSV.
- **Contratos de venda.**
- **Pedidos de compra:** aprovação, com alçada para o ADM.
- **Livro Caixa (LCDPR):** gera o arquivo no layout 1.3 da Receita.

### Configurações
- **Fazendas:**
  - criar e renomear;
  - "Limpar dados" (só o CEO, com senha e nome da fazenda).
- **Usuários:**
  - criar usuários, aprovar cadastros e definir senha temporária;
  - permissões do ADM;
  - **Aparelhos com modo de campo**, com o botão "Desconectar".
- **Assinatura e comprovantes.**
- **Histórico de alterações:** quem mudou o quê e quando.
- **Documentos e vencimentos:** CAR, CCIR, ITR, licenças, CNH, NR-31 e máquinas, com aviso a 30, 15 e 7 dias.
- **Acesso do contador:** convite por fazenda e revogação na hora.
- **Implantação e importação:**
  - planilhas de talhões e estoque, com prévia;
  - roteiros café + leite e café + corte.
- **Notificações:**
  - avisos no painel;
  - **push no celular e WhatsApp (desligado).**
- **Perfil:**
  - troca de senha;
  - "sair dos outros aparelhos".

## 5. App no celular e modo sem internet
- **Instalação:** o app instala na tela inicial (Android e iPhone) e se atualiza sozinho.
- **Cofre do aparelho:**
  - cifrado com PIN;
  - **sem prazo** para abrir sem internet.
- **PIN errado:**
  - avisa quantas tentativas restam;
  - no 5º erro trava por 5 minutos, e a espera dobra a cada novo erro, até 24 horas;
  - com 10 erros, só abre depois de entrar com usuário e senha.
- **Aparelho perdido:**
  - o CEO ou ADM desconecta o aparelho em Usuários;
  - as sessões da pessoa caem na hora;
  - o cofre é apagado quando o aparelho tiver internet.
- **Ao voltar a internet:** o app pede o PIN e envia o que foi guardado.
- **Lançamento recusado pelo servidor:** os outros não se perdem; aparece uma área de revisão.
- **Sair com pendências:** o app pede para baixar uma cópia protegida pelo PIN.

## 6. Mão de obra da colheita
- **Pessoas:**
  - panhador, safrista e diarista;
  - CPF, Pix e WhatsApp;
  - diária combinada.
- **Valores:**
  - valor do saco por talhão, com data de início;
  - diária padrão da fazenda.
- **Fiscal:**
  - aponta sacos e diárias no celular, também sem internet;
  - o valor entra sozinho, e o fiscal não vê o valor;
  - talhão sem valor fica pendente, e o escritório completa com um atalho.
- **Vales e descontos:**
  - **o vale vai sozinho para o Financeiro como saída**, sem contar no custo;
  - estornar o vale devolve o valor ao caixa.
- **Fechamento semanal:**
  - sacos × valor + diárias − vales − descontos;
  - saldo devedor passa para a semana seguinte;
  - trava a semana;
  - cria uma conta a pagar por pessoa;
  - recibos para imprimir e para mandar por WhatsApp.
- **Pagamento:**
  - **Pix copia e cola** de cada pessoa, no padrão do Banco Central;
  - **lista de pagamento em planilha.**
- **Custo da safra:**
  - entra o **trabalho bruto** (o vale não reduz o custo);
  - dividido pelas safras dos talhões apontados.
- **Lançamento que chega depois da semana paga:**
  - vai para revisão; o escritório aprova ou recusa;
  - se aprovado, entra no próximo pagamento;
  - a conta paga não muda.
- **Lançamento repetido:**
  - mesma pessoa no mesmo dia por fiscais diferentes, ou duas diárias, trava o fechamento até o escritório resolver;
  - o fiscal é identificado pelo usuário, não só pelo nome.
- **Autoria antiga a conferir:** para lançamentos de antes da atualização, o escritório escolhe qual dos fiscais com o mesmo nome lançou.
- **Dados para o contador:** planilha por pessoa e período (CPF, dias, sacos, diárias, vales e líquido). Contrato e eSocial ficam com o contador.

## 7. Custos (como o sistema calcula)
- **Conta direta:** entra no custo da safra ou do lote em que foi rateada.
- **Compra para o estoque:** não entra na hora; entra quando o insumo é consumido.
- **Banho:** entra pelo **preço congelado na hora da aplicação**.
  - **Quantidade:** se o tratorista informou quanto usou em cada talhão, cada talhão leva o próprio custo; se não, divide pela área.
  - **Banhos antigos:** valor **estimado**, e o CEO pode **informar o preço da época** em Custo por unidade.
- **Mão de obra da colheita:** trabalho bruto do fechamento.
- **Sem custo lançado:** a comercialização mostra "Sem custos lançados", e não "0 sacas".

## 8. Segurança
- **Senhas:**
  - mínimo de 8 caracteres, com maiúscula, minúscula, número e símbolo;
  - senhas comuns recusadas (ex.: "Fazenda@123");
  - senha antiga fora da regra obriga a trocar no login.
- **Super Admin:** com senha fora da regra, só entra para trocar; a senha nova fica guardada só como código cifrado.
- **Limites de tentativa:** no login, no cadastro, na recuperação de senha, no checkout e no Super Admin.
- **Sessões:** vencem sozinhas; trocar a senha derruba os outros aparelhos.
- **Permissões refeitas no servidor:** por perfil, fazenda, atividade e plano. O aparelho não consegue gravar onde não pode.
- **Registros que não somem:** fiscais, GTA, vacinas, fechamentos e diário de talhão; o histórico de alterações registra quem mudou o quê.
- **Mercado Pago:** assinatura do webhook conferida.
- **Arquivos:** planilhas exportadas protegidas contra fórmulas; anexos abertos isolados.

## 9. O que ainda depende de algo de fora
- **NF-e:** emissão e busca na SEFAZ precisam de provedor, certificado digital e homologação.
- **Comparador de preços:** fica vazio até existir a busca de notas na SEFAZ.
- **Avisos e clima:** previsão do tempo, push no celular e WhatsApp precisam de provedor ou das chaves.
- **Pagamento em lote:** o arquivo de remessa do banco (CNAB) depende de saber qual banco a fazenda usa.
- **Contador:** ainda não tem "Esqueci a senha".
- **Testes que faltam:**
  - num celular de verdade (Android e iPhone);
  - com os dados de uma fazenda real;
  - no Render com PostgreSQL de produção.
