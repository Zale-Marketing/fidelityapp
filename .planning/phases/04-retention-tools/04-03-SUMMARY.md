---
phase: 04-retention-tools
plan: "03"
subsystem: ui
tags: [react, supabase, csv, typescript, tailwind]

# Dependency graph
requires:
  - phase: 04-01
    provides: customer tags (CustomerTag type, card_holder_tags table) used in CSV tag column
provides:
  - Browser-side CSV export of filtered customer list from /dashboard/customers
  - exportCSV() function with one row per customer+program, respects active filters
affects:
  - future analytics phases (export pattern established)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Browser Blob/URL.createObjectURL download pattern for client-side CSV export
    - UTF-8 BOM prefix for Excel-compatible Italian character encoding
    - Supabase nested join on client component (programs:program_id) — valid outside Edge runtime
    - Array.isArray guard for Supabase nested join response (returns array not single object)

key-files:
  created: []
  modified:
    - app/dashboard/customers/page.tsx

key-decisions:
  - "Supabase nested join (programs:program_id) used in client component — no separate query needed; edge runtime restriction per CLAUDE.md applies only to /api/ routes"
  - "Array.isArray guard on programs join result — Supabase JS returns array for foreign-key joins; cast via unknown to resolve TS2352 overlap error"
  - "UTF-8 BOM (\\uFEFF) prepended to CSV blob for correct Italian accent display in Excel"

patterns-established:
  - "CSV export: fetch related data at export time (not at page load) — keeps initial load fast"
  - "CSV cell escaping: wrap in double quotes if cell contains comma, quote, or newline; double internal quotes"

requirements-completed: [EXPORT-01]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 4 Plan 03: CSV Export Summary

**Browser-side CSV export on /dashboard/customers with one row per customer+program, filtered results, UTF-8 BOM for Excel, and clienti-YYYY-MM-DD.csv filename**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T12:56:50Z
- **Completed:** 2026-03-02T13:00:50Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- "Esporta CSV" button added to customers page header (between "Gestisci Tag" and "Nuovo Cliente")
- exportCSV() fetches cards+programs at export time for filtered customers only — no extra data loaded on page init
- One row per customer+program combination; customers with no active cards appear as one row with empty Programma/Saldo
- Saldo Corrente column derives correct value by program type: stamp_count / points_balance / cashback_balance / current_tier / subscription_status
- Active text search and tag filters are respected — exports filteredCustomers, not full list
- Filtered customer count label shown below search bar ("X clienti" / "X clienti (filtrati)")
- TypeScript passes cleanly with Array.isArray guard for Supabase join response type

## Task Commits

Each task was committed atomically:

1. **Task 1: Add exportCSV function and Export button to customers page** - `45a9dec` (feat)

**Plan metadata:** (see final docs commit below)

## Files Created/Modified
- `app/dashboard/customers/page.tsx` - Added exporting state, exportCSV() async function, Export CSV button in header, filtered count label below search bar

## Decisions Made
- Supabase nested join (`programs:program_id (name, program_type)`) used inside client component — valid pattern per CLAUDE.md (edge runtime restriction only applies to `/api/` routes, not client components using browser Supabase client)
- `Array.isArray` guard added to handle Supabase JS client returning array for foreign-key joins instead of single object — resolves TS2352 type overlap error
- UTF-8 BOM (`\uFEFF`) prepended to CSV blob ensures Italian accent characters (accented vowels) display correctly when opened in Microsoft Excel

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript TS2352 type error on Supabase nested join cast**
- **Found during:** Task 1 (exportCSV implementation)
- **Issue:** `card.programs as { name: string; program_type: string }` raised TS2352 because Supabase types the join result as `{ name: any; program_type: any; }[]` (array), not a single object
- **Fix:** Added `Array.isArray` guard — cast via `unknown` first, then check if array and take index [0], or use directly if not array
- **Files modified:** app/dashboard/customers/page.tsx
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** 45a9dec (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type bug)
**Impact on plan:** Essential for TypeScript correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed TypeScript type error above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EXPORT-01 satisfied, CSV export fully functional
- Remaining plans in phase 04: 04-04 (if any)
- Export pattern established (Blob/URL.createObjectURL) can be reused for future exports

## Self-Check: PASSED

- app/dashboard/customers/page.tsx: FOUND
- .planning/phases/04-retention-tools/04-03-SUMMARY.md: FOUND
- commit 45a9dec: FOUND

---
*Phase: 04-retention-tools*
*Completed: 2026-03-02*
