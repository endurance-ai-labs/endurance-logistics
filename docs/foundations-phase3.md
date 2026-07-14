# foundations — Phase 3 hardening modules (END-56)

This directory (`lib/`) implements the Phase 3 production-hardening scope of the
Endurance logistics marketplace: **auth/onboarding, notifications, real
RJS/McLeod ingestion, and automated carrier vetting**. Everything here is
framework-agnostic and dependency-light so the Next.js app (Tasks 1–9) and the
ingestion CLI consume the same code, and so the business-critical logic is unit
tested in isolation.

> Context: at the time this ticket was picked up, the repo branch held the
> Endurance marketing site rather than the marketplace app scaffold. These
> modules were therefore built as a self-contained, tested library the app will
> import once the schema/booking/matching tasks land — they intentionally depend
> only on `node:crypto`/`node:fs` and their own in-memory data layer, with
> Postgres/FMCSA/email/SMS all behind swappable interfaces.

## Modules

| Area | Files | Scope item |
| ---- | ----- | ---------- |
| Auth session | `lib/session.ts` | Signed, stateless shipper/carrier sessions (HMAC cookie), secret rotation |
| Authorization | `lib/authz.ts` | Role + resource scoping so each side sees only its own views; vetting gate on accept |
| Onboarding | `lib/onboarding.ts` | Shipper + carrier self-serve signup; carrier signup runs FMCSA vetting |
| Notifications | `lib/notifications/*` | Provider interface (email/SMS) + `Notifier` firing on confirmation / carrier-accepted / delivered, both sides, idempotent |
| Vetting | `lib/vetting/fmcsa.ts` | FMCSA/DOT lookup hook → `vetting_status` (pure decision + client port) |
| Ingestion | `lib/ingest/*` | Idempotent RJS/McLeod carrier+shipper import into our own data layer |
| CLI | `scripts/import-seed.ts` | Documented idempotent seed import (see `docs/ingestion.md`) |

## Design notes (mapping to acceptance criteria)

- **"Shippers and carriers log into their own scoped views."**
  `session.ts` mints a role-tagged token; `authz.ts` turns it into
  resource-level guards (`scopeLoads`, `canViewLoad`, `requireRole`). A shipper
  can only see its own loads; a carrier sees loads assigned to it plus open
  loads on the board.
- **"Both sides receive notifications at confirmation, carrier-accept, and
  delivery."** `Notifier.onConfirmation/onCarrierAccepted/onDelivered` each
  notify shipper **and** carrier across every channel they've provided, behind a
  `NotificationProvider` interface (swap the in-memory/console impls for
  Twilio/SendGrid). Dispatch is idempotency-keyed so a retried transition never
  double-sends.
- **"Seed data is refreshed from a real RJS/McLeod export via a documented,
  idempotent import."** See `docs/ingestion.md`. Upsert-by-natural-key +
  deterministic ids make re-imports converge.
- **Real carrier-vetting hook feeding `vetting_status`.** `vetting/fmcsa.ts`
  separates the pure decision (`decideVetting`) from the network port
  (`FmcsaClient`); onboarding and ingestion both call it, and it fails *closed*
  to human review on lookup errors.

## Commands

```bash
npm install
npm run typecheck   # tsc --noEmit (matches the org CI gate)
npm test            # node --test, 37 unit tests, no DB required
npm run import:seed  # idempotent RJS/McLeod import against the sample fixture
```

## Follow-ups for app integration (out of scope for END-56)

- Bind `DataStore` to Postgres (Neon/Docker) and `FmcsaClient` to the live FMCSA
  API — both one-line swaps at the composition root.
- Call `Notifier` from the booking transaction (Task 4) and tracking state
  machine (Task 9) at the three transition points.
- Read `SESSION_SECRET` from env and set the cookie via `serializeSessionCookie`
  in the login route.
