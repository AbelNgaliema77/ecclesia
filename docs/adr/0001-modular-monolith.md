# 1. Modular monolith in one repository

Date: 2026-11-06 – Accepted

## Context

Ecclesia is built by one developer first, possibly a small team later. It has to be cheap to host, easy to move, and easy to change without breaking unrelated features.

## Decision

One deployable Next.js app, organised as feature modules, with business rules and data access in separate workspace packages:

- packages/domain holds rules as pure functions with no database or framework imports.
- packages/db holds the schema, migrations and repositories.
- apps/web holds routes, UI and server actions, grouped by module.

Modules share code only through domain and db. Server actions are the application layer: they authorise, validate, call the domain, persist through repositories and record audit entries.

## Consequences

- One image, one database, one server. Hosting stays at a single small VPS.
- Rules are tested in milliseconds without a database.
- A module can be extracted later because its boundaries already exist, but there is no reason to plan for that now.
