# Phase 9: Business Tools - Research

**Researched:** 2026-03-03
**Domain:** Plan gating system, Google Reviews integration, upgrade UX
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REVIEW-01 | Campo google_reviews_url (opzionale) nella tabella programs e nel form crea/modifica programma | SQL migration pattern established; edit page already has other URL fields (externalRewardsUrl, termsUrl, websiteUrl) to follow |
| REVIEW-02 | Dopo riscatto premio in /c/[token] appare banner con link recensione — solo se google_reviews_url compilato | /c/[token]/page.tsx confirmed; need to detect "redeem" event and show banner conditionally |
| PLAN-01 | Colonna plan (text, default 'free') nella tabella merchants — valori: 'free', 'pro', 'business' | Column already exists and used in new/page.tsx: merchant?.plan === 'PRO'; PLAN-01 may already be partially done but needs verification + business tier |
| PLAN-02 | Hook usePlan() legge piano del merchant corrente da Supabase | No hook exists yet; pattern to extract from inline checks in billing/page.tsx and new/page.tsx |
| PLAN-03 | Componente UpgradePrompt mostra "Funzionalità disponibile nel piano PRO — Aggiorna ora" | Inline block exists in programs/new but not a reusable component; pattern clear from existing code |
| PLAN-04 | Pagina /dashboard/upgrade con confronto Free/Pro/Business e prezzi | /dashboard/billing already shows Free+Pro comparison; need new /upgrade page with 3-tier comparison at correct prices |
| PLAN-05 | Feature gating applicato su push, WhatsApp, segmentazione, birthday, reviews, CSV; FREE limits | billing/page.tsx shows old limits (5 programs); requirements say FREE = max 1 programma solo bollini |
</phase_requirements>

---

## Summary

Phase 9 adds two lightweight but important features: Google Reviews link collection and a formal plan gating system. The codebase already contains partial implementations of both — the `plan` column exists on `merchants`, inline plan checks exist in `programs/new/page.tsx` and `billing/page.tsx`, and the billing page already has a Free/Pro comparison. The key work is: (1) formalizing partial implementations into reusable patterns, (2) adding the `google_reviews_url` column to `programs` and wiring it into forms and the customer card page, (3) building a proper `usePlan()` hook and `UpgradePrompt` component, and (4) creating the `/dashboard/upgrade` page with the correct 3-tier pricing (Free €0 / Pro €39 / Business €99).

**Critical discrepancy found:** The existing billing page (`billing/page.tsx`) shows FREE plan as "Fino a 5 programmi" and PRO at "€19/mese". The STATE.md decisions say FREE = max 1 programma (solo bollini) / max 50 carte / no push, and the REQUIREMENTS.md says PRO = €39/mese and BUSINESS = €99/mese. The new `/dashboard/upgrade` page must use the correct prices from REQUIREMENTS.md (€39/€99). The existing billing page is NOT modified as part of this phase — PLAN-04 creates a new /dashboard/upgrade page.

**Primary recommendation:** Build in order — SQL migration first, then `usePlan()` hook, then `UpgradePrompt` component, then wire reviews into programs forms, then wire reviews banner into /c/[token], then build /dashboard/upgrade page, then apply UpgradePrompt gates on existing dashboard pages.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.6 | Pages and layout | Already in use |
| React | 19.2.3 | UI components | Already in use |
| Supabase JS | ^2.93.2 | DB reads for plan data | Already in use |
| Tailwind CSS | ^4 | Styling | Already in use |
| Lucide React | ^0.576.0 | Icons (Lock, ArrowRight, etc.) | Already in use, DESIGN-01 compliance |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Next.js Link | built-in | CTA links to /dashboard/upgrade | All internal navigation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom usePlan() hook | Zustand/Context | Hook is simpler — no extra state library needed for one value |
| New /dashboard/upgrade page | Modify /dashboard/billing | Billing handles Stripe flow; upgrade is discovery/marketing page; keep separate |

**Installation:** No new packages required. All needed libraries already installed.

---

## Architecture Patterns

### Recommended Project Structure (new files for Phase 9)

