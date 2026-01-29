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

    // Carica la card
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card non trovata' }, { status: 404 })
    }

    // Carica il programma
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', card.program_id)
      .single()

    if (programError || !program) {
      return NextResponse.json({ error: 'Programma non trovato' }, { status: 404 })
    }

    // Carica il merchant
    const { data: merchant } = await supabase
      .from('merchants')
      .select('name, logo_url')
      .eq('id', card.merchant_id)
      .single()

    // Per i programmi tiers, carica lo sconto attuale
    let tierDiscount = 0
    if (program.program_type === 'tiers' && card.current_tier) {
      const { data: tier } = await supabase
        .from('tiers')
        .select('discount_percent')
        .eq('program_id', program.id)
        .eq('name', card.current_tier)
        .single()
      
      if (tier) {
        tierDiscount = tier.discount_percent || 0
      }
    }

    const programType = program.program_type || 'stamps'

    // Aggiorna il wallet con la nuova struttura
    await updateWalletCard({
      programId: program.id,
      cardId: card.id,
      scanToken: card.scan_token,
      programName: program.name,
      issuerName: merchant?.name || 'Merchant',
      backgroundColor: program.primary_color || '#6366f1',
      logoUrl: program.logo_url || merchant?.logo_url,
      programType: programType as any,
      
      // Stamps
      stampCount: card.current_stamps || card.stamp_count || 0,
      stampsRequired: program.stamps_required || 10,
      
      // Points
      pointsBalance: card.points_balance || 0,
      pointsForReward: program.stamps_required || 100,
      
      // Cashback
      cashbackBalance: card.cashback_balance || 0,
      cashbackPercent: program.cashback_percent || 5,
      
      // Tiers
      currentTier: card.current_tier || 'Base',
      tierDiscount: tierDiscount,
      totalSpent: card.total_spent || 0,
      
      // Subscription
      subscriptionStatus: card.subscription_status || 'inactive',
      subscriptionEnd: card.subscription_end,
      dailyUses: card.daily_uses || 0,
      dailyLimit: program.daily_limit || 1,
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Errore aggiornamento wallet:', error)
    return NextResponse.json(
      { error: 'Errore: ' + error.message },
      { status: 500 }
    )
  }
}