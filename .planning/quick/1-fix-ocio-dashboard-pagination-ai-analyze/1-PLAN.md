---
type: quick
plan: 1
wave: 1
depends_on: []
files_modified:
  - app/dashboard/ocio/page.tsx
  - trigger/ocio-ai-analyzer.ts
autonomous: true
---

<objective>
Three targeted bug fixes for the OCIO module: paginate the reviews fetch to bypass Supabase's 1000-row default limit, batch the AI analyzer to 200 reviews per run and auto-retrigger for remaining work, and add an "analyzing in progress" screen so the dashboard does not appear empty while the first analysis runs.

Purpose: Merchants with more than 1000 reviews see truncated data; the analyzer can time out on large backlogs; the dashboard shows an unhelpful empty state during the initial scrape+analyze phase.
Output: All three files updated, each change committed atomically.
</objective>

<context>
@./CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Paginate ocio reviews fetch</name>
  <files>app/dashboard/ocio/page.tsx</files>
  <action>
Add a helper function `fetchAllReviews` above the `OcioDashboardPage` component (after the existing helper functions, before the main export). Replace the single supabase query for `ocio_reviews` inside `loadData()` with a call to this helper.

Current code to replace (lines 198-203 inside the Promise.all):
```typescript
supabase
  .from('ocio_reviews')
  .select('*')
  .eq('merchant_id', merchantId)
  .order('published_at', { ascending: false }),
```

Replace with a call to the new helper. The helper returns `OcioReview[]` directly, so restructure the Promise.all to handle this: run the config query in parallel with the paginated fetch using Promise.all([fetchAllReviews(supabase, merchantId), configQuery]).

New helper to add (place before the `OcioDashboardPage` function, after all other helper functions):
```typescript
async function fetchAllReviews(supabase: ReturnType<typeof createClient>, merchantId: string): Promise<OcioReview[]> {
  const pageSize = 1000
  let from = 0
  let allReviews: OcioReview[] = []
  while (true) {
    const { data, error } = await supabase
      .from('ocio_reviews')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('published_at', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error || !data || data.length === 0) break
    allReviews = [...allReviews, ...data]
    if (data.length < pageSize) break
    from += pageSize
  }
  return allReviews
}
```

Update `loadData` to:
```typescript
const [reviewsData, { data: configData }] = await Promise.all([
  fetchAllReviews(supabase, merchantId),
  supabase
    .from('ocio_config')
    .select('google_maps_url')
    .eq('merchant_id', merchantId)
    .single(),
])
setReviews(reviewsData)
```

After the change, commit with exactly: `fix: paginate ocio reviews fetch to load all records`
  </action>
  <verify>TypeScript compiles: `npx tsc --noEmit` passes with no new errors.</verify>
  <done>fetchAllReviews helper exists in page.tsx; loadData no longer calls .select directly on ocio_reviews; commit exists with specified message.</done>
</task>

<task type="auto">
  <name>Task 2: Batch AI analyzer to 200 reviews + auto-retrigger</name>
  <files>trigger/ocio-ai-analyzer.ts</files>
  <action>
Two changes to the unanalyzed reviews query and the end of the task run function.

Change 1 — add `.limit(200)` to the unanalyzed reviews fetch (around line 146-151):
```typescript
const { data: reviews, error: reviewsError } = await supabase
  .from("ocio_reviews")
  .select("id, text, rating, author_name, review_url, alert_sent")
  .eq("merchant_id", merchantId)
  .is("ai_analyzed_at", null)
  .limit(200)   // <-- add this line
```

Change 2 — after the for loop ends and before the `const summary = ...` line, insert the auto-retrigger block. Import `tasks` from `@trigger.dev/sdk/v3` (it is already imported alongside `logger` and `task` — add `tasks` to that import):

Update the import at line 1:
```typescript
import { logger, task, tasks } from "@trigger.dev/sdk/v3"
```

