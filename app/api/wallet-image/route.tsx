import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cardId = searchParams.get('cardId')

  if (!cardId) {
    return new Response('Missing cardId', { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 1. Fetch card with program
  const { data: card, error } = await supabase
    .from('cards')
    .select('*, programs (*)')
    .eq('id', cardId)
    .single()

  if (error || !card) {
    return new Response('Card not found', { status: 404 })
  }

  const program = card.programs
  const programType = program.program_type || 'stamps'
  const primaryColor = program.primary_color || '#6366f1'

  // 2. Fetch rewards (query separata — edge runtime)
  const { data: rewardsData } = await supabase
    .from('rewards')
    .select('*')
    .eq('program_id', program.id)
    .eq('is_active', true)
    .order('stamps_required', { ascending: true })
  const rewards = rewardsData || []

  // 3. Fetch tiers solo per programmi tiers
  let tiers: any[] = []
  if (programType === 'tiers') {
    const { data: tiersData } = await supabase
      .from('tiers')
      .select('*')
      .eq('program_id', program.id)
      .order('min_spend', { ascending: true })
    tiers = tiersData || []
  }

  const WIDTH = 1032
  const HEIGHT = 336

  let imageContent
  switch (programType) {
    case 'stamps':
      imageContent = generateStampsLayout(card, program, primaryColor, rewards)
      break
    case 'points':
      imageContent = generatePointsLayout(card, program, primaryColor, rewards)
      break
    case 'cashback':
      imageContent = generateCashbackLayout(card, program, primaryColor)
      break
    case 'tiers':
      imageContent = generateTiersLayout(card, program, primaryColor, tiers)
      break
    case 'subscription':
      imageContent = generateSubscriptionLayout(card, program, primaryColor)
      break
    default:
      imageContent = generateStampsLayout(card, program, primaryColor, rewards)
  }

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: primaryColor,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {imageContent}

        {/* Footer — 56px (4x di 14px), assoluto in fondo */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 56, color: 'rgba(255,255,255,0.5)' }}>
            Powered by Zale Marketing
          </span>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  )

  return new Response(imageResponse.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}

// ============================================
// STAMPS / BOLLINI
// Layout 2 righe: titolo (80px) + counter (240px)
// Totale: 80 + 8 gap + 240 = 328px su 336px disponibili
// Niente cerchi: a 4x scale (112px) non entrano in 1032px larghezza con 3+ righe
// ============================================
function generateStampsLayout(card: any, program: any, color: string, rewards: any[]) {
  const stamps = card.current_stamps || card.stamp_count || 0
  const total = program.stamps_required || 10
  const rewardDesc = program.reward_description || 'Premio'

  const nextReward = rewards.find((r: any) => r.stamps_required > stamps)
  const isComplete = stamps >= total

  const subText = isComplete
    ? `PREMIO PRONTO: ${rewardDesc}`
    : nextReward
    ? `Prossimo a ${nextReward.stamps_required}: ${nextReward.name}`
    : `Premio a ${total}: ${rewardDesc}`

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      width: '100%',
      height: '100%',
    }}>
      {/* Riga 1: titolo — 80px (ridotto da 104px per far entrare il sub-testo) */}
      <div style={{
        display: 'flex',
        fontSize: 80,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: 600,
        letterSpacing: 3,
        lineHeight: 1,
      }}>
        I TUOI BOLLINI
      </div>

      {/* Riga 2: contatore — 240px (ridotto da 320px per far entrare tutto) */}
      <div style={{
        display: 'flex',
        fontSize: 240,
        fontWeight: 800,
        color: 'white',
        lineHeight: 1,
      }}>
        {stamps} / {total}
      </div>

      {/* Riga 3: prossimo premio — 88px (4x di 22px) */}
      <div style={{
        display: 'flex',
        fontSize: 88,
        color: 'white',
        fontWeight: isComplete ? 700 : 500,
        lineHeight: 1,
      }}>
        {subText}
      </div>
    </div>
  )
}

// ============================================
// POINTS / PUNTI
// Layout 3 righe: titolo (80px) + punti (200px) + info (48px)
// Totale: 80 + 4 + 200 + 4 + 48 = 336px esatti
// ============================================
function generatePointsLayout(card: any, program: any, color: string, rewards: any[]) {
  const points = Math.round(card.points_balance || 0)
  const pointsRequired = program.stamps_required || 100
  const rewardDesc = program.reward_description || 'Premio'

  const nextReward = rewards.find((r: any) => r.stamps_required > points)
  const isComplete = points >= pointsRequired

  const subText = isComplete
    ? `PREMIO PRONTO: ${rewardDesc}`
    : nextReward
    ? `Prossimo a ${nextReward.stamps_required}: ${nextReward.name}`
    : `Premio a ${pointsRequired}: ${rewardDesc}`

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      width: '100%',
      height: '100%',
    }}>
      {/* Riga 1: titolo — 80px */}
      <div style={{
        display: 'flex',
        fontSize: 80,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: 600,
        letterSpacing: 3,
        lineHeight: 1,
      }}>
        I TUOI PUNTI
      </div>

      {/* Riga 2: punti — 200px */}
      <div style={{
        display: 'flex',
        fontSize: 200,
        fontWeight: 800,
        color: 'white',
        lineHeight: 1,
      }}>
        {points}
      </div>

      {/* Riga 3: info — 48px (ridotto da 88px per far entrare) */}
      <div style={{
        display: 'flex',
        fontSize: 48,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1,
      }}>
        {`/ ${pointsRequired} punti  \u00B7  ${subText}`}
      </div>
    </div>
  )
}

