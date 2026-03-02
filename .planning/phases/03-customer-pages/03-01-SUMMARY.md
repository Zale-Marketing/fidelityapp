---
phase: 03-customer-pages
plan: "01"
subsystem: ui
tags: [react, supabase, nextjs, join-page, rewards, redirect]

# Dependency graph
requires:
  - phase: 01-stability
    provides: rewards table and stamp_transactions schema
  - phase: 02-merchant-ux
    provides: program CRUD with all 5 program types
provides:
  - BenefitPreview section on /join page showing concrete rewards per program type
  - Rewards table query (separate, non-nested) for stamps programs
  - Auto-redirect to /c/[token] 2.5 seconds after enrollment
  - Extended ProgramInfo type with min_cashback_redeem and daily_limit
affects:
  - 03-customer-pages
  - Any future join page UX changes

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Separate rewards query (not nested) for stamps programs — follows CLAUDE.md rule
    - Per-type conditional rendering in BenefitPreview section
    - Auto-redirect via setTimeout + router.push using local variable (not stale state)

key-files:
  created: []
  modified:
    - app/join/[programId]/page.tsx

key-decisions:
  - "Auto-redirect uses newCard.scan_token local variable (not cardLink state) to avoid React async state staleness"
  - "Separate rewards query (.from('rewards').select()) for stamps programs — nested query prohibited per CLAUDE.md"
  - "Header badge replaced from benefitText() one-liner to TYPE_LABELS type label for clarity"

patterns-established:
  - "BenefitPreview pattern: 'Come funziona' section with per-type conditional blocks, placed between header and form"
  - "Auto-redirect pattern: setTimeout 2500ms + router.push in success path, with fallback anchor link"

requirements-completed: [JOIN-01, JOIN-02, JOIN-03, JOIN-04]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 03 Plan 01: Join Page BenefitPreview and Auto-Redirect Summary

**Redesigned /join/[programId] with a structured 'Come funziona' section showing concrete per-type rewards (stamps table rows, cashback %, subscription price/daily limit) before the form, plus 2.5-second auto-redirect to /c/[token] after enrollment**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T12:06:03Z
- **Completed:** 2026-03-02T12:21:40Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Extended ProgramInfo type with min_cashback_redeem and daily_limit fields; extended select query to fetch them
- Added RewardItem type and rewards state; conditional rewards query for stamps programs using separate .from('rewards') call per CLAUDE.md rules
- Added BenefitPreview 'Come funziona' section with per-type content (stamps show reward rows or fallback, points show rate/threshold, cashback shows % and minimum redeem, tiers show description, subscription shows price/period/daily limit)
- Added auto-redirect setTimeout(2500ms) using local newCard.scan_token variable (avoids React async state staleness)
- Removed benefitText() function and old bottom benefit badge; replaced header badge with TYPE_LABELS

## Task Commits

Each task was committed atomically:

1. **Task 1: Add rewards state + extend data loading** - `468ff3b` (feat)
2. **Task 2: Add BenefitPreview section + auto-redirect in success state** - `3fb40cf` (feat)

## Files Created/Modified
- `app/join/[programId]/page.tsx` - Redesigned join page with BenefitPreview section, rewards query, and auto-redirect

## Decisions Made
- Auto-redirect uses `newCard.scan_token` local variable (not `cardLink` state) to avoid React async state staleness — state may not have updated yet when setTimeout fires
- Rewards query uses separate `.from('rewards').select()` call (not nested) per CLAUDE.md rules prohibiting nested queries
- benefitText() function deleted entirely; replaced with TYPE_LABELS in header badge — more concise and consistent with the expanded BenefitPreview section below

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unclosed JSX div in success state**
- **Found during:** Task 2 (BenefitPreview + auto-redirect)
- **Issue:** When adding the redirect hint paragraph and wrapping the share button in a new div, the `<div className="bg-white rounded-2xl shadow-xl p-8 text-center">` was missing its closing tag
- **Fix:** Added the missing `</div>` closing tag; also corrected indentation alignment for the wrapped share button
- **Files modified:** app/join/[programId]/page.tsx
- **Verification:** npx tsc --noEmit returned zero errors after fix
- **Committed in:** 3fb40cf (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — missing JSX closing tag)
**Impact on plan:** Required fix for TypeScript compilation to pass. No scope creep.

## Issues Encountered
- JSX structure error: unclosed `<div>` in success state after adding the share button wrapper. TypeScript caught it at compile time; fixed by adding the missing closing tag.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /join page now shows concrete program benefits before the signup form (conversion hook visible)
- Enrollment auto-redirects to /c/[token] after 2.5 seconds
- Ready for Phase 03 Plan 02 (customer card page /c/[token] improvements)

---
*Phase: 03-customer-pages*
*Completed: 2026-03-02*
