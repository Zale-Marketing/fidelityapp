# Codebase Structure

**Analysis Date:** 2026-03-04

## Directory Layout

```
fidelityapp/
├── app/                        # Next.js App Router — pages and API routes
│   ├── page.tsx                # Landing page (public)
│   ├── login/                  # Merchant auth
│   ├── register/               # Merchant registration
│   ├── onboarding/             # Post-registration wizard (4 steps)
│   ├── stamp/                  # QR scanner for merchant staff (mobile-first)
│   ├── c/[token]/              # Customer card public page (auto-refresh 5s)
│   ├── join/[programId]/       # Customer self-enrollment form
│   ├── dashboard/              # Authenticated merchant dashboard
│   │   ├── layout.tsx          # Sidebar + main layout wrapper
│   │   ├── page.tsx            # Overview stats
│   │   ├── analytics/          # KPI charts (recharts)
│   │   ├── billing/            # Stripe plan management
│   │   ├── cards/              # Card segmentation + CSV export
│   │   │   └── [id]/           # Individual card detail
│   │   ├── customers/          # CRM — card holders + tags + CSV
│   │   │   └── [id]/           # Individual customer detail
│   │   ├── notifications/      # Google Wallet push notifications
│   │   ├── programs/           # Loyalty program CRUD
│   │   │   ├── new/            # Program creation wizard
│   │   │   └── [id]/           # Program detail + delete
│   │   │       └── edit/       # Program edit
│   │   ├── settings/           # Account + integration settings
│   │   │   ├── webhooks/       # Webhook endpoints (BUSINESS plan)
│   │   │   ├── whatsapp/       # SendApp QR connect
│   │   │   ├── whatsapp-ai/    # AI chatbot config + test chat (PRO)
│   │   │   └── whatsapp-automations/ # Automation templates (PRO)
│   │   └── upgrade/            # Upgrade CTA page
│   └── api/                    # API Route Handlers
│       ├── cron/birthday/      # Vercel Cron birthday automation
│       ├── programs/[id]/      # PATCH/DELETE programs
│       ├── promo-code/         # Promo code endpoint
│       ├── send-notification/  # Google Wallet push bulk send
│       ├── stamps-image/       # Static stamp image
│       ├── stripe-checkout/    # Create Stripe Checkout session
│       ├── stripe-portal/      # Stripe self-service portal
│       ├── stripe-webhook/     # Handle Stripe events
│       ├── submit-lead/        # Save lead from landing page
│       ├── wallet/             # Generate Google Wallet link (JWT)
│       ├── wallet-image/       # Hero image for wallet (Edge Runtime)
│       ├── wallet-update/      # PATCH wallet card after stamp
│       └── webhooks/           # CRUD webhook endpoints + dispatch
│           ├── [id]/           # PATCH/DELETE single endpoint
│           └── dispatch/       # Fire HMAC-signed webhook
│       └── whatsapp/           # WhatsApp integration routes
│           ├── ai-test/        # Test AI chatbot response (auth)
│           ├── automated/      # Send automated message (no auth)
│           ├── bulk/           # Bulk WhatsApp campaign
│           ├── connect/        # Connect/disconnect SendApp
│           ├── incoming/       # Webhook from SendApp (chatbot)
│           ├── send/           # Manual send (auth)
│           ├── status/         # SendApp connection status + QR
│           └── test/           # Test send (auth)
├── components/                 # Reusable React components
│   ├── LeadForm.tsx            # Landing page contact form
│   ├── dashboard/
│   │   └── Sidebar.tsx         # Fixed left nav (dynamic WA items)
│   └── ui/
│       ├── EmptyState.tsx      # Empty state placeholder
│       ├── MetricCard.tsx      # KPI number card
│       ├── StatusBadge.tsx     # Colored status pill
│       └── UpgradePrompt.tsx   # Plan upgrade CTA block
├── lib/                        # Shared utilities and service clients
│   ├── google-wallet.ts        # Google Wallet JWT generation + PATCH
│   ├── hooks/
│   │   └── usePlan.ts          # React hook: { isFree, isPro, isBusiness }
│   ├── sendapp.ts              # SendApp Cloud WhatsApp API wrapper
│   ├── supabase.ts             # Supabase browser client factory
│   ├── types.ts                # TypeScript types (source of truth)
│   ├── wallet-helpers.ts       # Helpers for wallet text modules
│   ├── webhooks.ts             # HMAC-SHA256 webhook dispatcher
│   └── whatsapp-automations.ts # Template-based automated WA messages
├── public/                     # Static assets
├── supabase/
│   └── migrations/             # SQL migration files
├── trigger/                    # Trigger.dev job definitions (WIP)
├── trigger.config.ts           # Trigger.dev config
├── vercel.json                 # Vercel Cron config (birthday at 09:00 daily)
├── next.config.ts              # Next.js config (minimal)
├── tsconfig.json               # TypeScript config
├── tailwind.config (inline)    # Tailwind CSS 4 — config in CSS
├── CLAUDE.md                   # Project source-of-truth (read this first)
├── MANUAL-ACTIONS.md           # SQL to run manually in Supabase
├── PROGRESSO.md                # Session progress log
└── BLOCCO.md                   # Active blockers log
```

