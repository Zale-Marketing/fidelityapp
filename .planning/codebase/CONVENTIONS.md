# Coding Conventions

**Analysis Date:** 2026-03-02

## Naming Patterns

**Files:**
- Pages: `page.tsx` (Next.js App Router convention), always `page.tsx` inside route folders
- API routes: `route.ts` or `route.tsx` (when returning JSX/ImageResponse)
- Library modules: camelCase - `google-wallet.ts`, `supabase.ts`, `types.ts`
- Dynamic route folders: bracket notation `[id]`, `[token]`, `[programId]`
- Folders: kebab-case (`wallet-image`, `wallet-update`, `stripe-checkout`)

**React Components (exported defaults):**
- PascalCase with `Page` suffix: `DashboardPage`, `LoginPage`, `StampPage`, `NotificationsPage`, `AnalyticsPage`
- Customer-facing pages: `CustomerCardPage` (`app/c/[token]/page.tsx`)
- No dedicated `components/` folder - all components are page-level

**Functions:**
- camelCase for all functions: `loadDashboard`, `handleLogin`, `addStamp`, `generateWalletLink`, `sanitizeId`
- `load*` prefix for data fetching functions: `loadDashboard()`, `loadPrograms()`, `loadAnalytics()`
- `handle*` prefix for event handlers: `handleLogin`, `handleManualSubmit`, `handleAmountSubmit`, `handleSend`
- `add*` prefix for mutation functions: `addStamp`, `addPoints`, `addCashback`, `addTierSpend`
- `generate*` prefix for factory/builder functions: `generateWalletLink`, `generateStampsLayout`, `generatePointsLayout`
- `get*` prefix for pure helper functions: `getPrivateKey`, `getCurrentTier`, `getNextTier`, `getTypeIcon`, `getTypeInfo`

**Variables and State:**
- camelCase throughout: `merchantId`, `cardData`, `scanToken`, `programType`
- Boolean state uses descriptive names: `loading`, `sending`, `walletLoading`, `processing`
- Typed state uses angle brackets: `useState<DashboardStats>({...})`, `useState<Program[]>([])`

**Types:**
- PascalCase for all type declarations: `Program`, `Card`, `CardHolder`, `WalletCardData`, `ProgramType`
- Local page-scoped types defined inline at top of file: `DashboardStats`, `RecentActivity`, `ScanMode`, `CardData`
- Shared types in `lib/types.ts` (exported): `Merchant`, `Profile`, `Program`, `Reward`, `Card`, `StampTransaction`
- Input types use `Input` suffix: `CreateProgramInput`, `CreateRewardInput`, `CreateCardHolderInput`
- Stats types use `Stats` suffix: `MerchantStats`, `ProgramStats`

**Database / Supabase:**
- Table names: snake_case plural - `cards`, `programs`, `card_holders`, `stamp_transactions`
- Column names: snake_case - `merchant_id`, `card_holder_id`, `created_at`, `stamp_count`
- Always use `cards` (NOT `loyalty_cards`)

**Constants:**
- SCREAMING_SNAKE_CASE for module-level constants: `PROGRAM_TYPE_INFO`, `TYPE_ICONS`, `WIDTH`, `HEIGHT`
- Object record constants: `Record<string, { icon: string, name: string }>`

## Code Style

**Formatting:**
- No Prettier config file present - no enforced formatter beyond editor defaults
- Single quotes for strings (consistent across all files)
- No semicolons (TypeScript files follow Next.js default: no semicolons in most files)
- 2-space indentation
- Arrow functions for callbacks, `async function` declarations for named async functions

**Linting:**
- ESLint with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config: `eslint.config.mjs`
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- No custom ESLint rules beyond Next.js defaults

## Import Organization

**Order (observed pattern):**
1. React/Next.js framework imports: `'use client'` directive (top of file), then `import { useState } from 'react'`
2. Next.js specific: `useRouter`, `useParams`, `Link`, `NextRequest`, `NextResponse`, `ImageResponse`
3. Internal lib imports: `import { createClient } from '@/lib/supabase'`
4. Type imports: `import type { Program } from '@/lib/types'`
5. Third-party: `import { Html5Qrcode } from 'html5-qrcode'`, `import Stripe from 'stripe'`

**Path Aliases:**
- `@/*` maps to project root (configured in `tsconfig.json`)
- Use `@/lib/supabase` and `@/lib/types` for internal imports
- API routes import Supabase directly from `@supabase/supabase-js` (not `@/lib/supabase`) for service role client

**Client vs Server Supabase:**
```typescript
// Client-side pages ('use client') - use lib/supabase.ts wrapper
import { createClient } from '@/lib/supabase'
const supabase = createClient()

// Server-side API routes - instantiate directly with service role key
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // or ANON_KEY for public routes
)
```

