#!/bin/bash
###############################################################################
# init-ssl.sh — Bootstrap SSL certificates for my-noteg.com
#
# Run this ONCE on the production server before the first `docker compose up`.
# It creates a temporary Nginx container to serve the ACME challenge, then
# requests a real Let's Encrypt certificate via Certbot.
#
# Usage:
#   chmod +x init-ssl.sh
#   sudo ./init-ssl.sh
###############################################################################

set -euo pipefail

DOMAIN="my-noteg.com"
EMAIL="cristina.zarnescu10@gmail.com"   # Used for Let's Encrypt notifications
COMPOSE_FILE="docker-compose.yml"

echo "──────────────────────────────────────────────────"
echo " NoteG — SSL Certificate Initialization"
echo " Domain:  $DOMAIN"
echo " Email:   $EMAIL"
echo "──────────────────────────────────────────────────"

# Step 1: Create required Docker volumes
echo "[1/4] Creating Docker volumes..."
docker volume create --name licenta_certbot_conf  2>/dev/null || true
docker volume create --name licenta_certbot_www   2>/dev/null || true

# Step 2: Create a temporary nginx config for the ACME challenge
echo "[2/4] Starting temporary Nginx for ACME challenge..."
TEMP_CONF=$(mktemp)
cat > "$TEMP_CONF" <<'NGINX'
server {
    listen 80;
    server_name my-noteg.com www.my-noteg.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'NoteG — waiting for SSL...';
        add_header Content-Type text/plain;
    }
}
NGINX

docker run -d --name noteg-temp-nginx \
    -p 80:80 \
    -v licenta_certbot_www:/var/www/certbot \
    -v "$TEMP_CONF":/etc/nginx/conf.d/default.conf:ro \
    nginx:alpine

sleep 2

# Step 3: Request certificate from Let's Encrypt
echo "[3/4] Requesting certificate from Let's Encrypt..."
docker run --rm \
    -v licenta_certbot_conf:/etc/letsencrypt \
    -v licenta_certbot_www:/var/www/certbot \
    certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal

# Step 4: Cleanup
echo "[4/4] Cleaning up temporary Nginx..."
docker stop noteg-temp-nginx && docker rm noteg-temp-nginx
rm -f "$TEMP_CONF"

echo ""
echo "✅ SSL certificate obtained successfully!"
echo ""
echo "You can now start the full stack:"
echo "  docker compose up --build -d"
echo ""
echo "Certificate auto-renewal is handled by the certbot service in docker-compose."
