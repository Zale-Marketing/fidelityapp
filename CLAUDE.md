# CLAUDE.md — Fonte di Verità FidelityApp
*Aggiornato: 2026-03 — milestone v1.0 completato, v2.0 in corso*

---

## 🎯 PROGETTO

**FidelityApp** — SaaS white-label per programmi fedeltà digitali con Google Wallet.
Merchant (bar, ristoranti, negozi) creano carte fedeltà; i clienti le salvano su Google Wallet.

- **Owner:** Alessandro (Zale Marketing, Roma)
- **Produzione:** https://fidelityapp-six.vercel.app
- **Stack:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Supabase + Vercel

---

## 🛠️ STACK TECNOLOGICO

| Layer | Tecnologia |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js API Routes (Node runtime + Edge runtime per wallet-image) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Wallet | Google Wallet API (Loyalty Cards), jsonwebtoken, google-auth-library |
| Billing | Stripe v20 (apiVersion: `2026-02-25.clover`) |
| WhatsApp | Maytapi (credenziali per-merchant su tabella merchants) |
| Analytics | recharts |
| QR | qrcode (npm) |
| Hero Image | @vercel/og / ImageResponse (Edge Runtime) |
| Hosting | Vercel |

---

## 📊 DATABASE SUPABASE — SCHEMA COMPLETO

### `merchants`
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| name | text | Nome attività |
| slug | text | |
| email | text | |
| phone | text | |
| address | text | |
| logo_url | text | |
| plan | text | `'FREE'` \| `'PRO'` \| `'BUSINESS'` |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| stripe_subscription_status | text | |
| plan_expires_at | timestamptz | |
| maytapi_product_id | text | ⚠️ SQL: `ADD COLUMN IF NOT EXISTS` — vedi MANUAL-ACTIONS.md |
| maytapi_api_token | text | ⚠️ SQL: `ADD COLUMN IF NOT EXISTS` — vedi MANUAL-ACTIONS.md |
| google_reviews_url | text | |
| subscription_tier | text | `'free'`\|`'starter'`\|`'pro'`\|`'enterprise'` |
| subscription_status | text | `'active'`\|`'canceled'`\|`'past_due'` |
| created_at | timestamptz | |

### `profiles`
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | = auth.users.id |
| merchant_id | uuid FK | → merchants |
| role | text | `'owner'`\|`'admin'`\|`'staff'` |
| full_name | text | |
| email | text | |
| created_at | timestamptz | |

### `programs`
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| merchant_id | uuid FK | |
| name | text | |
| description | text | |
| program_type | text | `'stamps'`\|`'points'`\|`'cashback'`\|`'tiers'`\|`'subscription'` |
| primary_color | text | HEX es. `'#6366f1'` |
| secondary_color | text | |
| text_color | text | |
| logo_url | text | PNG/JPG/WebP — **NO SVG!** |
| stamps_required | int | bollini/punti per premio |
| reward_description | text | |
| points_per_euro | numeric | solo points |
| cashback_percent | numeric | solo cashback |
| min_cashback_redeem | numeric | |
| subscription_price | numeric | |
| subscription_period | text | `'weekly'`\|`'monthly'`\|`'yearly'` |
| daily_limit | int | utilizzi/giorno (subscription) |
| external_rewards_url | text | |
| terms_url | text | |
| website_url | text | |
| wallet_message | text | |
| google_reviews_url | text | |
| welcome_message | text | |
| is_active | boolean | |
| is_cumulative | boolean | |
| allow_multiple_redemption | boolean | |
| points_expire_days | int | |
| birthday_bonus_stamps | int | |
| referral_bonus_stamps | int | |
| deleted_at | timestamptz | soft delete — filtrare SEMPRE con `.is('deleted_at', null)` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `cards`
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| merchant_id | uuid FK | |
| program_id | uuid FK | |
| card_holder_id | uuid FK | nullable |
| scan_token | text | univoco per QR |
| stamp_count | int | bollini attuali |
| current_stamps | int | alias di stamp_count |
| lifetime_stamps | int | |
| next_reward_at | int | |
| points_balance | numeric | |
| cashback_balance | numeric | |
| total_spent | numeric | |
| current_tier | text | |
| subscription_status | text | `'active'`\|`'expired'`\|`'inactive'` |
| subscription_end | timestamptz | |
| daily_uses | int | |
| last_use_date | date | |
| status | text | `'active'`\|`'reward_ready'`\|`'redeemed'`\|`'expired'` |
| wallet_provider | text | `'none'`\|`'google'`\|`'apple'` |
| deleted_at | timestamptz | ⚠️ SQL: `ADD COLUMN IF NOT EXISTS` — vedi MANUAL-ACTIONS.md |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `card_holders`
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| merchant_id | uuid FK | |
| full_name | text | |
| contact_email | text | ⚠️ colonna = `contact_email` — **NON** `email` |
| contact_phone | text | |
| phone | text | |
| birth_date | date | |
| notes | text | |
| total_stamps | int | |
| total_rewards | int | |
| last_visit | timestamptz | |
| marketing_consent | boolean | |
| acquisition_source | text | |
| preferred_language | text | |
| created_at | timestamptz | |