Insert after the for loop, before `const summary = ...`:
```typescript
if (processed > 0) {
  const { count: remaining } = await supabase
    .from("ocio_reviews")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchantId)
    .is("ai_analyzed_at", null)
  if ((remaining ?? 0) > 0) {
    await tasks.trigger("ocio-ai-analyzer", { merchantId })
    logger.log("ocio-ai-analyzer: more reviews pending, retriggering", { remaining })
  }
}
```

After the change, commit with exactly: `fix: batch analyzer 200 reviews + auto-retrigger`
  </action>
  <verify>TypeScript compiles: `npx tsc --noEmit` passes with no new errors in trigger/ocio-ai-analyzer.ts.</verify>
  <done>Query has .limit(200); tasks import added; auto-retrigger block present after for loop; commit exists with specified message.</done>
</task>

<task type="auto">
  <name>Task 3: Add analyzing-in-progress screen</name>
  <files>app/dashboard/ocio/page.tsx</files>
  <action>
After `loadData()` completes and both `isBusiness` checks pass, add a third render branch before the main return that shows an "analyzing in progress" screen when Google Maps URL is configured but no reviews exist yet.

The current render section (around line 317-331) checks:
1. `planLoading || loading` — spinner
2. `!isBusiness` — upgrade prompt
3. else — full dashboard

Add a new branch between check 2 and 3. The branch condition is: `reviews.length === 0 && googleMapsUrl !== null`.

Add a `useEffect` for the auto-refresh. Place it after the existing `useEffect(() => { loadData() }, [])`:
```typescript
useEffect(() => {
  if (reviews.length === 0 && googleMapsUrl !== null && !loading) {
    const interval = setInterval(() => {
      loadData()
    }, 30000)
    return () => clearInterval(interval)
  }
}, [reviews.length, googleMapsUrl, loading])
```

New render branch to insert after the `!isBusiness` check and before the main `return (`:
```typescript
if (reviews.length === 0 && googleMapsUrl !== null) {
  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye size={24} />
            OCIO — Reputation Intelligence
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gestisci le tue recensioni Google con l&apos;aiuto dell&apos;AI</p>
        </div>
        <Link
          href="/dashboard/ocio/settings"
          className="flex items-center gap-2 px-4 py-2 border border-[#E0E0E0] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Settings size={16} />
          Impostazioni
        </Link>
      </div>
      <div className="bg-white border border-[#E8E8E8] rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-10 h-10 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <h2 className="text-lg font-semibold text-gray-900">Stiamo analizzando la tua attività…</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Le tue recensioni sono in fase di raccolta e analisi AI. Questa pagina si aggiornerà automaticamente ogni 30 secondi.
        </p>
      </div>
    </div>
  )
}
```

The existing `reviews.length === 0` branch inside the reviews list section (currently showing EmptyState with "Nessuna recensione ancora") should remain unchanged — it handles the case where `googleMapsUrl === null` (no settings configured). The new top-level branch intercepts before we reach the list, so when `googleMapsUrl !== null && reviews.length === 0` the analyzing screen is shown instead.

After the change, commit with exactly: `feat: add analyzing-in-progress screen to ocio dashboard`
  </action>
  <verify>TypeScript compiles: `npx tsc --noEmit` passes. Visit /dashboard/ocio with a merchant that has googleMapsUrl set but no reviews — analyzing screen appears with spinner. With googleMapsUrl null — existing empty state shown.</verify>
  <done>Analyzing screen renders when googleMapsUrl is set and reviews array is empty; auto-refresh interval fires every 30s; commit exists with specified message.</done>
</task>

</tasks>

<success_criteria>
- All three commits exist with the exact messages specified.
- `npx tsc --noEmit` passes after all changes.
- fetchAllReviews loops until data.length less than pageSize.
- ocio-ai-analyzer.ts limits unanalyzed fetch to 200 and triggers itself again when remaining > 0.
- OCIO dashboard shows animated spinner + "Stiamo analizzando" text when URL is configured but reviews array is empty.
</success_criteria>
