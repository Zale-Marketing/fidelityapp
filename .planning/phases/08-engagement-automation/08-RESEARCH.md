# Phase 8: Engagement Automation - Research

**Researched:** 2026-03-03
**Domain:** Client segmentation UI, Vercel Cron, Google Wallet push notifications
**Confidence:** HIGH

## Summary

Phase 8 adds two independent feature clusters: (1) client segmentation with bulk actions in `/dashboard/cards`, and (2) birthday automation via a Vercel Cron job. Both clusters build on infrastructure that already exists in this codebase — the Google Wallet `addMessage` push mechanism (`/api/send-notification`), the `card_holders` table, the `cards` table with `last_use_date`, and the `/dashboard/notifications` page bulk-send logic.

The segmentation work (SEG-01..03) is entirely frontend: a new `/dashboard/cards` page that reads `cards.updated_at` (or `last_use_date`) to classify holders as Attivi (activity within 30 days), Dormienti (31-90 days), or Persi (>90 days). It adds filter tabs with counts and a checkbox-driven bulk-send flow that calls the existing `/api/send-notification` endpoint. No new API routes are needed for SEG.

The birthday automation (BDAY-01..04) requires: one SQL migration (add `birth_date date nullable` to `card_holders`), one input field added to `/join/[programId]/page.tsx`, and a new server-side API route `/api/cron/birthday` secured with a `CRON_SECRET` header and triggered by Vercel Cron on a daily schedule declared in `vercel.json`. The notification mechanism is the identical `addMessage TEXT_AND_NOTIFY` call already working in `send-notification`.

**Primary recommendation:** Build SEG first (pure UI, no migration risk), then BDAY (requires migration + Vercel Cron setup, documented in MANUAL-ACTIONS.md as per project convention).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEG-01 | Merchant vede filtri Tutti / Attivi (ultimi 30gg) / Dormienti (30-90gg) / Persi (>90gg) in /dashboard/cards con conteggio per ogni segmento | `cards.updated_at` or `last_use_date` already exists; filter computation is client-side after loading all active cards |
| SEG-02 | Merchant seleziona clienti in bulk (checkbox per riga + seleziona tutti) | Standard React state pattern; no new infra needed |
| SEG-03 | Merchant invia notifica push o messaggio WhatsApp ai clienti selezionati in bulk | Reuses existing `/api/send-notification` exactly as `/dashboard/notifications` does today |
| BDAY-01 | Cliente vede campo data di nascita opzionale nel form iscrizione /join/[programId] | Add `<input type="date">` to existing join form; maps to `birth_date` column |
| BDAY-02 | Colonna birth_date (type date, nullable) aggiunta a tabella card_holders | Manual SQL: `ALTER TABLE card_holders ADD COLUMN birth_date date;` — already partially modeled in lib/types.ts CardHolder type |
| BDAY-03 | Cron job in vercel.json esegue /api/cron/birthday ogni giorno alle 09:00 UTC | Vercel Cron: `"crons": [{ "path": "/api/cron/birthday", "schedule": "0 9 * * *" }]` in vercel.json |
| BDAY-04 | Route /api/cron/birthday trova card_holders con birth_date = oggi e invia notifica push TEXT_AND_NOTIFY personalizzata | Server-side GET route using SUPABASE_SERVICE_ROLE_KEY; date comparison in Postgres; calls addMessage via getAuthClient() from lib/google-wallet.ts |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.6 (installed) | API routes + pages | Already in use |
| @supabase/supabase-js | 2.93.2 (installed) | DB queries | Already in use |
| google-auth-library | 10.5.0 (installed) | Google Wallet auth | Already in use — `getAuthClient()` exported from lib/google-wallet.ts |
| lucide-react | 0.576.0 (installed) | Icons for filter tabs + checkbox UI | Project-wide standard (DESIGN-01) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vercel Cron | (platform feature) | Schedule cron job | BDAY-03 — declare in vercel.json, no npm install |
| TypeScript date utils | (built-in) | Birthday date comparison | Use JS Date arithmetic, no library needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel Cron | pg_cron (Supabase) | pg_cron requires Supabase paid plan and direct DB function; Vercel Cron is declared in vercel.json, simpler for this stack |
| Client-side segment filtering | Supabase RPC | Client-side is simpler and works fine at expected scale (<10K cards per merchant) |
| `CRON_SECRET` env var | IP allowlist | Env var is the Vercel-recommended pattern for cron route auth |

