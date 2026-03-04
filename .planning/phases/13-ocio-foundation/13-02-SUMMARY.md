---
phase: 13-ocio-foundation
plan: "02"
subsystem: ui
tags: [react, nextjs, supabase, ocio, reputation, feature-gating, tailwind]

# Dependency graph
requires:
  - phase: 13-01
    provides: "OcioConfig TypeScript type (20 fields) and ocio_config Supabase table"
provides:
  - "GET + PATCH /api/ocio/config — auth + BUSINESS plan gating, upsert ocio_config"
  - "/dashboard/ocio/settings page — 6-module grid, Google Maps URL form, BUSINESS-only feature gate"
  - "Moduli attivi: module_reviews, module_alerts with working toggles persisted via API"
  - "Moduli stub: module_social, module_competitor, module_price, module_reports with Lock overlay"
affects:
  - 13-03-PLAN
  - 13-04-PLAN

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "API route auth pattern: Authorization: Bearer token → supabase.auth.getUser(token) → plan check via merchants.plan"
    - "Feature gating pattern: usePlan().isBusiness + UpgradePrompt requiredPlan='BUSINESS'"
    - "MODULES const array with available:boolean drives both toggle behavior and Lock overlay"
    - "loadData fetches session.access_token for subsequent API calls (not supabase client directly)"

key-files:
  created:
    - app/api/ocio/config/route.ts
    - app/dashboard/ocio/settings/page.tsx
  modified: []

key-decisions:
  - "loadData silently handles 403 (non-business plan) — isBusiness gate in render handles the UI branch"
  - "PATCH sends only module_reviews and module_alerts (not stubs) — prevents accidentally toggling unavailable modules server-side"
  - "Module toggle for available=false modules is pointer-events-none overlay only, toggle button is disabled via HTML attribute"
  - "google_maps_url sent as null (not empty string) when field is empty — matches nullable DB column"

patterns-established:
  - "OCIO pages live under /dashboard/ocio/ (not /dashboard/settings/ocio/) — own namespace for future pages"
  - "API route uses service role Supabase client with Bearer token auth — consistent with other protected routes"

requirements-completed:
  - SET-01
  - SET-02
  - SET-03
  - OCIO-01

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 13 Plan 02: OCIO Settings Page — 6-Module Grid + Google Maps URL + BUSINESS Gate Summary

**BUSINESS-only /dashboard/ocio/settings with 6-module grid (2 active + 4 Lock stubs), Google Maps URL form, and GET+PATCH /api/ocio/config persisting to Supabase ocio_config table**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-04T00:00:00Z
- **Completed:** 2026-03-04
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- API route GET + PATCH /api/ocio/config with Bearer token auth and BUSINESS plan enforcement (401/403 on failures)
- /dashboard/ocio/settings page with usePlan().isBusiness gate — FREE/PRO merchants see UpgradePrompt BUSINESS
- 6-module grid in 2 columns: module_reviews (Star) and module_alerts (Bell) with working toggles
- 4 stub modules (Share2, BarChart2, Tag, FileText) with disabled toggle + white/60 overlay + Lock icon
- Google Maps URL field with https:// validation on server side (400 if invalid)
- Build passes with no TypeScript errors, /dashboard/ocio/settings appears in Next.js route tree

## Task Commits

Each task was committed atomically:

1. **Task 1: API route GET + PATCH /api/ocio/config** - `1d22eb3` (feat)
2. **Task 2: Pagina /dashboard/ocio/settings con 6 moduli e form URL** - `8565fbc` (feat)

**Plan metadata:** (this docs commit)

## Files Created/Modified

- `app/api/ocio/config/route.ts` - GET returns ocio_config row or null; PATCH upserts with field whitelist and URL validation
- `app/dashboard/ocio/settings/page.tsx` - Client component with auth, plan gate, 6-module grid, URL form, save button

## Decisions Made

- loadData silently handles 403 response (non-BUSINESS) since isBusiness gate in JSX render handles the UI branch cleanly
- PATCH body sends only module_reviews and module_alerts — stub module values are not sent to prevent unexpected server-side state
- Module overlay uses pointer-events-none so the Lock icon doesn't block other interactions
- Empty google_maps_url is sent as null to match nullable DB column

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The ocio_config table was created in plan 13-01.

## Next Phase Readiness

- 13-03 can proceed immediately: /dashboard/ocio/settings foundation is in place
- API route /api/ocio/config is ready to be extended with additional fields
- No blockers

## Self-Check: PASSED

- FOUND: app/api/ocio/config/route.ts
- FOUND: app/dashboard/ocio/settings/page.tsx
- FOUND: .planning/phases/13-ocio-foundation/13-02-SUMMARY.md
- FOUND commit 1d22eb3: feat(13-02): API route GET + PATCH /api/ocio/config
- FOUND commit 8565fbc: feat(13-02): pagina /dashboard/ocio/settings con 6 moduli e form URL

---
*Phase: 13-ocio-foundation*
*Completed: 2026-03-04*
