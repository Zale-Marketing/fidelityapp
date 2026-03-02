-- Migration: Add Stripe billing columns to merchants table
-- Run this in Supabase Dashboard -> SQL Editor

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Ensure plan column defaults to FREE for new merchants
ALTER TABLE merchants
  ALTER COLUMN plan SET DEFAULT 'FREE';
