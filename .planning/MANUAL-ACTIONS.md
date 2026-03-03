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
