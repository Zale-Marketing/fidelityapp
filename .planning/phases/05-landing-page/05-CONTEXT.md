# Phase 5: Landing Page - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a self-service acquisition landing page at `/` (app/page.tsx) so that an external visitor (bar owner, ristorante, negozio, palestra) can discover FidelityApp, understand its value, and complete registration — all without Alessandro's involvement.

The `/register` page, `/onboarding` wizard, and all post-registration flows are already built and stay unchanged. This phase is exclusively about the public-facing landing page.

</domain>

<decisions>
## Implementation Decisions

### Copy & Language
- Use plain Italian throughout — never use "merchant". Say "attività", "negozio", "il tuo locale".
- Target audience explicitly named in headline and copy: bar, ristoranti, negozi, palestre.

### Above-fold value proposition
- Headline angle: audience-direct — "Bar, ristoranti e negozi: la carta fedeltà digitale per i tuoi clienti"
- Sub-headline: 1–2 lines supporting the headline (e.g. product description + "5 minuti per iniziare")
- Hero layout: headline + CTA on the left, CSS/HTML phone mockup on the right
- Phone mockup: illustrated with Tailwind (no screenshot PNG), shows a Google Wallet card with a loyalty card (brand name, stamp counter like "5 / 10 bollini")
- CTA button: "Inizia Gratis →" linking to /register

### Visual style
- White/light background — `bg-white`, `text-gray-900`, indigo accents
- Sections alternate `bg-white` and `bg-gray-50`
- Indigo (indigo-600) for CTAs, headings, and accent elements
- Drop the existing gradient background entirely

### Registration experience
- CTA links to `/register` (separate page — already exists and works)
- No inline form or modal needed

### Social proof bar
- Full-width strip between the hero and the 3-step flow section
- 3 stats displayed horizontally: "50+ attività attive" · "1.000+ carte emesse" · "5 tipi di programma"
- Numbers are static (hard-coded) — no DB query on the public page

### 3-step flow section
- Section title: something like "Come funziona" or "In 3 passi"
- Layout: 3 cards side by side (or stacked on mobile)
- Visual: indigo circle with number inside (1, 2, 3) — no emoji
- Steps:
  1. **Crei il programma** — Scegli il tipo (bollini, punti, cashback) e personalizzi i colori.
  2. **Il cliente scansiona il QR** — Con la fotocamera del telefono, senza app da scaricare.
  3. **Google Wallet si aggiorna** — La carta del cliente si aggiorna in tempo reale.

### Claude's Discretion
- Exact sub-headline copy (as long as it stays audience-direct and in plain Italian)
- Spacing, typography scale, and section padding
- Mobile responsiveness details (stacking order, breakpoints)
- Footer content (can be minimal: copyright + login link)
- Whether to include a second CTA at the bottom of the page

</decisions>

<specifics>
## Specific Ideas

- Use "attività" or "negozio" everywhere — never "merchant", even in code comments/alt text visible to users.
- The phone mockup should feel like a real Google Wallet card: colored card, brand name, stamp count. Bar Roma, 5/10 bollini is a good concrete example.
- The social proof bar should feel like a quiet trust signal, not a boast — small text, muted style.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/page.tsx`: Existing landing page — will be fully replaced. Has the correct route, nav structure, and Link imports to reuse.
- `app/register/page.tsx`: Complete registration form — untouched. CTA just links here.
- `app/onboarding/page.tsx`: Post-registration wizard — untouched. Register already redirects here.

### Established Patterns
- Tailwind CSS utility classes throughout (no component library)
- `rounded-xl`, `shadow-lg`, `font-semibold` — consistent card/button rounding
- `text-indigo-600`, `bg-indigo-600`, `hover:bg-indigo-700` — established CTA color pattern
- `bg-white ... rounded-xl shadow-lg` — white card pattern (used in register/login pages)
- No shared layout component — each page is self-contained

### Integration Points
- Landing page is `app/page.tsx` (root route `/`)
- Nav "Accedi" → `/login`, "Inizia Gratis" → `/register` (keep these links)
- No auth required on this page — purely public/static

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-landing-page*
*Context gathered: 2026-03-02*
