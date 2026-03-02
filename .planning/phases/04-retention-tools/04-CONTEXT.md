# Phase 4: Retention Tools - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Tag customers, send segmented notifications to filtered audiences, and export customer data as CSV. The customer tagging UI infrastructure already exists in code — this phase closes the gaps: tag-based notification targeting, recipient count preview before send, and CSV export from the customers list.

</domain>

<decisions>
## Implementation Decisions

### Notification targeting
- Keep existing program dropdown ("Programma destinatario" — all / specific program)
- Add second independent dropdown: "Filtra per tag" with default "Tutti i tag"
- Audience = intersection: customers who have the selected tag AND a card in the selected program
- Tag = "Tutti i tag" + program = specific → same as current behavior (all cards in that program)
- Tag = specific + program = "Tutti i programmi" → all cards of tagged customers across every program
- Merchants cannot create new tags from the notifications page — only from the customers section

### Recipient count preview
- Show "X clienti" count (not "X carte") that updates live as filters change
- Count shown above the "Invia Notifica" button, replacing the current post-send confirmation area
- Send button disabled when count = 0
- Notification history log (cronologia) continues to show recipient count per entry

### CSV export
- One row per customer+programma combination (a customer with 2 programs = 2 rows)
- Columns: nome, email, telefono, programma, saldo corrente, data iscrizione, tag
- Export respects active filters (text search + tag filter) — exports filtered view, not full list
- Browser-side generation only — direct download via client, no server API endpoint needed
- Export button placed on the `/dashboard/customers` page

### Claude's Discretion
- Exact CSV filename format (e.g., `clienti-2026-03-02.csv`)
- Saldo corrente field logic (show stamp_count for stamps programs, points_balance for points, cashback_balance for cashback, current_tier for tiers, subscription_status for subscriptions)
- Loading/computing state for recipient count (debounce interval)
- SQL migrations needed for customer_tags, card_holder_tags, and extra card_holders columns if not yet created in Supabase

</decisions>

<specifics>
## Specific Ideas

- Recipient count label: "X clienti riceveranno questa notifica" — shown above the send button
- Tag dropdown on notifications page mirrors the visual style already used on the customers list filter (colored pill buttons or standard `<select>`)
- CSV "tag" column: comma-separated list of tag names for that customer (e.g., "VIP, Abituale")

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/dashboard/customers/page.tsx`: already has tag filter logic (`filterTag` state, `filteredCustomers` computed from tag + search), tag pill filter buttons, and customer list state — CSV export can reuse `filteredCustomers` directly
- `app/dashboard/customers/[id]/page.tsx`: `toggleTag()` fully implemented with `card_holder_tags` insert/delete — PROF-01/02 are already coded
- `app/dashboard/notifications/page.tsx`: existing program dropdown + batch wallet update loop — tag dropdown slots in alongside existing `selectedProgram` state
- `lib/types.ts`: `CustomerTag` type already defined, `CardHolder` type already has `tags?: CustomerTag[]`

### Established Patterns
- Supabase client: `createClient()` from `@/lib/supabase` for client-side pages
- Auth pattern: `getUser()` → redirect to `/login` → fetch `merchant_id` from `profiles`
- State for loading: `useState(true)` spinner with `animate-spin w-8 h-8 border-4 border-indigo-600`
- Notification send: batch of 10 wallet updates via `Promise.allSettled`, then insert to `notification_logs`
- Tag visuals: `backgroundColor: tag.color + '20'`, `color: tag.color` inline style pattern

### Integration Points
- `customer_tags` table: queried in customers/page.tsx and customers/[id]/page.tsx — must exist in Supabase
- `card_holder_tags` junction table: queried in both customer pages — must exist in Supabase
- `card_holders` table: code references `contact_email`, `birth_date`, `notes`, `marketing_consent`, `acquisition_source`, `last_visit`, `total_stamps` — these columns may need SQL migration if not yet added
- Notification count query: needs to join `card_holder_tags` → `card_holders` → `cards` filtered by program_id to compute "X clienti" live

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-retention-tools*
*Context gathered: 2026-03-02*
