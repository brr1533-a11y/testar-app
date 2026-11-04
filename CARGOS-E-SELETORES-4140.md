# Cargos e seletores — 4.14.0

Pacote completo do sistema. Alterações somente locais; não enviadas ao GitHub ou Render.

## Onde fica e como usar

Como CEO, abra **Configurações › Cargos e permissões**.

- Cargos prontos: ADM, Campo, Tratorista, Fiscal de colheita e Geral.
- Geral reúne Campo e Tratorista. Use **Personalizar uma cópia** para marcar também Fiscal ou escolher outra combinação.
- Em **Criar cargo**, escolha o nível Operacional e marque uma ou mais rotinas. No nível Administrador valem as permissões do ADM do grupo, e as rotinas ficam ocultas.
- Cadastre o login em Usuários e depois use **Escolher cargo**. Selecione explicitamente o cargo, a fazenda e as atividades liberadas. A troca encerra as sessões da pessoa.
- Um cargo em uso permite renomear, mas alterações no nível ou nas rotinas exigem criar outro cargo e transferir as pessoas. Isso evita mudanças silenciosas em acessos já concedidos.
- Os cargos antigos continuam funcionando. Esta atualização não redistribui permissões de usuários existentes.

O apontamento da colheita continua limitado ao Café contratado e liberado ao usuário. A combinação com Fiscal não expõe CPF, Pix, valores da mão de obra, ajustes ou valores dos fechamentos. Nenhuma combinação operacional promove o usuário a ADM ou CEO.

Os seletores simples das páginas agora usam listas no tema do site. Mantêm o campo original no formulário, com validação, valor e eventos de alteração. Há navegação por setas, Enter, Escape e busca pelas letras iniciais. Listas nativas de seleção múltipla mantêm seu comportamento anterior; as rotinas do cargo usam caixas de seleção.

## Arquivos e motivos

| Arquivo | Motivo |
| --- | --- |
| `equipe-domain.js` | Cargos prontos, combinações de rotinas, validação e preservação dos vínculos protegidos pelo servidor. |
| `equipe.js` | Tela de cargos, cópia dos modelos, caixas de rotinas e seleção explícita do cargo ao atribuir. |
| `server.js` | Projeção e gravação do fiscal combinado, restrição à atividade Café, proteção das rotinas contra PUT/importação e publicação do novo recurso estático. Fiscal exclusivo não registra atribuições de equipamentos pelo PUT. |
| `app.js` | Permissões de tratorista por rotina, equipamento opcional no Geral com Campo e identificação do cargo no perfil. |
| `maodeobra.js` | Fiscal combinado mantém o menu operacional e recebe o atalho de apontamento; fiscal exclusivo mantém seu menu restrito. |
| `rotina-rural-domain.js` | Registro de horas de máquina reconhece a rotina Tratorista nos cargos combinados. |
| `expansao-domain.js` | Diferencia fiscal exclusivo das combinações que também trabalham em Campo. |
| `seletores.js` | Listas personalizadas com teclado, toque, validação, opções desabilitadas e integração com formulários dinâmicos. |
| `controles.css` | Visual dos seletores com contraste nos temas claro e escuro, sem brilho. |
| `app.html` | Carrega a definição de rotinas antes dos módulos que dependem dela e inclui os seletores. |
| `cafe.html`, `contador.html`, `demo.html`, `gado.html`, `graos.html`, `index.html`, `platform.html`, `primeiro-acesso-template.html`, `privacidade.html`, `termos.html` | Incluem o mesmo componente de seletores para consistência entre páginas. |
| `campo-sw.js` | Cache offline regenerado com os novos arquivos. |
| `tests/cargos-combinados.test.cjs` | Testes de combinações, permissões, projeção, gravação, revogação de sessões e isolamento por atividade. |
| `package.json`, `package-lock.json` | Versão 4.14.0; sem novas dependências. |
| `CARGOS-E-SELETORES-4140.md`, `ALTERACOES-CARGOS-4140.json` | Orientações e inventário de arquivos alterados com hashes. |

## Validação desta entrega

- `npm test`: **312 passaram, 0 falharam**.
- Verificação de sintaxe: **178 arquivos JavaScript/CJS**.
- Verificação HTTP: **95 recursos estáticos** acessíveis; APIs sem autenticação bloqueadas e configuração inicial pública desabilitada.
- No navegador: criação e salvamento de cargo com três rotinas, atribuição a usuário fictício, alternância Operacional/Administrador, preservação das caixas marcadas e seletores sem o popup azul nativo.
- Teclado: setas e Enter alteraram o nível; Escape fechou a lista sem fechar o formulário.
- Tela simulada de 390 × 844: formulário e lista couberam na largura disponível, sem transbordamento horizontal. A simulação não substitui teste físico em iPhone ou Android.
- Nenhum erro JavaScript foi observado no console da prévia conferida.
- O ZIP foi conferido por CRC e hashes, sem dependências instaladas, `.env`, banco local ou dados fictícios da prévia.

As integrações externas, IA paga e publicação em produção não foram ativadas. A prévia utiliza exclusivamente dados fictícios, separados do ZIP.
