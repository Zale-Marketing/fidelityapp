---
phase: 04-retention-tools
verified: 2026-03-02T13:30:00Z
status: human_needed
score: 7/7 must-haves verified (automated), 1 item needs human confirmation
re_verification: false
human_verification:
  - test: "Aprire https://fidelityapp-six.vercel.app/dashboard/customers e verificare che la pagina carichi senza errori 500"
    expected: "Lista clienti si carica — le colonne customer_tags e card_holder_tags esistono in Supabase dopo la migration confermata dall'utente"
    why_human: "Non posso verificare lo stato live del database Supabase. La migration SQL è scritta correttamente e il summary conferma che l'utente l'ha eseguita ('migration done'), ma la presenza delle tabelle può essere confermata solo accedendo alla pagina in produzione."
  - test: "Aprire /dashboard/customers, creare un tag, aprire la scheda di un cliente, cliccare il tag — verificare che si aggiunga e rimuova senza errori"
    expected: "PROF-01 e PROF-02: toggle tag funziona, i dati si persistono in card_holder_tags"
    why_human: "Il codice toggleTag() è completo e corretto, ma la conferma finale richiede che le tabelle Supabase esistano in produzione."
  - test: "Aprire /dashboard/customers, selezionare un tag come filtro — verificare che la lista si aggiorni mostrando solo i clienti con quel tag"
    expected: "PROF-03: filtro tag filtra correttamente la lista"
    why_human: "Il filtro è client-side su dati già caricati — funziona solo se card_holder_tags esiste in Supabase e i dati vengono caricati."
---

# Phase 4: Retention Tools — Verification Report

**Phase Goal:** Deliver retention tools that help merchants understand, segment, and re-engage their customer base — customer tagging/profiles, notification segmentation, and CSV export.
**Verified:** 2026-03-02T13:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Le tabelle customer_tags e card_holder_tags esistono in Supabase | ? HUMAN NEEDED | Migration SQL scritta correttamente in 03_retention_schema.sql. User ha confermato "migration done" nel summary 04-01. Non verificabile programmaticamente. |
| 2  | La tabella card_holders ha le colonne estese (contact_email, birth_date, notes, marketing_consent, acquisition_source, last_visit, total_stamps) | ? HUMAN NEEDED | ALTER TABLE statements presenti e corretti nella migration. Stesso motivo: dipende dall'esecuzione Supabase. |
| 3  | Merchant apre /dashboard/customers e vede la lista clienti senza errori 500 | ? HUMAN NEEDED | Il codice fa query su customer_tags e card_holder_tags — funziona se le tabelle esistono in Supabase. |
| 4  | Merchant clicca un tag sulla scheda cliente — il tag si aggiunge e si rimuove | VERIFIED | toggleTag() in customers/[id]/page.tsx (lines 141-164): delete su card_holder_tags quando tag attivo, insert quando non attivo. Logica completa e wired. |
| 5  | Merchant filtra la lista clienti per tag | VERIFIED | filteredCustomers (page.tsx line 306-315): `matchesTag = filterTag === 'all' \|\| c.tags.some(t => t.id === filterTag)`. Funziona su dati già caricati. |
| 6  | Merchant vede dropdown "Filtra per tag" nella pagina notifiche | VERIFIED | notifications/page.tsx lines 360-376: `{tags.length > 0 && (<div>... Filtra per tag ...)}` — conditional render on tag existence. |
| 7  | Merchant vede "X clienti riceveranno questa notifica" aggiornato live | VERIFIED | computeRecipientCount() (lines 115-172) queries customer_tags intersection. Debounced useEffect (lines 175-184). Preview block rendered (lines 393-404). |
| 8  | Il contatore mostra 0 clienti quando nessuna carta corrisponde, bottone disabilitato | VERIFIED | Send button disabled condition (line 419): `disabled={sending \|\| !message.trim() \|\| recipientCount === 0 \|\| countLoading}` |
| 9  | Merchant invia notifica con filtro tag — solo carte dei clienti con il tag vengono aggiornate | VERIFIED | handleSend() (lines 211-244): fetches taggedHolderIds from card_holder_tags then `.in('card_holder_id', taggedHolderIds)` on cards query. |
| 10 | Merchant invia notifica a tutti i clienti di un programma senza selezionare tag | VERIFIED | handleSend() with selectedTag = 'all' skips taggedHolderIds filter (line 213: `if (selectedTag !== 'all')`). Program-only filter preserved. |
| 11 | Cronologia invii mostra conteggio clienti (non carte) per ogni notifica | VERIFIED | setSentCount(recipientCount) (line 281) uses distinct card_holder_ids count. History renders `log.recipients` which comes from `recipients_count` column. |
| 12 | Merchant clicca "Esporta CSV" e il browser scarica un file .csv | VERIFIED | exportCSV() button (lines 355-361) calls exportCSV(). Browser download via Blob/URL.createObjectURL (lines 271-281). Filename: `clienti-${today}.csv`. |
| 13 | Il CSV contiene le 7 colonne corrette | VERIFIED | Header row (line 214): `['Nome', 'Email', 'Telefono', 'Programma', 'Saldo Corrente', 'Data Iscrizione', 'Tag']`. All 7 columns present. |
| 14 | Il CSV esporta solo i clienti visibili dopo i filtri attivi | VERIFIED | exportCSV() uses `filteredCustomers` (line 189, 216) which is the already-filtered array respecting searchQuery and filterTag. |
| 15 | Un cliente con 2 programmi genera 2 righe nel CSV | VERIFIED | Inner loop `for (const card of customerCards)` (lines 233-256) generates one row per card, which corresponds to one per program. |

