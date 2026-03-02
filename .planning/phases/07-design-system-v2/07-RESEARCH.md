# Phase 7: Design System v2 - Research

**Researched:** 2026-03-03
**Domain:** Next.js 16 App Router dashboard UI refactoring — Tailwind CSS 4, Lucide React, shared layout component
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DESIGN-01 | Zero emoji in tutta la dashboard — tutte sostituite con icone Lucide React | Lucide React 0.475+ ha tutte le icone necessarie; pattern di sostituzione documentati per ogni pagina |
| DESIGN-02 | Sidebar sinistra fissa 240px sfondo #111111 testo bianco, hover #1E1E1E, active #2A2A2A, icone Lucide + label | Next.js App Router layout nesting permette dashboard layout condiviso; sidebar richiede `'use client'` per active state con usePathname |
| DESIGN-03 | Area contenuto sfondo #F5F5F5 in tutte le pagine dashboard | Implementato nel dashboard layout wrapper; ogni page.tsx rimuove il proprio `min-h-screen bg-gray-*` override |
| DESIGN-04 | Cards metriche bianche, border 1px solid #E8E8E8, border-radius 12px, padding 24px, shadow 0 1px 3px rgba(0,0,0,0.08) | Componente MetricCard riutilizzabile; stili Tailwind inline con exact values in Tailwind v4 |
| DESIGN-05 | Tabelle — header #F9F9F9, righe bianche, bordo #F0F0F0, zero zebra stripes | Pattern table standardizzato; rimozione di `divide-y` e `hover:bg-gray-50` zebra dal codice attuale |
| DESIGN-06 | Bottoni primari #111111 bianco hover #333333 radius 8px; secondari bordo #E0E0E0 hover #F5F5F5 | Componente Button riutilizzabile o classi Tailwind standardizzate; sostituisce tutti gli `bg-indigo-600` attuali |
| DESIGN-07 | Font Inter su body, titoli text-2xl font-semibold, subtitles text-sm text-gray-500 | Inter già disponibile in Next.js via next/font/google; attuale layout usa Geist — da sostituire o affiancare |
| DESIGN-08 | Form inputs border #E0E0E0 radius 8px focus border #111111 outline none padding 12px | Pattern input standardizzato; attualmente scattered tra le pagine con `focus:ring-indigo-500` diversi |
| DESIGN-09 | Badge/status pills — verde #DCFCE7/#16A34A attivo; grigio inattivo; rosso #FEE2E2/#DC2626 scaduto | Componente StatusBadge riutilizzabile; attualmente ogni pagina ha i propri stili badge |
| DESIGN-10 | Empty states — icona Lucide 48px colore #D1D5DB centrata + testo descrittivo, zero emoji | Componente EmptyState riutilizzabile con prop icon, title, description, action |
| DESIGN-11 | Design system applicato a tutte le pagine in app/dashboard/ e tutti i componenti dashboard | 11 file page.tsx da aggiornare + 1 layout condiviso da creare |
</phase_requirements>

---

## Summary

Il progetto usa Next.js 16 (App Router) con Tailwind CSS 4 e attualmente NON ha un layout condiviso per la dashboard — ogni `page.tsx` gestisce il proprio header e navigazione in modo completamente indipendente. L'intera dashboard è costruita con emoji come icone (🎯, 👥, 📊, 📢, ⚙️), colori indigo predominanti, e stili inconsistenti tra le 11 pagine.

Il lavoro principale di questa fase è: (1) creare un `app/dashboard/layout.tsx` con sidebar nera fissa da 240px che avvolge tutte le pagine dashboard, (2) installare e integrare `lucide-react` per sostituire tutte le emoji con icone SVG, (3) creare un piccolo set di componenti UI riutilizzabili (`MetricCard`, `StatusBadge`, `EmptyState`) in `components/ui/`, (4) aggiornare tutte le 11 pagine dashboard per usare il nuovo design system.

