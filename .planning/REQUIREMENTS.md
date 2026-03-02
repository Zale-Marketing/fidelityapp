# Requirements: FidelityApp

**Defined:** 2026-03-02
**Core Value:** Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.

## v1 Requirements

### UI — Design System Mobile-First

- [ ] **UI-01**: Merchant vede una dashboard con layout coerente su mobile (nav, spacing, typography uniformi in tutte le pagine)
- [ ] **UI-02**: Merchant vede pulsanti, card e form con stile visivo consistente e professionale (livello Stamp.me / Loopy)
- [ ] **UI-03**: Merchant può navigare la dashboard da smartphone senza zoom o scroll orizzontale

### JOIN — Pagina Iscrizione Cliente

- [ ] **JOIN-01**: Cliente vede la pagina /join/[programId] con colore principale del merchant applicato a sfondo, pulsanti e accenti
- [ ] **JOIN-02**: Cliente vede una descrizione chiara del programma (tipo, reward, come si guadagnano i punti/bollini)
- [ ] **JOIN-03**: Cliente vede la soglia per il premio prima di iscriversi (es. "10 caffè = 1 gratis")
- [ ] **JOIN-04**: Cliente completa l'iscrizione e viene reindirizzato alla sua carta senza errori

### CARD — Pagina Carta Cliente

- [ ] **CARD-01**: Cliente vede lo stato della sua carta con gerarchia visiva corretta per ogni tipo programma (bollini, punti, cashback, livello VIP, abbonamento)
- [ ] **CARD-02**: Cliente vede chiaramente quanto manca al prossimo premio (es. "ancora 3 bollini")
- [ ] **CARD-03**: Cliente vede il pulsante "Aggiungi a Google Wallet" prominente se la carta non è ancora nel wallet

### STAMP — Scanner Cassiere

- [ ] **STAMP-01**: Cassiere apre /stamp e la fotocamera si attiva automaticamente senza step intermedi
- [ ] **STAMP-02**: Cassiere riceve feedback visivo immediato (verde/rosso) entro 1 secondo dalla scansione
- [ ] **STAMP-03**: Cassiere può inserire l'importo speso inline per programmi points e cashback, senza navigare altrove
- [ ] **STAMP-04**: Cassiere può fare scansioni multiple consecutive senza ricaricare la pagina (reset automatico dopo conferma)

### PROFILE — Profilazione Clienti Leggera

- [ ] **PROF-01**: Merchant può aggiungere uno o più tag liberi a un cliente dalla sua scheda (es. "VIP", "Abituale", "Premio Riscattato")
- [ ] **PROF-02**: Merchant può rimuovere un tag da un cliente
- [ ] **PROF-03**: Merchant può filtrare la lista clienti per tag nella pagina /dashboard/customers

### NOTIFY — Notifiche Segmentate

- [ ] **NOTIFY-01**: Merchant può selezionare un tag specifico come destinatari prima di inviare una notifica
- [ ] **NOTIFY-02**: Merchant vede il numero di clienti che riceveranno la notifica prima di inviarla
- [ ] **NOTIFY-03**: Merchant può inviare notifica a tutti i clienti di un programma specifico (filtro per programma)

### EXPORT — Export Dati Clienti

- [ ] **EXPORT-01**: Merchant può scaricare un file CSV con la lista dei clienti (nome, email, telefono, programma, saldo corrente) dalla pagina /dashboard/customers

### LAND — Landing Page Self-Service

- [ ] **LAND-01**: Visitatore vede una landing page con valore proposto chiaro e credibile sopra the fold
- [ ] **LAND-02**: Visitatore vede come funziona il flusso (3 step: merchant crea → cliente scansiona → wallet si aggiorna)
- [ ] **LAND-03**: Visitatore si registra come merchant dalla landing page senza uscire dalla pagina (CTA → register)
- [ ] **LAND-04**: Merchant registrato viene reindirizzato all'onboarding wizard già esistente

