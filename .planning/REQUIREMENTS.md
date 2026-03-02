# Requirements: FidelityApp

**Defined:** 2026-03-02
**Core Value:** Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.

---

## v1 Requirements (Completed — Milestone v1.0)

### UI — Design System Mobile-First

- [x] **UI-01**: Merchant vede una dashboard con layout coerente su mobile
- [x] **UI-02**: Merchant vede pulsanti, card e form con stile visivo consistente e professionale
- [x] **UI-03**: Merchant può navigare la dashboard da smartphone senza zoom o scroll orizzontale

### JOIN — Pagina Iscrizione Cliente

- [x] **JOIN-01**: Cliente vede /join/[programId] con colore principale del merchant
- [x] **JOIN-02**: Cliente vede descrizione chiara del programma
- [x] **JOIN-03**: Cliente vede soglia per il premio prima di iscriversi
- [x] **JOIN-04**: Cliente completa iscrizione e viene reindirizzato alla sua carta

### CARD — Pagina Carta Cliente

- [x] **CARD-01**: Cliente vede stato carta con gerarchia visiva corretta per ogni tipo
- [x] **CARD-02**: Cliente vede quanto manca al prossimo premio
- [x] **CARD-03**: Cliente vede pulsante "Aggiungi a Google Wallet" prominente

### STAMP — Scanner Cassiere

- [x] **STAMP-01**: Cassiere apre /stamp e fotocamera si attiva automaticamente
- [x] **STAMP-02**: Cassiere riceve feedback visivo immediato entro 1 secondo
- [x] **STAMP-03**: Cassiere inserisce importo speso inline per points/cashback
- [x] **STAMP-04**: Cassiere fa scansioni multiple consecutive senza ricaricare

### PROFILE — Profilazione Clienti

- [x] **PROF-01**: Merchant aggiunge tag liberi a un cliente
- [x] **PROF-02**: Merchant rimuove tag da un cliente
- [x] **PROF-03**: Merchant filtra lista clienti per tag

### NOTIFY — Notifiche Segmentate

- [x] **NOTIFY-01**: Merchant seleziona tag come destinatari notifica
- [x] **NOTIFY-02**: Merchant vede conteggio clienti destinatari prima di inviare
- [x] **NOTIFY-03**: Merchant invia notifica a tutti i clienti di un programma specifico

### EXPORT — Export Dati Clienti

- [x] **EXPORT-01**: Merchant scarica CSV clienti da /dashboard/customers

### LAND — Landing Page Self-Service

- [x] **LAND-01**: Visitatore vede landing con valore proposto sopra the fold
- [x] **LAND-02**: Visitatore vede flusso 3-step
- [x] **LAND-03**: Visitatore si registra dalla landing senza uscire
- [x] **LAND-04**: Merchant registrato viene reindirizzato all'onboarding

### BUG — Fix Critici v1.0

- [x] **BUG-01**: Idempotency key generata una volta al momento della scansione
- [x] **BUG-02**: Tabella notification_logs creata in Supabase
- [x] **BUG-03**: Tipo "Missioni" rimosso dal selettore creazione programma
- [x] **BUG-04**: Colonne Stripe aggiunte a merchants via SQL migration
- [x] **BUG-05**: API routes /api/wallet e /api/wallet-update verificano contesto valido

---

## v2 Requirements (Milestone v2.0)

### FIX — Bug Critici v2.0

- [ ] **FIX-01**: Form landing app/page.tsx salva i lead nel DB (tabella leads o contact_requests)
- [ ] **FIX-02**: Programmi con carte attive supportano soft delete (colonna deleted_at) — merchant può eliminare programma attivo
- [ ] **FIX-03**: Hard delete programma con modal di conferma (digita nome programma) — elimina in cascata rewards/tiers/cards/stamp_transactions
- [ ] **FIX-04**: Hero image /api/wallet-image applica background-color corretto da query param ?color= (decodifica URL-encoded, applica al div radice)

### DESIGN — Design System v2.0

- [ ] **DESIGN-01**: Zero emoji in tutta la dashboard e tutti i componenti — tutte sostituite con icone Lucide React
- [ ] **DESIGN-02**: Sidebar sinistra fissa 240px sfondo #111111 testo bianco, hover #1E1E1E, active #2A2A2A, icone Lucide + label
- [ ] **DESIGN-03**: Area contenuto sfondo #F5F5F5 in tutte le pagine dashboard
- [ ] **DESIGN-04**: Cards metriche — sfondo bianco, border 1px solid #E8E8E8, border-radius 12px, padding 24px, shadow 0 1px 3px rgba(0,0,0,0.08)
- [ ] **DESIGN-05**: Tabelle — header #F9F9F9, righe bianche, bordo #F0F0F0, zero zebra stripes
- [ ] **DESIGN-06**: Bottoni primari — sfondo #111111 testo bianco hover #333333 radius 8px; secondary — border #E0E0E0 hover #F5F5F5
- [ ] **DESIGN-07**: Typography — font Inter su body, titoli pagina text-2xl font-semibold, subtitles text-sm text-gray-500
- [ ] **DESIGN-08**: Form inputs — border #E0E0E0 radius 8px focus border #111111 outline none padding 12px
- [ ] **DESIGN-09**: Badge/status pills — verde #DCFCE7 testo #16A34A per attivo; grigio per inattivo; rosso #FEE2E2 testo #DC2626 per scaduto
- [ ] **DESIGN-10**: Empty states — icona Lucide 48px colore #D1D5DB centrata + testo descrittivo, zero emoji
- [ ] **DESIGN-11**: Design system applicato a tutte le pagine in app/dashboard/ e tutti i componenti dashboard

