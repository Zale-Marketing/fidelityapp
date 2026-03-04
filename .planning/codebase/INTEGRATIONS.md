# External Integrations

**Analysis Date:** 2026-03-04

## APIs & External Services

**Google Wallet:**
- Service: Google Wallet API (Loyalty Objects v1)
  - SDK/Client: `google-auth-library` 10.5.0 + `jsonwebtoken` 9.0.3
  - Auth: Service account credentials via env vars
  - Key env vars: `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_CLIENT_EMAIL`, `GOOGLE_WALLET_PRIVATE_KEY` (or `GOOGLE_WALLET_PRIVATE_KEY_BASE64`)
  - Implementation: `lib/google-wallet.ts`
  - Endpoints called: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/{id}` (PATCH), `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/{id}/addMessage` (POST)
  - Save-to-wallet flow: JWT signed with RS256 → `https://pay.google.com/gp/v/save/{JWT}`
  - Known limit: Class-level changes (logo, name, color) do not propagate to already-saved cards; only Object-level changes (stamps, balance, hero image) update in real time

**WhatsApp (SendApp Cloud):**
- Service: SendApp Cloud API (`https://app.sendapp.cloud/api`)
  - SDK/Client: Custom HTTP wrapper in `lib/sendapp.ts`
  - Auth: Per-merchant `sendapp_instance_id` + `sendapp_access_token` stored in `merchants` table (no global env vars)
  - Implementation: `lib/sendapp.ts` — exposes `createInstance`, `getQRCode`, `getInstanceStatus`, `setWebhook`, `rebootInstance`, `resetInstance`, `reconnectInstance`, `sendTextMessage`, `sendMediaMessage`, `sendGroupText`, `sendGroupMedia`, `sendWhatsAppToCustomer`
  - High-level helper: `sendWhatsAppToCustomer(merchantId, toPhone, message, eventType)` — fetches merchant credentials from DB, sends, logs to `whatsapp_logs`
  - Webhook registration: merchant's SendApp instance is pointed to `POST /api/whatsapp/incoming`

**AI Providers (Chatbot):**
- OpenAI
  - Endpoint: `https://api.openai.com/v1/chat/completions`
  - Model: `gpt-4o-mini`
  - Auth: Per-merchant `ai_api_key` in `merchants` table
  - Max tokens: 300
  - Implementation: `callOpenAI()` in `app/api/whatsapp/incoming/route.ts`

- Anthropic
  - Endpoint: `https://api.anthropic.com/v1/messages`
  - Model: `claude-3-5-haiku-20241022`
  - Auth: Per-merchant `ai_api_key` in `merchants` table
  - API version header: `anthropic-version: 2023-06-01`
  - Max tokens: 300
  - Implementation: `callAnthropic()` in `app/api/whatsapp/incoming/route.ts`

- Provider selection: `merchants.ai_provider` column (`'openai'` | `'anthropic'`, default `'openai'`)
- Chatbot on/off: `merchants.ai_chatbot_enabled` boolean

**Avatar fallback:**
- Service: `https://ui-avatars.com/api/` — used as fallback logo when a program has no `logo_url`
  - Called inline within `lib/google-wallet.ts` when building the loyalty class

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-side) or `SUPABASE_SERVICE_ROLE_KEY` (server-side)
  - Client (browser): `lib/supabase.ts` — `createBrowserClient` from `@supabase/ssr`
  - Client (server/API routes): inline `createClient` from `@supabase/supabase-js` with service role key
  - Auth: Supabase built-in auth (email/password); profiles linked via `profiles` table
  - Tables: `merchants`, `profiles`, `programs`, `cards`, `card_holders`, `rewards`, `tiers`, `stamp_transactions`, `customer_tags`, `card_holder_tags`, `notification_logs`, `webhook_endpoints`, `whatsapp_logs`, `whatsapp_automations`, `whatsapp_conversations`, `leads`

**File Storage:**
- Supabase Storage — used for program logo uploads (PNG/JPG/WebP only; SVG blocked by convention)

**Caching:**
- None (no Redis or similar). Google Wallet hero images explicitly bypass CDN caching via `Cache-Control: no-cache, no-store, must-revalidate` headers and `?t=${Date.now()}` cache-busting query param.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: `@supabase/ssr` `createBrowserClient` for browser; service role key used server-side to bypass RLS
  - User identity: `auth.users.id` = `profiles.id` (1:1 relationship)
  - Roles: `'owner'` | `'admin'` | `'staff'` stored in `profiles.role`
  - Post-registration: redirect to `/onboarding` (4-step wizard)

