# Coding Conventions

**Analysis Date:** 2026-03-04

## Naming Patterns

**Files:**
- React page components: `page.tsx` inside route directories (e.g., `app/dashboard/programs/page.tsx`)
- API route handlers: `route.ts` inside API directories (e.g., `app/api/wallet/route.ts`)
- Library files: camelCase (e.g., `lib/sendapp.ts`, `lib/whatsapp-automations.ts`)
- Reusable components: PascalCase (e.g., `components/ui/EmptyState.tsx`, `components/dashboard/Sidebar.tsx`)
- Custom hooks: camelCase with `use` prefix in `lib/hooks/` (e.g., `lib/hooks/usePlan.ts`)

**Functions:**
- React components: PascalCase (e.g., `ProgramsPage`, `EmptyState`, `Sidebar`)
- Async data loaders in components: camelCase descriptive (e.g., `loadPrograms`, `loadData`, `loadMerchantStatus`)
- Event handlers in components: `handle` prefix (e.g., `handleSoftDelete`, `handleLogin`)
- Library helpers: camelCase (e.g., `formatPhoneIT`, `sendTextMessage`, `interpolate`)
- API route handlers: named exports matching HTTP method (e.g., `export async function POST(...)`, `export async function GET(...)`)

**Variables:**
- camelCase throughout TypeScript (e.g., `merchantId`, `cardHolder`, `stampCount`)
- Boolean flags: descriptive (e.g., `waConnected`, `isPro`, `chatbotEnabled`, `testLoading`)
- Loading states: `loading` / `saving` / `exporting` pattern

**Types:**
- `type` keyword preferred over `interface` for local component types (e.g., `type ScanMode = ...`, `type CardData = ...`)
- `interface` used when explicitly props-based (e.g., `interface EmptyStateProps`, `interface UpgradePromptProps`)
- Types in components are co-located at the top of the file, before the component function
- Shared domain types live in `lib/types.ts` as the source of truth
- Union string literals for enums (e.g., `'stamps' | 'points' | 'cashback' | 'tiers' | 'subscription'`)

**Database / Supabase:**
- Table names: snake_case plural (e.g., `card_holders`, `stamp_transactions`)
- Column names: snake_case (e.g., `contact_email`, `sendapp_instance_id`, `deleted_at`)

## Code Style

**Formatting:**
- No Prettier configured — formatting is informal/manual
- Single quotes for strings in TypeScript/JavaScript (`'use client'`, `'#111111'`)
- No semicolons at end of statements (semi-free style throughout lib/ files)
- 2-space indentation

**Linting:**
- ESLint 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config: `eslint.config.mjs`
- Ignores: `.next/`, `out/`, `build/`
- No custom rules beyond next defaults

**TypeScript:**
- `strict: true` in `tsconfig.json`
- Non-null assertions (`!`) used freely on env vars (e.g., `process.env.SUPABASE_SERVICE_ROLE_KEY!`)
- `any` used in Google Wallet lib (`lib/google-wallet.ts`) and in some component-local variables for Supabase join responses
- `err: any` in catch blocks (e.g., `catch (err: any) { error = err?.message ?? String(err) }`)
- `catch { }` (no binding) used when error is intentionally ignored

## Import Organization

**Order (observed pattern):**
1. Framework imports (`'next/server'`, `'react'`, `'next/navigation'`, `'next/link'`)
2. Third-party packages (`'@supabase/supabase-js'`, `'stripe'`, `'lucide-react'`)
3. Internal lib imports (`'@/lib/supabase'`, `'@/lib/types'`, `'@/lib/sendapp'`)
4. Internal component imports (`'@/components/ui/EmptyState'`, `'@/components/dashboard/Sidebar'`)

**Path Aliases:**
- `@/*` maps to project root (configured in `tsconfig.json`)
- All internal imports use `@/` prefix (e.g., `import { createClient } from '@/lib/supabase'`)

## Supabase Client Usage

**Client-side (browser — all dashboard pages):**
```typescript
import { createClient } from '@/lib/supabase'  // uses @supabase/ssr createBrowserClient
const supabase = createClient()
```

**Server-side (API routes — uses service role):**
```typescript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```
Some API routes instantiate the client inline at module scope (e.g., `app/api/wallet/route.ts`), while others wrap it in a `getSupabase()` factory function (e.g., `app/api/whatsapp/incoming/route.ts`, `app/api/whatsapp/send/route.ts`). Both patterns are acceptable.

