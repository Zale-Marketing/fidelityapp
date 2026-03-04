---
phase: 13-ocio-foundation
verified: 2026-03-04T12:30:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
human_verification:
  - test: "Eseguire SQL sezione 6 di MANUAL-ACTIONS.md in Supabase e verificare che le tabelle ocio_config, ocio_reviews, ocio_competitor_data, ocio_social_data, ocio_monthly_reports, ocio_alerts_log compaiano nel Table Editor"
    expected: "Tutte e 6 le tabelle visibili senza errori SQL. Le ultime 4 stub sono minimaliste ma creano le FK necessarie per le fasi future."
    why_human: "L'esecuzione SQL in Supabase non e verificabile programmaticamente dal codebase — richiede accesso al dashboard Supabase. Il SUMMARY 13-01 documenta che il merchant ha confermato l'esecuzione, ma non puo essere rivalidato in modo autonomo."
  - test: "Aprire /dashboard/ocio/settings come merchant PRO -> verificare UpgradePrompt BUSINESS"
    expected: "Pagina mostra card UpgradePrompt con requiredPlan='BUSINESS', nessun contenuto OCIO visibile"
    why_human: "Feature gating runtime dipende dallo stato del piano nel DB — non verificabile con sola analisi statica"
  - test: "Aprire /dashboard/ocio/settings come merchant BUSINESS -> inserire URL Google Maps valido -> salvare -> ricaricare"
    expected: "URL persiste dopo ricarica — valore letto da ocio_config in Supabase"
    why_human: "Persistenza end-to-end richiede DB live. La logica del codice e verificata (fetch PATCH + upsert), ma la persistenza effettiva richiede runtime."
  - test: "Toggle module_reviews in /dashboard/ocio/settings -> salvare -> ricaricare"
    expected: "Stato toggle persiste dopo ricarica — valore letto da ocio_config"
    why_human: "Come sopra — persistenza end-to-end non verificabile staticamente"
  - test: "Aprire dashboard come merchant BUSINESS -> verificare voce OCIO nella sidebar"
    expected: "Sezione 'OCIO' con icona Eye e link /dashboard/ocio appare nella sidebar dopo la sezione WhatsApp"
    why_human: "Visibilita condizionale basata su piano runtime (isBusiness derivato da merchant.plan in DB)"
---

# Phase 13: OCIO Foundation — Verification Report

**Phase Goal:** Pone le fondamenta del modulo OCIO: schema DB, tipi TypeScript, installazione dipendenze, pagina settings con 6 moduli, API config, e integrazione navigazione BUSINESS-only.
**Verified:** 2026-03-04T12:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | MANUAL-ACTIONS.md contiene SQL per ocio_config e ocio_reviews con tutti gli indici | VERIFIED | Sezione 6 trovata a line 69; CREATE TABLE IF NOT EXISTS ocio_config (22 colonne) + ocio_reviews (27 campi + 4 indici) |
| 2 | lib/types.ts esporta OcioConfig e OcioReview con tutti i campi del DB schema | VERIFIED | OcioConfig lines 275-296 (20 campi), OcioReview lines 298-326 (25 campi) — corrispondono 1:1 allo schema DB |
| 3 | apify-client e presente in package.json dependencies | VERIFIED | `"apify-client": "^2.22.2"` in package.json dependencies |
| 4 | Merchant BUSINESS apre /dashboard/ocio/settings e vede griglia 2 colonne con 6 card modulo | VERIFIED | 319 linee, MODULES array con 6 elementi, grid cols-1 sm:cols-2, gating isBusiness |
| 5 | Moduli 1 (Monitoraggio Recensioni) e 2 (Alert WhatsApp) hanno toggle funzionante che persiste in Supabase | VERIFIED | toggleModule() attiva su available=true; saveConfig() invia module_reviews e module_alerts via PATCH /api/ocio/config |
| 6 | Moduli 3-6 mostrano overlay grigio semi-trasparente con icona Lock, toggle disabilitato | VERIFIED | overlay `bg-white/60 rounded-xl ... pointer-events-none` + `<Lock size={15}>` per !module.available; toggle ha `disabled={!module.available}` |
| 7 | Merchant BUSINESS inserisce URL Google Maps e lo salva — valore persiste dopo ricarica | VERIFIED (logic) | Input URL con onChange, saveConfig() via PATCH con google_maps_url; API PATCH fa upsert su ocio_config. Persistenza DB richiede human verification. |
| 8 | Merchant FREE o PRO vede UpgradePrompt BUSINESS al posto del contenuto | VERIFIED | `if (!isBusiness) return <UpgradePrompt feature="Modulo OCIO — Reputation Intelligence" requiredPlan="BUSINESS" />` a line 197 |
| 9 | Sidebar mostra voce OCIO con icona Eye solo se merchant ha piano business | VERIFIED | `{isBusiness && (...<Eye icon>...<Link href='/dashboard/ocio'>...)}` a lines 112-137 in Sidebar.tsx |
| 10 | Pagina /dashboard/settings contiene card/link per navigare a /dashboard/ocio/settings | VERIFIED | `href="/dashboard/ocio/settings"` a line 236 con icona Eye purple nella sezione Integrazioni |

