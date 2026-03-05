# Codebase Concerns

**Analysis Date:** 2026-03-05

---

## Tech Debt

**Pervasive `any` typing across core UI and API routes:**
- Issue: Core pages and the critical stamp scanner use untyped `any` throughout. The `CardData` type in `app/stamp/page.tsx` (lines 11–14) explicitly declares `card`, `program`, and `customer` as `any`. The customer card page `app/c/[token]/page.tsx` uses `(card as any)` and `(program as any)` on more than 20 lines to access columns that actually exist in `lib/types.ts`.
- Files: `app/stamp/page.tsx`, `app/c/[token]/page.tsx`, `app/dashboard/programs/[id]/page.tsx`, `app/api/wallet/route.ts`, `app/api/wallet-update/route.ts`, `app/api/whatsapp/incoming/route.ts`, `app/api/webhooks/dispatch/route.ts`
- Impact: TypeScript provides no type safety for DB field access. Column renames or schema changes silently break at runtime. This is especially risky on the merchant-facing stamp scanner, which is the most-used path.
- Fix approach: Extend `lib/types.ts` `Program` and `Card` types with all missing columns (`points_per_euro`, `cashback_percent`, `subscription_price`, `subscription_period`, `daily_limit`, `min_cashback_redeem`, `points_balance`, `cashback_balance`, `total_spent`, `current_tier`, `subscription_status`, `subscription_end`, `daily_uses`), then remove all `as any` casts.

**`lib/types.ts` Merchant type is stale:**
- Issue: `lib/types.ts` `Merchant` type still refers to `subscription_tier`/`subscription_status` fields using an old schema (values `'free' | 'starter' | 'pro' | 'enterprise'`). The actual DB schema and all runtime code use `plan: 'FREE' | 'PRO' | 'BUSINESS'` with Stripe fields (`stripe_customer_id`, `stripe_subscription_id`, etc.) plus WhatsApp/AI chatbot columns.
- Files: `lib/types.ts`
- Impact: The `Merchant` type is effectively unused in dashboard pages which fall back to `any`. Any code that tries to use the type gets stale field names.
- Fix approach: Rewrite `Merchant` type to match the CLAUDE.md schema exactly, including all Stripe, SendApp, and AI chatbot fields. Then use it in `app/dashboard/settings/page.tsx` and `app/dashboard/billing/page.tsx`.

**`card_missions` table queried but not defined anywhere:**
- Issue: `app/api/wallet/route.ts` (lines 85–99) and `app/api/wallet-update/route.ts` (lines 82–96) query a `card_missions` table for a `'missions'` program type. This table is not in CLAUDE.md schema, not in any SQL migration, and `missions` is not a selectable program type in the UI wizard.
- Files: `app/api/wallet/route.ts`, `app/api/wallet-update/route.ts`
- Impact: Silently returns null counts for any card in a missions program. If the table does not exist in Supabase, the queries throw errors at runtime.
- Fix approach: Either implement the `card_missions` table and missions CRUD as a future milestone, or remove all `missions` references from existing code.

**`reward_text` field referenced but not in schema:**
- Issue: Multiple files fall back to `program.reward_text` (e.g., `app/c/[token]/page.tsx` lines 392, 438; `app/api/wallet/route.ts` line 118; `app/api/wallet-update/route.ts`). The DB schema column is `reward_description` only.
- Files: `app/stamp/page.tsx`, `app/c/[token]/page.tsx`, `app/api/wallet/route.ts`, `app/api/wallet-update/route.ts`
- Impact: The `|| program.reward_text` fallback always evaluates as empty string/undefined. No visible bug today because `reward_description` is usually populated, but dead code creates confusion.
- Fix approach: Remove all references to `reward_text` and rely solely on `reward_description`.

