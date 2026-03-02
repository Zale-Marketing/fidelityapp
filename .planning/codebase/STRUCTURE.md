# Codebase Structure

**Analysis Date:** 2026-03-02

## Directory Layout

```
fidelityapp/
├── app/                        # Next.js App Router — all pages and API routes
│   ├── api/                    # Server-side API route handlers
│   │   ├── stamps-image/       # Legacy canvas-based stamp image generator
│   │   ├── stripe-checkout/    # Creates Stripe Checkout session
│   │   ├── stripe-portal/      # Opens Stripe Customer Portal
│   │   ├── stripe-webhook/     # Handles Stripe webhook events
│   │   ├── wallet/             # Generates Google Wallet save link (JWT)
│   │   ├── wallet-image/       # Dynamic hero image for Wallet (Edge Runtime)
│   │   └── wallet-update/      # PATCHes existing Wallet card (Google API)
│   ├── c/[token]/              # Public customer card page (no auth required)
│   ├── dashboard/              # Merchant admin area (auth required)
│   │   ├── analytics/          # KPI charts and timeline stats
│   │   ├── billing/            # Stripe subscription management
│   │   ├── customers/          # CRM — customer list and detail pages
│   │   │   └── [id]/           # Individual customer detail
│   │   ├── notifications/      # Send Google Wallet push messages
│   │   ├── programs/           # Loyalty program management
│   │   │   ├── [id]/           # Program detail view
│   │   │   │   └── edit/       # Program edit form (restricted fields)
│   │   │   └── new/            # Multi-step program creation wizard
│   │   └── settings/           # Merchant account settings
│   ├── join/[programId]/       # Public program enrollment form (no auth)
│   ├── login/                  # Merchant login page
│   ├── onboarding/             # Post-registration 4-step wizard
│   ├── register/               # Merchant registration page
│   ├── stamp/                  # QR scanner for adding stamps/points
│   ├── globals.css             # Global Tailwind CSS imports
│   ├── layout.tsx              # Root HTML layout (fonts, body)
│   └── page.tsx                # Marketing landing page
├── lib/                        # Shared utilities and type definitions
│   ├── google-wallet.ts        # generateWalletLink(), updateWalletCard(), WalletCardData type
│   ├── supabase.ts             # createClient() — browser Supabase client factory
│   └── types.ts                # All shared TypeScript types (Merchant, Program, Card, etc.)
├── public/                     # Static assets served directly
├── BLOCCO.md                   # Active blockers and workarounds log
├── CLAUDE.md                   # Project instructions for Claude
├── PROGRESSO.md                # Session progress log
├── eslint.config.mjs           # ESLint configuration
├── next.config.ts              # Next.js configuration (minimal, no custom settings)
├── package.json                # Dependencies
├── postcss.config.mjs          # PostCSS / Tailwind CSS config
├── test-wallet.js              # Ad-hoc manual wallet test script
└── tsconfig.json               # TypeScript configuration
```

## Directory Purposes

**`app/api/`:**
- Purpose: All server-side logic requiring service-role DB access or external API calls
- Contains: One `route.ts` or `route.tsx` per endpoint folder
- Key files: `app/api/wallet/route.ts`, `app/api/wallet-image/route.tsx`, `app/api/stripe-checkout/route.ts`

**`app/dashboard/`:**
- Purpose: Protected merchant management interface
- Contains: `'use client'` pages; each fetches Supabase data on mount and redirects to `/login` if unauthenticated
- Key files: `app/dashboard/page.tsx` (main dashboard with stats)

**`app/c/[token]/`:**
- Purpose: Public loyalty card display for customers
- Contains: Single `page.tsx` that polls Supabase every 5 seconds; renders UI for all 5 program types
- Key files: `app/c/[token]/page.tsx`

**`app/join/[programId]/`:**
- Purpose: Public self-enrollment page — customers fill a form to get their own loyalty card
- Contains: Single `page.tsx` with form that creates `card_holder` + `card` records
- Key files: `app/join/[programId]/page.tsx`

**`app/stamp/`:**
- Purpose: Merchant QR scanner tool — used in-store to add stamps, points, cashback, or validate subscriptions
- Contains: Single `page.tsx` with `Html5Qrcode` integration and inline transaction logic for all program types
- Key files: `app/stamp/page.tsx`

**`lib/`:**
- Purpose: Shared code used by both pages and API routes
- Contains: Supabase client factory, Google Wallet JWT/PATCH logic, shared TypeScript types
- Key files: `lib/google-wallet.ts`, `lib/supabase.ts`, `lib/types.ts`

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Marketing landing page (unauthenticated root)
- `app/layout.tsx`: Root HTML layout, font loading
- `app/login/page.tsx`: Merchant authentication
- `app/register/page.tsx`: New merchant registration (redirects to `/onboarding` on success)
- `app/onboarding/page.tsx`: 4-step post-registration wizard

