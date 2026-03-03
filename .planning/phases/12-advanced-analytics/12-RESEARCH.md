# Phase 12: Advanced Analytics + CSV Export - Research

**Researched:** 2026-03-03
**Domain:** React data visualization (recharts), browser-side CSV export, plan-gated features
**Confidence:** HIGH

---

## Summary

Phase 12 adds real analytics value to the merchant dashboard by replacing the existing hand-rolled SVG bar chart in `/dashboard/analytics` with recharts `BarChart` and `PieChart` components, plus computes three new KPI metrics: active customers with 30-day trend, return rate, and total rewards redeemed. It also adds a plan-gated "Esporta CSV" button to `/dashboard/cards` that triggers a browser-side CSV download using `Blob + URL.createObjectURL` — no API route needed.

The existing analytics page already contains solid data-fetching logic (timestamp-based period filtering, per-day bucketing, per-program stats). The work is a targeted upgrade: swap the manual `<div>` bar chart for recharts components, add the three missing KPI calculations to the data already being fetched, and add the CSV export button to the cards page.

`usePlan` and `UpgradePrompt` components are already implemented and ready to use. `recharts` is not yet in `package.json` and must be installed.

**Primary recommendation:** Install recharts 3.x, add `'use client'` charts as components, do all analytics computation client-side from existing Supabase queries, do CSV export entirely in-browser with no new API routes.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANALYTICS-01 | /dashboard/analytics shows totale clienti attivi con trend ultimi 30 giorni | Compute `active_count` (last_use_date <= 30d) + `prev_active_count` (31-60d window) from `cards` table; display delta % |
| ANALYTICS-02 | Grafico a barre bollini/punti per giorno (ultimi 30gg) con recharts | Replace existing manual bar chart with `<BarChart>` + `<ResponsiveContainer>` from recharts; data already collected in `timeline` state |
| ANALYTICS-03 | Tasso di ritorno — % clienti tornati entro 30gg dalla prima visita | Query `stamp_transactions` grouped by `card_id`: find cards with >= 2 transactions where second tx is within 30d of first tx. Return rate = (cards_returned / total_cards_with_tx) * 100 |
| ANALYTICS-04 | Totale premi riscattati (da stamp_transactions type='redeem') | Already partially computed as `totalRewardsMonth`; needs to be displayed as a new KPI metric card showing all-time total, not just this month |
| ANALYTICS-05 | Grafico a torta segmenti clienti (attivi/dormienti/persi) con recharts | `cards` page already computes active/dormant/lost counts via `daysSince()`; reuse same logic in analytics with `<PieChart>` + `<Pie>` + `<Cell>` |
| CSV2-01 | Pulsante "Esporta CSV" in /dashboard/cards con nome, email, telefono, piano, bollini/punti attuali, ultima visita, data iscrizione | Cards page already loads all card+holder data; add CSV generation from in-memory data using `Blob` + `URL.createObjectURL` |
| CSV2-02 | Export CSV disponibile solo per piano PRO e BUSINESS (UpgradePrompt per FREE) | `usePlan()` hook returns `isPro` boolean (true for both pro and business); wrap button with plan check, show `<UpgradePrompt>` when `isFree` |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.7.0 | BarChart + PieChart visualization | Locked decision in STATE.md; React+D3 based, 'use client' compatible, most popular React chart library |
| React (existing) | 19.2.3 | Component framework | Already installed |
| Supabase client (existing) | ^2.93.2 | Data queries | Already installed, all data is in existing tables |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| usePlan (lib/hooks/usePlan.ts) | — | Read merchant plan | Gate CSV export behind PRO check |
| UpgradePrompt (components/ui/UpgradePrompt.tsx) | — | Show upgrade CTA | Display when FREE merchant tries to export |
| lucide-react | ^0.576.0 | Icons | Download icon for CSV button |

### No New Libraries Needed
The CSV export is done entirely in-browser:
- `Blob` + `URL.createObjectURL` — native browser API
- `<a>` tag with `download` attribute — native browser API
- No Papa Parse, no SheetJS — not needed for simple flat CSV

**Installation:**
```bash
npm install recharts
```

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
app/dashboard/
├── analytics/
│   └── page.tsx        # REPLACE existing charts with recharts (keep data logic)
└── cards/
    └── page.tsx        # ADD CSV export button + usePlan check
