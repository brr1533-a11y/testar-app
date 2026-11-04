# Ajustes e busca regional — 4.12.4

## O que mudou e onde fica

- Modo Gado: não mostra Orçamento de safra nem cria a categoria Lavoura com funções compartilhadas. Mão de obra o ano todo, Arrendamentos e Prestadores ficam em Financeiro e fiscal nas três atividades. Orçamento continua em café e grãos.
- Reprodução e sanidade / Gado de leite: 24 px entre indicadores e abas ou gráfico.
- Apontar colheita: barra Salvar acompanha o fundo do tema; ação desabilitada fica discreta e habilitada usa destaque com texto contrastante.
- Login: Entrar/Registrar acompanha o tema e corrige texto claro sobre dourado.
- Super Admin → Plano: lê os valores de planos-atividades.json para as atividades do grupo. Padrão mensal: R$ 99 / R$ 199 / R$ 350. Receita confirmada e assinaturas existentes não são reescritas.
- Estoque e compras → Preços da região: nova opção Buscar cooperativas com IA. Prioriza cooperativas com presença comprovada no município/UF e fontes oficiais, sem prometer cobertura completa ou menor preço.

## Como consultar preços

O comparador de notas já existente usa compras classificadas e compartilhadas com consentimento, normalizadas por unidade. Só mostra agregados com pelo menos três fazendas de três grupos. Informe a mesma descrição padronizada, princípio ativo quando aplicável, unidade e região/período.

A busca web é separada. Informe UF, município, produto/marca/embalagem, unidade e cooperativas de preferência. Confirme o envio à OpenAI. O app não anexa notas, histórico financeiro, nomes de pessoas ou resumo da fazenda. Respostas têm links e data da consulta; sem preço público, a orientação é “sob consulta”. Confira a condição de associado, frete e validade diretamente com o fornecedor. A IA não compra, não envia WhatsApp e não alimenta automaticamente o comparador coletivo.

## Ativação da IA

Permanece desligada por padrão. Para ativar no servidor: AI_ENABLED=true, OPENAI_API_KEY e OPENAI_MODEL com modelo compatível com web_search. Ajuste AI_DAILY_REQUEST_LIMIT e, opcionalmente, AI_ALLOWED_GROUP_IDS. Nunca coloque chaves no código ou no ZIP. Não foram feitas chamadas pagas nesta revisão: testes usaram provedor simulado.

Documentação consultada: https://developers.openai.com/api/docs/guides/tools-web-search — Responses API, localização aproximada e citações clicáveis.

## Arquivos e conferência

- expansao-domain.js, melhorias-domain.js, adm-access.js: restrições por atividade e categorias compartilhadas.
- expansao.js: filtra orçamento por atividade e inclui formulário/resultados da busca regional.
- visual-painel.css: espaçamento, cores do login e barra Salvar.
- platform.js: preços pela tabela e combinação de atividades.
- ia-server.js: valida critérios regionais, localização aproximada e instruções para cooperativas/preços sem fonte.
- tests/menu-activity.test.cjs, tests/platform-pricing.test.cjs, tests/regional-price.test.cjs: regressões de menu, preços e IA sem consumo real.
- package.json e package-lock.json: versão. campo-sw.js: atualização do cache offline gerado.

307 testes automáticos passaram. Conferidos no navegador: menu de Gado, espaçamento das duas telas, preços no Super Admin, login, Salvar do fiscal e aviso de IA desligada. Integração paga, fontes reais e dispositivos físicos não foram validados nesta rodada. Permanecem os nove avisos moderados da cadeia ExcelJS documentados na revisão anterior.

Pacote local. GitHub/Render ainda não atualizados nesta rodada.
