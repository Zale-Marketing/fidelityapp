# Technology Stack

**Analysis Date:** 2026-03-05

## Languages

**Primary:**
- TypeScript 5.x - All source files (`.ts`, `.tsx`) in `app/`, `lib/`, `trigger/`, `components/`

**Secondary:**
- JavaScript (`.mjs`) - Config files only (`eslint.config.mjs`, `postcss.config.mjs`)

## Runtime

**Environment:**
- Node.js 20.x (devDependencies `@types/node: ^20`)
- Edge Runtime - `app/api/wallet-image/route.tsx` exclusively (Vercel Edge, declared via `export const runtime = 'edge'`)

**Node.js version:** Not pinned — no `.nvmrc` or `.node-version` file present.

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack framework, App Router, server components, API routes
- React 19.2.3 - UI rendering
- Tailwind CSS 4 - Utility-first styling via `@tailwindcss/postcss` PostCSS plugin

**Background Jobs:**
- Trigger.dev SDK v4.4.2 - Async background task runner for long-running operations
  - Config: `trigger.config.ts` (project `proj_zvyvldbkgijrsvkohrfs`, Node runtime, max 3600s)
  - Tasks directory: `trigger/`
  - Retries: 3 attempts, exponential backoff (1s–10s, factor 2, randomized)
  - Production tasks:
    - `trigger/ocio-scraper.ts` — `ocio-review-scraper` scheduled task (every 6h), scrapes Google Maps reviews via Apify, upserts to `ocio_reviews`, then triggers AI analyzer
    - `trigger/ocio-ai-analyzer.ts` — `ocio-ai-analyzer` triggered task, batch-analyzes unanalyzed reviews with Anthropic Claude, sends WhatsApp alerts for negative/urgent reviews

**Testing:**
- Not detected

**Build/Dev:**
- ESLint 9 + `eslint-config-next` 16.1.6 - Linting (`eslint.config.mjs`)
- PostCSS + `@tailwindcss/postcss` 4 - CSS processing (`postcss.config.mjs`)
- TypeScript compiler - `tsconfig.json` (target ES2017, strict mode, bundler module resolution, incremental)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js ^2.93.2` - Database client (PostgreSQL queries, used in all server routes and Trigger.dev tasks)
- `@supabase/ssr ^0.8.0` - SSR-compatible Supabase client (`createBrowserClient` in `lib/supabase.ts`)
- `stripe ^20.4.0` - Billing and subscriptions, apiVersion `2026-02-25.clover`
- `jsonwebtoken ^9.0.3` - Signs Google Wallet JWT tokens (RS256 algorithm) in `lib/google-wallet.ts`
- `google-auth-library ^10.5.0` - OAuth2 client for Google Wallet API PATCH requests
- `next/og` (`ImageResponse`, built-in) - Hero image generation 1032×336px (Edge Runtime) in `app/api/wallet-image/route.tsx`
- `apify-client ^2.22.2` - Calls Apify actor `compass/google-maps-reviews-scraper` to scrape Google Maps reviews in `trigger/ocio-scraper.ts`

**Analytics/Charts:**
- `recharts ^3.7.0` - Dashboard analytics charts in `app/dashboard/analytics/page.tsx`

**QR Code:**
- `qrcode ^1.5.4` - QR code generation (server-side)
- `html5-qrcode ^2.3.8` - QR scanner using browser camera in `app/stamp/page.tsx`
- `jsqr ^1.4.0` - QR decoding from image data

**Icons:**
- `lucide-react ^0.576.0` - Icon library throughout dashboard UI components

**Infrastructure:**
- `canvas ^3.2.1` - Server-side canvas rendering support
- `proxy-agent ^6.5.0` - Proxy support for Trigger.dev build (declared as `additionalPackages` in `trigger.config.ts`)

## Configuration

**Environment:**
- Configured via `.env.local` (development) and Vercel environment variables (production)
- Required global vars:
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key (browser-safe)
  - `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only, bypasses RLS — never expose to client)
  - `NEXT_PUBLIC_APP_URL` — `https://fidelityapp-six.vercel.app`
  - `NEXT_PUBLIC_INTERNAL_API_SECRET` — Guard for internal API routes
  - `GOOGLE_WALLET_ISSUER_ID` — Google Wallet issuer
  - `GOOGLE_WALLET_CLIENT_EMAIL` — Service account email
  - `GOOGLE_WALLET_PRIVATE_KEY` or `GOOGLE_WALLET_PRIVATE_KEY_BASE64` — RSA private key
  - `STRIPE_SECRET_KEY` — Stripe API key
  - `STRIPE_WEBHOOK_SECRET` — Stripe webhook HMAC verification secret
  - `STRIPE_PRICE_PRO_MONTHLY` — Stripe price ID for monthly PRO plan
  - `STRIPE_PRICE_PRO_YEARLY` — Stripe price ID for yearly PRO plan
  - `APIFY_TOKEN` — Apify scraping token (used by `trigger/ocio-scraper.ts`)
  - `ANTHROPIC_API_KEY` — Anthropic API key for OCIO review analysis (used by `trigger/ocio-ai-analyzer.ts`, NOT per-merchant)

- Per-merchant secrets (NOT in env vars, stored in `merchants` DB table):
  - `sendapp_instance_id`, `sendapp_access_token` — WhatsApp SendApp Cloud credentials
  - `ai_api_key`, `ai_provider` — Per-merchant AI chatbot credentials (OpenAI or Anthropic)

**Build:**
- `next.config.ts` — Minimal config, no custom overrides
- `tsconfig.json` — Strict mode, `@/*` path alias maps to project root, incremental compilation
- `trigger.config.ts` — Trigger.dev project settings, `proxy-agent` as additional build package
- `vercel.json` — Cron job: `GET /api/cron/birthday` daily at 09:00 UTC

## Platform Requirements

**Development:**
- Node.js 20+
- npm

**Production:**
- Vercel (serverless functions + Edge Runtime + Cron)
- Production URL: `https://fidelityapp-six.vercel.app`
- Cron jobs managed by Vercel via `vercel.json`
- Trigger.dev cloud for background tasks (`trigger/`)

---

*Stack analysis: 2026-03-05*
