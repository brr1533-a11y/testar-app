# Café e escolhas do produtor — 4.11.0

Sistema completo baseado em 4.10.0, sem publicação no GitHub. Esta é a primeira etapa solicitada: café. A ampliação completa de gestão agrícola, leite, nutrição, telemetria e agricultura de precisão não está concluída neste pacote.

## Onde fica

Entre como CEO ou ADM com Safras liberado. Escolha Café e uma fazenda específica. Em **Safras e produção**, abra **Lotes, terreiro e amostras**.

- **Lote de origem:** selecione colheita beneficiada existente ou entrada bruta medida no terreiro. Para entrada bruta, informe safra, talhão e referência única. Não cria automaticamente colheita beneficiada ou estoque comercial.
- **Dividir, Misturar, Beneficiar:** usa integralmente os lotes selecionados. Para usar parte de um lote, divida primeiro. Entrada = saídas + perda medida. Divisão/mistura mantêm a base; beneficiamento permite mudar a base. Os lotes anteriores permanecem na genealogia, com saldo reduzido. Não há cancelamento/exclusão de eventos confirmados nesta etapa.
- **Tarefa do terreiro:** lote, prazo, orientação e responsável. Concluir cria outro registro no histórico. A operação desta etapa é de CEO/ADM; não libera novas páginas para fiscal/tratorista automaticamente.
- **Medição/foto:** temperatura e/ou umidade medidas, observações e foto opcional.
- **Amostra/laudo:** código, laboratório, peneira/distribuição, defeitos, umidade, nota da prova e PDF/foto. Resultados são informados pelo laboratório; o sistema não gera classificação oficial nem prescrição.
- **Ofertas líquidas (CEO):** quantidade, kg/saca do preço, preço, frete, descontos, tributos/despesas informados, prazo e parte do parceiro. Mostra bruto, líquido, parte do parceiro e líquido do produtor por proposta e por saca. São valores nominais: não presume juros, taxas legais, venda, pagamento ou acerto automático da parceria. Compare a mesma quantidade e base de peso.
- **Ficha/QR:** histórico de origens e registros. QR em SVG exige conexão para gerar e abre uma ficha privada no app, após login autorizado. Configure PUBLIC_BASE_URL com o HTTPS real antes de imprimir para uso no celular. Em localhost, o endereço não vira um site público.

## Sem sinal e anexos

Habilite e abra o Modo de campo conectado antes de sair sem sinal. Os novos registros são incluídos no estado guardado pelo cofre AES-GCM existente. Registro sem conexão exige cofre aberto. O botão de sincronização atualiza a cópia e solicita envio quando houver conexão; o indicador Salvo e a autoria/data do servidor distinguem confirmação de armazenamento apenas no aparelho.

Fotos JPEG/PNG/WebP são reduzidas no navegador e guardadas como JPEG; PDFs devem ter até 200 KB. Máximo de 200 KB por anexo e 2 MB de anexos de café no grupo, nesta etapa. Arquivos grandes devem ser reduzidos antes do envio. A limitação evita crescimento descontrolado do cofre e do pacote de sincronização. Nunca remova o cofre ou limpe os dados do navegador com pendências. O ensaio físico de reabertura, fotos e sincronização no iPhone/Android sem sinal ainda deve ser feito; testes locais não equivalem a essa validação.

O controle de lotes é um histórico de processo. Não substitui as saídas já existentes no estoque comercial, contratos ou financeiro e não as baixa novamente. A vinculação transacional completa dessas áreas fica para a próxima etapa.

## Escolha de equipamentos e provedores

**Perfil → Equipamentos e provedores → Escolher provedores e modelos**, somente CEO.

Categorias: balança/leitor, ordenhadeira, laboratório, máquinas, satélite, sensores/irrigação, fiscal, banco, WhatsApp e IA. O produtor informa qualquer fornecedor e modelo e escolhe registro manual, arquivo, serial ou API. Todas as novas preferências ficam **não configuradas**. Não é uma lista de compatibilidade homologada e não ativa integração, credencial ou serviço pago. Não digite senhas/chaves nessa tela. Rotinas de importação manual existentes continuam em suas próprias telas.

## Arquivos e execução

Novos: coffee-studio-domain.js, coffee-studio.js, coffee-studio.css, provider-catalog.js, provider-preferences.js e tests/coffee-studio.test.cjs. Alterados app.html, server.js (projeção, validação, rotas protegidas e recursos estáticos), campo-sw.js, package.json e package-lock.json. Biblioteca qrcode 1.5.4 (MIT) gera SVG localmente; não envia dados a geradores de QR externos. Execute npm install antes de npm start ao atualizar esta versão.

Próximas etapas pendentes: vínculo completo contrato/fixação/venda/entrega, aprofundamento de custos/planejamento agrícola, protocolos reprodutivos e nutrição, importação de leite/laboratório, homologação de balança/RFID, NDVI/zonas/prescrições e conectores externos. Elas exigem implementação específica e, em vários casos, fornecedor/credenciais/equipamento para testes.
