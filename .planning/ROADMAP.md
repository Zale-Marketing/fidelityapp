# Roadmap: FidelityApp

## Overview

Five phases that take FidelityApp from a working prototype with known bugs to a self-service product ready for the first real merchant. Phase 1 fixes what is broken. Phases 2-4 polish the three core experiences (merchant dashboard + scanner, customer join page, customer card page) and add retention tooling. Phase 5 builds the landing page that lets merchants discover and register without Alessandro's involvement.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

### Milestone v1.0 (Completed 2026-03-02)

- [x] **Phase 1: Stability** - Fix all critical bugs and missing DB schema before any UI work
- [x] **Phase 2: Merchant UX** - Polish dashboard + scanner so the daily merchant workflow is fast and reliable (completed 2026-03-02)
- [x] **Phase 3: Customer Pages** - Redesign /join and /c/[token] so customers convert and understand their card
- [x] **Phase 4: Retention Tools** - Tag customers, send segmented notifications, export CSV data (completed 2026-03-02)
- [x] **Phase 5: Landing Page** - Self-service acquisition page so merchants register without Alessandro

### Milestone v2.0 — Redesign Completo (in corso)

- [x] **Phase 6: Critical Fixes v2** - Fix lead capture, cascade delete, and hero image color before any redesign work (completed 2026-03-02)
- [x] **Phase 7: Design System v2** - Replace all emoji with Lucide icons and apply unified professional design tokens across every dashboard page (completed 2026-03-03)
- [ ] **Phase 8: Engagement Automation** - Segment dormant customers and automate birthday notifications
- [ ] **Phase 9: Business Tools** - Collect Google reviews post-redemption and gate features behind Free/Pro/Business plans
- [x] **Phase 10: WhatsApp Marketing** - Connect Maytapi, send WhatsApp messages to customers from the notifications tab (completed 2026-03-03)
- [x] **Phase 11: Webhook Integrations** - Let merchants connect external tools via signed webhooks (completed 2026-03-03)
- [x] **Phase 12: Advanced Analytics + CSV Export** - Recharts dashboards with return rates, segment pie charts, and PRO-gated CSV export (completed 2026-03-03)

### Milestone v3.0 — OCIO: Reputation Intelligence

- [ ] **Phase 13: OCIO Foundation** - DB schema per le recensioni, pagina impostazioni OCIO con 6 moduli e feature gating BUSINESS
- [ ] **Phase 14: Scraping Pipeline** - Job Trigger.dev ogni 6h che recupera nuove recensioni via Apify con idempotency
- [ ] **Phase 15: AI Intelligence** - Claude AI analizza ogni nuova recensione (sentiment, urgenza, temi, fake detector, risposta personalizzata)
- [ ] **Phase 16: Dashboard + Alert** - Dashboard /dashboard/ocio con lista recensioni + statistiche + alert WhatsApp per recensioni negative

## Phase Details

### Phase 1: Stability
**Goal**: The product runs without known crashes or data integrity failures
**Depends on**: Nothing (first phase)
**Requirements**: BUG-01, BUG-02, BUG-03, BUG-04, BUG-05
**Success Criteria** (what must be TRUE):
  1. Cassiere scansiona lo stesso QR due volte e il bollino viene aggiunto una sola volta (idempotency funziona)
  2. Lo storico notifiche carica senza errore 500 (tabella notification_logs esiste)
  3. Merchant apre la pagina "Nuovo Programma" e non vede il tipo "Missioni" selezionabile
  4. Merchant con account nuovo ha le colonne Stripe nella tabella merchants senza errori SQL
  5. Chiamata a /api/wallet o /api/wallet-update senza contesto valido riceve risposta 401
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Fix idempotency key in stamp scanner + remove Missioni type from program creation
- [x] 01-02-PLAN.md — SQL migrations: notification_logs table + Stripe columns on merchants (requires human to run in Supabase)
- [ ] 01-03-PLAN.md — Auth check on /api/wallet and /api/wallet-update routes

