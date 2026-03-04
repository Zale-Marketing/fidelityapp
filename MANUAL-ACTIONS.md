# MANUAL-ACTIONS.md
# Azioni manuali richieste su Supabase (SQL / Dashboard)

Esegui questi comandi SQL nel SQL Editor di Supabase prima di deployare le funzionalità corrispondenti.

---

## 1. Soft delete per carte (`cards.deleted_at`)

Richiesto da: BUG 1 — pulsante "Elimina carta" nella pagina programma

```sql
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Indice opzionale per query performance
CREATE INDEX IF NOT EXISTS idx_cards_deleted_at ON cards (deleted_at) WHERE deleted_at IS NULL;
```

---

## 2. Credenziali Maytapi per merchant (`merchants`)

Richiesto da: BUG 4 — form credenziali nella pagina WhatsApp Settings

```sql
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS maytapi_product_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS maytapi_api_token  text DEFAULT NULL;
```

---

## 3. Colonna `phone` su `card_holders` (se non esiste)

Richiesto da: BUG 2 — insert card_holder dalla pagina /join

> La colonna `contact_email` è già presente. Verificare che esista anche `phone`.

```sql
ALTER TABLE card_holders
  ADD COLUMN IF NOT EXISTS phone text DEFAULT NULL;
```

---

## 4. Colonne Stripe su `merchants` (già documentato)

Vedi BLOCCO.md per le istruzioni complete su Stripe.

```sql
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS stripe_customer_id         text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text,
  ADD COLUMN IF NOT EXISTS plan_expires_at            timestamptz;
```

---

## 5. Tabella `notification_logs` (già documentato)

Vedi BLOCCO.md.

---

---

## 6. Modulo OCIO — tabelle ocio_config e ocio_reviews

Richiesto da: Phase 13 — OCIO Foundation

Eseguire nel SQL Editor di Supabase (Dashboard > SQL Editor > New query). Tutto il SQL usa IF NOT EXISTS per idempotency — se le tabelle esistono gia, vengono saltate senza errore.

### Tabella ocio_config

```sql
CREATE TABLE IF NOT EXISTS ocio_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE UNIQUE,
  google_maps_url TEXT,
  google_place_id TEXT,
  place_name TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expires_at TIMESTAMPTZ,
  google_account_connected BOOLEAN DEFAULT false,
  business_description TEXT,
  reply_tone TEXT DEFAULT 'professional',
  module_reviews BOOLEAN DEFAULT true,
  module_alerts BOOLEAN DEFAULT true,
  module_social BOOLEAN DEFAULT false,
  module_competitor BOOLEAN DEFAULT false,
  module_price BOOLEAN DEFAULT false,
  module_reports BOOLEAN DEFAULT false,
  alert_whatsapp_number TEXT,
  alert_min_rating INT DEFAULT 3,
  last_scrape_at TIMESTAMPTZ,
  trigger_schedule_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabella ocio_reviews + indici

```sql
CREATE TABLE IF NOT EXISTS ocio_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  review_id TEXT NOT NULL,
  author_name TEXT,
  author_url TEXT,
  rating INT,
  text TEXT,
  published_at TIMESTAMPTZ,
  owner_reply TEXT,
  owner_reply_at TIMESTAMPTZ,
  review_url TEXT,
  place_id TEXT,
  ai_sentiment TEXT,
  ai_score INT,
  ai_themes TEXT[],
  ai_urgency TEXT,
  ai_category TEXT,
  ai_summary TEXT,
  ai_is_fake BOOLEAN DEFAULT false,
  ai_fake_reason TEXT,
  ai_suggested_reply TEXT,
  ai_analyzed_at TIMESTAMPTZ,
  reply_status TEXT DEFAULT 'pending',
  replied_at TIMESTAMPTZ,
  alert_sent BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(merchant_id, review_id)
);
CREATE INDEX IF NOT EXISTS idx_ocio_reviews_merchant ON ocio_reviews(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ocio_reviews_rating ON ocio_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_ocio_reviews_published ON ocio_reviews(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocio_reviews_pending ON ocio_reviews(merchant_id) WHERE reply_status = 'pending';
```

### Tabelle stub per fasi future

Queste tabelle vengono popolate nelle fasi 14-16. Crearle ora per evitare errori FK in futuro.

```sql
CREATE TABLE IF NOT EXISTS ocio_competitor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ocio_social_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ocio_monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ocio_alerts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

*Ultimo aggiornamento: 2026-03*
