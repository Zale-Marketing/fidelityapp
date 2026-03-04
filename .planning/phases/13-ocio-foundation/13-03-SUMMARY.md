---
phase: 13-ocio-foundation
plan: "03"
subsystem: navigation
tags: [sidebar, settings, ocio, gating, business-plan, stub]

# Dependency graph
requires:
  - "13-01 (OcioConfig types, DB tables)"
  - "13-02 (ocio/settings page exists)"
provides:
  - "Sidebar.tsx con voce OCIO condizionale (isBusiness state + Eye icon + /dashboard/ocio link)"
  - "settings/page.tsx con link card OCIO nella sezione Integrazioni"
  - "app/dashboard/ocio/page.tsx stub con gating BUSINESS e UpgradePrompt"
affects:
  - phase-16 (sostituira stub ocio/page.tsx con dashboard completa)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isBusiness state in Sidebar segue stesso pattern di isPro — derivato da merchant.plan in loadMerchantStatus()"
    - "Sezione OCIO sidebar usa stesso pattern map/Link di sezione WhatsApp"
    - "Stub page usa usePlan().isBusiness per gating — pattern coerente con resto della dashboard"

key-files:
  created:
    - app/dashboard/ocio/page.tsx
  modified:
    - components/dashboard/Sidebar.tsx (Eye importato, isBusiness state, sezione OCIO condizionale)
    - app/dashboard/settings/page.tsx (Eye importato, link card OCIO nella sezione Integrazioni)

key-decisions:
  - "Sezione OCIO sidebar condizionale su isBusiness puro (non richiede WhatsApp connesso — pattern diverso da showWaExtras)"
  - "Link OCIO in settings/page.tsx visibile a tutti i piani — gating avviene nella pagina di destinazione"
  - "app/dashboard/ocio/page.tsx e stub deliberato — Phase 16 sostituira con dashboard recensioni completa"

requirements-completed:
  - SET-03

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 13 Plan 03: OCIO Navigation Integration Summary

**Sidebar con voce OCIO condizionale (isBusiness), link OCIO in settings, e stub /dashboard/ocio con gating BUSINESS**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-04T10:56:06Z
- **Completed:** 2026-03-04T10:57:48Z
- **Tasks:** 2
- **Files modified:** 2
- **Files created:** 1

## Accomplishments

- Sidebar.tsx aggiornata: Eye importato da lucide-react, isBusiness state aggiunto in loadMerchantStatus(), sezione OCIO condizionale con label "OCIO" e link /dashboard/ocio visibile solo per plan='business'
- settings/page.tsx aggiornata: Eye importato, terzo link card nella sezione Integrazioni verso /dashboard/ocio/settings con icona purple e descrizione piano BUSINESS
- app/dashboard/ocio/page.tsx creato come stub: loading spinner, UpgradePrompt BUSINESS per free/pro, placeholder con link a settings per merchant business
- Build npm run build senza errori TypeScript — /dashboard/ocio e /dashboard/ocio/settings compaiono nel routing output

## Task Commits

1. **Task 1: Aggiungere voce OCIO a Sidebar.tsx** - `e010d80` (feat)
2. **Task 2: Aggiungere link OCIO a settings + creare stub /dashboard/ocio** - `7c5cded` (feat)

## Files Created/Modified

- `components/dashboard/Sidebar.tsx` - Eye importato, isBusiness state, setIsBusiness in loadMerchantStatus(), sezione OCIO condizionale dopo sezione WhatsApp
- `app/dashboard/settings/page.tsx` - Eye importato, link card OCIO aggiunto nella sezione Integrazioni (dopo link Webhook)
- `app/dashboard/ocio/page.tsx` - Stub creato: gating isBusiness, UpgradePrompt per non-business, placeholder per business con link a /dashboard/ocio/settings

## Decisions Made

- La sezione OCIO in sidebar e condizionale su `isBusiness` puro — non richiede WhatsApp connesso (diverso da `showWaExtras = isPro && waConnected`)
- Il link OCIO in settings/page.tsx e visibile a tutti i merchant indipendentemente dal piano — il gating avviene nella pagina di destinazione stessa (pattern coerente con link WhatsApp che e visibile anche a merchant senza WA connesso)
- Lo stub /dashboard/ocio/page.tsx e deliberatamente minimale — Phase 16 lo sostituira interamente con la dashboard recensioni analizzate

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: components/dashboard/Sidebar.tsx
- FOUND: app/dashboard/settings/page.tsx
- FOUND: app/dashboard/ocio/page.tsx
- FOUND: commit e010d80 (Task 1)
- FOUND: commit 7c5cded (Task 2)
- Build: npm run build passed with 0 TypeScript errors

---
*Phase: 13-ocio-foundation*
*Completed: 2026-03-04*
