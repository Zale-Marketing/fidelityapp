---
phase: 16-dashboard-alert
verified: 2026-03-04T16:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Verifica visiva: filtri sentiment/rating/periodo aggiornano la lista in real-time"
    expected: "Cliccando 'Negativo' la lista mostra solo recensioni negative; cliccando su una stella filtra per quel rating"
    why_human: "Comportamento client-side useMemo — non verificabile programmaticamente senza browser"
  - test: "Verifica visiva: copia risposta AI — pulsante diventa verde per 2 secondi con testo 'Copiato!'"
    expected: "Pulsante cambia colore a verde e testo cambia a 'Copiato!' per 2s, poi torna allo stato originale"
    why_human: "setTimeout visual feedback e clipboard API richiedono browser"
  - test: "Verifica visiva: 'Ho risposto' chiude il modal e la card mostra badge 'Risposto'"
    expected: "Modal si chiude, card review mostra CheckCircle + 'Risposto' senza ricaricare la pagina"
    why_human: "Ottimistic UI update + DOM re-render richiedono browser"
  - test: "Verifica WhatsApp alert end-to-end: dopo analisi AI di una recensione negativa con SendApp connesso e alert configurato"
    expected: "Merchant riceve messaggio WhatsApp con rating, autore, estratto testo e link alla dashboard OCIO"
    why_human: "Richiede Trigger.dev attivo + SendApp connesso + numero alert configurato"
---

# Phase 16: Dashboard Alert — Verification Report

**Phase Goal:** Merchant visualizza tutte le recensioni analizzate in un'unica dashboard con filtri e riceve alert WhatsApp per le recensioni negative
**Verified:** 2026-03-04T16:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Merchant puo segnare una recensione come 'replied' o 'ignored' — la UI riflette il cambio | VERIFIED | `updateReplyStatus()` in `ocio/page.tsx` (lines 284-303) chiama PATCH, aggiorna state locale, `reply_status` badges in `ReviewCard` (lines 85-96) |
| 2 | Task ocio-ai-analyzer invia WhatsApp quando sentiment=negative o urgency=high/critical, solo se module_alerts=true e alert_whatsapp_number non null | VERIFIED | `trigger/ocio-ai-analyzer.ts` lines 192-229: guard composta `shouldAlert && !review.alert_sent && alertConfig?.module_alerts && alertConfig?.alert_whatsapp_number && merchantData?.sendapp_status === 'connected'` |
| 3 | Merchant configura alert_whatsapp_number nella settings page OCIO e il valore persiste dopo ricarica | VERIFIED | `settings/page.tsx`: `alertPhone` state (line 108), caricato in `loadData()` (line 140), inviato in PATCH body (line 176), input condizionale su `config.module_alerts` (lines 318-334) |
| 4 | Merchant vede 4 KPI in riga (rating medio, totale, nuove 30gg, da rispondere) + ComposedChart 6 mesi | VERIFIED | `ocio/page.tsx` lines 354-414: 4 `MetricCard` in grid `lg:grid-cols-4`, `ComposedChart` con `Bar` + `Line`, dual Y-axis |
| 5 | Merchant filtra recensioni per sentiment, rating (1-5), periodo (30/90/tutto) | VERIFIED | `filteredReviews` useMemo (lines 269-281), Pill buttons per sentiment (lines 421-424), rating 1-5 (lines 429-432), periodo (lines 437-439) |
| 6 | Ogni card recensione mostra stelle, autore, data, testo line-clamp-3, badge sentiment, badge urgenza, max 2 badge temi | VERIFIED | `ReviewCard` (lines 66-139): `StarRow`, `author_name`, `published_at`, `line-clamp-3`, badge sentiment, badge urgenza (solo se != 'low'), `visibleThemes.slice(0, 2)` + `+N altri` |
| 7 | Merchant clicca 'Vedi risposta AI' e si apre il modal con testo completo, analisi AI, banner fake se present, risposta AI con pulsante Copia | VERIFIED | Modal (lines 469-628): testo completo, `ai_is_fake` banner amber (lines 512-522), sezione analisi AI (lines 525-551), `ai_suggested_reply` in `<pre>` (lines 558-560), pulsante Copia (lines 561-571) |
| 8 | Copia risposta: toast 'Copiato!', pulsante verde 2s, modal rimane aperto | VERIFIED | `handleCopy()` (lines 305-313): `setCopying(true)` + `setTimeout(2000)`, button className condizionale su `copying` (lines 563-566), `setSelectedReview(null)` NON chiamato in `handleCopy` |
| 9 | Merchant clicca 'Ho risposto' o 'Ignora' nel modal — PATCH /api/ocio/reviews/[id] aggiorna reply_status; modal chiude e card aggiorna badge | VERIFIED | `updateReplyStatus()` chiama PATCH (lines 286-293), aggiorna array reviews locale (lines 294-298), `setSelectedReview(null)` (line 299) |

