---
phase: 14-scraping-pipeline
verified: 2026-03-04T00:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Trigger il salvataggio settings con module_reviews=true e verifica Network tab"
    expected: "POST /api/ocio/schedule con body { action: 'create' } appare nel Network tab dopo il PATCH /api/ocio/config"
    why_human: "Il fire-and-forget non e verificabile staticamente — richiede browser DevTools per osservare la chiamata HTTP reale"
  - test: "Verifica che Trigger.dev registri il task 'ocio-review-scraper' nel dashboard cloud"
    expected: "Il task appare nel progetto Trigger.dev proj_zvyvldbkgijrsvkohrfs come scheduled task"
    why_human: "La registrazione del task richiede un deploy reale verso Trigger.dev con TRIGGER_SECRET_KEY configurato"
---

# Phase 14: Scraping Pipeline — Verification Report

**Phase Goal:** Il sistema recupera automaticamente nuove recensioni Google Maps ogni 6 ore e le salva nel DB senza duplicati
**Verified:** 2026-03-04
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Un task Trigger.dev con id 'ocio-review-scraper' esiste e viene riconosciuto dal progetto | VERIFIED | `trigger/ocio-scraper.ts` esporta `ocioReviewScraper = schedules.task({ id: "ocio-review-scraper", ... })` — dir `trigger/` registrata in `trigger.config.ts` (`dirs: ["trigger"]`) |
| 2 | Il task, dato un merchantId, legge google_maps_url da ocio_config, chiama Apify actor, e fa upsert delle recensioni in ocio_reviews senza duplicati | VERIFIED | `scrapeForMerchant()` legge `ocio_config.google_maps_url`, chiama `compass/google-maps-reviews-scraper` via ApifyClient, upsert con `{ onConflict: "merchant_id,review_id", ignoreDuplicates: true }` — linea 103 |
| 3 | POST /api/ocio/schedule crea o cancella lo schedule Trigger.dev per il merchant autenticato | VERIFIED | `app/api/ocio/schedule/route.ts` esporta `POST`, gestisce `action: 'create'` (chiama `schedules.create`) e `action: 'cancel'` (chiama `schedules.del`) — auth BUSINESS verificata |
| 4 | Se google_maps_url non e configurato, il task termina silenziosamente senza errori | VERIFIED | Due livelli di guard: (a) la query di run filtra con `.not("google_maps_url", "is", null)` — merchant senza URL non vengono inclusi; (b) `scrapeForMerchant` riceve solo URL validi — nessun errore emesso |
| 5 | Dopo una run riuscita, ocio_config.last_scrape_at viene aggiornato al timestamp corrente | VERIFIED | Linea 108-110: `.update({ last_scrape_at: new Date().toISOString() }).eq("merchant_id", merchantId)` — chiamata dopo ogni merchant riuscito |
| 6 | Quando module_reviews=true e si salva la config, viene effettuata POST /api/ocio/schedule action='create' | VERIFIED | `settings/page.tsx` linea 188-197: `scheduleAction = config.module_reviews ? 'create' : 'cancel'` + fetch verso `/api/ocio/schedule` |
| 7 | Quando module_reviews=false e si salva, viene effettuata POST /api/ocio/schedule action='cancel' | VERIFIED | Stessa logica sopra — `config.module_reviews === false` produce `scheduleAction = 'cancel'` |
| 8 | L'UI non mostra errori visibili quando l'API schedule risponde con successo | VERIFIED | Il blocco schedule e dentro `try/catch` silenzioso dopo `setSaved(true)` — il feedback "Salvato!" appare indipendentemente dall'esito schedule |
| 9 | Se la chiamata schedule fallisce, l'errore non blocca il salvataggio config | VERIFIED | `catch { /* Silenzioso */ }` a linea 199 — nessun `setError()` nel catch, `setSaving(false)` avviene comunque |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `trigger/ocio-scraper.ts` | Task Trigger.dev schedules.task con id 'ocio-review-scraper', cron ogni 6h, logica Apify + upsert Supabase | VERIFIED | 179 righe, export `ocioReviewScraper`, cron `"0 */6 * * *"`, maxDuration 300, `scrapeForMerchant()` completa con Apify + upsert idempotente |
| `app/api/ocio/schedule/route.ts` | POST route autenticata (BUSINESS) per create/cancel schedule Trigger.dev | VERIFIED | 149 righe, export `POST`, auth Bearer → profiles → merchants.plan === 'business', gestisce create/cancel/unknown-action, persiste trigger_schedule_id |
| `app/dashboard/ocio/settings/page.tsx` | Pagina settings aggiornata con chiamata POST /api/ocio/schedule dopo salvataggio config | VERIFIED | `saveConfig()` chiama fetch verso `/api/ocio/schedule` a linea 190, action basata su `config.module_reviews` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `trigger/ocio-scraper.ts` | `ocio_config` (Supabase) | supabase service role client — legge google_maps_url + merchant_id | WIRED | Linea 132-136: `supabase.from("ocio_config").select("merchant_id, google_maps_url").eq("module_reviews", true).not("google_maps_url", "is", null)` |
| `trigger/ocio-scraper.ts` | `ocio_reviews` (Supabase) | upsert con onConflict merchant_id,review_id ignoreDuplicates:true | WIRED | Linea 101-104: `supabase.from("ocio_reviews").upsert(reviews, { onConflict: "merchant_id,review_id", ignoreDuplicates: true })` |
| `app/api/ocio/schedule/route.ts` | `trigger/ocio-scraper.ts` | schedules.create con task id 'ocio-review-scraper' e externalId merchantId | WIRED | Linea 89-94: `schedules.create({ task: "ocio-review-scraper", cron: "0 */6 * * *", externalId: merchantId, deduplicationKey: "ocio-${merchantId}" })` |
| `settings/page.tsx (saveConfig)` | `app/api/ocio/schedule/route.ts` | fetch POST /api/ocio/schedule con action create/cancel dopo PATCH /api/ocio/config | WIRED | Linea 190-197: `fetch('/api/ocio/schedule', { method: 'POST', headers: { Authorization: Bearer ${accessToken} }, body: JSON.stringify({ action: scheduleAction }) })` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| OCIO-02 | 14-01, 14-02 | Il sistema recupera automaticamente nuove recensioni ogni 6h tramite Apify actor (compass/google-maps-reviews-scraper) schedulato con Trigger.dev | SATISFIED | Task `ocio-review-scraper` con cron `0 */6 * * *` in `trigger/ocio-scraper.ts`; actor chiamato in `scrapeForMerchant()` con `waitSecs: 120`; schedule lifecycle gestito da `POST /api/ocio/schedule` |
| OCIO-08 | 14-01 | Il sistema non ri-processa recensioni gia analizzate (idempotency su review ID esterno) | SATISFIED | Upsert con `onConflict: "merchant_id,review_id", ignoreDuplicates: true` — review_id derivato da `reviewerId_publishedAtDate`; recensioni `anon_nodate` (entrambi i campi mancanti) vengono filtrate (linea 69) |

