# Roadmap

## Phase 1 – foundation (this release)

- [x] Monorepo, CI, Docker image, health check
- [x] Database schema with row-level security and composite tenant keys
- [x] Auth, onboarding, roles and scoped permissions
- [x] People as the workforce, with year joined and teams
- [x] Teams and positions overview
- [x] Attendance capture and corrections
- [x] Dashboard with seasonal attendance trend
- [x] English and French
- [x] Subscription access states
- [x] Demo church seed

- [x] Redesign with dark mode, command menu and phone navigation
- [x] Invite members by link, change roles, remove members
- [x] Custom roles with a permission matrix
- [x] Church settings: details, service times, attendance categories
- [x] Create and edit teams, positions and assignments
- [x] Three built-in roles, automatic Worker and Leader tags, people filters and deletion
- [x] Excel and CSV import for people
- [x] Email for invitations and password reset, with a local outbox until a provider is set
- [x] Church branding: logo and colour theme
- [x] Offline headcount capture with automatic sync
- [x] Playwright end-to-end tests in CI

## Phase 1 – remaining

- [ ] Going live: domain, email provider, first church onboarded
- [ ] Church timezone used for all date display
- [ ] Full offline app shell (service worker) so pages open without signal

## Phase 2 – finance

- [x] Funds, giving capture and void-only corrections
- [x] Cash counts with two-person verification
- [x] Bank statement import with giving-number matching
- [x] Donors, giving numbers and Section 18A certificates
- [x] Payment requests with receipt photos and PDFs, approval limits and separation of duties
- [x] Budgets, income and expense statements, CSV export, month-end close
- [x] Two-step verification, required for finance access by default
- [x] Finance access for the leader of the Finance team

## Phase 2 – inventory

- Assets, custodians, check-out and return, consumables, maintenance

## Phase 3 – growth

- Online giving through PayFast and Paystack
- Subscription billing and the platform admin area
- Analytics: retention cohorts, growth path, volunteer health, forecasts
- WhatsApp, SMS and email messaging
- Member self-service and AI summaries
