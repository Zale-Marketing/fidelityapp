# External Integrations

**Analysis Date:** 2026-03-05

## APIs & External Services

**Google Wallet:**
- Service: Google Wallet API (Loyalty Objects v1)
  - SDK/Client: `google-auth-library` 10.5.0 + `jsonwebtoken` 9.0.3
  - Auth: Service account credentials (`GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_CLIENT_EMAIL`, `GOOGLE_WALLET_PRIVATE_KEY` or `GOOGLE_WALLET_PRIVATE_KEY_BASE64`)
  - Implementation: `lib/google-wallet.ts` — `generateWalletLink()`, `updateWalletCard()`, `getAuthClient()`
  - Endpoints called:
    - `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/{id}` — PATCH (update card data)
    - `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/{id}/addMessage` — POST (push notification)
  - Save-to-wallet flow: JWT signed RS256 → `https://pay.google.com/gp/v/save/{JWT}`
  - Known limit: Class-level changes (logo, name, color) do not propagate to already-saved cards; only Object-level changes (stamps, balance, hero image) update in real time via PATCH

**WhatsApp (SendApp Cloud):**
- Service: SendApp Cloud API (`https://app.sendapp.cloud/api`)
  - SDK/Client: Custom HTTP wrapper in `lib/sendapp.ts` (no official SDK)
  - Auth: Per-merchant `sendapp_instance_id` + `sendapp_access_token` stored in `merchants` table — no global env var
  - Key functions in `lib/sendapp.ts`:
    - `createInstance(accessToken)` — provision new instance
    - `getQRCode(instanceId, accessToken)` — QR for WhatsApp scan-to-connect
    - `getInstanceStatus(instanceId, accessToken)` — connection status
    - `setWebhook(instanceId, accessToken, webhookUrl)` — register incoming webhook
    - `rebootInstance`, `resetInstance`, `reconnectInstance` — session management
    - `sendTextMessage(number, message, instanceId, accessToken)` — send text
    - `sendMediaMessage(number, message, mediaUrl, instanceId, accessToken)` — send media
    - `sendWhatsAppToCustomer(merchantId, toPhone, message, eventType)` — high-level: fetches merchant credentials from DB, sends, logs to `whatsapp_logs`
  - Webhook registration: merchant's SendApp instance is pointed to `POST /api/whatsapp/incoming`
  - Higher-level automation: `lib/whatsapp-automations.ts` — `sendAutomatedMessage(merchantId, triggerType, toPhone, variables)` with template interpolation

**AI Providers — Per-Merchant Chatbot:**
- OpenAI
  - Endpoint: `https://api.openai.com/v1/chat/completions`
  - Model: `gpt-4o-mini`
  - Auth: Per-merchant `merchants.ai_api_key` column (not a global env var)
  - Max tokens: 300
  - Implementation: `callOpenAI()` in `app/api/whatsapp/incoming/route.ts`

- Anthropic (per-merchant chatbot)
  - Endpoint: `https://api.anthropic.com/v1/messages`
  - Model: `claude-3-5-haiku-20241022`
  - Auth: Per-merchant `merchants.ai_api_key` column (not a global env var)
  - API version header: `anthropic-version: 2023-06-01`
  - Max tokens: 300
  - Implementation: `callAnthropic()` in `app/api/whatsapp/incoming/route.ts`
  - Provider selection: `merchants.ai_provider` column (`'openai'` | `'anthropic'`, default `'openai'`)
  - On/off gate: `merchants.ai_chatbot_enabled` boolean

**AI Provider — OCIO Review Analysis (Server-Side):**
- Anthropic (global server key, not per-merchant)
  - Endpoint: `https://api.anthropic.com/v1/messages`
  - Model: `claude-sonnet-4-5`
  - Auth: Global `ANTHROPIC_API_KEY` env var (used in `trigger/ocio-ai-analyzer.ts`)
  - Max tokens: 500
  - Used for: sentiment analysis, urgency detection, fake review detection, suggested reply generation on `ocio_reviews` records

