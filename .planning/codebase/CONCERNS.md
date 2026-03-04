# Codebase Concerns

**Analysis Date:** 2026-03-04

---

## Tech Debt

**Pervasive `any` typing across core UI and API routes:**
- Issue: Core pages and the critical stamp scanner use untyped `any` throughout. The `CardData` type in `app/stamp/page.tsx` (lines 11–14) explicitly declares `card`, `program`, and `customer` as `any`. The customer card page `app/c/[token]/page.tsx` uses `(card as any)` and `(program as any)` on more than 20 lines to access columns that actually exist in `lib/types.ts`.
- Files: `app/stamp/page.tsx`, `app/c/[token]/page.tsx`, `app/dashboard/programs/[id]/page.tsx`, `app/api/wallet/route.ts`, `app/api/wallet-update/route.ts`
- Impact: TypeScript provides no type safety for DB field access. Column renames or schema changes silently break at runtime. This is especially risky on the merchant-facing stamp scanner, which is the most-used path.
- Fix approach: Extend `lib/types.ts` `Program` and `Card` types with all missing columns (`points_per_euro`, `cashback_percent`, `subscription_price`, `subscription_period`, `daily_limit`, `min_cashback_redeem`, `points_balance`, `cashback_balance`, `total_spent`, `current_tier`, `subscription_status`, `subscription_end`, `daily_uses`), then remove all `as any` casts.

**`lib/types.ts` Merchant type is stale:**
- Issue: `lib/types.ts` `Merchant` type (lines 5–16) still refers to `subscription_tier`/`subscription_status` fields using an old schema (values `'free' | 'starter' | 'pro' | 'enterprise'`). The actual DB schema and all runtime code use `plan: 'FREE' | 'PRO' | 'BUSINESS'` with Stripe fields (`stripe_customer_id`, `stripe_subscription_id`, etc.) plus WhatsApp/AI chatbot columns.
- Files: `lib/types.ts`
- Impact: The `Merchant` type is effectively unused in dashboard pages which fall back to `any` (e.g., `app/dashboard/settings/page.tsx` line 10–11 uses `useState<any>(null)` for both profile and merchant). Any code that tries to use the type gets stale field names.
- Fix approach: Rewrite `Merchant` type to match the CLAUDE.md schema exactly, including all Stripe, SendApp, and AI chatbot fields. Then use it in dashboard settings and billing pages.

**`card_missions` table queried but not defined:**
- Issue: `app/api/wallet/route.ts` (lines 85–99) and `app/api/wallet-update/route.ts` (lines 82–96) query a `card_missions` table for a `'missions'` program type. This table is not in CLAUDE.md schema, not in any SQL migration, and `missions` is not a selectable program type in the UI wizard.
- Files: `app/api/wallet/route.ts`, `app/api/wallet-update/route.ts`, `lib/google-wallet.ts`, `app/stamp/page.tsx` (line 845), `app/dashboard/programs/[id]/edit/page.tsx` (line 34)
- Impact: Silently returns null counts for any card in a missions program. The program type surfaces in edit UI even though it is non-functional.
- Fix approach: Either implement the `card_missions` table and missions CRUD, or remove all `missions` references until the feature is built.

**`reward_text` field referenced but not in schema:**
- Issue: Multiple files fall back to `program.reward_text` (e.g., `app/stamp/page.tsx` lines 624, 669, 688; `app/c/[token]/page.tsx` lines 392, 438; `app/api/wallet/route.ts` line 118). The DB schema column is `reward_description` only.
- Files: `app/stamp/page.tsx`, `app/c/[token]/page.tsx`, `app/api/wallet/route.ts`, `app/api/wallet-update/route.ts`
- Impact: The fallback `|| program.reward_text` always evaluates as empty string/undefined in production. No user-visible bug today because `reward_description` is usually populated, but it creates confusion and dead code.
- Fix approach: Remove all references to `reward_text` and rely solely on `reward_description`.

