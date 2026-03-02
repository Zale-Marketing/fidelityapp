---
phase: 03-customer-pages
verified: 2026-03-02T13:30:00Z
status: human_needed
score: 7/7 must-haves verified
re_verification: false
human_verification:
  - test: "Open /join/[programId] on a mobile device and verify the colored header uses the merchant's primary_color, with the 'Come funziona' section visible before any form fields"
    expected: "Colored header, BenefitPreview section listing rewards/rate/price before the signup form"
    why_human: "Visual layout and color rendering cannot be verified programmatically"
  - test: "Open /c/[token] on a real iPhone (Safari, mobile viewport) and confirm the 'Aggiungi a Google Wallet' black button is visible WITHOUT scrolling"
    expected: "Black wallet button appears in the first visible screen real estate, no scroll required"
    why_human: "Above-fold check depends on actual device viewport and content rendering"
  - test: "Complete enrollment on /join — fill name, submit — then observe the redirect"
    expected: "Success card appears with 'Reindirizzamento automatico in pochi secondi...' text, then browser navigates to /c/[token] within 2-3 seconds"
    why_human: "Timing and navigation behavior require real interaction"
  - test: "Open /c/[token] for a cashback card that has reached the minimum redeem threshold"
    expected: "Green 'Puoi riscattare!' banner appears prominently; progress message shows 'Pronto per riscattare!'"
    why_human: "Requires a real cashback card with balance >= min_cashback_redeem in the database"
---

# Phase 03: Customer Pages Verification Report

