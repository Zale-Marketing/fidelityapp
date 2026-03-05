# Testing Patterns

**Analysis Date:** 2026-03-05

## Test Framework

**Runner:** None configured.

No test framework is installed or configured in this project. There are no `jest.config.*`, `vitest.config.*`, or equivalent files. There are no `*.test.*` or `*.spec.*` files anywhere in the codebase.

The `package.json` has no test script and no testing devDependencies.

**Run Commands:**
```bash
# No test commands available
npm run lint    # Only automated quality check available
```

## Test File Organization

**Location:** No test files exist.

**Naming:** No convention established.

## Test Structure

No test suites, describe blocks, or test cases exist in the codebase.

## Mocking

No mocking infrastructure is set up.

## Fixtures and Factories

No test fixtures or factory functions exist.

## Coverage

**Requirements:** None enforced.

**Coverage tooling:** Not installed.

## Test Types

**Unit Tests:** None.

**Integration Tests:** None.

**E2E Tests:** None — no Playwright, Cypress, or similar tools installed.

## Manual Testing Patterns

While no automated tests exist, the following manual verification patterns are observable in the codebase:

**API test endpoints:**
- `app/api/whatsapp/test/route.ts` — manual WhatsApp send test endpoint (authenticated)
- `app/api/whatsapp/ai-test/route.ts` — simulates AI chatbot response (authenticated)

**In-dashboard test UI:**
- `app/dashboard/settings/whatsapp-ai/page.tsx` — chat interface for testing AI chatbot interactively

**Debug logging as substitute for tests:**
- `console.log('=== WALLET DATA ===')` and `console.log(JSON.stringify(walletData, null, 2))` in `app/api/wallet/route.ts`
- `console.log('[webhook] Payload: ...')` throughout `lib/webhooks.ts`
- Verbose trace logs in `app/api/webhooks/dispatch/route.ts`

## Adding Tests — Recommended Approach

If tests are to be added, the following setup is recommended based on the existing stack:

**Recommended framework:** Vitest (compatible with Next.js/TypeScript/ESM, fast, zero config)

**Install:**
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom
```

**Config file to create:** `vitest.config.ts`

**Suggested test locations:**
- Unit tests for lib utilities: `lib/__tests__/sendapp.test.ts`, `lib/__tests__/whatsapp-automations.test.ts`
- Unit tests for lib functions with pure logic: `lib/__tests__/webhooks.test.ts`
- Component tests: `components/__tests__/EmptyState.test.tsx`, `components/__tests__/MetricCard.test.tsx`

**Highest-value test targets (pure functions with no external deps):**
- `lib/sendapp.ts` → `formatPhoneIT()` — pure phone normalization logic
- `lib/whatsapp-automations.ts` → `interpolate()` — pure string template interpolation
- `lib/webhooks.ts` → webhook payload construction helpers

**Example test for `formatPhoneIT`:**
```typescript
import { describe, it, expect } from 'vitest'
import { formatPhoneIT } from '@/lib/sendapp'

describe('formatPhoneIT', () => {
  it('normalizes +39 prefix', () => {
    expect(formatPhoneIT('+393331234567')).toBe('393331234567')
  })
  it('normalizes 0039 prefix', () => {
    expect(formatPhoneIT('00393331234567')).toBe('393331234567')
  })
  it('adds 39 prefix to bare Italian mobile', () => {
    expect(formatPhoneIT('3331234567')).toBe('393331234567')
  })
  it('returns null for invalid number', () => {
    expect(formatPhoneIT('invalid')).toBeNull()
  })
})
```

**Example test for `interpolate`:**
```typescript
import { describe, it, expect } from 'vitest'
import { interpolate } from '@/lib/whatsapp-automations'

describe('interpolate', () => {
  it('replaces all variables', () => {
    const result = interpolate('Ciao {nome}! Hai {bollini} bollini su {programma}.', {
      nome: 'Mario',
      bollini: 5,
      programma: 'Caffè',
    })
    expect(result).toBe('Ciao Mario! Hai 5 bollini su Caffè.')
  })
  it('replaces missing variables with empty string', () => {
    const result = interpolate('Ciao {nome}!', {})
    expect(result).toBe('Ciao !')
  })
})
```

---

*Testing analysis: 2026-03-05*