**Promo code hardcoded in source:**
- Issue: `app/api/promo-code/route.ts` (line 4) hardcodes valid promo codes directly in the source: `const VALID_CODES: Record<string, { months: number }> = { BETA2026: { months: 12 } }`.
- Files: `app/api/promo-code/route.ts`
- Impact: The promo code `BETA2026` is committed to the git history and visible to anyone with repo access. There is no expiry or per-merchant limit — any user can apply it repeatedly (the existing check only prevents reuse if `plan_expires_at` is in the future with `plan === 'business'`). This bypasses all Stripe billing.
- Fix approach: Move promo codes to a DB table or environment variable. Add per-code use-count limit. Rate limit this endpoint.

---

## Security Considerations

**`/api/whatsapp/automated` has no authentication:**
- Risk: This endpoint accepts `merchantId`, `triggerType`, `phone`, and `variables` in the request body and sends WhatsApp messages on behalf of any merchant. It is called client-side from `app/join/[programId]/page.tsx` and `app/stamp/page.tsx` as fire-and-forget, but the endpoint itself has zero authentication — no bearer token, no session check, no INTERNAL_API_SECRET check.
- Files: `app/api/whatsapp/automated/route.ts`
- Current mitigation: None. Any external caller can spam any merchant's WhatsApp instance by supplying a valid `merchantId`.
- Recommendations: Add `INTERNAL_API_SECRET` check (same pattern used in `app/api/wallet/route.ts` lines 13–17), or validate the caller is from the same origin, or sign the request from the server side.

**`/api/webhooks/dispatch` has no authentication:**
- Risk: This endpoint (called client-side from `app/join/[programId]/page.tsx`) accepts `merchantId`, `event`, and `data` and enriches and dispatches HMAC-signed webhooks including PII (card holder email, phone, birth date, marketing consent). No authentication is checked.
- Files: `app/api/webhooks/dispatch/route.ts`
- Current mitigation: The endpoint is called from client-side pages, so any external actor can trigger webhook deliveries with arbitrary `merchantId` and `event` values, causing the server to fetch real customer PII from DB and send it to configured webhook URLs.
- Recommendations: Move webhook dispatch to a server action or add INTERNAL_API_SECRET guard. At minimum validate that the `merchantId` in the request matches the authenticated session.

**`NEXT_PUBLIC_INTERNAL_API_SECRET` exposed in browser bundle:**
- Risk: `app/stamp/page.tsx` (line 118) and `app/c/[token]/page.tsx` (line 136) use `process.env.NEXT_PUBLIC_INTERNAL_API_SECRET` as a bearer token to call `/api/wallet-update`. Because the variable is prefixed `NEXT_PUBLIC_`, it is embedded in the JavaScript bundle shipped to every browser. Any user opening DevTools can read this secret.
- Files: `app/stamp/page.tsx`, `app/c/[token]/page.tsx`, `app/api/wallet/route.ts`
- Current mitigation: The `/api/wallet` route checks `process.env.INTERNAL_API_SECRET` (no `NEXT_PUBLIC_` prefix), but the secret being sent is the `NEXT_PUBLIC_` variant — meaning whoever set up the environment needs both to match.
- Recommendations: Wallet updates from the client should use the authenticated Supabase session (the user is already authenticated on the stamp page) rather than a shared secret. Remove the `INTERNAL_API_SECRET` check from `/api/wallet` and instead verify the merchant session.

**AI API keys stored in plaintext in the `merchants` DB table:**
- Risk: Merchants save their OpenAI or Anthropic API keys directly into the `merchants.ai_api_key` column (TEXT). They are fetched client-side via Supabase anon key in `app/dashboard/settings/whatsapp-ai/page.tsx` (line 60) using `select('ai_chatbot_enabled, ai_provider, ai_api_key, ai_system_prompt')`.
- Files: `app/dashboard/settings/whatsapp-ai/page.tsx`, `app/api/whatsapp/incoming/route.ts`
- Current mitigation: Supabase RLS should restrict reads to the owning merchant, but there is no encryption at rest beyond what Supabase/PostgreSQL provides.
- Recommendations: Mask the key in the UI (show only last 4 chars after load). Consider storing in a secrets manager or encrypted column rather than plain TEXT.

