---
phase: quick-2
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - app/dashboard/ocio/page.tsx
  - app/dashboard/ocio/settings/page.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Intelligence Panel with 3 widgets renders above the review list"
    - "Aree da migliorare shows top 5 negative themes, or skeleton if no analyzed data"
    - "Trend ultimo mese shows positive/negative delta with arrow, or 'Dati insufficienti'"
    - "Urgenti senza risposta shows count + 2 clickable previews"
    - "Chart dynamically groups by month (<=3yr) or quarter (>3yr) and adds sentiment score line"
    - "Filter row has 'Ultimi 12 mesi' pill between '90gg' and 'Tutto'"
    - "Review tier selector renders in settings between Google Maps URL and Moduli sections"
    - "Tier rows are Zapier-style radio list with correct styling for selected state"
    - "saveConfig() sends review_tier in PATCH body"
---

<objective>
Add Intelligence Panel (3 AI widgets) to the OCIO dashboard and redesign the chart/filters. Then add a Zapier-style review tier selector to OCIO settings.

Purpose: Give merchants actionable insights (worst themes, trend, urgent queue) at a glance, and let them choose how many historical reviews to analyze.
Output: Updated app/dashboard/ocio/page.tsx and app/dashboard/ocio/settings/page.tsx
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@./CLAUDE.md
@app/dashboard/ocio/page.tsx
@app/dashboard/ocio/settings/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Intelligence Panel + chart/filter improvements in OCIO dashboard</name>
  <files>app/dashboard/ocio/page.tsx</files>
  <action>
Rewrite app/dashboard/ocio/page.tsx preserving ALL existing logic exactly (fetchAllReviews, loadData, auth/routing, KPI computation, filteredReviews, modal functions handleCopy/updateReplyStatus, ReviewCard, StarRow, Pill sub-components, the full modal JSX, the auto-refresh useEffect). Only ADD new computed values and new JSX sections.

**1. New state variable** — add to existing useState block:
```tsx
const [filterPeriod, setFilterPeriod] = useState<'30' | '90' | '365' | 'all'>('30')
```
(change existing type from `'30' | '90' | 'all'` to `'30' | '90' | '365' | 'all'`)

**2. Update filteredReviews** — add `'365'` case in the period filter:
```tsx
if (filterPeriod !== 'all' && r.published_at) {
  const days = parseInt(filterPeriod)
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  if (new Date(r.published_at) < cutoff) return false
}
```
(already handles it generically via parseInt — just update the type and add the Pill)

**3. New useMemo — intelligenceData** (add after kpis useMemo):
```tsx
const intelligenceData = useMemo(() => {
  // Widget 1: Aree da migliorare — top 5 negative themes
  const themeCount: Record<string, number> = {}
  for (const r of reviews) {
    if (r.ai_sentiment === 'negative' && r.ai_themes) {
      for (const t of r.ai_themes) {
        themeCount[t] = (themeCount[t] ?? 0) + 1
      }
    }
  }
  const topNegativeThemes = Object.entries(themeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const hasAnalyzedThemes = reviews.some(r => r.ai_themes && r.ai_themes.length > 0)

  // Widget 2: Trend ultimo mese
  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const periodA = reviews.filter(r => r.published_at && new Date(r.published_at) >= d30)
  const periodB = reviews.filter(r => {
    if (!r.published_at) return false
    const d = new Date(r.published_at)
    return d >= d60 && d < d30
  })
  let trendData: { posA: number; negA: number; posB: number; negB: number } | null = null
  if (periodA.length >= 5 && periodB.length >= 5) {
    const posA = Math.round(periodA.filter(r => r.ai_sentiment === 'positive').length / periodA.length * 100)
    const negA = Math.round(periodA.filter(r => r.ai_sentiment === 'negative').length / periodA.length * 100)
    const posB = Math.round(periodB.filter(r => r.ai_sentiment === 'positive').length / periodB.length * 100)
    const negB = Math.round(periodB.filter(r => r.ai_sentiment === 'negative').length / periodB.length * 100)
    trendData = { posA, negA, posB, negB }
  }

  // Widget 3: Urgenti senza risposta
  const urgentPending = reviews.filter(
    r => r.reply_status === 'pending' && (r.ai_urgency === 'high' || r.ai_urgency === 'critical')
  )

  return { topNegativeThemes, hasAnalyzedThemes, trendData, urgentPending }
}, [reviews])
```