Non ci sono dipendenze esterne da installare oltre a `lucide-react`. Tailwind CSS 4 è già installato e supporta pienamente i valori arbitrari (arbitrary values) necessari per i token di design specifici (#111111, #E8E8E8, ecc.). Non sono necessarie migrazioni di database.

**Primary recommendation:** Creare prima il dashboard layout con sidebar, poi i componenti UI riutilizzabili, poi aggiornare le pagine una alla volta in ordine di importanza (dashboard home → programs → customers → altri).

---

## Current State Audit

### Codebase esistente — Situazione Attuale

**File dashboard (11 page.tsx da aggiornare):**
- `app/dashboard/page.tsx` — Dashboard home, molte emoji (👋, ⚡, 🏆, 🎯, 👥, 📢, 📊, 🚀)
- `app/dashboard/programs/page.tsx` — Lista programmi, emoji per tipi (🎫, ⭐, 💰, 👑, 🔄)
- `app/dashboard/programs/new/page.tsx` — Crea programma, emoji per tipo selezione
- `app/dashboard/programs/[id]/page.tsx` — Dettaglio programma, molte emoji
- `app/dashboard/programs/[id]/edit/page.tsx` — Modifica programma, emoji
- `app/dashboard/customers/page.tsx` — Lista clienti, emoji (👥, 📧, 📱, 🏷️, ✅, ➕)
- `app/dashboard/customers/[id]/page.tsx` — Dettaglio cliente, emoji
- `app/dashboard/notifications/page.tsx` — Notifiche, emoji
- `app/dashboard/analytics/page.tsx` — Analytics, emoji (📊, 🎫, ⭐, 💰, 👑, 🔄, 📈)
- `app/dashboard/billing/page.tsx` — Billing, emoji (🚀, ✓, ✗)
- `app/dashboard/settings/page.tsx` — Impostazioni, emoji

**Problemi riscontrati:**
- NESSUN `app/dashboard/layout.tsx` — ogni pagina ha il proprio header standalone con "← Dashboard" link
- Font: il root layout usa `Geist` (non Inter come richiesto da DESIGN-07)
- Colori: `bg-indigo-600` è il primario ovunque; da sostituire con `bg-[#111111]`
- Sidebar: non esiste — navigazione tramite link "← Dashboard" in ogni pagina
- Empty states: mix di emoji e testo, nessun componente condiviso
- `lucide-react` NON è installato

### Pattern Colori Attuale vs Target

| Elemento | Attuale | Target (DESIGN spec) |
|----------|---------|---------------------|
| Primario buttons | `bg-indigo-600 hover:bg-indigo-700` | `bg-[#111111] hover:bg-[#333333]` |
| Sfondo pagina | `bg-gray-50` o `bg-gray-100` | `bg-[#F5F5F5]` |
| Card metriche | `bg-white p-4 rounded-2xl shadow-sm` | `bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]` |
| Table header | `bg-gray-50` | `bg-[#F9F9F9]` |
| Table border | `divide-y` | `border border-[#F0F0F0]` (nessun zebra) |
| Badge attivo | `bg-green-100 text-green-700` | `bg-[#DCFCE7] text-[#16A34A]` |
| Badge inattivo | `bg-gray-100 text-gray-500` | grigio neutro |
| Badge scaduto | mancante | `bg-[#FEE2E2] text-[#DC2626]` |
| Focus input | `focus:ring-2 focus:ring-indigo-500` | `focus:border-[#111111] outline-none` |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lucide-react | ^0.475.0 | Icone SVG per sostituire tutte le emoji | Standard de facto per Next.js/React, tree-shakeable, 1500+ icone, TypeScript-native |
| next/font/google | built-in Next.js 16 | Font Inter | Già integrato, zero overhead, ottimizza automaticamente |
| Tailwind CSS 4 | ^4 (già installato) | Utility classes + arbitrary values | Già nel progetto, v4 supporta `bg-[#111111]` direttamente |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/navigation usePathname | built-in | Active state sidebar | Richiesto per evidenziare il link attivo nella sidebar |

### Lucide Icons Map (emoji → icona)
| Emoji | Contesto | Lucide Icon | Import |
|-------|---------|-------------|--------|
| 👋 | Saluto | `User` o rimuovere | `import { User } from 'lucide-react'` |
| 🎯 | Programmi | `Target` | `import { Target } from 'lucide-react'` |
| 👥 | Clienti | `Users` | `import { Users } from 'lucide-react'` |
| 📢 | Notifiche | `Bell` | `import { Bell } from 'lucide-react'` |
| 📊 | Analytics | `BarChart2` | `import { BarChart2 } from 'lucide-react'` |
| ⚙️ | Impostazioni | `Settings` | `import { Settings } from 'lucide-react'` |
| 💳 | Cards/Billing | `CreditCard` | `import { CreditCard } from 'lucide-react'` |
| 📷 | Scanner QR | `ScanLine` | `import { ScanLine } from 'lucide-react'` |
| 🎫 | Bollini/Stamps | `Stamp` | `import { Stamp } from 'lucide-react'` |
| ⭐ | Punti | `Star` | `import { Star } from 'lucide-react'` |
| 💰 | Cashback | `Coins` | `import { Coins } from 'lucide-react'` |
| 👑 | Tiers VIP | `Crown` | `import { Crown } from 'lucide-react'` |
| 🔄 | Abbonamento | `RefreshCw` | `import { RefreshCw } from 'lucide-react'` |
| ⚡ | Attività | `Zap` | `import { Zap } from 'lucide-react'` |
| 🏆 | Top clienti | `Trophy` | `import { Trophy } from 'lucide-react'` |
| 🏷️ | Tag | `Tag` | `import { Tag } from 'lucide-react'` |
| ➕ | Aggiungi | `Plus` | `import { Plus } from 'lucide-react'` |
| 📈 | Grafico | `TrendingUp` | `import { TrendingUp } from 'lucide-react'` |
| 📧 | Email | `Mail` | `import { Mail } from 'lucide-react'` |
| 📱 | Telefono | `Phone` | `import { Phone } from 'lucide-react'` |
| 🗑️ | Elimina | `Trash2` | `import { Trash2 } from 'lucide-react'` |
| ✓ / ✅ | Check | `Check` o `CheckCircle` | `import { Check } from 'lucide-react'` |
| ✗ | X/No | `X` o `XCircle` | `import { X } from 'lucide-react'` |
| 🚀 | CTA/Upgrade | `Rocket` o `ArrowUpRight` | `import { Rocket } from 'lucide-react'` |
| 📢 | Notifiche | `Bell` | `import { Bell } from 'lucide-react'` |
| 🔍 | Cerca | `Search` | `import { Search } from 'lucide-react'` |

**Installation:**
```bash
npm install lucide-react
```

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── dashboard/
│   ├── layout.tsx           # NUOVO — sidebar fissa + content area (solo questo file gestisce la struttura)
│   ├── page.tsx             # Aggiornato — rimuove header/nav propri, usa solo <main> content
│   ├── programs/            # Aggiornato — stesso pattern
│   ├── customers/           # Aggiornato — stesso pattern
│   ├── notifications/       # Aggiornato — stesso pattern
│   ├── analytics/           # Aggiornato — stesso pattern
│   ├── billing/             # Aggiornato — stesso pattern
│   └── settings/            # Aggiornato — stesso pattern
components/
├── ui/
│   ├── MetricCard.tsx       # NUOVO — card metrica standardizzata
│   ├── StatusBadge.tsx      # NUOVO — badge status (active/inactive/expired)
│   └── EmptyState.tsx       # NUOVO — empty state con icona Lucide
└── dashboard/
    └── Sidebar.tsx          # NUOVO — sidebar con navigazione e active state
```

### Pattern 1: Dashboard Layout con Sidebar
**What:** Un singolo `app/dashboard/layout.tsx` che wrappa tutte le pagine dashboard con sidebar fissa + content area
**When to use:** Qualsiasi route dentro `app/dashboard/`

```typescript
// app/dashboard/layout.tsx
// Source: Next.js App Router docs — Nested Layouts
'use client'

import Sidebar from '@/components/dashboard/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#F5F5F5]">
      <Sidebar />
      <main className="flex-1 ml-[240px] min-h-screen">
        {children}
      </main>
    </div>
  )
}
```

**ATTENZIONE:** `app/dashboard/layout.tsx` e `app/layout.tsx` coesistono — Next.js nesta automaticamente i layout. Il dashboard layout aggiunge la sidebar sopra il root layout. Questa file NON deve replicare `<html>` o `<body>`.

### Pattern 2: Sidebar con Active State
**What:** Sidebar che usa `usePathname()` per evidenziare il link attivo
**When to use:** `components/dashboard/Sidebar.tsx`

```typescript
// components/dashboard/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Target, Users, Bell, BarChart2, Settings, CreditCard, Home, ScanLine } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/programs', icon: Target, label: 'Programmi' },
  { href: '/dashboard/customers', icon: Users, label: 'Clienti' },
  { href: '/dashboard/notifications', icon: Bell, label: 'Notifiche' },
  { href: '/dashboard/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Abbonamento' },
  { href: '/dashboard/settings', icon: Settings, label: 'Impostazioni' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#111111] flex flex-col z-40">
      {/* Logo/Brand */}
      <div className="px-6 py-5 border-b border-white/10">
        <p className="text-white font-semibold text-lg">FidelityApp</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          // Exact match per dashboard home, startsWith per le altre
          const isActive = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#2A2A2A] text-white'
                  : 'text-white/70 hover:bg-[#1E1E1E] hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Scanner button (azione rapida) */}
      <div className="px-3 pb-4">
        <Link
          href="/stamp"
          className="flex items-center gap-3 px-3 py-2.5 bg-white text-[#111111] rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          <ScanLine size={18} />
          Apri Scanner
        </Link>
      </div>
    </aside>
  )
}
```

### Pattern 3: MetricCard Component
**What:** Card metrica riutilizzabile per le statistiche nelle pagine
**When to use:** Dashboard home, Analytics, Customers, Programs

```typescript
// components/ui/MetricCard.tsx
// Source: Design spec DESIGN-04

