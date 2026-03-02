# Phase 2: Merchant UX - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the existing dashboard and `/stamp` scanner work fluidly on smartphones for merchants (bar owners, cashiers). This covers:
- Responsive layout: every dashboard page readable on iPhone without zoom or horizontal scroll
- Visual consistency: buttons, cards, and forms share the same design language across all pages
- Scanner UX: camera auto-start, inline feedback, auto-reset between scans

NOT in scope: new features, new pages, backend changes, or analytics. This phase only improves existing screens.

</domain>

<decisions>
## Implementation Decisions

### Camera auto-start on /stamp
- Camera MUST start automatically when the page loads — zero taps needed before scanning
- Explicit success criterion: "Cassiere apre /stamp e la fotocamera parte senza click aggiuntivi"
- Fallback: if camera permission is denied or unavailable, fall back to manual code entry

### Post-scan auto-reset
- After a successful scan + confirmation, the page MUST reset automatically for the next customer
- Auto-reset after approximately 3 seconds (show countdown or progress indicator)
- No manual "Scan another card" button required — it happens automatically
- Explicit success criterion: "dopo ogni conferma la pagina si resetta automaticamente per la prossima"

### Scan feedback timing and style
- Green (success) or red (error) feedback MUST appear within 1 second of QR scan
- The feedback must be visually obvious — full-screen color fill or large colored banner, not just a small toast
- Explicit success criterion: "Cassiere riceve feedback visivo verde o rosso entro 1 secondo dalla scansione del QR"

### Inline amount input for points/cashback/tiers
- Already implemented: the amount input screen appears inline after scan, no navigation
- Keep this behavior — do not change the flow
- Explicit success criterion: "cassiere inserisce l'importo speso direttamente nella schermata di scansione"

### Design system approach
- NO new React component library or shared components/ folder needed
- Standardize Tailwind classes across existing pages: pick ONE set of values and apply consistently
- Target standards to lock in:
  - Border-radius: `rounded-2xl` for cards, `rounded-xl` for inputs/buttons (currently inconsistent: rounded-xl / rounded-2xl / rounded-3xl mixed)
  - Primary color: `indigo-600` (already the standard)
  - Button padding: `py-4` for large CTAs, `py-3` for secondary
  - Card shadow: `shadow-sm` for dashboard cards, `shadow-xl` for scanner overlays
- Apply to: dashboard, programs list, program detail, stamp scanner — all existing pages

### Mobile dashboard layout
- Dashboard pages must be usable on 375px width (iPhone SE) without horizontal scroll
- No new bottom navigation bar required — the existing header links are sufficient IF they're mobile-friendly
- Stats grid on dashboard: use `grid-cols-2` on mobile (already partially done)
- Quick action cards: stack to `grid-cols-2` on mobile, full-width on small screens

### Claude's Discretion
- Exact auto-reset countdown UX (spinner, number, progress bar)
- Whether to request camera permission proactively on page load or wait for auto-start attempt
- Exact animation/transition for success/error feedback
- Specific Tailwind spacing values for consistent padding (as long as they're consistent)
- Whether to add a simple mobile-friendly nav link at top of dashboard (e.g., prominent "Scanner" button)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `/stamp` page: already has `ScanMode` state machine (ready → scanning → processing → success/error/reward_ready) — extend this, don't rewrite
- `/stamp` page: already has `Html5Qrcode` integration with `{ facingMode: 'environment' }` — auto-start = call `startScanner()` in `useEffect` after auth check
- `/stamp` page: already has inline `input_amount` mode for points/cashback/tiers — keep it
- Dashboard `page.tsx`: has `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` stats grid — good starting point

### Established Patterns
- Auth check: `supabase.auth.getUser()` + router.push('/login') — consistent across pages
- Styling: Tailwind CSS only — no CSS modules, no styled-components
- State management: local `useState` hooks — no Redux/Zustand
- Colors: `indigo-600` primary, `green-500` success, `red-600` error (use these, don't add new colors)
- Large buttons: `w-full ... py-4 rounded-2xl font-bold` pattern in scanner — extend to dashboard

### Integration Points
- Scanner mode state: add auto-start to `checkAuth()` → after auth succeeds, call `startScanner()`
- Auto-reset: after `setMode('success')`, add `setTimeout(() => resetScanner(), 3000)`
- Dashboard responsive: add `px-4` on mobile, `px-6 md:px-8` on desktop; check each page's `max-w-*` container

</code_context>

<specifics>
## Specific Ideas

- The scanner page already has a good mobile-first design (indigo gradient, big buttons, rounded-3xl cards). The auto-start and auto-reset are purely behavioral changes — no visual redesign needed.
- The dashboard page is the main mobile problem: `max-w-7xl` container with `px-6` may cause horizontal scroll on small screens. Need to audit all dashboard sub-pages.
- Success criteria #6 says "3 scansioni consecutive" work — this is the auto-reset test. 3 seconds delay is a reasonable default (enough to read the feedback, short enough for a cashier's pace).

</specifics>

<deferred>
## Deferred Ideas

- Bottom tab navigation bar — not required by success criteria, defer to a future UX phase if needed
- Dark mode support — out of scope
- Custom color themes per merchant — out of scope (Phase 1 locked colors)
- Sound feedback on scan success — nice-to-have, not in success criteria

</deferred>

---

*Phase: 02-merchant-ux*
*Context gathered: 2026-03-02*
