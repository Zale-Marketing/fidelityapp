// =============================================
// TIPI BASE
// =============================================

export type Merchant = {
  id: string
  name: string
  slug: string
  email: string
  phone: string | null
  address: string | null
  logo_url: string | null
  subscription_tier: 'free' | 'starter' | 'pro' | 'enterprise'
  subscription_status: 'active' | 'canceled' | 'past_due'
  created_at: string
}

export type Profile = {
  id: string
  merchant_id: string
  role: 'owner' | 'admin' | 'staff'
  full_name: string | null
  created_at: string
}

// =============================================
// PROGRAMMI E PREMI
// =============================================

export type Program = {
  id: string
  merchant_id: string
  name: string
  description?: string
  stamps_required: number
  reward_description?: string
  primary_color: string
  secondary_color?: string
  text_color?: string
  logo_url?: string
  welcome_message?: string
  terms_conditions?: string
  program_type?: 'stamps' | 'points' | 'cashback' | 'tiers' | 'subscription' | 'missions'
  allow_multiple_redemption?: boolean
  external_rewards_url?: string
  rules_url?: string
  is_active: boolean
  is_cumulative?: boolean
  points_expire_days?: number
  birthday_bonus_stamps?: number
  referral_bonus_stamps?: number
  created_at: string
  updated_at?: string
}

export type Reward = {
  id: string
  program_id: string
  merchant_id: string
  name: string
  description: string | null
  stamps_required: number
  reward_type: 'product' | 'discount' | 'freebie'
  discount_value: number | null
  discount_percent: number | null
  is_active: boolean
  sort_order: number
  times_redeemed: number
  created_at: string
  updated_at: string
}

export type Redemption = {
  id: string
  card_id: string
  reward_id: string
  card_holder_id: string | null
  merchant_id: string | null
  program_id: string | null
  staff_user_id: string | null
  stamps_at_redemption: number | null
  redeemed_at: string
}

// =============================================
// CLIENTI E CARD
// =============================================

export type CardHolder = {
  id: string
  merchant_id: string
  contact_email: string | null
  contact_phone: string | null
  full_name: string | null
  phone: string | null
  birth_date: string | null
  notes: string | null
  total_stamps: number
  total_rewards: number
  last_visit: string | null
  marketing_consent: boolean
  acquisition_source: string | null
  preferred_language: string
  created_at: string
  // Relazioni (opzionali, per join)
  tags?: CustomerTag[]
  cards?: Card[]
}

export type Card = {
  id: string
  program_id: string
  merchant_id: string
  card_holder_id: string | null
  scan_token: string
  stamp_count: number
  lifetime_stamps: number
  current_stamps: number
  next_reward_at: number | null
  status: 'active' | 'reward_ready' | 'redeemed' | 'expired'
  wallet_provider: 'none' | 'google' | 'apple'
  created_at: string
  updated_at: string
  // Relazioni (opzionali, per join)
  program?: Program
  card_holder?: CardHolder
  available_rewards?: Reward[]
}

// =============================================
// TAG E CATEGORIZZAZIONE
// =============================================

export type CustomerTag = {
  id: string
  merchant_id: string
  name: string
  color: string
  created_at: string
}

export type CardHolderTag = {
  card_holder_id: string
  tag_id: string
}

// =============================================
// NOTIFICHE E AUTOMAZIONI
// =============================================

export type Notification = {
  id: string
  merchant_id: string
  program_id: string | null
  title: string
  message: string
  target_type: 'all' | 'single' | 'tag'
  target_card_id: string | null
  target_tag_id: string | null
  scheduled_at: string | null
  sent_at: string | null
  status: 'draft' | 'scheduled' | 'sent'
  recipients_count: number
  created_at: string
}

export type Automation = {
  id: string
  merchant_id: string
  program_id: string | null
  name: string
  trigger_type: 'welcome' | 'birthday' | 'inactive' | 'reward_ready'
  trigger_days: number | null
  message_title: string | null
  message_body: string | null
  is_active: boolean
  times_triggered: number
  created_at: string
}

// =============================================
// TRANSAZIONI E STORICO
// =============================================

export type StampTransaction = {
  id: string
  merchant_id: string
  program_id: string
  card_id: string
  card_holder_id: string | null
  staff_user_id: string | null
  type: 'add' | 'redeem' | 'bonus' | 'expire' | 'manual'
  delta: number
  note: string | null
  idempotency_key: string
  created_at: string
}

// =============================================
// ANALYTICS E STATISTICHE
// =============================================

export type MerchantStats = {
  total_customers: number
  active_customers: number
  total_stamps_given: number
  total_rewards_redeemed: number
  avg_visits_per_customer: number
  top_customers: CardHolder[]
}

export type ProgramStats = {
  program_id: string
  total_cards: number
  active_cards: number
  stamps_this_month: number
  redemptions_this_month: number
  avg_stamps_per_card: number
}

// =============================================
// FORM E INPUT TYPES
// =============================================

export type CreateProgramInput = {
  name: string
  description?: string
  stamps_required: number
  reward_description?: string
  primary_color?: string
  secondary_color?: string
  text_color?: string
  logo_url?: string
  welcome_message?: string
  terms_conditions?: string
  is_cumulative?: boolean
}

export type CreateRewardInput = {
  program_id: string
  name: string
  description?: string
  stamps_required: number
  reward_type?: 'product' | 'discount' | 'freebie'
  discount_value?: number
  discount_percent?: number
  sort_order?: number
}

export type CreateCardHolderInput = {
  contact_email?: string
  full_name?: string
  phone?: string
  birth_date?: string
  notes?: string
  marketing_consent?: boolean
  acquisition_source?: string
}

export type CreateNotificationInput = {
  program_id?: string
  title: string
  message: string
  target_type: 'all' | 'single' | 'tag'
  target_card_id?: string
  target_tag_id?: string
  scheduled_at?: string
}