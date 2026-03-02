# Architecture

**Analysis Date:** 2026-03-02

## Pattern Overview

**Overall:** Full-stack Next.js monolith with App Router (no separate backend server)

**Key Characteristics:**
- All pages and API routes co-located in `app/` directory using Next.js App Router conventions
- No middleware layer or dedicated server — API routes in `app/api/` act as the backend
- Two distinct user surfaces: **merchant dashboard** (authenticated) and **customer-facing public pages** (unauthenticated)
- External integrations (Google Wallet, Stripe) are encapsulated in `lib/` and called from API routes
- Database access pattern: client-side pages call Supabase directly via browser client; API routes use service-role client for privileged operations
- One Edge Runtime route (`app/api/wallet-image/route.tsx`) for low-latency image generation; all other routes use Node.js runtime

## Layers

**Public Landing & Auth:**
- Purpose: Marketing homepage, merchant login/register, onboarding wizard
- Location: `app/page.tsx`, `app/login/page.tsx`, `app/register/page.tsx`, `app/onboarding/page.tsx`
- Contains: Client components with Supabase auth calls
- Depends on: `lib/supabase.ts`
- Used by: New and returning merchants

**Merchant Dashboard (Protected):**
- Purpose: Merchant management UI — programs, customers, analytics, billing, notifications, settings
- Location: `app/dashboard/`
- Contains: All `'use client'` pages; auth gate via `supabase.auth.getUser()` at component mount
- Depends on: `lib/supabase.ts` (browser client), Next.js navigation
- Used by: Authenticated merchants

**Customer-Facing Public Pages:**
- Purpose: Card display for end customers (no merchant auth required), program enrollment, QR scanner for merchants
- Location: `app/c/[token]/page.tsx`, `app/join/[programId]/page.tsx`, `app/stamp/page.tsx`
- Contains: `'use client'` pages; `app/c/[token]` polls Supabase every 5 seconds for live updates
- Depends on: `lib/supabase.ts` (browser client with anon key)
- Used by: End customers (card holders)

**API Routes (Server-Side Business Logic):**
- Purpose: All server-side operations requiring service-role DB access or external API calls
- Location: `app/api/`
- Contains: Next.js Route Handlers (`route.ts` / `route.tsx`)
- Depends on: `lib/google-wallet.ts`, Stripe SDK, Supabase service-role client
- Used by: Frontend pages via `fetch()`

**Shared Library:**
- Purpose: Reusable clients, business logic, and type definitions
- Location: `lib/`
- Contains: Supabase browser client factory, Google Wallet JWT generation + PATCH update, shared TypeScript types
- Depends on: External SDKs (`jsonwebtoken`, `google-auth-library`, `@supabase/ssr`)
- Used by: Pages (browser client), API routes (wallet functions)

## Data Flow

**Customer Card Enrollment (Self-Service):**

1. Customer visits `app/join/[programId]/page.tsx`
2. Page loads program + merchant from Supabase (anon key)
3. Customer submits name/email/phone form
4. Page checks for existing `card_holder` by email; creates new if not found
5. Page inserts new row into `cards` with a `crypto.randomUUID()` scan token
6. Customer is redirected to `/c/{scan_token}`

**Stamp/Points Transaction (Merchant Scans QR):**

1. Merchant opens `app/stamp/page.tsx`; auth checked via `supabase.auth.getUser()`
2. `Html5Qrcode` library scans QR code; decoded text is a `scan_token` or URL containing one
3. Page looks up card by `scan_token` filtered to merchant's `merchant_id` (prevents cross-merchant access)
4. Based on `program.program_type`, page directly updates `cards` table and inserts into `stamp_transactions`
5. Page calls `POST /api/wallet-update` with `cardId` to trigger Google Wallet PATCH update
6. `/api/wallet-update` calls `updateWalletCard()` from `lib/google-wallet.ts`, which PATCHes the hero image URL (with fresh timestamp for cache-busting)

**Google Wallet Card Creation:**

1. Customer clicks "Aggiungi a Google Wallet" on `app/c/[token]/page.tsx`
2. Page calls `POST /api/wallet` with `cardId`
3. `app/api/wallet/route.ts` loads card + program + merchant + card_holder from Supabase
4. Calls `generateWalletLink()` from `lib/google-wallet.ts`
5. `generateWalletLink()` builds a `loyaltyClass` + `loyaltyObject` payload and signs a JWT with the service account private key
6. Hero image URL points to `GET /api/wallet-image?cardId=...&t={timestamp}` (Edge Runtime)
7. Returns `https://pay.google.com/gp/v/save/{JWT}` — customer is opened to Google's save flow