**Score:** 10/10 truths verified (5 human verification items for runtime/persistence behavior)

---

### Required Artifacts

| Artifact | Status | Lines | Details |
|----------|--------|-------|---------|
| `MANUAL-ACTIONS.md` | VERIFIED | Section 6, lines 69-174 | SQL completo per 6 tabelle OCIO con IF NOT EXISTS. ocio_config (22 campi), ocio_reviews (27 campi + 4 indici), 4 stub tables. |
| `lib/types.ts` | VERIFIED | Lines 271-326 | Sezione OCIO appendice. OcioConfig esportato (20 campi), OcioReview esportato (25 campi). Nessun tipo esistente modificato. |
| `package.json` | VERIFIED | — | `"apify-client": "^2.22.2"` nelle dependencies. |
| `app/api/ocio/config/route.ts` | VERIFIED | 117 linee | Esporta GET e PATCH. Auth Bearer token, plan check BUSINESS (403 altrimenti), query ocio_config, upsert con onConflict. |
| `app/dashboard/ocio/settings/page.tsx` | VERIFIED | 319 linee | 'use client', isBusiness gating, 6 moduli MODULES array, URL input, saveConfig con PATCH. Supera soglia min_lines: 180. |
| `components/dashboard/Sidebar.tsx` | VERIFIED | 150 linee | Eye importato (line 7), isBusiness state (line 26), setIsBusiness in loadMerchantStatus (line 50), sezione OCIO condizionale (lines 112-137). |
| `app/dashboard/settings/page.tsx` | VERIFIED | — | Eye importato (line 7), link /dashboard/ocio/settings (line 236) nella sezione Integrazioni. |
| `app/dashboard/ocio/page.tsx` | VERIFIED | 62 linee | Stub deliberato (Phase 16 sostituira). isBusiness gating, UpgradePrompt per non-BUSINESS, placeholder con link a settings per BUSINESS. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `lib/types.ts OcioConfig` | `ocio_config table` | Campi identici allo schema DB | VERIFIED | Pattern `google_maps_url.*module_reviews.*module_alerts` confermato a lines 278, 284-289. `reply_tone`, `alert_min_rating`, etc. presenti. |
| `lib/types.ts OcioReview` | `ocio_reviews table` | Campi identici allo schema DB | VERIFIED | `ai_sentiment`, `ai_urgency`, `ai_suggested_reply` presenti a lines 311, 314, 319. |
| `app/dashboard/ocio/settings/page.tsx` | `/api/ocio/config` | fetch GET al load + fetch PATCH al save | VERIFIED | Line 125: `fetch('/api/ocio/config', ...)` in loadData(); Line 164: `fetch('/api/ocio/config', { method: 'PATCH', ... })` in saveConfig(). |
| `app/api/ocio/config/route.ts` | `ocio_config table` | upsert con merchant_id | VERIFIED | Line 55: `.from('ocio_config')` in GET; Lines 109-110: `.from('ocio_config').upsert(payload, { onConflict: 'merchant_id' })` in PATCH. |
| `components/dashboard/Sidebar.tsx` | `/dashboard/ocio` | Link condizionale su isBusiness | VERIFIED | Lines 112-137: `{isBusiness && (...{ href: '/dashboard/ocio', icon: Eye, label: 'OCIO' }...)}`. Logica condizionale verificata, visibilita runtime richiede human test. |
| `app/dashboard/settings/page.tsx` | `/dashboard/ocio/settings` | Link card nella sezione Integrazioni | VERIFIED | Line 236: `href="/dashboard/ocio/settings"` con icona Eye purple e testo "OCIO — Reputation Intelligence". |

---

### Requirements Coverage

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|---------|
| OCIO-01 | 13-01, 13-02 | Merchant puo salvare l'URL Google Maps nelle impostazioni OCIO | SATISFIED | Input URL in settings/page.tsx + PATCH /api/ocio/config + upsert ocio_config.google_maps_url |
| SET-01 | 13-01, 13-02 | Merchant configura OCIO da /dashboard/settings/ocio (URL Google Maps + toggle alert) | SATISFIED | Pagina /dashboard/ocio/settings con campo URL e toggle module_alerts |
| SET-02 | 13-02 | Pagina impostazioni mostra 6 moduli con toggle (1+2 attivi, 3-6 disabled + badge "Prossimamente") | SATISFIED | MODULES array con 6 elementi: available=true per modules 1-2, available=false per moduli 3-6 con overlay Lock |
| SET-03 | 13-02, 13-03 | Dashboard OCIO e impostazioni accessibili solo piano BUSINESS | SATISFIED | isBusiness gate in settings/page.tsx (line 197), in ocio/page.tsx (line 19), e isBusiness in Sidebar (line 112) |

