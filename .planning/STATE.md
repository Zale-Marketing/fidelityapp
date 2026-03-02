---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: redesign-completo
status: in_progress
last_updated: "2026-03-02T16:00:00.000Z"
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.
**Current focus:** Phase 6 — Critical Bug Fixes v2.0

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-02 — Milestone v2.0 started

## Accumulated Context

### Decisions

- NON toccare lib/google-wallet.ts — funziona, critico
- Stripe non attivo fino a feedback primo merchant reale
- Piano FREE: max 1 programma solo bollini, max 50 carte, no push, branding Zale obbligatorio
- Piano PRO (€39/mese): tutto illimitato + push + WhatsApp + segmentazione + birthday + reviews + CSV
- Piano BUSINESS (€99/mese): tutto PRO + webhook + multi-sede + API pubblica + white-label
- Maytapi come provider WhatsApp (rate limit 200 msg/giorno per evitare ban)
- recharts per grafici analytics (installare se non presente)
- HMAC-SHA256 per firma payload webhook
- Tutte le azioni manuali Supabase/Vercel documentate in MANUAL-ACTIONS.md

### Pending Todos

None yet.

### Blockers/Concerns

- Maytapi API keys: MAYTAPI_PRODUCT_ID + MAYTAPI_API_TOKEN da configurare in Vercel
- Stripe pricing ids da creare (STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_YEARLY, STRIPE_PRICE_BUSINESS_*)
- SQL migrations multiple: birth_date su card_holders, google_reviews_url su programs, maytapi_* su merchants, webhook_endpoints table, plan su merchants
- Vercel cron richiede piano a pagamento (Pro) — documentare in MANUAL-ACTIONS.md
