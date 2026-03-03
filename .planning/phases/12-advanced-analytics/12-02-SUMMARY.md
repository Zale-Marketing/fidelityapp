---
plan: 12-02
phase: 12-advanced-analytics
status: complete
completed_at: 2026-03-03
commit: 00cbfd3
---

# Summary: Plan 12-02 — CSV Export with Plan Gating

## What Was Built

Added plan-gated "Esporta CSV" button to `/dashboard/cards`. PRO/BUSINESS merchants can download all card data as a CSV file browser-side. FREE merchants see UpgradePrompt.

## Tasks Completed

| Task | Status | Notes |
|------|--------|-------|
| Task 1: Add CSV export to cards page with plan gating | complete | All requirements implemented |

## Key Files

### Created
- (none — existing file modified)

### Modified
- `app/dashboard/cards/page.tsx` — CSV export + plan gating + balance columns in SELECT

## Requirements Addressed

- CSV2-01: PRO/BUSINESS merchant sees "Esporta CSV" button; clicking downloads CSV with 7 columns (Nome, Email, Telefono, Programma, Saldo, Ultima visita, Iscrizione)
- CSV2-02: FREE merchant sees UpgradePrompt block below metric cards + muted header button navigating to /dashboard/upgrade

## Technical Decisions

- CSV uses `\uFEFF` UTF-8 BOM prefix — mandatory for Italian accented characters to display correctly in Windows Excel
- UpgradePrompt shown as full-width block (below metric cards, above segment tabs) for maximum visibility — plan says "prefer it"
- Header also shows muted button for FREE merchants pointing to /dashboard/upgrade (dual approach for discoverability)
- Balance column uses null-coalescing chain: `stamp_count ?? current_stamps ?? points_balance ?? cashback_balance ?? total_spent ?? 0` to pick the most relevant value regardless of program type
- Supabase SELECT extended to 12 columns from 7 — balance columns added for all program types

## Self-Check: PASSED

- usePlan, UpgradePrompt, exportCSV, createObjectURL all present: confirmed
- Balance columns in SELECT: confirmed
- UTF-8 BOM (\uFEFF): confirmed
- TypeScript: no errors (0 errors project-wide)
