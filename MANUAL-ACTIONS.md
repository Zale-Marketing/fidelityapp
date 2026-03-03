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

*Ultimo aggiornamento: 2026-03*
