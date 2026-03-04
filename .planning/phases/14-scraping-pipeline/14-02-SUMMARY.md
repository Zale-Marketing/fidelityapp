---
phase: 14-scraping-pipeline
plan: "02"
subsystem: ocio-settings
tags: [trigger.dev, schedule-lifecycle, settings-page, fire-and-forget]
dependency_graph:
  requires:
    - "14-01 (app/api/ocio/schedule/route.ts must exist)"
  provides:
    - "app/dashboard/ocio/settings/page.tsx — saveConfig calls POST /api/ocio/schedule after PATCH /api/ocio/config"
  affects:
    - "Trigger.dev schedule lifecycle — create on module_reviews=true, cancel on module_reviews=false"
tech_stack:
  added: []
  patterns:
    - "Fire-and-forget schedule management: try/catch silent failure after setSaved(true)"
    - "Non-blocking UX: schedule call does not gate 'Salvato!' feedback"
key_files:
  created: []
  modified:
    - app/dashboard/ocio/settings/page.tsx
decisions:
  - "Schedule call placed after setSaved(true) — user sees success feedback regardless of Trigger.dev availability"
  - "Silent catch — Trigger.dev env vars may not be configured in dev; schedule failure is non-critical"
  - "await used inside try/catch but after setSaved — does not delay 'Salvato!' appearance (setTimeout already fired)"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-04"
  tasks_completed: 1
  files_created: 0
  files_modified: 1
---

# Phase 14 Plan 02: Settings Page Schedule Lifecycle Summary

**One-liner:** saveConfig in OcioSettingsPage now calls POST /api/ocio/schedule fire-and-forget after every successful PATCH /api/ocio/config, using action 'create' when module_reviews is enabled and 'cancel' when disabled.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Aggiornare saveConfig con chiamata POST /api/ocio/schedule | 13413ea | app/dashboard/ocio/settings/page.tsx |

## Artifacts

### app/dashboard/ocio/settings/page.tsx (modified)

The `saveConfig` function flow after modification:

1. `setError(null)`, `setSaving(true)`
2. `PATCH /api/ocio/config` with `google_maps_url`, `module_reviews`, `module_alerts`
3. If `!res.ok`: `setError(...)`, `setSaving(false)`, `return`
4. `setSaved(true)`, `setTimeout(() => setSaved(false), 2000)`
5. `POST /api/ocio/schedule` with `{ action: 'create' | 'cancel' }` — fire-and-forget, silent catch
6. `setSaving(false)`

Key implementation details:
- `scheduleAction` computed from `config.module_reviews`: `true` → `'create'`, `false` → `'cancel'`
- Bearer token uses existing `accessToken` state variable (set in `loadData()` from `session.access_token`)
- `try/catch` wraps the entire schedule fetch — errors are silently swallowed
- No new imports, no JSX changes, no other handlers modified

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit`: zero errors
- `npm run build`: completed successfully, `/dashboard/ocio/settings` compiled as static route, `/api/ocio/schedule` compiled as dynamic route
- saveConfig flow matches specified sequence exactly
- Fire-and-forget pattern confirmed: `setSaved(true)` fires before schedule call, `setSaving(false)` after

## Self-Check: PASSED

- [x] app/dashboard/ocio/settings/page.tsx exists and contains schedule call
- [x] Commit 13413ea exists in git log
- [x] Zero TypeScript errors
- [x] Build passes
- [x] schedule call uses accessToken Bearer
- [x] Silent try/catch confirmed