```

No new files needed. Both pages are already `'use client'` components.

### Pattern 1: recharts BarChart in 'use client' page

**What:** Wrap `<BarChart>` in `<ResponsiveContainer>` inside a `'use client'` component. Data array must have shape `[{ date: string, stamps: number }]`.

**When to use:** ANALYTICS-02 (timbri per giorno)

**Example:**
```typescript
// Source: recharts official docs + app-generator.dev/docs/technologies/nextjs/integrate-recharts.html
'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

// Inside the component, using existing `timeline` state:
<ResponsiveContainer width="100%" height={200}>
  <BarChart data={timeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
    <XAxis
      dataKey="date"
      tick={{ fontSize: 10, fill: '#9CA3AF' }}
      tickFormatter={(v) => new Date(v).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
    />
    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
    <Tooltip
      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E8E8' }}
      formatter={(value: number) => [value, 'Timbri']}
    />
    <Bar dataKey="stamps" fill="#111111" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### Pattern 2: recharts PieChart for segment distribution

**What:** `<PieChart>` + `<Pie>` + `<Cell>` to show active/dormant/lost distribution. Data must have shape `[{ name: string, value: number }]`.

**When to use:** ANALYTICS-05 (distribuzione segmenti)

**Example:**
```typescript
// Source: recharts official docs
'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const SEGMENT_COLORS = {
  active: '#16A34A',
  dormant: '#F59E0B',
  lost: '#DC2626',
}

const pieData = [
  { name: 'Attivi', value: counts.active, color: SEGMENT_COLORS.active },
  { name: 'Dormienti', value: counts.dormant, color: SEGMENT_COLORS.dormant },
  { name: 'Persi', value: counts.lost, color: SEGMENT_COLORS.lost },
]

<ResponsiveContainer width="100%" height={220}>
  <PieChart>
    <Pie
      data={pieData}
      cx="50%"
      cy="50%"
      outerRadius={80}
      dataKey="value"
    >
      {pieData.map((entry, i) => (
        <Cell key={i} fill={entry.color} />
      ))}
    </Pie>
    <Tooltip formatter={(value: number) => [value, 'Clienti']} />
    <Legend iconType="circle" iconSize={10} />
  </PieChart>
</ResponsiveContainer>
```

### Pattern 3: Active customers with 30-day trend (ANALYTICS-01)

**What:** Count `cards` with `last_use_date` within last 30 days vs prior 30 days to compute trend %.

**When to use:** Computing the "clienti attivi + trend" KPI metric.

**Example:**
```typescript
// Source: derived from existing analytics data logic in app/dashboard/analytics/page.tsx
const now = new Date()
const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000)

// Count currently active (last 30 days)
const { count: activeNow } = await supabase
  .from('cards')
  .select('*', { count: 'exact', head: true })
  .eq('merchant_id', mid)
  .gte('last_use_date', thirtyDaysAgo.toISOString().split('T')[0])

// Count active in prior 30-day window (31-60 days ago)
const { count: activePrev } = await supabase
  .from('cards')
  .select('*', { count: 'exact', head: true })
  .eq('merchant_id', mid)
  .gte('last_use_date', sixtyDaysAgo.toISOString().split('T')[0])
  .lt('last_use_date', thirtyDaysAgo.toISOString().split('T')[0])

const trend = activePrev > 0
  ? Math.round(((activeNow - activePrev) / activePrev) * 100)
  : null
```

**Note:** `last_use_date` is a `date` column in the DB (not timestamp), so use `.split('T')[0]` for date-only comparison.

### Pattern 4: Return rate computation (ANALYTICS-03)

**What:** Percentage of cards that have at least 2 transactions where the 2nd transaction is within 30 days of the 1st.

**When to use:** ANALYTICS-03

**Example:**
```typescript
// Source: derived from stamp_transactions schema in CLAUDE.md
const { data: txData } = await supabase
  .from('stamp_transactions')
  .select('card_id, created_at')
  .eq('merchant_id', mid)
  .eq('type', 'add')  // only add transactions, not redeems
  .order('created_at', { ascending: true })

// Group by card_id
const byCard = new Map<string, Date[]>()
txData?.forEach(tx => {
  const dates = byCard.get(tx.card_id) || []
  dates.push(new Date(tx.created_at))
  byCard.set(tx.card_id, dates)
})

// A card "returned" if it has >= 2 tx and 2nd tx is within 30d of first
let returned = 0
let eligible = 0
byCard.forEach(dates => {
  if (dates.length < 2) return
  eligible++
  const firstDate = dates[0]
  const secondDate = dates[1]
  const diffDays = (secondDate.getTime() - firstDate.getTime()) / 86400000
  if (diffDays <= 30) returned++
})

const returnRate = eligible > 0 ? Math.round((returned / eligible) * 100) : 0
```

**Caution:** This can be expensive with many cards. For merchants with thousands of cards, limit to last 90 days of transactions. For the current user base (small Italian merchants with <200 cards each), client-side computation is fine.

### Pattern 5: Browser-side CSV export (CSV2-01)

**What:** Generate CSV from in-memory card data and trigger browser download without any server API.

**When to use:** "Esporta CSV" button in /dashboard/cards

**Example:**
```typescript
// Source: standard browser Blob pattern
function exportCSV(cards: CardWithHolder[]) {
  const headers = ['Nome', 'Email', 'Telefono', 'Programma', 'Saldo', 'Ultima visita', 'Iscrizione']
  const rows = cards.map(c => [
    c.holder?.full_name || '',
    c.holder?.email || '',
    c.holder?.phone || '',
    c.program_name || '',
    // saldo depends on program_type — use stamp_count for stamps, points_balance for points, etc.
    String(c.stamp_count ?? c.points_balance ?? c.cashback_balance ?? 0),
    c.last_use_date || c.created_at.split('T')[0],
    c.created_at.split('T')[0],
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `clienti-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
```

**Note:** `'\uFEFF'` is the UTF-8 BOM — essential for Italian characters (accents) to render correctly when opening in Excel on Windows.

### Pattern 6: Plan gating with usePlan (CSV2-02)

**What:** Check `isPro` from `usePlan()` hook; render UpgradePrompt instead of CSV button for FREE merchants.

**When to use:** Any PRO-only feature.

**Example:**
```typescript
// Source: lib/hooks/usePlan.ts (existing)
import { usePlan } from '@/lib/hooks/usePlan'
import UpgradePrompt from '@/components/ui/UpgradePrompt'

// In component:
const { plan, loading: planLoading, isPro } = usePlan()

// In render:
{planLoading ? null : isPro ? (
  <button onClick={() => exportCSV(cards)}>
    Esporta CSV
  </button>
) : (
  <UpgradePrompt feature="Export CSV clienti" requiredPlan="PRO" />
)}
```

**Note:** `isPro` is `true` for both `'pro'` and `'business'` plans (verified in usePlan.ts line 45).

### Anti-Patterns to Avoid

- **Recharts in Server Component:** Always use `'use client'` for any component that imports from recharts. Recharts uses browser APIs internally.
- **Creating an API route for CSV:** CSV export must be browser-side only — no server route needed. Avoids unnecessary Vercel function invocations.
- **Re-fetching data for CSV:** The cards page already loads all card data into state. Export directly from in-memory state, no additional Supabase query.
- **Recharts without ResponsiveContainer:** Always wrap charts in `<ResponsiveContainer width="100%" height={N}>`. Without it, charts collapse to 0px on narrow screens.
- **Hard-coding chart width in pixels:** Use `width="100%"` on ResponsiveContainer, never a fixed pixel value.
- **Forgetting UTF-8 BOM:** Italian Excel opens CSV with wrong encoding unless `\uFEFF` BOM is prepended.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bar chart rendering | Custom div/flex bar chart (currently in page) | recharts `<BarChart>` | Tooltips, accessibility, responsive, correct scaling, hover states |
| Pie chart | CSS conic-gradient pie | recharts `<PieChart>` | Legend, tooltip, interaction, correct arc math |
| CSV encoding for Italian | Manual encode logic | `'\uFEFF' + csvContent` BOM prefix | Excel on Windows misreads UTF-8 without BOM; accented characters break |
| Plan check logic | Re-implement plan reading | `usePlan()` hook (already exists) | Hook already handles auth + Supabase read; avoid duplication |
| Upgrade CTA UI | Custom "upgrade" section | `<UpgradePrompt>` (already exists) | Consistent design, already wired to /dashboard/upgrade |

**Key insight:** The existing analytics page has all the data-fetching logic correct. The work is purely additive: add 3 new KPI computations to existing fetch calls, and swap the manual chart UI for recharts components.

---

## Common Pitfalls

### Pitfall 1: recharts "Super expression" error in Next.js
**What goes wrong:** `TypeError: Super expression must either be null or a function` at build/runtime.
**Why it happens:** A recharts component is used inside a Server Component (no `'use client'` directive).
**How to avoid:** Add `'use client'` at the top of any file that imports recharts. Both target pages (analytics, cards) already have `'use client'`.
**Warning signs:** Error only appears after deploying or running `next build`, not always in dev.

### Pitfall 2: `last_use_date` is a `date` column, not timestamp
**What goes wrong:** Comparing `last_use_date` with `new Date().toISOString()` returns wrong results.
**Why it happens:** The `last_use_date` column is `date` type in Supabase (no time component). Supabase `.gte('last_use_date', isoString)` compares date-only values.
**How to avoid:** Use `.split('T')[0]` to extract date-only string: `new Date().toISOString().split('T')[0]`
**Warning signs:** Active customer counts that seem wrong.

### Pitfall 3: Aggregate queries for return rate get slow
**What goes wrong:** Fetching all `stamp_transactions` for return rate calculation returns thousands of rows.
**Why it happens:** Return rate needs per-card first/second transaction dates — requires loading raw rows client-side.
**How to avoid:** Filter to last 90 days: `.gte('created_at', ninetyDaysAgo.toISOString())`. For current merchant scale (< 200 cards), this is fine.
**Warning signs:** Analytics page takes > 3 seconds to load.

### Pitfall 4: CSV missing saldo field for all program types
**What goes wrong:** CSV exports show `0` saldo for cashback or tier program cards.
**Why it happens:** Different program types store balance in different columns (`stamp_count`, `points_balance`, `cashback_balance`, `total_spent`).
**How to avoid:** The cards page currently does NOT load balance columns. Must add them to the Supabase select query:
```typescript
.select('id, last_use_date, updated_at, created_at, status, card_holder_id, program_id, stamp_count, current_stamps, points_balance, cashback_balance, total_spent')
```
Then use the right field based on the program type.
**Warning signs:** CSV shows all 0s in the "Saldo" column.

### Pitfall 5: PieChart with all-zero data crashes or renders blank
**What goes wrong:** If merchant has 0 customers, all segment counts are 0 and recharts PieChart shows nothing or throws.
**Why it happens:** recharts Pie with all-zero values skips rendering arcs.
**How to avoid:** Show an EmptyState component when `cards.length === 0` instead of rendering the PieChart.

### Pitfall 6: recharts Tooltip not showing on mobile
**What goes wrong:** On touch devices, recharts tooltips don't appear on tap.
**Why it happens:** recharts tooltips are hover-based by default.
**How to avoid:** This is acceptable for the current feature. The charts are informational, not interactive-critical.

---

## Code Examples

### Full recharts BarChart integration (drop-in for current analytics chart section)
```typescript
// Source: recharts docs + existing app/dashboard/analytics/page.tsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

// Replace the current manual chart div with:
<div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
  <h2 className="font-semibold text-base text-gray-900 mb-4">Timbri / Punti per giorno</h2>
  {timeline.every(d => d.stamps === 0) ? (
    <EmptyState icon={BarChart2} title="Nessun dato" description="Nessun dato per il periodo selezionato" />
  ) : (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
          tickFormatter={(v) => {
            const d = new Date(v)
            return `${d.getDate()}/${d.getMonth() + 1}`
          }}
          interval={period === '30d' ? 4 : period === '7d' ? 0 : 14}
        />
        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E8E8', boxShadow: 'none' }}
          labelFormatter={(label) => new Date(label).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
          formatter={(value: number) => [value, 'Timbri / Punti']}
        />
        <Bar dataKey="stamps" fill="#111111" radius={[4, 4, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )}
</div>
```

### Metrics card with trend indicator (ANALYTICS-01)
```typescript
// Source: derived from existing MetricCard pattern in app/dashboard/analytics/page.tsx
// Add to KPI cards section:
<div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
  <p className="text-sm text-gray-500 mb-1">Clienti Attivi (30gg)</p>
  <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
  {trend !== null && (
    <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
      {trend >= 0 ? '+' : ''}{trend}% vs mese scorso
    </p>
  )}
</div>
```

---

## Existing Code: What to Keep vs Replace

### analytics/page.tsx — Keep
- All `useState` declarations
- Auth + merchant resolution logic (lines 61-73)
- `cards` count, `customersCount`, `newCardsCount` queries (lines 80-90)
- `monthTx` query and stamps/rewards computation (lines 96-116)
- `periodTx` + `periodCards` queries + `dayMap` bucketing (lines 118-157)
- Per-program stats loop (lines 159-200)
- Period toggle UI (lines 225-240)
- KPI MetricCard grid (lines 243-249)
- Per-program stats table (lines 308-376)

### analytics/page.tsx — Replace
- Lines 205-306: the manual div-based bar chart — replace with recharts `<BarChart>`

### analytics/page.tsx — Add
- 3 new state variables: `activeCount`, `trend`, `returnRate`
- 2 new Supabase queries inside `loadAnalytics()`: active count with period windows, return rate from stamp_transactions
- 3 new KPI cards: Clienti Attivi + trend, Tasso di Ritorno, Premi Riscattati (all-time)
- New chart section: PieChart for segment distribution (active/dormant/lost)

### cards/page.tsx — Keep
- Everything currently in the file (segmentation, bulk send modal, etc.)

### cards/page.tsx — Add
- `usePlan()` hook call
- `exportCSV()` function
- Additional fields to the Supabase select (balance columns)
- "Esporta CSV" button in header (next to existing "Invia a N clienti" button)
- Conditional `<UpgradePrompt>` or button based on plan

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual div bars (current) | recharts BarChart | Phase 12 | Tooltips, responsive, accessible |
| No pie chart | recharts PieChart | Phase 12 | Visual segment distribution |
| No active customer trend | Computed from cards table | Phase 12 | Merchant sees engagement direction |
| No return rate | Computed from stamp_transactions | Phase 12 | Key retention metric |
| No CSV export from cards page | Browser Blob export | Phase 12 | Merchant can download client data |

**Deprecated/outdated in this phase:**
- Manual `<div>` bar chart (lines 274-305 in current analytics/page.tsx): replace entirely with recharts

---

## Open Questions

1. **Cards page saldo for CSV**
   - What we know: CSV requires "bollini/punti attuali" — different column per program type
   - What's unclear: Should we show raw number (e.g., `12 bollini`) or compute a formatted string?
   - Recommendation: Use raw number. Planner should add `stamp_count, current_stamps, points_balance, cashback_balance, total_spent` to the cards SELECT query and pick the first non-null value. Column header "Saldo" is sufficient.

2. **Return rate definition edge cases**
   - What we know: "% clienti tornati entro 30gg dalla prima visita"
   - What's unclear: Should cards with only 1 transaction count as "not returned" or be excluded?
   - Recommendation: Exclude cards with only 1 transaction from denominator. Denominator = cards with >= 2 transactions. This gives a meaningful rate rather than always-low numbers.

3. **recharts React 19 peer dependency**
   - What we know: recharts latest is 3.7.0, requires `npm install recharts`
   - What's unclear: Official peerDependency spec for React 19 not confirmed
   - Recommendation: Install with `--legacy-peer-deps` flag if npm raises conflict: `npm install recharts --legacy-peer-deps`. The app already uses React 19.2.3. Community reports (WebSearch) confirm recharts works in practice with React 19 + Next.js App Router. Confidence: MEDIUM.

---

## Sources

### Primary (HIGH confidence)
- `app/dashboard/analytics/page.tsx` — existing analytics data logic, chart structure
- `app/dashboard/cards/page.tsx` — existing cards page state, data loading pattern
- `lib/hooks/usePlan.ts` — isPro boolean, plan values
- `components/ui/UpgradePrompt.tsx` — component interface
- `.planning/STATE.md` — locked decision: recharts for analytics charts
- `.planning/REQUIREMENTS.md` — ANALYTICS-01..05, CSV2-01..02 exact definitions

### Secondary (MEDIUM confidence)
- [recharts GitHub Releases](https://github.com/recharts/recharts/releases) — confirmed version 3.7.0 (Jan 2025)
- [recharts official examples](https://recharts.github.io/en-US/examples/) — BarChart, PieChart component inventory
- [Next.js + recharts integration guide](https://app-generator.dev/docs/technologies/nextjs/integrate-recharts.html) — 'use client' requirement, ResponsiveContainer pattern

### Tertiary (LOW confidence)
- WebSearch consensus: recharts works with React 19 + Next.js App Router — not officially documented, based on community reports

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — recharts is a locked decision, existing hooks/components verified in codebase
- Architecture: HIGH — existing files read directly, data shapes verified from actual code
- Pitfalls: HIGH — derived from reading actual DB schema (CLAUDE.md) and existing code patterns
- Return rate formula: MEDIUM — no official definition given; recommendation is a reasonable default

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (recharts API is stable; internal code patterns are stable)
