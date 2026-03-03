---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: — Redesign Completo
status: unknown
last_updated: "2026-03-03T01:33:41.890Z"
progress:
  total_phases: 11
  completed_phases: 11
  total_plans: 26
  completed_plans: 26
---

---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: — Redesign Completo
status: unknown
last_updated: "2026-03-03T00:58:28.470Z"
progress:
  total_phases: 9
  completed_phases: 9
  total_plans: 22
  completed_plans: 22
---

---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: redesign-completo
status: in_progress
last_updated: "2026-03-02T23:31:25Z"
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 2
  completed_plans: 2
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.
**Current focus:** Phase 11 — Webhook Integrations

## Current Position

Phase: 10 — WhatsApp Marketing (complete) → next: Phase 11
Plan: — (all plans complete)
Status: Phase 10 complete — all WA requirements done (WA-01..WA-05)
Last activity: 2026-03-03 — Completed 10-02-PLAN.md (WhatsApp send API + notifications tab)

## Progress Bar

```
v2.0: [ ] Phase 6  [ ] Phase 7  [ ] Phase 8  [ ] Phase 9  [ ] Phase 10  [ ] Phase 11  [ ] Phase 12
       0/7 phases complete
```

## Phase Map (v2.0)

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 6 | Critical Fixes v2 | FIX-01..04 | Complete (2/2 plans done) |
| 7 | Design System v2 | DESIGN-01..11 | Not started |
| 8 | Engagement Automation | SEG-01..03, BDAY-01..04 | Not started |
| 9 | Business Tools | REVIEW-01..02, PLAN-01..05 | Not started |
| 10 | WhatsApp Marketing | WA-01..05 | Complete (2/2 plans done) |
| 11 | Webhook Integrations | WH-01..04 | Not started |
| 12 | Advanced Analytics + CSV Export | ANALYTICS-01..05, CSV2-01..02 | Not started |

## Accumulated Context

### Decisions

- NON toccare lib/google-wallet.ts — funziona, critico (additive changes only — optional params OK)
- Soft delete pattern: .update({ deleted_at: new Date().toISOString() }) + .is('deleted_at', null) filter in all program queries
- Hard delete requires exact name confirmation — prevents accidental deletion, no active-cards block
- Cascade delete order: stamp_transactions -> rewards -> tiers -> cards -> programs (FK constraint order)
- searchParams API auto-decodes percent-encoding — no manual decodeURIComponent needed
- startsWith('#') guard on colorParam prevents malformed values in wallet-image route
- submit-lead API uses SUPABASE_SERVICE_ROLE_KEY server-side to bypass RLS on leads insert
- leads table allows public inserts via RLS policy — no auth required for form submission
- Stripe non attivo fino a feedback primo merchant reale
- Piano FREE: max 1 programma solo bollini, max 50 carte, no push, branding Zale obbligatorio
- Piano PRO (€39/mese): tutto illimitato + push + WhatsApp + segmentazione + birthday + reviews + CSV
- Piano BUSINESS (€99/mese): tutto PRO + webhook + multi-sede + API pubblica + white-label
- Maytapi come provider WhatsApp (rate limit 200 msg/giorno per evitare ban)
- recharts per grafici analytics (installare se non presente)
- HMAC-SHA256 per firma payload webhook
- Tutte le azioni manuali Supabase/Vercel documentate in MANUAL-ACTIONS.md

### Pending Todos

- Phase 6: ALL COMPLETE — FIX-01 (lead capture), FIX-02 (soft delete), FIX-03 (hard delete cascade), FIX-04 (hero image color)
- Phase 8: SQL migration birth_date su card_holders
- Phase 9: SQL migration google_reviews_url su programs; colonna plan su merchants
- Phase 10: SQL migration maytapi_* su merchants; configurare MAYTAPI_PRODUCT_ID + MAYTAPI_API_TOKEN in Vercel
- Phase 11: SQL migration per tabella webhook_endpoints
- All SQL migrations: documentare in MANUAL-ACTIONS.md per esecuzione manuale

### Blockers/Concerns

- Maytapi API keys: MAYTAPI_PRODUCT_ID + MAYTAPI_API_TOKEN da configurare in Vercel (Phase 10)
- Stripe pricing ids da creare (STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_YEARLY, STRIPE_PRICE_BUSINESS_*) (Phase 9)
- SQL migrations multiple: documentare checkpoint manuali per ogni fase che le richiede
- Vercel cron richiede piano a pagamento (Pro) — documentare in MANUAL-ACTIONS.md (Phase 8)

## Session Continuity

Next action: Run `/gsd:plan-phase 11` to generate execution plans for Phase 11: Webhook Integrations

Plan 10-01 complete (2026-03-03): SQL migration docs + /api/whatsapp/connect + /api/whatsapp/status + settings page
Plan 10-02 complete (2026-03-03): /api/whatsapp/send (rate limit + normalization) + WhatsApp tab in notifications
Phase 10 fully complete — all 5 WhatsApp requirements shipped
