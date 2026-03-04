---
phase: 15-ai-intelligence
plan: "01"
subsystem: api
tags: [anthropic, claude, trigger.dev, supabase, ai-analysis, reviews]

# Dependency graph
requires:
  - phase: 14-scraping-pipeline
    provides: trigger/ocio-scraper.ts scraping Google Maps reviews into ocio_reviews table
provides:
  - Trigger.dev task 'ocio-ai-analyzer' that calls Claude claude-sonnet-4-5 to populate all ai_* fields on ocio_reviews rows
  - Scraper-to-analyzer wire: scraper triggers AI analysis after each successful merchant scrape
affects: [16-review-dashboard, ocio_reviews DB]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Trigger.dev on-demand task (task()) vs cron task (schedules.task()) for AI processing"
    - "JSON.parse error isolation: SyntaxError caught per-review, system errors thrown for Trigger.dev retry"
    - "Fire-and-forget task chaining: tasks.trigger() wrapped in separate try/catch so trigger failure does not abort parent task"

key-files:
  created:
    - trigger/ocio-ai-analyzer.ts
  modified:
    - trigger/ocio-scraper.ts

key-decisions:
  - "JSON parse errors (SyntaxError) are caught per-review and skipped — system errors (network, missing env var) are thrown so Trigger.dev auto-retries the entire task"
  - "review.text null or <5 chars uses 'N/A' placeholder in prompt — Claude infers sentiment from rating alone"
  - "tasks.trigger() call placed in a separate try/catch after successCount++ — trigger failure never rolls back scraper success count"

patterns-established:
  - "analyzeReview() helper returns typed AnalysisResult — parse errors caught at call site in the loop"
  - "ANTHROPIC_API_KEY absence throws immediately — propagates as system error for Trigger.dev retry"

requirements-completed: [OCIO-03, OCIO-04, OCIO-05, OCIO-06, OCIO-07]

# Metrics
duration: 1min
completed: 2026-03-04
---

# Phase 15 Plan 01: AI Intelligence Summary

**Claude claude-sonnet-4-5 review analyzer as Trigger.dev on-demand task, wired to scraper for automatic per-merchant AI analysis after each scrape batch**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-04T15:03:47Z
- **Completed:** 2026-03-04T15:05:26Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `trigger/ocio-ai-analyzer.ts` — Trigger.dev task id `'ocio-ai-analyzer'`, maxDuration 600s, processes all `ai_analyzed_at IS NULL` reviews for a given `merchantId`
- Each review calls Anthropic claude-sonnet-4-5 (max_tokens 500), parses JSON response, UPDATEs 7 `ai_*` columns plus `ai_analyzed_at` atomically
- Error isolation: SyntaxError on JSON parse skips review and increments error counter; all other exceptions throw (Trigger.dev retry)
- Updated `trigger/ocio-scraper.ts` to import `tasks` from `@trigger.dev/sdk/v3` and call `tasks.trigger('ocio-ai-analyzer', { merchantId })` after each successful merchant scrape in a fire-and-forget try/catch

## Task Commits

Each task was committed atomically:

1. **Task 1: Creare trigger/ocio-ai-analyzer.ts** - `8a11cc5` (feat)
2. **Task 2: Aggiornare trigger/ocio-scraper.ts per avviare l'analisi AI** - `db46945` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `trigger/ocio-ai-analyzer.ts` - New Trigger.dev task: fetches unanalyzed reviews, calls Claude AI, updates all ai_* DB fields
- `trigger/ocio-scraper.ts` - Added `tasks` import + fire-and-forget `tasks.trigger('ocio-ai-analyzer', { merchantId })` after each successful scrape

## Decisions Made
- JSON parse errors (SyntaxError) are caught per-review and skipped with `logger.error` — system errors thrown for Trigger.dev retry
- `review.text` null or very short uses `"N/A"` in prompt so Claude can use rating to infer sentiment
- Trigger call placed in a separate try/catch after `successCount++` — trigger failure never rolls back scraper success count

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required beyond already-documented ANTHROPIC_API_KEY env var.

## Next Phase Readiness
- `ocio-ai-analyzer` task is ready for deployment to Trigger.dev
- All `ai_*` fields will be populated after each scrape cycle
- Phase 16 review dashboard can read populated `ai_sentiment`, `ai_urgency`, `ai_themes`, `ai_suggested_reply` fields directly

## Self-Check: PASSED

- trigger/ocio-ai-analyzer.ts: FOUND
- .planning/phases/15-ai-intelligence/15-01-SUMMARY.md: FOUND
- Commit 8a11cc5: FOUND
- Commit db46945: FOUND

---
*Phase: 15-ai-intelligence*
*Completed: 2026-03-04*
