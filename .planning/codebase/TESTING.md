# Testing Patterns

**Analysis Date:** 2026-03-04

## Test Framework

**Runner:** None configured

No test runner (Jest, Vitest, Playwright, Cypress) is installed or configured in this project. The `package.json` contains no test dependencies and no `test` script.

**Assertion Library:** None

**Run Commands:**
```bash
# No test commands available
# package.json scripts: dev, build, start, lint only
npm run lint    # Only automated quality check available
```

## Test File Organization

**Location:** No test files exist in the project source

There are zero `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files outside of `node_modules`. No `__tests__` directories exist in the project source.

**Naming:** Not applicable — no tests

**Structure:** Not applicable

## Test Structure

No test suites exist. The project has no testing infrastructure.

## Mocking

**Framework:** None

No mocking library is configured or used.

## Fixtures and Factories

**Test Data:** None

No fixture files, factory functions, or seed data utilities exist for testing purposes.

**Location:** Not applicable

## Coverage

**Requirements:** None enforced

No coverage thresholds or reporting configured.

## Test Types

**Unit Tests:** None

**Integration Tests:** None

**E2E Tests:** None — no Playwright, Cypress, or similar framework installed

## Manual Testing Approach

While automated tests are absent, the codebase includes one in-product manual testing tool:

**AI Chatbot Test UI** (`app/dashboard/settings/whatsapp-ai/page.tsx`):
- Provides a live chat interface in the dashboard to simulate WhatsApp AI chatbot responses
- Calls `POST /api/whatsapp/ai-test` with `Authorization: Bearer {session.access_token}`
- Displays conversation thread with user/assistant bubbles
- Tests the real AI provider (OpenAI or Anthropic) configured by the merchant

**Webhook Dispatch** (`app/api/webhooks/dispatch/route.ts`):
- Can be called manually with `{ merchantId, event, data }` to test webhook delivery

## What Would Need Testing (Not Currently Tested)

The following critical paths have no test coverage:

**High-risk untested logic:**
- `lib/sendapp.ts` — `formatPhoneIT()` phone normalization (pure function, easy to unit test)
- `lib/whatsapp-automations.ts` — `interpolate()` template variable substitution (pure function)
- `app/api/wallet/route.ts` — Google Wallet JWT generation
- `app/api/stripe-webhook/route.ts` — plan upgrade/downgrade logic based on Stripe events
- `app/api/whatsapp/incoming/route.ts` — command routing and AI fallback logic (250+ lines)
- Soft delete filtering (`deleted_at IS NULL`) consistency across all queries

**If tests were to be added, the recommended approach would be:**
1. Install Vitest (compatible with Next.js + TypeScript, no extra config needed)
2. Unit test pure functions in `lib/` first (`formatPhoneIT`, `interpolate`)
3. Integration test API routes using `next-test-api-route-handler` or MSW
4. E2E test critical user flows (join program, stamp card, add to wallet) with Playwright

## Linting as Quality Gate

The only automated code quality enforcement is ESLint:

```bash
npm run lint    # Runs: eslint (on all project files)
```

Config: `eslint.config.mjs` uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.

TypeScript strict mode (`"strict": true` in `tsconfig.json`) provides compile-time type checking as an additional quality gate, run implicitly during `next build`.

---

*Testing analysis: 2026-03-04*
