---
phase: 06-critical-fixes-v2
verified: 2026-03-03T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
human_verification:
  - test: "Submit landing page form with name + email and confirm lead appears in Supabase"
    expected: "Row inserted into leads table with name, email, created_at. Form shows 'Grazie!' state."
    why_human: "Cannot query live Supabase DB from code analysis. MANUAL-ACTIONS.md still shows leads table SQL as PENDING — must confirm migration was actually executed."
  - test: "Visit /api/wallet-image?cardId=[valid-id]&color=%236366f1 in browser"
    expected: "Hero image renders with indigo (#6366f1) background, not the program's DB color"
    why_human: "Edge runtime route — cannot invoke from static analysis. Real card ID required."
  - test: "Soft delete a program from /dashboard/programs/[id] and verify filtering"
    expected: "Program disappears from /dashboard/programs list and from dashboard program count. Supabase programs table shows deleted_at timestamp set."
    why_human: "Requires live DB interaction to confirm deleted_at column exists in Supabase (SQL migration status unclear in MANUAL-ACTIONS.md)."
  - test: "Hard delete a program by typing its name in the confirmation input"
    expected: "Elimina definitivamente button is disabled until exact name typed, then executes cascade delete. Supabase shows stamp_transactions/rewards/tiers/cards/programs all removed."
    why_human: "Requires live DB interaction to verify cascade and confirm deleted_at column is present in schema."
---

# Phase 6: Critical Fixes v2 — Verification Report

**Phase Goal:** Fix critical issues identified in Phase 5 UAT: hero image background color, lead capture on landing page, program soft delete (archive), and program hard delete with name confirmation.
**Verified:** 2026-03-03
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Hero image mostra colore programma via ?color= param, non bianco/nero | VERIFIED | `route.tsx:32-34` — `colorParam && colorParam.startsWith('#')` guard, applied to root div `backgroundColor` |
| 2 | lib/google-wallet.ts passa backgroundColor nell'URL hero | VERIFIED | `google-wallet.ts:98-100` — `getHeroImageUrl(cardId, backgroundColor?)` with `encodeURIComponent`; both call sites at lines 429 and 603 pass `data.backgroundColor` |
| 3 | Visitatore compila form landing e lead salvato in leads | VERIFIED (code) / ? (DB) | `LeadForm.tsx:12` fetch POST `/api/submit-lead`; `submit-lead/route.ts:19` `.from('leads').insert(...)` — code is wired; DB schema requires human confirmation |
| 4 | Merchant può archiviare programma con carte attive | VERIFIED | `[id]/page.tsx:223-238` — `softDeleteProgram()` sets `deleted_at: new Date().toISOString()`, no active-card block |
| 5 | Programmi archiviati esclusi da lista e conteggio dashboard | VERIFIED | `programs/page.tsx:54` — `.is('deleted_at', null)`; `dashboard/page.tsx:75` — `.is('deleted_at', null)` on count query |
| 6 | Merchant elimina definitivamente digitando nome con cascade | VERIFIED | `[id]/page.tsx:240-257` — `hardDeleteProgram()` checks `deleteConfirmName !== program.name`, cascades stamp_transactions → rewards → tiers → cards → programs |

