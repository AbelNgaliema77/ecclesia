# Rules

These are not preferences. A change that breaks one of these does not merge.

## Data and tenancy

1. Every church-owned table has a church_id column, a row-level security policy, and is listed in the RLS migration.
2. Church-owned data is only read or written inside withChurch. The app never passes church_id from user input; inserts use currentChurchId.
3. References between church-owned tables use composite foreign keys on (church_id, id), so a record can never point at another church's data.
4. The app connects as ecclesia_app, which cannot bypass row-level security. Migrations run as the owner role.
5. The audit log is append-only. The app role has no UPDATE or DELETE on it.
6. People are soft-deleted (deleted_at). Nothing that holds history is hard-deleted from the app.
7. Every write records an audit entry with before and after values.

## Access

8. Every page loads data through readChurch with a permission. Every server action goes through runChurchAction with a permission and write flag.
9. Record-level checks use can(actor, permission, resource) with the record's team ids and person id.
10. Writes are refused unless the church's access level is full. Read-only and locked states come from the subscription, never from the UI.
11. Individual giving is visible only to finance roles and the giver.
12. Nobody approves their own payment request, and cash counts need two different people.

## Domain

13. Business rules live in packages/domain as pure functions with unit tests. Repositories and pages do not contain rules.
14. Domain functions return Result values for expected failures. Exceptions are for bugs and infrastructure failures.
15. Money is stored as integer cents with a currency code. Never floats.
16. Finance records are append-only. Corrections are reversing entries. Closed periods cannot change.

## Interface

17. Every user-facing string is in messages/en.json and messages/fr.json, with the same keys. A test enforces this.
18. Church-defined labels (teams, positions, categories, service types) are stored in both languages.
19. Forms show field-level errors from the server and work without client-side validation.
20. Every screen works at 390px wide and with keyboard only.

## Delivery

21. pnpm check passes before every push. CI runs it against a real Postgres.
22. Schema changes ship as migrations generated with pnpm db:generate. Hand-written SQL goes in a custom migration.
23. Secrets come from the environment and are validated at startup. Nothing secret is committed.
24. Architecture decisions are recorded in docs/adr before or with the change.