## Directory Purposes

**`app/` (pages and API routes):**
- Purpose: All Next.js App Router routes — both UI pages and server-side API handlers
- Contains: Page components, layout files, route handlers
- Key files: `app/page.tsx` (landing), `app/dashboard/layout.tsx` (dashboard shell), `app/stamp/page.tsx` (scanner), `app/c/[token]/page.tsx` (customer card)

**`app/api/` (API Route Handlers):**
- Purpose: Server-side logic, external integrations, webhooks
- Contains: `route.ts` files with exported HTTP method handlers
- Key files: `app/api/wallet/route.ts`, `app/api/wallet-image/route.tsx` (Edge), `app/api/stripe-webhook/route.ts`, `app/api/whatsapp/incoming/route.ts`
- Note: `wallet-image` uses `export const runtime = 'edge'` — all other routes are Node runtime

**`app/dashboard/` (merchant dashboard):**
- Purpose: All authenticated merchant UI
- Contains: Client Components (`'use client'`) that load data via Supabase browser client
- Key files: `app/dashboard/page.tsx`, `app/dashboard/programs/`, `app/dashboard/settings/`

**`components/` (reusable UI):**
- Purpose: Shared UI components used across pages
- Contains: Dashboard layout, generic UI primitives
- Key files: `components/dashboard/Sidebar.tsx`, `components/ui/EmptyState.tsx`, `components/ui/MetricCard.tsx`

**`lib/` (shared utilities):**
- Purpose: Service wrappers, type definitions, hooks
- Contains: TypeScript modules — no React components
- Key files: `lib/types.ts` (authoritative types), `lib/google-wallet.ts`, `lib/sendapp.ts`, `lib/supabase.ts`, `lib/hooks/usePlan.ts`

**`supabase/migrations/`:**
- Purpose: SQL migration history
- Generated: No — manually authored
- Committed: Yes

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Public landing page
- `app/login/page.tsx`: Merchant login
- `app/register/page.tsx`: Merchant registration
- `app/onboarding/page.tsx`: Post-registration wizard
- `app/dashboard/page.tsx`: Dashboard home (requires auth)
- `app/stamp/page.tsx`: QR scanner for stamp operations
- `app/c/[token]/page.tsx`: Customer card view (public)
- `app/join/[programId]/page.tsx`: Customer enrollment form (public)

**Configuration:**
- `vercel.json`: Vercel Cron schedule (birthday automation at 09:00 daily)
- `next.config.ts`: Next.js config (currently empty)
- `tsconfig.json`: TypeScript config with `@/` alias for root
- `CLAUDE.md`: Project-wide rules, DB schema, conventions (must read before writing code)
- `MANUAL-ACTIONS.md`: SQL statements to run directly in Supabase dashboard

**Core Logic:**
- `lib/google-wallet.ts`: All Google Wallet JWT/PATCH logic
- `lib/sendapp.ts`: All WhatsApp send operations
- `lib/whatsapp-automations.ts`: Automated WhatsApp message dispatch
- `lib/webhooks.ts`: HMAC webhook firing
- `lib/types.ts`: All TypeScript types

