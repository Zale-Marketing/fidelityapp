-- Migration: Retention schema — customer_tags, card_holder_tags, card_holders extended columns. Run in Supabase Dashboard -> SQL Editor

-- 1. Create customer_tags table
CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, name)
);

-- 2. Create card_holder_tags junction table
CREATE TABLE IF NOT EXISTS card_holder_tags (
  card_holder_id UUID NOT NULL REFERENCES card_holders(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (card_holder_id, tag_id)
);

-- 3. Add extended columns to card_holders (idempotent)
ALTER TABLE card_holders
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
  ADD COLUMN IF NOT EXISTS last_visit DATE,
  ADD COLUMN IF NOT EXISTS total_stamps INTEGER DEFAULT 0;

-- 4. Enable Row Level Security on new tables
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_holder_tags ENABLE ROW LEVEL SECURITY;

-- Policy: each merchant sees only their own tags
CREATE POLICY "Merchants see own tags"
  ON customer_tags
  FOR ALL
  USING (
    merchant_id IN (
      SELECT merchant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: each merchant sees only tags assigned to their own card holders
CREATE POLICY "Merchants see own holder tags"
  ON card_holder_tags
  FOR ALL
  USING (
    card_holder_id IN (
      SELECT id FROM card_holders
      WHERE merchant_id IN (
        SELECT merchant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
