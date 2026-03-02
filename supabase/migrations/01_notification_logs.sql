-- Migration: Create notification_logs table
-- Run this in Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  recipients_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Policy: each merchant sees only their own logs
CREATE POLICY "Merchants see own notification logs"
  ON notification_logs
  FOR ALL
  USING (
    merchant_id IN (
      SELECT merchant_id FROM profiles WHERE id = auth.uid()
    )
  );
