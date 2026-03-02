# FidelityApp

## What This Is

SaaS white-label per programmi fedeltà digitali su Google Wallet. I merchant italiani (bar, ristoranti, negozi, palestre) creano carte fedeltà che i clienti salvano direttamente nel Google Wallet già installato sul telefono — senza scaricare nessuna app. Alessandro (Zale Marketing, Roma) è l'owner e usa FidelityApp come prodotto centrale della propria agenzia di digital marketing.

## Core Value

Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.

## Requirements

### Validated

<!-- Funzionalità già costruite e in produzione su https://fidelityapp-six.vercel.app -->

- ✓ Autenticazione merchant (Supabase Auth — login, register, session) — existing
- ✓ 5 tipi di programma fedeltà (stamps, points, cashback, tiers, subscription) — CRUD completo — existing
- ✓ Integrazione Google Wallet completa (generazione link JWT, PATCH aggiornamento, hero image 1032×336 dinamica via Edge Runtime) — existing
- ✓ Dashboard merchant (programmi, clienti, statistiche di base) — existing
- ✓ Scanner QR /stamp per il cassiere (html5-qrcode + fallback manuale) — existing
- ✓ Pagina pubblica /join/[programId] — auto-iscrizione clienti — existing
- ✓ Pagina pubblica /c/[token] — visualizzazione carta cliente con polling real-time — existing
- ✓ Onboarding wizard 4 step post-registrazione — existing
- ✓ Notifiche push /dashboard/notifications (messaggio via Wallet update) — existing
- ✓ Analytics /dashboard/analytics (KPI + grafico timeline + stats per programma) — existing
- ✓ Stripe billing (codice API routes completo, chiavi mancanti + SQL migration pendente) — existing
- ✓ Enforcement piano FREE (blocco creazione >5 programmi) — existing
- ✓ Gestione clienti /dashboard/customers (lista card_holders) — existing

### Active

<!-- Scope corrente: portare il prodotto a standard self-service per primo merchant reale -->

- [ ] UI polish globale mobile-first (livello Stamp.me / Loopy) — componenti coerenti, spacing uniforme, design system
- [ ] /join/[programId] ridisegnata — branded col colore merchant, spiega bene il programma, conversion-optimized
- [ ] /c/[token] migliorata — chiara per il cliente finale, gerarchia visiva corretta per ogni tipo programma
- [ ] Scanner /stamp ottimizzato — UX veloce per il cassiere, UI senza distrazioni, feedback immediato
- [ ] Profilazione clienti leggera — tag su card_holders, liste segmentate nella dashboard
- [ ] Notifiche segmentate — invio messaggi a tag specifici o liste personalizzate
- [ ] Export CSV clienti dalla dashboard
- [ ] Landing page self-service — merchant la vede, si convince, si registra senza parlare con Alessandro
- [ ] Bug fixes critici — idempotency key corretta, notification_logs table, missions type disabilitato, SQL migrations Stripe
- [ ] Sicurezza base API routes — auth check su /api/wallet e /api/wallet-update

### Out of Scope

- Apple Wallet — non prioritario, Google Wallet già installato su Android che è dominante in Italia
- Multi-sede per singolo merchant — complessità > valore per il primo lancio
- White-label completo (rimozione "Zale Marketing") — dopo che il prodotto è stabile
- Sistema referral — v2 o v3
- Gamification avanzata (missioni, badge) — "Missioni" rimosso dalla UI fino a implementazione completa
- Stripe attivazione — dopo feedback da primo merchant reale che usa il prodotto
- Test automatici — da aggiungere progressivamente, non bloccante per il lancio
- App mobile nativa — il punto di forza è NON richiedere app

## Context

- **Codebase esistente:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Supabase + Google Wallet API. Codebase map disponibile in `.planning/codebase/`
- **Tech debt noto:** doppio campo stamp (current_stamps + stamp_count), reward_text legacy fallbacks, lib/types.ts out of sync col DB reale, 84 occorrenze di `any`, stamp/page.tsx monolitico (929 righe)
- **Bug critici pendenti:** idempotency key sempre unica (non previene duplicati), notification_logs table non esiste in Supabase, tipo "Missioni" selezionabile ma non implementato, colonne Stripe non aggiunte a merchants table
- **Vincolo Google Wallet:** la Class (programma) si congela alla prima creazione — logo/colori non si aggiornano su carte già salvate. Solo l'Object (dati dinamici cliente) si aggiorna via PATCH
- **Deploy:** Vercel (https://fidelityapp-six.vercel.app), Supabase per DB + Auth + Storage
- **Reference UI:** Stamp.me e Loopy Loyalty — mobile-first, clean, professional

## Constraints

- **Tech:** NON toccare `lib/google-wallet.ts` — funziona, è critico, nessuna modifica
- **Tech:** Query Supabase separate in edge runtime — no join nested (limitazione client edge)
- **Tech:** NO SVG per loghi merchant/programma — Google Wallet non supporta SVG, solo PNG/JPG/WebP
- **Tech:** Ogni `<div>` con più figli in `ImageResponse` (Satori) DEVE avere `display: 'flex'`
- **Business:** Stripe non si attiva fino a feedback da primo merchant reale
- **Business:** NO Apple Wallet per ora
- **Business:** Pricing FREE/PRO da ridefinire dopo primo merchant — non prioritario ora

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Google Wallet over Apple Wallet | Android dominante in Italia, no app da scaricare | — Pending valutazione mercato |
| Self-service puro come obiettivo | Alessandro non vuole gestire onboarding manuale per ogni merchant | — Pending |
| Stripe dopo primo merchant reale | Non monetizzare su prodotto non ancora validato con utenti reali | — Pending |
| Mantenere tipo "Missioni" nascosto | Selezionabile ma non implementato — causa crash wallet API | ⚠️ Disabilitare subito dalla UI |
| Tailwind v4 + Next.js 16 + React 19 | Stack moderno, già in uso, non cambiare | — Pending stabilità |

---
*Last updated: 2026-03-02 after initialization*