### `rewards`
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| program_id | uuid FK | |
| merchant_id | uuid FK | |
| name | text | es. "Caffè Gratis" |
| description | text | |
| stamps_required | int | soglia bollini |
| reward_type | text | `'product'`\|`'discount'`\|`'freebie'` |
| discount_value | numeric | |
| discount_percent | numeric | |
| is_active | boolean | |
| sort_order | int | |
| times_redeemed | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `tiers`
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| program_id | uuid FK | |
| name | text | Bronze, Silver, Gold... |
| min_spend | numeric | |
| discount_percent | numeric | |
| badge_emoji | text | 🥉🥈🥇 |
| sort_order | int | |

### `stamp_transactions`
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| merchant_id | uuid FK | |
| program_id | uuid FK | |
| card_id | uuid FK | |
| card_holder_id | uuid FK | nullable |
| staff_user_id | uuid | nullable |
| type | text | `'add'`\|`'redeem'`\|`'bonus'`\|`'expire'`\|`'manual'` |
| delta | int | +1, -10, etc. |
| note | text | |
| idempotency_key | text | previene duplicati |
| amount_spent | numeric | |
| points_earned | int | |
| cashback_earned | numeric | |
| created_at | timestamptz | |

### `customer_tags`
| Colonna | Tipo |
|---------|------|
| id | uuid PK |
| merchant_id | uuid FK |
| name | text |
| color | text (HEX) |
| created_at | timestamptz |

### `card_holder_tags` (join table)
| Colonna | Tipo |
|---------|------|
| card_holder_id | uuid FK |
| tag_id | uuid FK |

### `notification_logs`
Storico notifiche inviate. SQL di creazione in MANUAL-ACTIONS.md.

### `webhook_endpoints`
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| merchant_id | uuid FK | |
| url | text | |
| events | text[] | array di eventi |
| secret | text | HMAC-SHA256 secret |
| is_active | boolean | |
| created_at | timestamptz | |

### `leads`
| Colonna | Tipo |
|---------|------|
| id | uuid PK |
| name | text |
| email | text |
| phone | text |
| message | text |
| created_at | timestamptz |

---

## 📁 STRUTTURA FILE PRINCIPALI

