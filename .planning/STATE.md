# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.
**Current focus:** Phase 1 — Stability

## Current Position

Phase: 1 of 5 (Stability)
Plan: 3 of 3 in current phase
Status: In progress
Last activity: 2026-03-02 — Plan 01-01 complete (idempotency fix + Missioni removal)

Progress: [###░░░░░░░] 30%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 3 min
- Total execution time: 6 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-stability | 2 | 6 min | 3 min |

**Recent Trend:**
- Last 5 plans: 01-03 (2 min), 01-01 (4 min)
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

### Pending Todos

None yet.

### Blockers/Concerns

- BUG-04: Migration SQL Stripe richiede accesso diretto a Supabase Dashboard (non automatizzabile via codice)
- BUG-02: Tabella notification_logs da creare manualmente in Supabase se non si usa migration file
- Tech debt noto (current_stamps vs stamp_count, 84 `any` cast) è v2 scope — non blocca v1

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 01-stability-01-PLAN.md (idempotency + Missioni fixes)
Resume file: None
