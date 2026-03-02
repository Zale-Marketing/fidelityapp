# Phase 3: Customer Pages - Research

**Researched:** 2026-03-02
**Domain:** Next.js 14 App Router client pages, Supabase anon queries, Tailwind CSS, conversion UX
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**`/join` — Value display above the form**
- Show program rewards before the signup form, not just a one-line benefit pill
- For `stamps`: query the `rewards` table and list all intermediate rewards (e.g. "5 bollini → Caffè Gratis", "10 bollini → Colazione")
- For `points`: show the points-per-euro rate and the reward threshold (e.g. "€1 = 1 punto · 100 punti → Premio")
- For `cashback`: show the cashback percentage and minimum redeem amount prominently (e.g. "5% cashback · riscatti da €5")
- For `tiers`: list the tier levels with spend thresholds and discounts (e.g. "Silver da €50 · Gold da €150")
- For `subscription`: show price, period, and daily limit (e.g. "€9.99/mese · 1 utilizzo al giorno")
- The benefit preview section sits between the branded header and the form, not inside the form

**`/join` — Form fields**
- Keep existing fields: Nome e Cognome (required), Email (optional), Telefono (optional)
- No new fields

**`/join` — Success state**
- After enrollment, automatically redirect to `/c/[token]` after 2–3 seconds
- Keep "Vai alla tua Carta" button for users who don't wait

**`/c/[token]` — Google Wallet CTA placement**
- Move "Aggiungi a Google Wallet" button to the top of the card body, immediately below the colored header, before any program stats
- The button must be the first interactive element the customer sees (sopra il fold — hard constraint)
- If the card is already in the wallet, the button can remain (Google handles duplicates gracefully)

**`/c/[token]` — Progress messaging**
- Display a prominent "ancora X al prossimo premio" label below the CTA for all program types:
  - `stamps`: "Ancora 3 bollini al Caffè Gratis" (next intermediate reward from `rewards` table, or final prize)
  - `points`: "Ancora 40 punti al premio"
  - `cashback`: "Ancora €2.50 per riscattare" (below minimum) or "Pronto per riscattare!" (above minimum)
  - `tiers`: "Ancora €30.00 per Silver" (next tier) or "Livello massimo raggiunto" (if at top)
  - `subscription`: Show "Abbonamento Attivo" / "Abbonamento Scaduto" badge — no countdown needed
- This message appears between the Wallet CTA and the program detail section

**`/c/[token]` — Per-type visual identity**
- `stamps`: Large grid of stamp circles (filled/empty) — keep 5-col grid, limit to max 10 visible, show count for larger programs
- `points`: Big numeric balance (e.g. "142 punti") in primary color — keep prominent
- `cashback`: Big euro amount (e.g. "€3.50") in primary color + green "Pronto!" badge when redeemable
- `tiers`: Current tier badge emoji + tier name large, spend bar below
- `subscription`: Bold green/red status badge (ATTIVO / SCADUTO) as primary visual — daily usage counter secondary

### Claude's Discretion
- Exact spacing, padding, and font sizes within each program type section
- Whether to add a subtle shimmer/animation to the "Wallet CTA" button
- How to handle the stamps grid for programs with >15 stamps_required (compact rows vs. count display)
- Loading skeleton design for initial page load on `/join`