**Soft delete — always filter:**
```typescript
.is('deleted_at', null)           // filter active records
.update({ deleted_at: new Date().toISOString() })  // archive
```

## Error Handling

**API Routes:**
- Outer `try/catch` wraps the entire handler body; returns `NextResponse.json({ error: '...' }, { status: 500 })` on unhandled errors
- Webhook endpoints (SendApp, Stripe) always return HTTP 200 to prevent retry loops, even on errors
- Nested try/catch used for optional sub-operations (e.g., wallet generation, webhook dispatch, AI calls) so failures don't abort the primary response
- Validation errors return 400 with Italian-language error messages
- Auth errors return 401

**Pattern:**
```typescript
export async function POST(req: NextRequest) {
  try {
    // ... handler logic
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[route-name] error:', err)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
```

**Client Components:**
- Error state stored in `useState<string | null>(null)` (e.g., `const [error, setError] = useState('')`)
- Errors displayed inline in the UI
- No global error boundary in use

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**
- `console.error('[route-name] error:', err)` — prefixed with route identifier in brackets
- `console.log('=== SECTION ===')` — uppercase triple-equals markers for major debug sections (found in `app/api/wallet/route.ts`)
- `console.warn(...)` — for non-fatal issues (e.g., phone normalization failures)
- Debug-level `console.log` left in production code (wallet route has JSON.stringify logs)
- Error logging includes contextual identifiers (e.g., merchant ID, phone number)

## Comments

**When to Comment:**
- JSDoc-style `/** ... */` used for exported library functions in `lib/` (e.g., `lib/sendapp.ts`, `lib/whatsapp-automations.ts`)
- Inline `// comment` used for section separators within long files (e.g., `// ─── Phone normalization ───`)
- Route files use comment before export to describe method and payload (e.g., `// POST — { to: string, message: string }`)
- Page references in comments (e.g., `// Auto-start camera immediately after auth — STAMP-01`) linking to planning phase codes

**JSDoc example:**
```typescript
/**
 * Carica le credenziali SendApp del merchant dal DB, invia un messaggio,
 * e logga il risultato in whatsapp_logs.
 */
export async function sendWhatsAppToCustomer(...)
```

## Function Design

**Size:** Functions are typically 20–80 lines; longer handlers (100–250 lines) exist in complex pages like `app/stamp/page.tsx` and `app/api/whatsapp/incoming/route.ts`

**Parameters:** Direct destructuring from request body (no schema validation library like Zod); manual type checks with `typeof` guards

**Return Values:**
- API routes always return `NextResponse.json(...)` with explicit status codes
- Library functions return `Promise<void>` for fire-and-forget operations, typed return values for data-returning functions
- Null coalescing used heavily: `card?.current_stamps ?? card?.stamp_count ?? 0`

## Module Design

**Exports:**
- Named exports for library functions (e.g., `export function formatPhoneIT(...)`, `export async function sendTextMessage(...)`)
- Default exports for React components and Next.js pages (e.g., `export default function ProgramsPage()`)
- Named `export async function POST/GET/PATCH/DELETE` for API route handlers

**Barrel Files:**
- Not used; all imports reference specific file paths directly

## React Component Patterns

**'use client' directive:**
- All interactive dashboard pages include `'use client'` at the top
- Layout files (`app/dashboard/layout.tsx`) are Server Components (no directive)
- Public pages (`app/page.tsx`) are Server Components

**Data loading pattern:**
```typescript
const [data, setData] = useState<Type[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  loadData()
}, [])

async function loadData() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.push('/login'); return }
  // ... fetch and setData
  setLoading(false)
}
```

**Loading spinner pattern:**
```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full" />
    </div>
  )
}
```

**Post-mutation navigation:**
```typescript
router.refresh()   // invalidate Next.js App Router cache
router.push('/dashboard/programs')
```

## Tailwind CSS Patterns

**Design tokens (hardcoded, not CSS variables):**
- Background sidebar: `bg-[#111111]`
- Card border: `border-[#E8E8E8]`
- Card border radius: `rounded-[12px]` or `rounded-xl`
- Button border radius: `rounded-[8px]`
- Primary button: `bg-[#111111] text-white hover:bg-[#333333]`
- Page background: `bg-[#F5F5F5]`

**No Tailwind config file** — using Tailwind CSS 4 with PostCSS (`@tailwindcss/postcss`)

---

*Convention analysis: 2026-03-04*
