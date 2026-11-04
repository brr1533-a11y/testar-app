# Contraste na panha — 4.13.1

Corrigido o cartão de cada pessoa em Apontar colheita: o fundo branco fixo vinha de --card, variável que não acompanhava o tema escuro. O cartão agora usa --surface e --ink; função usa --muted com opacidade integral. Contador, menos, mais e diária recebem cores explícitas. Diária selecionada tem destaque dourado com texto escuro. Estados desabilitado e foco por teclado têm aparência definida.

Arquivo funcional alterado: visual-painel.css. campo-sw.js regenerado para atualizar o cache. package.json e package-lock.json atualizados para 4.13.1.

Conferência no navegador com fiscal e pessoa fictícios: tema escuro (contraste de nome/contador 12,82:1; função 6,43:1; diária 11,85:1), tema claro e diária selecionada. Nenhum apontamento foi salvo para testar as cores. Não foi necessário repetir a suíte lógica de 310 testes da versão base, pois esta alteração é visual. O ZIP preserva os módulos e testes anteriores.

Prévia nova e isolada em http://127.0.0.1:62731/fiscal, preservando a prévia anterior. Sem publicação no GitHub/Render.