### Phase 2: Merchant UX
**Goal**: Merchant può gestire il proprio programma fedeltà da smartphone in modo fluido e professionale
**Depends on**: Phase 1
**Requirements**: UI-01, UI-02, UI-03, STAMP-01, STAMP-02, STAMP-03, STAMP-04
**Success Criteria** (what must be TRUE):
  1. Merchant apre la dashboard da un iPhone e tutte le pagine sono leggibili senza zoom o scroll orizzontale
  2. Tutti i bottoni, card e form della dashboard hanno lo stesso stile visivo (colori, border-radius, spacing coerenti)
  3. Cassiere apre /stamp e la fotocamera parte senza click aggiuntivi
  4. Cassiere riceve feedback visivo verde o rosso entro 1 secondo dalla scansione del QR
  5. Per un programma a punti, cassiere inserisce l'importo speso direttamente nella schermata di scansione senza navigare altrove
  6. Cassiere può fare 3 scansioni consecutive: dopo ogni conferma la pagina si resetta automaticamente per la prossima
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Mobile-first dashboard design system (responsive layout, consistent rounded-2xl/rounded-xl tokens across all dashboard pages)
- [x] 02-02-PLAN.md — Scanner UX optimization (auto-start camera, full-screen feedback, auto-reset after 3s)

### Phase 3: Customer Pages
**Goal**: Clienti si iscrivono al programma e capiscono lo stato della loro carta senza spiegazioni
**Depends on**: Phase 2
**Requirements**: JOIN-01, JOIN-02, JOIN-03, JOIN-04, CARD-01, CARD-02, CARD-03
**Success Criteria** (what must be TRUE):
  1. Cliente apre /join/[programId] e vede la pagina colorata con il colore principale del merchant
  2. Cliente legge sulla pagina /join esattamente quante visite/punti servono per il premio prima di iscriversi
  3. Cliente completa l'iscrizione dalla pagina /join e viene reindirizzato alla sua carta senza errori
  4. Cliente vede la sua carta con gerarchia visiva diversa per ogni tipo programma (bollini, punti, cashback, livello VIP, abbonamento)
  5. Cliente legge "ancora X bollini al prossimo premio" (o equivalente per il suo tipo di programma)
  6. Cliente che non ha ancora salvato la carta vede un pulsante "Aggiungi a Google Wallet" prominente sopra il fold
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Redesign /join/[programId] — BenefitPreview section, rewards query, auto-redirect
- [x] 03-02-PLAN.md — Redesign /c/[token] — Wallet CTA to top, progress message row, fix stamps grid + subscription badge

### Phase 4: Retention Tools
**Goal**: Merchant può segmentare i clienti e comunicare con loro in modo mirato
**Depends on**: Phase 3
**Requirements**: PROF-01, PROF-02, PROF-03, NOTIFY-01, NOTIFY-02, NOTIFY-03, EXPORT-01
**Success Criteria** (what must be TRUE):
  1. Merchant apre la scheda di un cliente e aggiunge o rimuove tag liberi (es. "VIP", "Abituale")
  2. Merchant filtra la lista clienti in /dashboard/customers per tag e vede solo i clienti corrispondenti
  3. Merchant seleziona un tag come destinatari di una notifica e vede il numero di clienti che la riceveranno prima di inviare
  4. Merchant invia una notifica a tutti i clienti di un programma specifico usando il filtro per programma
  5. Merchant scarica un CSV da /dashboard/customers con nome, email, telefono, programma e saldo corrente di ogni cliente
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — SQL migration doc (MANUAL-ACTIONS.md) + customer_tags, card_holder_tags, card_holders extended columns + human checkpoint to run in Supabase
- [ ] 04-02-PLAN.md — Notifiche segmentate: tag dropdown, recipient count preview, tag+program intersection send
- [ ] 04-03-PLAN.md — Export CSV clienti da /dashboard/customers (browser-side, rispetta filtri attivi)

