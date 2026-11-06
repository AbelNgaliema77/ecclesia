# Ecclesia

Church management for people, teams, attendance and stewardship. Multi-church, English and French, installable on phones.

## What is in this release

- Sign up, sign in, and church onboarding with default roles, attendance categories and service times
- Role-based access with church, team and self scopes, enforced on every page and action
- People directory with search, status filters, growth-path status rules and status history
- Teams and positions with current holders and vacancies
- Attendance capture per service and category, built for phones, with corrections logged
- Dashboard with average attendance, first-time visitors, people serving, and a monthly trend split by category with church seasons marked
- Subscription states (trial, active, past due, read-only, locked) enforced across the app
- Audit log for every change, append-only at the database level
- English and French throughout, per user
- Demo church with 18 months of realistic data

Finance, inventory, online giving and the platform admin area follow in the next phases. See docs/roadmap.md.

## Stack

| Layer       | Choice                                            |
| ----------- | ------------------------------------------------- |
| App         | Next.js 16, React 19, TypeScript (strict)         |
| Database    | PostgreSQL 16+ with row-level security per church |
| Data access | Drizzle ORM with versioned SQL migrations         |
| Auth        | Better Auth (users stored in our own tables)      |
| Validation  | Zod, shared between domain and forms              |
| i18n        | next-intl, cookie-based, no locale in URLs        |
| UI          | Tailwind CSS 4, Recharts, Lucide icons            |
| Quality     | Biome, Vitest, GitHub Actions                     |
| Hosting     | One Docker image, any VPS (Coolify recommended)   |

## Getting started

Requirements: Node 22, pnpm 10, Docker.

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:3000 and sign in with demo@ecclesia.app / Ecclesia-Demo-2026. Set ECCLESIA_SHOW_DEMO_LOGIN=true in .env to show these details on the sign-in page.

## Everyday commands

| Command          | What it does                                                 |
| ---------------- | ------------------------------------------------------------ |
| pnpm dev         | Run the app locally                                          |
| pnpm check       | Lint, typecheck and all tests                                |
| pnpm db:generate | Create a migration from schema changes                       |
| pnpm db:migrate  | Apply migrations                                             |
| pnpm db:seed     | Recreate the demo church                                     |
| pnpm db:reset    | Drop everything, migrate and seed (never runs in production) |
| pnpm format      | Format and fix lint issues                                   |

## Repository layout

```
apps/web            Next.js app: routes, UI, server actions
  src/app           Routes only – thin pages that call modules
  src/modules       Feature modules: actions, queries, components per feature
  src/server        Auth, request context, action runner, env
  src/components    Shared UI and app shell
  messages          en.json and fr.json
packages/domain     Pure business rules – no database, no framework
packages/db         Schema, migrations, repositories, seed
packages/config     Shared TypeScript config
infra               Database bootstrap
docs                Architecture decisions, deployment, roadmap
```

Read RULES.md before changing anything, and CONVENTIONS.md before writing code.
