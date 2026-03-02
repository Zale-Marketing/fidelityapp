# CLAUDE.md - Guida Completa al Progetto Fidelity App

## 🎯 PANORAMICA PROGETTO

**FidelityApp** è una piattaforma SaaS white-label per la gestione di programmi fedeltà digitali con integrazione **Google Wallet**. Permette ai merchant (bar, ristoranti, negozi) di creare carte fedeltà digitali che i clienti salvano nel Google Wallet del loro telefono.

**Owner:** Alessandro (Zale Marketing) - agenzia di digital marketing a Roma
**URL Produzione:** https://fidelityapp-six.vercel.app
**Repository:** Progetto Next.js su Vercel

---

## 🛠️ STACK TECNOLOGICO

### Frontend
- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript**
- **Tailwind CSS**
- **Componenti client-side** (`'use client'`)

### Backend
- **Next.js API Routes** (`app/api/...`)
- **Supabase** (PostgreSQL + Auth + Storage)
- **Edge Runtime** per alcune API (es. wallet-image)

### Integrazioni
- **Google Wallet API** (Loyalty Cards)
- **Google Auth Library** (per PATCH API)
- **jsonwebtoken** (per generare JWT Google Wallet)
- **html5-qrcode** (scanner QR)
- **@vercel/og** / **ImageResponse** (generazione immagini dinamiche)

### Hosting
- **Vercel** (frontend + API)
- **Supabase** (database + storage + auth)

---

## 📊 STRUTTURA DATABASE (Supabase)

### Tabelle Principali

#### `merchants`
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| name | text | Nome attività |
| logo_url | text | Logo merchant |
| created_at | timestamp | |

#### `profiles`
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK (= auth.users.id) |
| merchant_id | uuid | FK → merchants |
| role | text | 'admin', 'staff' |
| email | text | |

#### `programs`
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| merchant_id | uuid | FK → merchants |
| name | text | Nome programma |
| program_type | text | 'stamps', 'points', 'cashback', 'tiers', 'subscription' |
| primary_color | text | Colore HEX (es. '#6366f1') |
| logo_url | text | Logo programma (PNG/JPG/WebP, NO SVG!) |
| stamps_required | int | Bollini/punti per premio |
| reward_description | text | Descrizione premio finale |
| points_per_euro | numeric | € per 1 punto (solo points) |
| cashback_percent | numeric | % cashback (solo cashback) |
| min_cashback_redeem | numeric | Minimo € per riscattare |
| subscription_price | numeric | Prezzo abbonamento |
| subscription_period | text | 'weekly', 'monthly', 'yearly' |
| daily_limit | int | Utilizzi giornalieri (subscription) |
| external_rewards_url | text | Link catalogo premi |
| terms_url | text | Link regolamento |
| website_url | text | Link sito web |
| wallet_message | text | Messaggio custom nel wallet |
| created_at | timestamp | |

#### `cards`
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| merchant_id | uuid | FK → merchants |
| program_id | uuid | FK → programs |
| card_holder_id | uuid | FK → card_holders (nullable) |
| scan_token | text | Token univoco per QR code |
| current_stamps / stamp_count | int | Bollini attuali |
| points_balance | numeric | Punti attuali |
| cashback_balance | numeric | Credito cashback |
| total_spent | numeric | Spesa totale (per tiers) |
| current_tier | text | Livello attuale (tiers) |
| subscription_status | text | 'active', 'expired', 'inactive' |
| subscription_end | timestamp | Scadenza abbonamento |
| daily_uses | int | Utilizzi oggi (subscription) |
| last_use_date | date | Data ultimo utilizzo |
| status | text | 'active', 'completed' |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `card_holders`
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| merchant_id | uuid | FK → merchants |
| full_name | text | Nome cliente |
| email | text | Email cliente |
| phone | text | Telefono |
| created_at | timestamp | |

#### `rewards` ⭐ IMPORTANTE
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| program_id | uuid | FK → programs |
| merchant_id | uuid | FK → merchants |
| name | text | Nome premio (es. "Caffè Gratis") |
| description | text | Descrizione |
| stamps_required | int | Soglia bollini/punti |
| reward_type | text | 'product', 'discount', etc. |
| is_active | boolean | Attivo o no |
| sort_order | int | Ordinamento |
| created_at | timestamp | |

#### `tiers` (solo per program_type = 'tiers')
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| program_id | uuid | FK → programs |
| name | text | Nome livello (Bronze, Silver, Gold...) |
| min_spend | numeric | Spesa minima per raggiungere |
| discount_percent | numeric | Sconto % |
| badge_emoji | text | Emoji (🥉, 🥈, 🥇...) |
| sort_order | int | |