### Phase 5: Landing Page
**Goal**: Un visitatore esterno capisce il valore di FidelityApp e si registra senza contattare Alessandro
**Depends on**: Phase 4
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04
**Success Criteria** (what must be TRUE):
  1. Visitatore arriva alla landing page e legge il valore proposto (cosa fa FidelityApp, per chi) senza scrollare
  2. Visitatore vede illustrato il flusso in 3 step: merchant crea il programma, cliente scansiona il QR, Google Wallet si aggiorna
  3. Visitatore clicca sulla CTA e completa la registrazione senza uscire dal sito
  4. Merchant appena registrato viene reindirizzato all'onboarding wizard esistente
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — Landing page self-service (above-fold value prop + phone mockup CSS, social proof bar, 3-step flow, CTA → /register → /onboarding)

---

## Milestone v2.0 Phase Details

### Phase 6: Critical Fixes v2
**Goal**: Le tre rotture silenziose che danneggiano la percezione del prodotto sono risolte prima che il design system venga applicato
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04
**Success Criteria** (what must be TRUE):
  1. Visitatore compila il form della landing page e il lead appare nella tabella leads (o contact_requests) di Supabase
  2. Merchant elimina un programma con carte attive e vede l'opzione soft delete — il programma sparisce dalla UI ma i dati rimangono nel DB
  3. Merchant vuole eliminare definitivamente un programma, digita il nome nel modal di conferma, e cards/rewards/tiers/stamp_transactions vengono eliminati in cascata
  4. Google Wallet mostra lo sfondo della hero image nel colore principale del programma (non bianco/nero di default)
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Hero image color fix (?color= param in wallet-image route + getHeroImageUrl) + Lead capture form on landing page
- [ ] 06-02-PLAN.md — Soft delete (archive) + hard delete with name confirmation for programs

### Phase 7: Design System v2
**Goal**: Ogni pagina della dashboard ha lo stesso aspetto professionale — sidebar nera, sfondo grigio, zero emoji, token visivi coerenti
**Depends on**: Phase 6
**Requirements**: DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04, DESIGN-05, DESIGN-06, DESIGN-07, DESIGN-08, DESIGN-09, DESIGN-10, DESIGN-11
**Success Criteria** (what must be TRUE):
  1. Merchant naviga tutte le pagine dashboard senza vedere una singola emoji — ogni icona è un componente Lucide React
  2. Sidebar sinistra da 240px con sfondo #111111 è visibile e fissa su tutte le pagine dashboard
  3. L'area contenuto ha sfondo #F5F5F5, le card metriche sono bianche con bordo #E8E8E8 e shadow sottile, le tabelle hanno header #F9F9F9 senza zebra stripes
  4. Bottoni primari sono #111111 con testo bianco, secondari con bordo #E0E0E0 — coerenti in ogni pagina
  5. Ogni pagina con lista vuota mostra un'icona Lucide da 48px grigia con testo descrittivo (nessun emoji, nessuna pagina bianca)
**Plans**: 4 plans

Plans:
- [x] 07-01-PLAN.md — Foundation: install lucide-react, dashboard layout con sidebar #111111, font Inter, componenti MetricCard/StatusBadge/EmptyState
- [x] 07-02-PLAN.md — Dashboard home + programs list + notifications + settings (4 pagine semplici)
- [x] 07-03-PLAN.md — Analytics + billing + customers list (3 pagine medie)
- [x] 07-04-PLAN.md — Programs new + programs detail + programs edit + customer detail (4 pagine complesse)

