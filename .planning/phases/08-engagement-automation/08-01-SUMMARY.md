---
plan: 08-01
phase: 08-engagement-automation
status: complete
completed_at: "2026-03-03"
---

# Summary: 08-01 — Customer Card Segmentation + Bulk Notification Page

## What Was Built

A new `/dashboard/cards` page that displays all customer cards segmented by activity, with bulk push notification sending. Added a "Carte" sidebar navigation link.

## Key Files

### Created
- `app/dashboard/cards/page.tsx` (441 lines) — Full segmentation page with 4 tabs, checkboxes, bulk send modal

### Modified
- `components/dashboard/Sidebar.tsx` — Added Carte nav item with Layers icon between Clienti and Notifiche

## Tasks Completed

| # | Task | Status |
|---|------|--------|
| 1 | Create /dashboard/cards/page.tsx with segmentation and bulk send | ✓ Complete |
| 2 | Add Carte nav item to Sidebar | ✓ Complete |

## Technical Decisions

- Segment classification: active ≤30 days, dormant 31-90 days, lost >90 days using `last_use_date || created_at`
- Counts computed from full unfiltered list; filtered display applies on top
- "Select all" operates only on current segment tab (deselects if all already selected)
- Bulk send: batches of 10 via `Promise.allSettled` calling `/api/send-notification`
- Separate Supabase queries for cards, card_holders, programs (no nested selects)
- Design tokens from Phase 7: bg-[#111111] primary, bg-[#F5F5F5] background, rounded-[8px] buttons

## Self-Check: PASSED

- `app/dashboard/cards/page.tsx` exists, 441 lines (> 200 minimum)
- `grep "dashboard/cards" components/dashboard/Sidebar.tsx` → match found
- `grep "send-notification" app/dashboard/cards/page.tsx` → match found
- `grep "Promise.allSettled" app/dashboard/cards/page.tsx` → match found
- `npx tsc --noEmit` → no errors
- Committed: `2e850d6`
