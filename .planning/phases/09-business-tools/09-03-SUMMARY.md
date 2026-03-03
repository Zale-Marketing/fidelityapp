---
plan: 09-03
phase: 09-business-tools
status: complete
completed_at: 2026-03-03
---

# Summary: 09-03 Upgrade Page + Feature Gating

## What Was Built

Pricing comparison page and plan-based feature gating for FREE merchants:

1. **`/dashboard/upgrade` page** — 3-column plan comparison showing FREE/PRO/BUSINESS at EUR 0/39/99. Features include Check icons for included features, Lock icons for locked features. PRO card has bold border and "Piu popolare" badge. `usePlan()` hook detects current plan and shows "Piano attuale" indicator. CTA buttons link to `/dashboard/billing`. No emoji anywhere.

2. **programs/new plan gating** — Changed limit from `count >= 5` to `count >= 1` for FREE merchants (lowercase normalized with `.toLowerCase()`). Added `isFree` state. Program type cards for non-stamps types now show Lock icon overlay and are non-clickable when `isFree`. Replaced inline planBlocked div (had emoji 🔒) with `<UpgradePrompt feature="Programmi aggiuntivi" requiredPlan="PRO" />`.

3. **Notifications page** — Added `usePlan` hook and `UpgradePrompt` import. FREE merchants see `<UpgradePrompt feature="Notifiche Push" requiredPlan="PRO" />` in place of the send form + info section. History/log section remains visible to all plans.

## Key Files

### Created
- `app/dashboard/upgrade/page.tsx` — 3-tier pricing comparison page

### Modified
- `app/dashboard/programs/new/page.tsx` — plan limit (1 not 5), type locking, UpgradePrompt
- `app/dashboard/notifications/page.tsx` — usePlan gate + UpgradePrompt for send form

## Self-Check: PASSED

- [x] /dashboard/upgrade exists with PLANS constant (EUR 0 / EUR 39 / EUR 99)
- [x] programs/new threshold changed to count >= 1 in source
- [x] Non-stamps types visually locked for FREE merchants (Lock icon, cursor-not-allowed)
- [x] planBlocked renders UpgradePrompt (not inline emoji block)
- [x] notifications page imports and conditionally renders UpgradePrompt for isFree
- [x] History section NOT gated
- [x] `npx tsc --noEmit` passes
- [x] No emoji in any new/modified file