**Score:** 6/6 truths verified in code

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/wallet-image/route.tsx` | Hero image con colore da ?color= param | VERIFIED | Lines 12, 32-34: `colorParam` read from searchParams, validated with `startsWith('#')`, applied as root `backgroundColor` |
| `lib/google-wallet.ts` | getHeroImageUrl passes ?color= URL-encoded | VERIFIED | Line 98-100: optional `backgroundColor?` param, `encodeURIComponent(backgroundColor)` appended. Lines 429, 603: both call sites pass `data.backgroundColor` |
| `components/LeadForm.tsx` | Client-side form with useState | VERIFIED | Line 1: `'use client'`; lines 5-6: `useState` for form + status; lines 8-21: `handleSubmit` with fetch POST |
| `app/api/submit-lead/route.ts` | POST endpoint inserting into leads table | VERIFIED | Lines 9-10: validates name+email; line 19: `.from('leads').insert(...)` with service role key |
| `app/page.tsx` | Server Component with LeadForm embedded | VERIFIED | No `'use client'` directive; line 2: `import LeadForm`; line 170: `<LeadForm />` in "Vuoi saperne di più?" section |
| `lib/types.ts` | Program type with deleted_at field | VERIFIED | Line 54: `deleted_at?: string | null` present |
| `app/dashboard/programs/[id]/page.tsx` | Two-path delete modal (soft + hard) | VERIFIED | Lines 223-257: `softDeleteProgram()` and `hardDeleteProgram()` — old `deleteProgram()` fully removed; modal at lines 1347-1408 shows both paths |
| `app/dashboard/programs/page.tsx` | loadPrograms filters soft-deleted | VERIFIED | Line 54: `.is('deleted_at', null)` in query chain |
| `app/dashboard/page.tsx` | Programs count excludes soft-deleted | VERIFIED | Line 75: `.is('deleted_at', null)` appended to count query |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `lib/google-wallet.ts getHeroImageUrl()` | `app/api/wallet-image/route.tsx` | `?color=` query param URL-encoded | WIRED | `encodeURIComponent(backgroundColor)` at line 99; route reads `searchParams.get('color')` at line 12 |
| `components/LeadForm.tsx` | `app/api/submit-lead/route.ts` | `fetch POST /api/submit-lead` | WIRED | `LeadForm.tsx:12`: `fetch('/api/submit-lead', { method: 'POST', ... })` — both request and response (`res.ok`) handled |
| `app/api/submit-lead/route.ts` | Supabase leads table | `supabase.from('leads').insert()` | WIRED (code) | Line 19: `.from('leads').insert({ name, email, phone, message })` — DB schema is human-verifiable only |
| `[id]/page.tsx softDeleteProgram()` | Supabase programs table | `UPDATE programs SET deleted_at = now()` | WIRED (code) | Line 229: `.update({ deleted_at: new Date().toISOString() })` |
| `programs/page.tsx loadPrograms()` | Supabase programs table | `.is('deleted_at', null)` filter | WIRED | Line 54: `.is('deleted_at', null)` in query chain before `.order()` |
| `[id]/page.tsx hardDeleteProgram()` | Supabase cascade | stamp_transactions → rewards → tiers → cards → programs | WIRED | Lines 246-250: correct delete order confirmed |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FIX-01 | 06-01-PLAN.md | Form landing salva lead nel DB (tabella leads) | VERIFIED (code) / ? (DB schema) | `LeadForm.tsx` + `submit-lead/route.ts` + `page.tsx` all wired. leads table SQL documented in MANUAL-ACTIONS.md but status shows PENDING — human must confirm execution |
| FIX-02 | 06-02-PLAN.md | Programmi con carte attive supportano soft delete | VERIFIED | `softDeleteProgram()` exists, no active-card block, `.is('deleted_at', null)` filters in place |
| FIX-03 | 06-02-PLAN.md | Hard delete con modal conferma nome + cascade | VERIFIED | `hardDeleteProgram()` with name check, cascade order correct |
| FIX-04 | 06-01-PLAN.md | Hero image applica background-color da ?color= | VERIFIED | `colorParam` read, validated, applied as root `backgroundColor` |

**REQUIREMENTS.md discrepancy:** REQUIREMENTS.md marks FIX-01 and FIX-04 as `[ ]` (Pending) and the traceability table shows both as "Pending". The code implements both. REQUIREMENTS.md must be updated to `[x]` to reflect completed state. Similarly, ROADMAP.md shows 06-02-PLAN.md as `[ ]` (not checked). These are documentation sync gaps, not code gaps.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/MANUAL-ACTIONS.md` | 31, 48 | `Status: PENDING` for both SQL migrations | Info | Not a code issue — SUMMARYs say migrations ran, but MANUAL-ACTIONS.md was not updated. Misleading for future maintainers. |
| `.planning/REQUIREMENTS.md` | 73, 76 | FIX-01 and FIX-04 marked `[ ]` despite implementation | Info | Documentation drift — does not affect runtime behavior |
| `.planning/ROADMAP.md` | 134 | `06-02-PLAN.md` marked `[ ]` | Info | Documentation drift — plan executed and summarized |

No code-level anti-patterns found. No TODO/FIXME/placeholder comments. No empty return implementations. No stubs.

---

## Human Verification Required

### 1. leads Table SQL Migration

**Test:** Open Supabase Dashboard > Table Editor and confirm the `leads` table exists with columns: `id`, `name`, `email`, `phone`, `message`, `created_at`.
**Expected:** Table visible with correct schema. RLS enabled with insert policy "Anyone can insert leads".
**Why human:** Cannot query Supabase schema from static analysis. MANUAL-ACTIONS.md shows status as "PENDING" which contradicts SUMMARY claim that migration was pre-executed.

### 2. Lead Form Submission End-to-End

**Test:** Visit https://fidelityapp-six.vercel.app (or localhost:3000). Scroll to "Vuoi saperne di più?" section. Fill name + email, click "Richiedi Informazioni".
**Expected:** Form shows "Grazie! Ti contatteremo entro 24 ore." Row appears in Supabase Dashboard > Table Editor > leads.
**Why human:** Requires live form submission to confirm DB insert works and RLS policy allows anonymous inserts.

### 3. Hero Image Color via ?color= Param

**Test:** Visit `/api/wallet-image?cardId=[valid-card-id]&color=%236366f1` in browser.
**Expected:** PNG image renders with indigo (#6366f1) background instead of the card's DB primary_color.
**Why human:** Edge runtime route requires a valid card ID and running server to invoke.

### 4. Soft Delete — DB Schema Confirmation

**Test:** Navigate to /dashboard/programs/[id], click delete, click "Archivia programma". Check Supabase Table Editor > programs > find row and confirm `deleted_at` column has a timestamp value. Reload /dashboard/programs — program must be absent.
**Expected:** `deleted_at` column exists (SQL migration ran), row has timestamp, program gone from list and dashboard count.
**Why human:** Cannot verify deleted_at column actually exists in Supabase without live DB access.

---

## Gaps Summary

No blocking code gaps found. All six observable truths are verified at the code level — artifacts exist, are substantive, and are wired. The four commits documented in SUMMARYs are confirmed in git history.

Two categories of non-blocking issues exist:

1. **SQL migration confirmation required (human):** Both `leads` table and `deleted_at` column migrations are documented in MANUAL-ACTIONS.md with "Status: PENDING" — contradicting SUMMARY claims they were pre-executed. Human must confirm Supabase schema matches expected state before declaring FIX-01/FIX-02/FIX-03 complete in production.

2. **Documentation drift (non-blocking):** REQUIREMENTS.md does not reflect completed FIX-01 and FIX-04. ROADMAP.md shows 06-02-PLAN.md unchecked. MANUAL-ACTIONS.md shows migrations as PENDING. These should be updated but do not affect runtime behavior.

---

_Verified: 2026-03-03_
_Verifier: Claude (gsd-verifier)_
