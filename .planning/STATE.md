---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: — Redesign Completo
status: ready_to_plan
stopped_at: Phase 13 context gathered
last_updated: "2026-03-04T10:17:17.843Z"
last_activity: 2026-03-04 — Roadmap v3.0 OCIO creato (fasi 13-16, 18 requisiti mappati)
progress:
  total_phases: 16
  completed_phases: 12
  total_plans: 28
  completed_plans: 28
---

---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: OCIO
status: ready_to_plan
last_updated: "2026-03-04T00:00:00.000Z"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-04)

**Core value:** Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.
**Current focus:** Milestone v3.0 OCIO — Phase 13: OCIO Foundation

## Current Position

Phase: 13 of 16 (OCIO Foundation)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-03-04 — Roadmap v3.0 OCIO creato (fasi 13-16, 18 requisiti mappati)

Progress: [░░░░░░░░░░] 0% (milestone v3.0)

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (this milestone)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

*Updated after each plan completion*

## Accumulated Context

### Decisions

- NON toccare lib/google-wallet.ts — funziona, critico (additive changes only)
- Google OAuth differito: Google Maps Reviews Reply API quota 0 — reply manuale, OAuth non necessario per v3.0
- Apify actor: compass/google-maps-reviews-scraper per scraping recensioni Google Maps
- Trigger.dev v3 per scheduling OCIO jobs (project ID: proj_zvyvldbkgijrsvkohrfs)
- Moduli 3-6 (Social Listening, Competitor Radar, Price Intelligence, Report mensile) = UI stubs "Prossimamente"
- Feature gating OCIO: solo piano BUSINESS
- SendApp gia integrato — riuso per alert WhatsApp recensioni negative
- ANTHROPIC_API_KEY gia presente in FidelityApp (chatbot AI) — riuso per analisi OCIO

### Pending Todos

- SQL migrations ocio_reviews table + google_maps_url + ocio_alert_enabled su merchants: documentare in MANUAL-ACTIONS.md
- Configurare env vars Vercel: APIFY_TOKEN, TRIGGER_SECRET_KEY, TRIGGER_PROJECT_ID

### Blockers/Concerns

- Nessun blocker noto al momento

## Session Continuity

Last session: 2026-03-04T10:17:17.837Z
Stopped at: Phase 13 context gathered
Resume file: .planning/phases/13-ocio-foundation/13-CONTEXT.md
