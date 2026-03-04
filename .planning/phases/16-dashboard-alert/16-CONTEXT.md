# Phase 16: Dashboard + Alert - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Dashboard completa `/dashboard/ocio` che sostituisce lo stub attuale: lista recensioni analizzate con filtri, 4 KPI + grafico trend, modal con analisi AI completa e risposta copiabile. Alert WhatsApp automatico inviato dal task `ocio-ai-analyzer` per recensioni negative o urgenti.

Questa fase NON include: moduli 3–6 OCIO (Social Listening, Competitor, Price, Report) — stub "Prossimamente" già presenti da Phase 13. Non include reply automatici su Google Maps (quota 0).

</domain>

<decisions>
## Implementation Decisions

### Layout lista recensioni

- **Cards verticali compatte** — una card per recensione
- Ogni card contiene: stelle colorate (icone + numero es. "4/5"), nome autore, data, testo troncato a 3 righe (`line-clamp-3`), badge sentiment, badge urgenza, max 2 badge temi + "+N altri" se ci sono più temi, pulsante "Vedi risposta AI"
- Ordinamento default: più recenti prima (`ORDER BY published_at DESC`)
- Filtri sopra la lista: **Sentiment** (positive/neutral/negative), **Rating** (1-5 stelle), **Periodo** (ultimi 30gg / 90gg / tutto)
- Nessun filtro urgenza nella lista principale

### Modal recensione

- Click su "Vedi risposta AI" → modal centrato con overlay
- Contenuto modal:
  - Testo completo della recensione
  - Analisi AI completa: sentiment, urgenza, temi (tutti), ai_score
  - Se `ai_is_fake = true`: banner giallo/arancio con icona `AlertTriangle` + `ai_fake_reason` esplicito
  - Risposta AI suggerita (`ai_suggested_reply`) con pulsante "Copia risposta"
  - Link "Apri su Google Maps": usa `review_url` se disponibile da Apify, altrimenti fallback a `google_maps_url` dell'attività
  - Pulsanti azione: "Ho risposto" e "Ignora" → aggiornano `reply_status` su `ocio_reviews`
- Feedback "Copia risposta": toast "Copiato!" + pulsante diventa verde per 2 secondi, modal rimane aperto

### Reply status — gestione dal merchant

- `reply_status` valori: `'pending'` | `'replied'` | `'ignored'`
- "Ho risposto" → `UPDATE ocio_reviews SET reply_status='replied', replied_at=now()`
- "Ignora" → `UPDATE ocio_reviews SET reply_status='ignored'`
- API route: `PATCH /api/ocio/reviews/[id]` con `{ reply_status }` — autenticata con merchant_id check

### KPI header (sopra la lista)

- 4 card metriche in riga usando `MetricCard` esistente (`components/ui/MetricCard`)
- Su desktop: 4 colonne; su mobile: griglia 2×2
- Metriche:
  1. **Rating medio** — media `rating` di tutte le recensioni; delta freccia rispetto al mese precedente (verde se sale, rosso se scende) — usa trend support di `MetricCard`
  2. **Totale recensioni** — count totale `ocio_reviews` del merchant
  3. **Nuove (ultimi 30gg)** — count con `published_at >= now() - interval '30 days'`
  4. **Da rispondere** — count con `reply_status = 'pending'` (tutte le pending, non solo negative)

### Grafico trend (sotto le KPI)

- **Recharts** — due serie combinate: rating medio mensile (linea) + numero recensioni per mese (barre)
- Asse X: ultimi 6 mesi (label mese/anno)
- Asse Y sinistro: rating (scala 1–5)
- Asse Y destro: conteggio recensioni
- `ComposedChart` con `Bar` per il count e `Line` per il rating medio
- Stessa palette colori del design system (barre grigio chiaro, linea nera)

### Alert WhatsApp

- **Trigger:** dal task Trigger.dev `ocio-ai-analyzer`, subito dopo l'analisi AI, per ogni recensione che soddisfa la condizione
- **Condizione invio:** `ai_sentiment = 'negative'` OPPURE `ai_urgency IN ('high', 'critical')`
- **Pre-condizioni:** `module_alerts = true` in `ocio_config` AND `alert_whatsapp_number` configurato (non null/empty) in `ocio_config`
- **Destinatario:** `alert_whatsapp_number` da `ocio_config` — separato dal numero SendApp business
- **Contenuto messaggio** (breve e diretto, con emoji ⭐):
  ```
  ⭐ Nuova recensione [RATING]/5 da [NOME_AUTORE]
  "[PRIME_100_CARATTERI_TESTO...]"

  Visualizza su OCIO: [APP_URL]/dashboard/ocio
  ```