### Phase 8: Engagement Automation
**Goal**: Merchant può identificare clienti a rischio abbandono e il sistema invia auguri di compleanno in automatico
**Depends on**: Phase 7
**Requirements**: SEG-01, SEG-02, SEG-03, BDAY-01, BDAY-02, BDAY-03, BDAY-04
**Success Criteria** (what must be TRUE):
  1. Merchant apre /dashboard/cards e vede quattro filtri (Tutti / Attivi / Dormienti / Persi) con il conteggio di clienti per ogni segmento
  2. Merchant seleziona tutti i clienti "Dormienti" con un checkbox e invia una notifica push o WhatsApp al gruppo in bulk
  3. Cliente si iscrive via /join/[programId] e vede il campo data di nascita opzionale nel form
  4. Il cron job gira ogni giorno alle 09:00 UTC e invia "Tanti auguri [Nome]! Oggi hai un regalo speciale che ti aspetta." a ogni cliente che compie gli anni
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md — /dashboard/cards segmentation page with Tutti/Attivi/Dormienti/Persi tabs, bulk checkbox, bulk send via /api/send-notification + Sidebar "Carte" link
- [ ] 08-02-PLAN.md — Birthday automation: MANUAL-ACTIONS.md SQL doc, birth_date field in /join form, /api/cron/birthday route, vercel.json cron schedule

### Phase 9: Business Tools
**Goal**: Il merchant raccoglie recensioni Google dopo ogni riscatto e il sistema applica limiti di piano in modo trasparente
**Depends on**: Phase 8
**Requirements**: REVIEW-01, REVIEW-02, PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05
**Success Criteria** (what must be TRUE):
  1. Merchant inserisce il link Google Reviews nel form di creazione/modifica programma e il campo viene salvato
  2. Cliente che riscatta un premio vede il banner "Ti è piaciuto? Lascia una recensione!" con link diretto — solo se il merchant ha configurato il link
  3. Merchant FREE che tenta di creare un secondo programma vede l'UpgradePrompt invece del form
  4. Merchant FREE che tenta di usare push notifications, WhatsApp o segmentazione vede l'UpgradePrompt con CTA alla pagina upgrade
  5. Merchant apre /dashboard/upgrade e vede il confronto Free/Pro/Business con prezzi (€0 / €39 / €99 al mese)
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md — SQL migrations (MANUAL-ACTIONS.md) + usePlan() hook + UpgradePrompt component (foundation)
- [ ] 09-02-PLAN.md — Google Reviews: google_reviews_url field in programs new/edit forms + review banner in /c/[token]
- [ ] 09-03-PLAN.md — /dashboard/upgrade pricing page (Free/Pro/Business) + PLAN-05 feature gating on programs/new and notifications

### Phase 10: WhatsApp Marketing
**Goal**: Merchant connette il proprio numero WhatsApp tramite Maytapi e invia messaggi di marketing ai clienti dalla dashboard
**Depends on**: Phase 9
**Requirements**: WA-01, WA-02, WA-03, WA-04, WA-05
**Success Criteria** (what must be TRUE):
  1. Merchant apre /dashboard/settings/whatsapp, scansiona il QR code Maytapi con il telefono e la sessione viene confermata come attiva
  2. Merchant vede il tab "WhatsApp" accanto a "Push Notification" in /dashboard/notifications
  3. Merchant seleziona destinatari e invia un messaggio WhatsApp — il messaggio arriva sul telefono del cliente entro 60 secondi
  4. Merchant che supera i 200 messaggi giornalieri vede un errore esplicito e non può inviare altri messaggi fino al giorno successivo
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md — SQL migration doc (MANUAL-ACTIONS.md) + /api/whatsapp/connect + /api/whatsapp/status + /dashboard/settings/whatsapp page
- [x] 10-02-PLAN.md — /api/whatsapp/send with rate limiting + WhatsApp tab in /dashboard/notifications

