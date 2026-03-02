---
phase: 01-stability
plan: 03
subsystem: api
tags: [auth, google-wallet, bearer-token, env-vars, next-js]

# Dependency graph
requires: []
provides:
  - "POST /api/wallet rejects unauthenticated external callers with 401"
  - "POST /api/wallet-update rejects unauthenticated external callers with 401"
  - "Internal callers send Authorization: Bearer header using NEXT_PUBLIC_INTERNAL_API_SECRET"
affects: [wallet-image, stamp, card-page]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared-secret internal API auth via Authorization Bearer header]

key-files:
  created: []
  modified:
    - app/api/wallet/route.ts
    - app/api/wallet-update/route.ts
    - app/stamp/page.tsx
    - app/c/[token]/page.tsx

key-decisions:
  - "Used NEXT_PUBLIC_ prefix for caller-side secret so client components can read it — lightweight anti-abuse, not full auth"
  - "Guard is conditional on env var presence — skipped in dev when INTERNAL_API_SECRET is not set, no dev breakage"
  - "Secret value wallet-internal-2026 set in .env.local; must be duplicated in Vercel dashboard"

patterns-established:
  - "Internal API pattern: routes check Authorization: Bearer ${INTERNAL_API_SECRET} before processing"
  - "Client callers read NEXT_PUBLIC_INTERNAL_API_SECRET and fall back to empty string when unset"

requirements-completed:
  - BUG-05

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 01 Plan 03: Wallet API Auth Guard Summary

**Shared-secret Bearer token guard on /api/wallet and /api/wallet-update blocks unauthenticated external enumeration while internal callers transparently pass the header**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T10:54:13Z
- **Completed:** 2026-03-02T10:55:34Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Both wallet API routes now return 401 when INTERNAL_API_SECRET is set and the caller omits the correct Bearer token
- stamp page updateWallet function sends Authorization header on every wallet-update call
- Card page addToGoogleWallet function sends Authorization header on every wallet call
- .env.local documented with both INTERNAL_API_SECRET and NEXT_PUBLIC_INTERNAL_API_SECRET

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auth check to wallet API routes** - `e40965a` (feat)
2. **Task 2: Update callers to send Authorization header** - `031bbd8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/api/wallet/route.ts` - Auth guard added at start of POST handler
- `app/api/wallet-update/route.ts` - Auth guard added at start of POST handler
- `app/stamp/page.tsx` - updateWallet sends Authorization Bearer header
- `app/c/[token]/page.tsx` - addToGoogleWallet sends Authorization Bearer header

## Decisions Made
- Chose NEXT_PUBLIC_ prefix so client-side React components (stamp page, card page) can read the secret at runtime in the browser — accepted trade-off for simplicity since this is anti-abuse, not a full auth layer
- Guard wrapped in `if (expectedSecret && ...)` so dev environments without the env var set continue working unchanged
- Secret value `wallet-internal-2026` is a simple static string — sufficient for enumeration prevention, not a cryptographic secret

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

**Vercel must be updated manually.**

Add both variables in Vercel Dashboard under Settings -> Environment Variables:

```
INTERNAL_API_SECRET=wallet-internal-2026
NEXT_PUBLIC_INTERNAL_API_SECRET=wallet-internal-2026
```

Without these Vercel env vars, the guard will be skipped in production (env var not set = guard disabled), so the fix has no effect until they are added.

## Next Phase Readiness
- BUG-05 resolved: external callers cannot trigger unlimited Google Wallet API calls
- Existing callers (stamp page, card page) continue working with no behavior change
- No blockers for remaining phase 1 plans

## Self-Check: PASSED

- app/api/wallet/route.ts — FOUND
- app/api/wallet-update/route.ts — FOUND
- app/stamp/page.tsx — FOUND
- app/c/[token]/page.tsx — FOUND
- .planning/phases/01-stability/01-03-SUMMARY.md — FOUND
- Commit e40965a — FOUND
- Commit 031bbd8 — FOUND

---
*Phase: 01-stability*
*Completed: 2026-03-02*
