---
phase: 06-critical-fixes-v2
plan: "01"
subsystem: api, ui
tags: [google-wallet, hero-image, lead-capture, supabase, react, nextjs]

# Dependency graph
requires: []
provides:
  - "Hero image background color driven by ?color= query param (URL-encoded hex) with DB fallback"
  - "LeadForm React client component with name/email/phone/message fields and success/error states"
  - "POST /api/submit-lead endpoint that validates and inserts into Supabase leads table"
  - "Landing page (app/page.tsx) embeds LeadForm below 'Come funziona' section"
affects: [07-design-system-v2]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional color param on wallet-image: colorParam from searchParams, startsWith('#') guard, fallback to DB"
    - "Client form component with useState for form fields + status ('idle'|'sending'|'success'|'error')"
    - "Server Component (page.tsx) importing a Client Component (LeadForm) — no 'use client' on the page"

key-files:
  created:
    - components/LeadForm.tsx
    - app/api/submit-lead/route.ts
  modified:
    - app/api/wallet-image/route.tsx
    - lib/google-wallet.ts
    - app/page.tsx

key-decisions:
  - "searchParams API auto-decodes percent-encoding — no manual decodeURIComponent needed on colorParam"
  - "startsWith('#') guard prevents malformed color values from being applied"
  - "getHeroImageUrl gets optional backgroundColor param — additive, backward-compatible, no existing call sites broken"
  - "submit-lead uses SUPABASE_SERVICE_ROLE_KEY (server-side only) to bypass RLS on insert"
  - "leads table allows public inserts via RLS policy — no auth required for form submission"

patterns-established:
  - "Pattern 1: Optional query param with validation guard — read param, validate format, fallback to DB value"
  - "Pattern 2: Server Component page + Client Component form — keeps page statically renderable"

requirements-completed: [FIX-04, FIX-01]

# Metrics
duration: 20min
completed: 2026-03-03
---

# Phase 6 Plan 01: Critical Fixes v2 Summary

**Google Wallet hero image now uses merchant brand color via ?color= param, and the landing page captures leads into Supabase via a client-side form and POST /api/submit-lead route**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-03
- **Completed:** 2026-03-03
- **Tasks:** 2 (Task 1 completed in prior session, Task 2 completed in this session)
- **Files modified:** 5

## Accomplishments
- FIX-04: wallet-image route now reads `?color=` query param and uses it as hero background color, falling back to `program.primary_color` from DB when absent
- FIX-04: `getHeroImageUrl()` in lib/google-wallet.ts updated with optional `backgroundColor?` param, passing it URL-encoded at both call sites (generateWalletLink + updateWalletCard)
- FIX-01: `components/LeadForm.tsx` — fully-featured lead capture form (name*, email*, phone, message) with sending/success/error states
- FIX-01: `app/api/submit-lead/route.ts` — validates name+email, inserts into Supabase `leads` table, returns 400 on missing fields / 500 on DB error
- FIX-01: Landing page (`app/page.tsx`) embeds LeadForm in new "Vuoi saperne di più?" section, remains a Server Component

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix hero image color — add ?color= param** - `a82380c` (feat)
2. **Task 2: Lead capture — LeadForm + API route + landing page** - `1f220ce` (feat)

**Plan metadata:** (final docs commit — see below)

## Files Created/Modified
- `app/api/wallet-image/route.tsx` — Added `colorParam` from searchParams, replaced hardcoded DB-only color with param-first logic
- `lib/google-wallet.ts` — `getHeroImageUrl()` now accepts optional `backgroundColor?` and appends `&color=<encoded>` to URL; two call sites updated
- `components/LeadForm.tsx` — New client component: form with 4 fields, fetch POST to /api/submit-lead, success/error/sending states
- `app/api/submit-lead/route.ts` — New API route: validates body, inserts into `leads` table via service role client
- `app/page.tsx` — Added LeadForm import and "Vuoi saperne di più?" section between 3-step flow and CTA footer

## Decisions Made
- Used `searchParams.get('color')` without manual `decodeURIComponent` — the Web URL API auto-decodes percent-encoding once
- Added `startsWith('#')` guard to prevent malformed color strings being used as background color
- `getHeroImageUrl` kept additive (optional second parameter) — existing call sites without the argument continue working identically
- `submit-lead` uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS and write to `leads` table from the server

## Deviations from Plan

None — plan executed exactly as written. The checkpoint (SQL migration) was pre-completed by the user before this continuation agent was spawned.

## Issues Encountered
- Build lock file (`.next/lock`) was stale from a previous build — removed before running `npm run build`. Build succeeded after removal.

## User Setup Required
- `leads` table SQL migration was documented in `.planning/MANUAL-ACTIONS.md` and executed by the user prior to Task 2 implementation.

## Next Phase Readiness
- Phase 6 Plan 01 complete. FIX-04 and FIX-01 resolved.
- Phase 6 has additional plans (FIX-02 soft delete, FIX-03 hard delete cascade) — check `.planning/phases/06-critical-fixes-v2/` for remaining plan files.
- Phase 7 (Design System v2) can proceed once all Phase 6 fixes are confirmed working in production.

---
*Phase: 06-critical-fixes-v2*
*Completed: 2026-03-03*
