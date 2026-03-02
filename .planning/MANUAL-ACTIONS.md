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
