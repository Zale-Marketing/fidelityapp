---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-02T11:48:34.860Z"
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-03-02T11:43:25Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 5
  completed_plans: 6
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.
**Current focus:** Phase 2 — Merchant UX

## Current Position

Phase: 3 of 5 (Customer Pages)
Plan: 2 of 2 in current phase
Status: In Progress
Last activity: 2026-03-02 — Plan 03-01 complete (Join page BenefitPreview + auto-redirect)

Progress: [#######░░░] 70%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 2 min
- Total execution time: 16 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-stability | 3 | 9 min | 3 min |
| 02-merchant-ux | 3 | 5 min | 2 min |
| 03-customer-pages | 1 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 03-01 (2 min), 02-01 (3 min), 02-02 (1 min), 01-02 (5 min), 01-03 (2 min)
- Trend: Consistent

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
- [02-01] Mobile design tokens: rounded-2xl cards, rounded-xl buttons/inputs, px-4 py-6 main containers — applied uniformly across all four dashboard pages
- [02-01] Modal internal inputs kept rounded-lg (modal UX explicitly out of scope); modal footer buttons upgraded to rounded-xl
- [02-02] Auto-reset calls startScanner() after resetScanner() so camera restarts immediately for next customer
- [02-02] Subscription error keeps white card UI (not full-screen red) — cashier must interact with activation options
- [02-02] SVG icons used for check/X marks in full-screen overlays to avoid emoji Unicode rendering issues
- [03-01] Auto-redirect uses newCard.scan_token local variable (not cardLink state) to avoid React async state staleness
- [03-01] Rewards query uses separate .from('rewards').select() for stamps programs — nested query prohibited per CLAUDE.md
- [03-01] benefitText() function deleted; header badge now shows TYPE_LABELS (Bollini/Punti/Cashback etc.) for brevity

### Pending Todos

None yet.

### Blockers/Concerns

- Tech debt noto (current_stamps vs stamp_count, 84 `any` cast) è v2 scope — non blocca v1
- BUG-02 RISOLTO: notification_logs table creata in Supabase (01-02 complete)
- BUG-04 RISOLTO: stripe_* columns aggiunte a merchants (01-02 complete)

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 03-01-PLAN.md (Join page BenefitPreview + auto-redirect)
Resume file: None
