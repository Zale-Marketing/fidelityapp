# Phase 10: WhatsApp Marketing via Maytapi - Research

**Researched:** 2026-03-03
**Domain:** WhatsApp API integration (Maytapi), Next.js API routes, daily rate limiting
**Confidence:** HIGH (Maytapi OpenAPI spec retrieved directly, verified against official docs)

---

## Summary

Phase 10 integrates Maytapi — a WhatsApp API provider — into the FidelityApp dashboard so merchants can connect their personal WhatsApp number and send marketing messages to customers. The architecture is three-part: (1) a settings page where the merchant scans a Maytapi QR code to link their WhatsApp number, (2) three API routes that wrap the Maytapi REST API (connect, status, send), and (3) a new "WhatsApp" tab added to the existing `/dashboard/notifications` page.

The Maytapi REST API uses a single base URL (`https://api.maytapi.com/api/{product_id}`) with an `x-maytapi-key` header for auth. The product_id and API token are global credentials owned by Zale Marketing (stored as Vercel env vars `MAYTAPI_PRODUCT_ID` and `MAYTAPI_API_TOKEN`). Each merchant gets their own `phone_id` when they connect a WhatsApp session — this phone_id is stored in the `merchants` table.

The 200-message daily limit must be enforced server-side (in the `/api/whatsapp/send` route) using a `maytapi_daily_count` counter and `maytapi_last_reset_date` column on the `merchants` table. The Maytapi QR code flow is: call `GET /{phone_id}/qrCode` which returns binary image data — this must be proxied from the Next.js API route and rendered as an `<img>` tag in the frontend.

**Primary recommendation:** Use Maytapi's `/{phone_id}/sendMessage` endpoint with `type: "text"` for all message sends. Store `phone_id`, `session_status`, `daily_count`, and `last_reset_date` on the merchants row. Proxy QR code image through the Next.js API route to avoid CORS issues.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WA-01 | Colonne `maytapi_phone_id` e `maytapi_session_status` aggiunte a tabella merchants | SQL migration pattern from MANUAL-ACTIONS.md — add 4 columns: phone_id, session_status, daily_count, last_reset_date |
| WA-02 | Pagina /dashboard/settings/whatsapp con QR code Maytapi e conferma sessione attiva | Maytapi `GET /{phone_id}/qrCode` returns binary PNG — proxy via Next.js API, poll `GET /{phone_id}/status` for "active" status |
| WA-03 | API routes POST /api/whatsapp/connect, GET /api/whatsapp/status, POST /api/whatsapp/send | Full endpoint specs confirmed from Maytapi OpenAPI spec — request/response formats documented below |
| WA-04 | Tab "WhatsApp" in /dashboard/notifications accanto a "Push Notification" | notifications/page.tsx uses single-section layout — needs tab state (activeTab: 'push' | 'whatsapp') with conditional render |
| WA-05 | Rate limiting max 200 messaggi/giorno per numero WhatsApp — client-side e server-side | Server-side: check/increment merchants.maytapi_daily_count with date reset; client-side: read count from /api/whatsapp/status response |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js API Routes | 14+ (already installed) | Proxy Maytapi calls server-side | Keeps API token out of browser, same pattern as /api/wallet and /api/send-notification |
| Supabase JS | already installed | Read/write merchants table for phone_id, daily_count | Already used throughout project |
| node fetch / built-in fetch | Node 18+ | Call Maytapi REST API from API routes | No additional dependency needed — Next.js runtime has fetch |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| usePlan hook | existing (lib/hooks/usePlan.ts) | Gate WhatsApp feature to PRO plan | Already exists — import and use directly |
| UpgradePrompt component | existing (components/ui/UpgradePrompt.tsx) | Show upgrade CTA for FREE plan users | Already exists — import and use |
| Lucide React | already installed | MessageCircle, Wifi, WifiOff icons for WhatsApp UI | Already used throughout dashboard |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct Maytapi API from browser | Proxy via Next.js API route | Direct would expose MAYTAPI_API_TOKEN in browser — never acceptable |
| Polling for QR code status (setInterval) | Webhook from Maytapi | Webhook requires public URL setup — polling simpler for MVP, 3s interval is fine |
| Separate daily_count table | Column on merchants | Simpler for single-merchant-per-row model, sufficient for 200/day limit |