### Deferred Ideas (OUT OF SCOPE)
- None raised during discussion — session proceeded from codebase analysis and success criteria
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| JOIN-01 | Cliente vede la pagina /join/[programId] con colore principale del merchant applicato a sfondo, pulsanti e accenti | Existing `primary_color` pattern confirmed — header + button already use it; extend to benefit preview section accents |
| JOIN-02 | Cliente vede una descrizione chiara del programma (tipo, reward, come si guadagnano i punti/bollini) | Requires new BenefitPreview component with per-type content; rewards table query added for stamps |
| JOIN-03 | Cliente vede la soglia per il premio prima di iscriversi (es. "10 caffè = 1 gratis") | Concrete reward thresholds from `rewards` table (stamps) and program fields (points/cashback/tiers/subscription) |
| JOIN-04 | Cliente completa l'iscrizione e viene reindirizzato alla sua carta senza errori | Auto-redirect with `useRouter().push()` inside `setTimeout` (2–3 seconds) in `done` state |
| CARD-01 | Cliente vede lo stato della sua carta con gerarchia visiva corretta per ogni tipo programma | Per-type KPI block at top of card body — each type gets distinct primary visual element |
| CARD-02 | Cliente vede chiaramente quanto manca al prossimo premio (es. "ancora 3 bollini") | Dedicated progress-message bar between Wallet CTA and detail section, computed per type |
| CARD-03 | Cliente vede il pulsante "Aggiungi a Google Wallet" prominente se la carta non è ancora nel wallet | Wallet button moved from bottom px-6 pb-4 slot to top of card body — before all stats |
</phase_requirements>

---

## Summary

Phase 3 targets two public-facing pages: `/join/[programId]` (enrollment) and `/c/[token]` (customer card). Both pages already exist and function correctly — the goal is a targeted redesign of their visual hierarchy and information architecture, not a rebuild of their business logic.

The core problem on `/join` is that the current `benefitText()` function collapses everything into a one-liner inside a header badge. The decision is to expand this into a dedicated `BenefitPreview` section with per-type structured content, placed between the colored header and the form. For stamps programs specifically, this requires querying the `rewards` table (not currently queried by `/join`) to enumerate intermediate prize thresholds.

The core problem on `/c/[token]` is two-fold: the Google Wallet CTA sits at the very bottom of a long page (fails the fold test), and the "how much more do I need?" message is buried inside each type-specific block without a consistent visual treatment. Both are layout/information-hierarchy problems, not business logic problems. The 5-second polling loop, QR code, Supabase queries, and all five program-type renderers stay as-is.

**Primary recommendation:** Treat both plans as targeted UI restructuring. Reuse all existing Supabase fetch patterns, all type renderers, and the header-overlap card pattern. The only new data dependency is `rewards` table query in both pages.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 14+ (project current) | Client page routing and rendering | Already used everywhere |
| React | 18+ (project current) | Component model, hooks (useState, useEffect, useRef, useRouter) | Project standard |
| TypeScript | Project current | Type safety | Project standard |
| Tailwind CSS | Project current | Styling | Project standard — all existing UI uses it |
| Supabase JS client | Project current | Database queries | `createClient()` from `@/lib/supabase` — anon key for public pages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `qrcode` npm | Project current | QR canvas generation | Already in `/c/[token]` — keep exactly as-is |
| `next/navigation` `useRouter` | Next.js built-in | Auto-redirect in done state | Replace current manual link pattern with `router.push(cardLink)` inside `setTimeout` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side `useEffect` data fetch | React Server Component | RSC would eliminate loading spinner but requires auth-safe server code; anon-key pages are fine as client components |
| `setTimeout` redirect | `useEffect` with countdown timer | Timer with countdown display gives better UX feedback; either works, the simpler `setTimeout` is sufficient for v1 |

**Installation:** No new packages needed. All dependencies are already present.

---

## Architecture Patterns

### Recommended Project Structure
No file additions needed outside the two target pages:
```
app/
├── join/[programId]/
│   └── page.tsx          # Redesign in place — same file
└── c/[token]/
    └── page.tsx          # Redesign in place — same file
```

### Pattern 1: Header-Overlap Card (established, keep exactly)
**What:** Colored header with `pb-20`, followed by card with `-mt-12` to create the overlap effect
**When to use:** Both `/join` and `/c/[token]` — this pattern is already established
**Example:**
```tsx
// Header — colored
<div style={{ backgroundColor: primaryColor }} className="p-6 pb-20">
  <div className="max-w-md mx-auto text-center text-white">
    {/* logo, merchant name, program name */}
  </div>
</div>

// Card body — overlapping
<div className="max-w-md mx-auto px-4 -mt-12">
  <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
    {/* content */}
  </div>
</div>
```
Source: Existing `/join/page.tsx` lines 301-322 and `/c/[token]/page.tsx` lines 227-240.

