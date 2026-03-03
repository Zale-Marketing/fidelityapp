# Phase 11: Webhook Integrations - Research

**Researched:** 2026-03-03
**Domain:** HMAC-SHA256 webhook signing, Next.js API routes, Supabase, fire-and-forget HTTP dispatch
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WH-01 | Tabella `webhook_endpoints` (id, merchant_id, url, events text[], secret, is_active boolean, created_at) in Supabase | SQL migration pattern established in MANUAL-ACTIONS.md — exact DDL documented in Architecture section below |
| WH-02 | Pagina /dashboard/settings/webhooks con CRUD endpoint (aggiungi URL + seleziona eventi: nuovo_cliente, bollino_aggiunto, premio_riscattato, card_creata) | Settings area already exists at /dashboard/settings/whatsapp — same sidebar nav pattern to follow |
| WH-03 | Helper `lib/webhooks.ts` con funzione `triggerWebhook(merchantId, event, payload)` — payload firmato HMAC-SHA256 | Node.js built-in `crypto` module — no new packages required; pattern documented in Code Examples below |
| WH-04 | `triggerWebhook` chiamato nei punti giusti: /api/wallet-update (bollino_aggiunto), /c/[token] (card_creata, premio_riscattato), /join/[programId] (nuovo_cliente) | Integration points identified from codebase analysis — dispatch is fire-and-forget using Promise without await |
</phase_requirements>

---

## Summary

Phase 11 adds an outbound webhook system so technically-minded merchants on the BUSINESS plan can pipe FidelityApp events (stamp added, card created, reward redeemed, new customer) to Zapier, Make, or their own backend. The architecture is simple: a `webhook_endpoints` table stores per-merchant endpoint configurations, a shared `lib/webhooks.ts` helper signs and dispatches HTTP POSTs, and that helper is called fire-and-forget from the existing event-producing routes.

The core signing mechanism uses Node.js built-in `crypto.createHmac('sha256', secret)` — no new npm packages are needed. Each webhook call creates an HMAC over the JSON-serialized payload body and sends the signature in the `X-FidelityApp-Signature` header. Receivers (e.g. Zapier) verify by recomputing the same HMAC with the secret displayed in the dashboard.

The most important architectural constraint is that webhook dispatch must be **non-blocking**: all four event-origin locations (`/api/wallet-update`, `/c/[token]`, `/join/[programId]`) must return their response to the user without waiting for the external HTTP call to complete. The pattern is `triggerWebhook(...).catch(console.error)` — call without `await`.

The dashboard UI page (`/dashboard/settings/webhooks`) follows the exact same structure as the newly built `/dashboard/settings/whatsapp` page. The settings sidebar nav already exists.

**Primary recommendation:** Implement `lib/webhooks.ts` first (WH-03), then the DB migration (WH-01), then the dashboard UI (WH-02), then wire up the four integration points (WH-04). This order means each task is testable independently.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `crypto` (built-in) | Node 18+ (Vercel) | HMAC-SHA256 signing | Already available — zero new dependencies |
| Next.js API Routes | 14+ (already installed) | Webhook CRUD endpoints (GET/POST/PATCH/DELETE) | Same pattern as all other API routes in project |
| Supabase JS | already installed | Read `webhook_endpoints`, filter by merchant + event | Already used throughout |
| `fetch` (built-in) | Node 18+ | HTTP POST to external URLs | Native, no dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `usePlan` hook | existing (`lib/hooks/usePlan.ts`) | Gate webhook UI to BUSINESS plan | Already used in whatsapp settings page |
| `UpgradePrompt` component | existing (`components/ui/UpgradePrompt.tsx`) | Show upgrade CTA for FREE/PRO users | Already used in whatsapp settings page |
| Lucide React | already installed | Webhook, Link, Trash2, Plus, Copy icons | Already used throughout dashboard |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in `crypto` | `tweetnacl` or `jose` | Built-in is sufficient for HMAC-SHA256 — no reason to add a dependency |
| Fire-and-forget fetch | Queue (Redis/Supabase pg_task) | Queue adds reliability but is out of scope; fire-and-forget matches project simplicity |
| Per-request DB lookup | Cache webhook_endpoints in memory | Cache adds complexity; query is fast (indexed by merchant_id) — direct DB call is fine |