### Phase 11: Webhook Integrations
**Goal**: Merchant tecnico può ricevere eventi di FidelityApp in qualsiasi sistema esterno tramite webhook firmati
**Depends on**: Phase 10
**Requirements**: WH-01, WH-02, WH-03, WH-04
**Success Criteria** (what must be TRUE):
  1. Merchant apre /dashboard/settings/webhooks, aggiunge un URL con gli eventi desiderati, e l'endpoint appare nella lista
  2. Merchant elimina o disabilita un webhook endpoint dalla stessa pagina senza contattare il supporto
  3. Ogni volta che un cliente guadagna un bollino, il sistema invia un POST firmato HMAC-SHA256 all'URL configurato entro 5 secondi
  4. Tool esterno (es. Zapier, Make) riceve il payload e può verificare la firma con il secret del merchant
**Plans**: 2 plans

Plans:
- [ ] 11-01-PLAN.md — SQL migration doc (MANUAL-ACTIONS.md) + lib/webhooks.ts HMAC helper + CRUD API routes + public dispatch route
- [ ] 11-02-PLAN.md — /dashboard/settings/webhooks UI (BUSINESS plan gated) + wire triggerWebhook into 4 event origins

### Phase 12: Advanced Analytics + CSV Export
**Goal**: Merchant vede trend reali di engagement con grafici recharts e può esportare i dati clienti in CSV (solo PRO/BUSINESS)
**Depends on**: Phase 11
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04, ANALYTICS-05, CSV2-01, CSV2-02
**Success Criteria** (what must be TRUE):
  1. Merchant apre /dashboard/analytics e vede il totale clienti attivi con il trend rispetto agli ultimi 30 giorni
  2. Merchant vede un grafico a barre recharts con bollini/punti assegnati per giorno negli ultimi 30 giorni
  3. Merchant legge il tasso di ritorno: la percentuale di clienti tornati entro 30 giorni dalla prima visita
  4. Merchant vede un grafico a torta recharts che mostra la distribuzione Attivi / Dormienti / Persi
  5. Merchant PRO clicca "Esporta CSV" in /dashboard/cards e scarica il file con nome, email, telefono, piano, saldo e ultima visita — merchant FREE vede l'UpgradePrompt
**Plans**: 2 plans

Plans:
- [x] 12-01-PLAN.md — Install recharts + upgrade analytics/page.tsx (3 new KPIs + BarChart + PieChart)
- [x] 12-02-PLAN.md — CSV export in cards/page.tsx (Blob download + usePlan gating + UpgradePrompt for FREE)

---

## Milestone v3.0 Phase Details

### Phase 13: OCIO Foundation
**Goal**: Il modulo OCIO esiste nel DB e nella UI con la pagina impostazioni funzionante e il feature gating BUSINESS attivo
**Depends on**: Phase 12 (v2.0 complete)
**Requirements**: SET-01, SET-02, SET-03, OCIO-01
**Success Criteria** (what must be TRUE):
  1. Merchant BUSINESS apre /dashboard/settings/ocio e vede la pagina con 6 moduli: "Monitoraggio Recensioni" e "Alert WhatsApp" attivi, moduli 3-6 disabilitati con badge "Prossimamente"
  2. Merchant BUSINESS inserisce l'URL Google Maps della propria attività nel campo dedicato e lo salva — il valore persiste dopo ricarica della pagina
  3. Merchant FREE o PRO che tenta di accedere a /dashboard/settings/ocio o /dashboard/ocio vede l'UpgradePrompt BUSINESS invece del contenuto
  4. Tabella ocio_reviews e colonne google_maps_url + ocio_alert_enabled su merchants esistono nel DB Supabase
**Plans**: TBD

### Phase 14: Scraping Pipeline
**Goal**: Il sistema recupera automaticamente nuove recensioni Google Maps ogni 6 ore e le salva nel DB senza duplicati
**Depends on**: Phase 13
**Requirements**: OCIO-02, OCIO-08
**Success Criteria** (what must be TRUE):
  1. Il job Trigger.dev si attiva ogni 6h, chiama l'Apify actor compass/google-maps-reviews-scraper con l'URL del merchant e salva le nuove recensioni nella tabella ocio_reviews
  2. Se lo stesso job viene eseguito due volte di fila, le recensioni già presenti nel DB non vengono duplicate (idempotency su review ID esterno Apify)
  3. Merchant con google_maps_url configurato vede le recensioni comparire in dashboard entro 6h dalla configurazione
