# Coding Conventions

**Analysis Date:** 2026-03-05

## Naming Patterns

**Files:**
- Next.js App Router pages: `page.tsx`, `layout.tsx`, `route.ts` (lowercase, fixed names)
- API routes: kebab-case directories, e.g. `app/api/wallet-update/route.ts`, `app/api/stripe-webhook/route.ts`
- Dynamic route segments: bracket notation, e.g. `app/dashboard/programs/[id]/page.tsx`, `app/join/[programId]/page.tsx`
- Component files: PascalCase, e.g. `components/dashboard/Sidebar.tsx`, `components/ui/EmptyState.tsx`
- Library files: camelCase, e.g. `lib/sendapp.ts`, `lib/whatsapp-automations.ts`, `lib/webhooks.ts`
- Hook files: camelCase starting with `use`, e.g. `lib/hooks/usePlan.ts`

**Functions:**
- React components: PascalCase default exports, e.g. `export default function DashboardPage()`, `export default function Sidebar()`
- Event handlers: camelCase prefixed with `handle`, e.g. `handleLogin`, `handleSoftDelete`
- Data-fetching functions inside components: camelCase descriptive, e.g. `loadDashboard()`, `loadPrograms()`, `loadMerchantStatus()`
- Utility/lib functions: camelCase, e.g. `formatPhoneIT()`, `interpolate()`, `triggerWebhook()`, `sendAutomatedMessage()`
- API private helpers: camelCase, e.g. `callOpenAI()`, `callAnthropic()`, `getSupabase()`, `buildNuovoClientePayload()`

**Variables:**
- camelCase throughout TypeScript, e.g. `merchantId`, `cardHolder`, `programType`
- Boolean state names: descriptive adjective, e.g. `loading`, `isPro`, `isBusiness`, `waConnected`
- Constants in SCREAMING_SNAKE_CASE for module-level config: e.g. `NAV_ITEMS`, `PROGRAM_TYPE_INFO`, `DEFAULT_TEMPLATES`, `SENDAPP_BASE`

**Types/Interfaces:**
- Types use PascalCase: `Merchant`, `Program`, `Card`, `CardHolder`, `StampTransaction`
- Input types suffixed with `Input`: `CreateProgramInput`, `CreateCardHolderInput`, `CreateNotificationInput`
- Union string types used extensively for enums: `'stamps' | 'points' | 'cashback' | 'tiers' | 'subscription'`
- Interfaces for component props: PascalCase suffixed with `Props`, e.g. `EmptyStateProps`, `MetricCardProps`
- Page-local types declared inline at top of file: `type DashboardStats = {...}`, `type ScanMode = ...`

**Database columns:**
- snake_case matching Supabase table schema, e.g. `merchant_id`, `created_at`, `deleted_at`

## Code Style

**Formatting:**
- No Prettier config file detected — formatting is manual/editor-driven
- Indentation: 2 spaces
- Single quotes for strings in TypeScript
- Template literals for string interpolation
- No trailing semicolons in JSX return statements; inconsistent semicolons in lib code

**Linting:**
- ESLint 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config: `eslint.config.mjs`
- No additional custom rules beyond Next.js defaults
- Strict TypeScript (`"strict": true` in `tsconfig.json`)
- `as any` used frequently as a type escape hatch (see CONCERNS.md for details)

## Import Organization

**Order (observed pattern):**
1. Next.js framework imports (`'next/server'`, `'next/navigation'`, `'next/link'`)
2. React imports (`'react'`)
3. Third-party library imports (`@supabase/supabase-js`, `stripe`, `lucide-react`)
4. Internal `@/lib/*` imports
5. Internal `@/components/*` imports
6. Type-only imports with `import type`

**Path Aliases:**
- `@/*` maps to the project root (defined in `tsconfig.json`)
- Use `@/lib/supabase` for browser Supabase client in client components
- Use `@supabase/supabase-js` directly in API routes with service role key

**Example:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { triggerWebhook } from '@/lib/webhooks'
import type { Program } from '@/lib/types'
```

## Supabase Client Patterns

**Browser (client components):**
```typescript
import { createClient } from '@/lib/supabase'
const supabase = createClient()
```

**Server/API routes (service role):**
```typescript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

Some API routes instantiate supabase at module level (e.g. `app/api/wallet/route.ts`); others use a factory function `getSupabase()` inside the handler (e.g. `app/api/whatsapp/incoming/route.ts`). The factory pattern is preferred for env var safety at runtime.

**Soft delete filter — always apply to programs and cards:**
```typescript
.is('deleted_at', null)
```

## React Component Patterns

**Client components:**
- All interactive pages and components declare `'use client'` as the first line
- State initialized with descriptive defaults: `const [loading, setLoading] = useState(true)`
- Data loading in `useEffect(() => { loadXxx() }, [])` — named loader functions, not inline async
- Auth guard pattern: check user in loader, `router.push('/login')` if not authenticated
- Loading state: spinner `<div className="animate-spin w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full">` while `loading === true`

**Auth guard pattern:**
```typescript
useEffect(() => {
  loadDashboard()
}, [])

async function loadDashboard() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    router.push('/login')
    return
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('merchant_id')
    .eq('id', user.id)
    .single()
  if (!profile?.merchant_id) {
    router.push('/register')
    return
  }
  // ... fetch data
  setLoading(false)
}
```

