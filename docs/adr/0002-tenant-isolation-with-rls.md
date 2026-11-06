# 2. Tenant isolation with Postgres row-level security

Date: 2026-11-06 – Accepted

## Context

Several churches share one database. One church seeing another's people or giving would be the worst possible failure, and application-level filtering alone depends on every query being written correctly.

## Decision

- Every church-owned table has church_id and a policy that only allows rows where church_id equals the app.church_id setting.
- withChurch opens a transaction and sets app.church_id with set_config(..., true), so it cannot leak to another request on a pooled connection.
- The app connects as ecclesia_app, which has no BYPASSRLS. Without a church set, queries return nothing.
- Inserts take church_id from app_current_church_id(), never from input.
- Cross-table references use composite foreign keys on (church_id, id).
- Platform tables (users, sessions, churches, memberships, subscriptions) are not church-scoped and are only reached through repository functions keyed by the signed-in user.

## Consequences

- A missing filter in a query cannot expose another church's data.
- Integration tests in packages/db prove isolation against a real database.
- Every church-scoped query runs inside a short transaction. This is cheap at our scale.
