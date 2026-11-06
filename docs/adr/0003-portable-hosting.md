# 3. Portable, low-cost hosting

Date: 2026-11-06 – Accepted

## Context

The first church needs to run for roughly R200–R300 a month, and moving to a different host later must not require code changes.

## Decision

- The app ships as one Docker image built from Next.js standalone output, configured only through environment variables.
- Postgres is plain Postgres. No provider-specific features, functions or auth.
- Auth is Better Auth with users stored in our own tables.
- File storage, email, SMS, payments and AI will be added behind interfaces in packages/domain with adapters per provider.
- The reference deployment is a South African VPS running Coolify, Postgres on the same server, and nightly backups to off-site object storage.

## Consequences

- Moving host is a backup, restore and redeploy.
- We maintain our own server. Coolify, scheduled backups and uptime monitoring keep that to about an hour or two a month.
