# Codebase Concerns

**Analysis Date:** 2026-03-02

---

## Tech Debt

### Dual Stamp Field on Cards Table
- Issue: Two separate columns (`current_stamps` and `stamp_count`) store the same value. Every stamp write updates both fields and every read falls back with `card.current_stamps || card.stamp_count || 0`.
- Files: `app/stamp/page.tsx` (lines 147, 171, 197), `app/c/[token]/page.tsx` (line 197), `app/api/wallet-image/route.tsx` (line 133), `app/api/wallet/route.ts` (line 104), `app/api/wallet-update/route.ts` (line 104)
- Impact: Any read that picks the wrong field silently shows the wrong stamp count. Adding new code that only updates one field breaks consistency.
- Fix approach: Migrate all data to `current_stamps`, drop `stamp_count`, remove all fallback `|| stamp_count` patterns.

### Deprecated `reward_text` Field
- Issue: The programs table has been partially migrated to `reward_description`, but `reward_text` fallbacks remain in eight places. The schema in CLAUDE.md documents only `reward_description`.
- Files: `app/stamp/page.tsx` (lines 546, 578, 593, 626, 854), `app/c/[token]/page.tsx` (lines 287, 333), `app/api/wallet/route.ts` (line 102), `app/api/wallet-update/route.ts` (line 102), `app/api/wallet-image/route.tsx` (line 135)
- Impact: If a program was created with the old field name it silently shows nothing for the reward description in some contexts.
- Fix approach: Run a one-time SQL migration to copy `reward_text` into `reward_description` where null, then remove all `|| program.reward_text` fallback expressions.

### Types File Out of Sync with Actual Schema
- Issue: `lib/types.ts` describes a different data model than what is actually deployed. `Merchant` type has `subscription_tier` and `subscription_status` fields that do not match the real `plan` / `stripe_subscription_status` columns. `CardHolder` type includes `contact_email`, `total_stamps`, `total_rewards`, `marketing_consent`, `acquisition_source` that do not appear in the running schema. `Card` type has `lifetime_stamps` and `wallet_provider` which are unused. Almost all page-level code ignores `lib/types.ts` and uses `any` casts instead.
- Files: `lib/types.ts`, `app/c/[token]/page.tsx` (imports `Card`, `Program`, `Merchant` but immediately casts to `any`)
- Impact: TypeScript provides no type safety for database interactions. Bugs caused by wrong field names are not caught at compile time.
- Fix approach: Rewrite `lib/types.ts` to exactly match the production schema as documented in CLAUDE.md. Replace all `as any` casts in pages that import these types.

### `any` Used Extensively (84 Occurrences)
- Issue: TypeScript `as any` or `: any` appears 84 times across the codebase. Almost every database result object is untyped. API route functions cast input data with `as any` before passing to `generateWalletLink`.
- Files: `app/api/wallet/route.ts` (line 135: `generateWalletLink(walletData as any)`), `app/api/wallet-update/route.ts` (line 129: `} as any)`), `app/dashboard/page.tsx` (multiple `any[]` declarations), `app/c/[token]/page.tsx` (multiple `(card as any).` casts)
- Impact: Type errors that TypeScript would normally catch at compile time pass silently. Refactoring any database field name causes runtime failures rather than build failures.
- Fix approach: Introduce properly typed Supabase query results by aligning `lib/types.ts` with real schema, then remove `as any` casts one file at a time.

### `stamp/page.tsx` is 929 Lines — Single Monolithic Component
- Issue: `app/stamp/page.tsx` contains all scanner logic, all five program-type transaction handlers (stamps, points, cashback, tiers, subscription), all Supabase mutation calls, and all render states in a single React component.
- Files: `app/stamp/page.tsx`
- Impact: Any change to one program type requires reading and carefully editing the full 929-line file. Test coverage is impossible without extracting logic from JSX. A bug in one handler (e.g., addPoints) can block the entire scanner.
- Fix approach: Extract each handler (`addStamp`, `addPoints`, `addCashback`, `addTierSpend`, `useSubscription`) into a `lib/stamp-operations.ts` module. Extract render state sections into child components.

---

## Known Bugs

### Idempotency Key Does Not Actually Prevent Duplicates
- Symptoms: A merchant who double-taps the confirm button, or has a slow connection causing a retry, receives two identical `stamp_transactions` rows for the same customer visit.
- Files: `app/stamp/page.tsx` (lines 193, 265, 309, 365, 436, 481, 530, 571, 619)
- Trigger: `idempotency_key` is built as `${card.id}-${Date.now()}`. Because `Date.now()` returns a new millisecond timestamp on each call, every submission generates a unique key, so the unique constraint on the column never fires.
- Workaround: None currently. The `processing` boolean flag prevents the submit button from being clicked twice in the same render cycle, but does not protect against network retries or fast double-taps before the state updates.
- Fix approach: Generate the idempotency key once when the scan completes (not inside each handler), store it in component state, and reuse the same key on any retry within that scan session.

