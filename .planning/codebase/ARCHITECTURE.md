# Architecture

**Analysis Date:** 2026-03-04

## Pattern Overview

**Overall:** Monolithic Next.js SaaS — App Router with co-located API routes, no separate backend service

**Key Characteristics:**
- Single Next.js application serves both merchant dashboard and customer-facing pages
- All API logic lives in `app/api/` as Next.js Route Handlers
- Supabase is the only database — used directly from both client components and server routes
- No shared API abstraction layer — pages query Supabase directly using the browser client
- Two Supabase client modes: browser client (anon key) in Client Components, service role client in API routes

## Layers

**Public Customer Layer:**
- Purpose: Zero-auth pages for end customers to join programs and view cards
- Location: `app/join/[programId]/`, `app/c/[token]/`
- Contains: Client Components, direct Supabase queries with anon key
- Depends on: Supabase anon client, `/api/wallet`, `/api/whatsapp/automated`
- Used by: End customers (no authentication required)

**Auth Layer:**
- Purpose: Merchant registration, login, onboarding
- Location: `app/register/`, `app/login/`, `app/onboarding/`
- Contains: Client Components, Supabase Auth calls
- Depends on: `lib/supabase.ts` (browser client)
- Used by: Merchants registering or logging in

**Merchant Dashboard Layer:**
- Purpose: Authenticated merchant management interface
- Location: `app/dashboard/`
- Contains: Client Components with `'use client'` directive, `useEffect`-based data loading
- Depends on: `lib/supabase.ts`, `lib/hooks/usePlan.ts`, `components/dashboard/`
- Used by: Authenticated merchants

**API Routes Layer:**
- Purpose: Server-side actions, external service integration, webhook handling
- Location: `app/api/`
- Contains: Next.js Route Handlers (Node runtime by default, Edge for `wallet-image`)
- Depends on: `lib/google-wallet.ts`, `lib/sendapp.ts`, `lib/whatsapp-automations.ts`, `lib/webhooks.ts`
- Used by: Client Components (fetch calls), external services (Stripe, SendApp webhooks), Vercel Cron

**Library Layer:**
- Purpose: Shared utilities, external service clients, type definitions
- Location: `lib/`
- Contains: Service wrappers, typed helpers, React hooks
- Depends on: External SDKs (`jsonwebtoken`, `google-auth-library`, `stripe`)
- Used by: API routes and dashboard pages

**Component Layer:**
- Purpose: Reusable UI pieces
- Location: `components/`
- Contains: Dashboard layout components (`Sidebar.tsx`), generic UI (`EmptyState`, `MetricCard`, `StatusBadge`, `UpgradePrompt`), public page components (`LeadForm`)
- Depends on: `lib/supabase.ts`, `lib/hooks/usePlan.ts`
- Used by: All page components

## Data Flow

**Customer Card Registration Flow:**

1. Customer visits `app/join/[programId]/page.tsx`
2. Page queries Supabase directly for program + merchant data (anon key)
3. Customer submits form → page inserts `card_holders` + `cards` records to Supabase
4. Fire-and-forget: page calls `POST /api/webhooks/dispatch` and `POST /api/whatsapp/automated`
5. Customer redirected to `app/c/[token]/page.tsx` where card auto-refreshes every 5 seconds

**Stamp/Points Update Flow:**

1. Merchant opens `app/stamp/page.tsx`, scans customer QR code
2. Page reads card by `scan_token`, shows customer data
3. Merchant confirms → page updates `cards` + inserts `stamp_transactions` in Supabase directly
4. Page calls `POST /api/wallet-update { cardId }` to sync Google Wallet
5. `wallet-update` route calls `updateWalletCard()` in `lib/google-wallet.ts`
6. Google fetches `GET /api/wallet-image?cardId=&color=&t=` (Edge Runtime) to refresh hero image

**Google Wallet Creation Flow:**

1. Customer on `/c/[token]` presses "Aggiungi a Google Wallet"
2. `POST /api/wallet { cardId }` called (with `NEXT_PUBLIC_INTERNAL_API_SECRET` Bearer token)
3. Route fetches card + program + merchant + rewards from Supabase (service role)
4. `generateWalletLink()` in `lib/google-wallet.ts` builds JWT with loyaltyClass + loyaltyObject
5. JWT signed with Google service account private key → URL returned
6. Route fires `triggerWebhook()` for `carta_creata` event (BUSINESS plan merchants)
7. Customer redirected to `https://pay.google.com/gp/v/save/{JWT}`

**WhatsApp Incoming Flow:**

1. SendApp calls `POST /api/whatsapp/incoming` with message payload
2. Route resolves merchant by `instance_id`, logs incoming to `whatsapp_logs`
3. Route resolves `card_holder` and `card` for the sender's phone number
4. If `ai_chatbot_enabled=false`: keyword matching → static response
5. If `ai_chatbot_enabled=true`: loads conversation history from `whatsapp_conversations`, calls OpenAI/Anthropic API, updates conversation record
6. Response sent via `sendTextMessage()` in `lib/sendapp.ts`, logged to `whatsapp_logs`

**Stripe Billing Flow:**

1. Merchant clicks upgrade on `app/dashboard/billing/page.tsx`
2. `POST /api/stripe-checkout` creates Stripe Checkout session with `merchant_id` in metadata
3. Stripe sends events to `POST /api/stripe-webhook`
4. Webhook verifies signature, updates `merchants.plan` and `merchants.stripe_subscription_status`