```
app/
├── page.tsx                          # Landing page (Server Component puro)
├── login/page.tsx
├── register/page.tsx
├── onboarding/page.tsx               # Wizard 4-step post-registrazione
├── stamp/page.tsx                    # Scanner QR merchant (mobile-first)
├── c/[token]/page.tsx                # Carta cliente pubblica (auto-refresh 5s)
├── join/[programId]/page.tsx         # Auto-iscrizione cliente pubblica
│
├── api/
│   ├── wallet/route.ts               # POST — genera link Google Wallet
│   ├── wallet-update/route.ts        # POST — PATCH carta wallet esistente
│   ├── wallet-image/route.tsx        # GET  — hero image 1032x336 (Edge Runtime)
│   ├── submit-lead/route.ts          # POST — salva lead in leads table
│   ├── send-notification/route.ts    # POST — invia push Google Wallet bulk
│   ├── stamps-image/route.ts         # GET  — immagine bollini statica
│   ├── stripe-checkout/route.ts      # POST — crea sessione Stripe Checkout
│   ├── stripe-portal/route.ts        # POST — portale self-service Stripe
│   ├── stripe-webhook/route.ts       # POST — gestisce eventi Stripe (aggiorna piano)
│   ├── webhooks/route.ts             # GET/POST — CRUD webhook endpoints
│   ├── webhooks/[id]/route.ts        # PATCH/DELETE — endpoint singolo
│   ├── webhooks/dispatch/route.ts    # POST — dispatcha evento firmato HMAC-SHA256
│   ├── whatsapp/connect/route.ts     # POST/PATCH — connetti/disconnetti WhatsApp
│   ├── whatsapp/status/route.ts      # GET  — stato sessione Maytapi + QR
│   ├── whatsapp/send/route.ts        # POST — invia messaggio WhatsApp
│   └── cron/birthday/route.ts        # GET  — cron birthday bonus stamps
│
├── dashboard/
│   ├── page.tsx                      # Stats overview (programmi, carte, transazioni)
│   ├── layout.tsx                    # Layout con Sidebar nera
│   ├── programs/
│   │   ├── page.tsx                  # Lista programmi (filtra deleted_at IS NULL)
│   │   ├── new/page.tsx              # Wizard creazione programma
│   │   └── [id]/
│   │       ├── page.tsx              # Dettaglio: info + carte + delete modal
│   │       └── edit/page.tsx         # Modifica (logo/nome/colore bloccati)
│   ├── cards/page.tsx                # Segmentazione attive/dormenti/perse + CSV
│   ├── customers/
│   │   ├── page.tsx                  # Clienti + tags + search + CSV export
│   │   └── [id]/page.tsx             # Dettaglio cliente
│   ├── notifications/page.tsx        # Push Google Wallet + tag segmentation
│   ├── analytics/page.tsx            # KPI + recharts timeline + stats per programma
│   ├── billing/page.tsx              # Piano Stripe + upgrade
│   ├── upgrade/page.tsx
│   └── settings/
│       ├── page.tsx                  # Account + piano + link integrazioni
│       ├── whatsapp/page.tsx         # WhatsApp QR + credenziali Maytapi per-merchant
│       └── webhooks/page.tsx         # Webhook endpoints (solo piano BUSINESS)

components/
├── LeadForm.tsx                      # Form landing (name*, email*, phone* — tutti required)
├── dashboard/Sidebar.tsx             # Nav: Dashboard, Programmi, Clienti, Carte,
│                                     #      Notifiche, Analytics, Abbonamento, Impostazioni
└── ui/
    ├── EmptyState.tsx
    ├── StatusBadge.tsx
    └── UpgradePrompt.tsx

lib/
├── supabase.ts                       # createClient()
├── types.ts                          # Tutti i tipi (fonte di verità per colonne)
├── google-wallet.ts                  # generateWalletLink, updateWalletCard, getHeroImageUrl
└── hooks/usePlan.ts                  # { isFree, isPro, isBusiness, loading }
```

---

## 🎫 TIPI DI PROGRAMMA

| Tipo | Campo saldo card | Logica |
|------|-----------------|--------|
| `stamps` | `stamp_count` / `current_stamps` | +1 per visita, premio a X bollini |
| `points` | `points_balance` | €X = 1 punto, premio a Y punti |
| `cashback` | `cashback_balance` | X% su acquisto, riscatta da €Y min |
| `tiers` | `total_spent`, `current_tier` | livelli VIP per spesa totale |
| `subscription` | `subscription_status`, `daily_uses` | abbonamento con X utilizzi/giorno |

---

## 💳 PIANI

| Piano | Programmi | Feature aggiuntive |
|-------|-----------|-------------------|
| `FREE` | max 5 | baseline |
| `PRO` | illimitati | WhatsApp marketing |
| `BUSINESS` | illimitati | PRO + Webhook integrations |

Hook: `usePlan()` → `{ isFree, isPro, isBusiness, loading }`

---

## 🔄 FLUSSO GOOGLE WALLET

```
Cliente visita /join/[programId]
  → form → INSERT card_holders (contact_email, phone) + INSERT cards
  → redirect /c/[token]
  → preme "Aggiungi a Google Wallet"
  → POST /api/wallet { cardId }
  → generateWalletLink() → JWT firmato → https://pay.google.com/gp/v/save/JWT

Merchant scansiona QR → /stamp
  → UPDATE cards (stamp_count++, etc.)
  → POST /api/wallet-update { cardId }
  → updateWalletCard() → PATCH Google API
  → Google richiede GET /api/wallet-image?cardId=X&t=timestamp (Edge)
  → ImageResponse 1032×336 PNG con dati dinamici cliente
```

