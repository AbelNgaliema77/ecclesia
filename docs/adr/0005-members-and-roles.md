# 5. Members, invitations and roles

Date: 2026-11-06 – Accepted

## Context

Churches need to bring their pastors, ushers, team leaders and finance people into Ecclesia, each with the right access, without an email service being set up on day one.

## Decision

- Invitations are private links. An administrator creates one for an email address, a role and optionally a person record, then shares it by WhatsApp or email. Only a SHA-256 hash of the token is stored. Links work once and expire after 14 days. There can only be one open invitation per email per church.
- Accepting requires signing in with the invited email address. The token lookup happens through a narrow SECURITY DEFINER function that only returns the church id, so row-level security stays intact.
- Built-in roles are fixed. Churches create custom roles, optionally starting from a built-in one, using a permission matrix. Each permission only offers scopes that make sense for it.
- Nobody can change their own role or remove themselves, and the church always keeps at least one member who can manage users.
- Linking a member to a person record is what gives team leaders access to their own teams.
- Teams and positions with assignment history cannot be deleted. Assignments are ended rather than removed, so history is kept.

## Consequences

- Inviting works today with no email provider. When one is added, the same link is sent by email.
- An administrator can appoint someone to a finance role. That action is recorded in the audit log, which is where oversight happens.
