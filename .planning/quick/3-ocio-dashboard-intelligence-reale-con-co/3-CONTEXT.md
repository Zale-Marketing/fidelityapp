# Quick Task 3: OCIO Intelligence Panel — Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Task Boundary

Redesign completo di app/dashboard/ocio/page.tsx con:
- Filtro temporale globale (globalPeriod) che controlla Intelligence Panel + lista recensioni
- Intelligence Panel riscritto con ratio-based thresholds (aree di miglioramento + punti di forza)
- Confronto periodi affiancato con date picker (sezione collassabile)
- Barra di ricerca full-text su testo e autore
- Drill-down temi con banner nella lista

</domain>

<decisions>
## Implementation Decisions

### Theme drill-down UI
- Click su un tema nell'Intelligence Panel setta `themeFilter` e filtra la lista sottostante
- NON aprire modal/drawer separato — usare il banner "Stai vedendo: recensioni [negative/positive] su '[tema]' — Mostra tutte" con X per reset
- Coerente con la Parte 5 della spec

### Interazione search + themeFilter
- searchQuery e themeFilter si sommano con AND
- Le reviews mostrate devono soddisfare entrambi i filtri contemporaneamente
- Nessun reset automatico — l'utente controlla entrambi indipendentemente

### Soglie widget con pochi dati — Adattive automatiche
- Se totale recensioni nel periodo è < 20: soglia ratio abbassata a > 0.2, min recensioni a 2
- Se totale recensioni nel periodo è >= 20: soglia standard ratio > 0.3, min 3 recensioni
- Widget "Punti di forza": soglia < 0.2 (standard) o < 0.3 (adattiva) con min 5 (standard) o 3 (adattiva)

### Claude's Discretion
- Default date picker nel confronto periodi: mese corrente vs mese precedente
- Animazione chevron sezione collapsible: semplice rotate transform CSS
- Ordine filtri nella lista: globalPeriod → themeFilter → searchQuery → sentiment → rating → sort

</decisions>

<specifics>
## Specific Ideas

- `globalPeriod` state: `'30'|'90'|'180'|'365'|'all'`, default `'all'`
- `themeFilter` state: `{ theme: string; sentiment: 'positive'|'negative' } | null`, default `null`
- `searchQuery` state: `string`, default `''`
- `comparisonOpen` state: `boolean`, default `false`
- Tutte le computazioni useMemo usano `globalPeriod` come filtro base
- Il confronto periodi usa solo le reviews già caricate — zero query Supabase aggiuntive
- Non toccare: loop paginato fetch, modal dettaglio, updateReplyStatus, handleCopy, KPI cards, auth

</specifics>