**Dynamic Wallet Hero Image Generation:**

1. Google Wallet (or browser) requests `GET /api/wallet-image?cardId=...&t=...`
2. Edge function fetches `cards` + `programs` from Supabase (service-role key)
3. Fetches `rewards` in a separate query (nested queries not supported in Edge)
4. Renders a React JSX tree using `ImageResponse` / Satori (1032×336px)
5. Returns PNG with `Cache-Control: no-cache` headers

**State Management:**
- No global state manager (no Redux, Zustand, or Context)
- State is local `useState` inside each page component
- Data is fetched on mount via `useEffect` directly from Supabase
- Auth state is checked imperatively on each protected page (no middleware-based route protection)

## Key Abstractions

**`WalletCardData` (type):**
- Purpose: Unified data shape passed to both `generateWalletLink()` and `updateWalletCard()`
- Examples: `lib/google-wallet.ts` lines 32–86
- Pattern: Single fat object covering all 5 program types; fields are optional per type

**`createClient()` (factory function):**
- Purpose: Instantiates a Supabase browser client using public env vars
- Examples: `lib/supabase.ts`
- Pattern: Called at the top of each page component — `const supabase = createClient()`

**API routes as integration adapters:**
- Purpose: Isolate external service calls (Google Wallet JWT signing, Stripe Checkout) from client code
- Examples: `app/api/wallet/route.ts`, `app/api/stripe-checkout/route.ts`
- Pattern: Route receives `cardId` or `merchantId`, loads full context from DB, calls lib function, returns result

**Program types as a discriminated union:**
- Purpose: Single `program_type` field drives all branching logic across stamp, scan, wallet-image, and card-display pages
- Values: `'stamps' | 'points' | 'cashback' | 'tiers' | 'subscription' | 'missions'`
- Pattern: `switch (programType)` in `app/api/wallet-image/route.tsx`; `if/else if` chains in `app/stamp/page.tsx`

## Entry Points

**Root Landing Page:**
- Location: `app/page.tsx`
- Triggers: Any unauthenticated visitor to `/`
- Responsibilities: Marketing copy, links to `/login` and `/register`

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: Wraps every page in the app
- Responsibilities: Sets HTML lang, loads Geist fonts, applies global CSS

**Customer Card Page:**
- Location: `app/c/[token]/page.tsx`
- Triggers: QR code scan by customer, or direct link
- Responsibilities: Renders live card state for all program types; initiates Google Wallet add flow; polls every 5 seconds

**Stamp Scanner:**
- Location: `app/stamp/page.tsx`
- Triggers: Merchant navigates to `/stamp` from dashboard
- Responsibilities: Camera-based QR scan, manual code fallback, transaction recording for all program types, Google Wallet update trigger

**Wallet Image Generator (Edge):**
- Location: `app/api/wallet-image/route.tsx`
- Triggers: Google Wallet server fetching hero image; browser previews
- Responsibilities: Generates 1032×336px PNG using Satori/ImageResponse; separate DB query for rewards (edge limitation)

## Error Handling

**Strategy:** Per-component try/catch; API routes return `NextResponse.json({ error: message }, { status: N })`

**Patterns:**
- Dashboard pages: errors typically silently fail or set a local `error` state string rendered inline
- API routes: structured `{ error: string }` JSON responses with appropriate HTTP status codes
- Google Wallet update errors (404 = card not yet in wallet) are swallowed silently — non-blocking
- Stripe routes return `503` when env vars are missing, with an informative message
- The `wallet-image` Edge route returns plain text `'Card not found'` with 404 (not JSON)

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` only — no structured logging framework
**Validation:** Minimal — required fields checked in API routes (`if (!cardId)`); form validation via HTML `required` attributes
**Authentication:** Supabase Auth; checked imperatively at component mount via `supabase.auth.getUser()` with redirect to `/login`; no Next.js middleware protecting routes; API routes do not verify auth tokens (rely on `merchant_id` scoping for data isolation)
**Plan Enforcement:** Free plan limit (max 5 programs) checked in `app/dashboard/programs/new/page.tsx` before allowing program creation

---

*Architecture analysis: 2026-03-02*