// ============================================
// CASHBACK
// Layout 3 righe: titolo (80px) + saldo (200px) + info (48px)
// ============================================
function generateCashbackLayout(card: any, program: any, color: string) {
  const cashback = card.cashback_balance || 0
  const percent = program.cashback_percent || 5
  const minRedeem = program.min_cashback_redeem || 5
  const canRedeem = cashback >= minRedeem

  const subText = canRedeem
    ? `CREDITO DISPONIBILE`
    : `+${percent}%  \u00B7  Min. \u20AC${minRedeem} per riscattare`

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      width: '100%',
      height: '100%',
    }}>
      {/* Riga 1: titolo — 80px */}
      <div style={{
        display: 'flex',
        fontSize: 80,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: 600,
        letterSpacing: 3,
        lineHeight: 1,
      }}>
        IL TUO CREDITO
      </div>

      {/* Riga 2: saldo — 200px */}
      <div style={{
        display: 'flex',
        fontSize: 200,
        fontWeight: 800,
        color: 'white',
        lineHeight: 1,
      }}>
        {`\u20AC${cashback.toFixed(2)}`}
      </div>

      {/* Riga 3: info — 48px */}
      <div style={{
        display: 'flex',
        fontSize: 48,
        color: 'white',
        fontWeight: canRedeem ? 700 : 500,
        lineHeight: 1,
      }}>
        {subText}
      </div>
    </div>
  )
}

// ============================================
// TIERS / LIVELLI VIP
// Layout 3 righe: titolo (80px) + livello (200px) + info (48px)
// ============================================
function generateTiersLayout(card: any, program: any, color: string, tiers: any[]) {
  const currentTierName = card.current_tier || 'Bronze'
  const totalSpent = card.total_spent || 0

  const currentTierData = tiers.find((t: any) => t.name === currentTierName)
  const discount = currentTierData?.discount_percent || 0
  const nextTierData = tiers.find((t: any) => t.min_spend > totalSpent)
  const remaining = nextTierData ? Math.ceil(nextTierData.min_spend - totalSpent) : 0

  const subText = discount > 0
    ? `-${discount}% sconto  \u00B7  Spesa: \u20AC${totalSpent.toFixed(0)}${nextTierData ? `  \u00B7  Prossimo: ${nextTierData.name} (\u20AC${remaining})` : ''}`
    : `Spesa totale: \u20AC${totalSpent.toFixed(0)}${nextTierData ? `  \u00B7  Prossimo: ${nextTierData.name}` : ' \u00B7 Livello max'}`

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      width: '100%',
      height: '100%',
    }}>
      {/* Riga 1: titolo — 80px */}
      <div style={{
        display: 'flex',
        fontSize: 80,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: 600,
        letterSpacing: 3,
        lineHeight: 1,
      }}>
        IL TUO LIVELLO
      </div>

      {/* Riga 2: nome livello — 200px */}
      <div style={{
        display: 'flex',
        fontSize: 200,
        fontWeight: 800,
        color: 'white',
        lineHeight: 1,
        textTransform: 'uppercase',
      }}>
        {currentTierName}
      </div>

      {/* Riga 3: sconto e spesa — 48px */}
      <div style={{
        display: 'flex',
        fontSize: 48,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1,
      }}>
        {subText}
      </div>
    </div>
  )
}

// ============================================
// SUBSCRIPTION / ABBONAMENTO
// Layout 3 righe: titolo (80px) + stato (200px) + prezzo+utilizzi (48px)
// ============================================
function generateSubscriptionLayout(card: any, program: any, color: string) {
  const status = card.subscription_status || 'active'
  const isActive = status === 'active'
  const usesToday = card.daily_uses || 0
  const dailyLimit = program.daily_limit || 1
  const price = program.subscription_price || 19.99
  const period = program.subscription_period || 'monthly'

  const periodLabels: Record<string, string> = {
    'weekly': 'sett',
    'monthly': 'mese',
    'yearly': 'anno',
  }
  const periodLabel = periodLabels[period] || 'mese'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      width: '100%',
      height: '100%',
    }}>
      {/* Riga 1: titolo — 80px */}
      <div style={{
        display: 'flex',
        fontSize: 80,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: 600,
        letterSpacing: 3,
        lineHeight: 1,
      }}>
        ABBONAMENTO
      </div>

      {/* Riga 2: stato — 200px con badge colorato */}
      <div style={{
        display: 'flex',
        fontSize: 200,
        fontWeight: 800,
        color: 'white',
        lineHeight: 1,
        backgroundColor: isActive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
        padding: '0 24px',
        borderRadius: 16,
      }}>
        {isActive ? 'ATTIVO' : 'SCADUTO'}
      </div>

      {/* Riga 3: prezzo + utilizzi — 48px */}
      <div style={{
        display: 'flex',
        fontSize: 48,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1,
      }}>
        {`\u20AC${price}/${periodLabel}  \u00B7  Utilizzi oggi: ${usesToday}/${dailyLimit}`}
      </div>
    </div>
  )
}
