# Gestão Rural 4.2.0 — correções e rotina da fazenda

O pacote contém o sistema completo. O visual existente foi mantido. IA não foi integrada nesta etapa.

## Correções prioritárias

- **Rascunho na recarga:** um lançamento pendente é guardado com sua base e identidade na sessão da aba. Depois que o servidor volta, o sistema recupera e mescla o rascunho, em vez de sobrescrevê-lo com o estado antigo do servidor. A recuperação automática exige o mesmo grupo, usuário e permissões. Rascunhos de outro escopo não são reaplicados automaticamente. A saída manual é bloqueada enquanto há pendências sem cofre.
- **Limite dessa proteção:** sessionStorage protege a recarga da mesma aba. Para fechar a aba/navegador, reiniciar o aparelho e trabalhar sem rede, habilite o Modo de campo com PIN. O cofre cifrado permanece sendo o armazenamento persistente optativo. Armazenamento cheio ou bloqueado não é garantia de salvamento; aguarde o indicador Salvo.
- **Colheita de café:** o seletor do fiscal passa a receber apenas talhões de café; a lista também é filtrada no cliente. Novos apontamentos incompatíveis são recusados pelo servidor. Talhões legados sem atividade/cultura continuam compatíveis com café; registros históricos existentes não foram apagados.
- **Função do ADM:** o campo fica bloqueado no Perfil e não pode ser alterado pelo próprio ADM pela API. Nome e Pix continuam editáveis.
- O aviso do apontamento agora pede para aguardar o indicador Salvo, distinguindo registro local de confirmação de envio.

## Combustível por fazenda e no grupo

Na **Visão geral**, o quadro Combustível da fazenda mostra o saldo físico do tanque, independentemente da atividade selecionada. Em **Geral**, exibe cada fazenda e o total consolidado. O aviso também entra em Hoje quando existe saldo abaixo do limite.

O limite inicial é **40 L**, com alerta estritamente abaixo do limite. O CEO usa **Ajustar alerta do grupo** para definir outro valor aplicável às fazendas do grupo.

O CEO usa **Registrar entrada / ajuste** para cadastrar o saldo inicial, reposições ou ajustes justificados. O histórico é preservado. Saídas acima do saldo são recusadas. Em **Manutenção e combustível → Abastecimentos**, marque **Retirado do tanque da fazenda** para baixar o volume usado na máquina. Abastecimentos externos antigos continuam sem baixar o tanque automaticamente.

Uma retirada de abastecimento é aplicada uma vez; arquivar o abastecimento não devolve litros. Para corrigir o tanque, registre ajuste com motivo. Abastecimento que já baixou o tanque não pode ter origem, equipamento ou litros reescritos. As entradas e ajustes do tanque são controle físico: não criam receitas/despesas financeiras automaticamente.

O ADM precisa ter Estoque ou Manutenção liberados para consultar o tanque. A configuração do limite e os ajustes manuais são exclusivos do CEO. Contribuintes não recebem o cadastro do tanque.

## Fichas de tratores e implementos

Abra **Estoque e compras → Equipamentos → Ficha**. A ficha reúne fazenda atual, situação, categoria, modelo, último horímetro informado, litros abastecidos, atividades, abastecimentos, manutenções e transferências acessíveis ao perfil. Os dados técnicos incluem fabricante, ano, série/chassi, potência, tanque da máquina e observações.

A ficha funciona para trator e implemento. Os equipamentos continuam nas categorias já criadas pelo CEO. Transferir trator entre fazendas preserva sua ficha; o histórico anterior continua na origem.

## Financeiro mensal

Em **Financeiro e fiscal → Resumo financeiro**, selecione o mês ou use as setas. Os totais, gráfico e lista passam a usar esse período. **Ver todo o período** retorna à consulta completa. A fazenda/consolidado e a atividade selecionada continuam sendo respeitados. Os atalhos de entradas e gastos mantêm o período escolhido.

## Talhões por imagem de satélite