#### `stamp_transactions`
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| card_id | uuid | FK → cards |
| program_id | uuid | FK → programs |
| merchant_id | uuid | FK → merchants |
| card_holder_id | uuid | FK → card_holders |
| delta | int | +1, -10, etc. |
| type | text | 'add', 'redeem' |
| transaction_type | text | 'stamp', 'points', 'cashback', etc. |
| amount_spent | numeric | € spesi |
| points_earned | int | Punti guadagnati |
| cashback_earned | numeric | Cashback guadagnato |
| idempotency_key | text | Previene duplicati |
| created_at | timestamp | |

### Relazioni
```
merchants 1──* programs
merchants 1──* cards
merchants 1──* card_holders
programs 1──* cards
programs 1──* rewards
programs 1──* tiers
cards *──1 card_holders (nullable)
cards 1──* stamp_transactions
```

### ⚠️ ATTENZIONE: Query Nested
Le query nested di Supabase tipo `programs (rewards (*))` **NON FUNZIONANO** in edge runtime.
Fare sempre query separate:
```typescript
// ❌ NON FUNZIONA
const { data } = await supabase.from('cards').select('*, programs (*, rewards (*))')

// ✅ FUNZIONA
const { data: card } = await supabase.from('cards').select('*, programs (*)')
const { data: rewards } = await supabase.from('rewards').select('*').eq('program_id', program.id)
```

---

## 📁 STRUTTURA FILE PRINCIPALI

```
app/
├── api/
│   ├── wallet/route.ts          # Genera link "Aggiungi a Google Wallet"
│   ├── wallet-update/route.ts   # Aggiorna carta esistente nel Wallet (PATCH)
│   └── wallet-image/route.tsx   # Genera immagine dinamica hero (Edge Runtime)
├── dashboard/
│   ├── page.tsx                 # Dashboard principale merchant
│   ├── programs/
│   │   ├── page.tsx             # Lista programmi
│   │   ├── new/page.tsx         # Crea nuovo programma
│   │   └── [id]/
│   │       ├── page.tsx         # Dettaglio programma
│   │       └── edit/page.tsx    # Modifica programma
│   └── cards/
│       └── page.tsx             # Lista carte
├── stamp/page.tsx               # Scanner QR per aggiungere bollini
├── c/[token]/page.tsx           # Pagina pubblica carta cliente
└── login/page.tsx               # Login

lib/
├── google-wallet.ts             # Funzioni Google Wallet (generateWalletLink, updateWalletCard)
└── supabase.ts                  # Client Supabase

components/
└── ... (vari componenti UI)
```

---

## 🎫 TIPI DI PROGRAMMI FEDELTÀ

### 1. STAMPS (Bollini) 🎫
- Cliente riceve 1 bollino per visita/acquisto
- A X bollini → premio
- Supporta **premi intermedi** (es. 5 bollini = caffè, 10 = colazione)
- Campi: `stamps_required`, `reward_description`
- Card: `current_stamps` / `stamp_count`

### 2. POINTS (Punti) ⭐
- Cliente guadagna punti in base alla spesa
- Conversione: €X = 1 punto
- A X punti → premio
- Campi: `stamps_required` (= punti per premio), `points_per_euro`
- Card: `points_balance`

### 3. CASHBACK 💰
- Cliente guadagna X% di cashback su ogni acquisto
- Minimo €Y per riscattare
- Campi: `cashback_percent`, `min_cashback_redeem`
- Card: `cashback_balance`

### 4. TIERS (Livelli VIP) 👑
- Cliente sale di livello in base alla spesa totale
- Ogni livello ha sconto %
- Livelli configurabili nella tabella `tiers`
- Card: `current_tier`, `total_spent`

### 5. SUBSCRIPTION (Abbonamento) 🔄
- Cliente paga abbonamento mensile/annuale
- Ha X utilizzi al giorno inclusi
- Campi: `subscription_price`, `subscription_period`, `daily_limit`
- Card: `subscription_status`, `subscription_end`, `daily_uses`

---

## 🔄 FLUSSO GOOGLE WALLET

