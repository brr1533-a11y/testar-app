# Revisão — 4.16.4

Feita sobre a 4.16.3 do GitHub. Nenhuma tela, regra, permissão ou dado de cliente mudou.

## 1. Roteiros de navegador atualizados

Cinco roteiros falhavam porque o sistema mudou de propósito e eles não acompanharam:

| Roteiro | Mudança no sistema | Ajuste no roteiro |
| --- | --- | --- |
| `browser.cjs`, `seasons-browser.cjs`, `soil-browser.cjs` | 4.14: os seletores põem botões (`type=button`) dentro dos filtros | O clique vai só no botão que envia o filtro (**Filtrar**) |
| `operacao-browser.cjs` | 4.10: o café mostra o perfil de qualidade por faixas no lugar da legenda | Confere as qualidades no perfil novo (`.coffee-quality-profile`) |
| `themes-inputs-browser.cjs` | 4.9: com o visual do painel, o topo usa um degradê | Com o visual do painel, confere o degradê; sem ele, continua conferindo a paisagem de cada atividade |

## 2. Limite diário da IA (a IA continua desligada)

- **Contador guardado no banco:** não zera ao reiniciar o servidor e vale para todas as cópias do servidor.
- **Limite por grupo:** `AI_DAILY_GROUP_LIMIT`, padrão 5 por dia. Um grupo não esgota a cota dos outros. O limite geral continua em `AI_DAILY_REQUEST_LIMIT` (padrão 10) e o do grupo nunca passa dele.
- **Na tela:** "2 de 5 tentativa(s) do grupo hoje".
- **Arquivos:**
  - `ia-server.js`: o contador e os limites;
  - `server.js`: passa o banco para a IA;
  - `ia-assistente.js` e `ia.js`: o texto da tela;
  - `.env.example` e `IA-4.3.md`: a variável nova e a explicação.
- **Testes:**
  - `tests/ia.test.cjs` ganhou um caso novo: o contador continua depois de reiniciar, há limite por grupo e por servidor, e o contador zera no dia seguinte;
  - o teste de chamadas simultâneas agora espera a chamada existir antes de responder;
  - `tests/regional-price.test.cjs` foi ajustado à consulta de situação, que agora é assíncrona.

## Validação

Resultado no fim deste arquivo, depois da execução completa.

Os 9 avisos moderados nas bibliotecas da importação de planilhas (ExcelJS) não foram mexidos: trocar a biblioteca pode quebrar a importação.

## Resultado

- `npm test`: **319 de 319** (os 318 anteriores e o caso novo do contador da IA).
- Roteiros de navegador: **20 de 20** no Brave, rodados em sequência.
