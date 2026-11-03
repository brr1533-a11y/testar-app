# Revisão do QR e publicação — 4.12.1

## Mudanças desta revisão

- `coffee-studio.js`: ao abrir o QR de um lote, seleciona Safras como página ativa, a fazenda e o lote. Evita que a atualização dos dados substitua a ficha pela visão geral.
- `coffee-studio.js`: mostra as observações das medições uma única vez na ficha.
- `tests/coffee-qr.test.cjs`: lê a imagem SVG emitida pela API com um decodificador independente (`jsqr`), confere a URL, ausência de credenciais no QR, cache desativado, lote inexistente e permissões de visitante, funcionário e ADM.
- `package.json` e `package-lock.json`: versão 4.12.1 e jsqr 1.4.0 apenas como dependência de desenvolvimento.

Inclui integralmente as versões 4.11 (café e cadastro de provedores desligados) e 4.12 (vínculos comerciais e cenários agrícolas). Consulte os respectivos guias. Leite e agricultura de precisão completa continuam pendentes; o cadastro de provedor não ativa integração.

## Uso do QR

Safras e produção → Lotes, terreiro e amostras → Abrir ficha → Gerar QR da ficha. O arquivo SVG pode ser impresso. O QR abre `/app?activity=coffee&farmId=...&coffeeLot=...` e exige login e acesso ao café. Não é uma página pública para compradores. Em produção, configure PUBLIC_BASE_URL com o HTTPS público correto; um endereço localhost não abre a fazenda em outro aparelho.

## Limites da conferência

O teste automático decodifica o SVG real e testa a API. A câmera de um iPhone físico e a persistência offline após reiniciar o aparelho precisam de teste no dispositivo. Publicação no GitHub não comprova que o deploy no Render terminou.

O npm audit informou nove avisos moderados na cadeia de dependências do ExcelJS (incluindo minimatch e uuid), sem avisos altos ou críticos. Não foi aplicado downgrade automático do ExcelJS nem atualização forçada incompatível. Esta revisão não equivale a uma auditoria de segurança completa.
