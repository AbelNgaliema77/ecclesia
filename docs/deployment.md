# Deployment

Reference setup for one church: a 2 vCPU / 4 GB VPS (xneelo or Hetzner) running Coolify.

## 1. Server

1. Create the VPS with Ubuntu 24.04 and point a domain at it, for example app.yourchurch.co.za.
2. Install Coolify with its one-line installer from coolify.io.
3. In Coolify, add a PostgreSQL 17 database. Note the owner connection string.
4. Connect to the database and run infra/postgres/init.sql after changing the ecclesia_app password in it.

## 2. App

1. In Coolify, add a new resource from your GitHub repository using the Docker Compose build pack and docker-compose.prod.yml.
2. The compose file runs two services: migrate applies database migrations with the owner role and exits, then web starts. Every deploy migrates first, and the app never holds owner credentials.
3. Add the environment variables:

| Variable                 | Value                                                       |
| ------------------------ | ----------------------------------------------------------- |
| DATABASE_URL             | postgres://ecclesia_app:PASSWORD@HOST:5432/ecclesia         |
| DATABASE_OWNER_URL       | postgres://OWNER:PASSWORD@HOST:5432/ecclesia                |
| BETTER_AUTH_SECRET       | a random string of 32+ characters (openssl rand -base64 48) |
| BETTER_AUTH_URL          | https://app.yourchurch.co.za                                |
| ECCLESIA_SHOW_DEMO_LOGIN | false                                                       |

4. Point the domain at the web service on port 3000 and set the health check path to /api/health.
5. Enable automatic deploys from main. Add a second resource on a staging branch for testing changes first.

## 3. Backups

1. In Coolify, enable scheduled backups for the database: daily, keep 30.
2. Send backups to S3-compatible storage off the server (Cloudflare R2 or a Hetzner Storage Box).
3. Once a month, restore the latest backup into a scratch database and sign in to check it.

## 4. Monitoring

- UptimeRobot (free) on https://app.yourchurch.co.za/api/health, alerting by email or WhatsApp.
- Coolify notifications for failed deploys and backups.

## Moving host

Restore the latest backup on the new Postgres, run init.sql, deploy the same image with the same environment variables, and switch DNS.