## Error Handling

**Supabase Queries:**
```typescript
// Standard pattern - destructure error, check before using data
const { data: card, error: cardError } = await supabase
  .from('cards')
  .select('*')
  .eq('id', cardId)
  .single()

if (cardError || !card) {
  return NextResponse.json({ error: 'Card non trovata' }, { status: 404 })
}
```

**API Routes:**
- Wrap handler body in `try/catch`
- Return `NextResponse.json({ error: error.message }, { status: 500 })` on catch
- Use typed `error: any` in catch blocks: `catch (error: any)`
- Validate required params early with 400 responses

**Client-side Pages:**
- Use `useState` for error strings: `const [error, setError] = useState('')`
- Display inline: `{error && <p className="text-red-500 text-sm">{error}</p>}`
- `alert()` for imperative confirmations and quick error feedback (common pattern in stamp/page.tsx)
- `confirm()` for destructive actions (redeem, cashback reset)
- `try/catch` inside async event handlers with `setMode('error')` / `setMessage(err.message)`

**Throwing vs Returning:**
- In page-level async functions, `throw error` to propagate to outer try/catch
- In API routes, always `return NextResponse.json(...)` never throw

## Logging

**Framework:** `console` (native - no logging library)

**Patterns:**
- Debug sections marked with `=== DEBUG ===` pattern: `console.log('=== DEBUG ATTIVITÀ ===')`
- Development logs left in production code (not stripped) - see `app/dashboard/page.tsx` lines 121-122 and `app/api/wallet/route.ts` lines 131-132
- Success log in client: `console.log('✅ Wallet aggiornato')`
- Error log: `console.error('Errore:', error)` or `console.error('Errore aggiornamento wallet:', error)`

## Comments

**When to Comment:**
- Section dividers with `// ========== SECTION NAME ==========` for long functions
- Emoji-prefixed inline comments for clarity: `// 🆕 AGGIORNA WALLET`, `// ⚠️ ATTENZIONE`
- Short explanatory comments for non-obvious logic: `// Ignore` in catch blocks for scanner stop
- Italian language throughout (project is Italian-language)

**JSDoc/TSDoc:** Not used. No JSDoc annotations anywhere in the codebase.

## Function Design

**Size:** Functions tend to be long (50-200+ lines), especially in page files. `StampPage` contains all logic inline. No extraction into smaller helpers except in `lib/google-wallet.ts`.

**Parameters:**
- Explicit typed parameters when function is exported or defined at module level
- `any` used liberally for Supabase results passed between functions: `async function addStamp(card: any, program: any, customer?: any)`
- Optional parameters trailing with `?`

**Return Values:**
- API routes always return `NextResponse.json()`
- Client async functions use state setters for results rather than returning values
- Pure helper functions return typed values: `function getCurrentTier(totalSpent: number): Tier | null`

## Module Design

**Exports:**
- One default export per file (the page component or API handler)
- Named exports from `lib/` modules: `export function createClient()`, `export async function generateWalletLink()`, `export async function updateWalletCard()`
- Types exported from `lib/types.ts` individually

**Barrel Files:** Not used. No `index.ts` barrel files anywhere.

## TypeScript Usage

**Type Assertions:**
- `as any` used frequently for Supabase query results with relational joins: `(profile.merchants as any)?.name`
- `as any` cast passed to functions: `generateWalletLink(walletData as any)`
- Inline type casting on card fields: `(card as any).cashback_balance`
- `!` non-null assertion on env vars: `process.env.NEXT_PUBLIC_SUPABASE_URL!`

**Type Guards:**
- Null checks via optional chaining: `card?.scan_token`, `customer?.full_name`
- Fallback with `||`: `card.current_stamps || card.stamp_count || 0`

## UI Patterns

**Loading States:**
- Spinner: `<div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>`
- Full-screen centered wrapper: `<div className="min-h-screen bg-gray-50 flex items-center justify-center">`

**Color System (Tailwind):**
- Primary brand: `indigo-600`, `indigo-700` for hover
- Success: `green-500`, `green-600`
- Warning: `yellow-500`, `amber-500`
- Error: `red-500`, `red-600`
- Neutral backgrounds: `gray-50` (page), `gray-100` (subtle), `white` (cards)

**Satori / ImageResponse Rules (app/api/wallet-image/route.tsx):**
- Every `<div>` with multiple children MUST have `display: 'flex'`
- Use CSS shapes (circles via `borderRadius: '50%'`) instead of emoji
- No special Unicode characters
- Inline styles only (no Tailwind classes)

---

*Convention analysis: 2026-03-02*
