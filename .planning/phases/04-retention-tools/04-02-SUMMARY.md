---
phase: 04-retention-tools
plan: "02"
subsystem: ui
tags: [react, supabase, tailwind, notifications, segmentation]

# Dependency graph
requires:
  - phase: 04-01
    provides: customer_tags and card_holder_tags tables with RLS, tags management UI
provides:
  - Tag dropdown on notifications page for audience segmentation
  - Live recipient count preview (distinct customers, not cards)
  - Tag+program intersection logic for targeted wallet notification sends
affects: [notifications, wallet-updates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Debounced useEffect with useRef timer for live count recomputation
    - computeRecipientCount() receives current state as params (avoids stale closure)
    - Tag-first query pattern: fetch taggedHolderIds, then filter cards query

key-files:
  created: []
  modified:
    - app/dashboard/notifications/page.tsx

key-decisions:
  - "computeRecipientCount() accepts explicit params (merchantId, programs, selectedProgram, selectedTag) instead of relying on closure state to avoid stale values in debounced callback"
  - "recipientCount counts distinct card_holder_ids (customers), not card rows — aligns with 'X clienti' wording"
  - "Tag dropdown hidden when merchant has no tags (tags.length === 0) — zero-friction baseline UX"
  - "selectedTag resets to 'all' after successful send — form ready for next notification without manual reset"
  - "notification_logs insert unchanged — no tag_id column added (avoids DB migration per plan spec)"

patterns-established:
  - "Debounce pattern: useRef<ReturnType<typeof setTimeout>> + clearTimeout on each effect trigger for live query previews"

requirements-completed: [NOTIFY-01, NOTIFY-02, NOTIFY-03]

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 04 Plan 02: Notification Tag Segmentation Summary

**Tag dropdown + live recipient count preview on notifications page, with card_holder_tags intersection logic for targeted Google Wallet bulk sends**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T12:56:46Z
- **Completed:** 2026-03-02T12:59:09Z
- **Tasks:** 2 (committed as 1 atomic unit — same file, coupled logic)
- **Files modified:** 1

## Accomplishments
- Merchant sees "Filtra per tag" dropdown (hidden when no tags exist) alongside program dropdown
- Live "X clienti riceveranno questa notifica" count updates on filter change, debounced 300ms
- Send button disabled when recipient count is 0 or count is loading
- handleSend() fetches taggedHolderIds before card query and applies .in('card_holder_id', ...) filter
- History panel shows "clienti" count (was "carte")

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Tag state, count logic, dropdown UI, filtered send** - `f0561b6` (feat)

**Plan metadata:** (pending — created in final commit)

## Files Created/Modified
- `app/dashboard/notifications/page.tsx` - Added CustomerTag type, tags/selectedTag/recipientCount/countLoading state, computeRecipientCount(), debounced useEffect, tag dropdown, recipient count preview block, updated send button disabled condition, tag-filtered handleSend()

## Decisions Made
- computeRecipientCount() receives current state as explicit params instead of reading closure state, ensuring debounced callback reads correct values without extra deps
- Counts distinct card_holder_ids not card rows — "clienti" (customers) more meaningful than "carte" for merchant UX
- Tag dropdown conditionally rendered only when tags.length > 0 — merchants without tags see no UI change
- selectedTag resets after send so form is ready for next message
- No tag_id column added to notification_logs — plan explicitly excluded DB migration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tag segmentation on notifications complete — NOTIFY-01, NOTIFY-02, NOTIFY-03 satisfied
- Phase 04 has 2 more plans to execute (04-03 customer export, 04-04 if defined)
- Pre-existing TS error in app/dashboard/customers/page.tsx (type cast) is out of scope tech debt

## Self-Check: PASSED

- FOUND: `.planning/phases/04-retention-tools/04-02-SUMMARY.md`
- FOUND: `app/dashboard/notifications/page.tsx`
- FOUND: commit `f0561b6` (feat(04-02): add tag segmentation to notifications page)

---
*Phase: 04-retention-tools*
*Completed: 2026-03-02*
