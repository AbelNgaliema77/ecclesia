# Ecclesia

Church management for people, teams, attendance and stewardship. Multi-church, English and French, installable on phones.

## What is in this release

- Sign up, sign in, and church onboarding with default roles, attendance categories and service times
- Three built-in roles: Pastor and Church Admin with full access, Team Leader who sees everyone and manages their own teams
- People is the workforce: name, contact, gender, birthday, the year they joined and the teams they serve in, with Leader tags from team assignments, filters and deletion
- Excel and CSV import with a row-by-row preview, duplicate skipping and optional team placement
- Teams, positions and assignments, managed in the app, with team leaders managing their own teams and a one-step Replace to hand a position to someone new
- Members and invitations sent by email, custom roles with a permission matrix
- Password reset by email
- Church settings for details, branding (logo and colour theme), service times and attendance categories
- Attendance capture per service and category, built for phones, kept on the phone when signal drops and synced when it returns
- Dashboard with average attendance, people who joined this year, people serving, and a monthly trend split by category with church seasons marked
- Subscription states (trial, active, past due, read-only, locked) enforced across the app
- Finance: funds, giving with void-only corrections, two-person cash counts, bank statement import with giving-number matching, donors and Section 18A certificates, payment requests with photo and PDF receipts, approval limits and separation of duties, budgets, income and expense statements, CSV export and month-end close
- Two-step verification (authenticator app and backup codes), required for finance access by default
- Audit log for every change, append-only at the database level
- English and French throughout, per user
- Demo church with 18 months of realistic data

Inventory, online giving and the platform admin area follow in the next phases. See docs/roadmap.md.

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
| Quality     | Biome, Vitest, Playwright, GitHub Actions         |
| Hosting     | Docker Compose on any VPS, Caddy for HTTPS        |

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

Open http://localhost:3100 and sign in with any demo account, all with the password Ecclesia-Demo-2026:

| Account                | Role                                                 |
| ---------------------- | ---------------------------------------------------- |
| demo@ecclesia.app      | Church Admin                                         |
| pastor@ecclesia.app    | Pastor                                               |
| treasurer@ecclesia.app | Team Leader who leads Finance, so has finance access |
| leader@ecclesia.app    | Team Leader of Media, can request payments           |

The demo church has two-step verification switched off for finance so the accounts open straight away. Set ECCLESIA_SHOW_DEMO_LOGIN=true in .env to show these details on the sign-in page.

Until an email provider is configured, emails are saved locally instead of sent. Open http://localhost:3100/dev/outbox to read invitations and password reset emails.

## Everyday commands

| Command          | What it does                                                 |
| ---------------- | ------------------------------------------------------------ |
| pnpm dev         | Run the app locally                                          |
| pnpm check       | Lint, typecheck and all tests                                |
| pnpm e2e         | Browser tests with Playwright (run pnpm db:seed first)       |
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
