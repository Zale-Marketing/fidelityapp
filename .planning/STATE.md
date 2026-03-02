# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.
**Current focus:** Phase 1 — Stability

## Current Position

Phase: 1 of 5 (Stability)
Plan: 3 of 3 in current phase
Status: Complete
Last activity: 2026-03-02 — Plan 01-02 complete (SQL migrations: notification_logs + Stripe columns)

Progress: [####░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 3 min
- Total execution time: 9 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-stability | 3 | 9 min | 3 min |

**Recent Trend:**
- Last 5 plans: 01-02 (5 min), 01-03 (2 min), 01-01 (4 min)
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stripe non si attiva fino a feedback da primo merchant reale — colonne DB necessarie (BUG-04) ma billing non prioritario
- Tipo "Missioni" disabilitare subito — selezionabile ma non implementato, causa crash wallet API (BUG-03)
- NON toccare lib/google-wallet.ts — funziona, critico
- [01-03] Wallet API auth: NEXT_PUBLIC_ prefix for client secret (anti-abuse, not full auth); guard skipped when env var unset for dev safety; Vercel env vars required for production enforcement
- [01-01] Idempotency key: use useRef alongside useState for sync access in immediate transaction calls (React state async); Date.now() kept as last-resort fallback only
- [01-01] Missioni guards: simplified selectedType !== 'missions' to selectedType truthy check rather than full structural unwrap
- [01-02] DB migrations: plain .sql files in supabase/migrations/ — no Supabase CLI configured; all columns use ADD COLUMN IF NOT EXISTS for idempotency
- [01-02] notification_logs RLS: scoped via profiles subquery matching existing codebase pattern

### Pending Todos

None yet.

### Blockers/Concerns

- Tech debt noto (current_stamps vs stamp_count, 84 `any` cast) è v2 scope — non blocca v1
- BUG-02 RISOLTO: notification_logs table creata in Supabase (01-02 complete)
- BUG-04 RISOLTO: stripe_* columns aggiunte a merchants (01-02 complete)

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 01-stability-02-PLAN.md (SQL migrations: notification_logs + Stripe columns)
Resume file: None
