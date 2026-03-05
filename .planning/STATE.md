---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: — Redesign Completo
status: ready_to_plan
stopped_at: Completed 16-dashboard-alert-02-PLAN.md
last_updated: "2026-03-04T15:53:28.839Z"
last_activity: 2026-03-04 — Roadmap v3.0 OCIO creato (fasi 13-16, 18 requisiti mappati)
progress:
  total_phases: 16
  completed_phases: 16
  total_plans: 36
  completed_plans: 36
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
Last activity: 2026-03-05 - Completed quick task 3: OCIO dashboard intelligence reale (global period, ratio widgets, comparison, search, drill-down)

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
| Phase 13-ocio-foundation P01 | 15 | 3 tasks | 4 files |
| Phase 13-ocio-foundation P02 | 2 | 2 tasks | 2 files |
| Phase 13-ocio-foundation P03 | 2 | 2 tasks | 3 files |
| Phase 14-scraping-pipeline P01 | 4 | 2 tasks | 2 files |
| Phase 14-scraping-pipeline P02 | 2 | 1 tasks | 1 files |
| Phase 15-ai-intelligence P01 | 1 | 2 tasks | 2 files |
| Phase 16-dashboard-alert P01 | 2 | 2 tasks | 3 files |
| Phase 16-dashboard-alert P02 | 2 | 2 tasks | 1 files |

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
- [Phase 13-ocio-foundation]: google_access_token/refresh_token omitted from OcioConfig type — Google OAuth deferred post-v3.0
- [Phase 13-ocio-foundation]: reply_tone typed as union literal 'professional'|'warm'|'formal'; AI fields nullable for not-yet-analyzed state
- [Phase 13-ocio-foundation]: loadData silently handles 403 (non-business plan) — isBusiness gate in render handles the UI branch
- [Phase 13-ocio-foundation]: OCIO settings API: PATCH sends only module_reviews/module_alerts — stub modules not sent to prevent accidental server state
- [Phase 13-ocio-foundation]: Sezione OCIO sidebar condizionale su isBusiness puro — non richiede WhatsApp connesso (diverso da showWaExtras)
- [Phase 13-ocio-foundation]: stub ocio/page.tsx deliberatamente minimale — Phase 16 sostituira con dashboard recensioni completa
- [Phase 14-scraping-pipeline]: Apify waitSecs:120 (not waitForFinishSecs) — apify-client v2 ActorCallOptions naming
- [Phase 14-scraping-pipeline]: Trigger.dev schedules.create requires deduplicationKey — using ocio-{merchantId} for idempotent per-merchant schedules
- [Phase 14-scraping-pipeline]: Schedule call placed after setSaved(true) — user sees success feedback regardless of Trigger.dev availability
- [Phase 15-ai-intelligence]: JSON parse errors (SyntaxError) caught per-review and skipped; system errors thrown for Trigger.dev retry
- [Phase 15-ai-intelligence]: tasks.trigger() in separate try/catch after successCount++ — trigger failure never rolls back scraper success
- [Phase 16-dashboard-alert]: alertConfig e merchantData fetchati prima del for loop (non per-recensione) per minimizzare query DB
- [Phase 16-dashboard-alert]: Alert WhatsApp in try/catch separato in Trigger.dev — fallimento SendApp loggato ma non propaga eccezione
- [Phase 16-dashboard-alert]: EmptyState component takes LucideIcon type (not ReactNode) — pass Eye directly, not JSX element
- [Phase 16-dashboard-alert]: OCIO dashboard: filterPeriod defaults to 30d for most actionable initial view; chart only renders when count > 0

### Pending Todos

- SQL migrations ocio_reviews table + google_maps_url + ocio_alert_enabled su merchants: documentare in MANUAL-ACTIONS.md
- Configurare env vars Vercel: APIFY_TOKEN, TRIGGER_SECRET_KEY, TRIGGER_PROJECT_ID

### Blockers/Concerns

- Nessun blocker noto al momento

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Fix ocio dashboard pagination, AI analyzer batching, and analyzing screen | 2026-03-05 | 016bb45 | [1-fix-ocio-dashboard-pagination-ai-analyze](./quick/1-fix-ocio-dashboard-pagination-ai-analyze/) |
| 2 | OCIO dashboard intelligence panel, chart redesign, review tier selector in settings | 2026-03-05 | cdecde3 | [2-ocio-dashboard-redesign-with-intelligenc](./quick/2-ocio-dashboard-redesign-with-intelligenc/) |
| 3 | OCIO dashboard intelligence reale: global period filter, ratio widgets, comparison, search, drill-down | 2026-03-05 | 6aa8da0 | [3-ocio-dashboard-intelligence-reale-con-co](./quick/3-ocio-dashboard-intelligence-reale-con-co/) |

## Session Continuity

Last session: 2026-03-04T15:50:17.902Z
Stopped at: Completed 16-dashboard-alert-02-PLAN.md
Resume file: None