**Apify (Google Maps Review Scraping):**
- Service: Apify platform, actor `compass/google-maps-reviews-scraper`
  - SDK/Client: `apify-client ^2.22.2`
  - Auth: `APIFY_TOKEN` env var
  - Implementation: `trigger/ocio-scraper.ts` — `scrapeForMerchant(merchantId, googleMapsUrl, supabase)`
  - Behavior: first scrape fetches up to 1500 reviews; subsequent scrapes fetch 20 (newest only)
  - Runs synchronously within Trigger.dev task (`waitSecs: 120`)
  - Results upserted to `ocio_reviews` table on conflict `(merchant_id, review_id)`

**Avatar Fallback:**
- Service: `https://ui-avatars.com/api/` — used as fallback logo when a program has no `logo_url`
  - Called inline in `lib/google-wallet.ts` when building the loyalty class `programLogo`

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection env vars: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser), `SUPABASE_SERVICE_ROLE_KEY` (server-side, bypasses RLS)
  - Client (browser): `lib/supabase.ts` — `createBrowserClient` from `@supabase/ssr`
  - Client (server/API routes): inline `createClient` from `@supabase/supabase-js` with service role key
  - Auth: Supabase built-in auth (email/password)
  - Application tables: `merchants`, `profiles`, `programs`, `cards`, `card_holders`, `rewards`, `tiers`, `stamp_transactions`, `customer_tags`, `card_holder_tags`, `notification_logs`, `webhook_endpoints`, `whatsapp_logs`, `whatsapp_automations`, `whatsapp_conversations`, `leads`
  - OCIO module tables: `ocio_config`, `ocio_reviews`

**File Storage:**
- Supabase Storage — program logo uploads (PNG/JPG/WebP only; SVG explicitly blocked)

**Caching:**
- None (no Redis or similar)
- Google Wallet hero images explicitly bypass CDN caching via `Cache-Control: no-cache, no-store, must-revalidate` headers and `?t=${Date.now()}` cache-busting query param in `app/api/wallet-image/route.tsx`

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Browser client: `@supabase/ssr` `createBrowserClient` in `lib/supabase.ts`
  - Server bypass: service role key used in API routes to bypass Row Level Security
  - User identity: `auth.users.id` = `profiles.id` (1:1)
  - Roles: `'owner'` | `'admin'` | `'staff'` stored in `profiles.role`
  - Post-registration flow: redirect to `/onboarding` 4-step wizard

**Internal API Guard:**
- `NEXT_PUBLIC_INTERNAL_API_SECRET` env var — header-based guard on internal API endpoints

## Billing & Payments

**Stripe:**
- SDK: `stripe` 20.4.0, apiVersion `2026-02-25.clover`
- Auth: `STRIPE_SECRET_KEY` env var
- Webhook verification: `STRIPE_WEBHOOK_SECRET` env var (HMAC on `stripe-signature` header)
- Implementation files:
  - `app/api/stripe-checkout/route.ts` — creates Checkout Session with `merchant_id` in metadata
  - `app/api/stripe-portal/route.ts` — creates Customer Portal session
  - `app/api/stripe-webhook/route.ts` — handles events, updates `merchants` table
- Stripe events handled:
  - `checkout.session.completed` → sets `merchants.plan = 'PRO'`, stores subscription ID
  - `invoice.payment_succeeded` → confirms `plan = 'PRO'`, clears `plan_expires_at`
  - `invoice.payment_failed` → sets `stripe_subscription_status = 'past_due'`
  - `customer.subscription.updated` → updates plan and `plan_expires_at`
  - `customer.subscription.deleted` → downgrades to `plan = 'FREE'`, sets expiry date
- Price IDs: `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY` env vars

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, or similar detected)

**Logs:**
- `console.log` / `console.error` / `console.warn` in API routes and lib files
- WhatsApp activity logged to `whatsapp_logs` table (event types: `sent`, `failed`, `received`, `chatbot_response`, `bollino_aggiunto`, `benvenuto`, `premio`, plus automation trigger types)
- Vercel serverless logs capture all server-side output
- Trigger.dev SDK `logger` used in `trigger/ocio-scraper.ts` and `trigger/ocio-ai-analyzer.ts`

## Background Jobs & Scheduling

**Vercel Cron:**
- `GET /api/cron/birthday` — daily at 09:00 UTC (configured in `vercel.json`)
- Awards birthday bonus stamps and sends WhatsApp birthday messages

