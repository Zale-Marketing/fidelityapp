# External Integrations

**Analysis Date:** 2026-03-02

## APIs & External Services

**Google Wallet:**
- Service: Google Wallet API (Loyalty Cards)
- What it's used for: Creating digital loyalty cards saved to user Google Wallet; updating card data (stamps, points, cashback) in real-time
- SDK/Client: `google-auth-library` ^10.5.0 (for PATCH requests), `jsonwebtoken` ^9.0.3 (for JWT-signed save links)
- Implementation: `lib/google-wallet.ts` — exports `generateWalletLink()` and `updateWalletCard()`
- API endpoints called:
  - `https://pay.google.com/gp/v/save/{JWT}` — save-to-wallet redirect
  - `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/{objectId}` — PATCH to update card
- Auth: Service account credentials via env vars `GOOGLE_WALLET_CLIENT_EMAIL`, `GOOGLE_WALLET_PRIVATE_KEY` (or `GOOGLE_WALLET_PRIVATE_KEY_BASE64`)
- Scope used: `https://www.googleapis.com/auth/wallet_object.issuer`
- Issuer ID: `GOOGLE_WALLET_ISSUER_ID` env var

**Stripe:**
- Service: Stripe Subscriptions + Billing Portal
- What it's used for: SaaS billing — FREE vs PRO plan management for merchants
- SDK/Client: `stripe` ^20.4.0, API version `2026-02-25.clover`
- Implementation: API routes at `app/api/stripe-checkout/route.ts`, `app/api/stripe-webhook/route.ts`, `app/api/stripe-portal/route.ts`
- Auth: `STRIPE_SECRET_KEY` env var (server-side only)
- Webhook secret: `STRIPE_WEBHOOK_SECRET` env var
- Price IDs: `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY` env vars
- Status: Code complete but keys not yet configured in production (see `BLOCCO.md`)

**UI Avatars (ui-avatars.com):**
- Service: External avatar/logo fallback service
- What it's used for: Generates a fallback program logo image when no logo_url is set
- Usage: `lib/google-wallet.ts` line 127 — constructs URL `https://ui-avatars.com/api/?name=...&background=...`
- No API key required (public service)

**Zale Marketing website:**
- Service: `https://zalemarketing.it`
- What it's used for: Branding link embedded in every Google Wallet card's links module ("Powered by Zale Marketing")
- Implementation: `lib/google-wallet.ts` — hardcoded URI in the loyalty class `linksModuleData`

## Data Storage

**Databases:**
- Type/Provider: Supabase (PostgreSQL)
- Connection (browser): `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Connection (server/API routes): `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Client library: `@supabase/supabase-js` ^2.93.2 with `@supabase/ssr` ^0.8.0
- Client factory: `lib/supabase.ts` — exports `createClient()` using `createBrowserClient`
- Server-side usage: API routes instantiate Supabase directly with service role key (not via `lib/supabase.ts`)
- Tables used by application code: `merchants`, `profiles`, `programs`, `cards`, `card_holders`, `rewards`, `tiers`, `stamp_transactions`, `notification_logs`, `card_missions`

**File Storage:**
- Supabase Storage — used for merchant and program logo uploads (logo_url columns reference Supabase storage URLs)
- No local filesystem storage for user uploads

**Caching:**
- None — all Google Wallet hero images are served with `Cache-Control: no-cache, no-store, must-revalidate` to force refresh

## Authentication & Identity

**Auth Provider:**
- Service: Supabase Auth (email/password)
- Implementation: `supabase.auth.signInWithPassword()` in `app/login/page.tsx`; `supabase.auth.signUp()` in register flow
- Session check: `supabase.auth.getUser()` called at top of each protected page/route
- No OAuth social login currently (email+password only)
- User-to-merchant linking: `profiles` table maps `auth.users.id` → `merchant_id`

## Monitoring & Observability

**Error Tracking:**
- None — no third-party error tracking service (e.g., Sentry) detected
- Errors logged via `console.error()` in API routes only

**Logs:**
- `console.log()` / `console.error()` statements in API routes; visible in Vercel function logs
- Notable: `app/api/wallet/route.ts` logs full wallet data payload to console on each generation

## CI/CD & Deployment

**Hosting:**
- Platform: Vercel
- Production URL: `https://fidelityapp-six.vercel.app`
- Edge functions: `app/api/wallet-image/route.tsx` (declared `export const runtime = 'edge'`)
- All other API routes run on Node.js runtime

**CI Pipeline:**
- None detected — no `.github/workflows/` or CI config files found
- Deployments triggered via Vercel git integration (push to main branch)

## Environment Configuration

**Required env vars (from code inspection):**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public, client-accessible)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (public, client-accessible)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only, used in all API routes except wallet/wallet-update which use anon key)
- `NEXT_PUBLIC_APP_URL` — Full app URL used to construct hero image URLs (e.g., `https://fidelityapp-six.vercel.app`)
- `GOOGLE_WALLET_ISSUER_ID` — Google Wallet issuer ID
- `GOOGLE_WALLET_CLIENT_EMAIL` — Google service account email
- `GOOGLE_WALLET_PRIVATE_KEY` — RSA private key (newlines as `\n`); OR
- `GOOGLE_WALLET_PRIVATE_KEY_BASE64` — Base64-encoded version of the private key
- `STRIPE_SECRET_KEY` — Stripe secret key (server-only)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_PRICE_PRO_MONTHLY` — Stripe Price ID for PRO monthly plan
- `STRIPE_PRICE_PRO_YEARLY` — Stripe Price ID for PRO yearly plan

**Secrets location:**
- `.env.local` for local development
- Vercel environment variables dashboard for production

## Webhooks & Callbacks

**Incoming:**
- `POST /api/stripe-webhook` — receives Stripe subscription lifecycle events:
  - `checkout.session.completed` → upgrades merchant to PRO
  - `invoice.payment_succeeded` → confirms PRO status active
  - `invoice.payment_failed` → sets subscription status to `past_due`
  - `customer.subscription.updated` → syncs plan and status
  - `customer.subscription.deleted` → downgrades merchant to FREE
- Webhook signature verified via `stripe.webhooks.constructEvent()` using `STRIPE_WEBHOOK_SECRET`

**Outgoing:**
- Google Wallet PATCH requests: `app/api/wallet-update/route.ts` calls `updateWalletCard()` which PATCHes `walletobjects.googleapis.com` for each card update
- Stripe Checkout: `app/api/stripe-checkout/route.ts` redirects user browser to Stripe-hosted checkout page
- Stripe Portal: `app/api/stripe-portal/route.ts` redirects user browser to Stripe billing portal

---

*Integration audit: 2026-03-02*