**Installation:** No new packages needed. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure
```
app/
├── api/
│   └── whatsapp/
│       ├── connect/route.ts     # POST — creates Maytapi session, stores phone_id
│       ├── status/route.ts      # GET — checks session status + returns daily_count
│       └── send/route.ts        # POST — sends message(s) with rate limit enforcement
├── dashboard/
│   ├── settings/
│   │   └── whatsapp/
│   │       └── page.tsx         # QR code setup page
│   └── notifications/
│       └── page.tsx             # MODIFIED — add WhatsApp tab
```

### Pattern 1: Maytapi API Route Proxy
**What:** All Maytapi calls go through Next.js API routes using SUPABASE_SERVICE_ROLE_KEY for merchant lookup and MAYTAPI_API_TOKEN for Maytapi auth.
**When to use:** Every Maytapi interaction — QR fetch, status check, message send.

```typescript
// Source: Maytapi OpenAPI spec (https://maytapi.com/documentations/maytapi_doc.json)
// Pattern for calling Maytapi from a Next.js API route
const MAYTAPI_BASE = `https://api.maytapi.com/api/${process.env.MAYTAPI_PRODUCT_ID}`

async function callMaytapi(path: string, options: RequestInit = {}) {
  const res = await fetch(`${MAYTAPI_BASE}${path}`, {
    ...options,
    headers: {
      'x-maytapi-key': process.env.MAYTAPI_API_TOKEN!,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return res
}
```

### Pattern 2: Connect Flow (addPhone + store phone_id)
**What:** When merchant clicks "Connetti WhatsApp", the API route calls `POST /addPhone` to get a phone_id, stores it in merchants table, then returns the phone_id. The frontend then fetches the QR code via `/api/whatsapp/status`.
**When to use:** WA-02 implementation.

```typescript
// Source: Maytapi OpenAPI spec
// POST /api/whatsapp/connect
// Step 1: Create phone in Maytapi
const addRes = await callMaytapi('/addPhone', { method: 'POST', body: JSON.stringify({}) })
const addData = await addRes.json()
const phoneId = addData.id  // or addData.pid depending on response shape

// Step 2: Store phone_id in merchants table
await supabase
  .from('merchants')
  .update({ maytapi_phone_id: phoneId, maytapi_session_status: 'pending' })
  .eq('id', merchantId)

// Step 3: Return phone_id to frontend
return NextResponse.json({ phoneId })
```

### Pattern 3: QR Code Proxy (binary image)
**What:** Maytapi `GET /{phone_id}/qrCode` returns binary PNG. The Next.js route proxies it with correct Content-Type.
**When to use:** WA-02 — rendering QR code in the settings page.

```typescript
// Source: Maytapi OpenAPI spec
// GET /api/whatsapp/status?action=qr — proxy QR image
const qrRes = await callMaytapi(`/${phoneId}/qrCode`)
const buffer = await qrRes.arrayBuffer()
return new Response(buffer, {
  headers: {
    'Content-Type': 'image/png',
    'Cache-Control': 'no-store',
  },
})

// Frontend usage:
// <img src="/api/whatsapp/status?action=qr" alt="QR Code" />
// Poll every 3 seconds with timestamp to avoid browser cache:
// <img src={`/api/whatsapp/status?action=qr&t=${Date.now()}`} />
```

### Pattern 4: Session Status Check
**What:** `GET /{phone_id}/status` returns `{ success, data: Status }`. The `Status.status` field is one of: `"active"`, `"qr-code"`, `"idle"`, `"phone-error"`.
**When to use:** Poll every 3s on settings page to detect when scan completes.

```typescript
// Source: Maytapi OpenAPI spec + Maytapi docs webhook event types
// GET /api/whatsapp/status?action=status
const statusRes = await callMaytapi(`/${phoneId}/status`)
const statusData = await statusRes.json()
// statusData.data.status = 'active' | 'qr-code' | 'idle' | 'phone-error'

// When status becomes 'active': update merchants table
await supabase
  .from('merchants')
  .update({ maytapi_session_status: 'active' })
  .eq('id', merchantId)
```

### Pattern 5: Send Message with Rate Limiting
**What:** Server-side daily counter check before calling Maytapi `POST /{phone_id}/sendMessage`.
**When to use:** WA-03, WA-05 — `/api/whatsapp/send` route.

```typescript
// Source: Maytapi OpenAPI spec
// Daily reset logic
const today = new Date().toISOString().split('T')[0]  // 'YYYY-MM-DD'
const needsReset = merchant.maytapi_last_reset_date !== today
const currentCount = needsReset ? 0 : (merchant.maytapi_daily_count || 0)

if (currentCount >= 200) {
  return NextResponse.json(
    { error: 'Limite giornaliero raggiunto. Riprova domani.' },
    { status: 429 }
  )
}

// Send via Maytapi
const sendRes = await callMaytapi(`/${phoneId}/sendMessage`, {
  method: 'POST',
  body: JSON.stringify({
    to_number: customerPhone,  // include country code: '393331234567'
    type: 'text',
    message: messageText,
  }),
})

// Increment counter
await supabase
  .from('merchants')
  .update({
    maytapi_daily_count: currentCount + 1,
    maytapi_last_reset_date: today,
  })
  .eq('id', merchantId)
```

### Pattern 6: Tab UI in Notifications Page
**What:** Add tab state to existing notifications page — toggle between Push and WhatsApp sections.
**When to use:** WA-04 implementation.

```typescript
// Add to notifications/page.tsx (existing file)
const [activeTab, setActiveTab] = useState<'push' | 'whatsapp'>('push')

// Tab buttons:
// <button onClick={() => setActiveTab('push')}>Push Notification</button>
// <button onClick={() => setActiveTab('whatsapp')}>WhatsApp</button>

// Conditional render:
// {activeTab === 'push' && <PushSection />}
// {activeTab === 'whatsapp' && <WhatsAppSection />}
```

### Anti-Patterns to Avoid
- **Calling Maytapi directly from the browser:** Exposes `MAYTAPI_API_TOKEN` — always proxy through `/api/whatsapp/*` routes.
- **Storing Maytapi tokens per-merchant in the DB:** The product_id and API token belong to Zale Marketing, not individual merchants. Only `phone_id` is merchant-specific.
- **Nested Supabase queries in API routes:** Follow existing project pattern — use separate sequential queries (CLAUDE.md rule).
- **Blocking the UI during bulk send:** Send in batches of 10 like the existing push notification system in `notifications/page.tsx`.
- **Relying on client-only rate limit:** Client-side count display is UX only — server-side enforcement is the real gate.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WhatsApp messaging protocol | Custom WhatsApp client | Maytapi API | WhatsApp does not have a public API — requires approved provider; ban risk if unofficial |
| QR code generation | Build QR generator | Maytapi `/{phone_id}/qrCode` endpoint | Maytapi owns the session and generates the correct auth QR |
| Phone number validation | Custom regex | Maytapi `POST /{phone_id}/checkPhones` | Validates whether a number has WhatsApp — optional but available |
| Daily reset logic | Cron job | Simple date comparison on request | `today !== last_reset_date` check on every send request is sufficient — no cron needed |

**Key insight:** Maytapi handles all WhatsApp protocol complexity. The integration is pure REST API calls — no WebSocket, no library, no SDK needed beyond `fetch`.

---

## Common Pitfalls

### Pitfall 1: phone_id vs product_id Confusion
**What goes wrong:** Developer confuses MAYTAPI_PRODUCT_ID (the Zale Marketing account) with phone_id (the merchant's WhatsApp session). Wrong ID used in API path.
**Why it happens:** Both are IDs, both stored/used, easy to mix up.
**How to avoid:** PRODUCT_ID goes in the base URL path; phone_id goes in per-request paths. Env var name `MAYTAPI_PRODUCT_ID` is used only in base URL construction. `phone_id` always comes from the merchants table.
**Warning signs:** Maytapi returns 404 or "phone not found" errors.

### Pitfall 2: QR Code Caching
**What goes wrong:** Browser caches the QR code image, user sees stale QR that's already been consumed.
**Why it happens:** Browsers cache GET requests with same URL aggressively.
**How to avoid:** Append `?t=${Date.now()}` to the QR image URL when rendering. Also set `Cache-Control: no-store` in the proxy response headers.
**Warning signs:** QR code doesn't refresh, user scans successfully but app shows still-loading state.

### Pitfall 3: Italian Phone Number Format
**What goes wrong:** Customer phone stored as `333 123 4567` (Italian local format) — Maytapi requires country code, no spaces: `393331234567`.
**Why it happens:** Users enter numbers in local format; DB stores as-is.
**How to avoid:** Normalize in the send route: strip spaces/dashes, prepend `39` if number starts with `3` (Italian mobile) or `0` (Italian landline → skip or error).
**Warning signs:** Maytapi returns success but message not received; or `to_number` validation error.

```typescript
// Normalize Italian phone number for Maytapi
function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  if (cleaned.startsWith('39')) return cleaned  // already has country code
  if (cleaned.startsWith('+39')) return cleaned.slice(1)  // remove +
  if (cleaned.startsWith('0039')) return cleaned.slice(2)  // remove 00
  if (cleaned.match(/^[3][0-9]{9}$/)) return `39${cleaned}` // Italian mobile
  return null  // can't normalize — skip this recipient
}
```

### Pitfall 4: Session Expiry After Initial Setup
**What goes wrong:** Merchant links WhatsApp, everything works, then weeks later the session expires (WhatsApp logged out). Status shows "idle" or "phone-error" but merchant doesn't know.
**Why it happens:** WhatsApp sessions can expire if the phone is off for too long or WhatsApp is updated.
**How to avoid:** On the settings page, show current `maytapi_session_status` prominently. If status is not "active", show reconnect instructions. The `/api/whatsapp/status` route should always refresh status from Maytapi and update the DB.
**Warning signs:** `maytapi_session_status` in DB is "active" but Maytapi API returns "idle" — divergence means the status poll stopped working.

### Pitfall 5: No Phone Number for Customer = Silent Skip
**What goes wrong:** Many card_holders may not have a `phone` value — the send route skips them silently but merchant thinks all recipients got the message.
**Why it happens:** Phone field is optional in the join form.
**How to avoid:** Before sending, query count of card_holders WITH phone numbers for the selected segment. Show that count in the UI as "X clienti con numero WhatsApp" vs the push notification count.
**Warning signs:** Merchant sends to "50 customers" but only 20 messages sent by Maytapi.

### Pitfall 6: Bulk Send Rate
**What goes wrong:** Sending 200 messages in a tight loop triggers Maytapi queue overload or WhatsApp temporary ban.
**Why it happens:** Rapid sequential sends look like spam.
**How to avoid:** Maytapi has built-in queue management (`/{phone_id}/queue`). Use the same batch-of-10 pattern as the existing push notification system. Add a small delay (200ms) between batches. The 200/day hard limit also naturally prevents abuse.
**Warning signs:** Maytapi returns queue-full errors or messages delivered out of order.

---

## Code Examples

### Full sendMessage Request
```typescript
// Source: Maytapi OpenAPI spec (https://maytapi.com/documentations/maytapi_doc.json)
const response = await fetch(
  `https://api.maytapi.com/api/${productId}/${phoneId}/sendMessage`,
  {
    method: 'POST',
    headers: {
      'x-maytapi-key': apiToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to_number: '393331234567',  // country code + number, no spaces
      type: 'text',
      message: 'Ciao! Oggi -20% su tutto. Vieni a trovarci!',
    }),
  }
)
const data = await response.json()
// data = { success: true, data: { chatId: '393331234567@c.us', msgId: 'BAE5...' } }
```

### Status Check Response Shape
```typescript
// Source: Maytapi OpenAPI spec
// GET https://api.maytapi.com/api/{productId}/{phoneId}/status
// Response:
{
  success: true,
  data: {
    status: 'active' | 'qr-code' | 'idle' | 'phone-error'
    // 'active'      = WhatsApp connected, ready to send
    // 'qr-code'     = waiting for QR scan
    // 'idle'        = session not started
    // 'phone-error' = connection lost
  }
}
```

### Polling Pattern (Frontend Settings Page)
```typescript
// Source: Pattern from existing /api/wallet-update polling in project
useEffect(() => {
  if (sessionStatus === 'active') return  // stop polling
  const interval = setInterval(async () => {
    const res = await fetch('/api/whatsapp/status?action=status')
    const data = await res.json()
    setSessionStatus(data.status)
    if (data.status === 'active') {
      clearInterval(interval)
    }
  }, 3000)
  return () => clearInterval(interval)
}, [sessionStatus])
```

### SQL Migration (for MANUAL-ACTIONS.md)
```sql
-- Add Maytapi columns to merchants table
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS maytapi_phone_id text,
  ADD COLUMN IF NOT EXISTS maytapi_session_status text DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS maytapi_daily_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maytapi_last_reset_date date;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Official WhatsApp Business API (Meta) | Third-party providers like Maytapi | Meta gated official API (requires business verification) | Maytapi is the pragmatic choice for SMBs who want quick setup without Meta approval process |
| WhatsApp Web scraping (baileys) | Maytapi REST API | 2022-2023 ban wave | Scraping risks account bans — Maytapi uses official WhatsApp Web protocol with managed sessions |
| Storing QR in DB | Fetching QR on-demand from Maytapi | n/a | QR codes are time-limited — always fetch fresh from Maytapi, never cache |

**Deprecated/outdated:**
- `whatsapp-web.js` / `baileys` direct use: Account ban risk, not suitable for production SaaS
- Meta Cloud API for this use case: Requires business verification + approved templates for marketing messages — over-engineered for this MVP

---

## Open Questions

1. **Maytapi addPhone response shape: is the phone_id field called `id` or `pid`?**
   - What we know: The Maytapi OpenAPI spec shows `pid` in some contexts, `id` in others
   - What's unclear: Exact field name in `POST /addPhone` response for the new phone's ID
   - Recommendation: In the connect route, check both `data.id` and `data.pid` — log the full response on first call; also available via `GET /listPhones` which lists existing phones

2. **Does Maytapi require one phone_id per merchant or can we reuse one?**
   - What we know: Maytapi charges per phone instance; each phone_id is one WhatsApp number
   - What's unclear: Whether the project's Maytapi account (PRODUCT_ID) has a limit on how many phone_ids can be created
   - Recommendation: Each merchant who connects WhatsApp gets their own phone_id — this is the correct model and aligns with requirement WA-01 storing phone_id per merchant

3. **Maytapi free tier or trial available?**
   - What we know: Maytapi has a trial period mentioned on their site
   - What's unclear: Whether Alessandro has already created a Maytapi account and has PRODUCT_ID + API_TOKEN ready
   - Recommendation: Document in MANUAL-ACTIONS.md that Alessandro must: (a) create Maytapi account, (b) note PRODUCT_ID and API_TOKEN from console.maytapi.com/settings/token, (c) add to Vercel env vars

---

## DB Migration (MANUAL-ACTIONS.md Entry)

This SQL must be added to MANUAL-ACTIONS.md as a manual step for Phase 10:

```sql
-- Phase 10: WhatsApp Marketing — Add Maytapi columns to merchants
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS maytapi_phone_id text,
  ADD COLUMN IF NOT EXISTS maytapi_session_status text DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS maytapi_daily_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maytapi_last_reset_date date;
```

**Vercel Environment Variables to add:**
- `MAYTAPI_PRODUCT_ID` — from console.maytapi.com/settings/token
- `MAYTAPI_API_TOKEN` — from console.maytapi.com/settings/token

---

## Sources

### Primary (HIGH confidence)
- `https://maytapi.com/documentations/maytapi_doc.json` — Full OpenAPI/Swagger spec; all endpoint paths, HTTP methods, request/response schemas confirmed
- Maytapi official documentation page — Authentication header (`x-maytapi-key`), base URL pattern (`https://api.maytapi.com/api/{product_id}`), QR code flow

### Secondary (MEDIUM confidence)
- `https://maytapi.com/whatsapp-api-documentation` — Feature list and status types (`active`, `qr-code`, `idle`, `phone-error`) confirmed
- `https://github.com/maytapi-com` — Config variable names (PRODUCT_ID, PHONE_ID, API_TOKEN) confirmed from Node.js example repo

### Tertiary (LOW confidence)
- Italian phone number normalization rules: Based on Italian numbering plan knowledge (country code 39, mobile starts with 3) — verify against actual customer data

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All dependencies already installed, Maytapi API spec retrieved directly
- Architecture: HIGH — Patterns follow existing project conventions (API route proxy, batch sends, service role key)
- Pitfalls: MEDIUM — Phone normalization and session expiry based on WhatsApp behavior knowledge; Maytapi-specific edge cases flagged as open questions
- Maytapi API endpoints: HIGH — Retrieved from official OpenAPI spec JSON

**Research date:** 2026-03-03
**Valid until:** 2026-09-03 (Maytapi REST API is stable; check for breaking changes if implementing after 6 months)