interface MetricCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  valueClassName?: string
}

export default function MetricCard({ label, value, icon, valueClassName }: MetricCardProps) {
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      {icon && <div className="mb-3 text-[#D1D5DB]">{icon}</div>}
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold text-gray-900 mt-1 ${valueClassName || ''}`}>{value}</p>
    </div>
  )
}
```

### Pattern 4: StatusBadge Component
**What:** Badge per status attivo/inattivo/scaduto
**When to use:** Tabelle programmi, tabelle abbonamenti, status carte

```typescript
// components/ui/StatusBadge.tsx
// Source: Design spec DESIGN-09

type BadgeVariant = 'active' | 'inactive' | 'expired' | 'pending'

const BADGE_STYLES: Record<BadgeVariant, string> = {
  active: 'bg-[#DCFCE7] text-[#16A34A]',
  inactive: 'bg-gray-100 text-gray-500',
  expired: 'bg-[#FEE2E2] text-[#DC2626]',
  pending: 'bg-yellow-100 text-yellow-700',
}

const BADGE_LABELS: Record<BadgeVariant, string> = {
  active: 'Attivo',
  inactive: 'Inattivo',
  expired: 'Scaduto',
  pending: 'In attesa',
}

export default function StatusBadge({ variant, label }: { variant: BadgeVariant; label?: string }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${BADGE_STYLES[variant]}`}>
      {label || BADGE_LABELS[variant]}
    </span>
  )
}
```

### Pattern 5: EmptyState Component
**What:** Stato vuoto standardizzato con icona Lucide da 48px
**When to use:** Qualsiasi lista vuota — programmi, clienti, notifiche, transazioni

```typescript
// components/ui/EmptyState.tsx
// Source: Design spec DESIGN-10