**Internal API Guard:**
- `NEXT_PUBLIC_INTERNAL_API_SECRET` env var — guards internal API endpoints against unauthorized access

## Billing & Payments

**Stripe:**
- SDK: `stripe` 20.4.0, apiVersion `2026-02-25.clover`
- Auth: `STRIPE_SECRET_KEY` env var
- Webhook verification: `STRIPE_WEBHOOK_SECRET` env var (HMAC signature on `stripe-signature` header)
- Implementation files:
  - `app/api/stripe-checkout/route.ts` — creates Checkout Session
  - `app/api/stripe-portal/route.ts` — creates Customer Portal session
  - `app/api/stripe-webhook/route.ts` — handles events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Events handled update `merchants.plan` (FREE/PRO), `merchants.stripe_subscription_status`, and `merchants.plan_expires_at`
- Price IDs: `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY` env vars

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc. detected)

**Logs:**
- `console.log` / `console.error` / `console.warn` throughout API routes and lib files
- WhatsApp activity logged to `whatsapp_logs` table in Supabase (covers sent, failed, received, chatbot_response events)
- Vercel logs capture all server output

## Background Jobs & Scheduling

**Vercel Cron:**
- `GET /api/cron/birthday` — runs daily at 09:00 UTC (configured in `vercel.json`)
- Awards birthday bonus stamps and sends WhatsApp birthday messages

**Trigger.dev:**
- SDK: `@trigger.dev/sdk` v4.4.1
- Project ID: `proj_zvyvldbkgijrsvkohrfs`
- Config: `trigger.config.ts` — Node runtime, max 3600s duration, 3 retries with exponential backoff
- Tasks directory: `trigger/` — currently only contains scaffold example (`trigger/example.ts`)
- Status: Integrated/configured but no production tasks deployed yet

## CI/CD & Deployment

**Hosting:**
- Vercel (serverless + Edge functions)
- Production URL: `https://fidelityapp-six.vercel.app`

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, etc.)

## Webhooks & Callbacks

**Incoming (received by this app):**
- `POST /api/stripe-webhook` — Stripe payment/subscription events (verified via `stripe-signature` HMAC)
- `POST /api/whatsapp/incoming` — SendApp Cloud inbound messages (triggers quick-reply commands or AI chatbot response)

**Outgoing (dispatched by this app):**
- `POST /api/webhooks/dispatch` — dispatches signed webhook payloads to merchant-configured external URLs
  - Signature: HMAC-SHA256, sent as `X-FidelityApp-Signature: sha256={hex}` header
  - Event header: `X-FidelityApp-Event`
  - User-Agent: `FidelityApp-Webhooks/1.0`
  - Timeout: 5000ms per delivery
  - Events: `bollino_aggiunto`, `carta_creata`, `premio_riscattato`, `nuovo_cliente`
  - Implementation: `lib/webhooks.ts` — `triggerWebhook(merchantId, event, data)`
  - Endpoint configuration stored in `webhook_endpoints` table (per-merchant, with per-endpoint secret)
  - Feature gated to BUSINESS plan merchants

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key (browser-safe)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only, bypasses RLS)
- `NEXT_PUBLIC_APP_URL` — Full app URL (e.g., `https://fidelityapp-six.vercel.app`)
- `NEXT_PUBLIC_INTERNAL_API_SECRET` — Internal API route guard
- `GOOGLE_WALLET_ISSUER_ID` — Google Wallet issuer ID
- `GOOGLE_WALLET_CLIENT_EMAIL` — Service account email
- `GOOGLE_WALLET_PRIVATE_KEY` or `GOOGLE_WALLET_PRIVATE_KEY_BASE64` — RSA private key
- `STRIPE_SECRET_KEY` — Stripe API secret
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_PRICE_PRO_MONTHLY` — Stripe Price ID for monthly PRO plan
- `STRIPE_PRICE_PRO_YEARLY` — Stripe Price ID for yearly PRO plan

**Secrets location:**
- Global secrets: Vercel environment variables (not in repo)
- Per-merchant secrets: `merchants` table columns (`sendapp_instance_id`, `sendapp_access_token`, `ai_api_key`)
- `.env.local` for local development (not committed)

---

*Integration audit: 2026-03-04*
