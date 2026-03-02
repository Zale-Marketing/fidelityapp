import { NextRequest, NextResponse } from 'next/server'
import { updateWalletCard } from '@/lib/google-wallet'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { cardId } = await request.json()

    if (!cardId) {
      return NextResponse.json({ error: 'Card ID mancante' }, { status: 400 })
    }

    // Carica la card con programma e cliente
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        *,
        programs (*),
        card_holders (*),
        merchants (*)
      `)
      .eq('id', cardId)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card non trovata' }, { status: 404 })
    }

    const program = card.programs
    const merchant = card.merchants
    const customer = card.card_holders

    // Carica premi intermedi (query separata come da CLAUDE.md)
    const { data: rewards } = await supabase
      .from('rewards')
      .select('*')
      .eq('program_id', card.program_id)
      .eq('is_active', true)
      .order('stamps_required', { ascending: true })

    // Per i programmi tiers, carica anche i livelli
    let tierDiscount = 0
    let nextTierName = ''
    let nextTierMinSpend = 0
    
    if (program.program_type === 'tiers') {
      const { data: tiers } = await supabase
        .from('tiers')
        .select('*')
        .eq('program_id', program.id)
        .order('min_spend', { ascending: true })
      
      if (tiers) {
        for (let i = 0; i < tiers.length; i++) {
          const tier = tiers[i]
          if (tier.name === card.current_tier) {
            tierDiscount = tier.discount_percent || 0
            if (i + 1 < tiers.length) {
              nextTierName = tiers[i + 1].name
              nextTierMinSpend = tiers[i + 1].min_spend
            }
            break
          }
        }
        if (!card.current_tier && tiers.length > 0) {
          nextTierName = tiers[0].name
          nextTierMinSpend = tiers[0].min_spend
        }
      }
    }

    // Conta missioni
    let activeMissions = 0
    let completedMissions = 0
    if (program.program_type === 'missions') {
      const { count: activeCount } = await supabase
        .from('card_missions')
        .select('*', { count: 'exact', head: true })
        .eq('card_id', cardId)
        .eq('is_completed', false)
      
      const { count: completedCount } = await supabase
        .from('card_missions')
        .select('*', { count: 'exact', head: true })
        .eq('card_id', cardId)
        .eq('is_completed', true)
      
      activeMissions = activeCount || 0
      completedMissions = completedCount || 0
    }

    // Aggiorna il wallet
    await updateWalletCard({
      programId: program.id,
      cardId: card.id,
      scanToken: card.scan_token,
      
      programName: program.name,
      issuerName: merchant?.name || 'Merchant',
      programType: program.program_type || 'stamps',
      
      backgroundColor: program.primary_color,
      logoUrl: program.logo_url || merchant?.logo_url,
      
      rewardDescription: program.reward_description || program.reward_text,

      pointsPerEuro: program.points_per_euro,
      minCashbackRedeem: program.min_cashback_redeem,
      subscriptionPrice: program.subscription_price,
      subscriptionPeriod: program.subscription_period,

      stampCount: card.current_stamps || card.stamp_count || 0,
      stampsRequired: program.stamps_required || 10,
      
      pointsBalance: card.points_balance || 0,
      pointsForReward: program.stamps_required || 100,
      
      cashbackBalance: card.cashback_balance || 0,
      cashbackPercent: program.cashback_percent || 5,
      
      currentTier: card.current_tier || 'Base',
      tierDiscount,
      totalSpent: card.total_spent || 0,
      nextTierName,
      nextTierMinSpend,
      
      subscriptionStatus: card.subscription_status || 'inactive',
      subscriptionEnd: card.subscription_end,
      dailyUses: card.daily_uses || 0,
      dailyLimit: program.daily_limit || 1,
      
      activeMissions,
      completedMissions,

      dbRewards: rewards || [],

      customerName: customer?.full_name,
      customerEmail: customer?.email,
    } as any)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Errore aggiornamento wallet:', error)
    return NextResponse.json(
      { error: 'Errore: ' + error.message },
      { status: 500 }
    )
  }
}