#!/usr/bin/env bash
# Pull the latest commit, migrate, rebuild, and restart Knit.
#
#   ssh root@<vps> '/opt/knit/app-src/deploy/deploy.sh'
#
# Build and test locally first (npm run typecheck && npm test && npm run build), then
# push. Modeled on fantasy-football's deploy/deploy.sh.

set -euo pipefail

APP_DIR=/opt/knit/app-src
APP_USER=knit
APP_HOME=/opt/knit
PORT=3102

# Root is needed to restart the service. git and npm run as the knit user, because the
# repo is owned by knit and git as root trips safe.directory ("dubious ownership").
if [ "$(id -u)" -ne 0 ]; then
	echo "!! run this as root (it restarts knit); it drops to $APP_USER for git and npm" >&2
	exit 1
fi

run_as_app() {
	sudo -u "$APP_USER" env HOME="$APP_HOME" "$@"
}

# --ff-only so a diverged history fails loudly instead of opening a merge.
echo "==> pulling"
run_as_app git -C "$APP_DIR" pull --ff-only

echo "==> dependencies"
run_as_app bash -c "cd '$APP_DIR' && npm ci"

# Builds data/scriptures, runs better-auth's and our migrations, and reloads the verses
# table in one transaction. Every step is safe to re-run.
echo "==> migrations"
run_as_app bash -c "cd '$APP_DIR' && npm run db:migrate"

# next build directly: npm run build would rebuild data/scriptures a second time.
echo "==> build"
run_as_app bash -c "cd '$APP_DIR' && npx next build"

echo "==> restarting"
systemctl restart knit

sleep 3
systemctl is-active --quiet knit && echo "==> knit up" || {
	echo "!! knit did NOT come up"
	journalctl -u knit -n 30 --no-pager
	exit 1
}

CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "http://127.0.0.1:$PORT/sign-in")
[ "$CODE" = "200" ] && echo "==> /sign-in 200" || { echo "!! /sign-in returned $CODE"; exit 1; }