**Trigger.dev:**
- SDK: `@trigger.dev/sdk` v4.4.2
- Project ID: `proj_zvyvldbkgijrsvkohrfs`
- Config: `trigger.config.ts` — Node runtime, max 3600s duration, 3 retries with exponential backoff
- Tasks in `trigger/`:
  - `trigger/ocio-scraper.ts` — `ocio-review-scraper` (scheduled, every 6h): scrapes Google Maps reviews via Apify for all merchants with `ocio_config.module_reviews = true`, fires `ocio-ai-analyzer` task per merchant after scrape
  - `trigger/ocio-ai-analyzer.ts` — `ocio-ai-analyzer` (triggered): analyzes unanalyzed `ocio_reviews` records with Anthropic `claude-sonnet-4-5`, updates AI fields (`ai_sentiment`, `ai_score`, `ai_urgency`, `ai_themes`, `ai_is_fake`, `ai_suggested_reply`), optionally sends WhatsApp alert for negative/urgent reviews
  - `trigger/example.ts` — scaffold example (not production)

## CI/CD & Deployment

**Hosting:**
- Vercel (serverless + Edge functions + Cron)
- Production URL: `https://fidelityapp-six.vercel.app`

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, etc.)

## Webhooks & Callbacks

**Incoming (received by this app):**
- `POST /api/stripe-webhook` — Stripe payment/subscription events (HMAC verified via `stripe-signature` header)
- `POST /api/whatsapp/incoming` — SendApp Cloud inbound messages; triggers quick-reply commands or AI chatbot response; always returns HTTP 200

**Outgoing (dispatched by this app):**
- `POST /api/webhooks/dispatch` — dispatches signed webhook payloads to merchant-configured external URLs
  - Signature: HMAC-SHA256, sent as `X-FidelityApp-Signature: sha256={hex}` header
  - Event header: `X-FidelityApp-Event`
  - User-Agent: `FidelityApp-Webhooks/1.0`
  - Timeout: 5000ms per delivery attempt
  - Events: `bollino_aggiunto`, `carta_creata`, `premio_riscattato`, `nuovo_cliente`
  - Implementation: `lib/webhooks.ts` — `triggerWebhook(merchantId, event, data)`
  - Endpoint config stored per-merchant in `webhook_endpoints` table (each endpoint has its own HMAC secret)
  - Feature gated to BUSINESS plan merchants only

## Environment Configuration

**Required env vars (global — Vercel):**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key (browser-safe)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only, bypasses RLS)
- `NEXT_PUBLIC_APP_URL` — Full app URL (`https://fidelityapp-six.vercel.app`)
- `NEXT_PUBLIC_INTERNAL_API_SECRET` — Internal API route guard
- `GOOGLE_WALLET_ISSUER_ID` — Google Wallet issuer ID
- `GOOGLE_WALLET_CLIENT_EMAIL` — Service account email
- `GOOGLE_WALLET_PRIVATE_KEY` or `GOOGLE_WALLET_PRIVATE_KEY_BASE64` — RSA private key (mutually exclusive)
- `STRIPE_SECRET_KEY` — Stripe API secret
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_PRICE_PRO_MONTHLY` — Stripe Price ID for monthly PRO plan
- `STRIPE_PRICE_PRO_YEARLY` — Stripe Price ID for yearly PRO plan
- `APIFY_TOKEN` — Apify API token for review scraping (Trigger.dev tasks)
- `ANTHROPIC_API_KEY` — Anthropic API key for OCIO review AI analysis (Trigger.dev tasks only)

**Per-merchant secrets (stored in `merchants` table — not env vars):**
- `sendapp_instance_id`, `sendapp_access_token` — WhatsApp SendApp Cloud per-merchant credentials
- `ai_api_key`, `ai_provider` — Chatbot AI credentials (merchant chooses OpenAI or Anthropic, provides own key)

**Secrets location:**
- Global secrets: Vercel environment variables (not in repo)
- `.env.local` for local development (not committed to git)
- Per-merchant secrets: `merchants` table columns in Supabase

---

*Integration audit: 2026-03-05*