**Promo code hardcoded in source:**
- Issue: `app/api/promo-code/route.ts` (line 4) hardcodes valid promo codes: `const VALID_CODES = { BETA2026: { months: 12 } }`. The existing guard only prevents reuse if `plan === 'business'` and `plan_expires_at` is in the future — not if `plan === 'FREE'` after expiry.
- Files: `app/api/promo-code/route.ts`
- Impact: The promo code `BETA2026` is committed to git history and visible to anyone with repo access. It bypasses Stripe billing entirely and can be applied by any user to get 12 months BUSINESS plan.
- Fix approach: Move promo codes to a DB table or environment variable. Add per-code use-count limit. Rate limit the endpoint.

**`customerEmail` passed as `customer?.email` instead of `customer?.contact_email`:**
- Issue: `app/api/wallet/route.ts` (line 151) maps `customerEmail: customer?.email`. The `card_holders` table column is `contact_email`, not `email`. This always passes `undefined`.
- Files: `app/api/wallet/route.ts`
- Impact: Customer email is never included in the Google Wallet JWT data. If it is used for display in the wallet, it appears blank.
- Fix approach: Change line 151 to `customerEmail: customer?.contact_email`.

**WhatsApp bulk send queries `phone` not `contact_phone`:**
- Issue: `app/api/whatsapp/bulk/route.ts` (line 134) queries `.select('id, full_name, phone')` on `card_holders` and filters `.not('phone', 'is', null)`. The canonical phone field added via the join form is `contact_phone`. Customers who registered via `/join/[programId]` have their phone stored in `contact_phone` only; the `phone` column may be empty for many records.
- Files: `app/api/whatsapp/bulk/route.ts`
- Impact: The bulk WhatsApp campaign silently skips all recipients who only have `contact_phone` populated but not `phone`. This reduces actual campaign reach without any error.
- Fix approach: Select and filter on `contact_phone` (or both columns with an `OR` filter, as done in `app/api/whatsapp/incoming/route.ts` lines 110–111).

---

## Security Considerations

**`/api/whatsapp/automated` has no authentication:**
- Risk: This endpoint accepts `merchantId`, `triggerType`, `phone`, and `variables` in the request body and sends WhatsApp messages on behalf of any merchant. It is called client-side from `app/join/[programId]/page.tsx` and `app/stamp/page.tsx` as fire-and-forget, but the endpoint itself has zero authentication — no bearer token, no session check, no INTERNAL_API_SECRET check.
- Files: `app/api/whatsapp/automated/route.ts`
- Current mitigation: None. Any external caller can spam any merchant's WhatsApp instance by supplying a valid `merchantId`.
- Recommendations: Add `INTERNAL_API_SECRET` check (same pattern used in `app/api/wallet/route.ts` lines 13–17), or move the call to a server action.

**`/api/webhooks/dispatch` has no authentication:**
- Risk: This endpoint (called client-side from `app/join/[programId]/page.tsx`) accepts `merchantId`, `event`, and `data` and enriches and dispatches HMAC-signed webhooks including PII (card holder email, phone, birth date, marketing consent). No authentication is checked.
- Files: `app/api/webhooks/dispatch/route.ts`
- Current mitigation: None. Any external actor can trigger webhook deliveries with arbitrary `merchantId` and `event` values, causing the server to fetch real customer PII and send it to configured webhook URLs.
- Recommendations: Move webhook dispatch to a server action or add INTERNAL_API_SECRET guard. Validate that the `merchantId` in the request matches the authenticated session.

**`NEXT_PUBLIC_INTERNAL_API_SECRET` exposed in browser bundle:**
- Risk: `app/stamp/page.tsx` (line 118) and `app/c/[token]/page.tsx` (line 136) use `process.env.NEXT_PUBLIC_INTERNAL_API_SECRET` as a bearer token to call `/api/wallet`. Because the variable is prefixed `NEXT_PUBLIC_`, it is embedded in the JavaScript bundle shipped to every browser. Any user opening DevTools can read this secret.
- Files: `app/stamp/page.tsx`, `app/c/[token]/page.tsx`, `app/api/wallet/route.ts`
- Current mitigation: The `/api/wallet` route checks `process.env.INTERNAL_API_SECRET` (no `NEXT_PUBLIC_` prefix) but the value sent is the `NEXT_PUBLIC_` variant — meaning whoever configured the environment set them equal. The secret is therefore public.
- Recommendations: Wallet link generation from authenticated pages (e.g., stamp page) should pass the Supabase session bearer token. The public card page `/c/[token]` should use a different unauthenticated flow. Remove the shared secret approach.

