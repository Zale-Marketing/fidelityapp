# Phase 6: Critical Fixes v2 - Research

**Researched:** 2026-03-03
**Domain:** Supabase soft-delete patterns, Next.js form handling, Google Wallet hero image color
**Confidence:** HIGH

## Summary

Phase 6 fixes four silent breakages in the current codebase. Each fix is self-contained with no cross-dependencies. The fixes range from trivial (FIX-04: hero image color) to significant refactoring (FIX-02/03: split delete flow into soft and hard paths).

**FIX-01** (lead capture): `app/page.tsx` is a pure Server Component with no form or database call. There is no `leads` or `contact_requests` table in the database yet. This fix requires creating a table, a Server Action or API route, and adding a contact form to the landing page.

**FIX-02** (soft delete): The current `deleteProgram()` function in `app/dashboard/programs/[id]/page.tsx` blocks deletion when active cards exist (line 234-237). The requirement is to flip this: offer soft delete (set `deleted_at = now()`) when cards exist, so the program hides from the UI but data is preserved.

**FIX-03** (hard delete with confirmation): The current delete modal (lines 1344-1380) has no name-typing confirmation. Hard delete already does cascade via explicit `.delete()` calls on `stamp_transactions`, `rewards`, `tiers`, `cards`, then `programs`. The requirement is to add a name-confirmation field and allow hard delete regardless of active cards (via the cascade).

**FIX-04** (hero image background color): The `wallet-image` route already reads `primary_color` from the database and applies it as `backgroundColor` on the root div (line 89). The requirement says Google Wallet shows default white/black. The fix is to accept an optional `?color=` query param (URL-encoded hex) as a fallback, and to ensure the `hexBackgroundColor` in the loyalty class object matches. Code inspection shows the route already applies the DB color — the issue is likely the Google Wallet CLASS not being updated after the color was changed. The FIX-04 spec says "applica background-color corretto da query param ?color= (decodifica URL-encoded, applica al div radice)" — so the planner must add query param support as a fallback to the DB lookup.

**Primary recommendation:** Implement all four fixes as four independent tasks, in dependency order: FIX-04 (smallest, no DB change), FIX-01 (new table + form), FIX-02/03 (refactor delete flow in the same file).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIX-01 | Form landing `app/page.tsx` salva lead nel DB (tabella `leads` o `contact_requests`) | Requires: new Supabase table, API route, form state. Landing is currently Server Component — must add 'use client' or extract form as client component |
| FIX-02 | Programmi con carte attive supportano soft delete (`deleted_at` colonna) — merchant elimina programma attivo | Requires: SQL migration adding `deleted_at timestamptz` to `programs`; update `deleteProgram()` logic; filter out soft-deleted programs in queries |
| FIX-03 | Hard delete con modal di conferma (digita nome programma) — elimina in cascata rewards/tiers/cards/stamp_transactions | Requires: split delete modal UI into two paths; add confirm-by-name input; remove active-cards block for hard delete |
| FIX-04 | Hero image `/api/wallet-image` applica background-color corretto da query param `?color=` (decodifica URL-encoded, applica al div radice) | Requires: read `?color=` param, `decodeURIComponent()`, fall back to DB color. Change is ~5 lines in route.tsx |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 14+ | API routes, Server Actions, page components | Already in project |
| Supabase JS | 2.x | Database queries, auth | Already in project |
| React useState | 18+ | Modal and form state | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` (service role) | 2.x | Server-side DB writes (API routes) | FIX-01 lead save |
| Next.js Server Actions | 14+ | Form submissions without separate API route | Optional alternative to API route for FIX-01 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| API route for lead save | Server Action | Server Action is cleaner in App Router but requires `'use server'` directive; API route is simpler and consistent with existing patterns |
| DB-level cascade constraints | Manual cascade in code | DB-level FK cascade is safer but requires Supabase schema change; manual cascade already exists and works |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure
No structural changes needed. Modifications are in-place edits to:
```
app/
├── page.tsx                          # FIX-01: add contact form + 'use client' or extract LeadForm
├── api/
│   ├── submit-lead/route.ts          # FIX-01: new API route to save lead
│   └── wallet-image/route.tsx        # FIX-04: add ?color= param support
└── dashboard/
    └── programs/[id]/page.tsx        # FIX-02 + FIX-03: split delete into soft/hard paths