**Regole Hero Image (Satori):**
- Dimensioni: 1032×336px
- **OGNI div con più figli DEVE avere `display:'flex'`**
- NO emoji/caratteri speciali (usare forme CSS)
- NO SVG come logo programma
- Headers: `Cache-Control: no-cache, no-store, must-revalidate`
- Usa `?t=${Date.now()}` per cache-busting
- Colore hero: `?color=%23RRGGBB` (URL-encoded, con guard `startsWith('#')`)

---

## 🔗 API REFERENCE

```
POST   /api/wallet              { cardId } → { walletLink }
POST   /api/wallet-update       { cardId } → { success }
GET    /api/wallet-image        ?cardId=&color=&t= → image/png (Edge)
POST   /api/submit-lead         { name, email, phone, message } → 200/400
POST   /api/send-notification   { cardIds[], title, message } → { sent }
POST   /api/stripe-checkout     { priceId } → { url }
POST   /api/stripe-portal       {} → { url }
POST   /api/stripe-webhook      Stripe-Signature header → aggiorna merchants
GET    /api/webhooks            Bearer token → Endpoint[]
POST   /api/webhooks            { url, events[] } → { id, secret }
PATCH  /api/webhooks/[id]       { is_active } → Endpoint
DELETE /api/webhooks/[id]       → 204
POST   /api/webhooks/dispatch   { merchantId, event, data } → dispatcha HMAC
POST   /api/whatsapp/connect    {} → { status }
PATCH  /api/whatsapp/connect    {} → disconnetti
GET    /api/whatsapp/status     ?action=status|qr
POST   /api/whatsapp/send       { to, message }
GET    /api/cron/birthday       cron job birthday bonus
```

---

## 🔧 VARIABILI D'AMBIENTE (Vercel)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # ⚠️ solo server-side

# App
NEXT_PUBLIC_APP_URL=https://fidelityapp-six.vercel.app
NEXT_PUBLIC_INTERNAL_API_SECRET=     # guard API interne

# Google Wallet
GOOGLE_WALLET_ISSUER_ID=
GOOGLE_WALLET_CLIENT_EMAIL=
GOOGLE_WALLET_PRIVATE_KEY=           # oppure base64:
GOOGLE_WALLET_PRIVATE_KEY_BASE64=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
```

> **Maytapi:** NON usa variabili d'ambiente globali.
> Le credenziali (`maytapi_product_id`, `maytapi_api_token`) sono salvate
> per ogni merchant in `merchants` table via `/dashboard/settings/whatsapp`.

---

## 📐 CONVENZIONI

### Supabase client
```typescript
// Client-side (browser)
import { createClient } from '@/lib/supabase'
const supabase = createClient()

// Server-side con service role (API routes)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Soft delete (sempre filtrare)
```typescript
// Filtrare ovunque programmi e carte
.is('deleted_at', null)

// Per archiviare
.update({ deleted_at: new Date().toISOString() })
```

### Navigazione dopo mutazione DB
```typescript
// Necessario per invalidare cache Next.js App Router
router.refresh()
router.push('/dashboard/programs')
```

### card_holders — colonna email
```typescript
// ⚠️ COLONNA = contact_email, non email
.eq('contact_email', email.toLowerCase())
.insert({ merchant_id, full_name, contact_email: email, phone })
```

### Query nested — vietate in Edge Runtime
```typescript
// ❌ Edge runtime (wallet-image)
.select('*, programs(*, rewards(*))')

// ✅ Query separate
const { data: card } = await supabase.from('cards').select('*, programs(*)')
const { data: rewards } = await supabase.from('rewards').select('*').eq('program_id', program.id)
```

### Naming
- Tabelle DB: snake_case plurale
- Colonne: snake_case
- Variabili TS: camelCase
- Componenti React: PascalCase
- File routes: kebab-case o `[param]`

---

