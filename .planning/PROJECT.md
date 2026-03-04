# FidelityApp

## What This Is

SaaS white-label per programmi fedeltà digitali su Google Wallet. I merchant italiani (bar, ristoranti, negozi, palestre) creano carte fedeltà che i clienti salvano direttamente nel Google Wallet già installato sul telefono — senza scaricare nessuna app. Alessandro (Zale Marketing, Roma) è l'owner e usa FidelityApp come prodotto centrale della propria agenzia di digital marketing.

## Core Value

Un cassiere italiano inquadra il QR del cliente e in 3 secondi il Google Wallet si aggiorna — senza app, senza attrito, senza spiegazioni.

## Requirements

### Validated

<!-- Funzionalità già costruite e in produzione su https://fidelityapp-six.vercel.app -->

**Milestone v1.0 (fasi 1–5):**
- ✓ Autenticazione merchant (Supabase Auth — login, register, session) — v1.0
- ✓ 5 tipi di programma fedeltà (stamps, points, cashback, tiers, subscription) — CRUD completo — v1.0
- ✓ Integrazione Google Wallet completa (generazione link JWT, PATCH aggiornamento, hero image 1032×336 dinamica via Edge Runtime) — v1.0
- ✓ Dashboard merchant (programmi, clienti, statistiche di base) — v1.0
- ✓ Scanner QR /stamp per il cassiere (html5-qrcode + fallback manuale) — v1.0
- ✓ Pagina pubblica /join/[programId] — auto-iscrizione clienti — v1.0
- ✓ Pagina pubblica /c/[token] — visualizzazione carta cliente con polling real-time — v1.0
- ✓ Onboarding wizard 4 step post-registrazione — v1.0
- ✓ Notifiche push /dashboard/notifications (messaggio via Wallet update) — v1.0
- ✓ Analytics /dashboard/analytics (KPI + grafico recharts, stats per programma) — v1.0
- ✓ Stripe billing (checkout, portal, webhook, plan enforcement FREE/PRO/BUSINESS) — v1.0
- ✓ Gestione clienti /dashboard/customers (lista card_holders + tag management + CSV export) — v1.0

**Milestone v2.0 (fasi 6–12):**
- ✓ Soft delete + hard delete con cascade per programs/cards (modal conferma nome) — v2.0
- ✓ Hero image colore merchant-branded (?color= param) — v2.0
- ✓ Design system v2: sidebar #111111, cards con border #E8E8E8, zero emoji, Lucide icons — v2.0
- ✓ Analytics avanzata: KPI cards, timeline recharts, stats per programma, recharts grafici — v2.0
- ✓ CSV export carte segmentate /dashboard/cards (PRO/BUSINESS) — v2.0
- ✓ SendApp Cloud WhatsApp: connect/QR/disconnect, bulk campagne con segmentazione, whatsapp_logs — v2.0
- ✓ Webhook integrations HMAC-SHA256 (piano BUSINESS) — v2.0
- ✓ Birthday cron automation (birth_date + messaggio WA) — v2.0
- ✓ Automazioni WhatsApp: template per trigger (welcome/stamp_added/reward_redeemed/dormant/birthday) — v2.0
- ✓ Chatbot AI WhatsApp: OpenAI/Anthropic, whatsapp_conversations, comandi rapidi + AI — v2.0
- ✓ Sidebar dinamica: voci "Automazioni WA" e "Chatbot AI" visibili solo se PRO + WA connesso — v2.0

### Active

<!-- Scope corrente v3.0: OCIO — modulo reputation intelligence (solo piano BUSINESS) -->

**OCIO — Monitoraggio Recensioni (Modulo 1):**
- [ ] Merchant inserisce URL Google Maps business nelle impostazioni OCIO
- [ ] Sistema scrapa recensioni ogni 6h via Apify (compass/google-maps-reviews-scraper) con Trigger.dev
- [ ] Claude AI analizza ogni nuova recensione: sentiment, urgenza, temi, fake detector
- [ ] AI genera risposta personalizzata per ogni recensione da copiare su Google Maps
- [ ] Dashboard /dashboard/ocio con lista recensioni + AI analysis + copy response

**OCIO — Alert WhatsApp (Modulo 2):**
- [ ] Alert WhatsApp automatico via SendApp per ogni recensione negativa/urgente
- [ ] Alert contiene: autore, rating, estratto testo, link alla dashboard
- [ ] Merchant può abilitare/disabilitare gli alert dall'interfaccia OCIO

**OCIO — Struttura Moduli:**
- [ ] Pagina impostazioni OCIO con 6 moduli toggle (1+2 attivi, 3–6 "Prossimamente")
- [ ] Feature gating: modulo OCIO visibile solo piano BUSINESS

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
| Google OAuth differito (OCIO v3.0) | Google Maps Reviews Reply API ha quota 0 — reply automatici non possibili, OAuth non necessario ora | — Pending quota apertura |
| Apify per scraping recensioni | Unico approccio pratico per Google Maps reviews (no API pubblica) | — Pending |
| Trigger.dev v3 per scheduling OCIO | Background jobs senza timeout + retry automatici — ideale per scraping ogni 6h | — Pending |

## Current Milestone: v3.0 OCIO

**Goal:** Reputation intelligence module — monitoraggio automatico recensioni Google Maps, analisi AI, alert WhatsApp per negativi, risposte AI copyable (solo piano BUSINESS)

**Target features:**
- Modulo 1: Monitoraggio recensioni (Apify + Trigger.dev, scraping ogni 6h)
- Modulo 2: Alert WhatsApp per recensioni negative/urgenti (SendApp)
- Dashboard OCIO con lista recensioni, AI analysis (sentiment, urgenza, temi, fake detector), risposta AI copiabile
- Impostazioni OCIO con 6 moduli toggle (3–6 = "Prossimamente")
- Feature gating BUSINESS plan

---
*Last updated: 2026-03-04 after v3.0 OCIO milestone started*
