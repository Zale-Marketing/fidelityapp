---
quick_task: 2
title: OCIO Dashboard Redesign with Intelligence Panel
date: "2026-03-05"
commits:
  - hash: 78a331f
    message: "feat: ocio intelligence panel with critical areas, sentiment trend, urgent reviews"
    files: [app/dashboard/ocio/page.tsx]
  - hash: cdecde3
    message: "feat: ocio review tier selector in settings — zapier style"
    files: [app/dashboard/ocio/settings/page.tsx]
tags: [ocio, dashboard, intelligence, settings, ui]
---

# Quick Task 2: OCIO Dashboard Redesign with Intelligence Panel

**One-liner:** Intelligence Panel with 3 AI widgets (negative themes, sentiment trend, urgent queue) added above review list, chart upgraded to dynamic monthly/quarterly grouping with Score AI line, and a Zapier-style review tier radio selector added to OCIO settings.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Intelligence Panel + chart/filter improvements | 78a331f | app/dashboard/ocio/page.tsx |
| 2 | Review tier selector in OCIO settings | cdecde3 | app/dashboard/ocio/settings/page.tsx |

## Changes Made

### Task 1: app/dashboard/ocio/page.tsx

- **filterPeriod type** extended from `'30' | '90' | 'all'` to `'30' | '90' | '365' | 'all'`
- **intelligenceData useMemo** added after kpis — computes top 5 negative themes, 30d sentiment trend delta, urgent pending reviews
- **chartData useMemo** replaced — now dynamic: groups by month (span <= 36 months) or quarter (span > 36 months); adds `sentimentScore` field per bucket; uses `label` key instead of `month`
- **Intelligence Panel JSX** inserted between KPI row and chart — 3-column grid, conditionally rendered when any review has ai_sentiment or ai_themes:
  - Widget 1 "Aree da migliorare": top 5 negative themes with counts, or skeleton pulses if no analyzed themes yet
  - Widget 2 "Trend ultimo mese": positive/negative % with delta arrows vs prior 30d, or "Dati insufficienti" if fewer than 5 reviews in either period
  - Widget 3 "Urgenti senza risposta": large count number + up to 2 clickable preview buttons that open the detail modal
- **Chart** title changed from "Trend ultimi 6 mesi" to "Trend recensioni"; XAxis dataKey updated to `label`; Score AI dashed purple line added (stroke #6366F1)
- **Filter row** "Ultimi 12 mesi" pill added between "Ultimi 90gg" and "Tutto"
- All existing logic preserved exactly: fetchAllReviews, loadData, auth, KPI computation, modal functions, ReviewCard, StarRow, Pill, full modal JSX

### Task 2: app/dashboard/ocio/settings/page.tsx

- **REVIEW_TIERS constant** added before component — 4 tiers: Starter (200), Growth (500), Professional (1500), Complete (all)
- **reviewTier state** added, default `'professional'`
- **loadData** updated: sets `reviewTier` from `data.review_tier ?? 'professional'`
- **saveConfig** updated: includes `review_tier: reviewTier` in PATCH body
- **Tier selector JSX** added between Google Maps URL card and Moduli card — Zapier-style radio list with:
  - Black left border + gray-50 background for selected row
  - Black filled radio circle with white dot for selected
  - Gray border radio for unselected
  - Green "Incluso" label for Starter, gray price for paid tiers
  - Footer note about new reviews always being analyzed

## Deviations from Plan

None — plan executed exactly as written. Both tasks implemented additively without modifying any protected logic.

## Self-Check

- [x] app/dashboard/ocio/page.tsx exists and was modified
- [x] app/dashboard/ocio/settings/page.tsx exists and was modified
- [x] Commit 78a331f exists
- [x] Commit cdecde3 exists
- [x] TypeScript compiles clean (npx tsc --noEmit: no output)
