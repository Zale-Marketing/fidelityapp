---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/dashboard/ocio/page.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "globalPeriod pill buttons appaiono sotto i KPI e controllano Intelligence Panel + lista"
    - "Intelligence widgets mostrano ratio-based temi (aree da migliorare, punti di forza, urgenti)"
    - "Sezione confronto periodi è collassabile con due date picker e tabella di calcolo locale"
    - "Search bar filtra recensioni per testo e autore in tempo reale"
    - "Click su un tema nell'Intelligence Panel filtra la lista con banner dismissibile"
  artifacts:
    - path: app/dashboard/ocio/page.tsx
      provides: "OCIO dashboard con 5 nuove feature (globalPeriod, intelligence rewrite, comparison, search, drill-down)"
  key_links:
    - from: "globalPeriod state"
      to: "intelligenceData useMemo + filteredReviews useMemo"
      via: "filtro date cutoff applicato come primo step in entrambi"
    - from: "Intelligence Panel widget click"
      to: "themeFilter state"
      via: "setThemeFilter({ theme, sentiment })"
    - from: "themeFilter + searchQuery"
      to: "filteredReviews"
      via: "AND logico nell'useMemo filteredReviews"
---

<objective>
Redesign completo di app/dashboard/ocio/page.tsx con 5 miglioramenti sequenziali implementati in 5 commit atomici.

Purpose: Trasforma la dashboard OCIO da lista filtrata a strumento di intelligence reale — filtro temporale globale, widget ratio-based, confronto periodi, ricerca full-text, drill-down temi.
Output: app/dashboard/ocio/page.tsx aggiornato con tutte le feature; 5 commit atomici git.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md

<interfaces>
<!-- Stato attuale di app/dashboard/ocio/page.tsx — capire prima di modificare -->

State esistente (NON toccare):
- reviews: OcioReview[]
- googleMapsUrl: string | null
- loading: boolean
- selectedReview: OcioReview | null
- filterSentiment: 'all'|'positive'|'neutral'|'negative'  → rimane nelle filter pills
- filterRating: number|'all'                               → rimane nelle filter pills
- filterPeriod: '30'|'90'|'365'|'all'                     → DA RIMUOVERE (sostituito da globalPeriod)
- copying: boolean
- accessToken: string

useMemo esistenti:
- kpis — computed da reviews (tutti, no period filter) → rimane invariato
- intelligenceData — DA RISCRIVERE nel commit 2
- chartData — computed da reviews (tutti) → rimane invariato
- filteredReviews — DA ESTENDERE nei commit 1, 4, 5

Funzioni da NON toccare: loadData(), fetchAllReviews(), updateReplyStatus(), handleCopy()
UI da NON toccare: KPI cards, Chart trend, Modal, Header, UpgradePrompt, EmptyState

