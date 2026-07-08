#!/bin/bash
set -euo pipefail

DOMAIN="${1:-}"

if [ -z "$DOMAIN" ]; then
    echo "Usage: sudo ./init-ssl.sh <domain>"
    exit 1
fi

echo "[+] Creating Certbot volumes..."
docker volume create licenta_certbot_conf 2>/dev/null || true
docker volume create licenta_certbot_www 2>/dev/null || true

echo "[+] Running Certbot to obtain certificate..."
docker run --rm \
    -v licenta_certbot_conf:/etc/letsencrypt \
    -v licenta_certbot_www:/var/www/certbot \
    -p 80:80 \
    certbot/certbot certonly \
        --webroot \
        --webroot-path /var/www/certbot \
        -d "$DOMAIN" \
        --email admin@example.com \
        --agree-tos \
        --no-eff-email \
        --non-interactive

echo "✅ Certificate setup complete"
