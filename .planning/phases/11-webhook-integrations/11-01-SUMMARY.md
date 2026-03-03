---
plan: 11-01
phase: 11-webhook-integrations
status: complete
completed: "2026-03-03"
commit: 247059e
---

# Plan 11-01 Summary: Webhook Server-Side Foundation

## What Was Built

Server-side foundation for the webhook integration system: SQL migration documentation, HMAC-SHA256 signing helper library, and all four API routes.

## Key Files Created

- `.planning/MANUAL-ACTIONS.md` — Phase 11 section added with complete `webhook_endpoints` DDL, index, RLS enable, and policy
- `lib/webhooks.ts` — `triggerWebhook(merchantId, event, data)` using Node.js `crypto` (HMAC-SHA256), `AbortSignal.timeout(5000)`, `Promise.allSettled`
- `app/api/webhooks/route.ts` — GET (list endpoints, secret excluded) + POST (create, returns secret once)
- `app/api/webhooks/[id]/route.ts` — PATCH (toggle/update) + DELETE (merchant ownership verified)
- `app/api/webhooks/dispatch/route.ts` — public POST route, fire-and-forget `triggerWebhook`

## Self-Check: PASSED

- MANUAL-ACTIONS.md contains `CREATE TABLE IF NOT EXISTS webhook_endpoints` with text[] events column, index, RLS, and policy
- `lib/webhooks.ts` exports `WebhookEvent`, `WebhookPayload`, `triggerWebhook` — uses built-in `crypto`, no new npm packages
- GET /api/webhooks selects `id, merchant_id, url, events, is_active, created_at` (NO secret column)
- POST /api/webhooks generates secret via `randomBytes(32).toString('hex')` and returns it in response body
- `/api/webhooks/dispatch` calls `triggerWebhook(...).catch(console.error)` WITHOUT await
- TypeScript compilation: zero errors in webhook files

## Deviations

None — implementation matches plan spec exactly.
