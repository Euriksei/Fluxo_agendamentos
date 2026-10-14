#!/usr/bin/env bash
# Provisiona a VPS do Fluxo (Ubuntu, nativo, sem docker). Idempotente: pode rodar de novo sem perder dados.
# Rodar como root, a partir da raiz do repo no PC:
#   ssh -i ~/.ssh/fluxo_vps root@179.236.75.179 'bash -s' < deploy/setup.sh
# Pré-requisito: a pasta deploy/ e o ecosystem.config.cjs já estão no GitHub (o script clona o repo e usa os arquivos de lá).
# Segredos (senha do banco, JWT_SECRET, ASAAS_WEBHOOK_TOKEN) são gerados aqui e só vão para o backend/.env; nunca são impressos.
set -euo pipefail

DOMAIN=fluxoagendamentos.com.br
REPO=https://github.com/Euriksei/Fluxo_agendamentos.git
BRANCH=main
APP_USER=deploy
APP_HOME=/home/$APP_USER
APP_DIR=$APP_HOME/fluxo
ENV_FILE=$APP_DIR/backend/.env
DB_NAME=fluxodb
DB_USER=fluxo

export DEBIAN_FRONTEND=noninteractive

log() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERRO: %s\n' "$*" >&2; exit 1; }
as_app() { sudo -u "$APP_USER" -H bash -c "set -euo pipefail; $1"; }

[[ $EUID -eq 0 ]] || die "rode como root"
id "$APP_USER" >/dev/null 2>&1 || die "usuário $APP_USER não existe"

# ---------------------------------------------------------------- 1) pacotes
log "Pacotes base"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git openssl sudo

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v22.* ]]; then
    log "Node.js 22 LTS (NodeSource)"
    curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
    bash /tmp/nodesource_setup.sh
    rm -f /tmp/nodesource_setup.sh
    apt-get install -y -qq nodejs
fi

log "MariaDB, nginx, certbot"
apt-get install -y -qq mariadb-server nginx certbot python3-certbot-nginx
systemctl enable --now mariadb nginx

if ! command -v pm2 >/dev/null 2>&1; then
    log "pm2 global"
    npm install -g pm2 --no-audit --no-fund
fi

# ---------------------------------------------------------------- MariaDB seguro (equivalente ao mysql_secure_installation)
log "MariaDB: removendo usuários anônimos, root remoto e banco test"
mariadb <<'SQL'
DELETE FROM mysql.global_priv WHERE User = '';
DELETE FROM mysql.global_priv WHERE User = 'root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db = 'test' OR Db = 'test\\_%';
FLUSH PRIVILEGES;
SQL

# ---------------------------------------------------------------- 3) código
log "Repositório em $APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
    as_app "cd '$APP_DIR' && git pull --ff-only"
else
    as_app "git clone --branch '$BRANCH' '$REPO' '$APP_DIR'"
fi
# backend/uploads está no .gitignore: persiste entre deploys
install -d -o "$APP_USER" -g "$APP_USER" -m 755 "$APP_DIR/backend/uploads"

# ---------------------------------------------------------------- 4) backend/.env (não sobrescreve)
if [[ -f "$ENV_FILE" ]]; then
    log ".env já existe: mantido (senha do banco e segredos preservados)"
    DB_PASS=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | head -n 1 | cut -d= -f2- || true)
    [[ -n "$DB_PASS" ]] || die "DB_PASSWORD vazio em $ENV_FILE"
    ENV_CREATED=0
else
    log "Gerando $ENV_FILE (segredos novos, não impressos)"
    DB_PASS=$(openssl rand -hex 24)
    install -m 600 -o "$APP_USER" -g "$APP_USER" /dev/null "$ENV_FILE"
    cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_NAME=$DB_NAME

JWT_SECRET=$(openssl rand -hex 32)

ASAAS_API_URL=https://api-sandbox.asaas.com/v3
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=$(openssl rand -hex 32)

# Base dos links enviados por email (redefinição de senha)
PUBLIC_URL=https://$DOMAIN

# SMTP (Gmail: smtp.gmail.com, 465, SMTP_SECURE=true, SMTP_PASS = senha de app). Vazio = emails não saem (erro no log).
SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
EOF
    ENV_CREATED=1
fi
chown "$APP_USER:$APP_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"

# ---------------------------------------------------------------- 2) banco + usuário + migrations
log "Banco $DB_NAME e usuário $DB_USER@localhost"
mariadb <<SQL
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL
# .env novo + usuário já existente (ex.: .env apagado): sincroniza a senha com o .env, que é a fonte da verdade
if [[ $ENV_CREATED -eq 1 ]]; then
    mariadb <<SQL
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
FLUSH PRIVILEGES;
SQL
fi
unset DB_PASS

plans_count() { mariadb -N -B -e "SELECT COUNT(*) FROM $DB_NAME.plans" 2>/dev/null || echo 0; }

