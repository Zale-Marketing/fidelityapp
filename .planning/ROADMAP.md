# Roadmap: FidelityApp

## Overview

Five phases that take FidelityApp from a working prototype with known bugs to a self-service product ready for the first real merchant. Phase 1 fixes what is broken. Phases 2-4 polish the three core experiences (merchant dashboard + scanner, customer join page, customer card page) and add retention tooling. Phase 5 builds the landing page that lets merchants discover and register without Alessandro's involvement.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Stability** - Fix all critical bugs and missing DB schema before any UI work
- [ ] **Phase 2: Merchant UX** - Polish dashboard + scanner so the daily merchant workflow is fast and reliable
- [ ] **Phase 3: Customer Pages** - Redesign /join and /c/[token] so customers convert and understand their card
- [ ] **Phase 4: Retention Tools** - Tag customers, send segmented notifications, export CSV data
- [ ] **Phase 5: Landing Page** - Self-service acquisition page so merchants register without Alessandro

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
**Plans**: TBD

Plans:
- [ ] 02-01: Design system mobile-first (componenti UI coerenti, spacing, typography)
- [ ] 02-02: Scanner /stamp ottimizzato (avvio automatico fotocamera, feedback immediato, importo inline, reset automatico)

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
**Plans**: TBD

Plans:
- [ ] 03-01: Redesign /join/[programId] — branded, conversion-optimized
- [ ] 03-02: Redesign /c/[token] — gerarchia visiva per tipo programma, CTA wallet prominente

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
**Plans**: TBD

Plans:
- [ ] 04-01: Profilazione clienti — tag su card_holders, filtro in dashboard
- [ ] 04-02: Notifiche segmentate — filtro per tag e per programma, preview conteggio
- [ ] 04-03: Export CSV clienti

### Phase 5: Landing Page
**Goal**: Un visitatore esterno capisce il valore di FidelityApp e si registra senza contattare Alessandro
**Depends on**: Phase 4
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04
**Success Criteria** (what must be TRUE):
  1. Visitatore arriva alla landing page e legge il valore proposto (cosa fa FidelityApp, per chi) senza scrollare
  2. Visitatore vede illustrato il flusso in 3 step: merchant crea il programma, cliente scansiona il QR, Google Wallet si aggiorna
  3. Visitatore clicca sulla CTA e completa la registrazione senza uscire dal sito
  4. Merchant appena registrato viene reindirizzato all'onboarding wizard esistente
**Plans**: TBD

Plans:
- [ ] 05-01: Landing page self-service (above-fold value prop, 3-step flow, CTA → register → onboarding)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Stability | 3/3 | Complete | 2026-03-02 |
| 2. Merchant UX | 0/2 | Not started | - |
| 3. Customer Pages | 0/2 | Not started | - |
| 4. Retention Tools | 0/3 | Not started | - |
| 5. Landing Page | 0/1 | Not started | - |