### SEG — Segmentazione Clienti Dormienti

- [ ] **SEG-01**: Merchant vede filtri Tutti / Attivi (ultimi 30gg) / Dormienti (30-90gg) / Persi (>90gg) in /dashboard/cards con conteggio per ogni segmento
- [ ] **SEG-02**: Merchant seleziona clienti in bulk (checkbox per riga + seleziona tutti)
- [ ] **SEG-03**: Merchant invia notifica push o messaggio WhatsApp ai clienti selezionati in bulk

### BDAY — Automazione Compleanno

- [ ] **BDAY-01**: Cliente vede campo data di nascita opzionale nel form iscrizione /join/[programId]
- [ ] **BDAY-02**: Colonna birth_date (type date, nullable) aggiunta a tabella card_holders
- [ ] **BDAY-03**: Cron job in vercel.json esegue /api/cron/birthday ogni giorno alle 09:00 UTC
- [ ] **BDAY-04**: Route /api/cron/birthday trova card_holders con birth_date = oggi e invia notifica push TEXT_AND_NOTIFY personalizzata "Tanti auguri [Nome]! Oggi hai un regalo speciale che ti aspetta."

### REVIEW — Raccolta Recensioni Google

- [ ] **REVIEW-01**: Campo google_reviews_url (opzionale) nella tabella programs e nel form crea/modifica programma in dashboard
- [ ] **REVIEW-02**: Dopo riscatto premio in /c/[token] appare banner "Ti è piaciuto? Lascia una recensione!" con link — visibile solo se google_reviews_url è compilato

### PLAN — Sistema Piani Free/Pro/Business

- [ ] **PLAN-01**: Colonna plan (text, default 'free') nella tabella merchants — valori: 'free', 'pro', 'business'
- [ ] **PLAN-02**: Hook usePlan() legge piano del merchant corrente da Supabase
- [ ] **PLAN-03**: Componente UpgradePrompt mostra "Funzionalità disponibile nel piano PRO — Aggiorna ora" con CTA per feature premium bloccate
- [ ] **PLAN-04**: Pagina /dashboard/upgrade con confronto piani (Free/Pro/Business) e prezzi (Free €0, Pro €39/mese, Business €99/mese)
- [ ] **PLAN-05**: Feature gating applicato: FREE max 1 programma (solo bollini) + max 50 carte + no push + branding Zale obbligatorio; PRO tutto illimitato + push + WhatsApp + segmentazione + birthday + reviews + export CSV; BUSINESS tutto PRO + webhook + API pubblica

### WA — WhatsApp Marketing Maytapi

- [ ] **WA-01**: Colonne maytapi_phone_id e maytapi_session_status aggiuante a tabella merchants
- [ ] **WA-02**: Pagina /dashboard/settings/whatsapp con istruzioni di connessione e QR code generato via Maytapi API
- [ ] **WA-03**: API routes POST /api/whatsapp/connect (crea sessione, ritorna QR), GET /api/whatsapp/status (verifica sessione), POST /api/whatsapp/send (manda a singolo o lista con rate limit 200/giorno)
- [ ] **WA-04**: Tab "WhatsApp" in /dashboard/notifications accanto a "Push Notification"
- [ ] **WA-05**: Rate limiting client-side e server-side: max 200 messaggi/giorno per numero WhatsApp

### WH — Webhook per Integrazioni

- [ ] **WH-01**: Tabella webhook_endpoints (id, merchant_id, url, events text[], secret, is_active boolean, created_at)
- [ ] **WH-02**: Pagina /dashboard/settings/webhooks con CRUD endpoint (aggiungi URL + seleziona eventi: nuovo_cliente, bollino_aggiunto, premio_riscattato, card_creata)
- [ ] **WH-03**: Helper lib/webhooks.ts con funzione triggerWebhook(merchantId, event, payload) — payload firmato HMAC-SHA256
- [ ] **WH-04**: triggerWebhook chiamato nei punti giusti: /api/wallet-update (bollino_aggiunto), /c/[token] (card_creata, premio_riscattato), /join/[programId] (nuovo_cliente)

### ANALYTICS — Analytics Avanzata

- [ ] **ANALYTICS-01**: Pagina /dashboard/analytics mostra totale clienti attivi con trend ultimi 30 giorni
- [ ] **ANALYTICS-02**: Grafico a barre bollini/punti assegnati per giorno (ultimi 30gg) con recharts
- [ ] **ANALYTICS-03**: Tasso di ritorno — % clienti che tornano entro 30gg dalla prima visita
- [ ] **ANALYTICS-04**: Totale premi riscattati (da stamp_transactions type='redeem')
- [ ] **ANALYTICS-05**: Grafico a torta segmenti clienti (attivi/dormienti/persi) con recharts