**4. New useMemo — chartData** (replace existing chartData useMemo entirely):
```tsx
const chartData = useMemo(() => {
  if (reviews.length === 0) return []

  const dates = reviews
    .filter(r => r.published_at)
    .map(r => new Date(r.published_at!).getTime())
  if (dates.length === 0) return []

  const minDate = new Date(Math.min(...dates))
  const now = new Date()
  const spanMonths =
    (now.getFullYear() - minDate.getFullYear()) * 12 + (now.getMonth() - minDate.getMonth())

  if (spanMonths > 36) {
    // Group by quarter — last 12 quarters
    const quarters: { label: string; avgRating: number | null; count: number; sentimentScore: number | null }[] = []
    for (let i = 11; i >= 0; i--) {
      const now2 = new Date()
      const totalMonthsBack = i * 3
      const qYear = new Date(now2.getFullYear(), now2.getMonth() - totalMonthsBack, 1)
      const qStart = new Date(qYear.getFullYear(), Math.floor(qYear.getMonth() / 3) * 3, 1)
      const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 1)
      const label = `Q${Math.floor(qStart.getMonth() / 3) + 1} ${qStart.getFullYear().toString().slice(2)}`
      const qReviews = reviews.filter(r => {
        if (!r.published_at) return false
        const d = new Date(r.published_at)
        return d >= qStart && d < qEnd
      })
      const withR = qReviews.filter(r => r.rating !== null)
      const avg = withR.length > 0 ? parseFloat((withR.reduce((s, r) => s + (r.rating ?? 0), 0) / withR.length).toFixed(1)) : null
      const withScore = qReviews.filter(r => r.ai_score !== null)
      const sentimentScore = withScore.length > 0 ? parseFloat((withScore.reduce((s, r) => s + (r.ai_score ?? 0), 0) / withScore.length).toFixed(1)) : null
      quarters.push({ label, avgRating: avg, count: qReviews.length, sentimentScore })
    }
    return quarters
  } else {
    // Group by month — last 12 months
    const months: { label: string; avgRating: number | null; count: number; sentimentScore: number | null }[] = []
    const numMonths = Math.min(Math.max(spanMonths + 1, 6), 12)
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
      const monthReviews = reviews.filter(r => {
        if (!r.published_at) return false
        const rd = new Date(r.published_at)
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth()
      })
      const withR = monthReviews.filter(r => r.rating !== null)
      const avg = withR.length > 0 ? parseFloat((withR.reduce((s, r) => s + (r.rating ?? 0), 0) / withR.length).toFixed(1)) : null
      const withScore = monthReviews.filter(r => r.ai_score !== null)
      const sentimentScore = withScore.length > 0 ? parseFloat((withScore.reduce((s, r) => s + (r.score ?? 0), 0) / withScore.length).toFixed(1)) : null
      months.push({ label, avgRating: avg, count: monthReviews.length, sentimentScore })
    }
    return months
  }
}, [reviews])
```
Note: update `dataKey="month"` to `dataKey="label"` in the chart JSX since the key changed.

**5. JSX changes in the return statement:**

A) **Intelligence Panel** — insert AFTER the KPI grid (`{/* KPI row */}`) and BEFORE the chart section:

