---
phase: 03-customer-pages
plan: "02"
subsystem: ui
tags: [react, nextjs, tailwind, supabase, google-wallet]

# Dependency graph
requires: []
provides:
  - "Google Wallet CTA repositioned to top of card (above fold) on /c/[token]"
  - "Consistent progress message row between Wallet CTA and program detail section for all 5 program types"
  - "Stamps grid with SVG checkmark (no unicode char) capped at 10 with overflow counter"
  - "Bold ATTIVO/SCADUTO badge as primary visual for subscription cards"
  - "Separate rewards query in loadCard() for stamps programs"
  - "getProgressMessage() helper function covering all 5 program types"
affects: [future customer-facing pages, wallet integration, analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wallet CTA always first element in card body — before any program stats"
    - "Progress message row as second element between CTA and KPI content"
    - "SVG checkmarks instead of unicode characters to avoid font rendering issues"
    - "Bold text badges instead of emoji circles for binary status (active/expired)"
    - "Separate Supabase queries for rewards (not nested) per CLAUDE.md rules"

key-files:
  created: []
  modified:
    - "app/c/[token]/page.tsx"

key-decisions:
  - "Stamps grid capped at 10 circles with overflow text counter — avoids layout overflow on large stamp requirements"
  - "getProgressMessage() uses local variable re-derivation (not outer scope) so it is pure and callable before outer consts are declared"
  - "Progress bar removed from stamps section — replaced by unified progress message row that serves all types"

patterns-established:
  - "Card body order: (1) Wallet CTA, (2) Progress message, (3) Per-type KPI content, (4) QR section"
  - "SVG icons for status indicators — avoid emoji/unicode characters that render as rectangles on some fonts"

requirements-completed:
  - CARD-01
  - CARD-02
  - CARD-03

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 3 Plan 02: Customer Card Page Redesign Summary

**Google Wallet CTA moved above-fold on /c/[token] with per-type progress message row, SVG stamp grid (10-cap), and bold subscription status badge**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T12:19:27Z
- **Completed:** 2026-03-02T12:21:27Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Wallet CTA repositioned as the first interactive element in the white card — visible without scrolling on mobile
- Progress message ("Ancora X bollini al premio") added as second element for all 5 program types via getProgressMessage()
- Stamps grid now uses SVG checkmarks (not unicode ✓), capped at 10 circles with "+ altri N bollini" overflow text
- Subscription section replaced emoji circle pattern with bold ATTIVO/SCADUTO badge (green/red) as primary visual
- Separate rewards query added to loadCard() for stamps programs per CLAUDE.md edge runtime rules

## Task Commits

Each task was committed atomically:

1. **Task 1: Add rewards state, query, and getProgressMessage function** - `73d0999` (feat)
2. **Task 2: Restructure card body — Wallet CTA to top, progress message, fix stamps grid + subscription badge** - `0fce9c2` (feat)

## Files Created/Modified
- `app/c/[token]/page.tsx` - Redesigned card body structure, all JSX and logic changes

## Decisions Made
- Stamps grid capped at 10 circles with overflow text counter — avoids layout overflow when stamps_required > 10
- `getProgressMessage()` re-derives variables locally (totalSpent, cashbackBalance, etc.) rather than relying on outer scope to ensure it is callable safely as a pure function
- Old stamps progress bar removed entirely — replaced by the unified progress message row that now serves all 5 types

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `app/join/[programId]/page.tsx` (unclosed JSX div). Out of scope — not caused by these changes. Logged but not fixed per scope boundary rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- /c/[token] page now meets CARD-01, CARD-02, CARD-03 hard constraints
- Ready for Phase 3 Plan 03 (if any further customer pages work)
- No blockers

---
*Phase: 03-customer-pages*
*Completed: 2026-03-02*