**After DB mutation — always refresh to bust Next.js cache:**
```typescript
router.refresh()
router.push('/dashboard/programs')
```

**Parallel queries with Promise.all:**
```typescript
const [
  { count: programsCount },
  { count: cardsCount },
] = await Promise.all([
  supabase.from('programs').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId),
  supabase.from('cards').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId),
])
```

## API Route Patterns

**HTTP method exports (Next.js App Router):**
```typescript
export async function POST(request: NextRequest) { ... }
export async function GET(request: NextRequest) { ... }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) { ... }
```

**Response patterns:**
```typescript
// Success
return NextResponse.json({ walletLink })
return NextResponse.json({ received: true })

// Error
return NextResponse.json({ error: 'Descrizione errore' }, { status: 400 })
return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
return NextResponse.json({ error: 'Errore: ' + error.message }, { status: 500 })
```

**Input validation at top of handler:**
```typescript
const { cardId } = await request.json()
if (!cardId) {
  return NextResponse.json({ error: 'Card ID mancante' }, { status: 400 })
}
```

**Webhook routes always return 200 regardless of internal errors:**
```typescript
// Always respond 200 to external webhook providers (SendApp, Stripe)
return NextResponse.json({ received: true })
```

## Error Handling

**Strategy:** Catch-all try/catch wrapping the entire API handler; errors logged with `console.error` then returned as JSON responses. Non-critical paths (webhook dispatch, WhatsApp notifications) use nested try/catch and swallow errors to avoid blocking primary response.

**API route catch-all:**
```typescript
try {
  // main logic
  return NextResponse.json({ result })
} catch (error: any) {
  console.error('Descrizione errore:', error)
  return NextResponse.json(
    { error: 'Errore: ' + error.message },
    { status: 500 }
  )
}
```

**Non-critical nested try/catch (fire-and-forget):**
```typescript
try {
  await triggerWebhook(card.merchant_id, 'carta_creata', { ... })
} catch (whErr) {
  console.error('[wallet] triggerWebhook error:', whErr)
  // do not rethrow — webhook failure must not block wallet response
}
```

**Client-side error handling:**
- Error messages stored in component state: `const [error, setError] = useState('')`
- Displayed inline: `{error && <p className="text-red-500 text-sm">{error}</p>}`
- No global React error boundary in use

## Logging

**Framework:** `console.log` / `console.error` / `console.warn` — no structured logging library.

**Patterns:**
- Module prefix in brackets for traceability: `console.error('[sendapp] sendTextMessage failed for ...')`
- Section markers for critical debug paths: `console.log('=== WALLET DATA ===')`, `console.log('[webhook] Payload: ...')`
- `console.warn` for recoverable/skippable conditions: `console.warn('[sendapp] formatPhoneIT failed for: ...')`
- Logs are Italian in user-facing messages, English or mixed in debug logs
- No log levels, no structured JSON logging, no external log sink

## Comments

**Guidelines observed:**
- JSDoc block comments on exported utility functions in `lib/`:
  ```typescript
  /**
   * Normalizza un numero di telefono italiano al formato SendApp: 393331234567
   * Accetta: +39333..., 0039333..., 39333..., 333...
   */
  export function formatPhoneIT(phone: string): string | null {
  ```
- Section separator lines in lib modules: `// ─── Section Name ────────────`
- Inline notes referencing CLAUDE.md architecture decisions: `// Carica premi intermedi (query separata come da CLAUDE.md)`
- JSX section labels: `{/* Page Header */}`, `{/* Stats Grid */}`, `{/* Quick Actions */}`
- Project language: Italian for user-facing strings, mixed Italian/English for code comments

## Module Design

**Exports:**
- Pages and components: `export default function ComponentName()`
- Library modules: named exports only — `export function formatPhoneIT(...)`, `export async function sendAutomatedMessage(...)`
- Types: `export type TypeName` from `lib/types.ts`
- Constants alongside functions: `export const DEFAULT_TEMPLATES: Record<TriggerType, string>`

**Barrel files:**
- Not used — imports always reference specific module files directly

## Tailwind CSS Design Tokens

**Consistent design system values — use these exact values:**

| Token | Value |
|-------|-------|
| Sidebar background | `bg-[#111111]` |
| Active nav item | `bg-[#2A2A2A]` |
| Hover nav | `bg-[#1E1E1E]` |
| Card border | `border-[#E8E8E8]` |
| Card border radius | `rounded-[12px]` |
| Button border radius | `rounded-[8px]` |
| Card shadow | `shadow-[0_1px_3px_rgba(0,0,0,0.08)]` |
| Primary button | `bg-[#111111] text-white hover:bg-[#333333]` |
| Empty state icon color | `text-[#D1D5DB]` |
| Success green text | `text-[#16A34A]` |
| Success green bg | `bg-[#DCFCE7]` |
| Error red text | `text-[#DC2626]` |

**Standard card pattern:**
```tsx
<div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
```

**Standard primary button:**
```tsx
<button className="bg-[#111111] text-white px-5 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors">
```

---

*Convention analysis: 2026-03-05*