**AI API keys stored in plaintext in the `merchants` DB table:**
- Risk: Merchants save their OpenAI or Anthropic API keys into `merchants.ai_api_key` (TEXT column). They are fetched client-side via Supabase anon key in `app/dashboard/settings/whatsapp-ai/page.tsx` (line 60): `.select('ai_chatbot_enabled, ai_provider, ai_api_key, ai_system_prompt')`.
- Files: `app/dashboard/settings/whatsapp-ai/page.tsx`, `app/api/whatsapp/incoming/route.ts`
- Current mitigation: Supabase RLS should restrict reads to the owning merchant. No encryption at rest beyond what Supabase/PostgreSQL provides.
- Recommendations: Mask the key in the UI (show only last 4 chars after load). Consider encrypted storage or storing in a secrets vault.

**`/api/send-notification` has no auth guard:**
- Risk: `app/api/send-notification/route.ts` accepts `{ cardId, message, header }` and pushes a Google Wallet notification to any card. The route validates the card exists but does not verify the caller owns that card.
- Files: `app/api/send-notification/route.ts`
- Current mitigation: None — any caller with a valid card UUID can push arbitrary notification content to any card.
- Recommendations: Add merchant session check: verify the card's `merchant_id` matches the authenticated user's merchant.

**WhatsApp incoming webhook has no signature verification:**
- Risk: `/api/whatsapp/incoming` is a public webhook endpoint. It verifies the incoming `instance_id` maps to a real merchant, but does not verify that the payload was signed by SendApp.
- Files: `app/api/whatsapp/incoming/route.ts`
- Current mitigation: Instance-ID-based merchant lookup provides some protection against cross-merchant spoofing.
- Recommendations: Verify SendApp HMAC signature (if the platform provides one) to prevent spoofed payloads.

**Join page does not check `deleted_at` on programs:**
- Risk: `app/join/[programId]/page.tsx` fetches a program by ID without `.is('deleted_at', null)` filter (line 76–79). Soft-deleted programs remain joinable — new cards are created against them.
- Files: `app/join/[programId]/page.tsx`
- Current mitigation: None.
- Recommendations: Add `.is('deleted_at', null)` to the program lookup, and return a "Programma non disponibile" error if `is_active` is false or `deleted_at` is set.

---

## Performance Bottlenecks

**Birthday cron loads ALL card_holders into memory:**
- Problem: `app/api/cron/birthday/route.ts` (lines 25–28) fetches every `card_holder` with a `birth_date` platform-wide with no pagination or limit, then filters in JavaScript.
- Files: `app/api/cron/birthday/route.ts`
- Cause: Comment in code says "safer than Postgres EXTRACT via SDK" — but as the platform grows this will load tens of thousands of rows per cron run.
- Improvement path: Use a Postgres-level date filter via `.filter()` with raw SQL. Alternatively, use a Trigger.dev job (already a dependency) with pagination.

**WhatsApp bulk send is a synchronous serial loop on a serverless function:**
- Problem: `app/api/whatsapp/bulk/route.ts` sends messages one-by-one with a 500ms sleep between each. For 200 recipients, the request takes ~100 seconds, well beyond Vercel's 60-second max (even with `maxDuration` set).
- Files: `app/api/whatsapp/bulk/route.ts`
- Cause: Sequential loop with `await sleep(500)` per recipient plus one DB insert per message.
- Improvement path: Offload bulk sends to a Trigger.dev background job (already installed as `@trigger.dev/sdk`). The UI can poll for progress.

**Dashboard makes multiple sequential DB queries per page load:**
- Problem: `app/dashboard/page.tsx` uses `Promise.all()` for 5 parallel queries but `app/dashboard/analytics/page.tsx` makes per-program queries in sequential loops without `Promise.all()`.
- Files: `app/dashboard/analytics/page.tsx`
- Cause: No query batching or parallel fetching for per-program stats.
- Improvement path: Batch per-program queries with `Promise.all()` or use single aggregation queries grouped by `program_id`.