```
lib/
└── hooks/
    └── usePlan.ts            # New: reads merchant plan from Supabase

components/
└── ui/
    └── UpgradePrompt.tsx     # New: reusable gating component

app/
└── dashboard/
    └── upgrade/
        └── page.tsx          # New: 3-tier pricing comparison page
```

Files modified:
```
app/dashboard/programs/new/page.tsx   # Add google_reviews_url field + update plan check limit from 5 to 1
app/dashboard/programs/[id]/edit/page.tsx  # Add google_reviews_url field
app/c/[token]/page.tsx                # Add reviews banner after redeem state detection
```

### Pattern 1: usePlan() Hook

**What:** Client-side React hook that loads merchant plan from Supabase and returns plan string and boolean helpers.

**When to use:** Any dashboard page that needs to gate features behind a plan.

**Example:**
```typescript
// lib/hooks/usePlan.ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Plan = 'free' | 'pro' | 'business'

export function usePlan() {
  const [plan, setPlan] = useState<Plan>('free')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadPlan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('merchant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.merchant_id) { setLoading(false); return }

      const { data: merchant } = await supabase
        .from('merchants')
        .select('plan')
        .eq('id', profile.merchant_id)
        .single()

      if (merchant?.plan) {
        setPlan((merchant.plan as string).toLowerCase() as Plan)
      }
      setLoading(false)
    }

    loadPlan()
  }, [])

  return {
    plan,
    loading,
    isFree: plan === 'free',
    isPro: plan === 'pro' || plan === 'business',
    isBusiness: plan === 'business',
  }
}
```

### Pattern 2: UpgradePrompt Component

**What:** Reusable component shown in place of a gated feature. Shows feature name, plan required, and CTA.

**When to use:** Any page where a feature should be blocked for FREE merchants.

**Example:**
```typescript
// components/ui/UpgradePrompt.tsx
import Link from 'next/link'
import { Lock } from 'lucide-react'

interface UpgradePromptProps {
  feature: string         // e.g., "Notifiche Push"
  requiredPlan?: 'PRO' | 'BUSINESS'
}

export default function UpgradePrompt({ feature, requiredPlan = 'PRO' }: UpgradePromptProps) {
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="w-12 h-12 bg-[#FEF3C7] rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock size={20} className="text-yellow-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Funzionalità {requiredPlan}
      </h2>
      <p className="text-gray-600 mb-6">
        {feature} è disponibile nel piano {requiredPlan}. Aggiorna per sbloccarla.
      </p>
      <Link
        href="/dashboard/upgrade"
        className="inline-block bg-[#111111] text-white px-6 py-3 rounded-[8px] font-semibold text-sm hover:bg-[#333333] transition-colors"
      >
        Vedi Piani e Prezzi
      </Link>
    </div>
  )
}
```

### Pattern 3: Google Reviews Banner in /c/[token]

**What:** Conditional banner shown after a prize is redeemed. Reads `google_reviews_url` from the already-loaded `program` state.

**When to use:** After detecting that card status is `reward_ready` or `completed`, AND `program.google_reviews_url` is set.

**Example:**
```typescript
// Inside /c/[token]/page.tsx, after the per-type KPI content
{(card.status === 'reward_ready' || card.status === 'completed') &&
  (program as any).google_reviews_url && (
  <div className="border-t border-dashed p-6 text-center">
    <p className="text-sm font-semibold text-gray-800 mb-1">
      Ti e piaciuto? Lascia una recensione!
    </p>
    <p className="text-xs text-gray-500 mb-3">
      Aiuta altri clienti a scoprirci
    </p>
    <a
      href={(program as any).google_reviews_url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block bg-[#111111] text-white px-5 py-2.5 rounded-[8px] text-sm font-semibold hover:bg-[#333333] transition-colors"
    >
      Lascia una Recensione su Google
    </a>
  </div>
)}
```

**Note:** No emoji in the banner text — DESIGN-01 rule. Use Lucide icon if needed (Star icon).

### Pattern 4: google_reviews_url Form Field

**What:** Optional URL input added to both the new program form and the edit form, in the "Link e Google Wallet" section where other URLs already live.

**When to use:** In `new/page.tsx` step 2 and `edit/page.tsx` form.