Abra **Início → Mapa da fazenda**. Informe latitude e longitude e clique **Ir para coordenadas**. O mapa começa sem imagens externas; **Carregar imagem de satélite** consulta o serviço World Imagery da Esri. A atribuição do provedor fica visível no mapa. O provedor recebe a região visualizada; imagens precisam de conexão e não são em tempo real.

Clique **Marcar contorno**, marque os cantos, use **Desfazer ponto** ou **Limpar marcação** e depois **Salvar contorno**. Escolha o talhão/piquete compatível. O servidor valida coordenadas, cruzamentos e vínculo e recalcula hectares aproximados. É possível localizar, ajustar e arquivar contornos e **Exportar GeoJSON**. O desenho salvo não substitui levantamento técnico e não altera automaticamente a área cadastral do talhão.

O modo Gado vincula piquetes; café e grãos vinculam talhões. O consolidado consulta os contornos; para desenhar/ajustar, selecione uma fazenda. O botão **Ver croqui antigo** preserva o acesso aos desenhos esquemáticos anteriores. A biblioteca Leaflet 1.9.4 foi incluída localmente com sua licença; não é baixada de CDN ao usar o app. Contornos e biblioteca podem ficar no app offline; as imagens de satélite não são baixadas para uso offline.

Fontes de implementação: https://leafletjs.com/reference.html e https://doc.arcgis.com/en/data-appliance/2024/maps/world-imagery.htm.

## Validação realizada

- 222 testes automatizados passaram, incluindo tanque, saldo insuficiente, baixa idempotente, vínculo de contornos, geometria, rascunhos e bloqueio do ADM; inclui os testes ampliados de concorrência, restauração e cálculos.
- Navegador: tanque individual/consolidado, mudança de limite, ficha técnica do trator e edição de implemento, financeiro de setembro/2025, imagem real carregada e contorno desenhado/salvo, filtro do fiscal e recuperação de apontamento após falha HTTP 503 e recarga sem cofre. O apontamento recuperado foi conferido no banco local.
- O teste de falha simulou API indisponível com navegador indicando conexão; não substitui modo avião e testes em Android/iPhone reais.
- A prévia HTTPS foi aberta no navegador. Rotas de administração da plataforma, criação comercial de contas e algumas ações externas são bloqueadas na prévia pública, que usa somente dados fictícios.

## Prévia sem GitHub e sem Render

Foi utilizado um túnel HTTPS temporário do Cloudflare até um processo local isolado. A URL depende do computador e dos processos permanecerem ligados e muda ao criar outro túnel. É demonstração, não hospedagem definitiva nem banco de produção. Não utilize dados reais nela.

Referência: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/.

## Arquivos alterados

- `app.js`, `rascunhos-domain.js`: recuperação de rascunhos por aba e proteção de função no Perfil.
- `server.js`, `maodeobra-domain.js`, `maodeobra.js`: regras no servidor, filtro de talhões e mensagens de confirmação.
- `prioridades-domain.js`, `prioridades-server.js`: saldo físico, configuração do CEO, validação de fichas e geometria dos contornos.
- `prioridades.js`, `prioridades.css`: alertas, tanque, fichas e financeiro mensal.
- `mapa-satelite.js`, `assets/vendor/leaflet/*`: mapa, imagem, desenho e exportação de contornos.
- `evolucao.js`: origem do combustível no formulário de abastecimento.
- `app.html`, `campo-sw.js`: carregamento/cache dos novos arquivos.
- `package.json`, `package-lock.json`: versão 4.2.0.
- `tests/prioridades.test.cjs`, `tests/teste-ampliado.test.cjs`: testes novos e cenários ampliados.
- Este guia e `ALTERACOES-PRIORIDADES.json`: instruções e hashes dos arquivos comparados à versão anterior.

Para executar o ZIP, siga `.env.example` e os guias existentes, instale as dependências com `npm install` e use `npm start`. O pacote não inclui node_modules, banco da demonstração, credenciais, .env ou o executável do túnel. A versão 4.2.0 não foi enviada ao GitHub nem ao Render.