## 🐛 PROBLEMI NOTI E SOLUZIONI

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| SVG non funziona come logo | Google Wallet non supporta SVG | Solo PNG/JPG/WebP; bloccare SVG all'upload |
| Immagine wallet non si aggiorna | Google cacha aggressivamente | `&t=${Date.now()}` nell'URL + headers no-cache |
| Query nested fallisce in Edge | Limitazione Supabase Edge | Query separate (vedi sopra) |
| Div ImageResponse senza flex | Satori richiede display:flex | `display:'flex'` su OGNI div con più figli |
| Emoji mostrano rettangoli | Font mancanti in Satori | Usare forme CSS pure (cerchi, quadrati) |
| Logo/colori non aggiornano wallet | Limite Google: solo l'Object, non la Class | Comportamento intenzionale |
| Lista non aggiorna dopo delete | Cache Next.js App Router | `router.refresh()` prima di `router.push()` |
| 400 su card_holders insert | Colonna `email` non esiste (è `contact_email`) | Usare sempre `contact_email` |

---

## ✅ FUNZIONALITÀ IMPLEMENTATE

### Milestone v1.0 (fasi 01–05) — completato 2026-03-02
- [x] Auth Supabase (register → onboarding 4-step → dashboard)
- [x] CRUD completo programmi (5 tipi)
- [x] Scanner QR mobile-first con feedback full-screen
- [x] Google Wallet: crea, aggiorna, hero image dinamica
- [x] Pagina pubblica carta `/c/[token]` (auto-refresh 5s, tutti i tipi)
- [x] Auto-iscrizione `/join/[programId]` con BenefitPreview
- [x] Premi intermedi (`rewards` table)
- [x] Sistema Tiers configurabili
- [x] Abbonamenti con limite giornaliero
- [x] Notifiche push Google Wallet + tag segmentation + live count
- [x] Clienti con tag management + CSV export (UTF-8 BOM)
- [x] Landing page con LeadForm (name*, email*, phone*)
- [x] SQL: idempotency_key, notification_logs, stripe_* su merchants

### Milestone v2.0 (fasi 06–12) — in corso
- [x] Soft delete + hard delete programmi (deleted_at, cascade)
- [x] Hero image colore merchant-branded (?color= param)
- [x] Design system v2: sidebar #111111, card con border #E8E8E8, token CSS
- [x] Analytics: KPI cards, timeline recharts, stats per programma
- [x] CSV export carte segmentate (/dashboard/cards)
- [x] Billing Stripe: checkout, portal, webhook, plan enforcement FREE/PRO
- [x] WhatsApp marketing: Maytapi QR connect, invia messaggi, 200 msg/day limit
- [x] Webhook integrations HMAC-SHA256 (piano BUSINESS)
- [x] Birthday cron automation
- [x] Credenziali Maytapi per-merchant (su merchants table)
- [x] Soft delete carte individuali (deleted_at su cards)
- [x] Settings → link a WhatsApp e Webhook sub-pages

---

## ⏳ TODO FUTURI

- [ ] Apple Wallet integration
- [ ] Notifiche push quando manca 1 bollino al premio
- [ ] Multi-sede per merchant
- [ ] Sistema referral
- [ ] API pubblica per integrazioni terze parti
- [ ] White-label completo (rimuovere branding Zale)
- [ ] Gamification: missioni, badge
- [ ] Campagne marketing automatiche

---

## 📋 WORKFLOW OBBLIGATORIO PER OGNI FEATURE

1. Prima di iniziare: leggi tutti i file coinvolti
2. Scrivi il codice
3. Aggiorna la sezione TODO sopra (metti ✅ su ciò che hai completato)
4. Esegui: `git add . && git commit -m "feat: nome-feature"`
5. Scrivi in PROGRESSO.md cosa hai fatto e cosa fai dopo
6. Passa alla feature successiva SENZA aspettare

## ⛔ SE TI BLOCCHI

1. Scrivi problema in BLOCCO.md (feature, errore, cosa hai provato)
2. Passa SUBITO alla feature successiva
3. Torna al blocco solo con un'idea nuova

## 🔄 INIZIO NUOVA SESSIONE

1. Leggi PROGRESSO.md — dove eri arrivato
2. Leggi BLOCCO.md — cosa era bloccato
3. Riprendi dal punto esatto

---

*Fonte: SUMMARY.md fasi 01-12 + lib/types.ts + MANUAL-ACTIONS.md*
*Milestone v1.0 completato 2026-03-02 | v2.0 in corso*