**Example (state variable):**
```typescript
const [googleReviewsUrl, setGoogleReviewsUrl] = useState('')

// In programData:
google_reviews_url: googleReviewsUrl || null,
```

### Pattern 5: /dashboard/upgrade Page

**What:** Marketing/discovery page with 3-column plan comparison. Separate from /dashboard/billing which handles Stripe subscriptions.

**Correct pricing** (from REQUIREMENTS.md and STATE.md):
- FREE: €0/mese — 1 programma (solo bollini), max 50 carte, no push, branding Zale
- PRO: €39/mese — tutto illimitato, push, WhatsApp, segmentazione, birthday, reviews, CSV
- BUSINESS: €99/mese — tutto PRO + webhook + API pubblica

**CTA on upgrade page:** Link to /dashboard/billing for actual payment flow.

### Anti-Patterns to Avoid

- **Modifying /dashboard/billing pricing display:** The billing page shows €19/mese (old price). PLAN-04 is a NEW page at /dashboard/upgrade with correct prices. Do not modify billing page pricing as part of this phase.
- **Checking `merchant?.plan === 'PRO'` case-sensitively:** The plan column values could be stored as 'free'/'pro'/'business' (lowercase). The billing page uses `merchant?.plan === 'PRO'` (uppercase). The usePlan() hook must normalize with `.toLowerCase()` to be safe.
- **Blocking redeem in /c/[token]:** The reviews banner is shown AFTER the reward is visible — not instead of it. The banner is additive only.
- **Adding google_reviews_url to the LOCKED section of edit form:** The edit form has a "locked" section (logo, name, color). google_reviews_url goes in the editable "links" section.
- **Using nested Supabase queries in Edge runtime:** Not applicable here (no edge routes involved), but maintain the pattern for new queries.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plan state management | Custom Context/Redux | usePlan() hook returning from Supabase | Single value, no cross-component subscription needed |
| URL validation for google_reviews_url | Custom regex | HTML `type="url"` input + optional validation | Browser validation sufficient for optional field |
| Feature gate UI | Per-page custom blocks | Reusable UpgradePrompt component | Consistency across /dashboard/notifications, /dashboard/cards (SEG), etc. |

**Key insight:** This phase is predominantly UI wiring, not new infrastructure. The database, auth, and Supabase patterns are all established — the work is creating reusable components that formalize what's already done inline.

---

## Common Pitfalls

### Pitfall 1: Plan column case mismatch
**What goes wrong:** `merchant?.plan === 'PRO'` fails when DB stores `'pro'` (lowercase).
**Why it happens:** The existing billing page checks `merchant?.plan === 'PRO'` uppercase. The REQUIREMENTS.md says values are 'free', 'pro', 'business' lowercase.
**How to avoid:** In usePlan(), always normalize: `(merchant.plan as string).toLowerCase()`. The hook's `isPro` computed value then handles case uniformly.
**Warning signs:** Plan shows as FREE even after upgrade in development.

### Pitfall 2: PLAN-05 limit discrepancy (5 programs vs 1 program)
**What goes wrong:** The existing `programs/new/page.tsx` blocks FREE at 5 programs (`count >= 5`). REQUIREMENTS.md PLAN-05 says FREE = max 1 programma (solo bollini).
**Why it happens:** The original implementation predates the v2.0 plan redefinition. The STATE.md decisions confirm the new limits.
**How to avoid:** When applying PLAN-05, update the threshold in `programs/new/page.tsx` from `count >= 5` to `count >= 1`. Also restrict to 'stamps' type only.
**Warning signs:** FREE merchant can create more than 1 program or non-stamps type.

### Pitfall 3: google_reviews_url not in programs table
**What goes wrong:** Inserting/updating with `google_reviews_url` field fails with Supabase "column does not exist" error.
**Why it happens:** The column needs to be added via SQL migration before the code is deployed.
**How to avoid:** Document the SQL migration in MANUAL-ACTIONS.md and execute it in Supabase before deploying. SQL: `ALTER TABLE programs ADD COLUMN IF NOT EXISTS google_reviews_url text;`
**Warning signs:** Supabase returns error on program create/update after deploying the form changes.

