# Phase 15: AI Intelligence - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Ogni nuova recensione salvata da Phase 14 con `ai_analyzed_at = null` viene analizzata da Claude AI. Un task Trigger.dev separato (`ocio-ai-analyzer`) processa le reviews sequenzialmente e popola tutti i campi `ai_*` su `ocio_reviews`: sentiment, urgenza, temi, fake flag, risposta personalizzata.

Questa fase NON include: dashboard di visualizzazione (Phase 16), alert WhatsApp (Phase 16), nessuna UI.

</domain>

<decisions>
## Implementation Decisions

### Trigger e architettura task

- **Task separato**: `ocio-ai-analyzer` — task Trigger.dev distinto dallo scraper (non inline)
- **Come viene triggerato**: lo scraper (Phase 14) chiama `tasks.trigger('ocio-ai-analyzer', { merchantId })` dopo aver salvato le nuove reviews nel DB
- **Un trigger per merchant**: lo scraper lancia un task AI per merchant elaborato
- **Nessun cron separato**: l'analisi parte solo quando lo scraper ha nuovo materiale

### Strategia chiamate Claude

- **Una review alla volta** — chiamata Claude sequenziale per ogni review non analizzata
- **Una sola chiamata per review** — tutti i campi in un unico prompt/risposta JSON
- **Model**: `claude-sonnet-4-5` (già scelto in Phase 13)
- **API key**: `ANTHROPIC_API_KEY` di sistema (non per-merchant)
- **max_tokens**: 500
- **Response format**: JSON con esattamente questi campi:
  ```json
  {
    "sentiment": "positive" | "neutral" | "negative",
    "score": 1-10,
    "urgency": "low" | "medium" | "high" | "critical",
    "themes": ["keyword1", "keyword2"],
    "is_fake": true | false,
    "fake_reason": "stringa o null",
    "suggested_reply": "testo risposta"
  }
  ```

### Batch size

- **Tutte le non-analizzate del merchant per run** — `SELECT * FROM ocio_reviews WHERE merchant_id = $1 AND ai_analyzed_at IS NULL`
- Alla prima run possono essere fino a 50 reviews (storico); le analizza tutte sequenzialmente
- Nessun limite artificiale per run

### Contesto per la risposta personalizzata

- **Input a Claude**: testo della review + rating + `reply_tone` + `business_description` (da `ocio_config`)
- **Fallback se `business_description` è vuota**: usa `place_name` + `reply_tone`
- **Fallback se anche `place_name` è vuoto**: risposta generica senza firma specifica dell'attività
- `reply_tone` valori: `'professional'` (default) | `'warm'` | `'formal'`

### Lingua della risposta

- **Stessa lingua della recensione** — se la review è in inglese, `suggested_reply` è in inglese; se italiana, risposta in italiano
- Claude determina la lingua dalla recensione e risponde di conseguenza
- `ai_themes` sempre in italiano (keyword brevi, max 4-5 parole singole)

### Fake detector

- **Alta confidenza** — Claude segnala `is_fake: true` solo se ci sono segnali chiari (es. testo generico copiato, account senza storia, contenuto non pertinente all'attività, pattern tipici spam)
- **Pochi falsi positivi** — meglio non segnalare che segnalare erroneamente
- `fake_reason`: stringa esplicita con il reasoning; `null` se `is_fake: false`

### Error handling

- **JSON malformato da Claude**: skip della review (resta con `ai_analyzed_at = null`), log dell'errore via `logger.error`, continua con la review successiva
- La review non-analizzata verrà ripresa al prossimo trigger dello scraper
- **Throw dell'intero task**: solo su errori di sistema (DB irraggiungibile, ANTHROPIC_API_KEY mancante) — Trigger.dev gestisce il retry automatico (3x, backoff esponenziale)

### DB update per review analizzata con successo

- `UPDATE ocio_reviews SET ai_sentiment, ai_score, ai_themes, ai_urgency, ai_is_fake, ai_fake_reason, ai_suggested_reply, ai_analyzed_at = now() WHERE id = $1`
- Operazione atomica per singola review — se fallisce, la review resta processabile

### Claude's Discretion

- Struttura interna del prompt (come presentare rating, testo, tono)
- Naming del task Trigger.dev e delle funzioni helper
- Come gestire reviews con testo molto corto (solo emoji o 1-2 parole)
- Temperatura e altri parametri Claude non specificati

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `trigger/example.ts`: struttura `schedules.task` / `task` — pattern da seguire per `ocio-ai-analyzer`
- `trigger.config.ts`: progetto `proj_zvyvldbkgijrsvkohrfs` con `retries.default = 3` e backoff — il task AI eredita questo comportamento
- `app/api/whatsapp/ai-test/route.ts`: pattern `callAnthropic(apiKey, systemPrompt, userMessage)` con fetch diretto all'API Anthropic — riusabile come riferimento
- `createClient()` con service role key: usato nel task Trigger.dev per accesso DB
- `ocio_reviews` schema: tutti i campi `ai_*` già definiti in Phase 13, indici su `merchant_id` e `published_at`

### Established Patterns

- Trigger.dev task: `import { task, logger } from '@trigger.dev/sdk/v3'` + `export const taskName = task({ id, run: async (payload) => {} })`
- Chiamata Anthropic: POST a `https://api.anthropic.com/v1/messages` con header `x-api-key` e `anthropic-version: 2023-06-01`
- DB access nei task: `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` — stesso pattern delle API routes

### Integration Points

- `trigger/ocio-scraper.ts` (Phase 14): alla fine del run chiama `tasks.trigger('ocio-ai-analyzer', { merchantId })` — Phase 15 crea il task che riceve questo payload
- `ocio_config` table: `SELECT google_maps_url, place_name, business_description, reply_tone FROM ocio_config WHERE merchant_id = $1`
- `ocio_reviews` table: `SELECT id, text, rating FROM ocio_reviews WHERE merchant_id = $1 AND ai_analyzed_at IS NULL`
- Phase 16 consumerà: `ocio_reviews` con tutti i campi `ai_*` popolati per mostrarli in dashboard

</code_context>

<specifics>
## Specific Ideas

- Task ID Trigger.dev: `'ocio-ai-analyzer'` (da usare consistentemente nello scraper e nel nuovo task)
- Il prompt deve includere esplicitamente: rating numerico (1-5), testo recensione, tono risposta, nome attività/descrizione
- Il task deve loggare: `{ merchantId, processed: N, skipped: M, errors: K }` alla fine del run — visibile nella Trigger.dev dashboard
- `ai_score` (1-10): rappresenta intensità/impatto della recensione, non solo il sentiment — utile per prioritizzare

</specifics>

<deferred>
## Deferred Ideas

- Analisi trend aggregata (es. "tema 'attesa' in crescita nelle ultime 2 settimane") — Phase 16 o futura
- Re-analisi manuale di una singola review dalla dashboard — Phase 16
- Configurazione `business_description` e `reply_tone` via UI — deferred dalla Phase 13, da includere in Phase 16

</deferred>

---

*Phase: 15-ai-intelligence*
*Context gathered: 2026-03-04*
