# Importação de planilhas — versão 4.1.1

Entrega local baseada em `gestao-rural-melhorias-2027-v2.zip`. Nenhuma publicação no GitHub ou no Render.

## Onde fica

Entre como **CEO**, selecione uma fazenda individual e abra **Configurações › Implantação e importação › Importar planilhas**. No celular, procure essa tela no menu Mais. O importador CSV anterior do ADM continua disponível com as permissões já existentes; o assistente completo de 12 tipos é exclusivo do CEO.

1. Escolha o cadastro que deseja importar.
2. Baixe o modelo Excel desse cadastro ou selecione sua própria planilha.
3. Selecione a aba e a linha dos títulos. Associe cada coluna ao campo correspondente; os campos obrigatórios têm asterisco.
4. Clique em **Conferir dados**. Confira valores convertidos, erros e duplicados. É possível baixar um relatório CSV com todas as linhas.
5. Corrija os erros na planilha e envie novamente. Somente um lote sem erros e com registros novos permite confirmar.
6. Clique em **Importar N registro(s)**. A mensagem de sucesso só aparece depois da confirmação do servidor. Confira o cadastro correspondente.

## Cadastros e lançamentos aceitos

| Tipo | O que entra |
|---|---|
| Talhões | Nome, área, cultura e referência |
| Estoque | Produto, unidade, quantidade, custo, mínimo, categoria e atividade |
| Tratores | Nome, modelo, identificação e situação |
| Implementos | Nome, categoria e situação |
| Piquetes | Nome |
| Lotes de gado | Nome, cabeças, piquete, etapa e raça |
| Pessoas da colheita | Nome, função, diária e valor por saco; não cria usuário de acesso |
| Safras | Nome, cultura, área, início, peso da saca, talhão, etapa e custo planejado |
| Colheitas | Safra, data, talhão, quantidade, unidade, qualidade e umidade |
| Vendas | Safra, data, comprador, quantidade, unidade e preço por unidade |
| Contas a pagar | Fornecedor, descrição, valor, vencimento e vínculo opcional à safra; começam em aberto |
| Chuva | Data, milímetros, talhão opcional e atividade |

Cadastre primeiro as referências: talhões, piquetes e etapas; depois safras e lotes; por fim colheitas, vendas e custos. Use nomes únicos exatamente como aparecem no sistema. A qualidade do café precisa estar cadastrada pelo CEO. A importação não inventa talhões, safras ou qualidades que não existam.

## Formatos, unidades e números

- Excel **.xlsx**, CSV ou TSV. Arquivos **.xls** antigos devem ser salvos como .xlsx. Não aceita arquivos com senha ou macros.
- Até **8 MB por arquivo**, **12 abas**, **80 colunas** e **1.000 registros por aba**. CSV tem limite adicional de 3 MB; títulos podem estar nas primeiras cinco linhas. Retire linhas e colunas vazias formatadas que ampliem artificialmente a área utilizada.
- CSV separado por ponto e vírgula, vírgula ou tabulação, com suporte a aspas e células com quebra de linha. Reconhece UTF-8 e Windows-1252.
- Datas: `31/10/2026` ou `2026-10-31`; datas nativas do Excel também são reconhecidas.
- Números: `1234,56`, `1.234,56` ou células numéricas do Excel. Um texto como `1.234` é recusado por ambiguidade: use `1234` para milhar ou uma célula numérica para decimal.
- Colheita e venda: unidade **kg** ou **sacas**. A conversão usa o peso da saca da safra cadastrada. O preço da venda deve ser por essa mesma unidade: por exemplo, 10 sacas a R$ 1.500/sc.
- Atividade: Café, Gado ou Grãos. Quando o campo opcional de atividade estiver vazio, usa a atividade aberta no painel; para produção, usa a atividade da safra.
- Fórmulas não são executadas. É usado o resultado armazenado no arquivo; recalcule, confira e salve no Excel antes de importar. Fórmula sem resultado pode causar erro na linha.

## Duplicados e preservação

O assistente acrescenta registros. Não apaga, sobrescreve nem atualiza silenciosamente cadastros existentes. Mesmo nome é considerado equivalente em cadastros; estoque considera produto, atividade e unidade. Colheitas, vendas, contas e chuva usam uma combinação dos campos identificadores. Um nome repetido que se refira a outro local deve ser diferenciado antes de importar. Leituras de chuva da mesma data, talhão e atividade são consideradas duplicadas.

Se a fazenda mudar enquanto você confere a planilha, gere uma nova prévia antes de confirmar. O lote é validado novamente pelo servidor e gravado de uma vez pela mesma função da API normal do painel. Continuam valendo assinatura, permissões, saldo da produção, vínculo de talhões, carência e demais regras existentes. Um erro impede a gravação do lote inteiro.

Vendas importadas não confirmam recebimento, não registram entrega e não emitem nota fiscal. Contas entram em aberto, sem pagamento automático. Para lançar recebimentos ou pagamentos, use os fluxos normais do sistema.

O arquivo é processado em memória no próprio servidor do sistema, com limites de tamanho, memória e tempo. Não é enviado a um serviço de IA ou a outro fornecedor. O arquivo original não fica armazenado como anexo automaticamente.

## Instalação e validação

Após extrair o ZIP, rode `npm install` e `npm start`. A nova dependência é `exceljs`, fixada em 4.4.0 no package.json e no lockfile. Não há build de interface nem serviço externo para contratar.

Testes específicos: `npm run test:spreadsheets`. Testes gerais: `npm test`. A prévia foi exercitada no navegador com upload de um Excel fictício, associação automática, conferência, confirmação e consulta do talhão salvo. Isso não representa teste em todos os modelos de celular.

## Arquivos alterados

- `server.js`: compartilha a função original de gravação com a importação; registra rotas, limites de corpo e arquivos públicos novos.
- `app.html`: carrega o assistente e seus estilos.
- `expansao.js`: atualiza o acesso na tela de Implantação e importação.
- `package.json` e `package-lock.json`: versão 4.1.1, ExcelJS fixado e comando de testes.
- `planilhas-domain.js`: conversões, associação de colunas, duplicados e validação por linha.
- `planilhas-reader.js`: leitura de XLSX/CSV e isolamento por worker com limites.
- `planilhas-server.js`: leitura, modelos, prévia e confirmação no servidor.
- `planilhas.js` e `planilhas.css`: assistente com relatório de conferência.
- `tests/planilhas.test.cjs` e `tests/planilhas-api.test.cjs`: testes de arquivos, conversões, cadastros, gravação, concorrência e permissões.

O pacote contém o sistema completo. Não contém node_modules, credenciais reais, banco de produção ou os dados usados no teste visual.
