---
plan: 09-02
phase: 09-business-tools
status: complete
completed_at: 2026-03-03
---

# Summary: 09-02 Google Reviews Feature

## What Was Built

Google Reviews integration across the merchant program forms and customer card page:

1. **programs/new form** — Added `google_reviews_url` state variable and URL input field in step 2 links section (after websiteUrl, before walletMessage). Value is included in Supabase insert as `google_reviews_url: googleReviewsUrl || null`.

2. **programs/edit form** — Added `google_reviews_url` state, initialized from `programData.google_reviews_url` in `loadProgram()`. Same URL input field added in editable links section. Value included in Supabase update.

3. **Customer card page `/c/[token]`** — Added conditional review banner that appears when `card.status === 'reward_ready' || card.status === 'redeemed'` AND `program.google_reviews_url` is set. Banner uses Star Lucide icon, no emoji, design system button style (`#111111`). Banner is additive — appears above the QR code section.

## Deviations

- Used `card.status === 'redeemed'` instead of `'completed'` — the actual Card TypeScript type defines statuses as `'active' | 'reward_ready' | 'redeemed' | 'expired'` (no 'completed' value). The plan's interface comment mentioned `'completed'` but the type file uses `'redeemed'` for this state.

## Key Files

### Modified
- `app/dashboard/programs/new/page.tsx` — googleReviewsUrl state + form field + Supabase insert
- `app/dashboard/programs/[id]/edit/page.tsx` — googleReviewsUrl state + loadProgram init + form field + Supabase update
- `app/c/[token]/page.tsx` — Star import + conditional review banner

## Self-Check: PASSED

- [x] google_reviews_url field in programs/new step 2 links section
- [x] google_reviews_url field in programs/edit editable links section (NOT locked section)
- [x] Value included in Supabase insert/update calls
- [x] Review banner gated on (reward_ready || redeemed) AND google_reviews_url truthy
- [x] Star Lucide icon used, no emoji
- [x] `npx tsc --noEmit` passes
