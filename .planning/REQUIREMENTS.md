# Requirements: FidelityApp — v3.0 OCIO

**Defined:** 2026-03-04
**Core Value:** Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.

## v3.0 Requirements

Modulo OCIO — Reputation Intelligence (solo piano BUSINESS).

### OCIO — Monitoraggio & AI (Modulo 1)

- [x] **OCIO-01**: Merchant può salvare l'URL Google Maps della propria attività nelle impostazioni OCIO
- [x] **OCIO-02**: Il sistema recupera automaticamente nuove recensioni ogni 6h tramite Apify actor (compass/google-maps-reviews-scraper) schedulato con Trigger.dev
- [ ] **OCIO-03**: Claude AI classifica ogni nuova recensione con sentiment (positivo/negativo/neutro)
- [ ] **OCIO-04**: Claude AI valuta il livello di urgenza di ogni recensione (alta/media/bassa)
- [ ] **OCIO-05**: Claude AI identifica i temi principali di ogni recensione
- [ ] **OCIO-06**: Claude AI segnala le recensioni potenzialmente false con reasoning esplicito
- [ ] **OCIO-07**: Claude AI genera una risposta personalizzata per ogni recensione
- [x] **OCIO-08**: Il sistema non ri-processa recensioni già analizzate (idempotency su review ID esterno)

### ALERT — Alert WhatsApp (Modulo 2)

- [ ] **ALERT-01**: Merchant riceve messaggio WhatsApp per ogni nuova recensione negativa o ad alta urgenza
- [ ] **ALERT-02**: Il messaggio alert include: rating, nome autore, estratto testo, link alla dashboard OCIO
- [ ] **ALERT-03**: Merchant può abilitare/disabilitare gli alert WhatsApp dalle impostazioni OCIO

### DASH — Dashboard

- [ ] **DASH-01**: Merchant visualizza tutte le recensioni in /dashboard/ocio con filtri per sentiment, rating, data
- [ ] **DASH-02**: Ogni recensione mostra: autore, rating, testo, data, sentiment, urgenza, temi, flag fake (se presente)
- [ ] **DASH-03**: Merchant copia la risposta AI per una recensione con un solo click (clipboard)
- [ ] **DASH-04**: Dashboard mostra stats riassuntive: rating medio, % positive/negative, trend ultime 30gg

### SET — Impostazioni & Configurazione

- [x] **SET-01**: Merchant configura OCIO da /dashboard/settings/ocio (URL Google Maps + toggle alert)
- [x] **SET-02**: Pagina impostazioni mostra 6 moduli con toggle (1+2 attivi, 3–6 disabled + badge "Prossimamente")
- [x] **SET-03**: Dashboard OCIO e impostazioni accessibili solo piano BUSINESS

## v4 Requirements

Moduli futuri — in roadmap post-OCIO.

### Social & Competitor Intelligence

- **SOCIAL-01**: Merchant monitora menzioni su Instagram tramite Apify actor
- **COMP-01**: Merchant monitora competitor su Google Maps (Competitor Radar)
- **PRICE-01**: Merchant monitora prezzi competitor (Price Intelligence)

### Report & Automation

- **REPORT-01**: Merchant riceve report mensile AI con trend e raccomandazioni
- **REPLY-01**: Sistema invia risposte automatiche su Google Maps (quando Google apre quota API)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Reply automatici a Google Maps | Google Maps Reviews Reply API ha quota 0 — impossibile ora |
| Google OAuth 2.0 | Non necessario finché le risposte sono manuali — differire a quando quota apre |
| Apple Maps / TripAdvisor monitoring | Focus su Google Maps per il lancio |
| Analisi sentiment storico (recensioni passate) | Prima versione monitora solo nuove; storico è un'estensione futura |
| Notifiche email per recensioni negative | SendApp WA già integrato — canale sufficiente per il lancio |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SET-01 | Phase 13 | Complete |
| SET-02 | Phase 13 | Complete |
| SET-03 | Phase 13 | Complete |
| OCIO-01 | Phase 13 | Complete |
| OCIO-02 | Phase 14 | Complete |
| OCIO-08 | Phase 14 | Complete |
| OCIO-03 | Phase 15 | Pending |
| OCIO-04 | Phase 15 | Pending |
| OCIO-05 | Phase 15 | Pending |
| OCIO-06 | Phase 15 | Pending |
| OCIO-07 | Phase 15 | Pending |
| DASH-01 | Phase 16 | Pending |
| DASH-02 | Phase 16 | Pending |
| DASH-03 | Phase 16 | Pending |
| DASH-04 | Phase 16 | Pending |
| ALERT-01 | Phase 16 | Pending |
| ALERT-02 | Phase 16 | Pending |
| ALERT-03 | Phase 16 | Pending |

**Coverage:**
- v3.0 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-03-04*
*Last updated: 2026-03-04 — traceability complete after roadmap creation*
