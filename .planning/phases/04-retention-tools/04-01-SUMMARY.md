---
phase: 04-retention-tools
plan: "01"
subsystem: database
tags: [postgres, supabase, rls, sql, migration]

# Dependency graph
requires:
  - phase: 01-stability
    provides: notification_logs migration pattern (CREATE TABLE IF NOT EXISTS + RLS via profiles subquery)
provides:
  - customer_tags table with merchant-scoped RLS
  - card_holder_tags junction table with merchant-scoped RLS
  - card_holders extended columns (contact_email, birth_date, notes, marketing_consent, acquisition_source, last_visit, total_stamps)
affects: [04-retention-tools, customers-pages, analytics]

# Tech tracking
tech-stack:
  added: []
  patterns: [Idempotent SQL migration with IF NOT EXISTS, RLS policies scoped via profiles subquery]

key-files:
  created:
    - supabase/migrations/03_retention_schema.sql
  modified: []

key-decisions:
  - "RLS on card_holder_tags uses nested subquery: card_holder_id IN (SELECT id FROM card_holders WHERE merchant_id IN (SELECT merchant_id FROM profiles WHERE id = auth.uid())) — matches existing codebase pattern for indirect ownership"
  - "All card_holders extended columns use ADD COLUMN IF NOT EXISTS for full idempotency — safe to run multiple times"

patterns-established:
  - "Migration pattern: header comment with run location, CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN IF NOT EXISTS, ENABLE ROW LEVEL SECURITY, CREATE POLICY"

requirements-completed: [PROF-01, PROF-02, PROF-03]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 4 Plan 01: Retention Schema Summary

**Idempotent SQL migration creating customer_tags, card_holder_tags tables and extending card_holders with 7 retention columns — unblocks PROF-01/02/03 customer tagging features**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T12:51:43Z
- **Completed:** 2026-03-02T12:54:00Z
- **Tasks:** 2 of 2 (1 auto + 1 human-action checkpoint)
- **Files modified:** 1

## Accomplishments
- SQL migration file created at supabase/migrations/03_retention_schema.sql
- customer_tags table defined with merchant_id FK, unique(merchant_id, name) constraint, RLS
- card_holder_tags junction table defined with composite PK, cascade deletes, RLS
- card_holders extended with 7 columns: contact_email, birth_date, notes, marketing_consent, acquisition_source, last_visit, total_stamps
- Both new tables have RLS enabled with policies scoped via profiles subquery

## Task Commits

Each task was committed atomically:

1. **Task 1: Write SQL migration for retention schema** - `503ee48` (chore)

2. **Task 2 (checkpoint): Run SQL migration in Supabase Dashboard** - confirmed by user ("migration done")

**Plan metadata:** `06baefb` (docs: complete retention schema plan)

## Files Created/Modified
- `supabase/migrations/03_retention_schema.sql` - Idempotent DDL for customer tagging retention schema

## Decisions Made
- RLS on card_holder_tags uses nested subquery through card_holders.merchant_id to match indirect ownership pattern used in existing codebase
- All ALTER TABLE statements use ADD COLUMN IF NOT EXISTS for full idempotency (safe to re-run)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
**COMPLETE.** Migration executed in Supabase Dashboard — confirmed by user.

- customer_tags table: created
- card_holder_tags table: created
- card_holders extended columns: contact_email, birth_date, notes, marketing_consent, acquisition_source, last_visit, total_stamps — added

## Next Phase Readiness
- /dashboard/customers and /dashboard/customers/[id] are now unblocked
- PROF-01 (add tags to customers), PROF-02 (remove tags), PROF-03 (filter by tag) all unblocked
- Ready to proceed to 04-02

---
*Phase: 04-retention-tools*
*Completed: 2026-03-02*