**Score:** 12/12 automated truths verified, 3 database-existence truths need human confirmation.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/03_retention_schema.sql` | Idempotent SQL migration for customer_tags, card_holder_tags, card_holders extended columns | VERIFIED | 56 lines. CREATE TABLE IF NOT EXISTS customer_tags (line 4), CREATE TABLE IF NOT EXISTS card_holder_tags (line 14), ALTER TABLE card_holders with 7 ADD COLUMN IF NOT EXISTS (lines 21-28), RLS on both tables (lines 31-55). |
| `app/dashboard/customers/page.tsx` | Customer list with tag filter, CSV export, tag management | VERIFIED | 780 lines. exportCSV() present (line 183). filteredCustomers array (line 306). Tag filter buttons rendered (lines 405-432). "Esporta CSV" button (line 355). |
| `app/dashboard/customers/[id]/page.tsx` | Customer detail with tag toggle (add/remove) | VERIFIED | 626 lines. toggleTag() (line 141) — insert on card_holder_tags when adding, delete when removing. Tag section rendered (lines 411-437) with all tags as clickable buttons. |
| `app/dashboard/notifications/page.tsx` | Notifications page with tag dropdown, recipient count preview, tag-filtered send | VERIFIED | 507 lines. selectedTag state (line 48). computeRecipientCount() (line 115). Tag dropdown (line 360). Recipient count preview (line 393). handleSend with tag filter (lines 211-244). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/dashboard/customers/page.tsx` | `customer_tags` table | `supabase.from('customer_tags').select()` | WIRED | Line 59-64: loads tags for merchant. Line 146-153: createTag() inserts. Line 166-181: deleteTag() deletes. |
| `app/dashboard/customers/page.tsx` | `card_holder_tags` table | `supabase.from('card_holder_tags').select()` | WIRED | Lines 78-80: loads holder-tag associations. Lines 117-126: inserts tags on new customer. |
| `app/dashboard/customers/[id]/page.tsx` | `card_holder_tags` table | insert/delete | WIRED | toggleTag() (lines 141-163): `.from('card_holder_tags').delete()` and `.from('card_holder_tags').insert()`. |
| `exportCSV()` | `filteredCustomers` array | Direct array reference | WIRED | Line 189: `const holderIds = filteredCustomers.map(c => c.id)`. Line 216: `for (const customer of filteredCustomers)`. |
| `app/dashboard/notifications/page.tsx` | `customer_tags` table | `supabase.from('customer_tags').select()` | WIRED | Lines 82-87 in load(): loads tags ordered by name. |
| `app/dashboard/notifications/page.tsx` | `card_holder_tags` table | join for recipient count and send filter | WIRED | computeRecipientCount() lines 145-151; handleSend() lines 213-219. Both query card_holder_tags for tagged holder IDs. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PROF-01 | 04-01 | Merchant può aggiungere tag a un cliente dalla sua scheda | VERIFIED | toggleTag() in customers/[id]/page.tsx: when tag not in customerTags, inserts to card_holder_tags. Tag buttons rendered. |
| PROF-02 | 04-01 | Merchant può rimuovere un tag da un cliente | VERIFIED | toggleTag(): when tag in customerTags, deletes from card_holder_tags. Optimistic UI update. |
| PROF-03 | 04-01 | Merchant può filtrare lista clienti per tag | VERIFIED | filteredCustomers filter (line 312): `filterTag === 'all' \|\| c.tags.some(t => t.id === filterTag)`. Tag buttons in search bar. |
| NOTIFY-01 | 04-02 | Merchant può selezionare un tag specifico come destinatari | VERIFIED | "Filtra per tag" dropdown (lines 360-376). selectedTag state drives computeRecipientCount and handleSend filtering. |
| NOTIFY-02 | 04-02 | Merchant vede numero di clienti che riceveranno la notifica prima di inviarla | VERIFIED | Recipient count preview block (lines 393-404): "X clienti riceveranno questa notifica". computeRecipientCount() debounced on filter change. |
| NOTIFY-03 | 04-02 | Merchant può inviare notifica a tutti i clienti di un programma specifico | VERIFIED | handleSend() with selectedTag = 'all' (default): skips tag filter, uses program filter only. Program dropdown still independent. |
| EXPORT-01 | 04-03 | Merchant può scaricare CSV con lista clienti dalla pagina /dashboard/customers | VERIFIED | exportCSV() function complete. Button rendered. 7 columns. Respects filters. One row per customer+program. UTF-8 BOM for Excel. |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps exactly PROF-01, PROF-02, PROF-03, NOTIFY-01, NOTIFY-02, NOTIFY-03, EXPORT-01 to Phase 4. No orphaned requirements — all 7 requirement IDs are claimed by plans and have implementation evidence.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/dashboard/customers/[id]/page.tsx` | 112 | `console.log('Programmi caricati:', programsData)` | Info | Debug log left from development. Clutters browser console in production but does not affect functionality. |

No stubs, no placeholders, no empty return values. All implementations are substantive.

### Human Verification Required

#### 1. Supabase Database State

**Test:** Open Supabase Dashboard → Table Editor. Confirm existence of `customer_tags` table and `card_holder_tags` table. Click on `card_holders` table and confirm these columns exist: `contact_email`, `birth_date`, `notes`, `marketing_consent`, `acquisition_source`, `last_visit`, `total_stamps`.

**Expected:** All tables and columns present, migration was applied successfully.

**Why human:** The SQL migration file at `supabase/migrations/03_retention_schema.sql` is syntactically correct and the 04-01-SUMMARY.md records the user confirmed "migration done". But the actual Supabase database state cannot be queried from the codebase — only a human with dashboard access can confirm.

#### 2. Customer Tagging End-to-End

**Test:** Open https://fidelityapp-six.vercel.app/dashboard/customers. If no tags exist, click "Gestisci Tag" and create a tag (e.g., "VIP"). Open a customer's detail page. Click the "VIP" tag — it should highlight. Reload the page — the tag should still be active. Click it again — it should deactivate.

**Expected:** PROF-01 and PROF-02 working: tags persist in Supabase across page loads.

**Why human:** Persistence requires the Supabase database to have the `card_holder_tags` table. The code is correct but DB existence cannot be verified programmatically.

#### 3. Customer List Filter by Tag

**Test:** In /dashboard/customers, with at least one tagged customer: click a tag filter button. Only customers with that tag should appear. The filtered count label below the search bar should update (e.g., "2 clienti (filtrati)").

**Expected:** PROF-03 working as specified.

**Why human:** Filter works on data loaded from Supabase — requires the tables to exist.

### Gaps Summary

No blocking gaps found in the implementation code. All artifacts are substantive, complete, and wired. The 3 human verification items are conditional on the Supabase migration having been applied — per the 04-01-SUMMARY.md the user confirmed execution ("migration done"), so this is expected to pass. Status is `human_needed` rather than `passed` solely because the live database state cannot be verified from source files.

**One minor cleanup item (non-blocking):** `console.log` debug line at `app/dashboard/customers/[id]/page.tsx:112` should be removed before a production audit.

---

_Verified: 2026-03-02T13:30:00Z_
_Verifier: Claude (gsd-verifier)_
