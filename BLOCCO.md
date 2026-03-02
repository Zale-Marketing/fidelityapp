# BLOCCO.md — Azioni Richieste Prima del Deploy in Produzione

## 1. STRIPE BILLING (CRITICO per monetizzazione)

**Stato:** Codice implementato, mancano le chiavi API e la configurazione Stripe.

### Passaggi:

#### A. Crea account Stripe
1. Vai su https://dashboard.stripe.com/register
2. Completa la verifica identità (necessaria per ricevere pagamenti)

#### B. Crea i prodotti/prezzi in Stripe Dashboard
1. Vai su **Prodotti** → **Aggiungi prodotto**
2. Crea **"FidelityApp PRO"** con 2 prezzi:
   - **Mensile:** €19.00/mese → ricopia il Price ID (es: `price_xxxxx`)
   - **Annuale:** €149.00/anno → ricopia il Price ID (es: `price_yyyyy`)

#### C. Aggiungi variabili d'ambiente in Vercel e `.env.local`:
```env
STRIPE_SECRET_KEY=sk_live_xxx          # oppure sk_test_xxx per test
STRIPE_PUBLISHABLE_KEY=pk_live_xxx     # oppure pk_test_xxx per test
STRIPE_WEBHOOK_SECRET=whsec_xxx        # vedi punto D
STRIPE_PRICE_PRO_MONTHLY=price_xxx     # Price ID mensile
STRIPE_PRICE_PRO_YEARLY=price_yyy      # Price ID annuale
```

#### D. Configura il webhook Stripe
1. Vai su **Developers → Webhooks → Add endpoint**
2. URL endpoint: `https://fidelityapp-six.vercel.app/api/stripe-webhook`
3. Events da ascoltare:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copia il **Signing secret** → mettilo in `STRIPE_WEBHOOK_SECRET`

#### E. Configura il Billing Portal Stripe
1. Vai su **Settings → Billing → Customer portal**
2. Abilita le opzioni: cancellazione, aggiornamento metodo di pagamento
3. Salva

#### F. Aggiungi colonne al database Supabase
Esegui questo SQL nel SQL Editor di Supabase:
```sql
-- Colonne Stripe per la tabella merchants
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Assicurati che plan abbia default 'FREE'
ALTER TABLE merchants
  ALTER COLUMN plan SET DEFAULT 'FREE';
```

---

## 2. TABELLA NOTIFICATION_LOGS (per Notifiche push)

**Stato:** La pagina `/dashboard/notifications` usa questa tabella. Se non esiste, la cronologia non viene salvata (ma l'invio funziona comunque).

Esegui questo SQL in Supabase:
```sql
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  recipients_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants see own logs" ON notification_logs
  FOR ALL USING (
    merchant_id IN (
      SELECT merchant_id FROM profiles WHERE id = auth.uid()
    )
  );
```

---

## 3. ENFORCEMENT PIANO FREE (limite 5 programmi)

**Stato:** La pagina `programs/new` non controlla il piano.

Da fare: Aggiungere check in `app/dashboard/programs/new/page.tsx` prima del submit:
```typescript
const isPro = merchant?.plan === 'PRO'
const programCount = programs.length
if (!isPro && programCount >= 5) {
  // Mostra banner upgrade invece del form
}
```

---

## 4. UPLOAD LOGO (Supabase Storage)

**Stato:** Il form crea programma, ma l'upload logo punta a Supabase Storage.
Assicurati che in Supabase Storage esista un bucket `logos` con policy pubblica:
```sql
-- Nel Supabase Dashboard → Storage → Policies
-- Crea bucket "logos" con accesso pubblico
```

---

## 5. EMAIL CONFERMA (Supabase Auth)

**Stato:** Gli utenti si registrano ma Supabase potrebbe richiedere conferma email.
In produzione, configura il template email in **Supabase → Auth → Email Templates**.

---

## Checklist finale prima del go-live:
- [ ] Stripe account verificato (KYC completato)
- [ ] Price ID mensile e annuale creati e inseriti in env
- [ ] Webhook endpoint configurato e verificato
- [ ] SQL Supabase eseguito (colonne stripe + tabella notification_logs)
- [ ] Variabili d'ambiente aggiunte in Vercel
- [ ] Test pagamento con carta test Stripe (4242 4242 4242 4242)
- [ ] Deploy su Vercel completato

---
*Generato automaticamente da Claude Code — FidelityApp*
