# Phase 14: Scraping Pipeline - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Il sistema recupera automaticamente nuove recensioni Google Maps ogni 6 ore tramite Apify actor e le salva nella tabella `ocio_reviews` senza duplicati. Include: il task Trigger.dev con la logica di scraping, l'API route che gestisce il lifecycle dello schedule, e l'aggiornamento `last_scrape_at` su `ocio_config`.

Questa fase NON include: analisi AI delle recensioni (Phase 15), dashboard di visualizzazione (Phase 16), alert WhatsApp (Phase 16).

</domain>

<decisions>
## Implementation Decisions

### Lifecycle dello schedule Trigger.dev

- **Trigger di creazione:** Lo schedule viene creato quando il merchant salva l'URL Google Maps in `/dashboard/ocio/settings`
- **API route dedicata:** `POST /api/ocio/schedule` — la settings page chiama questa route al salvataggio URL; la route gestisce create/cancel via Trigger.dev SDK (pattern coerente con le altre API routes)
- **externalId:** `merchantId` — identifica univocamente lo schedule per-merchant
- **Disabilitazione modulo:** Se il merchant disabilita il toggle "Monitoraggio Recensioni", lo schedule viene **cancellato** (DELETE via Trigger.dev API). Se riabilita, si ricrea. Zero job fantasma
- **Cambio URL:** Nessuna azione sullo schedule — lo schedule usa externalId=merchantId, non l'URL. Il prossimo run legge l'URL aggiornato da `ocio_config`. Nessun recreate necessario

### Strategia prima run vs incrementale

- **Prima run (storico):** Il task controlla se il merchant ha 0 recensioni nel DB → `maxReviews: 50`
- **Run incrementali:** Se il merchant ha già recensioni → `maxReviews: 20` (solo le più recenti per sort by newest)
- **Logica:** Controllo count reviews nel task all'inizio — nessun campo extra su `ocio_config`
- **Deduplication:** Full scrape + upsert `ignoreDuplicates: true` su `(merchant_id, review_id)` — semplice, robusto, zero logica di diff

### Configurazione Apify actor

- **Actor:** `compass/google-maps-reviews-scraper`
- **Input:** `{ startUrls: [{ url: google_maps_url }] }` — URL Google Maps passato direttamente, no pre-processing per place_id
- **Sort:** `reviewsSort: 'newest'` — garantisce che le prime N recensioni siano le più recenti
- **maxReviews:** 50 (prima run) / 20 (run successive) — come da decisione strategia
- **Timeout:** `actor.call()` con `waitForFinish: 120` (secondi). Se supera 120s → task Trigger.dev fallisce → retry automatico (3 tentativi con backoff, già configurato in `trigger.config.ts`)

### Error handling e osservabilità

- **URL non configurato:** Se `google_maps_url` è null/empty all'attivazione dello schedule → log silenzioso `"skipping: no URL configured"` e termina con successo. Nessun retry inutile
- **Apify fallisce:** Throw Error dal task → Trigger.dev gestisce retry automatico (3 tentativi, backoff esponenziale). Dopo 3 fallimenti, il run appare "failed" nella Trigger.dev dashboard. Nessun codice di retry da scrivere
- **Run riuscito:** `UPDATE ocio_config SET last_scrape_at = now()` + `logger.log({ merchantId, newReviews: N, totalFetched: M })` visibile nella Trigger.dev dashboard
- **No tabelle di log extra:** Trigger.dev dashboard è sufficiente per osservabilità v3.0

### Claude's Discretion

- Struttura interna del task Trigger.dev (come splittare logic, naming funzioni helper)
- Gestione edge case API Apify (formato response, mapping campi → schema `ocio_reviews`)
- Come gestire recensioni senza testo (solo rating)
- Linguaggio delle log messages

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `trigger.config.ts`: progetto `proj_zvyvldbkgijrsvkohrfs` già configurato, `retries.default` 3 tentativi con backoff esponenziale — il task eredita questo comportamento
- `trigger/example.ts`: struttura `schedules.task({ id, cron, run })` — pattern da seguire per il task di scraping
- `createClient()` con service role key: pattern già usato nelle API routes per accesso DB lato server
- `app/api/cron/birthday/route.ts`: esempio di cron job esistente — struttura da consultare per pattern
- `ocio_config` table: `google_maps_url`, `last_scrape_at`, `trigger_schedule_id`, `module_reviews` già presenti nello schema (Phase 13)
- `ocio_reviews` table: schema completo già definito in Phase 13, inclusi indici e UNIQUE(merchant_id, review_id)

### Established Patterns

- API routes con service role key per operazioni DB lato server
- Pattern `try/catch` con risposta JSON `{ error }` / `{ success }` nelle API routes
- Auth check nelle API routes: `supabase.auth.getUser()` + verifica `merchant_id`

### Integration Points

- `app/dashboard/ocio/settings/page.tsx`: chiama `POST /api/ocio/schedule` al salvataggio URL Maps
- `trigger/` directory: nuovo file `ocio-scraper.ts` con il task Trigger.dev
- `app/api/ocio/schedule/route.ts`: nuova API route per lifecycle schedule
- Phase 15 consumerà: `ocio_reviews` con `ai_analyzed_at = null` (recensioni non ancora analizzate) → il task AI le processa

</code_context>

<specifics>
## Specific Ideas

- Il task Trigger.dev usa `externalId: merchantId` per lo schedule — questo permette di fare upsert dello schedule (create se non esiste, update se esiste) con un'unica chiamata, senza dover memorizzare lo schedule ID
- `review_id` = `reviewerId + "_" + publishedAtDate` (già deciso in Phase 13) — questo è il campo che garantisce idempotency
- Le recensioni salvate in `ocio_reviews` hanno tutti i campi `ai_*` a null — Phase 15 le analizza e popola quei campi
- `alert_sent = false` di default su ogni nuova recensione — Phase 16 gestisce l'invio degli alert e imposta `alert_sent = true`

</specifics>

<deferred>
## Deferred Ideas

- Tabella `scraping_log` per audit trail completo delle run — differito: Trigger.dev dashboard sufficiente per v3.0
- Filtro per data (`last_scrape_at` come parametro Apify) — differito: full scrape + upsert è più robusto e semplice
- Place_id extraction dall'URL — differito: non necessario se l'actor accetta URL direttamente
- Webhook Apify su completamento (pattern asincrono puro) — differito: waitForFinish più semplice per v3.0

</deferred>

---

*Phase: 14-scraping-pipeline*
*Context gathered: 2026-03-04*