**Installation:** No new packages needed. All required libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── dashboard/
│   └── cards/
│       └── page.tsx          # NEW: segmentation page (SEG-01..03)
├── api/
│   └── cron/
│       └── birthday/
│           └── route.ts      # NEW: birthday cron handler (BDAY-03..04)
├── join/
│   └── [programId]/
│       └── page.tsx          # MODIFY: add birth_date field (BDAY-01)
vercel.json                   # CREATE: cron schedule declaration (BDAY-03)
```

### Pattern 1: Segment Classification Logic

**What:** Derive segment from `last_use_date` (or `updated_at`) column on `cards`. Load all active cards for merchant, join to `card_holders`, then classify by days-since-last-activity.

**When to use:** On page load in `/dashboard/cards`. Recompute counts when cards load.

**Source columns:** `cards.last_use_date` (type `date`) and `cards.updated_at` (type `timestamp`). Per CLAUDE.md, `last_use_date` is the canonical "last activity" field.

```typescript
// Classification logic — runs client-side after cards load
const now = new Date()

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity
  return Math.floor((now.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function getSegment(card: CardWithHolder): 'active' | 'dormant' | 'lost' {
  const days = daysSince(card.last_use_date || card.updated_at)
  if (days <= 30) return 'active'
  if (days <= 90) return 'dormant'
  return 'lost'
}
```

### Pattern 2: Bulk Checkbox Selection

**What:** Track selected card IDs in a `Set<string>` state. Provide "select all visible" logic that only selects the current filtered segment.

**When to use:** SEG-02. Standard React controlled component pattern — no library needed.

```typescript
// Source: project convention (existing notifications page uses similar pattern)
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

function toggleAll(cardIds: string[]) {
  if (cardIds.every(id => selectedIds.has(id))) {
    setSelectedIds(new Set())
  } else {
    setSelectedIds(new Set(cardIds))
  }
}

function toggleOne(id: string) {
  const next = new Set(selectedIds)
  next.has(id) ? next.delete(id) : next.add(id)
  setSelectedIds(next)
}
```

### Pattern 3: Bulk Notification Send

**What:** Call existing `/api/send-notification` in batches of 10 for selected card IDs. Reuse exact pattern from `/dashboard/notifications/page.tsx` (lines 233-244).

**When to use:** SEG-03 — "Invia Notifica" button.

```typescript
// Source: /dashboard/notifications/page.tsx (existing pattern)
const batchSize = 10
const ids = Array.from(selectedIds)
for (let i = 0; i < ids.length; i += batchSize) {
  const batch = ids.slice(i, i + batchSize)
  await Promise.allSettled(
    batch.map(cardId =>
      fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, message, header: 'Messaggio speciale' })
      })
    )
  )
}
```

### Pattern 4: Vercel Cron + Secure API Route

**What:** Declare cron schedule in `vercel.json`. Protect the route with a secret header check. Use SUPABASE_SERVICE_ROLE_KEY server-side to bypass RLS.

**When to use:** BDAY-03 and BDAY-04.

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/birthday",
      "schedule": "0 9 * * *"
    }
  ]
}
```

```typescript
// app/api/cron/birthday/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthClient } from '@/lib/google-wallet'

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || ''

export async function GET(request: NextRequest) {
  // Vercel sets Authorization: Bearer CRON_SECRET automatically for cron routes
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find card_holders with birthday today
  // Postgres: EXTRACT(month FROM birth_date) / EXTRACT(day FROM birth_date)
  const today = new Date()
  const month = today.getUTCMonth() + 1
  const day = today.getUTCDate()

  // Query: match month AND day regardless of year
  const { data: holders, error } = await supabase
    .from('card_holders')
    .select('id, full_name')
    .not('birth_date', 'is', null)
    // Use Supabase filter with Postgres date functions (see pitfall below)
    // Alternative safe approach: fetch all with birth_date not null, filter in JS
    // Preferred for reliability at this scale:

  // ... filter in JS:
  // holders.filter(h => {
  //   const bd = new Date(h.birth_date)
  //   return bd.getUTCMonth() + 1 === month && bd.getUTCDate() === day
  // })

  // For each matching holder, find their active cards and send notification
  const client = await getAuthClient()
  // ... send addMessage for each card
}
```

