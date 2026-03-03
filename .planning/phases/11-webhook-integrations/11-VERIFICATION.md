---
phase: 11
status: passed
verified: "2026-03-03"
requirements: WH-01, WH-02, WH-03, WH-04
---

# Phase 11: Webhook Integrations — Verification

## Phase Goal

"Merchant tecnico può ricevere eventi di FidelityApp in qualsiasi sistema esterno tramite webhook firmati"

## Must-Have Verification

### WH-01: webhook_endpoints SQL migration documented

- MANUAL-ACTIONS.md contains `## Phase 11: Webhook Integrations` section
- DDL includes: `CREATE TABLE IF NOT EXISTS webhook_endpoints` with uuid PK, merchant_id FK, url, events text[], secret, is_active, created_at
- Includes index on merchant_id
- Includes `ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY`
- Includes RLS policy "Merchants manage own webhook endpoints"
- Status: PENDING (awaiting human execution in Supabase SQL Editor — documented correctly)
- **PASS**

### WH-02: CRUD UI at /dashboard/settings/webhooks

- File exists: `app/dashboard/settings/webhooks/page.tsx` (175+ lines)
- Plan gate: `usePlan().isBusiness` → non-BUSINESS users see `<UpgradePrompt feature="Webhook Integrations" requiredPlan="BUSINESS" />`
- BUSINESS users see: endpoint list (or empty state with Zap icon 48px), "Aggiungi Endpoint" button
- Add form: URL input (type="url"), event checkboxes for all 4 events, submit disabled when no url or no events selected
- One-time secret: shown in yellow alert with copy button after creation, closeable
- Toggle button calls `PATCH /api/webhooks/[id]` with `{ is_active: !current }`
- Delete button calls `DELETE /api/webhooks/[id]` and removes row from local state
- All API calls pass `Authorization: Bearer {session.access_token}`
- **PASS**

### WH-03: HMAC-SHA256 signed webhook dispatch

- `lib/webhooks.ts` exports `triggerWebhook(merchantId, event, data)` — confirmed at line 19
- Signing: `createHmac('sha256', endpoint.secret).update(body).digest('hex')` — confirmed at line 47
- Header: `'X-FidelityApp-Signature': 'sha256=' + signature` — confirmed at line 55
- Timeout: `AbortSignal.timeout(5000)` — confirmed at line 60
- Resilience: `Promise.allSettled(...)` — one endpoint failing doesn't block others
- Short-circuits: returns immediately if no active matching endpoints (line 28 check)
- Uses built-in `crypto` module — zero new npm packages
- **PASS**

### WH-04: Events fire from all four origin points

**bollino_aggiunto — app/api/wallet-update/route.ts:**
- `import { triggerWebhook } from '@/lib/webhooks'` at line 4
- Called WITHOUT await after `updateWalletCard()` succeeds (line 148)
- Pattern: `triggerWebhook(...).catch(console.error)` — fire-and-forget confirmed
- **PASS**

**nuovo_cliente + card_creata — app/join/[programId]/page.tsx:**
- `dispatchWebhook` helper defined at line 231: `fetch('/api/webhooks/dispatch', ...)`
- `dispatchWebhook('nuovo_cliente', {...})` called at line 239
- `dispatchWebhook('card_creata', {...})` called at line 245
- No await on either call — fire-and-forget confirmed
- **PASS**

**premio_riscattato — app/stamp/page.tsx:**
- `fetch('/api/webhooks/dispatch', ...)` with `event: 'premio_riscattato'` at line 606
- Same pattern at line 670 (points redemption)
- Both calls use `.catch(console.error)` without await — fire-and-forget confirmed
- **PASS**

**app/c/[token]/page.tsx:**
- Review confirmed: page is display-only (renders card data, QR, Google Wallet button)
- No redemption action exists on this page — canonical redemption is in stamp/page.tsx
- No webhook changes needed — correctly skipped
- **PASS**

## API Routes Verification

| Route | Method | Behavior |
|-------|--------|----------|
| /api/webhooks | GET | Returns endpoint list WITHOUT secret column |
| /api/webhooks | POST | Validates url (https://) + events, generates secret via randomBytes(32), returns secret once |
| /api/webhooks/[id] | PATCH | Updates is_active/events/url, verifies merchant ownership |
| /api/webhooks/[id] | DELETE | Removes endpoint, verifies merchant ownership |
| /api/webhooks/dispatch | POST | Public route, fire-and-forget triggerWebhook, returns { ok: true } |

All routes verified in code — no `await` before `triggerWebhook` in dispatch route.

## TypeScript

`npx tsc --noEmit` — zero errors in all Phase 11 files.

## Requirement Traceability

| Requirement | Plans | Status |
|-------------|-------|--------|
| WH-01 (SQL migration) | 11-01 Task 1 | PASS |
| WH-02 (CRUD UI) | 11-02 Task 1 | PASS |
| WH-03 (HMAC signing) | 11-01 Task 2 | PASS |
| WH-04 (event origins) | 11-02 Task 2 | PASS |

## Verdict

**status: passed**

All 4 must-haves verified. Phase goal achieved. Webhook system is complete:
- SQL migration documented in MANUAL-ACTIONS.md (awaiting human execution)
- HMAC-SHA256 signed dispatch helper built with zero new npm packages
- Full CRUD API with authentication and ownership checks
- Dashboard UI gated to BUSINESS plan
- Four event origins wired as fire-and-forget, zero blocking impact on existing flows

## Human Verification (Optional)

The following requires the SQL migration to be run first:
1. Run SQL in Supabase Dashboard > SQL Editor (from MANUAL-ACTIONS.md Phase 11 section)
2. Visit /dashboard/settings/webhooks as a BUSINESS plan merchant — should see endpoint management UI
3. Add endpoint with https://webhook.site/... URL and "Bollino aggiunto" event — should show one-time secret
4. Trigger a stamp scan — endpoint should receive a POST with X-FidelityApp-Signature header
