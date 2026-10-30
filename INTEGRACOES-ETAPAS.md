# Integrações das etapas 3–8

## Estado desta entrega

Fiscal/SEFAZ, previsão do tempo e WhatsApp permanecem sem adaptador. As APIs respondem HTTP 503 quando a operação depende desses serviços. Não existem credenciais, certificados ou senhas reais neste pacote.

Não basta trocar uma variável para emitir NF-e: é necessário implementar e homologar um adaptador do provedor escolhido. `integracoes-etapas.js` concentra esse vínculo; o restante do painel não precisa conhecer o fornecedor.

## Contratos para o futuro adaptador

Registrar no servidor com `register(nome, adaptador)`, depois de validar a configuração do ambiente. Não registrar a partir de uma requisição HTTP, de dados do grupo ou de código do navegador.

| Nome | Métodos | Contrato |
| --- | --- | --- |
| `fiscal` | `issue({draft, issuer, environment, idempotencyKey})` | Retornar `status` (`authorized`, `rejected` ou `processing`). Autorização exige chave de 44 dígitos e protocolo. Guardar respostas e usar idempotência do provedor. |
| `fiscal` | `distribute({taxId, lastNsu, environment})` | Retornar `documents` e `lastNsu`. Cada documento autorizado deve conter `status`, `key`, `number`, `date`, `party`, `total` e `items` (nome, quantidade, unidade e preço unitário). O certificado e o vínculo ao CPF/CNPJ devem ser conferidos no provedor. |
| `weather` | `forecast({uf, city, municipalityCode})` | Retornar previsão com origem, horário, período e `summary` para apresentação. Manter a integração substituível. |
| `whatsapp` | `send({phone, template, parameters, idempotencyKey})` | Usar canal Business autorizado e modelo aprovado; aceitar somente números com consentimento do usuário. A confirmação de entrega depende do futuro provedor. |

O fiscal usa homologação como padrão. Antes de habilitar um provedor, completar também o fluxo de consulta de situações pendentes/rejeitadas, sincronização da autorização com o documento fiscal, cancelamento/eventos, logs e tratamento de falhas. O esqueleto atual guarda o resultado por rascunho; não representa um ciclo fiscal de produção completo. MDF-e continua como registro local, sem emissão oficial.

A emissão/busca real depende do provedor, certificado, autorizações e testes com a SEFAZ. A classificação IBS/CBS deve acompanhar as tabelas e notas técnicas oficiais da data da implantação; não há alíquotas universais ou cálculo tributário presumido nesta versão.

Referências oficiais: [notas técnicas da NF-e](https://www.nfe.fazenda.gov.br/Portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY%3D) e [Distribuição DF-e](https://www.nfe.fazenda.gov.br/Portal/exibirArquivo.aspx?conteudo=BttMW6T7ib8%3D).

## Push

`PUSH_ENABLED=false` por padrão. Para testar depois, configurar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` somente no ambiente do servidor e habilitar a flag. A chave privada não vai ao navegador.

O usuário precisa instalar/abrir o app em um navegador compatível, conceder permissão, autorizar o aparelho e ativar push em suas preferências. No iPhone, validar no app adicionado à Tela de Início. O servidor verifica endpoints dos serviços de push aceitos, limita a cinco assinaturas por usuário, elimina assinaturas expiradas e registra tentativas. Mensagens levam um aviso genérico e abrem `/app`.

Há varredura de avisos a cada minuto quando algum canal está configurado. O registro de envio evita repetir a mesma faixa de vencimento/aviso confirmado. Sem provedor de WhatsApp, esse canal permanece pendente. Entrega real no Android/iPhone ainda precisa de teste em aparelho e HTTPS; os testes automatizados não substituem esse teste.

Biblioteca: [web-push](https://github.com/web-push-libs/web-push).

## Comparador e privacidade

- Importar XML não marca a compra como verificada para publicação coletiva.
- Só notas verificadas por integração no servidor e fazendas com consentimento participam.
- Normalização: município/UF, produto padronizado, princípio ativo e unidade base; preço dividido pela quantidade da embalagem.
- Janelas fixas de 30/60/90 dias; mínimo de três fazendas de três grupos distintos.
- Retorno apenas de mínimo, mediana, máximo e contagem agregada; sem nomes, notas ou IDs de fazendas.
- A versão pública (`COLLECTIVE_PUBLIC_ENABLED`) fica desligada. O limite de três participantes é uma regra do produto, não garantia automática de anonimização jurídica. Revisar a privacidade antes de abrir dados reais, conforme o [estudo da ANPD sobre anonimização](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/estudo_tecnico_sobre_anonimizacao_de_dados_na_lgpd___analise_juridica.pdf).

O histórico de classificação da compra não presume princípio ativo ou embalagem a partir do nome: esses dados precisam ser conferidos pelo usuário.

## Operação e limites conhecidos

Continuar com uma instância do servidor, como na configuração anterior: limites e bloqueios de concorrência locais não são distribuídos entre réplicas. Fazer backup do PostgreSQL/anexos antes de instalar. O portal do contador usa convites de sete dias e sessão de oito horas; recuperação de senha específica dessa conta ainda precisa ser conectada ao serviço de e-mail escolhido.

Checklists 4C/Certifica Minas são roteiros internos editáveis. Não substituem os critérios completos e a avaliação da certificadora. Os modelos de implantação criam apenas a estrutura informada: o usuário cadastra os animais, pesagens e dados reais nos módulos correspondentes.