**Core Business Logic:**
- `app/stamp/page.tsx`: All transaction logic for all 5 program types (stamps, points, cashback, tiers, subscription)
- `app/api/wallet/route.ts`: Google Wallet JWT generation — assembles `WalletCardData` from DB and calls `generateWalletLink()`
- `app/api/wallet-image/route.tsx`: Edge Runtime hero image — renders JSX to PNG via `ImageResponse`
- `lib/google-wallet.ts`: Google Wallet SDK wrapper — JWT signing (`generateWalletLink`) and PATCH update (`updateWalletCard`)

**Data Layer:**
- `lib/supabase.ts`: Supabase client factory (browser/anon key only)
- API routes instantiate their own service-role client inline: `createClient(url, SUPABASE_SERVICE_ROLE_KEY)`

**Configuration:**
- `next.config.ts`: Next.js config (currently empty/default)
- `tsconfig.json`: TypeScript config — includes path alias `@/*` → `./*`
- `.planning/codebase/`: Architecture documentation (this file)

**Billing:**
- `app/api/stripe-checkout/route.ts`: Creates Stripe Checkout session; requires `STRIPE_SECRET_KEY` + price IDs in env
- `app/api/stripe-webhook/route.ts`: Processes Stripe webhook events to update `merchants.plan`
- `app/api/stripe-portal/route.ts`: Opens Stripe Customer Portal
- `app/dashboard/billing/page.tsx`: UI for plan management

## Naming Conventions

**Files:**
- Page files: always `page.tsx` (Next.js App Router convention)
- API route files: always `route.ts` or `route.tsx` (one per endpoint folder)
- Library files: kebab-case (`google-wallet.ts`, `supabase.ts`, `types.ts`)

**Directories:**
- Route segments: kebab-case (`wallet-image`, `stripe-checkout`, `wallet-update`)
- Dynamic segments: brackets (`[token]`, `[programId]`, `[id]`)
- Dashboard sections: single word (`analytics`, `billing`, `customers`, `programs`, `settings`, `notifications`)

**Components/Pages:**
- React component functions: PascalCase (`DashboardPage`, `StampPage`, `CustomerCardPage`, `JoinPage`)
- All page components are default exports

**TypeScript:**
- Types in `lib/types.ts`: PascalCase (`Merchant`, `Program`, `Card`, `CardHolder`, `StampTransaction`)
- Local page-level types: defined inline, also PascalCase (`DashboardStats`, `ScanMode`, `ProgramInfo`)
- DB column references: snake_case matching Supabase schema (`merchant_id`, `stamp_count`, `program_type`)

## Where to Add New Code

**New Dashboard Page (merchant feature):**
- Create: `app/dashboard/{feature-name}/page.tsx`
- Start with `'use client'` directive
- Auth pattern: `const { data: { user } } = await supabase.auth.getUser()` → redirect if null
- Get `merchant_id` via: `supabase.from('profiles').select('merchant_id').eq('id', user.id).single()`

**New API Endpoint:**
- Create: `app/api/{endpoint-name}/route.ts`
- For service-role DB access: `const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)`
- For browser/anon access: import `createClient` from `@/lib/supabase`
- Return: `NextResponse.json({ data })` or `NextResponse.json({ error }, { status: N })`

**New Shared Types:**
- Add to: `lib/types.ts` in the appropriate section (base types, programs, cards, etc.)
- Use PascalCase for type names

**New Public Customer Page:**
- Create: `app/{slug}/page.tsx` (no auth required)
- Use anon Supabase client from `@/lib/supabase`
- Do NOT use `SUPABASE_SERVICE_ROLE_KEY` in client components

**New Google Wallet Feature:**
- Extend: `lib/google-wallet.ts` (add to `WalletCardData` type and update `generateWalletLink` / `updateWalletCard`)
- Update: `app/api/wallet-image/route.tsx` to render new data in hero image
- Add new `switch` case in the image generator if a new program type is added

**New Program Type:**
- Add type literal to `ProgramType` union in `lib/google-wallet.ts` and `lib/types.ts`
- Add handling in `app/stamp/page.tsx` (transaction logic)
- Add layout function in `app/api/wallet-image/route.tsx`
- Add case in `app/c/[token]/page.tsx` (customer card display)
- Add option in `app/dashboard/programs/new/page.tsx` (program creation wizard)

## Special Directories

**`.planning/`:**
- Purpose: GSD (Get Shit Done) planning documents — architecture docs, phases, concerns
- Generated: No — written by Claude agents and human
- Committed: Yes

**`.claude/`:**
- Purpose: Claude agent configuration, custom commands (GSD workflow)
- Generated: Partly (commands auto-installed)
- Committed: Yes

**`public/`:**
- Purpose: Static files served at root path
- Generated: No
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes (by `next build` / `next dev`)
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No

---

*Structure analysis: 2026-03-02*