### Pitfall 4: Reviews banner shows for wrong card status
**What goes wrong:** Banner shows when card is merely `active` (not yet redeemed).
**Why it happens:** Wrong condition check — checking presence of `google_reviews_url` alone without checking reward state.
**How to avoid:** Gate on BOTH: `(card.status === 'reward_ready' || card.status === 'completed') && program.google_reviews_url`.
**Warning signs:** Banner appears before prize is available.

### Pitfall 5: Emoji in UpgradePrompt or reviews banner (DESIGN-01 violation)
**What goes wrong:** Using emoji like 🔒 or ⭐ in the new components breaks DESIGN-01.
**Why it happens:** Forgetting the design system rule from Phase 7.
**How to avoid:** Use Lucide icons (`Lock`, `Star`, `ArrowRight`) instead of emoji in all new components.
**Warning signs:** Any `🔒` or similar emoji character in JSX.

### Pitfall 6: /dashboard/upgrade vs /dashboard/billing confusion
**What goes wrong:** PLAN-03/04 requirement says UpgradePrompt links to upgrade page; but /dashboard/billing already exists and has plan comparison.
**Why it happens:** Two different pages serving similar purposes.
**How to avoid:** /dashboard/upgrade is the NEW marketing/discovery page with 3-tier comparison (Free/Pro/Business at €0/€39/€99). /dashboard/billing handles the actual Stripe payment flow and current subscription management. UpgradePrompt links to /dashboard/upgrade. The upgrade page's CTAs link to /dashboard/billing.
**Warning signs:** Redirecting UpgradePrompt directly to /dashboard/billing skips the comparison page.

---

## Code Examples

### SQL Migration for google_reviews_url

```sql
-- Add to Supabase via SQL editor (document in MANUAL-ACTIONS.md)
ALTER TABLE programs
ADD COLUMN IF NOT EXISTS google_reviews_url text;
```

### Confirm plan column exists on merchants

```sql
-- Verify column exists (should already be present per STATE.md)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'merchants' AND column_name = 'plan';

-- If missing:
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';
```

### programs/new/page.tsx plan check update (PLAN-05)

```typescript
// Current code (to be updated):
if (merchantData?.plan !== 'PRO' && count >= 5) {
  setPlanBlocked(true)
}

// Updated code for PLAN-05 (FREE = max 1 program, stamps only):
const planValue = (merchantData?.plan || 'free').toLowerCase()
if (planValue === 'free' && count >= 1) {
  setPlanBlocked(true)
}
```

### programs/new/page.tsx type restriction (PLAN-05)

```typescript
// FREE merchants should only see stamps type
// When planBlocked is checked, show UpgradePrompt
// Also: if free and non-stamps selected, show upgrade prompt inline
const isFree = (merchantData?.plan || 'free').toLowerCase() === 'free'

// In PROGRAM_TYPES selector render — grey out non-stamps for free:
const isLocked = isFree && type.id !== 'stamps'
```

### Supabase query pattern for usePlan (already established)

```typescript
// Client-side (browser), follows existing pattern in billing/page.tsx:
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('merchant_id')
  .eq('id', user.id)
  .single()
const { data: merchant } = await supabase
  .from('merchants')
  .select('plan')
  .eq('id', profile.merchant_id)
  .single()
```

### /dashboard/upgrade page structure (3-tier comparison)