```tsx
{/* Intelligence Panel */}
{reviews.some(r => r.ai_sentiment || r.ai_themes) && (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    {/* Widget 1: Aree da migliorare */}
    <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Aree da migliorare</p>
      {!intelligenceData.hasAnalyzedThemes ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${70 + i * 5}%` }} />
          ))}
        </div>
      ) : intelligenceData.topNegativeThemes.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Nessuna area critica rilevata</p>
      ) : (
        <ul className="space-y-1.5">
          {intelligenceData.topNegativeThemes.map(([theme, count]) => (
            <li key={theme} className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              <span className="text-gray-700 flex-1 truncate">{theme}</span>
              <span className="text-xs text-red-500 font-medium flex-shrink-0">{count} neg.</span>
            </li>
          ))}
        </ul>
      )}
    </div>

    {/* Widget 2: Trend ultimo mese */}
    <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Trend ultimo mese</p>
      {!intelligenceData.trendData ? (
        <p className="text-sm text-gray-400 italic">Dati insufficienti</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Positivita</span>
            <span className={`text-sm font-semibold ${intelligenceData.trendData.posA >= intelligenceData.trendData.posB ? 'text-green-600' : 'text-red-600'}`}>
              {intelligenceData.trendData.posA}%{' '}
              {intelligenceData.trendData.posA >= intelligenceData.trendData.posB
                ? `+${intelligenceData.trendData.posA - intelligenceData.trendData.posB}% ↑`
                : `${intelligenceData.trendData.posA - intelligenceData.trendData.posB}% ↓`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Negativita</span>
            <span className={`text-sm font-semibold ${intelligenceData.trendData.negA <= intelligenceData.trendData.negB ? 'text-green-600' : 'text-red-600'}`}>
              {intelligenceData.trendData.negA}%{' '}
              {intelligenceData.trendData.negA <= intelligenceData.trendData.negB
                ? `${intelligenceData.trendData.negA - intelligenceData.trendData.negB}% ↓`
                : `+${intelligenceData.trendData.negA - intelligenceData.trendData.negB}% ↑`}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">vs. mese precedente</p>
        </div>
      )}
    </div>

    {/* Widget 3: Urgenti senza risposta */}
    <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Urgenti senza risposta</p>
      <div className="flex flex-col items-center mb-3">
        <span className={`text-4xl font-bold ${intelligenceData.urgentPending.length > 0 ? 'text-red-600' : 'text-gray-300'}`}>
          {intelligenceData.urgentPending.length}
        </span>
        <span className="text-xs text-gray-500 text-center mt-1">recensioni urgenti senza risposta</span>
      </div>
      <div className="space-y-2">
        {intelligenceData.urgentPending.slice(0, 2).map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedReview(r)}
            className="w-full text-left p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <StarRow rating={r.rating} size={11} />
              <span className="text-xs font-medium text-gray-700 truncate">{r.author_name ?? 'Anonimo'}</span>
            </div>
            <p className="text-xs text-gray-600 truncate">{r.text?.slice(0, 60) ?? '—'}</p>
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

B) **Chart** — update chart section:
- Change title from "Trend ultimi 6 mesi" to "Trend recensioni" (dynamic)
- Change `dataKey="month"` to `dataKey="label"` in XAxis
- Add third Line inside ComposedChart (after existing Line):
```tsx
<Line
  yAxisId="left"
  type="monotone"
  dataKey="sentimentScore"
  name="Score AI"
  stroke="#6366F1"
  strokeWidth={1.5}
  strokeDasharray="4 2"
  dot={false}
  connectNulls
/>
```

C) **Filters** — add "Ultimi 12 mesi" pill between "Ultimi 90gg" and "Tutto":
```tsx
<Pill active={filterPeriod === '365'} onClick={() => setFilterPeriod('365')}>Ultimi 12 mesi</Pill>
```

DO NOT modify: fetchAllReviews, loadData, auth/routing logic, KPI computation, modal JSX and functions, ReviewCard, StarRow, Pill sub-components.
  </action>
  <verify>
    <automated>cd C:/Users/Zanni/fidelityapp && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
TypeScript compiles without errors on page.tsx. Intelligence Panel renders above review list. Chart has 3 lines. Filter row has 4 period pills including "Ultimi 12 mesi".
  </done>
</task>

<task type="auto">
  <name>Task 2: Review tier selector in OCIO settings</name>
  <files>app/dashboard/ocio/settings/page.tsx</files>
  <action>
Add a review tier selector section to app/dashboard/ocio/settings/page.tsx. Preserve ALL existing logic (loadData, saveConfig, toggleModule, MODULES array, ConfigState, DEFAULT_CONFIG). Make only these additive changes:

**1. New state variable** — add after existing useState declarations (around line 109):
```tsx
const [reviewTier, setReviewTier] = useState<string>('professional')
```

**2. Update loadData()** — inside the `if (data)` block (after setting config), add:
```tsx
setReviewTier(data.review_tier ?? 'professional')
```

**3. Update saveConfig()** — add `review_tier: reviewTier` to the PATCH body JSON:
```tsx
body: JSON.stringify({
  google_maps_url: mapsUrl.trim() || null,
  module_reviews: config.module_reviews,
  module_alerts: config.module_alerts,
  alert_whatsapp_number: alertPhone.trim() || null,
  review_tier: reviewTier,
}),
```