### Pattern 2: BenefitPreview Section (new for `/join`)
**What:** A structured section between header and form that enumerates what the customer earns, specific to program type
**When to use:** Inside the white card, before the form fields — must contain the conversion hook (concrete prizes/thresholds)
**Layout structure:**
```tsx
{/* Positioned inside the white rounded-2xl card, above the form */}
<div className="border-b pb-4 mb-6">
  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
    Come funziona
  </h3>
  {/* Per-type content — see Code Examples */}
</div>
```

For **stamps** with rewards table:
```tsx
// Each reward row
<div className="flex items-center gap-3 py-2">
  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
       style={{ backgroundColor: primaryColor }}>
    {reward.stamps_required}
  </div>
  <span className="font-medium text-gray-800">{reward.name}</span>
</div>
```

### Pattern 3: Wallet CTA at Top of Card Body (new for `/c/[token]`)
**What:** Google Wallet button placed as the first element inside the white card, before program stats
**When to use:** Always — this is a hard constraint (must be sopra il fold)
**Example:**
```tsx
<div className="bg-white rounded-2xl shadow-xl overflow-hidden">
  {/* 1. Wallet CTA — FIRST */}
  <div className="p-4 border-b">
    <button
      onClick={addToGoogleWallet}
      disabled={walletLoading}
      className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {/* SVG + text */}
    </button>
  </div>

  {/* 2. Progress message */}
  <div className="px-6 py-4 border-b">
    <p className="text-center font-semibold" style={{ color: primaryColor }}>
      {progressMessage}  {/* "Ancora 3 bollini al Caffè Gratis" */}
    </p>
  </div>

  {/* 3. Per-type KPI block and details */}
  <div className="p-6">
    {/* existing type renderers */}
  </div>
</div>
```

### Pattern 4: Auto-redirect in Success State (new for `/join`)
**What:** After card creation, `useEffect` fires `setTimeout` to auto-navigate to card page
**When to use:** In the `done === true` branch of `/join`
**Example:**
```tsx
// In component scope:
const router = useRouter()

// In handleSubmit, after setting done=true:
setDone(true)
setTimeout(() => {
  router.push(link)  // link = /c/[scan_token]
}, 2500)

// In done state render — keep the manual button as fallback:
<a href={cardLink} className="block w-full ...">
  Vai alla tua Carta →
</a>
<p className="text-sm text-gray-400 mt-2 text-center">
  Reindirizzamento automatico in pochi secondi...
</p>
```

### Pattern 5: Progress Message Computation (new for `/c/[token]`)
**What:** A single `progressMessage` string computed from card state, displayed between Wallet CTA and type details
**When to use:** Computed once after data load, displayed for all 5 program types
**Example:**
```tsx
function getProgressMessage(
  programType: string,
  card: Card,
  program: Program,
  rewards: Reward[],
  tiers: Tier[]
): string {
  if (programType === 'stamps') {
    const currentStamps = card.stamp_count || (card as any).current_stamps || 0
    // Find next intermediate reward
    const nextReward = rewards
      .filter(r => r.stamps_required > currentStamps)
      .sort((a, b) => a.stamps_required - b.stamps_required)[0]
    if (nextReward) {
      return `Ancora ${nextReward.stamps_required - currentStamps} bollini per ${nextReward.name}`
    }
    const remaining = program.stamps_required - currentStamps
    if (remaining <= 0) return 'Premio pronto! Mostra la carta in cassa'
    return `Ancora ${remaining} bollini al premio`
  }
  if (programType === 'points') {
    const balance = (card as any).points_balance || 0
    const remaining = program.stamps_required - balance
    if (remaining <= 0) return 'Premio pronto! Mostra la carta in cassa'
    return `Ancora ${remaining} punti al premio`
  }
  if (programType === 'cashback') {
    const balance = (card as any).cashback_balance || 0
    const min = (program as any).min_cashback_redeem || 5
    if (balance >= min) return 'Pronto per riscattare!'
    return `Ancora €${(min - balance).toFixed(2)} per riscattare`
  }
  if (programType === 'tiers') {
    const spent = (card as any).total_spent || 0
    const nextTier = tiers.find(t => spent < t.min_spend)
    if (!nextTier) return 'Livello massimo raggiunto'
    return `Ancora €${(nextTier.min_spend - spent).toFixed(2)} per ${nextTier.name}`
  }
  if (programType === 'subscription') {
    const status = (card as any).subscription_status
    const end = (card as any).subscription_end
    const active = status === 'active' && end && new Date(end) > new Date()
    return active ? 'Abbonamento Attivo' : 'Abbonamento Scaduto'
  }
  return ''
}
```