**State Management:**
- No global client state manager (no Redux, Zustand, etc.)
- Each dashboard page manages its own local state with `useState` + `useEffect`
- Authentication state: Supabase session cookie managed by `@supabase/ssr`
- Plan state: `usePlan()` hook in `lib/hooks/usePlan.ts` — fetches on mount per component

## Key Abstractions

**`lib/google-wallet.ts`:**
- Purpose: All Google Wallet interactions — JWT generation and PATCH updates
- Examples: `generateWalletLink()`, `updateWalletCard()`, `getAuthClient()`
- Pattern: Functions export pure-ish operations; private key loaded from env at runtime

**`lib/sendapp.ts`:**
- Purpose: SendApp Cloud WhatsApp API wrapper
- Examples: `sendTextMessage()`, `sendWhatsAppToCustomer()`, `formatPhoneIT()`
- Pattern: Low-level HTTP helpers (`sendappGet`, `sendappPost`) + high-level `sendWhatsAppToCustomer()` that loads merchant credentials from DB

**`lib/whatsapp-automations.ts`:**
- Purpose: Template-based automated WhatsApp messages triggered by business events
- Examples: `sendAutomatedMessage()`, `interpolate()`, `DEFAULT_TEMPLATES`
- Pattern: Loads custom template from `whatsapp_automations` table, falls back to `DEFAULT_TEMPLATES`; interpolates `{variable}` placeholders

**`lib/webhooks.ts`:**
- Purpose: HMAC-SHA256 signed webhook dispatch to merchant-configured endpoints
- Examples: `triggerWebhook(merchantId, event, data)`
- Pattern: Queries active endpoints for merchant+event, signs payload, fires `Promise.allSettled` to all endpoints

**`lib/hooks/usePlan.ts`:**
- Purpose: React hook for plan-gating UI in dashboard
- Examples: `{ isFree, isPro, isBusiness, loading }`
- Pattern: Reads `merchants.plan` via authenticated Supabase query; `isPro` is true for both PRO and BUSINESS

**`lib/types.ts`:**
- Purpose: Single source of truth for TypeScript types matching DB schema
- Pattern: Plain type aliases (not interfaces), optional relations appended as `?` fields

## Entry Points

**`app/page.tsx`:**
- Location: `app/page.tsx`
- Triggers: GET `/` — public marketing page
- Responsibilities: Landing page with LeadForm

**`app/api/wallet-image/route.tsx`:**
- Location: `app/api/wallet-image/route.tsx`
- Triggers: GET `/api/wallet-image?cardId=&color=&t=` — called by Google Wallet servers
- Responsibilities: Generates 1032x336px PNG hero image for wallet cards (Edge Runtime, Satori)

**`app/stamp/page.tsx`:**
- Location: `app/stamp/page.tsx`
- Triggers: Merchant navigates to `/stamp`
- Responsibilities: QR scanner (html5-qrcode), stamp/point/cashback/subscription processing, wallet update trigger, WhatsApp automation trigger

**`app/api/whatsapp/incoming/route.ts`:**
- Location: `app/api/whatsapp/incoming/route.ts`
- Triggers: POST from SendApp Cloud webhook
- Responsibilities: Route incoming WhatsApp messages to keyword handler or AI chatbot; always returns 200

**`app/api/stripe-webhook/route.ts`:**
- Location: `app/api/stripe-webhook/route.ts`
- Triggers: POST from Stripe with verified signature
- Responsibilities: Update `merchants.plan` + subscription status based on Stripe events

**`app/api/cron/birthday/route.ts`:**
- Location: `app/api/cron/birthday/route.ts`
- Triggers: Vercel Cron at 09:00 daily (configured in `vercel.json`)
- Responsibilities: Find card_holders with today's birthday, send WhatsApp messages

## Error Handling

**Strategy:** Loose — most errors are logged to `console.error` and return JSON error responses; no centralized error tracking

**Patterns:**
- API routes: try/catch wrapping entire handler body; return `NextResponse.json({ error: ... }, { status: N })`
- WhatsApp incoming webhook: always returns `{ received: true }` with 200, even on errors, to satisfy SendApp
- Google Wallet update: 404 errors from Google silently ignored (card not yet in wallet); other errors logged as warnings
- Client pages: local `useState` for error strings displayed inline
- Fire-and-forget calls: `.catch(console.error)` on webhook dispatch and WhatsApp automation calls from `join/` page

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` throughout; no structured logging framework; logs visible in Vercel function logs

**Validation:** Minimal — mainly null/undefined checks inline; no Zod or validation library; form validation via HTML5 `required` + `type` attributes

**Authentication:**
- Dashboard pages: check `supabase.auth.getUser()` in `useEffect`, redirect to `/login` if null
- API routes: Bearer token check using `INTERNAL_API_SECRET` env var (only on `/api/wallet`)
- No middleware-level auth guard; each page/route handles its own auth check
- Supabase Row Level Security handles data isolation at the DB level

**Plan Gating:**
- `usePlan()` hook returns `{ isFree, isPro, isBusiness }` for UI gating
- Hard limits (e.g., max 5 programs for FREE) enforced inline in page components
- WhatsApp features conditioned on `isPro && waConnected` in `Sidebar.tsx` and settings pages
