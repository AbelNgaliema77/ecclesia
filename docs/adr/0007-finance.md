# 7. Finance

Date: 2026-11-07 – Accepted

## Context

Churches handle cash every Sunday, receive EFTs all month, pay suppliers and staff, and in South Africa issue Section 18A certificates. Mistakes and misuse here cost trust, so the module needs controls that hold even if someone makes a mistake in the app or tries to work around it.

## Decision

- Money is stored as whole cents in integer columns with database checks on range. Amounts are parsed once, in the domain package, accepting both 1,234.50 and 1 234,50.
- Gifts are never edited or deleted. A database trigger only allows a single void with a reason, and the app role cannot delete gifts, bank lines, approvals or certificates. Corrections are a void plus a new gift.
- Cash counts become gifts only when a different person verifies them. The rule is in the domain and enforced again by a database check on the batch.
- Payment requests follow separation of duties: the requester can never approve or pay their own request, nobody approves twice, and requests above a church-set limit need two different approvers.
- Closing a month locks gifts, counts and payments dated in it. Reopening needs a reason, which goes to the audit log.
- Bank statements are read in the browser and checked again on the server. Every line gets a fingerprint, so the same statement can never be imported twice. Lines that aren’t giving are remembered too.
- Receipts and quotes are stored in Postgres under row-level security, checked by their bytes (JPEG, PNG, WebP or PDF, up to 5 MB) and served with a sandboxing content policy. Large photos are reduced on the phone before upload, and files upload one at a time to stay within the server action size limit.
- Finance permissions are separate from the rest: capturing giving, reading totals, reading individual giving, requesting and approving payments, budgets and finance settings. The leader of the team chosen as the Finance team receives all of them.
- Two-step verification uses Better Auth’s TOTP plugin with backup codes. When a church requires it, finance permissions are removed from the user’s grants until it is turned on, so no page or action can forget the check.
- Section 18A certificates use the March to February tax year, get a stable sequential number per year, and are reissued with the same number when the amount changes.
- The import actions and the batch editor take structured arguments rather than FormData, because the data is assembled in the browser. They still run through runChurchAction and validate with schemas.

## Consequences

- Fixing a wrong gift takes two steps (void and record again), which is deliberate.
- Online giving through PayFast or Paystack can build on the same gift model in Phase 3.
- Attachments live in the database for now. Moving them to object storage later only touches the attachment repository and route.