### Anti-Patterns to Avoid
- **Nested Supabase queries:** Do not do `from('programs').select('*, rewards(*)')` — fails with anon client. Always query `rewards` and `tiers` separately (see CLAUDE.md).
- **Rendering all stamps in grid when `stamps_required > 15`:** Creates excessively tall UI on mobile. Cap grid display at 10 circles + show overflow count.
- **Placing Wallet button below any program detail:** Violates CARD-03 hard constraint.
- **Emoji checkmarks in circle grids:** The `✓` character renders as rectangle in some fonts. Use CSS-styled circles (filled/unfilled) or SVG check marks, not Unicode tick character.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code generation | Custom canvas drawing | `qrcode` library (already in project) | Already working in `/c/[token]` — keep exactly as-is |
| Redirect after form | Custom navigation logic | `useRouter().push()` from `next/navigation` | Built into Next.js, handles client-side routing cleanly |
| Auto-countdown timer | Complex setInterval countdown | `setTimeout` one-shot (2500ms) | Simpler, less state, accomplishes the same UX |
| Color contrast for text on primary_color header | Custom luminance calculation | White text at `text-white` and `text-white/80` for subtitles | Works for the dark-enough brand colors in this project |

**Key insight:** Both pages need layout changes, not logic changes. The Supabase data shapes, form submit logic, and program-type branching are correct and should not be touched.

---

## Common Pitfalls

### Pitfall 1: Forgetting to query `rewards` table in `/join`
**What goes wrong:** Benefit preview for `stamps` programs shows generic text instead of concrete prize list
**Why it happens:** The `rewards` table is not currently queried in `/join/page.tsx` at all — only in `/c/[token]` do we need to add it
**How to avoid:** Add `rewards` query in the `load()` function for both pages, guarded by `program_type === 'stamps'`
**Warning signs:** BenefitPreview section shows "Premio speciale" instead of actual reward names

### Pitfall 2: Stamps grid rendering for large programs
**What goes wrong:** A stamps program with `stamps_required = 20` renders 20 circles in a 5-col grid — 4 rows of circles — pushes the Wallet CTA completely off-screen
**Why it happens:** The grid iterates `[...Array(program.stamps_required)]` unconditionally
**How to avoid:** Cap grid at `Math.min(program.stamps_required, 10)` circles; if `stamps_required > 10`, show first 10 + text "e altri X"
**Warning signs:** Wallet button invisible on first load on a mid-range Android device

### Pitfall 3: Auto-redirect timing issue in `/join` done state
**What goes wrong:** `router.push()` fires before component has mounted / link is set
**Why it happens:** `setDone(true)` and `setTimeout` called in `handleSubmit` — `link` variable is local, safe to close over
**How to avoid:** Call `setTimeout(() => router.push(link), 2500)` inside `handleSubmit` right after `setCardLink(link)` and `setDone(true)`, using the local `link` variable (not `cardLink` state, which may not have updated yet)
**Warning signs:** Redirect goes to empty path or `/c/undefined`

