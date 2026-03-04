# Phase 13: OCIO Foundation - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Installare l'infrastruttura base del modulo OCIO: schema DB completo (5 tabelle), pagina impostazioni OCIO con 6 moduli toggle, feature gating BUSINESS-only, e voce navigazione sidebar + link in Settings.

Questa fase NON include: scraping Apify (Phase 14), analisi AI (Phase 15), dashboard recensioni (Phase 16). Tutto ciò che viene creato qui serve da scaffolding che le fasi successive popoleranno.

</domain>

<decisions>
## Implementation Decisions

### Navigazione OCIO

- **Entrambi**: sidebar entry per la dashboard OCIO + link nella pagina /dashboard/settings
- Icona sidebar: `Eye` (Lucide)
- Label sidebar: "OCIO"
- Link sidebar → `/dashboard/ocio` (dashboard overview, Phase 16)
- Link in settings → `/dashboard/ocio/settings` (configurazione OCIO)
- Visibilità: sidebar entry visibile solo se `merchants.plan = 'business'` (stesso pattern `showWaExtras` già in Sidebar.tsx — aggiungere `isBusiness` check)

### Layout moduli nella settings page

- **Grid 2 colonne** di card
- Ogni card: icona Lucide + titolo + descrizione breve + toggle (o badge "Prossimamente")
- Moduli attivi (1–2): toggle funzionante, aggiorna `ocio_config` su Supabase
- Moduli 3–6: **overlay grigio semi-trasparente + icona `Lock` in alto a destra** sul card, toggle disabilitato, nessun tooltip

### Moduli della settings page

| # | Titolo | Toggle | Stato |
|---|--------|--------|-------|
| 1 | Monitoraggio Recensioni | `module_reviews` | Attivo |
| 2 | Alert WhatsApp | `module_alerts` | Attivo |
| 3 | Social Listening | `module_social` | Prossimamente |
| 4 | Competitor Radar | `module_competitor` | Prossimamente |
| 5 | Price Intelligence | `module_price` | Prossimamente |
| 6 | Report Mensile AI | `module_reports` | Prossimamente |

### Feature gating

- Check su `merchants.plan = 'business'` (lowercase)
- Se non business → `UpgradePrompt` (componente esistente) con messaggio OCIO-specifico
- In OGNI API route OCIO: verificare `plan = 'business'`, restituire 403 se no
- Stripe non è ancora collegato — nessun check Stripe, solo colonna `plan`

### DB schema — tabella ocio_config

Tabella separata (non colonne su merchants) con UNIQUE su merchant_id:

```sql
CREATE TABLE ocio_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE UNIQUE,
  google_maps_url TEXT,
  google_place_id TEXT,
  place_name TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expires_at TIMESTAMPTZ,
  google_account_connected BOOLEAN DEFAULT false,
  business_description TEXT,
  reply_tone TEXT DEFAULT 'professional', -- 'professional'|'warm'|'formal'
  module_reviews BOOLEAN DEFAULT true,
  module_alerts BOOLEAN DEFAULT true,
  module_social BOOLEAN DEFAULT false,
  module_competitor BOOLEAN DEFAULT false,
  module_price BOOLEAN DEFAULT false,
  module_reports BOOLEAN DEFAULT false,
  alert_whatsapp_number TEXT,
  alert_min_rating INT DEFAULT 3,
  last_scrape_at TIMESTAMPTZ,
  trigger_schedule_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### DB schema — tabella ocio_reviews

AI response salvata nel DB al momento dello scraping/analisi, già pronta nella dashboard:

```sql
CREATE TABLE ocio_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  review_id TEXT NOT NULL,             -- reviewerId + "_" + publishedAtDate
  author_name TEXT,
  author_url TEXT,
  rating INT,                          -- 1-5
  text TEXT,
  published_at TIMESTAMPTZ,
  owner_reply TEXT,
  owner_reply_at TIMESTAMPTZ,
  review_url TEXT,
  place_id TEXT,
  ai_sentiment TEXT,                   -- 'positive'|'neutral'|'negative'
  ai_score INT,                        -- 1-10
  ai_themes TEXT[],                    -- ['servizio','qualità','prezzo']
  ai_urgency TEXT,                     -- 'low'|'medium'|'high'|'critical'
  ai_category TEXT,
  ai_summary TEXT,
  ai_is_fake BOOLEAN DEFAULT false,
  ai_fake_reason TEXT,
  ai_suggested_reply TEXT,             -- salvata nel DB, pronta in dashboard
  ai_analyzed_at TIMESTAMPTZ,
  reply_status TEXT DEFAULT 'pending', -- 'pending'|'replied'|'ignored'
  replied_at TIMESTAMPTZ,
  alert_sent BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(merchant_id, review_id)
);

