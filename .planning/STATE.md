---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: OCIO
status: defining_requirements
last_updated: "2026-03-04T00:00:00.000Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-04)

**Core value:** Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.
**Current focus:** Milestone v3.0 OCIO — Defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-04 — Milestone v3.0 OCIO started

## Accumulated Context

### Decisions

- NON toccare lib/google-wallet.ts — funziona, critico (additive changes only — optional params OK)
- Google OAuth differito: Google Maps Reviews Reply API quota 0 → reply è manuale, OAuth non necessario per v3.0
- Apify actor: compass/google-maps-reviews-scraper per scraping recensioni Google Maps
- Trigger.dev v3 per scheduling OCIO jobs (project ID: proj_zvyvldbkgijrsvkohrfs)
- Moduli 3–6 (Social Listening, Competitor Radar, Price Intelligence, Report mensile) = UI stubs "Prossimamente"
- Feature gating: modulo OCIO solo piano BUSINESS
- Reply automatici NON possibili (quota Google = 0) — flusso: AI genera risposta → merchant copia da dashboard
- SendApp già in FidelityApp — riuso per alert WhatsApp recensioni negative
- Tutte le azioni manuali Supabase/Vercel documentate in MANUAL-ACTIONS.md

### Pending Todos

- SQL migrations per tabelle OCIO: documentare in MANUAL-ACTIONS.md
- Configurare env vars Vercel: APIFY_TOKEN, TRIGGER_SECRET_KEY, TRIGGER_PROJECT_ID (già ottenute)
- ANTHROPIC_API_KEY per AI analysis recensioni (già in FidelityApp per chatbot AI)

### Blockers/Concerns

- Nessun blocker noto al momento