**`/api/send-notification` has no auth guard:**
- Risk: `app/api/send-notification/route.ts` accepts `{ cardId, message, header }` and pushes a Google Wallet notification to any card. The route validates the card exists but does not verify the caller is the merchant who owns that card.
- Files: `app/api/send-notification/route.ts`
- Current mitigation: None — any caller with a valid card UUID can push arbitrary notification content to that card.
- Recommendations: Add merchant session check: look up the card's `merchant_id` and confirm it matches the authenticated user's merchant.

**WhatsApp incoming webhook has no signature verification:**
- Risk: `/api/whatsapp/incoming` (the public SendApp webhook) accepts any POST. It does verify the incoming `instance_id` maps to a real merchant (preventing cross-merchant spoofing), but does not verify that the payload was actually signed by SendApp.
- Files: `app/api/whatsapp/incoming/route.ts`
- Current mitigation: Instance-ID-based lookup provides some protection, but a brute-force of valid instance IDs allows sending arbitrary messages on behalf of that merchant.
- Recommendations: Verify SendApp HMAC signature if the platform provides one.

---

## Performance Bottlenecks

**Birthday cron loads ALL card_holders into memory:**
- Problem: `app/api/cron/birthday/route.ts` (lines 25–28) fetches every `card_holder` with a `birth_date` from the entire platform with no pagination or limit, then filters in JavaScript.
- Files: `app/api/cron/birthday/route.ts`
- Cause: Comment in code says "safer than Postgres EXTRACT via SDK" — but as the platform grows this will load tens of thousands of rows per cron run.
- Improvement path: Use a Postgres-level date filter. Supabase SDK supports `.filter()` with raw SQL expressions. Alternatively, use a Trigger.dev job (already a dependency) with pagination.

**WhatsApp bulk send is a synchronous serial loop on a serverless function:**
- Problem: `app/api/whatsapp/bulk/route.ts` sends messages one-by-one with a 500ms sleep between each. For 200 recipients, this means the request takes ~100 seconds, well beyond Vercel's 10-second serverless default timeout (configurable but still limited).
- Files: `app/api/whatsapp/bulk/route.ts`
- Cause: Sequential loop with `await sleep(500)` (lines 215–216) per recipient. Also logs a DB row per message within the same loop.
- Improvement path: Offload bulk sends to a Trigger.dev background job (already installed as `@trigger.dev/sdk`). The UI can poll for progress.

**Dashboard makes N+1 queries per program in analytics:**
- Problem: `app/dashboard/analytics/page.tsx` loads all programs, then for each program fetches cards count, transactions, etc. in separate sequential queries in a `for` loop.
- Files: `app/dashboard/analytics/page.tsx`
- Cause: No query batching or parallel fetching for per-program stats.
- Improvement path: Batch with `Promise.all()` or use a single aggregation query grouped by `program_id`.

**`usePlan()` hook fires 2 sequential DB queries on every dashboard page mount:**
- Problem: `lib/hooks/usePlan.ts` makes two sequential Supabase calls (get user → get profile → get merchant plan) on mount. This hook is imported by nearly every dashboard page and the Sidebar, potentially causing multiple redundant fetches per page load.
- Files: `lib/hooks/usePlan.ts`, `components/dashboard/Sidebar.tsx`, multiple dashboard pages
- Cause: No context/cache sharing between hook instances.
- Improvement path: Lift plan into a React Context provider in `app/dashboard/layout.tsx` so it is fetched once and shared.

---

## Fragile Areas

**Stamp scanner (`app/stamp/page.tsx`) does all DB writes client-side:**
- Files: `app/stamp/page.tsx`
- Why fragile: The stamp add logic (adding stamps, creating `stamp_transactions`, triggering wallet update, WhatsApp automation, webhook dispatch) all runs in client-side async functions with Supabase anon key. If the network drops mid-sequence, partial state is written (stamp incremented but transaction not logged, or wallet not updated). The `idempotency_key` on `stamp_transactions` prevents duplicate transactions but does not prevent partial failures.
- Safe modification: Any change to stamp/redeem logic must test all 5 program types (stamps, points, cashback, tiers, subscription) individually. The function `addStamp` does not filter `deleted_at` — if a card is soft-deleted it can still be stamped.
- Test coverage: No automated tests exist for this file.

