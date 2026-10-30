# Etapa 2 — ajustes para a próxima colheita

Base: `gestao-rural-revisado-offline-sem-prazo.zip` (igual à versão do GitHub, com o modo de campo sem prazo).

## 2.1 Valor automático no fiscal de colheita
- O valor de cada apontamento continua entrando sozinho no servidor:
  - **saco:** valor combinado da pessoa ou, sem ele, o do talhão;
  - **diária:** diária da pessoa ou, sem ela, a nova **diária padrão** da fazenda (Mão de obra › Valores por talhão).
- **O fiscal não vê valores.** Ele recebe só marcas de "tem valor" (talhão com valor desde tal data, pessoa com diária). Assim o app avisa na hora, também sem internet:
  - "Este talhão ainda não tem valor do saco: os sacos ficam pendentes";
  - "diária sem valor: fica pendente".
- **No escritório**, Mão de obra mostra no topo, em todas as abas, quantos apontamentos estão sem valor, agrupados por talhão e por pessoa, com atalhos:
  - **Definir valor do saco:** já vem com o talhão e a data do primeiro apontamento pendente;
  - **Definir diária.**
- Ao definir o valor, os pendentes recebem o valor sozinhos.
- **Fechar semana com pendência:** em vez de só dar erro, a tela leva para a semana com o aviso.

## 2.2 Carência de defensivos no banho
- **Produto de banho:** ganha **carência (dias até colher)** e **reentrada (horas até entrar)**, no cadastro novo ou pelo botão "Carência" nos já cadastrados.
- **A ordem guarda os valores do dia em que foi montada.** Mudar o produto depois não mexe em banho já feito.
- **Cálculo:** banho concluído → por talhão, "colher a partir de" e "não entrar até". Vale a maior carência e a maior reentrada entre os produtos do banho.
- **Colheita lançada dentro da carência** (apontamento do fiscal ou colheita da safra):
  - o servidor grava o alerta; o que o celular manda é ignorado;
  - **só CEO/ADM decide**, com o motivo obrigatório;
  - a decisão fica gravada com nome e hora e entra no **Histórico de alterações**;
  - o apontamento também pode ser estornado;
  - **a semana da mão de obra não fecha** enquanto houver alerta sem decisão.
- **Onde aparece:**
  - **Fiscal (celular, também sem internet):** "Não entrar no talhão até…" e "colheita só a partir de…". Ao salvar no talhão em carência, pede confirmação. O servidor manda as janelas prontas por talhão, porque o fiscal não recebe as ordens de banho.
  - **Tratorista (Banhos liberados):** quadro com os talhões com restrição.
  - **Banho (CEO/ADM):** talhões em carência e a lista "colheitas lançadas dentro da carência", com os botões Permitir e Estornar.
  - **Safras › Colheita:** CEO/ADM informa o motivo na hora; os demais registram marcado.
  - **Central de alertas** e Mão de obra (aviso com atalho "Decidir").

## 2.3 Carência de medicamentos no gado e no leite
- **Reprodução e sanidade › Sanidade e vacinas:**
  - **"Produtos (carência)":** vacina ou medicamento com **carência de abate** e **carência de leite** (dias);
  - **"Registrar medicamento aplicado":** em uma vaca, um lote ou o rebanho;
  - a tabela mostra "Libera abate" e "Libera leite".
- **Agendar vacina** pode usar o produto cadastrado e escolher uma vaca.
- **Leite:**
  - **Aviso:** quadro "Leite para descarte: Vaca 101: o leite deve ser descartado até…".
  - **Ao lançar a ordenha da vaca:** o app pede confirmação e registra como descarte.
  - **No servidor:** marca todas as ordenhas dentro do período como descarte; o celular não escolhe.
  - **Produção:** ordenha de descarte **não entra na produção entregue**. Há o indicador "Descartado em 7 dias".
- **Quem a carência atinge:**
  - aplicação na vaca → só ela;
  - aplicação no lote → vacas do lote e ordenha do lote;
  - aplicação no rebanho → todos.
- **Abate:**
  - **Venda (Movimentações) ou GTA com finalidade Abate** de lote em carência: o app pede confirmação, o servidor grava o alerta e o alerta aparece na tabela.
  - **Central de alertas:** mostra "Descartar leite" e "Carência de abate".

## 2.4 Mercado sem tela vazia
- **No servidor:** guarda a **última leitura boa de cada fonte**, com data e hora (Yahoo por símbolo e o físico CEPEA). Ela fica no banco e vale mesmo depois de reiniciar. Se a fonte falhar, devolve a última leitura marcada como antiga.
- **Na tela:** cada cotação antiga aparece com o selo **"Atualizado em …"**.
  - **Fontes fora do ar:** com o servidor respondendo, aparece o aviso "mostrando a última consulta".
  - **Sem internet ou servidor fora:** o aparelho mostra a última resposta guardada, com "Sem conexão: mostrando os valores de …".

## Testes
- **`npm test`:** **101 testes**, todos passando (19 novos):
  - `tests/etapa2-colheita.test.cjs`
  - `tests/etapa2-carencia.test.cjs`
  - `tests/etapa2-medicamentos.test.cjs`
- **Conferido no navegador (servidor local com dados de teste):**
  - fiscal no celular: aviso de talhão sem valor, aviso de carência, salvar marcado;
  - CEO: pendências com atalho, valor preenchendo os pendentes, permitir colheita na carência e a linha no histórico;
  - telas de leite e sanidade;
  - Mercado ao vivo e com o servidor fora.
- **Não conferido:**
  - as telas do gado com a atividade gado contratada: o grupo de teste só tinha café, então foram executadas forçando a atividade;
  - celular de verdade;
  - falha real das fontes do Mercado: a reserva do servidor não tem teste automático.

## Limites e decisões
- **Carência no produto do banho:** a carência dos defensivos ficou no cadastro de **produtos do banho** (é ele que entra na ordem), não no item do estoque. O estoque continua ligado ao banho pelo nome, como antes.
- **Animal por animal:** só as vacas de leite são identificadas uma a uma. Para o gado de corte a carência vale por lote. A aplicação numa vaca não bloqueia a venda do lote dela.
- **Ordenha do rebanho todo** (sem vaca nem lote) só é marcada como descarte se a aplicação foi no rebanho.