### Pitfall 4: Progress message showing 0 remaining at load
**What goes wrong:** Message shows "Ancora 0 bollini al premio" or "Pronto!" immediately on first visit for a new card
**Why it happens:** New cards have 0 stamps, and `program.stamps_required - 0 = stamps_required` — this is actually correct, but the message might say "Ancora 10 bollini" on a brand-new card which is accurate
**How to avoid:** This is correct behavior — do not hide the message for new cards; it tells the customer what they're working toward

### Pitfall 5: Supabase anon key vs service role key confusion
**What goes wrong:** Queries fail silently with no data because anon key lacks permission
**Why it happens:** Both `/join` and `/c/[token]` are public pages using `createClient()` with anon key — the `rewards` and `tiers` tables must be readable with anon key
**How to avoid:** Check that `rewards` and `tiers` tables have SELECT allowed for `anon` role in Supabase (they should already have this since the existing `/c/[token]` queries tiers). If not, the planner must note this as a prerequisite human step.
**Warning signs:** `rewards` query returns empty array even though rewards exist in DB

---

## Code Examples

Verified patterns from existing codebase:

### Separate rewards query (compliant with CLAUDE.md rule)
```typescript
// Source: CLAUDE.md known pitfall + existing /c/[token]/page.tsx pattern for tiers
// In load() function, after program is loaded:
if (programData.program_type === 'stamps') {
  const { data: rewardsData } = await supabase
    .from('rewards')
    .select('id, name, stamps_required, sort_order')
    .eq('program_id', programData.id)
    .eq('is_active', true)
    .order('stamps_required', { ascending: true })

  if (rewardsData) setRewards(rewardsData)
}
```

### Benefit preview for stamps — intermediate rewards list
```tsx
// Source: CONTEXT.md decisions + Tailwind CSS patterns established in dashboard
{programType === 'stamps' && (
  <div className="space-y-2">
    {rewards.length > 0 ? (
      rewards.map(reward => (
        <div key={reward.id} className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            {reward.stamps_required}
          </div>
          <span className="text-gray-800 font-medium">{reward.name}</span>
        </div>
      ))
    ) : (
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          {program.stamps_required}
        </div>
        <span className="text-gray-800 font-medium">{program.reward_description || 'Premio speciale'}</span>
      </div>
    )}
  </div>
)}
```

### Stamps grid with 10-cap
```tsx
// Source: Existing /c/[token]/page.tsx adapted with cap logic
const displayStamps = Math.min(program.stamps_required, 10)
const overflowStamps = program.stamps_required > 10 ? program.stamps_required - 10 : 0

<div className="grid grid-cols-5 gap-3 mb-4">
  {[...Array(displayStamps)].map((_, i) => (
    <div
      key={i}
      className={`aspect-square rounded-full flex items-center justify-center text-sm font-bold ${
        i < currentStamps ? 'text-white' : 'bg-gray-100 text-gray-300'
      }`}
      style={i < currentStamps ? { backgroundColor: program.primary_color } : {}}
    >
      {/* No emoji — use SVG check for filled, number for empty */}
      {i < currentStamps ? (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (i + 1)}
    </div>
  ))}
</div>
{overflowStamps > 0 && (
  <p className="text-center text-sm text-gray-400 mb-4">
    + altri {overflowStamps} bollini
  </p>
)}
```

### Subscription status badge (primary visual for subscription type)
```tsx
// Source: CONTEXT.md decisions — bold colored badge as PRIMARY visual
{isSubscriptionActive ? (
  <div className="bg-green-100 rounded-2xl px-6 py-4 text-center mb-4">
    <p className="text-2xl font-black text-green-700 tracking-wide">ATTIVO</p>
    <p className="text-sm text-green-600 mt-1">
      Scade il {new Date(subscriptionEnd).toLocaleDateString('it-IT')}
    </p>
  </div>
) : (
  <div className="bg-red-100 rounded-2xl px-6 py-4 text-center mb-4">
    <p className="text-2xl font-black text-red-700 tracking-wide">SCADUTO</p>
    <p className="text-sm text-red-500 mt-1">Contatta il negozio per rinnovare</p>
  </div>
)}
```