**Plans**: TBD

### Phase 15: AI Intelligence
**Goal**: Ogni nuova recensione viene analizzata automaticamente da Claude AI con sentiment, urgenza, temi, rilevamento fake e risposta personalizzata
**Depends on**: Phase 14
**Requirements**: OCIO-03, OCIO-04, OCIO-05, OCIO-06, OCIO-07
**Success Criteria** (what must be TRUE):
  1. Ogni nuova recensione salvata nel DB mostra automaticamente sentiment classificato (positivo/negativo/neutro) visibile in dashboard
  2. Ogni recensione mostra il livello di urgenza (alta/media/bassa) calcolato da Claude AI
  3. Ogni recensione mostra i temi principali identificati da Claude AI (es. "servizio", "qualita", "prezzo")
  4. Recensioni segnalate come potenzialmente false mostrano il flag "Possibile fake" con il reasoning di Claude AI
  5. Ogni recensione ha una risposta personalizzata generata da Claude AI pronta per essere copiata
**Plans**: TBD

### Phase 16: Dashboard + Alert
**Goal**: Merchant visualizza tutte le recensioni analizzate in un'unica dashboard con filtri e riceve alert WhatsApp per le recensioni negative
**Depends on**: Phase 15
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, ALERT-01, ALERT-02, ALERT-03
**Success Criteria** (what must be TRUE):
  1. Merchant apre /dashboard/ocio e vede tutte le recensioni in lista con filtri per sentiment, rating (1-5 stelle) e data
  2. Merchant clicca su una recensione e vede autore, rating, testo completo, data, sentiment, urgenza, temi e flag fake (se presente)
  3. Merchant clicca "Copia risposta" su una recensione e il testo della risposta AI va negli appunti in un solo click
  4. Dashboard mostra in evidenza: rating medio, percentuale recensioni positive e negative, trend rispetto alle ultime 30gg
  5. Merchant con WhatsApp connesso e alert abilitati riceve un messaggio WhatsApp per ogni nuova recensione negativa o ad alta urgenza, con rating, nome autore, estratto testo e link alla dashboard
  6. Merchant può abilitare o disabilitare gli alert WhatsApp direttamente dalla pagina impostazioni OCIO
**Plans**: TBD

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16

### Milestone v1.0 (Complete)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Stability | 3/3 | Complete | 2026-03-02 |
| 2. Merchant UX | 2/2 | Complete | 2026-03-02 |
| 3. Customer Pages | 2/2 | Complete | 2026-03-02 |
| 4. Retention Tools | 3/3 | Complete | 2026-03-02 |
| 5. Landing Page | 1/1 | Complete | 2026-03-02 |

### Milestone v2.0 — Redesign Completo

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. Critical Fixes v2 | 2/2 | Complete | 2026-03-02 |
| 7. Design System v2 | 0/4 | Planned | - |
| 8. Engagement Automation | 0/2 | Planned | - |
| 9. Business Tools | 0/3 | Planned | - |
| 10. WhatsApp Marketing | 2/2 | Complete | 2026-03-03 |
| 11. Webhook Integrations | 0/2 | Complete | 2026-03-03 |
| 12. Advanced Analytics + CSV Export | 2/2 | Complete | 2026-03-03 |

### Milestone v3.0 — OCIO: Reputation Intelligence

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 13. OCIO Foundation | 0/TBD | Not started | - |
| 14. Scraping Pipeline | 0/TBD | Not started | - |
| 15. AI Intelligence | 0/TBD | Not started | - |
| 16. Dashboard + Alert | 0/TBD | Not started | - |