**External Webhook Receivers:**
- `app/api/stripe-webhook/route.ts`: Receives Stripe billing events
- `app/api/whatsapp/incoming/route.ts`: Receives inbound WhatsApp messages from SendApp

**Plan/Feature Gating:**
- `lib/hooks/usePlan.ts`: React hook for plan checks in UI
- `components/dashboard/Sidebar.tsx`: Conditionally shows WhatsApp menu items

## Naming Conventions

**Files:**
- Page components: `page.tsx` (Next.js convention)
- Layout components: `layout.tsx`
- API routes: `route.ts` or `route.tsx` (only wallet-image uses .tsx)
- Library modules: `kebab-case.ts` (e.g., `google-wallet.ts`, `whatsapp-automations.ts`)
- React component files: `PascalCase.tsx` (e.g., `Sidebar.tsx`, `LeadForm.tsx`)

**Directories:**
- Route segments: `kebab-case` (e.g., `wallet-image/`, `whatsapp-automations/`)
- Dynamic segments: `[param]` (e.g., `[id]/`, `[token]/`, `[programId]/`)
- API groups: grouped by domain under `api/whatsapp/`, `api/webhooks/`

**TypeScript:**
- Types: PascalCase (`Merchant`, `CardHolder`, `Program`)
- Functions/variables: camelCase (`generateWalletLink`, `sendAutomatedMessage`)
- DB column references: snake_case (matching DB schema exactly)
- Enum-like string literals: inline union types (`'stamps' | 'points' | 'cashback'`)

## Where to Add New Code

**New Dashboard Page:**
- Create directory: `app/dashboard/{feature-name}/`
- Add `page.tsx` with `'use client'` directive
- Follow pattern from `app/dashboard/analytics/page.tsx` — `useEffect` + Supabase browser client
- Add nav entry to `components/dashboard/Sidebar.tsx` NAV_ITEMS array if needed

**New API Route:**
- Create directory: `app/api/{endpoint-name}/`
- Add `route.ts` with exported HTTP method functions
- Use service role Supabase client: `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)`
- Follow error pattern: try/catch → `NextResponse.json({ error: ... }, { status: N })`

**New External Service Integration:**
- Add wrapper module: `lib/{service-name}.ts`
- Keep credentials out of the module — read from `process.env` at call time
- Expose typed functions; do not export raw HTTP clients

**New Customer-Facing Page:**
- Create directory: `app/{feature}/`
- Use Supabase browser client (anon key) — no auth required
- Do NOT use nested Supabase queries (`.select('*, relation(*)') `in Supabase are fine for non-Edge, but test carefully)

**New React Component:**
- Generic UI: `components/ui/{ComponentName}.tsx`
- Dashboard-specific: `components/dashboard/{ComponentName}.tsx`
- Always add `'use client'` if component uses hooks or browser APIs

**New Type:**
- Add to `lib/types.ts` — this is the single source of truth
- Match DB column names exactly (snake_case)
- Use `type` keyword, not `interface`

**New WhatsApp Automation Trigger:**
- Add trigger type to `TriggerType` union in `lib/whatsapp-automations.ts`
- Add default template to `DEFAULT_TEMPLATES` in same file
- Update `whatsapp_automations.trigger_type` constraint in DB (MANUAL-ACTIONS.md)
- Call `sendAutomatedMessage()` from the triggering code path

**New Webhook Event:**
- Add event name to `WebhookEvent` union in `lib/webhooks.ts`
- Call `triggerWebhook(merchantId, event, data)` from the relevant API route or lib

## Special Directories

**`.planning/`:**
- Purpose: GSD planning system — phases, roadmap, codebase docs
- Generated: No
- Committed: Yes

**`.claude/`:**
- Purpose: Claude Code agent configuration and GSD tooling
- Generated: Partially (by GSD tooling)
- Committed: Yes

**`supabase/migrations/`:**
- Purpose: SQL migration history for Supabase schema
- Generated: No — manually authored
- Committed: Yes
- Note: Some schema changes listed in `MANUAL-ACTIONS.md` may not have corresponding migration files

**`trigger/`:**
- Purpose: Trigger.dev background job definitions (work in progress)
- Generated: No
- Committed: Yes — but not yet active in production

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No (gitignored)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No (gitignored)
