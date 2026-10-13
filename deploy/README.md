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

## 4. Email (confirmação de cadastro e recuperação de senha)

O app manda dois emails por SMTP: o link de confirmação do cadastro e o link do "Esqueci minha senha".

> **Importante:** o login de quem se cadastra fica bloqueado até a pessoa clicar no link de confirmação. **Sem SMTP configurado, ninguém novo consegue entrar.** As telas respondem normalmente, mas o email não sai; só fica um erro no `pm2 logs`. Configure o SMTP antes de divulgar o cadastro.

**Senha de app no Gmail.** A conta remetente precisa ter a verificação em 2 etapas ativada.
1. Ative a verificação em 2 etapas em https://myaccount.google.com/security.
2. Gere a senha de app em https://myaccount.google.com/apppasswords. Dê um nome, por exemplo "Fluxo VPS".
3. Copie os 16 caracteres sem os espaços. Essa é a `SMTP_PASS`; a senha normal da conta não funciona.

**Variáveis no `backend/.env`.** Edite como no passo 3. Se o `.env` foi criado antes desta versão, as linhas não existem: acrescente-as.

```ini
PUBLIC_URL=https://fluxoagendamentos.com.br
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=fluxoagendamentos@gmail.com
SMTP_PASS=<senha de app de 16 caracteres>
MAIL_FROM=Fluxo <fluxoagendamentos@gmail.com>
```

`PUBLIC_URL` é a base do link do email. Sem ela, em produção o link não é gerado.
Depois de editar: `sudo -u deploy -H pm2 restart fluxo --update-env`, como no passo 3.

**Migrations.** Rode uma vez, nesta ordem, logo depois do deploy desta versão. O `setup.sh` já faz isso em instalações novas.

```bash
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 "mariadb fluxodb < /home/deploy/fluxo/backend/migrations/003_password_resets.sql"
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 "mariadb fluxodb < /home/deploy/fluxo/backend/migrations/004_email_verification.sql"
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 "mariadb fluxodb < /home/deploy/fluxo/backend/migrations/005_email_change.sql"
```

A 005 vem com a troca de email: o email novo fica pendente até o link enviado para ele ser aberto. Se o servidor já tem a 003 e a 004, rode só a 005, logo após o deploy da versão que a traz. Até lá, cadastro, confirmação de email, reenvio e troca de email dão erro 500, porque as colunas novas ainda não existem.

A 004 marca como confirmadas todas as contas que já existem (admin, donos, funcionários); sem isso ninguém entraria depois do deploy. Essa marcação só acontece na primeira execução, enquanto a tabela `email_verifications` está vazia. Rodar de novo depois não confirma cadastros novos por engano.

**Regras:**
- O link de redefinição de senha vale 1 hora; o de confirmação, 24 horas. Os dois são de uso único, e o banco guarda só o hash do token.
- O reenvio da confirmação é limitado a 3 por 15 minutos por IP e a 1 por minuto por conta.
- Funcionários criados pelo dono entram já confirmados.
- Redefinir a senha pelo link do email também confirma o email.
- Trocar ou redefinir a senha encerra as outras sessões abertas. A sessão de quem trocou continua.
- Trocar o email (`PUT /api/auth/me`) exige a senha atual. O link vai para o email novo, e o antigo recebe só um aviso. O login continua com o email antigo até a confirmação. O limite é o mesmo do reenvio: 3 pedidos a cada 15 minutos por IP e 1 por minuto por conta.

## 5. Deploys seguintes

```bash
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 "sudo -u deploy -H bash /home/deploy/deploy.sh"
```

O script faz `git pull --ff-only`, `npm ci`, o build do front (API na mesma origem), `npm ci` do backend e `pm2 reload`, e para no primeiro erro.
Migrations novas não rodam sozinhas. Aplique cada uma com:

```bash
ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 "mariadb fluxodb < /home/deploy/fluxo/backend/migrations/<arquivo>.sql"
```

## 6. Criar o admin

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
