---
type: quick
plan: 1
subsystem: ocio
tags: [pagination, ai-analyzer, ux, trigger.dev]
key-files:
  modified:
    - app/dashboard/ocio/page.tsx
    - trigger/ocio-ai-analyzer.ts
decisions:
  - fetchAllReviews uses page-loop with .range() so all reviews are fetched even beyond Supabase 1000-row default
  - AI analyzer capped at 200 reviews per run; auto-retrigger fires only when processed > 0 and remaining > 0
  - Analyzing screen gated on googleMapsUrl !== null to avoid intercepting the unconfigured (no-URL) empty state
metrics:
  duration: ~5m
  completed: "2026-03-05"
  tasks: 3
  files: 2
---

# Quick Plan 1: Fix OCIO Dashboard Pagination + AI Analyze

**One-liner:** Paginated reviews fetch with 1000-row pages, AI analyzer batched to 200 + auto-retrigger, and an animated "analyzing" screen shown when URL is configured but no reviews have arrived yet.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Paginate ocio reviews fetch | bb67308 | app/dashboard/ocio/page.tsx |
| 2 | Batch AI analyzer 200 reviews + auto-retrigger | 7895656 | trigger/ocio-ai-analyzer.ts |
| 3 | Add analyzing-in-progress screen | a952852 | app/dashboard/ocio/page.tsx |

## What Was Done

### Task 1 — Paginated reviews fetch

Added `fetchAllReviews(supabase, merchantId)` helper before the `OcioDashboardPage` component. The helper loops using `.range(from, from + pageSize - 1)` with `pageSize = 1000`, accumulating all pages until a page returns fewer than 1000 rows (or an error). Replaced the single `.select()` query inside `loadData()` with a call to this helper via `Promise.all`.

### Task 2 — Batch AI analyzer

Updated the import in `trigger/ocio-ai-analyzer.ts` to include `tasks` from `@trigger.dev/sdk/v3`. Added `.limit(200)` to the unanalyzed reviews query. After the for loop, if `processed > 0`, a count query checks for remaining unanalyzed reviews; if any remain, `tasks.trigger("ocio-ai-analyzer", { merchantId })` re-enqueues the task.

### Task 3 — Analyzing-in-progress screen

Added a `useEffect` that polls `loadData()` every 30 seconds when `reviews.length === 0 && googleMapsUrl !== null && !loading`. Added a render branch before the main dashboard return that shows a spinner card with Italian copy ("Stiamo analizzando la tua attività…") when `googleMapsUrl !== null` and `reviews.length === 0`. The existing `EmptyState` in the reviews list (which fires when `googleMapsUrl === null`) is unchanged.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `app/dashboard/ocio/page.tsx` modified — fetchAllReviews helper added, analyzing screen added
- [x] `trigger/ocio-ai-analyzer.ts` modified — .limit(200) added, tasks import added, retrigger block added
- [x] Commit bb67308 exists
- [x] Commit 7895656 exists
- [x] Commit a952852 exists
- [x] `npx tsc --noEmit` passes after all changes

## Self-Check: PASSED