CREATE INDEX idx_ocio_reviews_merchant ON ocio_reviews(merchant_id);
CREATE INDEX idx_ocio_reviews_rating ON ocio_reviews(rating);
CREATE INDEX idx_ocio_reviews_published ON ocio_reviews(published_at DESC);
CREATE INDEX idx_ocio_reviews_pending ON ocio_reviews(merchant_id) WHERE reply_status = 'pending';
```

### DB schema — tabelle ausiliarie (stub per fasi future)

```sql
-- Per Phase 15+ (competitor, social, reports, alert log)
CREATE TABLE ocio_competitor_data (...);
CREATE TABLE ocio_social_data (...);
CREATE TABLE ocio_monthly_reports (...);
CREATE TABLE ocio_alerts_log (...);
```
Schema completo in MANUAL-ACTIONS.md — da creare in Phase 13.

### Settings page URL input (Google Maps URL)

- Campo testo libero con placeholder `https://maps.app.goo.gl/...` o URL completo Google Maps
- Validazione: non vuoto + starts with `https://`
- Nessun parser automatico per place_id in questa fase (Phase 14 lo estrae via Apify)
- Testo aiuto sotto il campo: "Incolla il link Google Maps della tua attività"

### Stack nuovo per OCIO

- **Apify** (`apify-client` npm): actor `compass/google-maps-reviews-scraper`
- **Trigger.dev v3** (`@trigger.dev/sdk`): project `proj_zvyvldbkgijrsvkohrfs`
- **Claude** `claude-sonnet-4-5`: analisi recensioni (ANTHROPIC_API_KEY già presente)
- Phase 13 installa i pacchetti e inizializza Trigger.dev ma NON crea i tasks (Phase 14)

### Claude's Discretion

- Esatto copy delle descrizioni per i 6 moduli nella settings page (purché in italiano)
- Icone Lucide per ogni modulo card (es. Star, Bell, Instagram, BarChart, Tag, FileText)
- Spaziatura, padding, animazione hover per le card moduli
- Come mostrare `last_scrape_at` nella settings page (opzionale — se presente)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `usePlan()` hook (`lib/hooks/usePlan.ts`): `{ isFree, isPro, isBusiness, loading }` — usare `isBusiness` per feature gating
- `UpgradePrompt` component (`components/ui/UpgradePrompt.tsx`): già usato su whatsapp-ai e webhooks per gating
- `Sidebar.tsx`: pattern dinamico con `showWaExtras = isPro && waConnected` — aggiungere `isBusiness` per voce OCIO
- `createClient()` pattern: client-side usa `@/lib/supabase`, API routes usano service role key

### Established Patterns

- Settings page pattern: `'use client'` + `useEffect loadData()` + Supabase auth check + `router.push('/login')` se non autenticato (vedere `whatsapp-ai/page.tsx`)
- Dashboard layout: `app/dashboard/layout.tsx` con sidebar fissa — nuove pagine sotto `/dashboard/` si integrano automaticamente
- Card design: bg-white, border `#E8E8E8`, rounded-xl, shadow sottile (design system v2)
- Toggle switch: pattern da `whatsapp-ai/page.tsx` con stato locale + save via Supabase

### Integration Points

- Sidebar.tsx: aggiungere `isBusiness` check + voce "OCIO" con `Eye` icon → `/dashboard/ocio`
- `/dashboard/settings/page.tsx`: aggiungere card/link "OCIO" che porta a `/dashboard/ocio/settings`
- `lib/types.ts`: aggiungere tipi per `OcioConfig` e `OcioReview`

</code_context>

<specifics>
## Specific Ideas

- OCIO è un sistema autonomo: dal momento in cui il merchant si abbona BUSINESS, funziona in automatico. Zero configurazione manuale lato piattaforma.
- Google Reply API ha quota 0: NON implementare reply automatico. Il flusso è: Claude genera risposta → merchant copia dalla dashboard → incolla su Google Maps. Link diretto alla recensione su Maps.
- `ai_suggested_reply` è salvata nel DB al momento dell'analisi AI (Phase 15), non generata on-demand al click. La dashboard (Phase 16) la mostra già pronta.
- Deduplication recensioni: `review_id = reviewerId + "_" + publishedAtDate`, upsert con `ignoreDuplicates: true`.
- Multi-tenant by design: ogni merchant ha il suo `ocio_config`, il suo schedule Trigger.dev (externalId = merchantId), RLS Supabase.
- In questa fase (13) si installano i pacchetti e si inizializza Trigger.dev, ma i task veri vengono scritti in Phase 14.

</specifics>

<deferred>
## Deferred Ideas

- Google OAuth 2.0 (connessione account Google Business) — tabella ocio_config ha già le colonne, ma il flow OAuth viene implementato quando Google apre la quota API per i reply. Differito post-v3.0.
- SetupWizard onboarding in dashboard OCIO — da implementare in Phase 16 con la dashboard overview
- `business_description` e `reply_tone` nel form settings — presenti in schema, ma UI può essere aggiunta in Phase 15/16 quando serve all'analisi AI
- Report mensili (modulo 6) — stub nel DB, implementazione futura post-v3.0

</deferred>

---

*Phase: 13-ocio-foundation*
*Context gathered: 2026-03-04*
