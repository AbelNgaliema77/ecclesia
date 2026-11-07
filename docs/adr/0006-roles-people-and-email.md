# 6. Three roles, one people list, and email delivery

Date: 2026-11-07 – Accepted

## Context

Churches told us the role list was too long and that "worker" and "leader" are not stages a person moves through but things they do. Invitations and password resets also need email, without making a provider mandatory on day one.

## Decision

- There are three built-in roles. Pastor and Church Admin have full access. Team Leader can see everyone and every team, add people, and edit people and positions only in teams they lead. Retired roles were mapped to these by migration.
- People is the whole church. Status is one of Visitor, Regular, Member or Inactive. Worker and Leader are not stored: they are derived from active team assignments, so they can never drift from reality.
- Deleting a person is a soft delete. Their active assignments end, their login is unlinked, and history and audit stay intact.
- Imports are parsed in the browser, then checked on the server twice: once for the preview and again when saving, so what is saved always matches the rules, not the preview.
- Email goes through a small mailer interface with three modes: Resend when a key is set, a local outbox for development and CI, and disabled in production without a key. Sending happens after the database transaction commits, and a failed send never undoes the invitation.
- The import actions take the parsed table as their argument instead of FormData, because the file is read in the browser. They still run through runChurchAction and validate their input with a schema.
- Logos are stored in Postgres in church_logos, one row per church keyed by church_id rather than the usual id and church_id pair, under row-level security, checked by their bytes (PNG, JPEG or WebP, up to 512 KB) and served only to signed-in members. SVG is refused.
- Colour themes are presets checked for WCAG AA contrast in light and dark, rather than free colour picking.
- Headcounts that fail to reach the server are kept on the phone, keyed by church and service, and synced when the connection returns. The latest count wins, as it does online.

## Consequences

- Finance access for the Finance team leader is deferred to Phase 2, when finance exists.
- Pages still need a connection to open. A service worker for a full offline shell is a later step.