### BUG — Fix Critici

- [ ] **BUG-01**: Idempotency key generata una volta al momento della scansione (non con Date.now() dentro ogni handler) — previene doppi stamp
- [ ] **BUG-02**: Tabella `notification_logs` creata in Supabase — lo storico notifiche funziona
- [ ] **BUG-03**: Tipo "Missioni" rimosso dal selettore di creazione programma (o disabled con tooltip) — previene crash wallet API
- [ ] **BUG-04**: Colonne Stripe (`stripe_customer_id`, `stripe_subscription_id`, `stripe_subscription_status`, `plan_expires_at`) aggiunte alla tabella `merchants` via SQL migration
- [x] **BUG-05**: API routes `/api/wallet` e `/api/wallet-update` verificano che la richiesta provenga da un contesto valido (auth check di base)

## v2 Requirements

### Performance

- **PERF-01**: Pagina /c/[token] usa Supabase Realtime subscription invece di polling ogni 5 secondi
- **PERF-02**: Dashboard aggregazioni spostate server-side (RPC Supabase) invece di browser-side
- **PERF-03**: Stamp transactions paginate (limit 100) nella dashboard

### Type Safety

- **TYPE-01**: `lib/types.ts` riscritto in sync con lo schema Supabase reale
- **TYPE-02**: Rimossi i 84 cast `as any` dalle pagine principali

### Sicurezza

- **SEC-01**: Row-Level Security configurata su tabelle cards, programs, card_holders
- **SEC-02**: `/api/stripe-checkout` deriva merchantId dalla sessione auth, non dal body

### Tech Debt

- **DEBT-01**: Unificato campo stamp (`current_stamps` vs `stamp_count`) — singolo campo con migration
- **DEBT-02**: Rimossi fallback `reward_text` — solo `reward_description`
- **DEBT-03**: Estratti handler transazione da stamp/page.tsx in `lib/stamp-operations.ts`

## Out of Scope

| Feature | Reason |
|---------|--------|
| Apple Wallet | Android dominante in Italia, aggiunge complessità significativa |
| Stripe attivazione | Dopo feedback da primo merchant reale |
| Test automatici | Non bloccante per il lancio, da aggiungere progressivamente |
| Multi-sede per merchant | Complessità > valore per v1 |
| White-label completo | Dopo stabilizzazione prodotto |
| Sistema referral | v3 o oltre |
| Tipo "Missioni" completo | Alta complessità, richiede tabella card_missions + UI dedicata |
| App mobile nativa | Anti-tesi al valore (no-app experience) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 1 | Pending |
| BUG-02 | Phase 1 | Pending |
| BUG-03 | Phase 1 | Pending |
| BUG-04 | Phase 1 | Pending |
| BUG-05 | Phase 1 | Complete |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 2 | Pending |
| STAMP-01 | Phase 2 | Pending |
| STAMP-02 | Phase 2 | Pending |
| STAMP-03 | Phase 2 | Pending |
| STAMP-04 | Phase 2 | Pending |
| JOIN-01 | Phase 3 | Pending |
| JOIN-02 | Phase 3 | Pending |
| JOIN-03 | Phase 3 | Pending |
| JOIN-04 | Phase 3 | Pending |
| CARD-01 | Phase 3 | Pending |
| CARD-02 | Phase 3 | Pending |
| CARD-03 | Phase 3 | Pending |
| PROF-01 | Phase 4 | Pending |
| PROF-02 | Phase 4 | Pending |
| PROF-03 | Phase 4 | Pending |
| NOTIFY-01 | Phase 4 | Pending |
| NOTIFY-02 | Phase 4 | Pending |
| NOTIFY-03 | Phase 4 | Pending |
| EXPORT-01 | Phase 4 | Pending |
| LAND-01 | Phase 5 | Pending |
| LAND-02 | Phase 5 | Pending |
| LAND-03 | Phase 5 | Pending |
| LAND-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after roadmap creation (traceability confirmed)*