Nessun requirement ID ORPHANED rilevato. Tutti i 4 IDs dichiarati nelle PLANs (OCIO-01, SET-01, SET-02, SET-03) corrispondono a requisiti in REQUIREMENTS.md e sono marcati Complete per Phase 13.

---

### Anti-Patterns Scan

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `app/dashboard/ocio/page.tsx` | "Dashboard in arrivo" (line 48) | INFO | Placeholder **deliberato** — il piano 13-03 documenta esplicitamente che Phase 16 sostituira questo stub con la dashboard completa delle recensioni. Non e un anti-pattern bloccante. |
| `app/dashboard/ocio/settings/page.tsx` | `placeholder="https://maps.app.goo.gl/..."` (line 234) | INFO | Attributo HTML `placeholder` su `<input>` — uso corretto, non un anti-pattern. |

Nessun anti-pattern bloccante trovato. Le istanze rilevate sono entrambe usi corretti (placeholder HTML e stub documentato/pianificato).

---

### Commit Verification

Tutti i commit documentati nei SUMMARYs esistono nel repository git e corrispondono ai file dichiarati:

| Commit | Plan | Descrizione |
|--------|------|-------------|
| `8769227` | 13-01 | docs: SQL OCIO in MANUAL-ACTIONS.md |
| `c1ec622` | 13-01 | feat: OcioConfig e OcioReview types in lib/types.ts |
| `950d080` | 13-01 | chore: install apify-client v2.22.2 |
| `1d22eb3` | 13-02 | feat: API route GET + PATCH /api/ocio/config |
| `8565fbc` | 13-02 | feat: /dashboard/ocio/settings con 6 moduli |
| `e010d80` | 13-03 | feat: voce OCIO in Sidebar.tsx |
| `7c5cded` | 13-03 | feat: link OCIO in settings + stub /dashboard/ocio |

---

### Human Verification Required

#### 1. Tabelle Supabase create

**Test:** Aprire Supabase Dashboard > Table Editor e verificare le tabelle OCIO
**Expected:** 6 tabelle visibili: ocio_config, ocio_reviews, ocio_competitor_data, ocio_social_data, ocio_monthly_reports, ocio_alerts_log
**Why human:** L'esecuzione SQL non e verificabile dal codebase. Il SUMMARY 13-01 documenta conferma umana del checkpoint, ma non e rivalidabile in modo autonomo.

#### 2. Feature gating BUSINESS in runtime

**Test:** Accedere a /dashboard/ocio/settings come merchant con piano FREE o PRO
**Expected:** Pagina mostra UpgradePrompt con requiredPlan="BUSINESS" — nessun contenuto OCIO visibile
**Why human:** Il gating dipende dal piano letto dal DB in runtime tramite usePlan() hook.

#### 3. Persistenza URL Google Maps

**Test:** Inserire URL https://maps.google.com/test in /dashboard/ocio/settings -> Salvare -> Ricaricare la pagina
**Expected:** L'URL persiste — il valore viene letto da ocio_config in Supabase al ricaricamento
**Why human:** Persistenza end-to-end richiede DB live Supabase.

#### 4. Persistenza toggle modulo

**Test:** Disattivare il toggle "Monitoraggio Recensioni" -> Salvare -> Ricaricare
**Expected:** Toggle rimane disattivato — module_reviews=false persiste in ocio_config
**Why human:** Come sopra — persistenza DB non verificabile staticamente.

#### 5. Voce OCIO sidebar per merchant BUSINESS

**Test:** Accedere al dashboard come merchant con piano BUSINESS
**Expected:** Sezione "OCIO" con icona Eye e link /dashboard/ocio visibile nella sidebar dopo la sezione WhatsApp
**Why human:** Visibilita condizionale basata su piano runtime (isBusiness = plan === 'business' letto dal DB).

---

### Gaps Summary

Nessun gap rilevato. Tutti i must-haves di tutti e 3 i piani sono stati verificati nel codebase. I 5 item di human verification riguardano comportamento runtime e persistenza DB — non indicano codice mancante o stubs non pianificati.

La nota sul file `app/dashboard/ocio/page.tsx` come "stub deliberato" e chiaramente documentata in 13-03-PLAN.md e 13-03-SUMMARY.md — Phase 16 la sostituira con la dashboard recensioni completa.

---

_Verified: 2026-03-04T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
