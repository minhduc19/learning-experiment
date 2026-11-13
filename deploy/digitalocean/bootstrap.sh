#!/bin/bash
# Run by cloud-init with APP_DOMAIN, SOURCE_REPOSITORY, and SOURCE_SHA exported.
set -euo pipefail
umask 077
: "${APP_DOMAIN:?}" "${SOURCE_REPOSITORY:?}" "${SOURCE_SHA:?}"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git docker.io docker-compose-v2 openssl
systemctl enable --now docker
install -d -m 700 /opt/learning-experiment
cd /opt/learning-experiment
# Refuse to overwrite an installation or rotate its database password.
test ! -e app
git clone "https://github.com/${SOURCE_REPOSITORY}.git" app
cd app
git checkout --detach "$SOURCE_SHA"
printf 'APP_DOMAIN=%s\nPGUSER=learning\nPGDATABASE=learning\nPGPASSWORD=%s\n' \
    "$APP_DOMAIN" "$(openssl rand -hex 32)" > .env
chmod 600 .env
cat > /usr/local/bin/learning-compose <<'COMMAND'
#!/bin/bash
set -euo pipefail
cd /opt/learning-experiment/app
exec docker compose -p learning-experiment -f compose.yaml -f deploy/digitalocean/compose.yaml "$@"
COMMAND
chmod 755 /usr/local/bin/learning-compose
learning-compose up --build -d --wait --wait-timeout 300
# Caddy may still be obtaining a certificate until the domain resolves here.
docker compose -p learning-experiment -f compose.yaml -f deploy/digitalocean/compose.yaml \
    exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health/db', timeout=10)"
printf 'Application started. Point DNS at this Droplet, then open https://%s\n' "$APP_DOMAIN"