### `notification_logs` Table Does Not Exist in Production
- Symptoms: The notifications history panel in `/dashboard/notifications` silently shows no history on all merchant accounts. The "send" action also silently fails to record the log entry.
- Files: `app/dashboard/notifications/page.tsx` (lines 67-80, 161-180), `BLOCCO.md` (section 2)
- Trigger: The Supabase table `notification_logs` was never created. The page queries it and receives an error which it silently swallows.
- Workaround: None. The notification message is still sent via Google Wallet update, but no audit trail is recorded.
- Fix approach: Execute the SQL from `BLOCCO.md` section 2 in the Supabase SQL editor.

### Stripe Columns Missing from `merchants` Table
- Symptoms: Stripe checkout and webhook calls attempt to update `stripe_customer_id`, `stripe_subscription_id`, `stripe_subscription_status`, and `plan_expires_at` columns. If these columns do not exist, all Stripe flows silently fail with a Supabase error that is only printed to server logs.
- Files: `app/api/stripe-webhook/route.ts` (lines 43-50, 63-69, 84-88, 101-109, 118-128), `app/api/stripe-checkout/route.ts` (line 59), `BLOCCO.md` (section 1-F)
- Trigger: The SQL migration in `BLOCCO.md` has not been applied.
- Workaround: None. Billing is fully non-functional until the migration runs.
- Fix approach: Execute the ALTER TABLE statement from `BLOCCO.md` section 1-F.

### `missions` Program Type is Listed as Creatable but Not Implemented
- Symptoms: A merchant can select "Missioni" as a program type in the creation wizard. The stamp scanner falls through to `addStamp()` as a default for this type. The wallet API queries a `card_missions` table that does not exist in the schema.
- Files: `app/dashboard/programs/new/page.tsx` (line 57), `app/api/wallet/route.ts` (lines 69-84), `app/api/wallet-update/route.ts` (lines 72-87), `app/stamp/page.tsx` (line 162)
- Trigger: Selecting "Missioni" when creating a program. Any subsequent wallet generation call for a missions-type card will throw a Supabase error querying the non-existent `card_missions` table.
- Workaround: Do not use the Missioni type. There is no enforcement in the form preventing it.
- Fix approach: Either remove "Missioni" from the program type selector in `new/page.tsx` until it is implemented, or add a `card_missions` table and implement the full flow.

---

## Security Considerations