**`/api/wallet-image` (Edge Runtime) silently returns 204 for cashback/tiers/subscription:**
- Files: `app/api/wallet-image/route.tsx` (lines 37–39)
- Why fragile: The early return `new Response('Not needed', { status: 204 })` is present for any program type that is not `stamps` or `points`. However, `generateTiersLayout` and `generateSubscriptionLayout` are defined in the same file and then unreachable from the main switch (lines 50–57 load tiers data but the guard at line 37 exits before reaching the switch). The dead code creates confusion.
- Safe modification: Verify that Google Wallet does not call the hero image URL for those program types before removing the dead code, or enable the switch for all types.

**Soft delete is inconsistently applied to `cards`:**
- Files: `app/stamp/page.tsx`, `app/c/[token]/page.tsx`, `app/dashboard/cards/page.tsx`
- Why fragile: `deleted_at` exists on the `cards` table and is used in `app/api/whatsapp/incoming/route.ts` (line 126) and `app/api/whatsapp/bulk/route.ts` (line 100). However, the stamp scanner `processCode()` function does not filter `.is('deleted_at', null)`, meaning deleted cards can still be scanned and stamped. The public card page `/c/[token]` also does not filter deleted cards.
- Safe modification: Add `.is('deleted_at', null)` to card lookups in `app/stamp/page.tsx` (line 150–188) and `app/c/[token]/page.tsx` (line 41–45).

**Duplicate stamp_count / current_stamps columns require dual-write:**
- Files: `app/stamp/page.tsx`, `app/api/wallet/route.ts`, `app/api/wallet-update/route.ts`, `app/c/[token]/page.tsx`
- Why fragile: Both `stamp_count` and `current_stamps` exist on the `cards` table (per CLAUDE.md) and are kept in sync by every write path. The stamp scanner writes both on every update (line 238–240). Any code path that writes only one column will desync the two values, causing incorrect display on the public card page and in the wallet.
- Safe modification: All writes to stamp count must always set both `current_stamps` and `stamp_count`. The safe long-term fix is to migrate fully to `current_stamps` and drop `stamp_count` with a migration.

---

## Known Bugs

**Deleted cards can still be scanned and stamped:**
- Symptoms: A card that has been soft-deleted via `app/dashboard/cards/[id]/page.tsx` (sets `deleted_at`) can still be scanned by a merchant on `/stamp`. The QR token remains valid and the card lookup does not filter `deleted_at`.
- Files: `app/stamp/page.tsx` (lines 150–190), `app/c/[token]/page.tsx` (lines 41–45)
- Trigger: Merchant soft-deletes a card, then a customer tries to use their QR code.
- Workaround: None currently — the card remains accessible.

**Webhook event name mismatch (`card_creata` vs `carta_creata`):**
- Symptoms: The `ALLOWED_EVENTS` list in `app/api/webhooks/route.ts` (line 5) includes `'card_creata'` (English-Italian mix). The `triggerWebhook` calls in `app/api/wallet/route.ts` (line 163) and `app/api/webhooks/dispatch/route.ts` (line 168) use `'carta_creata'` (full Italian). The webhook dispatch `buildCartaCreataPayload` is also triggered for `carta_creata`. Endpoints registered for `card_creata` will never fire.
- Files: `app/api/webhooks/route.ts` (line 5), `lib/webhooks.ts` (type `WebhookEvent`)
- Trigger: Merchant creates a webhook endpoint for `card_creata` — it never triggers.
- Workaround: Register endpoints for `carta_creata` instead.

---

## Scaling Limits

