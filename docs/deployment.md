# Deployment

One church on one server: a Truehost Cloud VPS 2 (2 vCPU, 4 GB, 100 GB) with Ubuntu 24.04, running Docker Compose. Caddy serves HTTPS with free Let’s Encrypt certificates, Postgres runs on the same server and is never exposed, and a backup container uploads a nightly dump to Cloudflare R2.

| Item    | Choice                                   | Cost          |
| ------- | ---------------------------------------- | ------------- |
| Server  | Truehost Cloud VPS 2, paid annually      | ~R140 a month |
| Domain  | app.laborne.co.za                        | ~R100 a year  |
| Email   | Resend free plan                         | Free          |
| Backups | Cloudflare R2 free tier                  | Free          |

## 1. Before the server

1. Buy the domain and add an A record for app.laborne.co.za pointing to the server’s IP address.
2. Resend: add and verify the domain laborne.co.za, then create an API key.
3. Cloudflare R2: create a bucket called ecclesia-backups, then an R2 API token with Object Read & Write on that bucket. Note the account ID, access key ID and secret.

## 2. Server, once

Sign in as root over SSH and run each line:

```
apt update && apt upgrade -y && apt install -y git ufw
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
curl -fsSL https://get.docker.com | sh
git clone https://github.com/AbelNgaliema77/ecclesia.git /opt/ecclesia && cd /opt/ecclesia
cp .env.production.example .env && chmod 600 .env
```

The repository is private, so the clone asks for a GitHub username and a fine-grained personal access token with read access to that repository only.

Fill in .env. Generate the three secrets with:

```
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"; echo "APP_DB_PASSWORD=$(openssl rand -hex 24)"; echo "BETTER_AUTH_SECRET=$(openssl rand -hex 32)"
```

Use hex secrets only: the database passwords go into connection strings.

## 3. Start

```
cd /opt/ecclesia && docker compose -f docker-compose.prod.yml up -d --build
```

The first build takes several minutes. Postgres starts and creates the ecclesia_app role, migrate applies every migration as the owner and exits, then web starts and Caddy fetches the certificate. Open https://app.laborne.co.za, create your account and create the church.

Check it:

```
docker compose -f docker-compose.prod.yml ps && curl -s https://app.laborne.co.za/api/health
```

## 4. Deploy a change

After pushing to main:

```
cd /opt/ecclesia && git pull && docker compose -f docker-compose.prod.yml up -d --build
```

Migrations run on every deploy before the new app starts. If a migration fails, the old app keeps running and the logs say why: docker compose -f docker-compose.prod.yml logs migrate.

## 5. Backups

The backup container dumps the database every night at BACKUP_AT (Johannesburg time), uploads it to R2 and deletes dumps older than BACKUP_KEEP_DAYS.

- Take one now and confirm R2 works: docker compose -f docker-compose.prod.yml exec backup backup.sh
- Restore the latest dump: docker compose -f docker-compose.prod.yml exec backup restore.sh
- Restore a specific dump: docker compose -f docker-compose.prod.yml exec backup restore.sh ecclesia_2026-11-07_0200.dump

Once a month, restore into a scratch database and sign in to check it:

```
docker compose -f docker-compose.prod.yml exec postgres createdb -U ecclesia scratch && docker compose -f docker-compose.prod.yml exec backup restore.sh "" scratch
```

## 6. Monitoring

- UptimeRobot (free) on https://app.laborne.co.za/api/health, alerting by email.
- Logs: docker compose -f docker-compose.prod.yml logs -f web

## Moving host

Set up the new server with sections 2 and 3, stop web, restore the latest backup, start web and switch the DNS record.
