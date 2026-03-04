---
phase: 16-dashboard-alert
plan: 01
subsystem: api
tags: [ocio, whatsapp, sendapp, trigger.dev, next.js, supabase]

# Dependency graph
requires:
  - phase: 15-ai-intelligence
    provides: ocio-ai-analyzer Trigger.dev task with Anthropic analysis
  - phase: 13-ocio-foundation
    provides: ocio_config table, OcioConfig type, OCIO settings page shell
provides:
  - PATCH /api/ocio/reviews/[id] — update reply_status with ownership guard
  - WhatsApp alert logic in ocio-ai-analyzer for negative/urgent reviews
  - alert_whatsapp_number field in OCIO settings page
affects: [16-dashboard-alert-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PATCH route with ownership verification: fetch review merchant_id, compare to authenticated merchant"
    - "Non-critical side-effect in Trigger.dev loop: separate try/catch that logs but never throws"
    - "Pre-loop DB fetch optimization: alertConfig and merchantData fetched once before for loop"

key-files:
  created:
    - app/api/ocio/reviews/[id]/route.ts
  modified:
    - trigger/ocio-ai-analyzer.ts
    - app/dashboard/ocio/settings/page.tsx

key-decisions:
  - "alertConfig and merchantData fetched once before the for loop (not per-review) to minimize DB round trips"
  - "WhatsApp alert wrapped in separate try/catch inside else{processed++} block — alert failure never increments errors counter or causes retry"
  - "alert_whatsapp_number input shown conditionally only when module_alerts toggle is true"

patterns-established:
  - "Pattern: Trigger.dev non-critical side-effects use inner try/catch with logger.error, never re-throw"
  - "Pattern: OCIO API routes reuse getAuthenticatedMerchant pattern from app/api/ocio/config/route.ts"

requirements-completed: [ALERT-01, ALERT-02, ALERT-03]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 16 Plan 01: Dashboard Alert Summary

**PATCH /api/ocio/reviews/[id] per aggiornare reply_status, alert WhatsApp automatici post-analisi AI per recensioni negative/urgenti, e campo alert_whatsapp_number nella settings OCIO**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-04T15:43:02Z
- **Completed:** 2026-03-04T15:45:10Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- PATCH endpoint con auth Bearer + piano BUSINESS guard + verifica ownership recensione
- Logica alert WhatsApp in ocio-ai-analyzer: invia messaggio se sentiment=negative o urgency=high/critical, solo se alert non già inviato e SendApp connesso
- Campo alert_whatsapp_number nella settings OCIO: si carica, si salva via PATCH /api/ocio/config, appare solo se module_alerts attivo

## Task Commits

Each task was committed atomically:

1. **Task 1: PATCH /api/ocio/reviews/[id]** - `82a9528` (feat)
2. **Task 2: Alert WhatsApp + campo settings** - `31734f4` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `app/api/ocio/reviews/[id]/route.ts` - PATCH endpoint: aggiorna reply_status (e replied_at se 'replied'), auth+ownership guard, piano BUSINESS
- `trigger/ocio-ai-analyzer.ts` - Import sendTextMessage/formatPhoneIT, SELECT estesa, fetch alertConfig/merchantData pre-loop, logica alert WhatsApp in try/catch separato
- `app/dashboard/ocio/settings/page.tsx` - Stato alertPhone, caricamento da API, PATCH con alert_whatsapp_number, input tel condizionale su module_alerts

## Decisions Made
- alertConfig e merchantData vengono recuperati una sola volta prima del for loop anziche per ogni recensione — riduce le query DB significativamente per batch di recensioni grandi
- L'alert WhatsApp vive in un try/catch separato dentro `else { processed++ }` — un fallimento SendApp viene loggato ma non incrementa `errors` ne causa retry del task Trigger.dev
- Il campo alert_whatsapp_number e' mostrato nell'UI solo quando module_alerts e' true — reduce confusion per merchant con alerts disabilitati

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. alert_whatsapp_number usa le credenziali SendApp gia configurate nel merchant.

## Next Phase Readiness
- PATCH /api/ocio/reviews/[id] pronto per essere consumato dal modal dashboard (Plan 02)
- Alert WhatsApp attivo — si attiva automaticamente al prossimo run di ocio-ai-analyzer
- Campo alert_whatsapp_number nella settings: il merchant puo configurarlo subito

---
*Phase: 16-dashboard-alert*
*Completed: 2026-03-04*

## Self-Check: PASSED

- FOUND: app/api/ocio/reviews/[id]/route.ts
- FOUND commit: 82a9528 (Task 1)
- FOUND commit: 31734f4 (Task 2)
- TypeScript: no errors (`npx tsc --noEmit` clean)