**WhatsApp bulk send — Vercel timeout:**
- Current capacity: ~12–24 recipients within Vercel's default 10-second timeout (0.5s per message plus overhead).
- Limit: At 200 recipients (the advertised limit), the function runs for ~100 seconds and will be killed.
- Scaling path: Migrate bulk send to a Trigger.dev background job using the already-installed `@trigger.dev/sdk` package (`trigger.config.ts` and `trigger/example.ts` already exist in the repo).

**Birthday cron — in-memory filtering:**
- Current capacity: Functional with a few thousand card_holders.
- Limit: Supabase free tier has an 8MB row size limit on single-query results; this query returns all holders with birth dates platform-wide.
- Scaling path: Move filtering to DB with a date-based WHERE clause.

---

## Dependencies at Risk

**`@trigger.dev/sdk` installed but not used in production:**
- Risk: `@trigger.dev/sdk ^4.4.1` and `@trigger.dev/build` are installed. A `trigger.config.ts` and `trigger/example.ts` exist but contain only the SDK example. No actual jobs are implemented. The dependency adds bundle overhead with no benefit until jobs are written.
- Impact: Wasted install size. If Trigger.dev changes its API before jobs are built, there could be a migration cost.
- Migration plan: Either implement the bulk send job and birthday cron as Trigger.dev jobs (recommended), or remove the dependency until needed.

**`canvas` package in dependencies:**
- Risk: `canvas ^3.2.1` is listed as a runtime dependency. This is a native Node.js addon that requires OS-level libraries (`libcairo`, `libpango`, etc.) at build time. The actual hero image generation uses `next/og` (Satori) which has no native dependency. Canvas is not imported anywhere in the codebase.
- Impact: Adds ~30MB to the Vercel deployment bundle and can cause build failures on platforms that don't have the Cairo library.
- Migration plan: Remove `canvas` from `package.json`.

---

## Missing Critical Features

**No server-side authorization on most API routes:**
- Problem: Many API routes that modify data (`/api/send-notification`, `/api/webhooks/dispatch`, `/api/whatsapp/automated`) have no authentication or only partial authentication. The primary auth pattern used by the app (bearer token + Supabase profile lookup) is only consistently applied in `app/api/whatsapp/bulk/route.ts` and `app/api/webhooks/route.ts`.
- Blocks: Safe multi-tenant operation. Any authenticated or unauthenticated user can trigger actions against any merchant's data if they know a card UUID or merchant UUID.

**No rate limiting on incoming WhatsApp webhook:**
- Problem: `/api/whatsapp/incoming` has no rate limiting. It makes 4–6 DB queries and one AI API call per message. A burst of incoming messages could exhaust Vercel invocations and Supabase connection pool.
- Files: `app/api/whatsapp/incoming/route.ts`

**Plan expiry enforcement is UI-only:**
- Problem: `lib/hooks/usePlan.ts` reads `merchants.plan` from the DB. There is no server-side check of `plan_expires_at` to automatically downgrade expired promo plans. A merchant whose BETA2026 promo expires keeps `plan = 'business'` in the DB until something updates it.
- Files: `lib/hooks/usePlan.ts`, `app/api/promo-code/route.ts`
- Fix approach: Add a check of `plan_expires_at` in `usePlan()` (or in a cron job) to reset `plan` to `'FREE'` when expired.

---

## Test Coverage Gaps

**No automated tests exist:**
- What's not tested: All business logic — stamp adding, reward redemption, points/cashback calculation, subscription daily-use enforcement, Google Wallet JWT generation, Stripe webhook handling, WhatsApp automation dispatch.
- Files: Entire `app/` and `lib/` directory.
- Risk: Any refactor or dependency update can silently break core flows. The stamp scanner has 5 different code paths (one per program type) none of which are tested.
- Priority: High

**Stamp idempotency is implemented but not tested:**
- What's not tested: The `idempotency_key` field on `stamp_transactions` is set but there is no DB unique constraint or test verifying that duplicate scans are rejected.
- Files: `app/stamp/page.tsx` (line 255), `app/dashboard/programs/[id]/page.tsx`
- Risk: A double-tap on the scan screen could insert two transactions if the key check is not enforced at the DB level.
- Priority: High

---

*Concerns audit: 2026-03-04*