import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <Icon size={48} className="text-[#D1D5DB] mb-4" strokeWidth={1.5} />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-6 bg-[#111111] text-white px-5 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
```

### Pattern 6: Page Header dentro ogni page.tsx
**What:** Dopo l'introduzione del layout, le pagine eliminano i propri `<header>` e usano solo il content area
**When to use:** Tutte le 11 pagine dashboard

```typescript
// Pattern page header standardizzato (dentro ogni page.tsx, non più <header> standalone)
<div className="px-6 py-6">
  {/* Page header */}
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Programmi</h1>
      <p className="text-sm text-gray-500 mt-1">Gestisci le tue carte fedeltà</p>
    </div>
    <button className="bg-[#111111] text-white px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors flex items-center gap-2">
      <Plus size={16} />
      Nuovo Programma
    </button>
  </div>
  {/* ... content */}
</div>
```

### Pattern 7: Standard Table
**What:** Tabella standardizzata senza zebra stripes
**When to use:** Customers list, program cards list, transaction history

```typescript
// Pattern tabella standardizzata (DESIGN-05)
<div className="bg-white rounded-[12px] border border-[#E8E8E8] overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="bg-[#F9F9F9] border-b border-[#F0F0F0]">
        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Cliente
        </th>
        {/* altre colonne */}
      </tr>
    </thead>
    <tbody>
      {items.map(item => (
        <tr key={item.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-gray-50/50">
          <td className="px-6 py-4">...</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Pattern 8: Standard Form Input
**What:** Input standardizzato (DESIGN-08)
**When to use:** Tutti i form della dashboard

```typescript
// Input standardizzato
<input
  type="text"
  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
  placeholder="..."
/>
```

### Anti-Patterns to Avoid
- **Non usare `focus:ring-*` Tailwind** — il design system richiede `focus:outline-none` + `focus:border-[#111111]`
- **Non usare `rounded-2xl` per card metriche** — usare `rounded-[12px]` per allineamento al spec
- **Non replicare header/nav nelle page.tsx** — il layout le gestisce
- **Non usare `divide-y` per le tabelle** — sostituire con `border-b border-[#F0F0F0]` per ogni row
- **Non usare `hover:bg-gray-50` per zebra stripes** — rimuovere il pattern alternating su tabelle
- **Non usare `bg-indigo-*`** — tutto migra a `bg-[#111111]` per primary e token neutrali

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icone SVG | SVG inline custom | `lucide-react` | Tree-shaking, TypeScript, accessibilità built-in, 1500+ icone |
| Active sidebar state | Confronto manuale di pathname | `usePathname()` da next/navigation | Gestisce automaticamente URL parametrici |
| Font loading | Font file locali o @import CSS | `next/font/google` con `Inter` | Ottimizzazione automatica, zero layout shift, preload |
| Arbitrary CSS values | CSS modules o file .css separati | Tailwind arbitrary values `bg-[#111111]` | Già nel progetto, nessuna configurazione extra in v4 |

**Key insight:** L'unica dipendenza esterna nuova è `lucide-react`. Tutto il resto si ottiene con strumenti già nel progetto (Next.js built-ins + Tailwind v4).

---

## Common Pitfalls

### Pitfall 1: Dashboard layout wrappa pagine non-dashboard
**What goes wrong:** Mettere il sidebar layout in `app/layout.tsx` invece di `app/dashboard/layout.tsx`
**Why it happens:** Confusione tra root layout e layout nesting
**How to avoid:** Il file va in `app/dashboard/layout.tsx` — Next.js App Router applica automaticamente solo alle route dentro `/dashboard`
**Warning signs:** La sidebar appare sulla pagina `/` (landing page) o `/stamp`

### Pitfall 2: Layout nidificato con `<html>/<body>`
**What goes wrong:** `app/dashboard/layout.tsx` include `<html lang="en"><body>` — causa errore React
**Why it happens:** Copiare la struttura del root layout
**How to avoid:** Il dashboard layout NON include `<html>` o `<body>` — solo il wrapper `<div className="flex">` con sidebar + main

### Pitfall 3: `usePathname` rende il layout un Client Component
**What goes wrong:** La sidebar usa hooks quindi il layout diventa 'use client', potenzialmente impattando le performance
**Why it happens:** Necessità dell'active state basato su pathname
**How to avoid:** Estrarre la sidebar in `Sidebar.tsx` separato con `'use client'`, il layout rimane Server Component (o diventa 'use client' solo se necessario — in questo caso è accettabile)

### Pitfall 4: Sovrapposizione sidebar con il content
**What goes wrong:** Il contenuto principale sparisce dietro la sidebar fissa
**Why it happens:** La sidebar ha `position: fixed` ma il main non ha margin-left
**How to avoid:** Il `<main>` deve avere `ml-[240px]` per compensare la sidebar fissa

### Pitfall 5: Pagine esistenti con struttura `min-h-screen` che conflittano
**What goes wrong:** Ogni page.tsx attuale ha `<div className="min-h-screen bg-gray-50">` che sovrascrive lo sfondo del layout
**Why it happens:** Prima del layout condiviso, ogni pagina gestiva il proprio sfondo
**How to avoid:** Rimuovere `min-h-screen bg-gray-*` dal wrapper esterno di ogni page.tsx — il layout gestisce sfondo e altezza minima

### Pitfall 6: Mobile — sidebar fissa non responsive
**What goes wrong:** Su mobile la sidebar copre tutto il contenuto
**Why it happens:** La sidebar è `fixed` senza breakpoint
**How to avoid:** Aggiungere `hidden lg:flex` alla sidebar e considerare hamburger menu mobile. Nota: il design spec non menziona mobile per la sidebar, quindi `hidden lg:block` è accettabile come default. Le pagine mobile-only (es. `/stamp`) non sono nella dashboard e non vengono impattate.

### Pitfall 7: Font Inter non applica su tutto
**What goes wrong:** Il body usa ancora Geist perché `globals.css` ha `font-family: Arial, Helvetica, sans-serif`
**Why it happens:** Il root layout usa `Geist` e globals.css ha regole `body` che sovrascrivono
**How to avoid:** Aggiornare il root layout per includere Inter (o sostituire Geist con Inter), e aggiornare globals.css per usare la variable CSS corretta

---

## Code Examples

### Installazione e import corretto lucide-react

```bash
npm install lucide-react
```

```typescript
// Import tree-shakeable — importa solo le icone usate
import { Target, Users, Bell, BarChart2, Settings, CreditCard } from 'lucide-react'

// Uso base con size prop
<Target size={18} className="text-white" />

// Uso empty state (48px)
<Target size={48} className="text-[#D1D5DB]" strokeWidth={1.5} />
```

### Font Inter in Next.js

```typescript
// app/layout.tsx — aggiornare per includere Inter
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

// Nel body: className={`${inter.variable} font-sans antialiased`}
```

```css
/* app/globals.css — aggiornare body */
body {
  font-family: var(--font-inter), system-ui, sans-serif;
}
```

### Bottone primario standardizzato

```typescript
// Primary button — DESIGN-06
<button className="bg-[#111111] text-white px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors">
  Azione
</button>

// Secondary button
<button className="border border-[#E0E0E0] text-gray-700 px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors">
  Azione secondaria
</button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Emoji come icone | Lucide React SVG | Da implementare | Professionalità, accessibilità, nessun rendering rettangoli |
| Ogni pagina ha il proprio header/nav | Shared dashboard layout | Da implementare | DRY, consistenza, manutenibilità |
| `bg-indigo-600` come primario | `bg-[#111111]` neutro | Da implementare | Brand più professionale, B2B look |
| `focus:ring-2 focus:ring-indigo-500` | `focus:border-[#111111] focus:outline-none` | Da implementare | Allineamento design spec |
| Geist font | Inter font | Da implementare | Standard dashboard B2B |

---

## Open Questions

1. **Mobile breakpoint per la sidebar**
   - What we know: Il spec menziona solo desktop (240px fixed)
   - What's unclear: Come si comporta su mobile (i merchant usano lo scanner su mobile)
   - Recommendation: Aggiungere `hidden lg:flex` alla sidebar, il content area non ha `ml-[240px]` su mobile. Le pagine pubbliche (`/stamp`, `/c/[token]`, `/join/[programId]`) non sono nella dashboard e non vengono impattate.

2. **Tiers badge_emoji nella tabella `tiers`**
   - What we know: La tabella `tiers` ha una colonna `badge_emoji` (es. 🥉, 🥈, 🥇)
   - What's unclear: Il DESIGN-01 richiede "zero emoji" ma questi badge vengono dal DB e sono dati del merchant
   - Recommendation: Le emoji nel DB (badge_emoji nelle tiers) sono **dati del merchant**, non UI chrome. Non vanno sostituite. Il DESIGN-01 si applica alle icone UI hardcoded nel codice, non ai dati dell'utente.

3. **Spinner di loading — emoji o Lucide?**
   - What we know: Attualmente gli spinner usano `animate-spin` CSS, non emoji
   - What's unclear: Nessuno — già corretto
   - Recommendation: Gli spinner attuali sono già emoji-free, nessuna modifica necessaria

---

## Sources

### Primary (HIGH confidence)
- Codebase audit diretto — tutti i file `app/dashboard/**/*.tsx` letti e analizzati
- Next.js App Router docs — Layout nesting pattern (built-in knowledge, verificato con struttura progetto)
- REQUIREMENTS.md — Specifiche esatte per DESIGN-01..11
- lucide-react npm registry — versione corrente e lista icone disponibili

### Secondary (MEDIUM confidence)
- Tailwind CSS v4 arbitrary values — `bg-[#111111]` syntax (verificato da globals.css che usa `@import "tailwindcss"` = v4)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — lucide-react è l'unica nuova dipendenza, resto è già nel progetto
- Architecture: HIGH — App Router layout nesting è documentato e stabile in Next.js 16
- Pitfalls: HIGH — derivati da audit diretto del codice esistente
- Icone map: HIGH — lista derivata da lettura di ogni file .tsx

**Research date:** 2026-03-03
**Valid until:** 2026-09-03 (stabile — nessuna dipendenza fast-moving)