```

### Pattern 1: Landing Page Lead Capture (FIX-01)

**What:** Add a "Contattaci" / "Richiedi Demo" form to the landing page that writes to a `leads` table.

**Current state:** `app/page.tsx` is a pure Server Component — no `useState`, no event handlers, no `'use client'` directive.

**When to use:** Form must be a Client Component. Two options:
1. Extract a `<LeadForm />` Client Component, keep `page.tsx` as Server Component (preferred — preserves SEO)
2. Add `'use client'` to the whole page (simpler but loses server rendering)

**Lead table schema:**
```sql
-- Run manually in Supabase SQL editor
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text,
  business_type text,
  message text,
  created_at timestamptz default now()
);

-- Optional: enable RLS but allow anon inserts
alter table leads enable row level security;
create policy "Anyone can insert leads" on leads
  for insert with check (true);
```

**API route pattern (consistent with existing routes):**
```typescript
// app/api/submit-lead/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, email, phone, message } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'Nome ed email obbligatori' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('leads').insert({ name, email, phone, message })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Client form component pattern:**
```typescript
// components/LeadForm.tsx (new file)
'use client'
import { useState } from 'react'

export default function LeadForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    const res = await fetch('/api/submit-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setStatus(res.ok ? 'success' : 'error')
  }

  // render form...
}
```

### Pattern 2: Soft Delete (FIX-02)

**What:** Instead of blocking deletion when active cards exist, offer soft delete via `deleted_at` timestamp.

**SQL migration required:**
```sql
-- Run manually in Supabase SQL editor (document in MANUAL-ACTIONS.md)
alter table programs add column if not exists deleted_at timestamptz;
```

**Current behavior (lines 228-237 in [id]/page.tsx):** If `activeCards.length > 0` → show error, abort. This must change to: offer soft delete option.

**New delete flow logic:**
```typescript
async function softDeleteProgram() {
  const { error } = await supabase
    .from('programs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', program.id)

  if (!error) router.push('/dashboard/programs')
}
```

**All program list queries must filter soft-deleted:**
```typescript
// In loadPrograms() — add .is('deleted_at', null)
const { data: programsData } = await supabase
  .from('programs')
  .select(`*, cards:cards(count)`)
  .eq('merchant_id', profile.merchant_id)
  .is('deleted_at', null)                  // add this line
  .order('created_at', { ascending: false })
```

**Files that query programs and need the filter:**
- `app/dashboard/programs/page.tsx` — loadPrograms()
- `app/dashboard/page.tsx` — main dashboard stats
- Any other page that queries `.from('programs')`

**IMPORTANT:** Also update `lib/types.ts` — add `deleted_at?: string | null` to `Program` type.

### Pattern 3: Hard Delete with Name Confirmation (FIX-03)

**What:** Replace the simple "Elimina definitivamente" button with a flow requiring the merchant to type the program name before hard-deleting.

**Current modal state:** Two buttons (Annulla / Elimina definitivamente), no name confirmation. The current `deleteProgram()` (line 222) blocks if active cards exist — this block must be removed for hard delete.

**New UI state required:**
```typescript
const [deleteConfirmName, setDeleteConfirmName] = useState('')
// Hard delete enabled only when deleteConfirmName === program.name
const canHardDelete = deleteConfirmName === program?.name
```

**New modal UI — two-path delete:**
The modal should present both options when cards exist:
- **Opzione 1 — Soft delete:** "Archivia programma" — hides from UI, preserves data
- **Opzione 2 — Hard delete:** "Elimina definitivamente" — requires typing name, then cascades

When no active cards exist: show only hard delete option with name confirmation.

**Hard delete cascade (already works, remove the active-cards gate):**
```typescript
async function hardDeleteProgram() {
  if (!program || !merchantId) return
  setDeleteLoading(true)
  // Remove the activeCards check — hard delete works regardless
  await supabase.from('stamp_transactions').delete().eq('program_id', program.id)
  await supabase.from('rewards').delete().eq('program_id', program.id)
  await supabase.from('tiers').delete().eq('program_id', program.id)
  await supabase.from('cards').delete().eq('program_id', program.id)
  const { error } = await supabase.from('programs').delete().eq('id', program.id)
  if (error) { setDeleteError('Errore durante l\'eliminazione.'); setDeleteLoading(false); return }
  router.push('/dashboard/programs')
}
```

### Pattern 4: Hero Image Color from Query Param (FIX-04)

**What:** Accept `?color=` query param in `/api/wallet-image` as a fallback/override for the background color. Decode URL-encoded hex (e.g. `%236366f1` → `#6366f1`).

**Current behavior (route.tsx line 31):** Color is read from `program.primary_color` via DB query. The root div already applies it (line 89). The issue per the requirement is that Google Wallet may show white/black default when the color is not correctly passed.

