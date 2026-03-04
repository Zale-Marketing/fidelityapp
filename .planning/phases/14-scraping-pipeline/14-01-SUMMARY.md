---
phase: 14-scraping-pipeline
plan: "01"
subsystem: ocio-scraping
tags: [trigger.dev, apify, supabase, google-maps-reviews, scheduled-tasks]
dependency_graph:
  requires: []
  provides:
    - "Trigger.dev task 'ocio-review-scraper' — schedules Apify scraping every 6h"
    - "POST /api/ocio/schedule — create/cancel schedule lifecycle"
  affects:
    - "ocio_config (last_scrape_at, trigger_schedule_id columns written)"
    - "ocio_reviews (upserted idempotently by merchant_id,review_id)"
tech_stack:
  added:
    - "@trigger.dev/sdk/v3 schedules.task — scheduled job"
    - "apify-client v2 — compass/google-maps-reviews-scraper actor"
  patterns:
    - "Per-merchant error isolation: try/catch per loop iteration"
    - "Dynamic maxReviews: 50 first run, 20 subsequent (count-based)"
    - "Idempotent upsert: onConflict merchant_id,review_id, ignoreDuplicates:true"
    - "schedules.create deduplicationKey: ocio-{merchantId} for idempotency"
key_files:
  created:
    - trigger/ocio-scraper.ts
    - app/api/ocio/schedule/route.ts
  modified: []
decisions:
  - "waitSecs: 120 used (not waitForFinishSecs) — matches apify-client v2 ActorCallOptions"
  - "deduplicationKey: 'ocio-{merchantId}' required by Trigger.dev schedules.create"
  - "SupabaseClient<any, 'public', any> used in scrapeForMerchant to avoid generic type mismatch with untyped DB schema"
  - "cron placeholder '0 */6 * * *' in task definition — actual schedules created dynamically via API route"
metrics:
  duration: "4 minutes"
  completed_date: "2026-03-04"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 14 Plan 01: Trigger.dev Scraping Task + Schedule API Summary

**One-liner:** Trigger.dev task `ocio-review-scraper` polls Apify every 6h for all BUSINESS merchants with `module_reviews=true`, upserts reviews idempotently into `ocio_reviews`, and a POST `/api/ocio/schedule` route manages the schedule lifecycle with Trigger.dev's `schedules.create`/`schedules.del`.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Create trigger/ocio-scraper.ts | 20b8eaa | trigger/ocio-scraper.ts |
| 2 | Create app/api/ocio/schedule/route.ts | 0dd19c1 | app/api/ocio/schedule/route.ts |

## Artifacts

### trigger/ocio-scraper.ts

- Exports `ocioReviewScraper` as `schedules.task` with `id: "ocio-review-scraper"`, `cron: "0 */6 * * *"`, `maxDuration: 300`
- On run: fetches all `ocio_config` rows where `module_reviews=true` AND `google_maps_url IS NOT NULL`
- Per merchant: counts existing reviews, sets `maxReviews` to 50 (first run) or 20 (subsequent)
- Calls `compass/google-maps-reviews-scraper` Apify actor with `waitSecs: 120`
- Maps items defensively: `review_id = reviewerId_publishedAtDate`, all `ai_*` fields null, `reply_status: 'pending'`, `alert_sent: false`
- Upserts batch with `onConflict: 'merchant_id,review_id', ignoreDuplicates: true`
- Updates `ocio_config.last_scrape_at` after each successful merchant
- Per-merchant try/catch: failure of one merchant does not abort the full run

### app/api/ocio/schedule/route.ts

- Exports `POST` (Node runtime, not edge)
- Auth: Bearer token → `supabase.auth.getUser` → `profiles.merchant_id` → `merchants.plan === 'business'`
- `action: 'create'`: validates `google_maps_url` is set, calls `schedules.create({ task: "ocio-review-scraper", cron: "0 */6 * * *", externalId: merchantId, deduplicationKey: "ocio-{merchantId}" })`, persists `trigger_schedule_id` in `ocio_config`
- `action: 'cancel'`: reads `trigger_schedule_id`, calls `schedules.del(id)` (error-tolerant), clears `trigger_schedule_id` in `ocio_config`
- Unknown action: 400

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Incorrect Apify actor call options key**
- **Found during:** Task 1 TypeScript check
- **Issue:** Plan specified `waitForFinishSecs: 120` but apify-client v2 `ActorCallOptions` uses `waitSecs`
- **Fix:** Changed to `waitSecs: 120`
- **Files modified:** trigger/ocio-scraper.ts
- **Commit:** 20b8eaa

**2. [Rule 1 - Bug] Missing required `deduplicationKey` in schedules.create**
- **Found during:** Task 2 TypeScript check
- **Issue:** Trigger.dev SDK v3 `schedules.create` requires `deduplicationKey` (not optional); plan did not include it
- **Fix:** Added `deduplicationKey: "ocio-{merchantId}"` — guarantees idempotent schedule creation per merchant
- **Files modified:** app/api/ocio/schedule/route.ts
- **Commit:** 0dd19c1

## Verification

- `npx tsc --noEmit`: zero errors
- `npm run build`: completed successfully, `/api/ocio/schedule` compiled as dynamic route
- `ocioReviewScraper` export verified in trigger/ocio-scraper.ts
- `POST` export verified in app/api/ocio/schedule/route.ts
- `ignoreDuplicates: true` on `merchant_id,review_id` upsert confirmed
- `last_scrape_at` update after each successful merchant confirmed

## Self-Check: PASSED

- [x] trigger/ocio-scraper.ts exists and exports `ocioReviewScraper`
- [x] app/api/ocio/schedule/route.ts exists and exports `POST`
- [x] Commits 20b8eaa and 0dd19c1 exist in git log
- [x] Zero TypeScript errors
- [x] Build passes
