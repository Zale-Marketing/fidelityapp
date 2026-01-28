// Tipi per il database FidelityApp

export type Merchant = {
  id: string
  name: string
  plan: 'FREE' | 'PRO'
  subscription_status: string
  created_at: string
}

export type Profile = {
  id: string
  merchant_id: string
  email: string
  full_name: string | null
  role: 'OWNER' | 'STAFF'
  is_active: boolean
  created_at: string
}

export type Program = {
  id: string
  merchant_id: string
  name: string
  stamps_required: number
  reward_text: string
  expires_at: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  status: 'active' | 'locked' | 'archived'
  created_at: string
}

export type CardHolder = {
  id: string
  merchant_id: string
  contact_email: string | null
  contact_phone: string | null
  created_at: string
}

export type Card = {
  id: string
  merchant_id: string
  program_id: string
  card_holder_id: string | null
  stamp_count: number
  status: 'active' | 'reward_ready' | 'redeemed'
  wallet_provider: 'apple' | 'google' | 'none' | null
  scan_token: string
  created_at: string
  updated_at: string
}

export type StampTransaction = {
  id: string
  merchant_id: string
  program_id: string
  card_id: string
  staff_user_id: string | null
  type: 'add' | 'remove' | 'redeem'
  delta: number
  idempotency_key: string
  created_at: string
}