**4. New TIERS constant** — add before the component function (after DEFAULT_CONFIG):
```tsx
const REVIEW_TIERS: ReadonlyArray<{
  id: string
  name: string
  desc: string
  price: string
}> = [
  { id: 'starter',      name: 'Starter',      desc: 'ultime 200 recensioni',   price: 'Incluso' },
  { id: 'growth',       name: 'Growth',       desc: 'ultime 500 recensioni',   price: '+€4.99/mese' },
  { id: 'professional', name: 'Professional', desc: 'ultime 1.500 recensioni', price: '+€9.99/mese' },
  { id: 'complete',     name: 'Complete',     desc: 'tutta la tua storia',     price: '+€19.99/mese' },
] as const
```

**5. New JSX section** — insert BETWEEN the Google Maps URL card and the Moduli card (between lines ~264 and ~266 in current file). The Google Maps URL card ends with `</div>` (closing the rounded-xl div). Add immediately after it:

```tsx
{/* Profondita di analisi storica */}
<div className="bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-4">
  <div>
    <h2 className="font-semibold text-gray-900">Profondita di analisi storica</h2>
    <p className="text-sm text-gray-500 mt-0.5">
      Quante recensioni passate vuoi che analizziamo? Piu recensioni analizziamo, piu precisi sono gli insight sulle tue aree di miglioramento.
    </p>
  </div>
  <div className="border border-[#E8E8E8] rounded-xl overflow-hidden divide-y divide-[#E8E8E8]">
    {REVIEW_TIERS.map(tier => {
      const isSelected = reviewTier === tier.id
      return (
        <button
          key={tier.id}
          onClick={() => setReviewTier(tier.id)}
          className={`w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors ${
            isSelected ? 'bg-gray-50 border-l-2 border-l-black' : 'hover:bg-gray-50/50'
          }`}
        >
          {/* Radio circle */}
          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
            isSelected ? 'border-black bg-black' : 'border-gray-300'
          }`}>
            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
          {/* Name + desc */}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900">{tier.name}</span>
            <span className="text-sm text-gray-500 ml-2">{tier.desc}</span>
          </div>
          {/* Price */}
          <span className={`text-sm font-semibold flex-shrink-0 ${
            tier.price === 'Incluso' ? 'text-green-600' : 'text-gray-700'
          }`}>
            {tier.price}
          </span>
        </button>
      )
    })}
  </div>
  <p className="text-xs text-gray-400">
    Le nuove recensioni vengono sempre analizzate automaticamente, indipendentemente dal piano scelto.
  </p>
</div>
```

After all changes, commit with message exactly: `feat: ocio review tier selector in settings — zapier style`
For Task 1, commit with message exactly: `feat: ocio intelligence panel with critical areas, sentiment trend, urgent reviews`

Important: commit Task 1 first (ocio/page.tsx), then Task 2 (settings/page.tsx) as two separate atomic commits.
  </action>
  <verify>
    <automated>cd C:/Users/Zanni/fidelityapp && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
TypeScript compiles without errors on settings/page.tsx. Tier selector renders between Google Maps URL and Moduli sections. Selecting a tier updates visual state. "Professional" is the default. saveConfig sends review_tier in PATCH body.
  </done>
</task>

</tasks>

<verification>
- TypeScript: `npx tsc --noEmit` passes with no errors
- OCIO dashboard page: Intelligence Panel grid visible above chart, 3 widgets present
- Filter row: 4 period options including "Ultimi 12 mesi"
- Chart: 3 lines (Rating medio, Recensioni bar, Score AI dashed purple)
- Settings page: tier selector between Google Maps URL section and Moduli section
- Selected tier has black left border and black radio circle
- Two atomic commits with exact specified messages
</verification>

<success_criteria>
- Intelligence Panel renders with all 3 widgets when reviews exist
- Widget 1 shows top negative themes or skeleton (no crash if no themes)
- Widget 2 shows trend deltas or "Dati insufficienti" if fewer than 5 reviews per period
- Widget 3 shows urgent count + up to 2 clickable previews that open modal
- Chart adapts to data span (monthly default, quarterly for 3yr+) and shows Score AI dashed line
- "Ultimi 12 mesi" filter pill works correctly
- Tier selector in settings: all 4 tiers, default professional, correct selected styling
- TypeScript compiles clean
- Two separate git commits with specified messages
</success_criteria>

<output>
No SUMMARY.md needed for quick tasks. Commits serve as the record.
</output>
