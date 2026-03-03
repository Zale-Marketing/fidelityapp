---
plan: 11-02
phase: 11-webhook-integrations
status: complete
completed: "2026-03-03"
commit: 4b3d0fa
---

# Plan 11-02 Summary: Webhook UI + Event Origin Wiring

## What Was Built

Dashboard settings page for webhook management and all four event origin integrations wired.

## Key Files Created/Modified

- `app/dashboard/settings/webhooks/page.tsx` — BUSINESS plan gated CRUD UI (175+ lines)
  - Plan gate: `usePlan().isBusiness` — FREE/PRO see UpgradePrompt with requiredPlan="BUSINESS"
  - Endpoint list with URL, event badges, active/inactive status, toggle + delete
  - Add form: URL input (https:// validated server-side), event checkboxes for all 4 events
  - One-time secret display in yellow alert box with copy button after creation
  - Empty state: Zap icon 48px #D1D5DB + descriptive text
- `app/api/wallet-update/route.ts` — imports `triggerWebhook`, fires 'bollino_aggiunto' fire-and-forget after `updateWalletCard` succeeds
- `app/join/[programId]/page.tsx` — dispatches 'nuovo_cliente' + 'card_creata' to /api/webhooks/dispatch after successful card creation, no await
- `app/stamp/page.tsx` — dispatches 'premio_riscattato' to /api/webhooks/dispatch in both `redeemStampsReward` and `redeemPointsReward` functions, no await

## app/c/[token]/page.tsx Assessment

Display-only page — shows card data, QR code, and Google Wallet button. No redemption action exists on this page. Canonical redemption is in `stamp/page.tsx`. No webhook changes needed.

## Self-Check: PASSED

- /dashboard/settings/webhooks exists and renders correctly
- BUSINESS gate: non-business users see UpgradePrompt with requiredPlan="BUSINESS"
- bollino_aggiunto: triggerWebhook called without await in /api/wallet-update/route.ts
- nuovo_cliente + card_creata: dispatched via fetch('/api/webhooks/dispatch') in join page without await
- premio_riscattato: dispatched via fetch('/api/webhooks/dispatch') in stamp page without await (both stamps and points redemption)
- TypeScript compilation: zero errors in all modified files
- Zero existing functionality broken — all webhook calls are pure additive fire-and-forget

## Deviations

None — implementation matches plan spec exactly. Added webhook dispatch to both `redeemStampsReward` and `redeemPointsReward` (stamps and points) for complete coverage of the premio_riscattato event.
