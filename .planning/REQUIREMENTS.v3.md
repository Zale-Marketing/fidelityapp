# Requirements: FidelityApp v3.0 — SendApp WhatsApp

**Defined:** 2026-03-03
**Core Value:** Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.

---

## v3.0 Requirements

### SENDAPP — SendApp Cloud Integration

- [ ] **SENDAPP-01**: Merchant può inserire Access Token e Instance ID SendApp nelle impostazioni
- [ ] **SENDAPP-02**: Merchant può connettere istanza WhatsApp tramite QR code da SendApp
- [ ] **SENDAPP-03**: Sistema aggiorna stato connessione (connected/disconnected) in DB
- [ ] **SENDAPP-04**: Merchant può fare reconnect e reboot dell'istanza
- [ ] **SENDAPP-05**: Merchant può disconnettere WhatsApp

### BULK — Bulk WhatsApp Campaigns

- [ ] **BULK-01**: Merchant può inviare campagna WhatsApp a segmento (tutti/attivi 30gg/dormienti 30-90gg/persi >90gg/programma)
- [ ] **BULK-02**: Sistema mostra contatore clienti live per segmento selezionato
- [ ] **BULK-03**: Messaggi supportano variabili {nome} {bollini} {premio} {link_carta}
- [ ] **BULK-04**: Preview bolla WhatsApp del messaggio prima dell'invio
- [ ] **BULK-05**: Storico invii WhatsApp da whatsapp_logs (data, destinatario, messaggio troncato, stato, tipo)

### AUTO — Automatic Messages

- [ ] **AUTO-01**: Sistema invia WhatsApp automatico dopo aggiunta bollino ("Ciao {nome}! Hai {n} bollini...")
- [ ] **AUTO-02**: Sistema invia WhatsApp di benvenuto dopo iscrizione ("Benvenuto/a {nome}! La tua carta è attiva...")
- [ ] **AUTO-03**: Sistema invia WhatsApp dopo riscatto premio ("Complimenti {nome}! Hai riscattato...")

### LOG — Logging

- [ ] **LOG-01**: Ogni messaggio inviato viene loggato in whatsapp_logs (merchant_id, to_phone, message, status, event_type)

### TEST — Test Capability

- [ ] **TEST-01**: Merchant può inviare messaggio di test a numero specifico dalla pagina settings

## Deferred / Out of Scope

| Feature | Reason |
|---------|--------|
| SendApp Official (€49/mese) | Prossimamente — UI badge disabled |
| Group messaging UI | Funzionalità avanzata, non prioritaria |
| Template library | Complexity > value for MVP |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SENDAPP-01 | Phase 13 | Pending |
| SENDAPP-02 | Phase 13 | Pending |
| SENDAPP-03 | Phase 13 | Pending |
| SENDAPP-04 | Phase 13 | Pending |
| SENDAPP-05 | Phase 13 | Pending |
| LOG-01 | Phase 13 | Pending |
| TEST-01 | Phase 14 | Pending |
| BULK-01 | Phase 15 | Pending |
| BULK-02 | Phase 15 | Pending |
| BULK-03 | Phase 15 | Pending |
| BULK-04 | Phase 15 | Pending |
| BULK-05 | Phase 15 | Pending |
| AUTO-01 | Phase 16 | Pending |
| AUTO-02 | Phase 16 | Pending |
| AUTO-03 | Phase 16 | Pending |

**Coverage:**
- v3.0 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after milestone v3.0 start*
