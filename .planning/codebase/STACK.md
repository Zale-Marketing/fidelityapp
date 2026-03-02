# Technology Stack

**Analysis Date:** 2026-03-02

## Languages

**Primary:**
- TypeScript 5.x - All application code (`app/`, `lib/`)
- TSX - React components and Edge image generation routes (e.g., `app/api/wallet-image/route.tsx`)

**Secondary:**
- CSS (Tailwind utility classes) - Styling via `app/globals.css` and inline Tailwind classes
- JavaScript - `test-wallet.js` (standalone test script only)

## Runtime

**Environment:**
- Node.js v24.13.0

**Package Manager:**
- npm 11.6.2
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack framework, App Router, API routes, Edge Runtime
- React 19.2.3 - UI library (client components via `'use client'` directive)

**CSS:**
- Tailwind CSS 4.x - Utility-first styling via `@tailwindcss/postcss` plugin
- PostCSS config: `postcss.config.mjs`

**Build/Dev:**
- TypeScript compiler (tsc) - `tsconfig.json` with `target: ES2017`, strict mode enabled
- ESLint 9.x - `eslint.config.mjs` using `eslint-config-next` with `core-web-vitals` and `typescript` presets
- Next.js dev server: `next dev`

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.93.2 - Database client (browser + server)
- `@supabase/ssr` ^0.8.0 - Supabase SSR utilities (`createBrowserClient` in `lib/supabase.ts`)
- `stripe` ^20.4.0 - Stripe payments SDK, API version `2026-02-25.clover`
- `google-auth-library` ^10.5.0 - Google OAuth2 client for Wallet PATCH API calls
- `jsonwebtoken` ^9.0.3 - JWT signing for Google Wallet save links (RS256 algorithm)
- `next/og` (ImageResponse) - Built-in Next.js Edge image generation for `app/api/wallet-image/`

**QR Code:**
- `html5-qrcode` ^2.3.8 - Browser-side QR scanner (used in `app/stamp/`)
- `jsqr` ^1.4.0 - JS QR decoding library
- `qrcode` ^1.5.4 - QR code generation

**Image Generation:**
- `canvas` ^3.2.1 - Node canvas for server-side image rendering (`app/api/stamps-image/route.ts`)

**Type Definitions (devDependencies):**
- `@types/jsonwebtoken` ^9.0.10
- `@types/qrcode` ^1.5.6
- `@types/node` ^20, `@types/react` ^19, `@types/react-dom` ^19

## Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2017
- Path alias: `@/*` maps to project root `./`
- Strict mode: enabled
- Module resolution: `bundler`

**ESLint:**
- Config: `eslint.config.mjs`
- Extends: `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`

**Next.js:**
- Config: `next.config.ts` (currently empty — no custom options set)
- App Router only (no Pages Router)

**Tailwind:**
- Config: via PostCSS plugin `@tailwindcss/postcss` in `postcss.config.mjs`
- Global import: `@import "tailwindcss"` in `app/globals.css`
- Fonts: Geist Sans and Geist Mono loaded via `next/font/google` in `app/layout.tsx`

**Environment:**
- File: `.env.local` (present — contents not read)
- Key vars required (from code inspection):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only, used in API routes)
  - `NEXT_PUBLIC_APP_URL`
  - `GOOGLE_WALLET_ISSUER_ID`
  - `GOOGLE_WALLET_CLIENT_EMAIL`
  - `GOOGLE_WALLET_PRIVATE_KEY` or `GOOGLE_WALLET_PRIVATE_KEY_BASE64`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_PRO_MONTHLY`
  - `STRIPE_PRICE_PRO_YEARLY`

## Platform Requirements

**Development:**
- Node.js v24.x
- npm 11.x
- Run: `npm run dev` → `next dev`
- Lint: `npm run lint` → `eslint`

**Production:**
- Deployment target: Vercel (https://fidelityapp-six.vercel.app)
- Edge Runtime used in `app/api/wallet-image/route.tsx` (declared via `export const runtime = 'edge'`)
- Node Runtime used in all other API routes (default Next.js Node.js runtime)
- Build: `npm run build` → `next build`
- Start: `npm start` → `next start`

---

*Stack analysis: 2026-03-02*