**Score:** 9/9 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/ocio/reviews/[id]/route.ts` | PATCH endpoint per aggiornare reply_status su ocio_reviews | VERIFIED | 108 righe. Auth Bearer, piano BUSINESS guard, ownership check, update reply_status + replied_at condizionale, risposta 200 `{ success: true }` |
| `trigger/ocio-ai-analyzer.ts` | Logica alert WhatsApp per recensioni negative/urgenti dopo analisi AI | VERIFIED | 257 righe. Import statico `sendTextMessage, formatPhoneIT` (line 3), SELECT estesa include `author_name, review_url, alert_sent` (line 130), alertConfig + merchantData fetchati pre-loop (lines 146-157), logica alert in try/catch separato (lines 191-236) |
| `app/dashboard/ocio/page.tsx` | Dashboard OCIO completa: KPI + chart + lista filtrata + modal | VERIFIED | 631 righe (> 300 richieste). Contiene `ComposedChart`, `selectedReview`, `filteredReviews`, `updateReplyStatus`, `handleCopy`, `ReviewCard`, `Pill`, `StarRow` |
| `app/dashboard/ocio/settings/page.tsx` | Form alert_whatsapp_number nel modulo Alert WhatsApp | VERIFIED | `alertPhone` state, caricato da API, inviato in PATCH, input condizionale su `config.module_alerts` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `trigger/ocio-ai-analyzer.ts` | `lib/sendapp.ts` | `sendTextMessage(normalizedPhone, message, instanceId, accessToken)` | WIRED | Import statico line 3; chiamata line 218-223 |
| `trigger/ocio-ai-analyzer.ts` | `ocio_reviews` | `UPDATE alert_sent=true, alert_sent_at=now()` | WIRED | Lines 225-228: `.update({ alert_sent: true, alert_sent_at: ... }).eq('id', review.id)` |
| `app/api/ocio/reviews/[id]/route.ts` | `ocio_reviews` | `UPDATE reply_status, replied_at` | WIRED | Lines 97-105: `.from('ocio_reviews').update(updatePayload).eq('id', id).eq('merchant_id', profile.merchant_id)` |
| `app/dashboard/ocio/page.tsx` | `/api/ocio/reviews/[id]` | PATCH fetch per reply_status update | WIRED | Lines 286-293: `fetch('/api/ocio/reviews/${reviewId}', { method: 'PATCH', ... })` con Bearer token |
| `app/dashboard/ocio/page.tsx` | `ocio_reviews` | SELECT * ORDER BY published_at DESC | WIRED | Lines 199-203: `.from('ocio_reviews').select('*').eq('merchant_id', merchantId).order('published_at', { ascending: false })` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ALERT-01 | 16-01 | Merchant riceve WhatsApp per recensione negativa o alta urgenza | SATISFIED | `ocio-ai-analyzer.ts`: `shouldAlert = result.sentiment === 'negative' || result.urgency === 'high' || result.urgency === 'critical'` |
| ALERT-02 | 16-01 | Messaggio include: rating, autore, estratto testo, link dashboard OCIO | SATISFIED | `ocio-ai-analyzer.ts` lines 206-214: `message = "⭐ Nuova recensione ${rating}/5 da ${authorName}\n\"${excerpt}\"\n\nVisualizza su OCIO: ${appUrl}/dashboard/ocio"` |
| ALERT-03 | 16-01 | Merchant abilita/disabilita alert dalle impostazioni OCIO | SATISFIED | `settings/page.tsx`: toggle `module_alerts` nel modulo "Alert WhatsApp", inviato in PATCH `/api/ocio/config`; analyzer controlla `alertConfig.module_alerts` prima di inviare |
| DASH-01 | 16-02 | Lista recensioni con filtri sentiment, rating, data in /dashboard/ocio | SATISFIED | `filteredReviews` useMemo + 3 gruppi Pill buttons sentiment/rating/periodo |
| DASH-02 | 16-02 | Ogni recensione mostra: autore, rating, testo, data, sentiment, urgenza, temi, flag fake | SATISFIED | `ReviewCard` (card) + modal: tutti i campi presenti. Flag fake: banner amber in modal con `ai_fake_reason` |
| DASH-03 | 16-02 | Copia risposta AI con un solo click | SATISFIED | `handleCopy()` usa `navigator.clipboard.writeText()`; pulsante "Copia risposta" nel modal |
| DASH-04 | 16-02 | Stats riassuntive: rating medio, conteggi, trend | SATISFIED | 4 MetricCard: rating medio con trend vs mese scorso, totale, nuove 30gg, da rispondere. ComposedChart 6 mesi |

**Orphaned requirements check:** REQUIREMENTS.md mappa DASH-01 through DASH-04 e ALERT-01 through ALERT-03 a Phase 16 — tutti coperti dai due plan. Nessun requisito orfano.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/dashboard/ocio/page.tsx` | 300 | `console.error('Failed to update reply status', err)` — errore silenzioso senza feedback all'utente | Info | L'errore viene loggato ma il merchant non riceve alcuna notifica visiva se PATCH fallisce |
| `trigger/ocio-ai-analyzer.ts` | 107 | `process.env.ANTHROPIC_API_KEY` — hardcoded provider Anthropic, ma `lib/types.ts` prevede `ai_provider: 'openai'|'anthropic'` per merchant | Info | Comportamento intenzionale: OCIO usa solo Anthropic (task Trigger.dev), non il provider per-merchant del chatbot |