Tipo OcioReview (da lib/types.ts):
- id: string
- published_at: string | null
- author_name: string | null
- text: string | null
- rating: number | null
- reply_status: 'pending'|'replied'|'ignored'
- ai_sentiment: 'positive'|'neutral'|'negative' | null
- ai_urgency: 'low'|'medium'|'high'|'critical' | null
- ai_themes: string[] | null
- ai_score: number | null
- ai_suggested_reply: string | null
- ai_is_fake: boolean | null
- ai_fake_reason: string | null
- review_url: string | null
- merchant_id: string
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Global period filter — state, UI pill buttons, filteredReviews integration</name>
  <files>app/dashboard/ocio/page.tsx</files>
  <action>
    1. Aggiungi state: `const [globalPeriod, setGlobalPeriod] = useState<'30'|'90'|'180'|'365'|'all'>('all')`

    2. Rimuovi `filterPeriod` state (riga 193: `const [filterPeriod, setFilterPeriod] = useState...`) — non serve più.

    3. Inserisci il selettore globalPeriod come sezione dedicata subito DOPO il blocco `{/* KPI row */}` (dopo la chiusura del `</div>` delle grid KPI, prima di `{/* Intelligence Panel */}`):
    ```tsx
    {/* Global period filter */}
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-gray-500 font-medium">Periodo:</span>
      <Pill active={globalPeriod === '30'} onClick={() => setGlobalPeriod('30')}>Ultimi 30gg</Pill>
      <Pill active={globalPeriod === '90'} onClick={() => setGlobalPeriod('90')}>Ultimi 3 mesi</Pill>
      <Pill active={globalPeriod === '180'} onClick={() => setGlobalPeriod('180')}>Ultimi 6 mesi</Pill>
      <Pill active={globalPeriod === '365'} onClick={() => setGlobalPeriod('365')}>Ultimi 12 mesi</Pill>
      <Pill active={globalPeriod === 'all'} onClick={() => setGlobalPeriod('all')}>Tutto</Pill>
    </div>
    ```

    4. Aggiorna il blocco `{/* Filters */}` (riga 650): rimuovi la sezione "Periodo" (le 5 righe con `<Pill filterPeriod...>`) in quanto il controllo temporale è ora globale.

    5. Aggiorna `filteredReviews` useMemo: sostituisci la condizione filterPeriod con globalPeriod come PRIMO filtro:
    ```ts
    const filteredReviews = useMemo(() => {
      const now = new Date()
      return reviews.filter(r => {
        // globalPeriod prima di tutto
        if (globalPeriod !== 'all' && r.published_at) {
          const days = parseInt(globalPeriod)
          const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
          if (new Date(r.published_at) < cutoff) return false
        }
        if (filterSentiment !== 'all' && r.ai_sentiment !== filterSentiment) return false
        if (filterRating !== 'all' && r.rating !== filterRating) return false
        return true
      })
    }, [reviews, globalPeriod, filterSentiment, filterRating])
    ```

    Commit atomico: `feat: global period filter controls intelligence panel and review list`
  </action>
  <verify>
    `npx tsc --noEmit` passa senza errori su app/dashboard/ocio/page.tsx.
    Visivamente: pill buttons "Ultimi 30gg / Ultimi 3 mesi / Ultimi 6 mesi / Ultimi 12 mesi / Tutto" appaiono sotto i KPI; la sezione "Periodo" nelle filter pills sotto è sparita.
  </verify>
  <done>globalPeriod state esiste, pill buttons renderizzati post-KPI, filterPeriod rimosso, filteredReviews usa globalPeriod come primo filtro</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite Intelligence Panel — ratio-based widgets con barre bicolori e click drill-down</name>
  <files>app/dashboard/ocio/page.tsx</files>
  <action>
    PREREQUISITO: Questo task viene dopo commit 1. Usa `globalPeriod` già disponibile.

    1. Aggiungi state per themeFilter (anticipato per usarlo nel click dei widget, verrà usato completamente in task 5):
    ```ts
    const [themeFilter, setThemeFilter] = useState<{ theme: string; sentiment: 'positive'|'negative' } | null>(null)
    ```

    2. Riscrivi completamente `intelligenceData` useMemo. La nuova logica:
    ```ts
    const intelligenceData = useMemo(() => {
      // Applica globalPeriod
      const now = new Date()
      const periodReviews = globalPeriod === 'all' ? reviews : reviews.filter(r => {
        if (!r.published_at) return false
        const days = parseInt(globalPeriod)
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        return new Date(r.published_at) >= cutoff
      })
      const totalInPeriod = periodReviews.length

      // Soglie adattive
      const isLowData = totalInPeriod < 20
      const negRatioThreshold = isLowData ? 0.2 : 0.3
      const negMinCount = isLowData ? 2 : 3
      const posRatioThreshold = isLowData ? 0.3 : 0.2
      const posMinCount = isLowData ? 3 : 5

      // Calcola stats per tema
      const themeStats: Record<string, { total: number; positive: number; negative: number }> = {}
      for (const r of periodReviews) {
        if (!r.ai_themes) continue
        for (const t of r.ai_themes) {
          if (!themeStats[t]) themeStats[t] = { total: 0, positive: 0, negative: 0 }
          themeStats[t].total++
          if (r.ai_sentiment === 'positive') themeStats[t].positive++
          if (r.ai_sentiment === 'negative') themeStats[t].negative++
        }
      }

      // Widget 1: Aree da migliorare (ratio negativa alta)
      const improvementAreas = Object.entries(themeStats)
        .filter(([, s]) => s.total >= negMinCount && (s.negative / s.total) > negRatioThreshold)
        .sort((a, b) => (b[1].negative / b[1].total) - (a[1].negative / a[1].total))
        .slice(0, 5)
        .map(([theme, s]) => ({ theme, ...s, ratio: s.negative / s.total }))

      // Widget 2: Punti di forza (ratio positiva alta)
      const strengths = Object.entries(themeStats)
        .filter(([, s]) => s.total >= posMinCount && (s.negative / s.total) < posRatioThreshold)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(([theme, s]) => ({ theme, ...s, ratio: s.negative / s.total }))

      // Widget 3: Urgenti senza risposta (filtrati per globalPeriod)
      const urgentPending = periodReviews.filter(
        r => r.reply_status === 'pending' && (r.ai_urgency === 'high' || r.ai_urgency === 'critical')
      )

      const hasAnalyzedThemes = periodReviews.some(r => r.ai_themes && r.ai_themes.length > 0)

      return { improvementAreas, strengths, urgentPending, hasAnalyzedThemes, totalInPeriod }
    }, [reviews, globalPeriod])
    ```

    3. Riscrivi la sezione JSX `{/* Intelligence Panel */}`. Struttura:
    - Widget 1 "Aree da migliorare": se `!hasAnalyzedThemes` → skeleton animato (come ora). Altrimenti, se `improvementAreas.length === 0` → "Nessuna area critica nel periodo". Altrimenti lista con barra bicolore + click:
      ```tsx
      {intelligenceData.improvementAreas.map(({ theme, total, negative, positive, ratio }) => (
        <button key={theme} onClick={() => setThemeFilter({ theme, sentiment: 'negative' })}
          className="w-full text-left group">
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-700 truncate group-hover:text-gray-900">{theme}</span>
            <span className="text-red-500 font-medium ml-2 flex-shrink-0">{Math.round(ratio * 100)}% neg</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
            <div className="bg-green-400" style={{ width: `${Math.round(positive / total * 100)}%` }} />
            <div className="bg-red-400" style={{ width: `${Math.round(negative / total * 100)}%` }} />
          </div>
          <span className="text-xs text-gray-400">{total} recensioni</span>
        </button>
      ))}
      ```
    - Widget 2 "Punti di forza": struttura identica ma click → `setThemeFilter({ theme, sentiment: 'positive' })`, colore titolo verde.
    - Widget 3 "Urgenti senza risposta": mantieni struttura esistente (numero grande + 2 preview clickabili) ma usa `intelligenceData.urgentPending`.

    Stili widget: `border border-[#E8E8E8] bg-white rounded-xl p-5`, titoli `text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3`.

    Commit atomico: `feat: rewrite intelligence panel — areas with ratio, strengths, clickable themes`
  </action>
  <verify>
    `npx tsc --noEmit` passa. Intelligence Panel mostra 3 widget con dati ratio-based. Click su un tema in widget 1 o 2 non crasha (themeFilter state settato, drill-down sarà usato in task 5).
  </verify>
  <done>intelligenceData usa ratio+soglie adattive, widget 1 e 2 mostrano barre bicolori, click sui temi setta themeFilter</done>