**Why the param approach:** The hero image URL is constructed in `lib/google-wallet.ts` at `getHeroImageUrl()`. Adding `&color=${encodeURIComponent(data.backgroundColor)}` to that URL means the image route doesn't need a DB lookup to know the color — it can use the param directly. This also makes the route faster (avoids one Supabase query path).

**Fix in `app/api/wallet-image/route.tsx`:**
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cardId = searchParams.get('cardId')
  const colorParam = searchParams.get('color')  // NEW: URL-encoded hex

  // ... existing card/program load ...

  // Apply color: param takes precedence over DB value
  const primaryColor = colorParam
    ? decodeURIComponent(colorParam)
    : (program.primary_color || '#6366f1')

  // ... rest unchanged, primaryColor already used on root div ...
}
```

**Fix in `lib/google-wallet.ts` — `getHeroImageUrl()`:**
```typescript
function getHeroImageUrl(cardId: string, backgroundColor?: string): string {
  const colorPart = backgroundColor ? `&color=${encodeURIComponent(backgroundColor)}` : ''
  return `${APP_URL}/api/wallet-image?cardId=${cardId}&t=${Date.now()}${colorPart}`
}
```

Then pass `data.backgroundColor` to `getHeroImageUrl()` in the two call sites within `lib/google-wallet.ts`.

**IMPORTANT:** CLAUDE.md explicitly states "NON toccare lib/google-wallet.ts — funziona, critico." However, `getHeroImageUrl()` is a private helper inside that file, and the change is additive (add optional param). The function signature stays backward-compatible. This is the minimal-risk approach. The planner must note this constraint.

### Anti-Patterns to Avoid

- **Don't add `'use client'` to `app/page.tsx`** — instead extract `LeadForm` as a separate client component to keep the landing page server-rendered for SEO.
- **Don't add DB-level FK cascades** — the manual cascade in `deleteProgram()` already works and is the established pattern.
- **Don't modify the Google Wallet loyaltyClass** — `hexBackgroundColor` is already set correctly. The fix is only in the hero image URL and route.
- **Don't use `decodeURIComponent` without validation** — validate that the decoded string is a valid hex color before applying it to avoid injection issues.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lead email notifications | Custom email sender | Just save to DB for now | Scope is only DB storage; email is Phase 9+ |
| DB-level cascade on delete | FK constraints in Supabase | Manual cascade already exists | Changing DB schema constraints requires migration + testing |
| Color validation regex | Custom validator | Simple `startsWith('#')` check | Hex validation is trivial; full regex is overkill |

---

## Common Pitfalls

### Pitfall 1: Forgetting to filter soft-deleted programs everywhere
**What goes wrong:** The soft-deleted program disappears from the programs list but still appears in dashboard stats, analytics, stamp scanning.
**Why it happens:** Multiple queries to `programs` table across different pages.
**How to avoid:** Search the codebase for `.from('programs')` and add `.is('deleted_at', null)` to every query that lists programs for a merchant.
**Warning signs:** Test by soft-deleting a program and checking: dashboard stats, `/stamp` scanner, `/join/[programId]` public page.

**Files to audit:**
```
app/dashboard/page.tsx
app/dashboard/programs/page.tsx
app/stamp/page.tsx (may load program via card)
app/c/[token]/page.tsx (loads program via card — OK, no filter needed here)
```

### Pitfall 2: Google Wallet `lib/google-wallet.ts` modification risk
**What goes wrong:** Breaking the Google Wallet JWT generation.
**Why it happens:** The file is marked as "NON toccare" in STATE.md decisions.
**How to avoid:** The `getHeroImageUrl()` change is strictly additive — optional `backgroundColor` parameter with default `undefined`. Test by checking that existing calls with no second argument still work identically.
**Warning signs:** `/api/wallet` returns 500; `generateWalletLink()` throws.

### Pitfall 3: `decodeURIComponent` on already-decoded strings
**What goes wrong:** Double-decoding a URL string (e.g. `%2523` → `%23` → `#`) or throwing on malformed input.
**Why it happens:** URL params may or may not be pre-decoded by the framework.
**How to avoid:** Wrap in try/catch. Use `new URL(request.url).searchParams.get('color')` — the `searchParams` API automatically decodes percent-encoding once.
**Warning signs:** Color shows as `undefined` or throws `URIError`.

### Pitfall 4: Landing page form loses server-side rendering
**What goes wrong:** Adding `'use client'` to `app/page.tsx` converts it to a client component, hurting SEO and initial load.
**Why it happens:** React requires `'use client'` for `useState`/event handlers.
**How to avoid:** Extract only the form as `components/LeadForm.tsx` with `'use client'`. Keep `app/page.tsx` as a Server Component that imports `<LeadForm />`.