No orphaned requirements found — entrambi i requisiti dichiarati nei PLAN frontmatter sono coperti e verificati.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `trigger/ocio-scraper.ts` | 121 | Commento "placeholder cron" nel codice | INFO | Chiarisce il design intenzionale — il cron nel task e ridondante rispetto agli schedule dinamici, il commento e corretto e non indica codice incompleto |

Nessun anti-pattern bloccante rilevato:
- Nessun `return null` / `return {}` senza motivo
- Nessun `TODO` / `FIXME` non risolto
- Nessun handler vuoto
- La logica per-merchant e completamente implementata (non stub)

---

### Human Verification Required

#### 1. Schedule Fire-and-Forget in Browser

**Test:** Aprire `/dashboard/ocio/settings`, inserire un URL Google Maps, assicurarsi che "Monitoraggio Recensioni" sia attivo, e cliccare "Salva impostazioni". Aprire DevTools Network tab.
**Expected:** Dopo la risposta a `PATCH /api/ocio/config`, appare immediatamente una richiesta `POST /api/ocio/schedule` con body `{ "action": "create" }`.
**Why human:** Il comportamento fire-and-forget e verificabile solo in browser — l'analisi statica conferma che il codice e corretto ma non puo simulare la sequenza di richieste HTTP reale.

#### 2. Trigger.dev Task Registration

**Test:** Eseguire `npx trigger.dev@latest deploy` con TRIGGER_SECRET_KEY configurata, poi aprire il dashboard Trigger.dev per il progetto `proj_zvyvldbkgijrsvkohrfs`.
**Expected:** Il task `ocio-review-scraper` appare nella lista dei task schedulati.
**Why human:** La registrazione del task richiede un deploy verso il cloud Trigger.dev — non verificabile tramite analisi del codice locale.

---

### Gaps Summary

Nessun gap trovato. Tutti i must-have delle fasi 14-01 e 14-02 sono stati verificati nel codice reale:

- `trigger/ocio-scraper.ts`: implementazione completa (179 righe), non uno stub — include ApifyClient call, mapping difensivo dei campi, upsert idempotente, aggiornamento `last_scrape_at`, isolamento errori per-merchant, e log strutturati.
- `app/api/ocio/schedule/route.ts`: implementazione completa (149 righe) — auth BUSINESS, create con `deduplicationKey`, cancel con error-tolerance, persistenza `trigger_schedule_id`.
- `app/dashboard/ocio/settings/page.tsx`: `saveConfig` aggiornato correttamente — `setSaved(true)` prima del blocco schedule, silent catch, `accessToken` usato correttamente.
- I 3 commit documentati nel SUMMARY (20b8eaa, 0dd19c1, 13413ea) esistono tutti nel repository.
- `npx tsc --noEmit` passa senza errori.
- Entrambi i requisiti OCIO-02 e OCIO-08 sono soddisfatti.

---

_Verified: 2026-03-04_
_Verifier: Claude (gsd-verifier)_
