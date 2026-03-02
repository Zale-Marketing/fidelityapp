# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.
**Current focus:** Phase 1 — Stability

## Current Position

Phase: 1 of 5 (Stability)
Plan: 0 of 2 in current phase
Status: Ready to plan
Last activity: 2026-03-02 — Roadmap created, 30 v1 requirements mapped to 5 phases

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stripe non si attiva fino a feedback da primo merchant reale — colonne DB necessarie (BUG-04) ma billing non prioritario
- Tipo "Missioni" disabilitare subito — selezionabile ma non implementato, causa crash wallet API (BUG-03)
- NON toccare lib/google-wallet.ts — funziona, critico

### Pending Todos

None yet.

### Blockers/Concerns

- BUG-04: Migration SQL Stripe richiede accesso diretto a Supabase Dashboard (non automatizzabile via codice)
- BUG-02: Tabella notification_logs da creare manualmente in Supabase se non si usa migration file
- Tech debt noto (current_stamps vs stamp_count, 84 `any` cast) è v2 scope — non blocca v1

## Session Continuity

Last session: 2026-03-02
Stopped at: Roadmap created — Phase 1 ready to plan
Resume file: None
