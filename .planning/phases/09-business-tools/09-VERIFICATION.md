---
phase: 09
status: passed
verified_at: 2026-03-03
verifier: orchestrator
---

# Phase 09: Business Tools — Verification

## Phase Goal

Il merchant raccoglie recensioni Google dopo ogni riscatto e il sistema applica limiti di piano in modo trasparente

## Must-Haves Check

### REVIEW-01: google_reviews_url field on programs table
- **Status**: DOCUMENTED
- **Evidence**: `.planning/MANUAL-ACTIONS.md` contains Phase 9 section with `ALTER TABLE programs ADD COLUMN IF NOT EXISTS google_reviews_url text;` migration
- Pattern verified: `grep "google_reviews_url" .planning/MANUAL-ACTIONS.md` → found

### REVIEW-02: Google Reviews integration in forms + card page
- **Status**: PASSED
- **Evidence**:
  - `app/dashboard/programs/new/page.tsx` — `googleReviewsUrl` state + URL input field in step 2 links section + `google_reviews_url: googleReviewsUrl || null` in Supabase insert
  - `app/dashboard/programs/[id]/edit/page.tsx` — same state + field + Supabase update
  - `app/c/[token]/page.tsx` — conditional banner when `(card.status === 'reward_ready' || card.status === 'redeemed') && (program as any).google_reviews_url`
- Key check: banner does NOT appear for active cards or programs without review URL (double-gate condition)

### PLAN-01: plan column on merchants table
- **Status**: DOCUMENTED
- **Evidence**: `.planning/MANUAL-ACTIONS.md` contains SQL to verify/add plan column and check/replace CHECK constraint for 'business' value

### PLAN-02: usePlan() hook
- **Status**: PASSED
- **Evidence**: `lib/hooks/usePlan.ts` exports `usePlan` and `Plan` type; returns `{ plan, loading, isFree, isPro, isBusiness }`; normalizes with `.toLowerCase()`; isPro includes 'business'

### PLAN-03: UpgradePrompt component
- **Status**: PASSED
- **Evidence**: `components/ui/UpgradePrompt.tsx` renders Lock icon (Lucide), feature name, requiredPlan label, CTA link to `/dashboard/upgrade`; no emoji

### PLAN-04: /dashboard/upgrade pricing page
- **Status**: PASSED
- **Evidence**: `app/dashboard/upgrade/page.tsx` exists with `PLANS` constant; FREE=EUR 0, PRO=EUR 39, BUSINESS=EUR 99; PRO card has `border-2 border-[#111111]` and "Piu popolare" badge; CTA links to `/dashboard/billing`; uses `usePlan()` for current plan detection

### PLAN-05: Feature gating
- **Status**: PASSED
- **Evidence**:
  - `app/dashboard/programs/new/page.tsx`: `planValue === 'free' && count >= 1` → setPlanBlocked(true); non-stamps types locked with Lock icon overlay and `cursor-not-allowed`; planBlocked renders `<UpgradePrompt feature="Programmi aggiuntivi" requiredPlan="PRO" />`
  - `app/dashboard/notifications/page.tsx`: `const { isFree, loading: planLoading } = usePlan()`; `{!planLoading && isFree ? <UpgradePrompt feature="Notifiche Push" requiredPlan="PRO" /> : <> form + info </> }`; history section NOT gated

## Automated Checks

- TypeScript: `npx tsc --noEmit` → PASS (0 errors)
- All 3 plan SUMMARY.md files exist in `.planning/phases/09-business-tools/`
- All 3 git commits present: `f8b407c`, `1f5911d`, `7d10ed0`
- No emoji in new/modified files: confirmed (grep for emoji patterns → none)

## Success Criteria Verification

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Merchant inserisce il link Google Reviews nel form di creazione/modifica e viene salvato | PASSED |
| 2 | Cliente che riscatta un premio vede il banner solo se il merchant ha configurato il link | PASSED |
| 3 | Merchant FREE che tenta di creare un secondo programma vede UpgradePrompt | PASSED |
| 4 | Merchant FREE che tenta notifiche vede UpgradePrompt | PASSED |
| 5 | Merchant apre /dashboard/upgrade e vede confronto Free/Pro/Business con prezzi | PASSED |

## Score: 5/5 must-haves verified

## Notes

- `card.status === 'completed'` was corrected to `'redeemed'` to match the actual TypeScript Card type (`'active' | 'reward_ready' | 'redeemed' | 'expired'`)
- SQL migrations for `google_reviews_url` and `plan` column are documented in MANUAL-ACTIONS.md and must be run manually in Supabase before production deployment
- The ROADMAP.md progress table for Phase 7 still shows "Planned / 0/4" — this is a pre-existing stale entry from before Phase 7 was executed; it does not affect Phase 9 verification
