# Technology Stack

**Analysis Date:** 2026-03-04

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (frontend components, API routes, lib utilities)

**Secondary:**
- TSX - React component files throughout `app/` and `components/`
- JavaScript (`.mjs`) - Config files only (`eslint.config.mjs`, `postcss.config.mjs`)

## Runtime

**Environment:**
- Node.js - Primary runtime for Next.js server components, API routes, and background tasks
- Edge Runtime - Used exclusively for `app/api/wallet-image/route.tsx` (hero image generation via `next/og`)

**Note:** Edge runtime has constraints — no nested Supabase queries (`.select('*, table(*)')`). Use separate queries in edge routes.

**Package Manager:**
- npm (inferred from `package-lock.json` presence)
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- Next.js 16.1.6 - App Router, React Server Components, API Routes, Edge Runtime
- React 19.2.3 - UI rendering
- Tailwind CSS 4.1.18 - Utility-first CSS via `@tailwindcss/postcss` PostCSS plugin

**Build/Dev:**
- TypeScript compiler (strict mode, `noEmit: true`, target ES2017)
- ESLint 9 with `eslint-config-next` (core-web-vitals + typescript presets)
- PostCSS via `postcss.config.mjs` with `@tailwindcss/postcss`

**Background Tasks:**
- Trigger.dev SDK v4.4.1 - Scheduled/background task runner
  - Config: `trigger.config.ts` (project `proj_zvyvldbkgijrsvkohrfs`, Node runtime, max 3600s)
  - Tasks directory: `trigger/`
  - Currently only a scaffold example task (`trigger/example.ts`)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.93.2 - Database client (PostgreSQL queries, auth)
- `@supabase/ssr` 0.8.0 - SSR-compatible Supabase client via `createBrowserClient`
- `stripe` 20.4.0 - Billing, subscriptions, webhooks (apiVersion: `2026-02-25.clover`)
- `jsonwebtoken` 9.0.3 - Signs Google Wallet JWT tokens (RS256 algorithm)
- `google-auth-library` 10.5.0 - OAuth2 client for Google Wallet API requests

**UI & Visualization:**
- `lucide-react` 0.576.0 - Icon library
- `recharts` 3.7.0 - Charts in `app/dashboard/analytics/page.tsx`

**QR Code:**
- `qrcode` 1.5.4 - QR code generation (server-side, node)
- `html5-qrcode` 2.3.8 - QR scanner (browser-side camera access)
- `jsqr` 1.4.0 - QR decoding from image data

**Image Generation:**
- `next/og` (`ImageResponse`) - Hero image for Google Wallet (1032×336px, Edge Runtime)
- `canvas` 3.2.1 - Canvas operations (server-side)

**Path alias:** `@/*` maps to project root (defined in `tsconfig.json`)

## Configuration

**Environment:**
- Configured via `.env.local` (development) and Vercel environment variables (production)
- Key vars required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_INTERNAL_API_SECRET`, `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_CLIENT_EMAIL`, `GOOGLE_WALLET_PRIVATE_KEY` (or `GOOGLE_WALLET_PRIVATE_KEY_BASE64`), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`
- Merchant-specific secrets (WhatsApp, AI API keys) stored in the `merchants` DB table, not env vars

**Build:**
- `next.config.ts` - Minimal configuration (no overrides currently set)
- `tsconfig.json` - Strict TypeScript, bundler module resolution, incremental builds
- `vercel.json` - Cron job definition: `GET /api/cron/birthday` runs daily at 09:00 UTC

## Platform Requirements

**Development:**
- Node.js (version not pinned — no `.nvmrc` or `.node-version` file)
- npm for package management

**Production:**
- Vercel (serverless functions + Edge Runtime)
- Production URL: `https://fidelityapp-six.vercel.app`
- Cron jobs managed by Vercel via `vercel.json`

---

*Stack analysis: 2026-03-04*
