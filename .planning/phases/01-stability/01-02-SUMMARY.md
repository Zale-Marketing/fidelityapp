---
phase: 01-stability
plan: 02
subsystem: database
tags: [supabase, postgres, migrations, stripe, notifications]

# Dependency graph
requires: []
provides:
  - notification_logs table with RLS policy in Supabase (fixes 500 on /dashboard/notifications)
  - stripe_customer_id, stripe_subscription_id, stripe_subscription_status, plan_expires_at columns on merchants table
  - SQL migration files as source of truth for DB schema changes
affects: [02-merchant-ux, 04-retention-tools]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SQL migrations stored in supabase/migrations/ as plain .sql files (no Supabase CLI required)"
    - "Human-action checkpoint used for changes that cannot be automated via code (Supabase Dashboard only)"

key-files:
  created:
    - supabase/migrations/01_notification_logs.sql
    - supabase/migrations/02_stripe_columns.sql
  modified: []

key-decisions:
  - "Migration files written as plain SQL, not Supabase CLI migrations — project has no CLI configured, and Dashboard execution is the only available path"
  - "notification_logs table includes merchant_id + program_id FKs and RLS policy so each merchant sees only their own logs"
  - "All Stripe columns added with ADD COLUMN IF NOT EXISTS — idempotent, safe to re-run"

patterns-established:
  - "DB schema changes that require Dashboard execution: write the .sql file first, commit, then use checkpoint:human-action to collect confirmation"

requirements-completed: [BUG-02, BUG-04]

# Metrics
duration: 5min
completed: 2026-03-02
---

# Phase 1 Plan 02: SQL Migrations — notification_logs + Stripe Columns Summary

**Two SQL migration files written and executed: notification_logs table with RLS created, and four Stripe billing columns added to merchants — fixing the 500 error on /dashboard/notifications and resolving missing-column errors in Stripe webhook handlers**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-02
- **Completed:** 2026-03-02T11:09:46Z
- **Tasks:** 2 (1 auto + 1 human-action)
- **Files modified:** 2

## Accomplishments
- Created `supabase/migrations/01_notification_logs.sql` defining the `notification_logs` table with RLS policy scoped per merchant
- Created `supabase/migrations/02_stripe_columns.sql` adding `stripe_customer_id`, `stripe_subscription_id`, `stripe_subscription_status`, and `plan_expires_at` to `merchants`
- User ran both migrations successfully in Supabase SQL Editor — DB schema now matches code expectations

## Task Commits

Each task was committed atomically:

1. **Task 1: Write SQL migration files** - `69a6c73` (chore)
2. **Task 2: Execute SQL migrations in Supabase** - performed by user in Supabase Dashboard (no code change)

**Plan metadata:** (this commit — docs: complete plan)

## Files Created/Modified
- `supabase/migrations/01_notification_logs.sql` - Creates notification_logs table with UUID PK, merchant_id/program_id FKs, RLS policy
- `supabase/migrations/02_stripe_columns.sql` - Adds four Stripe billing columns to merchants; sets plan DEFAULT 'FREE'

## Decisions Made
- SQL files stored in `supabase/migrations/` as plain .sql — no Supabase CLI configured, Dashboard is the only execution path
- Used `ADD COLUMN IF NOT EXISTS` throughout so migrations are idempotent and safe to re-run
- `notification_logs` RLS policy uses subquery on `profiles` table (matches existing pattern in codebase)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. User confirmed both SQL statements ran without error in Supabase Dashboard.

## User Setup Required

Both SQL migrations have already been executed by the user in Supabase Dashboard:
- `notification_logs` table created with RLS
- `merchants` table updated with Stripe columns

No further setup required for this plan.

## Next Phase Readiness
- BUG-02 resolved: `/dashboard/notifications` should now load without a 500 error (notification_logs table exists)
- BUG-04 resolved: Stripe webhook handler (`app/api/stripe-webhook/route.ts`) can now write to stripe_* columns on merchants
- Phase 1 plans 01 and 02 complete; plan 03 (wallet API auth guard) was already completed out of order (see git log)
- Phase 1 is fully complete — all 3 plans done

## Self-Check: PASSED

- FOUND: `.planning/phases/01-stability/01-02-SUMMARY.md`
- FOUND: commit `69a6c73` (chore(01-02): add SQL migration files for missing DB schema)

---
*Phase: 01-stability*
*Completed: 2026-03-02*
