# Checklist de produção — Gestão Rural v22

Antes de liberar clientes reais:

1. Render Web Service usa **Node**, `npm ci` (usa o `package-lock.json`), `npm start`.
2. Defina `NODE_ENV=production`. Depois do deploy, confira no log a linha `[proteções]`: ela deve dizer `modo: PRODUÇÃO`, `compra de teste: desligada`, `chave legada da plataforma: recusada` e `assinatura do webhook: conferida`.
3. `DATABASE_URL` aponta para o PostgreSQL do Render.
4. `PUBLIC_BASE_URL` é o endereço público correto.
5. Defina `SEED_CEO_PASSWORD` forte e exclusiva. Senhas que contenham a sequência antiga que circulou no README são recusadas e o servidor não sobe.
6. Defina `PLATFORM_ADMIN_EMAIL` e `PLATFORM_ADMIN_PASSWORD` (mesma regra de senha forte).
7. Remova `PLATFORM_SETUP_KEY` do serviço de produção.
8. Entre em `/platform` e confirme que o login novo funciona.
9. Quando o Resend estiver pronto, defina `PLATFORM_REQUIRE_2FA=true` e teste o código por e-mail.
10. `TEST_PURCHASE_MODE=false` e `ALLOW_TEST_MODE_IN_PRODUCTION=false` antes de abrir ao público. Teste de compra só num serviço separado, com `TEST_MODE_UNTIL`.
11. Configure `MERCADOPAGO_ACCESS_TOKEN` real apenas no ambiente de produção correto.
12. Configure `MERCADOPAGO_WEBHOOK_SECRET` com a assinatura secreta do painel do Mercado Pago (Suas integrações > Webhooks). Sem ela, o servidor aceita avisos sem conferir a origem.
13. Rode **uma única instância**: os limites de tentativa ficam na memória do servidor. Se o log mostrar o mesmo IP para todos os acessos, ajuste `TRUST_PROXY`.
14. Faça uma compra de teste homologada e confirme plano, período, valor e criação do Grupo.
15. Teste `Esqueci minha senha` em outro aparelho.
16. Teste um Contribuinte e confirme que ele não vê financeiro, outras fazendas ou outros funcionários.
17. Teste um ADM e confirme que ele não vê preço de venda nem custo planejado da produção.
18. Teste suspensão, arquivamento e Reset CEO pelo `/platform`.
19. Ative backups do PostgreSQL no provedor e faça pelo menos um teste de restauração.
20. Use domínio próprio/HTTPS antes de clientes reais.
21. Publique Termos de Uso e Política de Privacidade/LGPD.

## Variáveis novas da v22

```text
PLATFORM_ADMIN_EMAIL=
PLATFORM_ADMIN_PASSWORD=
PLATFORM_SESSION_HOURS=12
PLATFORM_REQUIRE_2FA=false
ALLOW_LEGACY_PLATFORM_KEY=false
ALLOW_TEST_MODE_IN_PRODUCTION=false
TEST_MODE_UNTIL=
MERCADOPAGO_WEBHOOK_SECRET=
TRUST_PROXY=1
DATABASE_SSL_STRICT=false
```

A antiga `PLATFORM_SETUP_KEY` não é necessária para o login normal do Super Admin da v22.
