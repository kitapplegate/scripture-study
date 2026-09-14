# Knit VPS bootstrap: one time only

> **Status: steps 0–8 done 2026-09-14; Knit is live at
> `https://knit.marzipan-solutions.com`.** §7 invite created (Kit's account not yet
> made from it); §8 backup installed and proven by hand. Still to do: §9 launch checks. Written from fantasy-football's `deploy/BOOTSTRAP.md`, which
> set the conventions on this VPS: `/opt/<app>`, a system user per app, Postgres 16 bound
> to localhost, Caddy in front, a nightly cron `pg_dump`. Deviations on the first run:
> `unzip` had to be installed (§0), and the AI keys were piped from Kit's local
> `.env.local` instead of pasted (§3). The Caddyfile backup from §6 is
> `/etc/caddy/Caddyfile.bak-knit-20260914-122306`.

Run as root on the VPS. Each step says how to confirm it before moving on.

## 0. Preflight (read-only)

```sh
free -h                                   # db:migrate and next build need headroom; swap exists (ff §1)
df -h /opt                                # a few GB free: node_modules, .next, data/scriptures
node -v                                   # Next 16 needs Node 20.9+
node --env-file-if-exists=/dev/null -e 'console.log("env-file flag ok")'   # the npm scripts use this flag
ss -tlnp | grep -E ':3102\b' || echo "port 3102 free"
ss -tlnp | grep 5432                      # Postgres on 127.0.0.1 / ::1 only
dig +short knit.marzipan-solutions.com    # the VPS address (DNS only, not a Cloudflare IP)
caddy version
command -v unzip || echo "unzip missing"  # build-scriptures.mjs unzips the cross-references
```

If the `--env-file-if-exists` line errors, upgrade Node (nodesource 22 LTS or newer)
before continuing. If `unzip` is missing, `apt-get install -y unzip`. It wasn't on the
VPS on 2026-09-14, and `npm run db:migrate` failed with `spawnSync unzip ENOENT` until
it was installed.

## 1. Service user and directories

`.next` must exist before step 5: `ReadWritePaths=` on a missing path makes systemd
refuse to start the unit, with an error that doesn't name the path.

```sh
adduser --system --group --home /opt/knit knit
mkdir -p /opt/knit
chown knit:knit /opt/knit
```

## 2. Clone

The repo is public, so no deploy key is needed.

```sh
sudo -u knit git clone https://github.com/kitapplegate/scripture-study.git /opt/knit/app-src
sudo -u knit mkdir -p /opt/knit/app-src/.next
```

## 3. Postgres role, database, and `.env`

Generate the secrets **on the box** so they never pass through a terminal log. (A
shell check instead of a `DO $$` block: in an unquoted heredoc bash turns `$$` into
its process id.)

```sh
DBPASS=$(openssl rand -hex 24)
AUTHSECRET=$(openssl rand -base64 32)

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='knit'" | grep -q 1; then VERB=ALTER; else VERB=CREATE; fi
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
$VERB ROLE knit LOGIN PASSWORD '$DBPASS';
SQL
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='knit'" | grep -q 1 \
  || sudo -u postgres createdb -O knit knit

ENVFILE=/opt/knit/app-src/.env
install -m 600 -o knit -g knit /dev/null "$ENVFILE"
cat > "$ENVFILE" <<ENV
DATABASE_URL=postgresql://knit:$DBPASS@127.0.0.1:5432/knit
BETTER_AUTH_URL=https://knit.marzipan-solutions.com
BETTER_AUTH_SECRET=$AUTHSECRET
GEMINI_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
ENV
unset DBPASS AUTHSECRET
```

Then add the assistant keys: `sudoedit /opt/knit/app-src/.env`. The layout is in
`deploy/env.example`. Confirm:

```sh
stat -c '%U %a' /opt/knit/app-src/.env                      # knit 600
sudo -u knit psql "$(sudo grep ^DATABASE_URL= /opt/knit/app-src/.env | cut -d= -f2-)" -tAc 'SELECT 1'   # 1
```

## 4. Install, migrate, build (as knit)

```sh
cd /opt/knit/app-src
sudo -u knit env HOME=/opt/knit npm ci
sudo -u knit env HOME=/opt/knit npm run db:migrate    # builds data, migrates, loads 41,995 verses
sudo -u knit env HOME=/opt/knit npx next build
```

Confirm: `db:migrate` prints `applied 001…006` and no `failed`; the build ends with the
route table.

## 5. systemd

```sh
cp /opt/knit/app-src/deploy/knit.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now knit
systemctl is-active knit
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3102/sign-in   # 200
ss -tlnp | grep 3102                                                      # 127.0.0.1 only
```

## 6. Caddy

```sh
cat /opt/knit/app-src/deploy/Caddyfile.snippet >> /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

`caddy validate` before reload is not optional: the same file serves the other sites.
Confirm, from anywhere:

```sh
curl -sI https://knit.marzipan-solutions.com/sign-in | head -1    # HTTP/2 200
curl -sI http://knit.marzipan-solutions.com/ | head -3            # redirect to https
curl -sI https://recipes.marzipan-solutions.com/ | head -1        # the neighbors still up
```

## 7. First admin

```sh
cd /opt/knit/app-src && sudo -u knit env HOME=/opt/knit npm run invite -- admin "Kit"
```

Open the printed link, create Kit's account, and confirm `/admin` loads. Every other
member is invited from `/admin`.

## 8. Nightly database backup

Same arrangement as fantasy-football: the script is copied root-owned to
`/usr/local/bin` and run by `postgres`, which can dump without a password.

```sh
install -m 0755 -o root -g root /opt/knit/app-src/deploy/backup_db.sh /usr/local/bin/knit-backup.sh
install -d -m 0750 -o postgres -g postgres /var/backups/knit
touch /var/log/knit-backup.log && chown postgres:postgres /var/log/knit-backup.log
printf '# Nightly Postgres backup for knit (source: deploy/backup_db.sh).\n45 4 * * *  postgres  /usr/local/bin/knit-backup.sh >> /var/log/knit-backup.log 2>&1\n' > /etc/cron.d/knit-backup
chmod 644 /etc/cron.d/knit-backup

# Prove it before trusting cron:
sudo -u postgres /usr/local/bin/knit-backup.sh
gunzip -t /var/backups/knit/*.sql.gz && echo "dump is valid gzip"
```

04:45 staggers it after fantasy-football's 04:30. Restore:

```sh
gunzip -c /var/backups/knit/knit-YYYYMMDD-HHMMSS.sql.gz | sudo -u postgres psql knit
```

## 9. Launch checks

- `https://knit.marzipan-solutions.com` loads, and signed-out `/feed` goes to sign-in.
- **Rate limit through the real Caddy:** 6 wrong passwords from one device → "Too many
  attempts", while a second device (phone on cellular) can still sign in.
- **Kit on his phone:** the talk builder, including dragging by touch.
- An invite link from `/admin` signs a test member up; a reset link from `/admin`
  changes their password. Delete the test member afterward.
- The assistant answers one question, proving the API keys are in `.env`.
- Record the results in `VERIFICATION.md` rows 15, 19, and 20.

## Later deploys

After pushing: `ssh root@<vps> /opt/knit/app-src/deploy/deploy.sh`