**Note:** The Supabase JS client does not have a built-in `EXTRACT()` filter method. Two reliable approaches:
1. Fetch all non-null `birth_date` holders and filter in JavaScript (correct at <50K rows).
2. Use a Supabase RPC (stored function) for the date match. Approach 1 is simpler and avoids migration complexity.

### Pattern 5: Birthday Date Comparison (Supabase)

**What:** Match `birth_date` where month and day equal today's UTC month and day.

**Reliable approach for this codebase:**

```typescript
// Load all holders with birth_date, filter in JS
const { data: allHolders } = await supabase
  .from('card_holders')
  .select('id, full_name, birth_date')
  .not('birth_date', 'is', null)

const todayMonth = today.getUTCMonth() + 1  // 1-12
const todayDay = today.getUTCDate()

const birthdayHolders = (allHolders || []).filter(h => {
  const bd = new Date(h.birth_date!)
  return (bd.getUTCMonth() + 1) === todayMonth && bd.getUTCDate() === todayDay
})
```

**Why JS filter instead of DB query:** Supabase JS SDK `.filter()` supports raw Postgres expressions via `.filter('EXTRACT(month FROM birth_date)', 'eq', month)` but this syntax is fragile and not documented as stable. JS filter is safe, readable, and works at expected scale (merchants with <10K card holders).

### Anti-Patterns to Avoid

- **Querying nested relations in the cron route:** Use separate queries. `card_holders` then `cards` filtered by `card_holder_id`. Do not use nested select like `.select('*, cards(*)')` in production API routes — this pattern caused bugs noted in CLAUDE.md.
- **Calling cron route from browser without secret:** The `CRON_SECRET` check must be the first thing in the route handler.
- **Using `Date.now()` locale for birthday comparison:** Always use UTC methods (`getUTCMonth`, `getUTCDate`) to avoid timezone off-by-one errors when the cron runs at 09:00 UTC.
- **Blocking on failed wallet notifications in cron:** Wrap each `addMessage` in try/catch and continue on error — same pattern as `updateWalletCard` in `lib/google-wallet.ts` (lines 693-709).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push notification to Google Wallet | Custom HTTP client | `getAuthClient()` from `lib/google-wallet.ts` + `addMessage` POST | Already handles auth token refresh, error codes (404 = not in wallet, 429 = quota) |
| Cron scheduling | Custom scheduler | Vercel Cron in `vercel.json` | Platform-native, zero maintenance, no extra infra |
| Bulk send batching | Custom queue | `Promise.allSettled` in batches of 10 | Already proven in `/dashboard/notifications` |
| Supabase server access in cron | Anon key queries | `SUPABASE_SERVICE_ROLE_KEY` client | Bypasses RLS for server-side batch operations |

**Key insight:** All notification infrastructure is already built. Phase 8 is wiring existing pieces together in new contexts (segmented list view + cron trigger), not building new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Missing `last_use_date` Data
**What goes wrong:** Many cards may have `last_use_date = null` (never scanned), making their segment ambiguous.
**Why it happens:** `last_use_date` is set on scan, but cards created via `/join` start with no activity.
**How to avoid:** Treat `null` as "never active" — use `card.created_at` as fallback date for new cards, OR classify `null last_use_date` as segment based on `created_at` age.
**Warning signs:** All new sign-ups appear as "Persi" immediately after joining.

```typescript
// Safe: fall back to created_at if last_use_date is null
function daysSince(card: Card): number {
  const dateStr = card.last_use_date || card.created_at
  if (!dateStr) return 0  // brand new card
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}
```