**Installation:** None required. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure
```
lib/
└── webhooks.ts              # triggerWebhook() — shared helper (new)

app/
├── api/
│   └── webhooks/
│       └── route.ts         # GET (list), POST (create) for merchant's endpoints (new)
│   └── webhooks/
│       └── [id]/
│           └── route.ts     # PATCH (update), DELETE (delete) (new)
└── dashboard/
    └── settings/
        └── webhooks/
            └── page.tsx     # CRUD UI page (new)
```

### Pattern 1: HMAC-SHA256 Signing in lib/webhooks.ts

**What:** A single exported async function that queries `webhook_endpoints` for matching merchant + event, then POSTs a signed payload to each matching URL.
**When to use:** Called fire-and-forget (no await) from any event-producing route.

```typescript
// lib/webhooks.ts
// Source: Node.js built-in crypto docs + industry-standard webhook signing pattern (GitHub, Stripe)
import { createHmac } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type WebhookEvent =
  | 'bollino_aggiunto'
  | 'card_creata'
  | 'premio_riscattato'
  | 'nuovo_cliente'

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string          // ISO-8601
  merchant_id: string
  data: Record<string, unknown>
}

export async function triggerWebhook(
  merchantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  // 1. Load matching active endpoints for this merchant and event
  const { data: endpoints, error } = await supabase
    .from('webhook_endpoints')
    .select('id, url, secret')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .contains('events', [event])

  if (error || !endpoints || endpoints.length === 0) return

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    merchant_id: merchantId,
    data,
  }

  const body = JSON.stringify(payload)

  // 2. Dispatch to each endpoint (parallel, fire-and-forget)
  await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      const signature = createHmac('sha256', endpoint.secret)
        .update(body)
        .digest('hex')

      await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FidelityApp-Signature': `sha256=${signature}`,
          'X-FidelityApp-Event': event,
          'User-Agent': 'FidelityApp-Webhooks/1.0',
        },
        body,
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })
    })
  )
}
```

**Usage at call sites (fire-and-forget):**
```typescript
// In /api/wallet-update/route.ts — after successful DB update
// Source: project pattern — same as updateWallet() call in stamp/page.tsx
triggerWebhook(card.merchant_id, 'bollino_aggiunto', {
  card_id: card.id,
  program_id: card.program_id,
  card_holder_id: card.card_holder_id,
  new_value: newStampCount,       // or points_balance, cashback_balance etc.
}).catch(console.error)            // fire-and-forget — do NOT await
```

### Pattern 2: Webhook Secret Generation

**What:** Generate a random secret when a merchant creates an endpoint. Show it once in the UI.
**When to use:** POST /api/webhooks creates the endpoint and returns the secret.

```typescript
// Source: Node.js crypto.randomBytes docs
import { randomBytes } from 'crypto'

const secret = randomBytes(32).toString('hex')  // 64-char hex string
```

The secret is stored in plain text in `webhook_endpoints.secret` (only the merchant can see it). It is displayed once on endpoint creation in the dashboard — after that the user must regenerate it if lost.

### Pattern 3: Supabase text[] Filter for Events

**What:** The `events` column is a PostgreSQL `text[]`. Use Supabase `.contains()` to filter rows where the array includes a given event string.
**When to use:** In `triggerWebhook()` when loading endpoints.

```typescript
// Source: Supabase docs — array operators
// .contains(column, value) maps to PostgreSQL @> operator
const { data } = await supabase
  .from('webhook_endpoints')
  .select('*')
  .eq('merchant_id', merchantId)
  .eq('is_active', true)
  .contains('events', [event])   // events @> ARRAY['bollino_aggiunto']
```

**Confidence:** HIGH — `.contains()` with text[] is a documented Supabase/PostgREST feature.

### Pattern 4: CRUD API Routes for Dashboard

```typescript
// app/api/webhooks/route.ts
// Source: same pattern as /api/whatsapp/* routes in project

// GET — list endpoints for authenticated merchant
export async function GET(request: NextRequest) {
  // 1. Validate session (supabase.auth.getUser from Authorization header)
  // 2. Look up merchant_id from profiles
  // 3. Select from webhook_endpoints where merchant_id = X
  // 4. Return list (do NOT return secret in list — return masked version)
}

// POST — create new endpoint
export async function POST(request: NextRequest) {
  // 1. Validate session
  // 2. Parse { url, events[] } from body
  // 3. Generate secret = randomBytes(32).toString('hex')
  // 4. Insert into webhook_endpoints
  // 5. Return created row INCLUDING secret (only time it's shown)
}
```

