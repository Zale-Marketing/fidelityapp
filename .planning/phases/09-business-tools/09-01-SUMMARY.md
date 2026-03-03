---
plan: 09-01
phase: 09-business-tools
status: complete
completed_at: 2026-03-03
---

# Summary: 09-01 Foundation Layer

## What Was Built

Foundation infrastructure for Phase 9 Business Tools:

1. **SQL Migrations documented** in `.planning/MANUAL-ACTIONS.md` — Phase 9 section added with two SQL blocks:
   - `google_reviews_url` column on programs table (REVIEW-01)
   - Verify/add `plan` column on merchants table (PLAN-01) with constraint check for 'business' value

2. **`usePlan()` hook** created at `lib/hooks/usePlan.ts`:
   - Reads merchant plan from Supabase via profiles → merchants chain
   - Returns `{ plan, loading, isFree, isPro, isBusiness }`
   - Normalizes plan value with `.toLowerCase()` for case-insensitive DB values
   - Defaults to 'free' while loading to prevent flickering open gates
   - `isPro` includes 'business' plan (business inherits all pro features)

3. **`UpgradePrompt` component** created at `components/ui/UpgradePrompt.tsx`:
   - Props: `feature` (string), `requiredPlan` ('PRO' | 'BUSINESS', default 'PRO')
   - Renders Lock icon (Lucide), feature name, plan requirement text, CTA link to /dashboard/upgrade
   - Design system compliant: #FEF3C7 icon bg, #111111 CTA button, no emoji

## Key Files

### Created
- `lib/hooks/usePlan.ts` — exports `usePlan` function and `Plan` type
- `components/ui/UpgradePrompt.tsx` — exports default `UpgradePrompt` component
- `.planning/MANUAL-ACTIONS.md` — updated with Phase 9 SQL section

## Self-Check: PASSED

- [x] usePlan() hook exports `usePlan` and `Plan` type
- [x] UpgradePrompt component links to /dashboard/upgrade
- [x] MANUAL-ACTIONS.md has Phase 9 section with google_reviews_url migration and merchants plan verification SQL
- [x] `npx tsc --noEmit` passes with no errors