# init.sql não é reexecutável (o INSERT dos planos duplicaria): só roda com o banco vazio
if [[ "$(plans_count)" == "0" ]]; then
    log "Aplicando migrations/init.sql"
    mariadb < "$APP_DIR/backend/migrations/init.sql"
else
    log "init.sql já aplicado: pulando"
fi
log "Aplicando migrations/002_subscription_pending_plan.sql (idempotente)"
mariadb "$DB_NAME" < "$APP_DIR/backend/migrations/002_subscription_pending_plan.sql"
log "Aplicando migrations/003_password_resets.sql (idempotente)"
mariadb "$DB_NAME" < "$APP_DIR/backend/migrations/003_password_resets.sql"
log "Aplicando migrations/004_email_verification.sql (idempotente; só a 1ª execução marca as contas existentes como confirmadas)"
mariadb "$DB_NAME" < "$APP_DIR/backend/migrations/004_email_verification.sql"
log "Aplicando migrations/005_email_change.sql (idempotente)"
mariadb "$DB_NAME" < "$APP_DIR/backend/migrations/005_email_change.sql"
log "Aplicando migrations/006_subscription_expired.sql e 007_user_cpf_cnpj.sql (idempotentes)"
mariadb "$DB_NAME" < "$APP_DIR/backend/migrations/006_subscription_expired.sql"
mariadb "$DB_NAME" < "$APP_DIR/backend/migrations/007_user_cpf_cnpj.sql"

PLANS=$(plans_count)
[[ "$PLANS" == "4" ]] || die "esperava 4 planos, encontrei $PLANS"
echo "OK: 4 planos"
mariadb -N -B -e "SELECT CONCAT('   ', id, ' ', slug, ' ', price) FROM $DB_NAME.plans ORDER BY id"

# ---------------------------------------------------------------- 3+5) build + pm2 (o mesmo deploy.sh de todo deploy)
log "Wrapper /home/deploy/deploy.sh"
cat > "$APP_HOME/deploy.sh" <<'EOF'
#!/bin/sh
exec bash /home/deploy/fluxo/deploy/deploy.sh "$@"
EOF
chown "$APP_USER:$APP_USER" "$APP_HOME/deploy.sh"
chmod 755 "$APP_HOME/deploy.sh"

log "Build e pm2 (deploy.sh)"
as_app "bash '$APP_DIR/deploy/deploy.sh'"

log "pm2 startup (systemd, usuário $APP_USER)"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "$APP_HOME" >/dev/null
as_app "pm2 save"

# ---------------------------------------------------------------- 6) nginx + HTTPS
log "nginx"
install -m 644 "$APP_DIR/deploy/nginx-fluxo.conf" /etc/nginx/sites-available/fluxo
ln -sf /etc/nginx/sites-available/fluxo /etc/nginx/sites-enabled/fluxo
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

log "certbot (só o apex $DOMAIN, redirect HTTP -> HTTPS)"
# --reinstall: numa segunda execução reaproveita o certificado e reaplica o SSL no arquivo recém-copiado
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect --reinstall
nginx -t
systemctl reload nginx

# ---------------------------------------------------------------- 8) checagens (não abortam o script)
set +e
log "Checagens"
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
echo "backend local /health ............ $(code http://127.0.0.1:3001/health)   (esperado 200)"
echo "http://$DOMAIN/ ................... $(code "http://$DOMAIN/")   (esperado 301)"
echo "https://$DOMAIN/ .................. $(code "https://$DOMAIN/")   (esperado 200)"
echo "https://$DOMAIN/api/plans ......... $(code "https://$DOMAIN/api/plans")   (esperado 200)"
echo "webhook sem token ................. $(code -X POST "https://$DOMAIN/api/subscriptions/webhook")   (esperado 401)"
echo "HTML servido: $(curl -s "https://$DOMAIN/" | grep -o '<title>[^<]*</title>' | head -n 1)"

echo
echo "Portas em escuta (3001 só pode sair pelo nginx; 3306 só em 127.0.0.1):"
ss -tlnp | grep -E ':(80|443|3001|3306) ' || true
if ufw status | grep -qE '^(3001|3306)'; then
    echo "ATENÇÃO: o ufw tem regra para 3001/3306. Remova-a."
else
    echo "ufw: sem regra para 3001/3306 (só 22/80/443 liberados)"
fi
ufw status | head -n 1

echo
as_app "pm2 status"

echo
certbot certificates 2>/dev/null | grep -E 'Domains|Expiry'
log "certbot renew --dry-run"
certbot renew --dry-run 2>&1 | tail -n 3
systemctl is-enabled certbot.timer >/dev/null 2>&1 && echo "certbot.timer habilitado (renovação automática)"

echo
echo "Versões: node $(node -v), npm $(npm -v), pm2 $(as_app 'pm2 -v' 2>/dev/null | tail -n 1), $(mariadb --version | cut -d, -f1), $(nginx -v 2>&1), $(certbot --version 2>&1)"
echo
echo "Pronto. Falta colar a ASAAS_API_KEY no $ENV_FILE e reiniciar o pm2 (ver deploy/README.md)."