```typescript
// Plans config for /dashboard/upgrade/page.tsx
const PLANS = [
  {
    id: 'free',
    name: 'FREE',
    price: 0,
    period: 'mese',
    features: [
      '1 programma (solo bollini)',
      'Max 50 carte clienti',
      'Google Wallet',
      'Scanner QR',
    ],
    locked: [
      'Notifiche push',
      'WhatsApp Marketing',
      'Segmentazione clienti',
      'Recensioni Google',
      'Analytics avanzate',
      'Export CSV',
    ],
    cta: null,  // Already on free
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 39,
    period: 'mese',
    popular: true,
    features: [
      'Programmi illimitati',
      'Clienti illimitati',
      'Google Wallet',
      'Scanner QR',
      'Notifiche push',
      'WhatsApp Marketing',
      'Segmentazione clienti',
      'Automazione compleanno',
      'Recensioni Google',
      'Analytics avanzate',
      'Export CSV',
    ],
    cta: { label: 'Attiva PRO', href: '/dashboard/billing' },
  },
  {
    id: 'business',
    name: 'BUSINESS',
    price: 99,
    period: 'mese',
    features: [
      'Tutto il piano PRO',
      'Webhook integrations',
      'API pubblica',
      'Multi-sede',
      'White-label',
    ],
    cta: { label: 'Attiva BUSINESS', href: '/dashboard/billing' },
  },
]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline plan check in each page | usePlan() hook + UpgradePrompt component | Phase 9 | DRY — add gating to new pages without repeating Supabase query |
| planBlocked inline block in programs/new | Reusable UpgradePrompt component | Phase 9 | Consistent UX across all gated features |
| No google_reviews_url field | programs table column + form field + banner | Phase 9 | Revenue-driving: post-redeem reviews increase merchant Google rating |

**Deprecated/outdated:**
- Inline `planBlocked` div in `programs/new/page.tsx` — replace with `<UpgradePrompt>` component after it's built.
- Hardcoded `count >= 5` plan limit in programs/new — update to `count >= 1` per PLAN-05.

---

## Open Questions

1. **Does `plan` column already have 'business' as valid value?**
   - What we know: Column exists (used in billing/page.tsx with `=== 'PRO'`), default is 'free'.
   - What's unclear: Whether the CHECK constraint allows 'business' — the column was added for earlier Stripe work.
   - Recommendation: In the SQL verification step, check if a constraint exists: `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE '%merchants%plan%';`. If no constraint, any string value works. If constraint exists, add 'business' to it.

2. **What triggers showing the reviews banner — card status vs stamp action?**
   - What we know: `/c/[token]/page.tsx` polls every 5 seconds and shows `card.status`. The status `reward_ready` is set externally when stamps reach threshold.
   - What's unclear: Does the page need to detect a "just redeemed" transition, or is static `reward_ready` status sufficient?
   - Recommendation: Use static check (`card.status === 'reward_ready'`) — simpler, no transition detection needed. The banner is informational and is fine showing whenever prize is ready.

3. **FREE plan: 1 program or 5 programs?**
   - What we know: REQUIREMENTS.md PLAN-05 says FREE = max 1 programma. STATE.md confirms. But existing code at programs/new blocks at 5.
   - What's unclear: Whether Alessandro explicitly wants to restrict existing FREE merchants with 2-4 programs retroactively.
   - Recommendation: Apply the limit of 1 to NEW program creation (threshold check). Existing programs are not deleted. This matches the FAQ in billing.tsx: "Solo i programmi oltre il 5° vengono messi in pausa" — adapt message for new limit.

---

## Validation Architecture

Skipped — `workflow.nyquist_validation` is `false` in `.planning/config.json`.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `app/dashboard/programs/new/page.tsx` (confirmed plan check at line 147, planBlocked UI at line 334)
- Direct codebase inspection — `app/dashboard/billing/page.tsx` (confirmed isPro check, plan comparison UI)
- Direct codebase inspection — `app/c/[token]/page.tsx` (confirmed page structure, card status usage, program data access)
- Direct codebase inspection — `app/dashboard/programs/[id]/edit/page.tsx` (confirmed form structure, URL field pattern)
- `.planning/REQUIREMENTS.md` — PLAN-01..05 and REVIEW-01..02 exact descriptions
- `.planning/STATE.md` — Accumulated decisions: plan pricing (PRO €39, BUSINESS €99), feature matrix

### Secondary (MEDIUM confidence)
- `lib/types.ts` — Program type does NOT include `google_reviews_url` (confirms column not yet in schema)
- `components/ui/` — EmptyState, MetricCard, StatusBadge patterns confirm existing UI component conventions

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — patterns derived directly from existing codebase code (not hypothetical)
- Pitfalls: HIGH — confirmed by reading actual code (case mismatch, limit discrepancy, column missing)

**Research date:** 2026-03-03
**Valid until:** 2026-06-01 (stable stack, no fast-moving dependencies)