**Phase Goal:** Redesign customer-facing pages (/join and /c/[token]) to clearly communicate program value and drive Google Wallet adoption.
**Verified:** 2026-03-02T13:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Cliente vede la pagina /join con sfondo, pulsanti e accenti nel colore del merchant | VERIFIED | `primaryColor` applied to header bg (line 321), submit button (line 480), BenefitPreview accents (lines 357, 368, 393, 410) |
| 2 | Cliente vede la sezione 'Come funziona' con premi concreti PRIMA del form di iscrizione | VERIFIED | BenefitPreview at line 344, form `<h2>Iscriviti al programma</h2>` at line 425 — correct order confirmed |
| 3 | Per programmi stamps, la sezione mostra ogni premio intermedio dalla tabella rewards | VERIFIED | Separate `.from('rewards')` query at line 89; rewards mapped to colored circles at lines 352-376 with fallback to stamps_required+reward_description |
| 4 | Per ogni tipo programma, la sezione mostra la soglia/rate corretta | VERIFIED | per-type blocks: stamps (rewards table), points (points_per_euro/stamps_required), cashback (cashback_percent+min_cashback_redeem), tiers (text desc), subscription (price/period/daily_limit) all present |
| 5 | Cliente completa il form e viene reindirizzato automaticamente a /c/[token] dopo 2.5 secondi | VERIFIED | `setTimeout(() => router.push('/c/${newCard.scan_token}'), 2500)` at lines 227-229 using local variable (not stale state) |
| 6 | Il pulsante 'Vai alla tua Carta' rimane come fallback nel success state | VERIFIED | Anchor tag with text "Vai alla tua Carta →" at line 285 in done-state; redirect hint at line 289 |
| 7 | Cliente apre /c/[token] e il primo elemento interattivo è il pulsante 'Aggiungi a Google Wallet' | VERIFIED | White card opens at line 311; Wallet CTA block is first child at lines 313-331, before progress message and all program content |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/join/[programId]/page.tsx` | Redesigned join page with BenefitPreview, rewards query, auto-redirect | VERIFIED | File exists, 499 lines, substantive implementation. Rewards state, separate query, BenefitPreview JSX, setTimeout redirect all present. |
| `app/c/[token]/page.tsx` | Card page with Wallet CTA at top, progress message, SVG stamp grid, subscription badge | VERIFIED | File exists, 651 lines, substantive implementation. All 4 structural changes confirmed in code. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/join/[programId]/page.tsx` | `supabase rewards table` | `.from('rewards').select()` in load() | WIRED | Found at line 89; conditional on `prog.program_type === 'stamps'`; ordered by stamps_required ascending; filters `is_active = true` |
| `app/join/[programId]/page.tsx` | `/c/[scan_token]` | `router.push()` inside `setTimeout(2500)` | WIRED | Lines 227-229; uses `newCard.scan_token` local variable (not stale `cardLink` state); fires after setDone(true) |
| `app/c/[token]/page.tsx` | `supabase rewards table` | `.from('rewards').select()` in loadCard() | WIRED | Found at line 77; conditional on `programData.program_type === 'stamps'`; same filters and ordering |
| Wallet CTA button | card body top | first element inside `bg-white rounded-2xl` div | WIRED | Comment `{/* 1. Wallet CTA — FIRST element, sopra il fold */}` at line 313 is literally the first child of the white card div at line 311 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| JOIN-01 | 03-01-PLAN.md | Cliente vede /join con colore principale del merchant applicato a sfondo, pulsanti e accenti | SATISFIED | `primaryColor` applied to header bg, input ring, submit button, BenefitPreview circle accents, cashback/subscription text |
| JOIN-02 | 03-01-PLAN.md | Cliente vede descrizione chiara del programma (tipo, reward, come si guadagnano punti/bollini) | SATISFIED | "Come funziona" section with per-type content blocks covering all 5 program types |
| JOIN-03 | 03-01-PLAN.md | Cliente vede la soglia per il premio prima di iscriversi (es. "10 caffè = 1 gratis") | SATISFIED | stamps: rewards table rows with stamps_required counts; points: rate + threshold; cashback: % + min redeem; subscription: price + daily_limit |
| JOIN-04 | 03-01-PLAN.md | Cliente completa l'iscrizione e viene reindirizzato alla sua carta senza errori | SATISFIED | setTimeout+router.push wired; fallback "Vai alla tua Carta" anchor present; error handling in handleSubmit throughout |
| CARD-01 | 03-02-PLAN.md | Cliente vede stato carta con gerarchia visiva corretta per ogni tipo (bollini, punti, cashback, tier, abbonamento) | SATISFIED | stamps: circular grid + reward box; points: text-5xl balance + progress bar; cashback: text-5xl credit amount; tiers: badge_emoji + tier name; subscription: bold ATTIVO/SCADUTO badge |
| CARD-02 | 03-02-PLAN.md | Cliente vede chiaramente quanto manca al prossimo premio ("ancora 3 bollini") | SATISFIED | `getProgressMessage()` covers all 5 types; rendered in styled row between Wallet CTA and program content (lines 333-340) |
| CARD-03 | 03-02-PLAN.md | Cliente vede pulsante "Aggiungi a Google Wallet" prominente se la carta non è ancora nel wallet | SATISFIED | Wallet button is the FIRST element in the white card body (line 313), before any program stats or QR code |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/c/[token]/page.tsx` | 561 | `✓ Sbloccato` unicode checkmark character in tiers list | Info | Low — this is a secondary text label in the "all tiers" list, not a primary stamp indicator. The plan only required SVG in the stamps grid (addressed at line 373). The unicode here is an acceptable secondary label. |

No blocker or warning-level anti-patterns found. The `return null` at line 182 is a legitimate return value from `getNextTier()` helper (returns null when customer is at maximum tier). The `placeholder` attributes on lines 439, 454, 467 are HTML input placeholder text — not code stubs.

### TypeScript Status

Zero TypeScript errors. `npx tsc --noEmit` exits clean with no output.

### Commits Verified

All 4 commits from SUMMARY files confirmed present in git history:

| Commit | Date | Description |
|--------|------|-------------|
| `468ff3b` | 2026-03-02 13:19:56 | feat(03-01): add rewards state and extend data loading in join page |
| `3fb40cf` | 2026-03-02 13:21:33 | feat(03-01): add BenefitPreview section and auto-redirect to join page |
| `73d0999` | 2026-03-02 13:20:12 | feat(03-02): add Reward type, rewards state/query, getProgressMessage function |
| `0fce9c2` | 2026-03-02 13:21:41 | feat(03-02): restructure card body — Wallet CTA top, progress message, stamps grid SVG, subscription badge |

### Human Verification Required

#### 1. Join page color theme on mobile

**Test:** Open `/join/[any-programId]` on a real mobile device (or Chrome DevTools mobile emulation). Observe the page header, form submit button, and "Come funziona" circle accents.
**Expected:** All elements use the merchant's `primary_color` — header background, the circle badges showing stamp thresholds, the submit button, and cashback/subscription text accents.
**Why human:** Color rendering and visual coherence cannot be verified via grep.

#### 2. Google Wallet button above fold

**Test:** Open `/c/[any-token]` on a real iPhone (Safari) at default zoom. Do not scroll.
**Expected:** The black "Aggiungi a Google Wallet" button is visible in the first screen without any scrolling. The card header overlaps into the white card, and the wallet button is the very first interactive element inside the white card area.
**Why human:** Above-fold check depends on actual device viewport dimensions and how the header overlap (-mt-12) renders on real hardware.

#### 3. Auto-redirect timing on join enrollment

**Test:** Open `/join/[any-programId]`, fill in "Mario Rossi" as name, submit the form.
**Expected:** A success card appears showing "Benvenuto!" with a "Vai alla tua Carta" button and the text "Reindirizzamento automatico in pochi secondi...". Within approximately 2.5 seconds, the browser navigates to `/c/[new-scan-token]`.
**Why human:** Timing, navigation behavior, and the success card display require real user interaction to observe.

#### 4. Cashback redeemable state

**Test:** Open `/c/[token]` for a cashback card where `cashback_balance >= min_cashback_redeem` in the database.
**Expected:** A green "Puoi riscattare!" banner appears in the cashback section, AND the progress message row shows "Pronto per riscattare!" in the merchant's primary color above the KPI content.
**Why human:** Requires a real cashback card in the database with sufficient balance to trigger the redeemable state.

### Gaps Summary

No gaps found. All 7 observable truths are verified against actual code. All 4 key links are wired and confirmed. All 7 requirements are satisfied by substantive implementations. TypeScript compiles cleanly. The 4 commits are confirmed in git history. Automated checks have passed completely.

The `human_needed` status reflects that 4 items cannot be verified programmatically — they require visual inspection on a real device and real user interaction to confirm the full user experience. These are not blockers to the phase being functionally complete; they are confirmation checks for UX quality.

---

_Verified: 2026-03-02T13:30:00Z_
_Verifier: Claude (gsd-verifier)_