### 1. Creazione Carta
```
Cliente visita /c/[token] → Clicca "Aggiungi a Google Wallet"
    ↓
Frontend chiama POST /api/wallet con cardId
    ↓
/api/wallet carica dati da Supabase
    ↓
Chiama generateWalletLink() da lib/google-wallet.ts
    ↓
Genera JWT con:
    - loyaltyClass (programma)
    - loyaltyObject (carta cliente)
    - heroImage URL (punta a /api/wallet-image?cardId=...)
    ↓
Ritorna link: https://pay.google.com/gp/v/save/[JWT]
    ↓
Cliente clicca → Google salva la carta nel Wallet
```

### 2. Scansione e Aggiornamento
```
Merchant apre /stamp → Scansiona QR cliente
    ↓
Frontend trova carta tramite scan_token
    ↓
Aggiorna database (stamps +1, points, cashback, etc.)
    ↓
Chiama updateWallet(cardId) → POST /api/wallet-update
    ↓
/api/wallet-update chiama updateWalletCard() da lib/google-wallet.ts
    ↓
PATCH a Google Wallet API con nuova heroImage URL (con timestamp per cache bust)
    ↓
Google aggiorna la carta nel Wallet del cliente
```

### 3. Generazione Immagine Hero
```
Google Wallet richiede /api/wallet-image?cardId=XXX&t=timestamp
    ↓
Edge function carica dati carta + programma + rewards da Supabase
    ↓
Genera immagine 1032x336 con @vercel/og (ImageResponse)
    ↓
Ritorna PNG con headers no-cache
```

---

## 📐 SPECIFICHE IMMAGINE GOOGLE WALLET

### Dimensioni
- **Hero Image:** 1032 x 336 pixel (aspect ratio ~3:1)
- **Program Logo:** 256 x 256 pixel (quadrato, visibile piccolo)

### Formati Supportati
- ✅ PNG
- ✅ JPG/JPEG
- ✅ WebP
- ❌ **SVG NON SUPPORTATO** (causa errore silenzioso)

### Layout Immagine Hero
L'immagine mostra i dati dinamici del cliente:
- Titolo (es. "I TUOI BOLLINI")
- Contatore grande (es. "5 / 10")
- Indicatori visuali (cerchi per bollini, barra per punti)
- Prossimo premio intermedio o premio finale
- "Powered by Zale Marketing" in basso centrato

### ⚠️ Regole Satori (ImageResponse)
- **OGNI `<div>` con più figli DEVE avere `display: 'flex'`**
- Non usare caratteri speciali come ✓ ✅ (mostra rettangoli)
- Usare cerchi colorati puri invece di emoji/caratteri
- Font disponibili: system-ui, sans-serif

---

## 🔧 VARIABILI D'AMBIENTE (Vercel)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ⚠️ Solo server-side!

# App
NEXT_PUBLIC_APP_URL=https://fidelityapp-six.vercel.app