**`usePlan()` hook fires 2 sequential DB queries on every dashboard page mount:**
- Problem: `lib/hooks/usePlan.ts` makes two sequential Supabase calls (get user → get profile → get merchant plan) on mount. This hook is imported by nearly every dashboard page and Sidebar, potentially causing multiple redundant fetches per page load.
- Files: `lib/hooks/usePlan.ts`, `components/dashboard/Sidebar.tsx`
- Cause: No context/cache sharing between hook instances.
- Improvement path: Lift plan into a React Context provider in `app/dashboard/layout.tsx` so it is fetched once and shared across all dashboard pages.

**`SELECT *` in performance-sensitive public routes:**
- Problem: `app/c/[token]/page.tsx` (lines 43, 57, 68, 89) and `app/api/wallet-image/route.tsx` (lines 43, 53) use `.select('*')` which fetches all columns including potentially large ones. The public card page also polls every 5 seconds, amplifying the over-fetching.
- Files: `app/c/[token]/page.tsx`, `app/api/wallet-image/route.tsx`
- Improvement path: Replace `.select('*')` with explicit column lists matching the actual fields used in rendering.

---

## Fragile Areas

**Stamp scanner (`app/stamp/page.tsx`) does all DB writes client-side:**
- Files: `app/stamp/page.tsx`
- Why fragile: The stamp-add logic (incrementing stamps, creating `stamp_transactions`, triggering wallet update, WhatsApp automation, webhook dispatch) all runs in client-side async functions with Supabase anon key. If the network drops mid-sequence, partial state is written (stamp incremented but transaction not logged, or wallet not updated). The `idempotency_key` on `stamp_transactions` prevents duplicate transaction rows but does not prevent partial failures across the multi-step flow.
- Safe modification: Any change to stamp/redeem logic must test all 5 program types (stamps, points, cashback, tiers, subscription) individually. The card lookup does not filter `deleted_at` — soft-deleted cards can still be stamped.
- Test coverage: No automated tests exist.

**`/api/wallet-image` (Edge Runtime) has unreachable dead code:**
- Files: `app/api/wallet-image/route.tsx` (lines 37–39)
- Why fragile: An early return `new Response('Not needed', { status: 204 })` exits for program types other than `stamps` and `points`. However, `generateTiersLayout` and `generateSubscriptionLayout` are defined in the same file and the code loads `tiers` data before the early return. The dead code creates confusion about intended behavior.
- Safe modification: Verify whether Google Wallet calls the hero image URL for cashback/tiers/subscription types before removing the early return or the dead functions.

**Soft delete is inconsistently applied to `cards` queries:**
- Files: `app/stamp/page.tsx`, `app/c/[token]/page.tsx`, `app/join/[programId]/page.tsx`
- Why fragile: `deleted_at` is used correctly in `app/api/whatsapp/incoming/route.ts` (line 126) and `app/api/whatsapp/bulk/route.ts` (line 100). However, the stamp scanner's `processCode()` does not filter `.is('deleted_at', null)` — deleted cards can still be scanned. The public card page `/c/[token]` also does not filter deleted cards.
- Safe modification: Add `.is('deleted_at', null)` to card lookups in `app/stamp/page.tsx` and `app/c/[token]/page.tsx`.

**Duplicate `stamp_count` / `current_stamps` columns require dual-write:**
- Files: `app/stamp/page.tsx`, `app/api/wallet/route.ts`, `app/api/wallet-update/route.ts`, `app/c/[token]/page.tsx`
- Why fragile: Both `stamp_count` and `current_stamps` exist on the `cards` table and must be kept in sync by every write path. Any code path that writes only one column will desync the two values, causing incorrect display. Reads have multiple fallback chains (`card?.current_stamps ?? card?.stamp_count`) throughout.
- Safe modification: All writes must always set both columns. Long-term fix: migrate fully to `current_stamps` and drop `stamp_count` with a DB migration.