### CSV2 — Export CSV Avanzato

- [ ] **CSV2-01**: Pulsante "Esporta CSV" in /dashboard/cards con dati: nome, email, telefono, piano, bollini/punti attuali, ultima visita, data iscrizione
- [ ] **CSV2-02**: Export CSV disponibile solo per piano PRO e BUSINESS (UpgradePrompt per FREE)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Apple Wallet | Android dominante in Italia, alta complessità |
| Stripe attivazione completa | Dopo feedback da primo merchant reale |
| Test automatici | Da aggiungere progressivamente, non bloccante |
| Multi-sede per merchant | Complessità > valore attuale |
| White-label completo | Dopo stabilizzazione prodotto |
| Sistema referral | v3 o oltre |
| App mobile nativa | Anti-tesi al valore (no-app experience) |
| Tipo "Missioni" completo | Alta complessità, tabella card_missions + UI dedicata |
| API pubblica (BUSINESS) | Struttura da definire in milestone separata |

---

## Traceability

### v1.0 Requirements (all Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01..05 | Phase 1 — Stability | Complete |
| UI-01..03, STAMP-01..04 | Phase 2 — Merchant UX | Complete |
| JOIN-01..04, CARD-01..03 | Phase 3 — Customer Pages | Complete |
| PROF-01..03, NOTIFY-01..03, EXPORT-01 | Phase 4 — Retention Tools | Complete |
| LAND-01..04 | Phase 5 — Landing Page | Complete |

### v2.0 Requirements

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 6 — Critical Fixes v2 | Pending |
| FIX-02 | Phase 6 — Critical Fixes v2 | Pending |
| FIX-03 | Phase 6 — Critical Fixes v2 | Pending |
| FIX-04 | Phase 6 — Critical Fixes v2 | Pending |
| DESIGN-01 | Phase 7 — Design System v2 | Pending |
| DESIGN-02 | Phase 7 — Design System v2 | Pending |
| DESIGN-03 | Phase 7 — Design System v2 | Pending |
| DESIGN-04 | Phase 7 — Design System v2 | Pending |
| DESIGN-05 | Phase 7 — Design System v2 | Pending |
| DESIGN-06 | Phase 7 — Design System v2 | Pending |
| DESIGN-07 | Phase 7 — Design System v2 | Pending |
| DESIGN-08 | Phase 7 — Design System v2 | Pending |
| DESIGN-09 | Phase 7 — Design System v2 | Pending |
| DESIGN-10 | Phase 7 — Design System v2 | Pending |
| DESIGN-11 | Phase 7 — Design System v2 | Pending |
| SEG-01 | Phase 8 — Engagement Automation | Pending |
| SEG-02 | Phase 8 — Engagement Automation | Pending |
| SEG-03 | Phase 8 — Engagement Automation | Pending |
| BDAY-01 | Phase 8 — Engagement Automation | Pending |
| BDAY-02 | Phase 8 — Engagement Automation | Pending |
| BDAY-03 | Phase 8 — Engagement Automation | Pending |
| BDAY-04 | Phase 8 — Engagement Automation | Pending |
| REVIEW-01 | Phase 9 — Business Tools | Pending |
| REVIEW-02 | Phase 9 — Business Tools | Pending |
| PLAN-01 | Phase 9 — Business Tools | Pending |
| PLAN-02 | Phase 9 — Business Tools | Pending |
| PLAN-03 | Phase 9 — Business Tools | Pending |
| PLAN-04 | Phase 9 — Business Tools | Pending |
| PLAN-05 | Phase 9 — Business Tools | Pending |
| WA-01 | Phase 10 — WhatsApp Marketing | Pending |
| WA-02 | Phase 10 — WhatsApp Marketing | Pending |
| WA-03 | Phase 10 — WhatsApp Marketing | Pending |
| WA-04 | Phase 10 — WhatsApp Marketing | Pending |
| WA-05 | Phase 10 — WhatsApp Marketing | Pending |
| WH-01 | Phase 11 — Webhook Integrations | Pending |
| WH-02 | Phase 11 — Webhook Integrations | Pending |
| WH-03 | Phase 11 — Webhook Integrations | Pending |
| WH-04 | Phase 11 — Webhook Integrations | Pending |
| ANALYTICS-01 | Phase 12 — Advanced Analytics + CSV Export | Pending |
| ANALYTICS-02 | Phase 12 — Advanced Analytics + CSV Export | Pending |
| ANALYTICS-03 | Phase 12 — Advanced Analytics + CSV Export | Pending |
| ANALYTICS-04 | Phase 12 — Advanced Analytics + CSV Export | Pending |
| ANALYTICS-05 | Phase 12 — Advanced Analytics + CSV Export | Pending |
| CSV2-01 | Phase 12 — Advanced Analytics + CSV Export | Pending |
| CSV2-02 | Phase 12 — Advanced Analytics + CSV Export | Pending |

**Coverage:**
- v2 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 — Roadmap v2.0 created with phase names*