</task>

<task type="auto">
  <name>Task 3: Period comparison collapsible section with two date pickers</name>
  <files>app/dashboard/ocio/page.tsx</files>
  <action>
    1. Aggiungi states:
    ```ts
    const [comparisonOpen, setComparisonOpen] = useState(false)
    // Default: mese corrente vs mese precedente
    const [periodAFrom, setPeriodAFrom] = useState<string>(() => {
      const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
    })
    const [periodATo, setPeriodATo] = useState<string>(() => new Date().toISOString().split('T')[0])
    const [periodBFrom, setPeriodBFrom] = useState<string>(() => {
      const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); return d.toISOString().split('T')[0]
    })
    const [periodBTo, setPeriodBTo] = useState<string>(() => {
      const d = new Date(); d.setDate(0); return d.toISOString().split('T')[0]  // ultimo giorno mese precedente
    })
    ```

    2. Aggiungi `comparisonData` useMemo (zero query Supabase):
    ```ts
    const comparisonData = useMemo(() => {
      if (!comparisonOpen) return null
      const filterPeriod = (from: string, to: string) =>
        reviews.filter(r => {
          if (!r.published_at) return false
          const d = r.published_at.split('T')[0]
          return d >= from && d <= to
        })
      const a = filterPeriod(periodAFrom, periodATo)
      const b = filterPeriod(periodBFrom, periodBTo)
      if (a.length === 0 && b.length === 0) return null

      const pct = (arr: OcioReview[], sentiment: string) =>
        arr.length > 0 ? Math.round(arr.filter(r => r.ai_sentiment === sentiment).length / arr.length * 100) : null
      const avgField = (arr: OcioReview[], field: 'rating' | 'ai_score') => {
        const valid = arr.filter(r => r[field] !== null)
        return valid.length > 0 ? parseFloat((valid.reduce((s, r) => s + (r[field] as number), 0) / valid.length).toFixed(1)) : null
      }
      const topNeg = (arr: OcioReview[]) => {
        const cnt: Record<string, number> = {}
        for (const r of arr) if (r.ai_sentiment === 'negative' && r.ai_themes) for (const t of r.ai_themes) cnt[t] = (cnt[t] ?? 0) + 1
        return Object.entries(cnt).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([t]) => t)
      }
      return {
        posA: pct(a, 'positive'), posB: pct(b, 'positive'),
        negA: pct(a, 'negative'), negB: pct(b, 'negative'),
        ratingA: avgField(a, 'rating'), ratingB: avgField(b, 'rating'),
        scoreA: avgField(a, 'ai_score'), scoreB: avgField(b, 'ai_score'),
        topNegA: topNeg(a), topNegB: topNeg(b),
        countA: a.length, countB: b.length,
      }
    }, [reviews, comparisonOpen, periodAFrom, periodATo, periodBFrom, periodBTo])
    ```

    3. Inserisci la sezione JSX subito DOPO il blocco Intelligence Panel (prima del `{/* Chart trend */}`):
    ```tsx
    {/* Period comparison */}
    <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden">
      <button
        onClick={() => setComparisonOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span>Confronta due periodi</span>
        <span className={`transition-transform ${comparisonOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {comparisonOpen && (
        <div className="px-5 pb-5 space-y-4 border-t border-[#E8E8E8]">
          {/* Date pickers affiancati */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Periodo A</p>
              <div className="flex gap-2 items-center">
                <input type="date" value={periodAFrom} onChange={e => setPeriodAFrom(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
                <span className="text-xs text-gray-400">→</span>
                <input type="date" value={periodATo} onChange={e => setPeriodATo(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Periodo B</p>
              <div className="flex gap-2 items-center">
                <input type="date" value={periodBFrom} onChange={e => setPeriodBFrom(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
                <span className="text-xs text-gray-400">→</span>
                <input type="date" value={periodBTo} onChange={e => setPeriodBTo(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
              </div>
            </div>
          </div>
          {/* Tabella comparativa */}
          {comparisonData ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left py-2 font-medium">Metrica</th>
                  <th className="text-center py-2 font-medium">Periodo A ({comparisonData.countA} rec.)</th>
                  <th className="text-center py-2 font-medium">Periodo B ({comparisonData.countB} rec.)</th>
                  <th className="text-center py-2 font-medium">Variazione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { label: '% Positive', a: comparisonData.posA, b: comparisonData.posB, unit: '%', higherIsBetter: true },
                  { label: '% Negative', a: comparisonData.negA, b: comparisonData.negB, unit: '%', higherIsBetter: false },
                  { label: 'Rating medio', a: comparisonData.ratingA, b: comparisonData.ratingB, unit: '', higherIsBetter: true },
                  { label: 'Score AI medio', a: comparisonData.scoreA, b: comparisonData.scoreB, unit: '', higherIsBetter: true },
                ].map(({ label, a, b, unit, higherIsBetter }) => {
                  const diff = a !== null && b !== null ? parseFloat((a - b).toFixed(1)) : null
                  const isPositive = diff !== null && (higherIsBetter ? diff > 0 : diff < 0)
                  return (
                    <tr key={label}>
                      <td className="py-2 text-gray-600">{label}</td>
                      <td className="py-2 text-center font-medium">{a !== null ? `${a}${unit}` : '—'}</td>
                      <td className="py-2 text-center font-medium">{b !== null ? `${b}${unit}` : '—'}</td>
                      <td className={`py-2 text-center font-semibold ${diff !== null ? (isPositive ? 'text-green-600' : diff === 0 ? 'text-gray-400' : 'text-red-600') : 'text-gray-300'}`}>
                        {diff !== null ? `${diff > 0 ? '+' : ''}${diff}${unit}` : '—'}
                      </td>
                    </tr>
                  )
                })}
                <tr>
                  <td className="py-2 text-gray-600">Top temi negativi</td>
                  <td className="py-2 text-center text-xs text-gray-500">{comparisonData.topNegA.join(', ') || '—'}</td>
                  <td className="py-2 text-center text-xs text-gray-500">{comparisonData.topNegB.join(', ') || '—'}</td>
                  <td className="py-2" />
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-4">Nessuna recensione nei periodi selezionati</p>
          )}
        </div>
      )}
    </div>
    ```

    Commit atomico: `feat: period comparison table with two date pickers`
  </action>
  <verify>
    `npx tsc --noEmit` passa. Sezione "Confronta due periodi" appare collassata di default, si espande al click, mostra due date picker e la tabella calcolata su dati già caricati senza nuove fetch.
  </verify>
  <done>comparisonOpen state, date picker funzionanti, tabella comparativa con frecce colored, zero query Supabase aggiuntive</done>
</task>

<task type="auto">
  <name>Task 4: Full text and author search bar with result count</name>
  <files>app/dashboard/ocio/page.tsx</files>
  <action>
    1. Aggiungi state: `const [searchQuery, setSearchQuery] = useState('')`

    2. Aggiorna `filteredReviews` useMemo aggiungendo searchQuery come condizione (dopo globalPeriod, prima di sentiment):
    ```ts
    // dopo il filtro globalPeriod:
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (
        !(r.text?.toLowerCase().includes(q)) &&
        !(r.author_name?.toLowerCase().includes(q))
      ) return false
    }
    ```
    Aggiungi `searchQuery` nelle dipendenze dell'useMemo.

    3. Inserisci la search bar subito SOPRA le filter pills (prima del `{/* Filters */}` attuale), come sezione separata:
    ```tsx
    {/* Search bar */}
    <div className="relative">
      <input
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Cerca per testo o autore…"
        className="w-full text-sm border border-[#E8E8E8] rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-gray-300"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}
    </div>
    ```

    4. Subito SOTTO la search bar (prima dei `{/* Filters */}` pills), mostra il conteggio risultati quando searchQuery non è vuota:
    ```tsx
    {searchQuery.trim() && (
      <p className="text-xs text-gray-500 -mt-2">
        {filteredReviews.length} risultat{filteredReviews.length === 1 ? 'o' : 'i'} trovat{filteredReviews.length === 1 ? 'o' : 'i'} per &ldquo;{searchQuery}&rdquo;
      </p>
    )}
    ```

    Commit atomico: `feat: full text and author search in ocio review filters`
  </action>
  <verify>
    `npx tsc --noEmit` passa. Digitare un nome autore nella search filtra la lista in tempo reale. Il contatore "X risultati trovati per 'query'" appare sotto la search bar solo se searchQuery non vuota.
  </verify>
  <done>searchQuery state, input renderizzato, filteredReviews include condizione search, contatore risultati visibile</done>
</task>

<task type="auto">
  <name>Task 5: Theme drill-down filter with dismissible banner in review list</name>
  <files>app/dashboard/ocio/page.tsx</files>
  <action>
    NOTA: `themeFilter` state è già stato aggiunto in task 2. Questo task completa l'integrazione con filteredReviews e aggiunge il banner.

    1. Aggiorna `filteredReviews` useMemo aggiungendo il filtro themeFilter DOPO searchQuery (e DOPO globalPeriod):
    ```ts
    // dopo searchQuery:
    if (themeFilter) {
      if (!r.ai_themes?.includes(themeFilter.theme)) return false
      if (r.ai_sentiment !== themeFilter.sentiment) return false
    }
    ```
    Aggiungi `themeFilter` nelle dipendenze dell'useMemo.

    2. Inserisci il banner themeFilter subito SOPRA la lista recensioni (`{/* Reviews list */}`), condizionale su `themeFilter !== null`:
    ```tsx
    {themeFilter && (
      <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
        <p className="text-sm text-indigo-700">
          Stai vedendo: recensioni{' '}
          <span className="font-semibold">{themeFilter.sentiment === 'negative' ? 'negative' : 'positive'}</span>
          {' '}su{' '}
          <span className="font-semibold">&ldquo;{themeFilter.theme}&rdquo;</span>
        </p>
        <button
          onClick={() => setThemeFilter(null)}
          className="flex items-center gap-1 text-sm text-indigo-500 hover:text-indigo-700 font-medium ml-4 flex-shrink-0"
        >
          Mostra tutte ✕
        </button>
      </div>
    )}
    ```

    3. Verifica che la logica AND funzioni correttamente: con searchQuery = "Mario" e themeFilter = { theme: "servizio", sentiment: "negative" }, filteredReviews deve mostrare SOLO recensioni che contengono "mario" nel testo/autore E hanno tema "servizio" E sentiment "negative".

    4. ORDINE FILTRI FINALE in filteredReviews useMemo (da CONTEXT.md):
       globalPeriod → searchQuery → themeFilter → filterSentiment → filterRating

    Commit atomico: `feat: theme drill-down filter with banner in review list`
  </action>
  <verify>
    `npx tsc --noEmit` passa senza errori.
    Cliccando un tema in "Aree da migliorare": banner indigo appare sopra la lista, lista mostra solo recensioni con quel tema negative. Cliccando ✕ nel banner: themeFilter resetta, lista torna completa. search + themeFilter attivi contemporaneamente filtrano con AND.
  </verify>
  <done>themeFilter integrato in filteredReviews con AND logico, banner dismissibile renderizzato, ordine filtri corretto</done>
</task>

</tasks>

<verification>
Dopo tutti e 5 i commit:
- `npx tsc --noEmit` senza errori TypeScript
- La dashboard mostra: pill globalPeriod sotto KPI, 3 widget intelligence con barre bicolori, sezione confronto collassabile, search bar, banner drill-down
- Nessuna regressione su: fetch paginato, modal dettaglio, KPI cards, chart, auth routing
</verification>

<success_criteria>
- 5 commit atomici con i messaggi esatti specificati
- globalPeriod controlla sia Intelligence Panel che filteredReviews
- Widget intelligence calcolano ratio (negative/total) con soglie adattive se totalInPeriod < 20
- Confronto periodi calcola su reviews già caricate, zero fetch aggiuntive
- searchQuery e themeFilter si sommano con AND in filteredReviews
- TypeScript compila senza errori
</success_criteria>

<output>
Nessun SUMMARY richiesto per quick tasks. Aggiorna .planning/STATE.md sezione "Quick Tasks Completed" aggiungendo la riga per il task 3.
</output>