- **Link dashboard:** URL generico `/dashboard/ocio` (non per-review)
- **API usata:** `lib/sendapp.ts` — `sendTextMessage(merchantId, alertWhatsappNumber, message)`
- **Dopo invio:** `UPDATE ocio_reviews SET alert_sent=true, alert_sent_at=now()`
- **Se SendApp fallisce:** log dell'errore, NON fa fallire il task AI (try/catch separato)

### Feature gating

- `isBusiness` via `usePlan()` — già in stub page
- Se non BUSINESS: `UpgradePrompt` (pattern esistente)
- API routes OCIO: verifica `plan = 'business'` sul merchant, 403 se no

### Claude's Discretion

- Colori badge sentiment/urgenza (es. verde per positive, rosso per negative, giallo per high urgency)
- Dimensioni e spaziatura delle cards recensione
- Empty state se zero recensioni (suggerire di configurare URL Maps + attendere il primo scraping)
- Skeleton loading durante il caricamento dei dati
- Icone Lucide per i badge (es. `ThumbsUp`, `AlertTriangle`, `Clock`)
- Gestione review senza testo (solo rating — es. "Nessun testo disponibile")
- Formato data nelle cards (es. "15 gen 2026" vs "15/01/2026")

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `MetricCard` (`components/ui/MetricCard`): supporta valore, label, icona, trend con freccia colorata — usare per tutte e 4 le KPI
- `EmptyState` (`components/ui/EmptyState`): per stato zero recensioni
- `UpgradePrompt` (`components/ui/UpgradePrompt`): già nel stub per il gate BUSINESS
- `usePlan()` (`lib/hooks/usePlan.ts`): `isBusiness` flag per feature gating — già nel stub
- `recharts`: già usato in `analytics/page.tsx` con `ComposedChart`, `Bar`, `Line`, `XAxis`, `YAxis`
- `lib/sendapp.ts`: `sendTextMessage(merchantId, phone, message)` — riuso diretto per alert
- `createClient()` pattern: client-side per pagina, service role nei task Trigger.dev e API routes

### Established Patterns

- Pagina dashboard: `'use client'` + `useEffect loadData()` + auth check + `router.push('/login')` se non autenticato
- Modal: pattern da implementare inline nella pagina (nessun modal globale esistente — costruire con `fixed inset-0 z-50 bg-black/50`)
- Filtri lista: state locale `useState` + `.filter()` client-side (vedi `customers/page.tsx` con `searchQuery` e `filterTag`)
- Trigger.dev task: `import { task, logger } from '@trigger.dev/sdk/v3'` — struttura in `trigger/ocio-ai-analyzer.ts` già esistente da Phase 15
- API routes OCIO: pattern `POST /api/ocio/schedule` da Phase 14 — copiare per `PATCH /api/ocio/reviews/[id]`

### Integration Points

- `app/dashboard/ocio/page.tsx`: stub esistente da sostituire completamente con la dashboard piena
- `trigger/ocio-ai-analyzer.ts` (Phase 15): aggiungere logica alert WA dopo `UPDATE ai_analyzed_at`
- `ocio_config` table: leggere `module_alerts`, `alert_whatsapp_number`, `google_maps_url`
- `ocio_reviews` table: leggere tutti i campi `ai_*`; scrivere `reply_status`, `replied_at`, `alert_sent`, `alert_sent_at`
- `app/api/ocio/reviews/[id]/route.ts`: nuova API route PATCH per aggiornare `reply_status`

</code_context>

<specifics>
## Specific Ideas

- Dashboard `/dashboard/ocio` sostituisce completamente lo stub — non un refactor incrementale
- L'`ai_suggested_reply` è già nel DB (Phase 15 la scrive) — nessuna chiamata AI on-demand dalla dashboard, solo lettura
- Il link "Apri su Google Maps" nel modal usa `review_url` se Apify l'ha restituito, altrimenti `ocio_config.google_maps_url`
- Il merchant configura `alert_whatsapp_number` già nella settings page OCIO (Phase 13 ha il form — verificare se il campo è già esposto o va aggiunto)
- Messaggio alert breve per leggibilità su WhatsApp mobile — prime 100 caratteri del testo della recensione

</specifics>

<deferred>
## Deferred Ideas

- Deep link alert → review specifica (`/dashboard/ocio?review=[id]` con modal pre-aperto) — differito: richiede URL param parsing + stato React complesso; link generico alla dashboard è sufficiente per v3.0
- Re-analisi manuale di una recensione dalla dashboard (pulsante "Rianalizza") — differito post-v3.0
- Configurazione `business_description` e `reply_tone` via UI — deferred da Phase 13/15, da includere in una UI settings futura
- Filtro urgenza nella lista recensioni — deciso di non includerlo v3.0; aggiungere se richiesto dai merchant

</deferred>

---

*Phase: 16-dashboard-alert*
*Context gathered: 2026-03-04*
