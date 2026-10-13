#!/usr/bin/env bash
# Atualiza o Fluxo na VPS: git pull, dependências, build do front e reload do pm2.
# Rodar como deploy:  bash ~/deploy.sh   (ou: sudo -u deploy -H bash /home/deploy/fluxo/deploy/deploy.sh)
set -euo pipefail

APP_DIR=/home/deploy/fluxo
PUBLIC_URL=https://fluxoagendamentos.com.br

if [[ "$(id -un)" != "deploy" ]]; then
    echo "Rode como o usuário deploy." >&2
    exit 1
fi

cd "$APP_DIR"

echo "==> git pull"
git pull --ff-only

echo "==> dependências do front + build (API na mesma origem)"
npm ci --no-audit --no-fund
VITE_API_URL='' VITE_PUBLIC_URL="$PUBLIC_URL" npm run build

echo "==> dependências do backend"
(cd backend && npm ci --omit=dev --no-audit --no-fund)
mkdir -p backend/uploads

echo "==> pm2"
pm2 startOrReload ecosystem.config.cjs --env production --update-env
pm2 save

echo "==> health check"
for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null http://127.0.0.1:3001/health; then
        echo "OK: backend respondendo em 127.0.0.1:3001"
        exit 0
    fi
    sleep 1
done

echo "ERRO: backend não respondeu em 30s. Veja: pm2 logs fluxo --lines 50" >&2
exit 1