Nessun blocker o warning critico trovato.

---

## Human Verification Required

### 1. Filtri sentiment/rating/periodo in real-time

**Test:** Navigare su /dashboard/ocio con account BUSINESS che ha recensioni. Cliccare "Negativo" nella sezione sentiment. Poi cliccare "★★★ 3" nel rating.
**Expected:** Lista si aggiorna immediatamente mostrando solo le recensioni che soddisfano entrambi i filtri attivi, senza reload della pagina.
**Why human:** Comportamento client-side useMemo — non verificabile programmaticamente senza browser DOM.

### 2. Copia risposta AI con feedback visivo

**Test:** Aprire modal su una recensione con risposta AI disponibile. Cliccare "Copia risposta".
**Expected:** Pulsante diventa verde con testo "Copiato!" per 2 secondi, poi torna al colore originale. Modal rimane aperto. Incollare in un editor verifica che il contenuto copiato corrisponde alla risposta AI.
**Why human:** `navigator.clipboard` e setTimeout visual feedback richiedono browser reale.

### 3. Update reply_status + chiusura modal + aggiornamento card

**Test:** Aprire modal su una recensione con `reply_status = 'pending'`. Cliccare "Ho risposto".
**Expected:** Modal si chiude. La card nella lista mostra ora il badge verde "Risposto" (CheckCircle). Nessun reload pagina.
**Why human:** Ottimistic UI update su state React — richiede browser.

### 4. Alert WhatsApp end-to-end per recensione negativa

**Test:** Con merchant BUSINESS che ha: SendApp connesso, `module_alerts=true`, `alert_whatsapp_number` configurato — triggerare manualmente `ocio-ai-analyzer` con una recensione negativa non ancora analizzata.
**Expected:** Merchant riceve WhatsApp con formato "Nuova recensione X/5 da [autore] [estratto] Visualizza su OCIO: [url]". Campo `alert_sent=true` aggiornato in DB su `ocio_reviews`.
**Why human:** Richiede Trigger.dev attivo + SendApp connesso + numero alert reale.

---

## Gaps Summary

Nessun gap trovato. Tutti i must-haves verificati a 3 livelli (exists, substantive, wired).

I tre file dichiarati dal piano 16-01 esistono e sono sostanziali:
- `app/api/ocio/reviews/[id]/route.ts`: implementazione completa con auth + ownership + update DB
- `trigger/ocio-ai-analyzer.ts`: logica alert WhatsApp correttamente guardata con tutti i prerequisiti (module_alerts, alert_whatsapp_number, sendapp_status connected, alert_sent=false)
- `app/dashboard/ocio/settings/page.tsx`: alertPhone caricato, persistito e mostrato condizionalmente

Il file dichiarato dal piano 16-02 esiste e e' sostanziale:
- `app/dashboard/ocio/page.tsx`: 631 righe, contiene tutti i pattern richiesti (ComposedChart, KPI, filtri, modal, updateReplyStatus, handleCopy)

I 3 commit documentati (82a9528, 31734f4, 8104644) esistono nel repository git e corrispondono agli artefatti verificati.

---

_Verified: 2026-03-04T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