**`whatsapp_conversations.messages` is an unbounded JSONB array:**
- Files: `app/api/whatsapp/incoming/route.ts` (lines 193–235)
- Why fragile: Every incoming message appends to the `messages` JSONB column. Only the last 10 messages are used for AI context (`convMessages.slice(-10)`) but the full history is stored indefinitely. A long-running conversation with a chatbot grows the JSONB column without bound.
- Safe modification: Add a trim/rotation step when updating the conversation: keep only the last N messages (e.g. 100) in storage, not just the last 10 for AI context.

---

## Known Bugs

**Deleted cards can still be scanned and stamped:**
- Symptoms: A card soft-deleted via `app/dashboard/cards/[id]/page.tsx` (sets `deleted_at`) can still be scanned on `/stamp`. The scan token remains valid and the lookup does not filter `deleted_at`.
- Files: `app/stamp/page.tsx` (lines 145–190), `app/c/[token]/page.tsx` (lines 41–45)
- Trigger: Merchant deletes a card, then customer tries to use their QR code.
- Workaround: None currently.

**Webhook event name mismatch (`card_creata` vs `carta_creata`):**
- Symptoms: The `ALLOWED_EVENTS` list in `app/api/webhooks/route.ts` includes `'card_creata'`. The `triggerWebhook` calls in `app/api/wallet/route.ts` and `app/api/webhooks/dispatch/route.ts` use `'carta_creata'`. Endpoints registered for `card_creata` never fire.
- Files: `app/api/webhooks/route.ts`, `lib/webhooks.ts`
- Trigger: Merchant creates a webhook endpoint for `card_creata` — it never triggers.
- Workaround: Register for `carta_creata` instead.

**`customerEmail` is always `undefined` in wallet JWT:**
- Symptoms: `app/api/wallet/route.ts` (line 151) maps `customerEmail: customer?.email`. The `card_holders` table column is `contact_email`. The wallet data always has `customerEmail: undefined`.
- Files: `app/api/wallet/route.ts`
- Trigger: Any card added to Google Wallet.
- Workaround: None — the JWT is generated correctly otherwise, so the wallet still works; the email field is just missing.

**WhatsApp bulk campaign silently skips many recipients:**
- Symptoms: Bulk campaign reports fewer "sent" than expected. Customers whose phone was stored in `contact_phone` (registered via `/join`) are excluded because the bulk route queries `.select('id, full_name, phone')` and filters on the `phone` column.
- Files: `app/api/whatsapp/bulk/route.ts` (line 134)
- Trigger: Any bulk WhatsApp campaign to a segment containing customers registered via `/join/[programId]`.
- Workaround: Manually ensure phone is also stored in `phone` column during join (currently it is not).

---

## Scaling Limits

**WhatsApp bulk send — Vercel timeout:**
- Current capacity: ~12–24 recipients within Vercel's default 10-second timeout (0.5s per message plus overhead). Even with `maxDuration: 60` configured, the 200-recipient limit hits ~100 seconds.
- Limit: 200 recipients (advertised limit) takes ~100 seconds. Vercel max `maxDuration` is 300s on Pro plan.
- Scaling path: Migrate bulk send to a Trigger.dev background job using the already-installed `@trigger.dev/sdk`.

**Birthday cron — in-memory filtering at scale:**
- Current capacity: Functional with a few thousand card_holders across all merchants.
- Limit: As merchants add customers, a single query returns all holders with birth dates platform-wide. Large datasets will hit query timeouts or memory limits.
- Scaling path: Move filtering to DB with a date-based WHERE clause using Postgres EXTRACT or date_trunc.

**`whatsapp_conversations` JSONB growth:**
- Current capacity: Fine for low-volume chatbot usage.
- Limit: A conversation with hundreds of messages results in a JSONB column payload fetched on every incoming message. Supabase has a practical limit on row sizes for indexed queries.
- Scaling path: Cap stored message history at a fixed number (e.g., 100), or move to a normalized `whatsapp_messages` table.

---

## Dependencies at Risk

