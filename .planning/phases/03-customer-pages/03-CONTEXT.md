# Phase 3: Customer Pages - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign `/join/[programId]` (enrollment page) and `/c/[token]` (customer card page) so customers understand the program value before signing up and can read their card status at a glance — without explanation from the merchant. Creating loyalty programs, processing stamps/points, and sending notifications are out of scope.

</domain>

<decisions>
## Implementation Decisions

### /join — Value display above the form
- Show program rewards **before** the signup form, not just a one-line benefit pill
- For `stamps`: query the `rewards` table and list all intermediate rewards (e.g. "5 bollini → Caffè Gratis", "10 bollini → Colazione")
- For `points`: show the points-per-euro rate and the reward threshold (e.g. "€1 = 1 punto · 100 punti → Premio")
- For `cashback`: show the cashback percentage and minimum redeem amount prominently (e.g. "5% cashback · riscatti da €5")
- For `tiers`: list the tier levels with spend thresholds and discounts (e.g. "Silver da €50 · Gold da €150")
- For `subscription`: show price, period, and daily limit (e.g. "€9.99/mese · 1 utilizzo al giorno")
- The benefit preview section sits **between the branded header and the form**, not inside the form

### /join — Form fields
- Keep existing fields: Nome e Cognome (required), Email (optional), Telefono (optional)
- No new fields — the current data collection is appropriate

### /join — Success state
- After enrollment, automatically redirect to `/c/[token]` after 2–3 seconds
- Keep "Vai alla tua Carta" button for users who don't wait

### /c/[token] — Google Wallet CTA placement
- Move "Aggiungi a Google Wallet" button to the **top of the card body**, immediately below the colored header, before any program stats
- The button should be the first interactive element the customer sees when they open the page
- If the card is already in the wallet, the button can remain (Google handles duplicates gracefully)

### /c/[token] — Progress messaging
- Display a prominent "ancora X al prossimo premio" label below the CTA for all program types:
  - `stamps`: "Ancora 3 bollini al Caffè Gratis" (next intermediate reward from `rewards` table, or final prize)
  - `points`: "Ancora 40 punti al premio"
  - `cashback`: "Ancora €2.50 per riscattare" (when below minimum) or "Pronto per riscattare!" (when above)
  - `tiers`: "Ancora €30.00 per Silver" (next tier) or "Livello massimo raggiunto" (if at top)
  - `subscription`: Show "Abbonamento Attivo" / "Abbonamento Scaduto" badge — no countdown needed
- This message appears **between the Wallet CTA and the program detail section**

### /c/[token] — Per-type visual identity
- Each program type has a distinct primary KPI block at the top of the card content:
  - `stamps`: Large grid of stamp circles (filled/empty) — keep existing 5-col grid, but limit grid to max 10 and show paging or count for larger programs
  - `points`: Big numeric balance (e.g. "142 punti") in primary color — already exists, keep prominent
  - `cashback`: Big euro amount (e.g. "€3.50") in primary color + green "Pronto!" badge when redeemable
  - `tiers`: Current tier badge emoji + tier name large, spend bar below
  - `subscription`: Bold green/red status badge (ATTIVO / SCADUTO) as primary visual — daily usage counter secondary

### Claude's Discretion
- Exact spacing, padding, and font sizes within each program type section
- Whether to add a subtle shimmer/animation to the "Wallet CTA" button
- How to handle the stamps grid for programs with >15 stamps_required (compact rows vs. count display)
- Loading skeleton design for initial page load on `/join`

</decisions>

<specifics>
## Specific Ideas

- The colored header + white card overlap pattern (used in current `/join` and `/c/[token]`) is working well — keep it
- Success criteria explicitly call out that the Wallet button must be "sopra il fold" — treat this as a hard constraint, not a suggestion
- The intermediate rewards list on `/join` is the main conversion hook: customers need to see the specific prize they're working toward before they hand over their name

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `program.primary_color`: Applied correctly in both pages — branded header background + button colors + progress bars
- Header-overlap pattern: `div[style={backgroundColor: primaryColor}] p-6 pb-20` + `div -mt-12` — reuse exactly
- `TYPE_ICONS` and `TYPE_LABELS` records: already defined in `/join/page.tsx` — reuse in redesign
- `benefitText()` function in `/join`: used as basis but needs to be expanded into a full reward preview section
- Progress bar pattern: `bg-gray-200 rounded-full h-3` + inner `div` with `backgroundColor: program.primary_color` — keep consistent
- `rounded-2xl shadow-xl` card wrapper — established as the card container pattern

### Established Patterns
- Supabase client: `createClient()` from `@/lib/supabase` for all public customer pages (anon key)
- All 5 program types already handled in both pages — no new program types needed
- `rewards` table available at `program_id` — currently NOT queried in either `/join` or `/c/[token]`; needs to be added
- 5-second polling interval in `/c/[token]` — keep for real-time stamp updates
- QR code via `qrcode` library — keep existing implementation, position stays at bottom

### Integration Points
- `/join` creates `card_holder` + `card` records, then links to `/c/[scan_token]` — no changes to this flow
- `/c/[token]` → `/api/wallet` → Google Wallet save — no changes to the API
- `rewards` table must be queried separately (nested queries don't work in anon client — see CLAUDE.md)

</code_context>

<deferred>
## Deferred Ideas

- None raised during discussion — session proceeded from codebase analysis and success criteria

</deferred>

---

*Phase: 03-customer-pages*
*Context gathered: 2026-03-02*