# Google Wallet
GOOGLE_WALLET_ISSUER_ID=3388000000023061237
GOOGLE_WALLET_CLIENT_EMAIL=fidelity-wallet@fidelityapp-485713.iam.gserviceaccount.com
GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# oppure
GOOGLE_WALLET_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTi...  # Base64 encoded
```

### Come Ottenere Credenziali Google Wallet
1. Google Cloud Console → Crea progetto
2. Abilita "Google Wallet API"
3. Crea Service Account
4. Scarica chiave JSON
5. Estrai `client_email` e `private_key`
6. Google Pay & Wallet Console → Aggiungi Issuer Account
7. Copia Issuer ID

---

## 🐛 PROBLEMI NOTI E SOLUZIONI

### 1. Immagine non si aggiorna nel Wallet
**Causa:** Google cacha le immagini aggressivamente
**Soluzione:** 
- Aggiungi `&t=${Date.now()}` all'URL immagine
- Headers `Cache-Control: no-cache, no-store, must-revalidate`
- L'utente deve aspettare 1-5 minuti o fare pull-to-refresh

### 2. SVG non funziona come logo
**Causa:** Google Wallet non supporta SVG
**Soluzione:** Bloccare upload SVG, accettare solo PNG/JPG/WebP
```typescript
const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
if (!allowedTypes.includes(file.type)) {
  alert('❌ SVG non supportato! Usa PNG, JPG o WebP.')
  return
}
```

### 3. Query nested non funzionano in Edge
**Causa:** Limitazione Supabase client in edge runtime
**Soluzione:** Query separate
```typescript
const { data: card } = await supabase.from('cards').select('*, programs (*)')
const { data: rewards } = await supabase.from('rewards').select('*').eq('program_id', program.id)
```

### 4. Errore "display: flex required"
**Causa:** Satori richiede display:flex su ogni div con più figli
**Soluzione:** Aggiungere `display: 'flex'` a TUTTI i div

### 5. Emoji/caratteri mostrano rettangoli
**Causa:** Font non supportano tutti i caratteri Unicode
**Soluzione:** Usare forme CSS pure (cerchi, quadrati) invece di emoji

### 6. "Card not found" in wallet-image
**Causa:** Tabella si chiama `cards`, non `loyalty_cards`
**Soluzione:** Usare `.from('cards')` non `.from('loyalty_cards')`

### 7. Modifiche logo/colori non si applicano a carte esistenti
**Causa:** Limite Google Wallet - la CLASS non si aggiorna su carte già salvate
**Soluzione:** Questo è INTENZIONALE. Solo l'OBJECT (dati dinamici) si aggiorna.

---

## ✅ FUNZIONALITÀ COMPLETATE

- [x] Autenticazione (Supabase Auth)
- [x] CRUD Programmi fedeltà (tutti i 5 tipi)
- [x] Creazione carte cliente
- [x] Scanner QR per aggiungere bollini/punti/cashback
- [x] Integrazione Google Wallet completa
- [x] Generazione immagine dinamica hero
- [x] Aggiornamento real-time wallet (PATCH API)
- [x] Premi intermedi (tabella rewards)
- [x] Sistema Tiers con livelli configurabili
- [x] Abbonamenti con limite giornaliero
- [x] Link personalizzati nel wallet (Catalogo, Regolamento, Sito)
- [x] Effetto FOIL_SHIMMER sul QR code
- [x] Blocco modifica logo/nome/colori dopo creazione (pagina edit)
- [x] Validazione SVG nell'upload logo

---

## ⏳ TODO / MIGLIORAMENTI FUTURI

- [ ] Notifiche push quando manca 1 bollino al premio
- [ ] Analytics e statistiche per merchant
- [ ] Export dati clienti (CSV)
- [ ] Multi-sede per merchant
- [ ] Apple Wallet integration
- [ ] Campagne marketing automatiche
- [ ] API pubblica per integrazioni terze parti
- [ ] White-label completo (rimuovere "Zale Marketing")
- [ ] Sistema referral
- [ ] Gamification avanzata (missioni, badge)

---

## 📝 CONVENZIONI DI CODICE

### Naming
- Tabelle DB: snake_case plurale (`cards`, `programs`, `card_holders`)
- Colonne DB: snake_case (`current_stamps`, `program_id`)
- Variabili TS: camelCase (`currentStamps`, `programId`)
- Componenti React: PascalCase (`StampPage`, `CardList`)
- File: kebab-case o [param] per dynamic routes

### Supabase Client
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

### Gestione Errori
```typescript
const { data, error } = await supabase.from('cards').select('*')
if (error) {
  console.error('Errore:', error)
  return NextResponse.json({ error: error.message }, { status: 500 })
}
```

---

## 🔗 API ENDPOINTS

### POST /api/wallet
Genera link "Aggiungi a Google Wallet"
```typescript
// Request
{ cardId: "uuid" }

// Response
{ walletLink: "https://pay.google.com/gp/v/save/..." }
```

### POST /api/wallet-update
Aggiorna carta esistente nel Wallet
```typescript
// Request
{ cardId: "uuid" }

// Response
{ success: true }
```

### GET /api/wallet-image
Genera immagine hero dinamica (Edge Runtime)
```
GET /api/wallet-image?cardId=uuid&t=timestamp
Response: image/png 1032x336
```

---

## 🚨 COSE IMPORTANTI DA RICORDARE

1. **La tabella si chiama `cards`**, NON `loyalty_cards`
2. **SVG non funziona** per i loghi - solo PNG/JPG/WebP
3. **Query nested non funzionano** in edge runtime - fare query separate
4. **Ogni div deve avere `display: 'flex'`** in ImageResponse (Satori)
5. **Logo/nome/colori NON si aggiornano** su carte già nel wallet - è un limite Google
6. **SUPABASE_SERVICE_ROLE_KEY** deve essere configurata su Vercel per wallet-image
7. **Timestamp nell'URL** (`&t=${Date.now()}`) per forzare refresh immagine
8. I **premi intermedi** sono nella tabella `rewards` con `stamps_required` < premio finale

---

## 📞 CONTATTI

- **Progetto:** Fidelity App by Zale Marketing
- **Owner:** Alessandro (co-founder Zale Marketing, Roma)
- **Tech Stack:** Next.js + Supabase + Google Wallet + Vercel
- **Ambiente:** Produzione su Vercel

---

*Ultimo aggiornamento: Gennaio 2026*