### Pitfall 2: Vercel Cron Requires Pro Plan
**What goes wrong:** Cron does not fire on Vercel Hobby plan.
**Why it happens:** Vercel Cron is a Pro+ feature (as of early 2026).
**How to avoid:** Document in MANUAL-ACTIONS.md. The cron route itself works fine — it can also be triggered manually via curl for testing.
**Warning signs:** No birthday notifications ever sent; Vercel dashboard shows no cron executions.

### Pitfall 3: Birthday Match Off By One Day
**What goes wrong:** Cron fires at 09:00 UTC but `birth_date` stored as `YYYY-MM-DD` is compared against local date.
**Why it happens:** `new Date('1990-03-03')` parses as midnight UTC, but `new Date().getMonth()` uses local timezone.
**How to avoid:** Always use `getUTCMonth()` and `getUTCDate()` when comparing against date-only strings.

### Pitfall 4: `CRON_SECRET` Not Set in Vercel
**What goes wrong:** Route returns 401 for every cron invocation.
**Why it happens:** Env var not added to Vercel dashboard.
**How to avoid:** Document in MANUAL-ACTIONS.md. During development, can set to any string; Vercel automatically adds the Authorization header for cron requests.

### Pitfall 5: Segment Filter Tab Shows Wrong Counts
**What goes wrong:** Counts don't match visible rows after filtering.
**Why it happens:** Count is computed from all cards but display is filtered by a search input.
**How to avoid:** Compute segment counts from the full unfiltered card list; search filter applies on top of the segment filter. Keep two separate derived arrays: `segmentedCards` (segment-filtered) and `displayedCards` (search-filtered from segmentedCards).

### Pitfall 6: No `/dashboard/cards` Page Exists Yet
**What goes wrong:** Planner assumes the page exists — it does NOT. The glob `app/dashboard/cards/**` returns no files.
**Why it happens:** Current dashboard has `/dashboard/customers` for client list but no `/dashboard/cards`.
**How to avoid:** Wave 0 must CREATE `app/dashboard/cards/page.tsx` from scratch. The existing `/dashboard/customers/page.tsx` provides the structural reference but is a different page for a different purpose.

### Pitfall 7: `card_holders.birth_date` Column Does Not Exist Yet
**What goes wrong:** `/join` form inserts `birth_date` but column is missing — Supabase returns error.
**Why it happens:** BDAY-02 is an explicit SQL migration requirement.
**How to avoid:** SQL migration must run before BDAY-01 or BDAY-04 code is deployed. Document in MANUAL-ACTIONS.md:
```sql
ALTER TABLE card_holders ADD COLUMN IF NOT EXISTS birth_date date;
```
Note: `lib/types.ts` `CardHolder` type already has `birth_date: string | null` — the type is ready, only the DB column is missing.

---

## Code Examples

### Segment Filter Tabs (SEG-01)

```typescript
// Source: project pattern — matches DESIGN-06 button style
type Segment = 'all' | 'active' | 'dormant' | 'lost'
const SEGMENT_LABELS: Record<Segment, string> = {
  all: 'Tutti',
  active: 'Attivi',
  dormant: 'Dormienti',
  lost: 'Persi',
}

// Counts computed from full card list
const counts: Record<Segment, number> = {
  all: cards.length,
  active: cards.filter(c => getSegment(c) === 'active').length,
  dormant: cards.filter(c => getSegment(c) === 'dormant').length,
  lost: cards.filter(c => getSegment(c) === 'lost').length,
}

// Tab rendering — consistent with DESIGN-06 secondary button style
{(['all', 'active', 'dormant', 'lost'] as Segment[]).map(seg => (
  <button
    key={seg}
    onClick={() => setActiveSegment(seg)}
    className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
      activeSegment === seg
        ? 'bg-[#111111] text-white'
        : 'border border-[#E0E0E0] text-gray-700 hover:bg-[#F5F5F5]'
    }`}
  >
    {SEGMENT_LABELS[seg]} ({counts[seg]})
  </button>
))}
```

### Supabase Query for `/dashboard/cards` Page

```typescript
// Source: project convention — separate queries, no nesting
// Load cards with card_holder data for the merchant
const { data: cards } = await supabase
  .from('cards')
  .select('id, last_use_date, updated_at, created_at, status, card_holder_id, program_id')
  .eq('merchant_id', merchantId)
  .eq('status', 'active')
  .not('card_holder_id', 'is', null)
  .order('created_at', { ascending: false })