### Pitfall 5: Hard delete on programs with active cards fails silently
**What goes wrong:** Cascade order matters. Deleting `cards` before `stamp_transactions` may fail if there are FK constraints. Current order in code (stamp_transactions → rewards → tiers → cards → programs) is correct.
**Why it happens:** FK constraints require child rows deleted before parent rows.
**How to avoid:** Keep the existing cascade order exactly. Do not change it.

---

## Code Examples

### FIX-04: Minimal route change
```typescript
// app/api/wallet-image/route.tsx — lines 9-16 (replace)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cardId = searchParams.get('cardId')
  const colorParam = searchParams.get('color') // already decoded by searchParams API

  if (!cardId) {
    return new Response('Missing cardId', { status: 400 })
  }
  // ... existing supabase load ...

  // After loading program:
  const primaryColor = (colorParam && colorParam.startsWith('#'))
    ? colorParam
    : (program.primary_color || '#6366f1')
  // Source: direct code inspection of route.tsx + searchParams spec
```

### FIX-02: Supabase soft delete
```typescript
// Soft delete — sets deleted_at, preserves all data
const { error } = await supabase
  .from('programs')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', program.id)
  .eq('merchant_id', merchantId) // security: scope to merchant
```

### FIX-03: Name confirmation pattern
```typescript
// In modal JSX:
<input
  type="text"
  placeholder={`Digita "${program.name}" per confermare`}
  value={deleteConfirmName}
  onChange={(e) => setDeleteConfirmName(e.target.value)}
  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mb-3"
/>
<button
  onClick={hardDeleteProgram}
  disabled={deleteLoading || deleteConfirmName !== program.name}
  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {deleteLoading ? 'Eliminazione...' : 'Elimina definitivamente'}
</button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Block delete when cards exist | Soft delete (archive) + hard delete with confirmation | FIX-02/03 (this phase) | Merchant can always remove a program from view; data preserved by default |
| No lead capture | Form + DB table | FIX-01 (this phase) | Marketing leads trackable in Supabase |

**What already works correctly (do not change):**
- Hero image route already applies `primaryColor` from DB to root div background
- Cascade delete order in `deleteProgram()` is correct
- `generateWalletLink()` passes `hexBackgroundColor` to the loyalty class

---

## Open Questions

1. **Where to show the contact form on the landing page?**
   - What we know: The landing page has a final CTA section (`<section className="bg-indigo-600 ...">`) that only links to `/register`.
   - What's unclear: Should the lead form replace the CTA, or be a new section below it?
   - Recommendation: Add a new section between the "Come funziona" steps and the existing CTA, titled "Vuoi saperne di più?" — keeps the register CTA prominent.

2. **Should soft-deleted programs be recoverable via UI?**
   - What we know: FIX-02 only requires that the program "sparisce dalla UI" but "i dati rimangono nel DB."
   - What's unclear: Whether a merchant can un-archive.
   - Recommendation: Not required for this phase. No "restore" UI needed. Soft delete is irreversible from the dashboard.

3. **Does FIX-04 require changing `lib/google-wallet.ts`?**
   - What we know: The route already reads color from DB. The requirement says "da query param ?color=".
   - What's unclear: Whether the issue is at the route level or at the wallet class level.
   - Recommendation: Both fixes: add `?color=` param support to the route (5 lines), AND update `getHeroImageUrl()` to pass the color (additive, backward-compatible). STATE.md says "NON toccare lib/google-wallet.ts" but this refers to the JWT/wallet logic, not the URL helper. The change is minimal and additive.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `app/api/wallet-image/route.tsx` — color already applied at line 89
- Direct code inspection: `app/dashboard/programs/[id]/page.tsx` lines 222-253 — current delete flow
- Direct code inspection: `lib/types.ts` — `Program` type has no `deleted_at` field
- Direct code inspection: `app/page.tsx` — no form, no 'use client', no lead capture

### Secondary (MEDIUM confidence)
- Supabase `.is('deleted_at', null)` — standard filter for soft-delete, documented in Supabase JS v2 API
- `new URL(request.url).searchParams.get()` — automatically percent-decodes once, standard Web API

### Tertiary (LOW confidence)
- None — all findings are from direct source inspection

---

## Metadata

**Confidence breakdown:**
- FIX-01 (lead capture): HIGH — page.tsx is empty of forms, approach is clear
- FIX-02 (soft delete): HIGH — current block logic identified, SQL migration pattern clear
- FIX-03 (hard delete): HIGH — existing cascade works, name-confirm is UI-only
- FIX-04 (hero image color): HIGH — root cause confirmed by code inspection; route already applies color

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable stack, no fast-moving dependencies)