### API Routes `/api/wallet` and `/api/wallet-update` Use Anon Key
- Risk: These two API routes are public HTTP endpoints that use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`. Any unauthenticated caller who knows a `cardId` (a UUID) can generate a signed Google Wallet JWT for any card or trigger a wallet PATCH update for any card.
- Files: `app/api/wallet/route.ts` (lines 5-8), `app/api/wallet-update/route.ts` (lines 5-8)
- Current mitigation: None. There is no session check or authorization check on either endpoint.
- Recommendations: Add caller authentication (require a valid Supabase session JWT in the Authorization header), or at minimum rate-limit the endpoint and validate that the requesting session owns or has permission to access the requested card.

### No Authorization Check on Any API Route
- Risk: All three wallet API routes (`/api/wallet`, `/api/wallet-update`, `/api/wallet-image`) perform no authentication. The Stripe routes (`/api/stripe-checkout`, `/api/stripe-portal`) accept any `merchantId` in the request body without verifying the caller is that merchant.
- Files: `app/api/wallet/route.ts`, `app/api/wallet-update/route.ts`, `app/api/wallet-image/route.tsx`, `app/api/stripe-checkout/route.ts`, `app/api/stripe-portal/route.ts`
- Current mitigation: Stripe routes do verify the Stripe webhook signature. The `/api/stripe-checkout` route accepts a `merchantId` from the request body with no verification.
- Recommendations: Add `supabase.auth.getUser()` checks in wallet routes. In Stripe checkout, derive `merchantId` from the authenticated session rather than the request body.

### `alert()` / `confirm()` Used for Security-Sensitive Actions
- Risk: Browser `confirm()` dialogs are used to authorize destructive operations (deleting customers, redeeming stamps/points/cashback worth real monetary value). These can be suppressed by browser extensions and are not accessible.
- Files: `app/stamp/page.tsx` (lines 506, 546, 593), `app/dashboard/customers/page.tsx` (line 166), `app/dashboard/customers/[id]/page.tsx` (line 206)
- Current mitigation: None.
- Recommendations: Replace `confirm()` calls with inline confirmation UI components that cannot be bypassed.

### Private Key Handled in Plain String
- Risk: `lib/google-wallet.ts` reads the Google Wallet private key directly from an environment variable and passes it as a plain string to `jwt.sign()`. No validation occurs if the key is malformed or empty beyond checking string length.
- Files: `lib/google-wallet.ts` (lines 7-20)
- Current mitigation: The `getPrivateKey()` function returns an empty string if neither env var is set, and `generateWalletLink` checks for empty string before proceeding.
- Recommendations: Low risk for the current deployment model. Would become a concern if the codebase is ever open-sourced or if error messages containing key fragments appear in logs.

---

## Performance Bottlenecks

### Customer Card Page Polls Database Every 5 Seconds
- Problem: `/c/[token]` calls `loadCard()` on a `setInterval` of 5000ms indefinitely while the page is open. For a merchant with 1000 customers who leave their card page open, this generates 12,000 Supabase reads per minute from a single page.
- Files: `app/c/[token]/page.tsx` (line 83)
- Cause: Implemented to show real-time stamp updates after a merchant scans a card. The full card, program, merchant, and tiers are re-fetched on every poll.
- Improvement path: Use Supabase Realtime subscriptions (`supabase.channel().on('postgres_changes', ...)`) instead of polling. This would replace 12,000 reads/minute with a single long-lived WebSocket connection per open tab.

### Dashboard Page Makes 6+ Sequential Database Queries
- Problem: `app/dashboard/page.tsx` `loadDashboard()` runs 5 parallel count queries, then a `stamp_transactions` fetch, then sequential queries for program names, card IDs, holder IDs, and holder names. For a merchant with significant history, the transactions fetch loads all month's records into the browser with `select('*')`.
- Files: `app/dashboard/page.tsx` (lines 68-83, 113-152, 214-258)
- Cause: No server-side aggregation. All data manipulation happens in browser JavaScript.
- Improvement path: Move the activity feed and top customers aggregation to a Supabase RPC (database function) or a dedicated API route that returns pre-aggregated data.

### Hero Image Endpoint Cannot Be Cached by Google
- Problem: `/api/wallet-image` returns `Cache-Control: no-cache, no-store, must-revalidate` with `max-age=0`. Google Wallet caches hero images aggressively on their CDN regardless. The no-cache header causes Google to make a fresh request on every card open, but the image is still served stale by Google's CDN for 1-5 minutes.
- Files: `app/api/wallet-image/route.tsx` (lines 120-126), `lib/google-wallet.ts` (line 96)
- Cause: Timestamp query param (`&t=Date.now()`) is appended to the image URL on every wallet update to bust Google's cache. This is the documented workaround, not a fixable bug.
- Improvement path: This is a known limitation of Google Wallet. Document expected delay (1-5 minutes) in merchant-facing UI. No technical fix available beyond current approach.

---

## Fragile Areas

### `app/api/wallet-image/route.tsx` — Satori/ImageResponse Rendering
- Files: `app/api/wallet-image/route.tsx` (lines 55-630)
- Why fragile: Satori (the rendering engine behind `ImageResponse`) requires `display: 'flex'` on every element with multiple children. It does not support all CSS properties. Adding text with emoji or special Unicode characters renders as empty rectangles. The tiers layout hard-codes tier name → emoji mappings (`Bronze`, `Silver`, `Gold`, `Platinum`, `Diamond`) — any merchant using custom tier names gets no emoji.
- Safe modification: Always add `display: 'flex'` to every new JSX element. Test new layouts by hitting `/api/wallet-image?cardId=<real_id>` directly in a browser before deploying. Do not use emoji characters in text nodes.
- Test coverage: None. No tests exist for image generation.

### `app/stamp/page.tsx` — Race Condition on Double Scan
- Files: `app/stamp/page.tsx` (lines 78-101, 103-168)
- Why fragile: The `onScanSuccess` callback stops the scanner then immediately calls `processCode`. If the scanner hardware fires the callback twice in rapid succession before `stopScanner()` completes, `processCode` can run in parallel for the same token, resulting in two stamp increments and two wallet update calls.
- Safe modification: Add a `scanning` ref guard that is set to `true` immediately on first scan trigger and only reset on `resetScanner()`. Check this ref at the top of `onScanSuccess` before proceeding.
- Test coverage: None.

### Google Wallet JWT Contains Entire Class Definition on Every Generation
- Files: `lib/google-wallet.ts` (lines 119-253)
- Why fragile: Every call to `generateWalletLink` embeds the full `loyaltyClass` object (program name, logo URL, colors, links) inside the JWT. Google Wallet uses the class definition embedded in the first JWT it sees for a given `classId`. If the merchant later changes their program name or adds a link, the class is already frozen in Google's system for cards already saved. The `PATCH` endpoint in `updateWalletCard` only updates the object (card-level data), not the class.
- Safe modification: This is a documented Google Wallet limitation. Do not attempt to update class-level fields (logo, program name, background color, links) after initial creation and expect existing cards to reflect the change.
- Test coverage: None. Google Wallet integration has no automated tests.

---

## Scaling Limits

### Supabase Anon Key in Two Public API Routes
- Current capacity: Supabase free tier allows 500MB DB + 50,000 monthly active users.
- Limit: The anon key used in `/api/wallet` and `/api/wallet-update` is subject to Supabase row-level security policies. If RLS is not configured to restrict those tables, any caller can read or trigger updates against any card in the database.
- Scaling path: Move to service role key with explicit authorization checks, or enforce RLS policies that restrict wallet operations to the card owner's session.

### Stamp Transactions Table Has No Pagination in Dashboard Queries
- Current capacity: Works acceptably up to ~1,000 transactions per month per merchant.
- Limit: `app/dashboard/page.tsx` fetches all transactions for the current month with no limit clause. At 10,000+ transactions/month the browser memory and render time will degrade significantly.
- Scaling path: Add `.limit(100)` to the month query and move aggregation to a database function.

---

## Dependencies at Risk

### `next` 16.1.6 with `react` 19.2.3
- Risk: Next.js 16 paired with React 19 is a very recent combination. The React 19 compiler and concurrent features interaction with the App Router is still stabilizing. Some third-party packages (notably `html5-qrcode`) may have compatibility issues with React 19's strict mode double-invocation.
- Impact: Hard-to-debug rendering inconsistencies. `html5-qrcode` initializes a DOM element directly and may conflict with React 19's hydration.
- Migration plan: Pin `html5-qrcode` version explicitly. Monitor Next.js 16 patch releases for React 19 compatibility fixes.

### `canvas` Package (3.2.1) in `dependencies`
- Risk: `canvas` is a native Node.js module (C++ addon) that requires platform-specific compilation. It is listed in `dependencies` but is not visibly used anywhere in the codebase — `@vercel/og` (`ImageResponse`) handles image generation. Native modules add significant deployment complexity on Vercel and Serverless environments.
- Impact: Build failures on Vercel if the canvas native addon cannot compile for the target architecture. Unnecessary bundle size.
- Migration plan: Audit actual usage. If not used, remove from `package.json`. Vercel's `@vercel/og` does not require the `canvas` package.

### `jsqr` Package Listed Alongside `html5-qrcode`
- Risk: Both `jsqr` and `html5-qrcode` provide QR scanning capability. Only `html5-qrcode` is actually imported in the codebase. `jsqr` is an unused dependency adding ~50KB to the bundle.
- Impact: Unnecessary dependency maintenance surface and bundle weight.
- Migration plan: Remove `jsqr` from `package.json` after confirming it has no usages.

---

## Missing Critical Features

### No Row-Level Security Verification on Public QR Pages
- Problem: `/c/[token]` loads card, program, and merchant data using the anon Supabase client with no RLS policy check documented. Any person who guesses a valid `scan_token` UUID can view another merchant's customer card data.
- Blocks: Privacy compliance (GDPR — personal data visible to anyone with the link). The scan token is 32 hex characters which provides practical security through obscurity, but not cryptographic access control.

### No Authentication on Stamp Scanner
- Problem: `/stamp` performs an auth check client-side (`checkAuth()` on mount) but this check happens after the page renders. A faster, reliable server-side middleware check does not exist.
- Files: `app/stamp/page.tsx` (lines 37-42)
- Blocks: Staff accounts cannot be meaningfully restricted from accessing other merchants' scanner if they know the URL, because the auth check is client-side and the Supabase queries filter by `merchant_id` from the profile — but there is no server-side middleware enforcing the `/dashboard` and `/stamp` routes require authentication before rendering.

### No Stripe Billing Active (Full Feature Gap)
- Problem: All Stripe API routes are written but non-functional because environment variables (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`, `STRIPE_WEBHOOK_SECRET`) are missing, and required database columns have not been migrated.
- Blocks: Revenue generation. The PRO plan cannot be purchased. The FREE plan limit enforcement exists in code but the upgrade path is broken.
- Full details: `BLOCCO.md`

---

## Test Coverage Gaps

### Zero Test Files Exist
- What's not tested: The entire codebase has no unit tests, integration tests, or end-to-end tests.
- Files: All files under `app/`, `lib/`
- Risk: Any change to stamp transaction logic, cashback calculation, tier progression, subscription daily-limit enforcement, or Google Wallet JWT generation can introduce silent regressions. The double-field stamp count issue and the broken idempotency key would both be caught by simple unit tests.
- Priority: High for `lib/google-wallet.ts` (JWT generation logic), `app/stamp/page.tsx` (transaction mutation handlers), and `app/api/wallet-image/route.tsx` (image layout rendering).

---

*Concerns audit: 2026-03-02*