// Separate query for card_holders
const holderIds = [...new Set(cards?.map(c => c.card_holder_id) || [])]
const { data: holders } = await supabase
  .from('card_holders')
  .select('id, full_name, email, phone, birth_date')
  .in('id', holderIds)
```

### Birthday Cron Route Structure

```typescript
// Source: project convention — server-side with service role key
// app/api/cron/birthday/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthClient } from '@/lib/google-wallet'

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || ''

export async function GET(request: NextRequest) {
  // 1. Auth check
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Find today's birthdays
  const today = new Date()
  const m = today.getUTCMonth() + 1
  const d = today.getUTCDate()

  const { data: allHolders } = await supabase
    .from('card_holders')
    .select('id, full_name, birth_date')
    .not('birth_date', 'is', null)

  const birthdayHolders = (allHolders || []).filter(h => {
    const bd = new Date(h.birth_date!)
    return (bd.getUTCMonth() + 1) === m && bd.getUTCDate() === d
  })

  if (birthdayHolders.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // 3. For each holder, find active cards
  const holderIds = birthdayHolders.map(h => h.id)
  const { data: cards } = await supabase
    .from('cards')
    .select('id, card_holder_id')
    .in('card_holder_id', holderIds)
    .eq('status', 'active')

  if (!cards || cards.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // 4. Map holder id → full_name for personalization
  const holderMap = new Map(birthdayHolders.map(h => [h.id, h.full_name]))

  // 5. Send birthday notification to each card
  const client = await getAuthClient()
  let sent = 0

  for (const card of cards) {
    const sanitizedId = card.id.replace(/-/g, '').substring(0, 32)
    const objectId = `${ISSUER_ID}.${sanitizedId}`
    const name = holderMap.get(card.card_holder_id) || 'Caro cliente'
    const firstName = name.split(' ')[0]

    try {
      await client.request({
        url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}/addMessage`,
        method: 'POST',
        data: {
          message: {
            header: 'Tanti auguri!',
            body: `Tanti auguri ${firstName}! Oggi hai un regalo speciale che ti aspetta.`,
            id: `bday_${today.toISOString().slice(0, 10)}_${card.id}`,
            messageType: 'TEXT_AND_NOTIFY',
          },
        },
      })
      sent++
    } catch (err: any) {
      // 404 = card not in wallet yet — skip silently
      if (err.code !== 404) {
        console.warn(`Birthday notif failed for card ${card.id}:`, err.message)
      }
    }
  }

  return NextResponse.json({ sent, total: cards.length })
}
```

### `vercel.json` Cron Declaration (BDAY-03)

```json
{
  "crons": [
    {
      "path": "/api/cron/birthday",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Birth Date Field in Join Form (BDAY-01)

```typescript
// Source: existing /join/[programId]/page.tsx pattern
// Add state
const [birthDate, setBirthDate] = useState('')

// Add field in form (after phone field, before submit button)
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Data di nascita <span className="text-gray-400 font-normal">(opzionale)</span>
  </label>
  <input
    type="date"
    value={birthDate}
    onChange={(e) => setBirthDate(e.target.value)}
    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent outline-none"
  />
</div>

// In handleSubmit, include in card_holder insert:
const { data: newHolder } = await supabase
  .from('card_holders')
  .insert({
    merchant_id: merchantId,
    full_name: fullName.trim(),
    email: email ? email.toLowerCase().trim() : null,
    phone: phone ? phone.trim() : null,
    birth_date: birthDate || null,   // ADD THIS
  })
  .select('id')
  .single()
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel Cron requires separate service | Vercel Cron built into vercel.json on Pro plan | Early 2023 GA | No extra infra needed for scheduled jobs |
| Google Wallet notifications via separate push service | `addMessage` REST API with `TEXT_AND_NOTIFY` type | Always supported | Already implemented in this codebase |
| Complex Supabase date queries | JS-side date filtering after fetch | Ongoing best practice for small datasets | Simpler, more readable, avoids fragile SQL in JS SDK |

**Deprecated/outdated:**
- **Nested Supabase select for joins:** Project explicitly forbids this in CLAUDE.md — always use separate queries.
- **Using anon key in server-side cron:** Must use SUPABASE_SERVICE_ROLE_KEY to bypass RLS.

---

## Open Questions

1. **Which column defines "last activity" for segmentation?**
   - What we know: `cards.last_use_date` (type `date`) is documented in CLAUDE.md and `cards.updated_at` (timestamp) also exists.
   - What's unclear: `last_use_date` may be null for cards never scanned; `updated_at` may reflect record changes unrelated to actual customer visits.
   - Recommendation: Use `last_use_date` as primary; fall back to `created_at` if null (treat brand-new cards as "Attivi" for 30 days from join).

2. **Does Vercel Cron require configuration beyond `vercel.json`?**
   - What we know: Vercel Cron requires Vercel Pro plan. The `CRON_SECRET` env var must be set in Vercel dashboard. Vercel automatically passes it as `Authorization: Bearer CRON_SECRET` header.
   - What's unclear: Whether project is on Vercel Pro. Document blocker in MANUAL-ACTIONS.md.
   - Recommendation: Build the route regardless; document the Pro plan requirement. If on Hobby, the route can be triggered manually or via a 3rd-party cron service pointing to the URL.

3. **Should `/dashboard/cards` replace or complement `/dashboard/customers`?**
   - What we know: `/dashboard/customers` manages card_holders (customer profiles). `/dashboard/cards` per SEG-01 requirement shows cards with activity segmentation. These are different views of different data.
   - What's unclear: Whether the Sidebar needs a new nav item for "Carte" vs adding segmentation to "Clienti".
   - Recommendation: Create as a new page `/dashboard/cards/page.tsx` as specified. Add sidebar link. The two pages can coexist — customers page = profile management, cards page = activity/segmentation.

---

## Manual Actions Required

The following must be documented in MANUAL-ACTIONS.md (project convention for all DB/env changes):

1. **SQL migration (BDAY-02):**
   ```sql
   ALTER TABLE card_holders ADD COLUMN IF NOT EXISTS birth_date date;
   ```
   Execute in Supabase SQL Editor before deploying BDAY code.

2. **Vercel env var:**
   ```
   CRON_SECRET=<any-random-string>
   ```
   Add to Vercel dashboard → Project Settings → Environment Variables.

3. **Vercel Pro plan:** Cron jobs require Vercel Pro plan. If on Hobby plan, cron will not fire automatically.

---

## Sources

### Primary (HIGH confidence)
- `lib/google-wallet.ts` — `getAuthClient()`, `addMessage` pattern, `sanitizeId()` function
- `app/api/send-notification/route.ts` — existing notification route, exact API call pattern
- `app/dashboard/notifications/page.tsx` — batch send pattern (batchSize=10, Promise.allSettled)
- `app/join/[programId]/page.tsx` — existing join form structure for BDAY-01 modification
- `lib/types.ts` — `CardHolder.birth_date: string | null` already typed (DB column missing)
- `CLAUDE.md` — DB schema (cards.last_use_date, cards.updated_at), project conventions

### Secondary (MEDIUM confidence)
- Vercel Cron documentation pattern (verified against common Vercel deployment knowledge): `vercel.json` crons array with `path` and `schedule` (cron expression); `CRON_SECRET` env var for route protection
- Supabase `.not('column', 'is', null)` filter syntax — standard Supabase JS SDK pattern

### Tertiary (LOW confidence — validate if issues arise)
- Exact Vercel plan requirements for Cron (Pro vs Hobby) — verify in Vercel dashboard

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; patterns already in use
- Architecture: HIGH — directly modeled on existing working code in this repo
- Pitfalls: HIGH — directly identified from CLAUDE.md project notes and code inspection
- Vercel Cron details: MEDIUM — standard pattern, but Pro plan requirement needs verification

**Research date:** 2026-03-03
**Valid until:** 2026-06-03 (stable APIs — Vercel Cron and Google Wallet addMessage are stable)
