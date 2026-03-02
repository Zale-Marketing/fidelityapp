---
phase: 01-stability
plan: 01
subsystem: api
tags: [idempotency, supabase, typescript, react, qr-scanner]

# Dependency graph
requires: []
provides:
  - Double-stamp prevention via scan-time idempotency key (crypto.randomUUID)
  - Missioni program type removed from creation form and type system
affects: [stamp-scanner, program-creation, wallet-update]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scan-time idempotency: generate key once per QR scan using crypto.randomUUID(), store in both useState and useRef for synchronous access in immediate transaction calls"
    - "ProgramType union must stay in sync with PROGRAM_TYPES array and DB program_type values"

key-files:
  created: []
  modified:
    - app/stamp/page.tsx
    - app/dashboard/programs/new/page.tsx

key-decisions:
  - "Used useRef alongside useState for idempotency key to ensure synchronous access in functions called immediately after scan (React state updates are async)"
  - "Date.now() retained as fallback in idempotency_key expressions but unreachable in normal scan flow"
  - "selectedType !== 'missions' guards simplified to selectedType truthy check rather than removing entire conditional blocks"

patterns-established:
  - "Idempotency pattern: idempotencyKeyRef.current || idempotencyKey || fallback"

requirements-completed: [BUG-01, BUG-03]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 1 Plan 1: Idempotency + Missioni Bug Fixes Summary

**Scan-time idempotency via crypto.randomUUID() prevents double-stamping; Missioni type removed from program creation form and TypeScript union**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-02T10:53:46Z
- **Completed:** 2026-03-02T10:57:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Fixed BUG-01: All 9 stamp_transaction inserts now use a key generated once per QR scan session (crypto.randomUUID), so duplicate scans/button taps are rejected by the DB unique constraint
- Fixed BUG-03: Missioni program type removed from ProgramType union, PROGRAM_TYPES array, switch statement, and all JSX — merchants can no longer select a type that crashes the wallet API
- TypeScript compiles clean (0 errors) after both fixes

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix idempotency key in app/stamp/page.tsx** - `bfb6970` (fix)
2. **Task 2: Remove Missioni type from program creation form** - `423d654` (fix)

## Files Created/Modified

- `app/stamp/page.tsx` - Added idempotencyKey state + idempotencyKeyRef; replaced all 9 `Date.now()` idempotency_key values with scan-time key; reset on scanner clear
- `app/dashboard/programs/new/page.tsx` - Removed missions from ProgramType union, PROGRAM_TYPES array, switch case, and missions JSX block; simplified 4 conditional guards

## Decisions Made

- Used `useRef` alongside `useState` for the idempotency key because React state updates are asynchronous — functions called immediately after `setIdempotencyKey()` (e.g., `addStamp`) would see the old empty value. The ref is updated synchronously on the same line and is always current.
- Kept `Date.now()` as a last-resort fallback in the idempotency expression (`idempotencyKeyRef.current || idempotencyKey || \`${card.id}-${Date.now()}\``). In practice, the ref will always be set before any transaction function is called.
- Simplified `selectedType !== 'missions'` guards to `selectedType` (truthy) rather than fully unwrapping the conditionals, to minimize diff size and avoid structural JSX changes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed remaining 'missions' references causing TypeScript errors**
- **Found during:** Task 2 (Remove Missioni type from program creation form)
- **Issue:** After removing missions from the ProgramType union, TypeScript reported 5 additional errors in programs/new/page.tsx: a `case 'missions':` in the switch statement, a `{selectedType === 'missions' && ...}` JSX block, and 4 `{selectedType !== 'missions' && ...}` conditional guards
- **Fix:** Removed the switch case, removed the missions JSX block, replaced the 4 `!== 'missions'` guards with `selectedType` truthy checks
- **Files modified:** app/dashboard/programs/new/page.tsx
- **Verification:** TypeScript compiles with 0 errors
- **Committed in:** `423d654` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Necessary cleanup to make TypeScript compile. The plan specified removing missions from the type union but did not enumerate all the downstream references that also needed removal. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BUG-01 and BUG-03 resolved — data integrity and wallet API stability restored
- Ready for Plan 02 (BUG-02: notification_logs table) and Plan 03

---
*Phase: 01-stability*
*Completed: 2026-03-02*