**`@trigger.dev/sdk` installed but not used in production logic:**
- Risk: `@trigger.dev/sdk ^4.4.1` and `@trigger.dev/build` are installed. A `trigger.config.ts` and example task exist but contain only SDK scaffolding. No actual production jobs are implemented.
- Impact: Adds dependency overhead. If Trigger.dev changes its API before jobs are built, there is a migration cost.
- Migration plan: Either implement the bulk send and birthday cron as Trigger.dev jobs (recommended — addresses the performance bottlenecks above), or remove the dependency until needed.

**`canvas` package likely unused:**
- Risk: `canvas ^3.2.1` is listed as a runtime dependency. This is a native Node.js addon requiring OS-level libraries (`libcairo`, `libpango`) at build time. The hero image generation uses `next/og` (Satori) which has no native dependency. `canvas` does not appear to be imported anywhere in the source.
- Impact: Adds ~30MB to the Vercel deployment and can cause build failures on platforms without Cairo.
- Migration plan: Confirm `canvas` is unused and remove from `package.json`.

---

## Missing Critical Features

**No server-side authorization on several write API routes:**
- Problem: `/api/send-notification`, `/api/webhooks/dispatch`, `/api/whatsapp/automated` have no authentication. Any caller with a card UUID or merchant UUID can trigger actions against any merchant's data.
- Files: `app/api/send-notification/route.ts`, `app/api/webhooks/dispatch/route.ts`, `app/api/whatsapp/automated/route.ts`
- Blocks: Safe multi-tenant operation.

**No rate limiting on incoming WhatsApp webhook:**
- Problem: `/api/whatsapp/incoming` has no rate limiting. It makes 4–6 DB queries and one AI API call per message. A burst of incoming messages could exhaust Vercel invocations and Supabase connection pool.
- Files: `app/api/whatsapp/incoming/route.ts`
- Fix approach: Add request deduplication (e.g., check for duplicate `from` + `message` within a short window) or rely on Vercel's edge rate limiting.

**Plan expiry enforcement is UI-only:**
- Problem: `lib/hooks/usePlan.ts` reads `merchants.plan` from the DB. There is no server-side check of `plan_expires_at` to automatically downgrade expired promo plans. A merchant whose BETA2026 promo expires keeps `plan = 'business'` in the DB until something updates it.
- Files: `lib/hooks/usePlan.ts`, `app/api/promo-code/route.ts`
- Fix approach: Add a check of `plan_expires_at` in `usePlan()` (compare to `new Date()`) or add a scheduled cron job to reset expired plans. The `usePlan` check on the BUSINESS plan in `app/api/ocio/schedule/route.ts` does NOT check `plan_expires_at`.

**No GDPR / privacy consent collection on join form:**
- Problem: `app/join/[programId]/page.tsx` collects name, email, phone, and birth date but does not present a privacy policy checkbox or record `marketing_consent`. The `card_holders` table has a `marketing_consent` boolean column that is never set during self-registration.
- Files: `app/join/[programId]/page.tsx`
- Fix approach: Add a mandatory or optional consent checkbox to the form and pass it to the `card_holders` insert.

---

## Test Coverage Gaps

**No automated tests exist:**
- What's not tested: All business logic — stamp adding, reward redemption, points/cashback calculation, subscription daily-use enforcement, Google Wallet JWT generation, Stripe webhook handling, WhatsApp automation dispatch.
- Files: Entire `app/` and `lib/` directory.
- Risk: Any refactor or dependency update can silently break core flows. The stamp scanner has 5 different code paths (one per program type), none of which are tested.
- Priority: High

**Stamp idempotency is implemented but not enforced at DB level:**
- What's not tested: The `idempotency_key` field on `stamp_transactions` is written by `app/stamp/page.tsx` but there is no DB UNIQUE constraint visible in the codebase. There is no check before insert to reject duplicate keys.
- Files: `app/stamp/page.tsx` (lines 255, 343, 387, 443, 514, 559, 608)
- Risk: A double-tap on the scan screen in a slow network condition could insert two transaction rows if the DB-level constraint is not present.
- Priority: High

---

*Concerns audit: 2026-03-05*