```typescript
// app/api/webhooks/[id]/route.ts
// PATCH — toggle is_active or update events
// DELETE — remove endpoint
```

### Anti-Patterns to Avoid

- **Awaiting triggerWebhook in the request handler:** The user's scan would block until the external HTTP call completes (or times out). Always fire-and-forget with `.catch(console.error)`.
- **Showing the secret in GET /api/webhooks list responses:** Store it in DB but mask in list view. Only return the real secret immediately after creation or a dedicated "regenerate" action.
- **Not setting a fetch timeout:** External URLs may hang. Use `AbortSignal.timeout(5000)` to cap at 5 seconds.
- **Using edge runtime for webhook dispatch:** `lib/webhooks.ts` will be imported by server-side routes that already run in Node.js runtime. Confirm those routes do NOT have `export const runtime = 'edge'` — check `/api/wallet-update/route.ts` (it does not, so safe to import `crypto` and `webhooks.ts`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC signing | Custom crypto logic | `crypto.createHmac` (built-in) | Battle-tested, constant-time, standard |
| Secret generation | Math.random() strings | `crypto.randomBytes(32).toString('hex')` | Cryptographically secure random |
| Array-contains DB query | Manual JS filter after fetching all rows | `.contains('events', [event])` | DB-side filter is O(1) vs O(n) in JS |
| Parallel dispatch | Sequential for-loop | `Promise.allSettled()` | Parallel dispatch, no early abort on single failure |
| Timeout handling | Manual setTimeout/AbortController | `AbortSignal.timeout(5000)` | Native Node 18+ API, clean cancellation |

**Key insight:** The entire webhook system needs zero new npm packages. Everything — HMAC, random bytes, HTTP fetch, timeout — is available in Node 18+ runtime that Vercel already uses.

---

## Common Pitfalls

### Pitfall 1: Blocking the Stamp Scan on Webhook Dispatch
**What goes wrong:** Merchant scans QR, `triggerWebhook()` is awaited, external URL is slow or down — cassiere waits 5 seconds before seeing confirmation.
**Why it happens:** Forgetting to drop the `await` keyword.
**How to avoid:** Always call as `triggerWebhook(...).catch(console.error)` — never `await triggerWebhook(...)`.
**Warning signs:** Test with a slow URL (e.g. httpbin.org/delay/3) — if the stamp success screen takes >1 second, the call is being awaited.

### Pitfall 2: Calling triggerWebhook from Client-Side Pages
**What goes wrong:** `lib/webhooks.ts` imports `crypto` (Node built-in) and `SUPABASE_SERVICE_ROLE_KEY` — both unavailable in browser context.
**Why it happens:** The two pages that need webhook calls (`/join/[programId]` for `nuovo_cliente`, `/c/[token]` for `card_creata`/`premio_riscattato`) are client-side `'use client'` components.
**How to avoid:** Create a server-side API route (`/api/webhook-dispatch` or add to existing routes) that the client page POSTs to, which then calls `triggerWebhook()` server-side. OR: move the data-write logic for those events to a server-side route. See integration analysis below.
**Warning signs:** `ReferenceError: crypto is not defined` or `process.env.SUPABASE_SERVICE_ROLE_KEY is undefined` in browser console.

### Pitfall 3: PostgreSQL text[] vs jsonb for Events Column
**What goes wrong:** Using `jsonb` for events creates problems with PostgREST's `.contains()` operator syntax.
**Why it happens:** Wanting to store event names as JSON array.
**How to avoid:** Use `text[]` (native PostgreSQL array). The Supabase `.contains()` method works correctly with `text[]` using the `@>` operator.
**Warning signs:** Supabase returns error `operator does not exist: jsonb @> text[]`.

### Pitfall 4: Secret Exposure in List API
**What goes wrong:** GET /api/webhooks returns the full `secret` value to the browser — anyone with devtools can see it.
**Why it happens:** Selecting `*` from the table and forwarding all fields.
**How to avoid:** In the GET list endpoint, select all columns except `secret`: `.select('id, merchant_id, url, events, is_active, created_at')`. Return `secret_hint: secret.slice(0, 8) + '...'` if needed for display.

### Pitfall 5: /join and /c/[token] Are Client Components
**What goes wrong:** `triggerWebhook()` cannot be called directly from these pages because they run in the browser.
**Why it happens:** Both pages are `'use client'` and perform their DB writes via the Supabase browser client (anon key).
**How to avoid:** For `WH-04`, two integration points need a server-side path:
- `card_creata` + `nuovo_cliente` — after the card/card_holder insert in `/join/[programId]`, make a `fetch('/api/webhooks/dispatch', { method: 'POST', body: ... })` call (fire-and-forget) to a new thin server route that calls `triggerWebhook()`.
- `premio_riscattato` — same pattern from `/c/[token]` if reward redemption is tracked there.
- `bollino_aggiunto` — already server-side (`/api/wallet-update/route.ts`) so `triggerWebhook()` can be imported directly.

---

## Code Examples

Verified patterns from Node.js built-in crypto + Supabase official docs:

### HMAC-SHA256 Signing
```typescript
// Source: Node.js crypto docs https://nodejs.org/api/crypto.html#hmac
import { createHmac } from 'crypto'

const body = JSON.stringify(payload)
const signature = createHmac('sha256', secret)
  .update(body)
  .digest('hex')

// Header sent to receiver: 'sha256=' + signature
// Receiver verifies: createHmac('sha256', knownSecret).update(body).digest('hex') === receivedSig
```

### Secret Generation
```typescript
// Source: Node.js crypto docs
import { randomBytes } from 'crypto'
const secret = randomBytes(32).toString('hex')  // 64-char hex
```

### Supabase text[] Column DDL + Query
```sql
-- MANUAL-ACTIONS.md migration
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_endpoints_merchant_id_idx
  ON webhook_endpoints(merchant_id);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants see own endpoints" ON webhook_endpoints
  FOR ALL USING (
    merchant_id IN (
      SELECT merchant_id FROM profiles WHERE id = auth.uid()
    )
  );
```

```typescript
// Supabase .contains() with text[] — Source: Supabase PostgREST docs
const { data } = await supabase
  .from('webhook_endpoints')
  .select('id, url, secret')
  .eq('merchant_id', merchantId)
  .eq('is_active', true)
  .contains('events', [event])
```

### Fire-and-Forget Dispatch Pattern
```typescript
// In /api/wallet-update/route.ts — after successful card update
// Source: project code pattern — same as updateWallet() fire-and-forget in stamp/page.tsx
import { triggerWebhook } from '@/lib/webhooks'

// ... existing wallet update logic ...

// Fire-and-forget — do NOT await
triggerWebhook(card.merchant_id, 'bollino_aggiunto', {
  card_id: card.id,
  program_id: card.program_id,
  card_holder_id: card.card_holder_id,
  program_type: program.program_type,
  new_stamp_count: card.current_stamps,
  new_points_balance: card.points_balance,
  new_cashback_balance: card.cashback_balance,
}).catch(console.error)
```

### Dispatch Route for Client-Side Events (WH-04 key pattern)
```typescript
// app/api/webhooks/dispatch/route.ts
// Called from /join and /c/[token] client pages — no auth required (public events)
// Source: pattern from /api/submit-lead/route.ts which also has no auth, service role key

import { NextRequest, NextResponse } from 'next/server'
import { triggerWebhook, WebhookEvent } from '@/lib/webhooks'

export async function POST(request: NextRequest) {
  const { merchantId, event, data } = await request.json()
  if (!merchantId || !event) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  // Fire webhook async — don't await the result
  triggerWebhook(merchantId, event as WebhookEvent, data).catch(console.error)
  return NextResponse.json({ ok: true })
}
```

### UI Dashboard Page (Webhook List + Add Form)
```typescript
// app/dashboard/settings/webhooks/page.tsx — structure only
// Source: mirrors app/dashboard/settings/whatsapp/page.tsx pattern

'use client'
// Events for checkbox selection:
const AVAILABLE_EVENTS = [
  { id: 'bollino_aggiunto', label: 'Bollino aggiunto' },
  { id: 'card_creata', label: 'Carta creata' },
  { id: 'premio_riscattato', label: 'Premio riscattato' },
  { id: 'nuovo_cliente', label: 'Nuovo cliente' },
]
```

---

## Integration Point Analysis

Critical finding from codebase review — where each event originates:

| Event | Origin | Type | triggerWebhook Strategy |
|-------|--------|------|------------------------|
| `bollino_aggiunto` | `/api/wallet-update/route.ts` | Server-side API route | Import and call directly |
| `nuovo_cliente` | `/join/[programId]/page.tsx` (client) | Client component | POST to `/api/webhooks/dispatch` fire-and-forget |
| `card_creata` | `/join/[programId]/page.tsx` (client) | Client component | POST to `/api/webhooks/dispatch` fire-and-forget |
| `premio_riscattato` | `/c/[token]/page.tsx` (client) | Client component | POST to `/api/webhooks/dispatch` fire-and-forget |

Note: `premio_riscattato` fires when the merchant redeems a reward, which currently happens via the cassiere scanning in `stamp/page.tsx` — specifically when `currentStamps >= stamps_required` and mode = `reward_ready`. This is also a client-side component. All three client-side events need the `/api/webhooks/dispatch` server route.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `createHmac` from `crypto` node module | Same — still the standard | N/A | No change needed |
| `AbortController` + `setTimeout` for fetch timeout | `AbortSignal.timeout(ms)` | Node 17.3+ | Cleaner API — use this |
| Separate `is_active` field for enable/disable | Same pattern | N/A | Delete row vs toggle — we use toggle (is_active) |

**Deprecated/outdated:**
- None relevant to this phase. The tech domain (HMAC signing, webhook HTTP) is stable and unchanged for years.

---

## Open Questions

1. **premio_riscattato exact trigger point**
   - What we know: Reward redemption currently shows a `reward_ready` mode on `/stamp/page.tsx` with a manual "confirm" step — or auto-triggers on `/c/[token]` display
   - What's unclear: Is there a dedicated "redeem" button/action in `/c/[token]` or only in the cassiere scanner? The planner needs to pick one canonical event trigger.
   - Recommendation: Trigger `premio_riscattato` from the cassiere stamp page (`stamp/page.tsx`) when `mode === 'reward_ready'` and the cashier confirms — this is the authoritative redemption moment.

2. **BUSINESS plan gate enforcement**
   - What we know: STATE.md says webhooks are BUSINESS plan only. `usePlan()` hook and `UpgradePrompt` component exist.
   - What's unclear: Does `usePlan()` expose a `isBusiness` boolean or just `isFree`?
   - Recommendation: Read `lib/hooks/usePlan.ts` before implementing WH-02 dashboard page; add `isBusiness` check or use plan === 'business' directly.

---

## SQL Migration for MANUAL-ACTIONS.md

The planner must include this migration in MANUAL-ACTIONS.md under Phase 11:

```sql
-- webhook_endpoints table for Phase 11 (WH-01)
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_endpoints_merchant_id_idx
  ON webhook_endpoints(merchant_id);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Merchants can only access their own endpoints
CREATE POLICY "Merchants manage own webhook endpoints" ON webhook_endpoints
  FOR ALL USING (
    merchant_id IN (
      SELECT merchant_id FROM profiles WHERE id = auth.uid()
    )
  );
```

**Status:** PENDING — must be executed in Supabase SQL Editor before any Phase 11 code runs.

---

## Sources

### Primary (HIGH confidence)
- Node.js 18+ built-in `crypto` module docs — `createHmac`, `randomBytes` API signatures verified against node.js.org/api/crypto.html
- Supabase PostgREST docs — `.contains()` for PostgreSQL text[] array operator `@>`
- Codebase analysis — `/api/wallet-update/route.ts`, `/app/stamp/page.tsx`, `/app/join/[programId]/page.tsx`, `/app/c/[token]/page.tsx` all read directly

### Secondary (MEDIUM confidence)
- Industry standard webhook signing patterns (Stripe, GitHub) — HMAC-SHA256 with `sha256=` prefix on signature header is the de facto standard
- `AbortSignal.timeout()` — Node 17.3+ documented API, Vercel runtime uses Node 18+

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages, all existing runtime capabilities
- Architecture: HIGH — patterns verified from existing project code (`/api/whatsapp/*`, `lib/webhooks.ts` does not yet exist but the pattern is clear)
- Integration points: HIGH — all four call sites located and read in full
- Client-side limitation (Pitfall 5): HIGH — both `/join` and `/c/[token]` confirmed as `'use client'` components

**Research date:** 2026-03-03
**Valid until:** 2026-06-03 (stable domain — HMAC/webhook patterns do not change)
