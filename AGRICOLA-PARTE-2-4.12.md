# Parte 2 iniciada — gestão agrícola 4.12.0

Inclui o sistema completo e todo o pacote de café 4.11.0. Não publicado no GitHub.

## Contratos, vendas e entregas

Como CEO, abra **Financeiro e fiscal → Contratos de venda**. Escolha uma fazenda específica e atividade Café ou Grãos. A nova seção **Contrato, venda e entrega vinculados** aparece abaixo dos cadastros existentes.

1. Cadastre um contrato com safra vinculada e comprador identificado.
2. Registre a venda real em Safras e produção. Ela continua sendo a única baixa comercial da produção.
3. Use **Vincular venda** no contrato: comprador e safra devem corresponder. A quantidade não pode exceder a venda nem o contrato. É possível vincular parcialmente.
4. Confira o recebimento/peso da carga em **Entregas**, como antes.
5. Use **Vincular entrega** no contrato. O servidor cria uma baixa identificada do contrato com o peso já conferido, sem baixar novamente estoque, produção ou caixa. Não use se a mesma entrega já foi lançada manualmente no contrato.
6. **Registrar fixação** guarda preço, unidade e quantidade em um histórico. A média é ponderada pelos kg. Não muda automaticamente o preço de um contrato, venda, nota, conta ou lançamento anterior.

A seção mostra volume contratado, venda vinculada, entrega vinculada, baixas manuais, saldo a entregar e fixações. Confirmados são preservados com autoria e data. O ADM continua com o fluxo anterior conforme as permissões; a nova vinculação financeira é exclusiva do CEO nesta etapa.

Recebimentos, emissão fiscal e conciliação continuam nos módulos próprios. Este incremento inicia a cadeia comercial; ainda não é automação integral de faturamento/liquidação. Baixas manuais antigas não possuem um identificador do romaneio conferido e precisam ser conferidas pelo usuário para não representar a mesma carga duas vezes.

## Cenários do orçamento

Como CEO, abra **Lavoura → Orçamento de safra → Simular cenários**.

Escolha a safra, área, produtividade prevista, preço por saca e custo total. O custo inicial usa o orçamento quando existe; caso contrário usa os custos apurados, sem somar os dois. Informe variações de produtividade, preço e custo para comparar com a base. A tela calcula produção, receita, resultado e ponto de equilíbrio por preço e produtividade. Não altera o orçamento, os registros de produção ou o financeiro. São premissas informadas, não previsão garantida nem recomendação de venda.

## Arquivos

Novos: agricultural-flow-domain.js (validação/cálculos), agricultural-flow.js (fluxos), agricultural-flow.css (apresentação) e tests/agricultural-flow.test.cjs. Alterados app.html, server.js (projeção e validação antes de guardar), package.json e package-lock.json. O cache offline do servidor é gerado pelos arquivos e inclui os recursos novos.

## Escopo seguinte ainda pendente

Aprofundamento de orçamento/planejamento por operação, integração com máquinas, leite/laboratório e nutrição, protocolos reprodutivos e agricultura de precisão com imagens analíticas. As preferências de equipamentos e provedores existem em Perfil, mas não ativam conectores sem implementação, credenciais e homologação. O sistema não está automaticamente compatível com todas as marcas.
