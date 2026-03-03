---
phase: 08
status: passed
verified_at: "2026-03-03"
verifier: orchestrator
---

# Phase 08 Verification: Engagement Automation

## Goal

Merchant può identificare clienti a rischio abbandono e il sistema invia auguri di compleanno in automatico

## Must-Haves Check

### SEG-01: 4-tab segmentation page

**Status: VERIFIED**

- `app/dashboard/cards/page.tsx` exists (441 lines)
- SEGMENT_LABELS map: `{ all: 'Tutti', active: 'Attivi', dormant: 'Dormienti', lost: 'Persi' }`
- MetricCards display counts for all 4 segments
- Segment tabs render with correct active/inactive styles

### SEG-02: Checkbox selection scoped to segment + bulk send

**Status: VERIFIED**

- `selectedIds: Set<string>` state tracks checked cards
- `toggleSelectAll()` selects/deselects only current `segmentedCards`
- `allVisibleSelected` computed from current segment only
- Bulk send modal: calls `/api/send-notification` with `Promise.allSettled` in batches of 10
- Confirmed: `grep "Promise.allSettled" app/dashboard/cards/page.tsx` → line 210

### SEG-03: Sidebar Carte link

**Status: VERIFIED**

- `components/dashboard/Sidebar.tsx` line 11: `{ href: '/dashboard/cards', icon: Layers, label: 'Carte' }`
- Positioned between Clienti and Notifiche

### BDAY-01: birth_date field in /join form

**Status: VERIFIED**

- `app/join/[programId]/page.tsx` line 70: `const [birthDate, setBirthDate] = useState('')`
- Line 171: `birth_date: birthDate || null` in card_holder insert
- Line 476: "Data di nascita (opzionale)" label + date input

### BDAY-02: SQL migration documented

**Status: VERIFIED (MANUAL ACTION REQUIRED)**

- `.planning/MANUAL-ACTIONS.md` Phase 8 section contains:
  `ALTER TABLE card_holders ADD COLUMN IF NOT EXISTS birth_date date;`
- Instructions for Supabase Dashboard SQL Editor included
- Status marked PENDING for manual execution

### BDAY-03: CRON_SECRET + Vercel Pro documented

**Status: VERIFIED (MANUAL ACTION REQUIRED)**

- MANUAL-ACTIONS.md documents CRON_SECRET env var setup steps
- Vercel Pro plan requirement documented with manual curl test fallback

### BDAY-04: Birthday cron route

**Status: VERIFIED**

- `app/api/cron/birthday/route.ts` exists
- CRON_SECRET authorization check is first operation (line 10)
- UTC date comparison: `today.getUTCMonth() + 1` and `today.getUTCDate()`
- Separate Supabase queries (no nested selects)
- `addMessage` loop with `TEXT_AND_NOTIFY` messageType
- Personalized message: `Tanti auguri ${firstName}! Oggi hai un regalo speciale che ti aspetta.`
- 404 errors silently skipped; other errors logged with `console.warn`
- `vercel.json` declares `"schedule": "0 9 * * *"` for `/api/cron/birthday`

## Success Criteria Verification

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Merchant vede 4 filtri con conteggio in /dashboard/cards | ✓ PASSED |
| 2 | Bulk checkbox + notifica push al gruppo | ✓ PASSED |
| 3 | /join form ha campo data di nascita opzionale | ✓ PASSED |
| 4 | Cron 09:00 UTC invia messaggio personalizzato per compleanni | ✓ PASSED |

## TypeScript

`npx tsc --noEmit` → no errors

## Manual Actions Required

The following actions must be completed manually before birthday automation works end-to-end:

1. Run SQL in Supabase: `ALTER TABLE card_holders ADD COLUMN IF NOT EXISTS birth_date date;`
2. Add `CRON_SECRET` env var in Vercel Dashboard
3. Verify Vercel Pro plan (or use manual curl for testing)

These are documented in `.planning/MANUAL-ACTIONS.md` Phase 8 section.

## Commits

- `2e850d6` — feat(08-01): add /dashboard/cards segmentation page with bulk notifications
- `9dd37e5` — feat(08-02): birthday automation — cron route, join form birth_date, vercel.json
