---
phase: 06-critical-fixes-v2
plan: "02"
subsystem: ui
tags: [supabase, soft-delete, react, typescript, programs]

# Dependency graph
requires: []
provides:
  - "Soft delete (archive) for programs: sets deleted_at timestamp, program hidden from all dashboard queries"
  - "Hard delete with name confirmation: cascades stamp_transactions/rewards/tiers/cards/programs"
  - "Program type updated with deleted_at field"
  - "All merchant-facing program queries filter .is('deleted_at', null)"
affects: [dashboard, programs-list, program-detail]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Soft delete via deleted_at timestamptz column — filter with .is('deleted_at', null) in all queries"
    - "Hard delete with name confirmation — disabled button until input matches program.name exactly"
    - "Cascade delete order: stamp_transactions -> rewards -> tiers -> cards -> programs"

key-files:
  created: []
  modified:
    - lib/types.ts
    - app/dashboard/programs/page.tsx
    - app/dashboard/page.tsx
    - app/dashboard/programs/[id]/page.tsx

key-decisions:
  - "Two separate delete paths: softDeleteProgram() sets deleted_at, hardDeleteProgram() does full cascade"
  - "Hard delete has no active-cards block — merchant can delete regardless of active card count"
  - "Soft delete does not cascade — data preserved in DB for potential future recovery"
  - "Name confirmation input disables Elimina button until deleteConfirmName === program.name exactly"

patterns-established:
  - "Soft delete pattern: .update({ deleted_at: new Date().toISOString() }) + .is('deleted_at', null) filter everywhere"

requirements-completed: [FIX-02, FIX-03]

# Metrics
duration: 15min
completed: 2026-03-02
---

# Phase 6 Plan 02: Soft Delete + Hard Delete Programs Summary

**Soft delete (archive) via deleted_at column + hard delete with name-typed confirmation modal replacing the blocked single-delete flow**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-02T23:15:00Z
- **Completed:** 2026-03-02T23:31:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- FIX-02: Merchants can archive programs with active cards — sets deleted_at, program hidden from dashboard and programs list
- FIX-03: Hard delete requires typing exact program name in modal input, cascades through all related tables in correct FK order
- All program queries in programs/page.tsx and dashboard/page.tsx now filter `.is('deleted_at', null)` so archived programs never show up in counts or lists
- Old single-path delete (which blocked on active cards) fully replaced — no more "Impossibile eliminare" error

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Program type + filter soft-deleted programs from queries** - `e80311b` (feat)
2. **Task 2: Rewrite delete modal with soft delete + hard delete paths** - `d96b247` (feat)

**Plan metadata:** (final docs commit follows)

## Files Created/Modified
- `lib/types.ts` - Added `deleted_at?: string | null` to Program type
- `app/dashboard/programs/page.tsx` - Added `.is('deleted_at', null)` filter to loadPrograms query
- `app/dashboard/page.tsx` - Added `.is('deleted_at', null)` filter to programs count query
- `app/dashboard/programs/[id]/page.tsx` - Replaced deleteProgram() with softDeleteProgram() + hardDeleteProgram(), rewrote modal with two paths

## Decisions Made
- Two distinct functions instead of one: softDeleteProgram() and hardDeleteProgram() — clear separation of concern and avoids conditional logic in a single function
- Hard delete removes the active-cards block entirely — merchants own their data and should be able to delete regardless
- Soft delete does not cascade data — all cards, transactions and rewards remain intact under the archived program (data preservation)
- Name confirmation input bound to program.name exactly — button stays disabled until match, prevents accidental mass deletion

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — SQL migration had already been run by user (deleted_at column existed in programs table). Code changes proceeded cleanly.

## User Setup Required
None - no external service configuration required.

SQL migration already applied by user before execution:
```sql
alter table programs add column if not exists deleted_at timestamptz;
```

## Next Phase Readiness
- FIX-02 and FIX-03 complete — soft delete and hard delete both functional
- Remaining Phase 6 items: FIX-04 (hero image color fix)
- Build passes: npm run build succeeds with no errors or warnings

## Self-Check: PASSED

All files verified:
- lib/types.ts - FOUND
- app/dashboard/programs/page.tsx - FOUND
- app/dashboard/page.tsx - FOUND
- app/dashboard/programs/[id]/page.tsx - FOUND
- .planning/phases/06-critical-fixes-v2/06-02-SUMMARY.md - FOUND

All commits verified:
- e80311b - feat(06-02): update Program type + filter soft-deleted programs from queries
- d96b247 - feat(06-02): rewrite delete modal with soft delete + hard delete paths

---
*Phase: 06-critical-fixes-v2*
*Completed: 2026-03-02*
