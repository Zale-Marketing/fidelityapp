# Testing Patterns

**Analysis Date:** 2026-03-02

## Test Framework

**Runner:** None installed

No test framework is present in this codebase. `package.json` contains no test dependencies (no Jest, Vitest, Playwright, Cypress, or any testing library). There are no test config files (`jest.config.*`, `vitest.config.*`, `playwright.config.*`). The `scripts` section has no `test` command.

**Test Files:** Zero test files found (no `*.test.*` or `*.spec.*` files anywhere in the project).

**Run Commands:**
```bash
# No test commands available
# Current scripts:
npm run dev     # Development server
npm run build   # Production build
npm run start   # Start production server
npm run lint    # ESLint only
```

## Manual Test Utilities

**`test-wallet.js`** at project root (`C:\Users\Zanni\fidelityapp\test-wallet.js`) — a one-off Node.js script for manually testing Google Wallet link generation. Not a test suite, not automated.

## Coverage

**Requirements:** None — no coverage tooling configured.

**Current state:** 0% automated test coverage. The codebase has no unit tests, integration tests, or end-to-end tests.

## What Exists Instead

**TypeScript as safety net:**
- `"strict": true` in `tsconfig.json` provides compile-time type checking
- `noEmit: true` means build will fail on type errors
- ESLint with `eslint-config-next/core-web-vitals` catches common React/Next.js issues

**Manual testing approach:**
- Debug `console.log` statements left in production code for manual inspection
- Debug sections marked `=== DEBUG ATTIVITÀ ===`, `=== WALLET DATA ===` in `app/dashboard/page.tsx` and `app/api/wallet/route.ts`
- `alert()` and `confirm()` for runtime feedback in `app/stamp/page.tsx`

## Areas That Would Benefit From Tests First

When tests are added to this project, these are the critical areas by risk level:

**High Priority - Core Business Logic:**
- Stamp/points/cashback calculation in `app/stamp/page.tsx` functions: `addStamp`, `addPoints`, `addCashback`, `addTierSpend`, `useSubscription`
- Idempotency key generation: `${card.id}-${Date.now()}` (not truly idempotent — collisions possible)
- Tier level assignment logic in `addTierSpend`
- Cashback/points balance arithmetic

**High Priority - API Routes:**
- `app/api/wallet/route.ts` — Google Wallet link generation
- `app/api/wallet-update/route.ts` — Wallet card update
- `app/api/stripe-checkout/route.ts` — Stripe checkout session creation
- `app/api/stripe-webhook/route.ts` — Stripe webhook event handling

**Medium Priority - Data Layer:**
- Supabase query patterns (would need mocking)
- Auth redirect flows (login/register/onboarding)

**Lower Priority:**
- UI rendering (no component library means components are large page files)

## Recommended Test Setup (When Adding Tests)

Based on the existing tech stack (Next.js 16, React 19, TypeScript), the recommended approach:

**Framework:** Vitest (compatible with Next.js App Router, fast, ESM-native)

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

**Config file location:** `vitest.config.ts` at project root

**Test file placement pattern:** Co-located with source files
```
app/
├── stamp/
│   ├── page.tsx
│   └── page.test.ts      # test stamp logic
lib/
├── google-wallet.ts
└── google-wallet.test.ts # test JWT generation, sanitizeId, etc.
```

**Mocking Supabase:**
```typescript
// Mock pattern needed for all page/API tests
vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    }))
  })
}))
```

**Example test for pure logic (no setup needed):**
```typescript
// lib/google-wallet.test.ts
import { describe, it, expect } from 'vitest'

describe('sanitizeId', () => {
  it('removes hyphens and truncates to 32 chars', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const result = sanitizeId(uuid)
    expect(result).not.toContain('-')
    expect(result.length).toBeLessThanOrEqual(32)
  })
})
```

**Example test for stamp calculation:**
```typescript
// Tests for the points calculation logic in stamp/page.tsx
describe('addPoints calculation', () => {
  it('calculates points earned from euros spent', () => {
    const eurosPerPoint = 2
    const amountSpent = 10
    const pointsEarned = Math.floor(amountSpent / eurosPerPoint)
    expect(pointsEarned).toBe(5)
  })
})
```

## Notes on Testability

**Current barriers to testing:**

1. **Large monolithic page components** — `app/stamp/page.tsx` (930 lines) mixes UI, business logic, and data fetching. Business logic functions (`addStamp`, `addPoints`, etc.) are defined inside the component and cannot be imported/tested in isolation.

2. **Heavy Supabase coupling** — All data operations call Supabase directly. No service layer or repository pattern to mock at a boundary.

3. **`any` type overuse** — 53 occurrences of `: any` across 13 files. Type-unsafe code is harder to test reliably.

4. **`Date.now()` in idempotency keys** — `idempotency_key: \`${card.id}-${Date.now()}\`` makes deterministic testing impossible without mocking `Date`.

5. **`alert()` / `confirm()` calls** — Browser globals used for confirmations in `app/stamp/page.tsx` require browser environment or mocking in tests.

---

*Testing analysis: 2026-03-02*
