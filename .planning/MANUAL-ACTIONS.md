# Manual Actions Required

This file documents SQL migrations and other manual steps that must be executed by a human outside of the automated code deployment.

---

## Phase 6: Critical Fixes v2

### SQL — Create leads table (run in Supabase SQL Editor)

Go to: Supabase Dashboard > SQL Editor, then run:

```sql
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text,
  message text,
  created_at timestamptz default now()
);

alter table leads enable row level security;

create policy "Anyone can insert leads" on leads
  for insert with check (true);
```

After running, verify the table appears in Supabase Dashboard > Table Editor > leads.

**Status:** PENDING — required before Plan 06-01 Task 2 can execute.

---

### SQL — Add deleted_at to programs table (run in Supabase SQL Editor)

Go to: Supabase Dashboard > SQL Editor, then run:

```sql
alter table programs add column if not exists deleted_at timestamptz;
```

After running, verify:
1. Go to Supabase Dashboard → Table Editor → programs
2. Check that the column "deleted_at" appears (type: timestamptz, nullable)
3. Existing rows should have NULL in deleted_at — that is correct

**Status:** PENDING — required before Plan 06-02 Task 1 can execute.

---

## Phase 8: Engagement Automation

### SQL — Add birth_date column to card_holders (BDAY-02)

Go to: Supabase Dashboard > SQL Editor, then run:

```sql
ALTER TABLE card_holders ADD COLUMN IF NOT EXISTS birth_date date;
```

After running, verify:
1. Go to Supabase Dashboard → Table Editor → card_holders
2. Check that the column "birth_date" appears (type: date, nullable)
3. Existing rows should have NULL in birth_date — that is correct

**Status:** PENDING — required before birthday form field (BDAY-01) and cron route (BDAY-04) can work correctly.

---

### Vercel — Add CRON_SECRET environment variable (BDAY-03)

The birthday cron route is protected by a secret header. Add this env var to Vercel:

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add new variable:
   - Name: `CRON_SECRET`
   - Value: any random string (e.g. generate with `openssl rand -hex 32`)
   - Environments: Production, Preview, Development
3. Redeploy the project after adding the variable

**Why needed:** Vercel Cron automatically sends `Authorization: Bearer CRON_SECRET` when invoking the cron route. Without this variable set, the route returns 401 for every cron invocation.

---

### Vercel — Pro Plan required for Cron Jobs (BDAY-03)

Vercel Cron is only available on Vercel Pro plan (not Hobby). If the project is on Hobby plan:
- The cron route `/api/cron/birthday` will NOT fire automatically
- The route can still be triggered manually for testing:
  ```bash
  curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://fidelityapp-six.vercel.app/api/cron/birthday
  ```
- Upgrade to Vercel Pro to enable automatic daily execution at 09:00 UTC

**Status:** PENDING — verify Vercel plan and upgrade if needed.

---

## Phase 9: Business Tools

### SQL — Add google_reviews_url to programs table (REVIEW-01)

Go to: Supabase Dashboard > SQL Editor, then run:

```sql
ALTER TABLE programs ADD COLUMN IF NOT EXISTS google_reviews_url text;
```

After running, verify:
1. Go to Supabase Dashboard → Table Editor → programs
2. Check that the column "google_reviews_url" appears (type: text, nullable)
3. Existing rows should have NULL in google_reviews_url — that is correct

**Status:** PENDING — must be run before Plan 09-02 deploys form changes.

---

### SQL — Verify/add plan column on merchants table (PLAN-01)

Go to: Supabase Dashboard > SQL Editor, then run the following to verify the column exists:

```sql
-- Verify column exists:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'merchants' AND column_name = 'plan';
```

If the column does not appear, add it:

```sql
-- Add if missing:
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';
```

Also check for a CHECK constraint that might block the 'business' value:

```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE '%merchants%plan%';
```

If a constraint exists that does not include 'business', replace it:

```sql
-- Replace constraint_name with the actual name found above
ALTER TABLE merchants DROP CONSTRAINT constraint_name;
ALTER TABLE merchants ADD CONSTRAINT merchants_plan_check CHECK (plan IN ('free', 'pro', 'business'));
```

After running, verify:
1. Go to Supabase Dashboard → Table Editor → merchants
2. Check that the column "plan" appears (type: text, default: 'free')
3. Confirm values 'free', 'pro', and 'business' are all accepted by the constraint

**Status:** PENDING — verify column exists and 'business' value is accepted before Phase 9 executes.

---

## Phase 10: WhatsApp Marketing

### SQL — Add Maytapi columns to merchants table (WA-01)

Go to: Supabase Dashboard > SQL Editor, then run:

```sql
-- Phase 10: WhatsApp Marketing — Add Maytapi columns to merchants
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS maytapi_phone_id text,
  ADD COLUMN IF NOT EXISTS maytapi_session_status text DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS maytapi_daily_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maytapi_last_reset_date date;
```

After running, verify:
1. Go to Supabase Dashboard → Table Editor → merchants
2. Check that four columns appear:
   - `maytapi_phone_id` (type: text, nullable)
   - `maytapi_session_status` (type: text, default: 'inactive')
   - `maytapi_daily_count` (type: integer, default: 0)
   - `maytapi_last_reset_date` (type: date, nullable)
3. Existing rows should have NULL in maytapi_phone_id — that is correct

**Status:** PENDING — must run before any /api/whatsapp/* routes will work correctly.

---

### Vercel — Add Maytapi environment variables (WA-02)

The WhatsApp integration uses Maytapi as the provider. You need to:

1. Create an account at https://console.maytapi.com
2. Go to Settings → Token to find your PRODUCT_ID and API_TOKEN
3. Add to Vercel Dashboard → Project Settings → Environment Variables:
   - Name: `MAYTAPI_PRODUCT_ID`
     Value: your Product ID from Maytapi console
     Environments: Production, Preview, Development
   - Name: `MAYTAPI_API_TOKEN`
     Value: your API Token from Maytapi console
     Environments: Production, Preview, Development
4. Redeploy the project after adding both variables

**Why needed:** All /api/whatsapp/* routes call the Maytapi API using these credentials. Without them, all WhatsApp functionality will return 500 errors.

**Status:** PENDING — required before any WhatsApp functionality works.

---

## Phase 11: Webhook Integrations

### SQL — Create webhook_endpoints table (WH-01)

Go to: Supabase Dashboard > SQL Editor, then run:

```sql
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_endpoints_merchant_id_idx
  ON webhook_endpoints(merchant_id);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants manage own webhook endpoints" ON webhook_endpoints
  FOR ALL USING (
    merchant_id IN (
      SELECT merchant_id FROM profiles WHERE id = auth.uid()
    )
  );
```

After running, verify:
1. Go to Supabase Dashboard -> Table Editor -> webhook_endpoints
2. Confirm columns: id, merchant_id, url, events (type: text[]), secret, is_active, created_at
3. Confirm RLS is enabled (green shield icon on the table)

**Status:** PENDING — must be executed before Phase 11 webhook CRUD API and UI can function.