### Auto-redirect in handleSubmit done state
```tsx
// Source: next/navigation docs — useRouter().push() for programmatic navigation
// After card creation succeeds:
const link = `${window.location.origin}/c/${newCard.scan_token}`
setCardLink(link)
setDone(true)
setTimeout(() => {
  router.push(`/c/${newCard.scan_token}`)
}, 2500)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One-line `benefitText()` badge in header | Full BenefitPreview section between header and form | Phase 3 | Customer sees concrete reward before form — conversion hook |
| Wallet button at bottom (after QR code) | Wallet button at top of card body (first element) | Phase 3 | Meets CARD-03 hard constraint (sopra il fold) |
| Generic progress buried in type section | Dedicated progress message row between CTA and stats | Phase 3 | Customer always sees "X manca al prossimo premio" in consistent position |
| Manual "Vai alla tua Carta" button only | Auto-redirect 2.5s + fallback button | Phase 3 | Removes friction after enrollment (JOIN-04) |

**Deprecated/outdated patterns in current code:**
- `benefitText()` as a single-line string function — replaced by per-type structured JSX in BenefitPreview
- Benefit badge at the bottom of the form card (`border-t px-6 py-4` section) — replaced by benefit preview above form
- Wallet button in `px-6 pb-4` slot after program detail — moved to top of card

---

## Open Questions

1. **`rewards` table RLS / anon key access**
   - What we know: `tiers` is already queried in `/c/[token]` with anon key and works
   - What's unclear: Whether `rewards` has anon SELECT granted in Supabase — the existing `/c/[token]` does NOT query rewards (it was noted in CONTEXT.md as a gap)
   - Recommendation: The planner should include a verification step — if rewards query returns empty unexpectedly, the merchant must grant anon SELECT on `rewards` in Supabase SQL editor: `GRANT SELECT ON rewards TO anon;`

2. **`programs.daily_limit` column existence for subscription BenefitPreview on `/join`**
   - What we know: `daily_limit` is documented in CLAUDE.md and used in `/c/[token]` (line 221 via `as any`)
   - What's unclear: The `ProgramInfo` type in `/join/page.tsx` does not include `daily_limit` — it will need to be added to the select query and local type
   - Recommendation: Add `daily_limit` to the programs select in `/join`'s `load()` function and to the `ProgramInfo` type

3. **`min_cashback_redeem` in `/join` benefit preview**
   - What we know: The field is in the DB and used in `/c/[token]`; the `ProgramInfo` type in `/join` does not currently include it
   - What's unclear: Same as `daily_limit` — not in the select string
   - Recommendation: Add `min_cashback_redeem` to the programs select and `ProgramInfo` type in `/join`

---

## Sources

### Primary (HIGH confidence)
- `app/join/[programId]/page.tsx` — full source read, confirmed all current patterns
- `app/c/[token]/page.tsx` — full source read, confirmed existing layout and all 5 type renderers
- `CLAUDE.md` — project conventions, DB schema, known pitfalls (nested queries, SVG, display:flex)
- `.planning/phases/03-customer-pages/03-CONTEXT.md` — locked decisions, code context, established patterns

### Secondary (MEDIUM confidence)
- `lib/types.ts` — type definitions; noted that `Program` type is partially out of sync with actual DB (v2 tech debt), but fields needed for Phase 3 are documented in CLAUDE.md DB schema which is authoritative
- `next/navigation` `useRouter` — standard Next.js App Router pattern, used throughout the project already

### Tertiary (LOW confidence)
- None — all findings verified against existing code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, existing code patterns confirmed by reading source
- Architecture: HIGH — decisions locked in CONTEXT.md, patterns verified in existing codebase
- Pitfalls: HIGH — identified by direct code inspection (actual bugs/gaps in current code)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable stack, no external API changes expected)
