# Deploy do Fluxo (VPS Hostinger, Ubuntu)

Stack nativa: Node 22 + pm2 (usuário `deploy`) → nginx (HTTPS, certbot) → MariaDB local.
App em `/home/deploy/fluxo`, segredos em `/home/deploy/fluxo/backend/.env` (chmod 600, dono `deploy`).
O backend escuta na 3001, mas o ufw só libera 22/80/443: de fora, tudo passa pelo nginx.

Os comandos abaixo rodam num terminal normal (Git Bash/PowerShell) na raiz do repo. Os que usam `ssh -t` são interativos e não funcionam com o `!` do Claude Code.

## 1. Primeira instalação

A pasta `deploy/` e o `ecosystem.config.cjs` precisam estar no GitHub (`main`), porque o script clona o repo.

```bash
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 'bash -s' < deploy/setup.sh
```

O script é idempotente: pode rodar de novo. Ele não sobrescreve o `.env` nem troca a senha do banco, e o `init.sql` só roda com o banco vazio.
No fim ele imprime as checagens: HTTP 301→HTTPS, `/api/plans` 200, webhook sem token 401, portas, pm2 e `certbot renew --dry-run`.

## 2. Token do webhook do Asaas

```bash
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 "grep '^ASAAS_WEBHOOK_TOKEN=' /home/deploy/fluxo/backend/.env"
```

No painel do Asaas, em Integrações → Webhooks, configure:
- URL: `https://fluxoagendamentos.com.br/api/subscriptions/webhook`
- Token de autenticação: o valor acima

## 3. Colar a ASAAS_API_KEY e reiniciar

```bash
ssh -t -i ~/.ssh/fluxo_vps root@179.236.75.179 "sudo -u deploy nano /home/deploy/fluxo/backend/.env"
# edite a linha ASAAS_API_KEY=... e salve (Ctrl+O, Enter, Ctrl+X)
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 "sudo -u deploy -H pm2 restart fluxo --update-env"
```

Para ir para produção no Asaas, troque também `ASAAS_API_URL=https://api.asaas.com/v3` e use a chave de produção.

## 4. Deploys seguintes

```bash
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 "sudo -u deploy -H bash /home/deploy/deploy.sh"
```

O script faz `git pull --ff-only`, `npm ci`, o build do front (API na mesma origem), `npm ci` do backend e `pm2 reload`, e para no primeiro erro.
Migrations novas não rodam sozinhas. Aplique cada uma com:

```bash
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 "mariadb fluxodb < /home/deploy/fluxo/backend/migrations/<arquivo>.sql"
```

## 5. Criar o admin

1. Crie a conta normalmente em https://fluxoagendamentos.com.br/registro.
2. Promova a conta para admin:

```bash
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 "mariadb fluxodb -e \"UPDATE users SET role = 'ADMIN' WHERE email = 'SEU_EMAIL'\""
```

3. Saia e entre de novo para gerar o token com a role nova.

## Útil

```bash
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 "sudo -u deploy -H pm2 logs fluxo --lines 100 --nostream"
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 "sudo -u deploy -H pm2 status"
```
