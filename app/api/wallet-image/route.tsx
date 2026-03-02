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

        {/* Footer centrato — absolute per non influenzare il layout centrale */}
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
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
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
// ============================================
function generateStampsLayout(card: any, program: any, color: string, rewards: any[]) {
  const stamps = card.current_stamps || card.stamp_count || 0
  const total = program.stamps_required || 10
  const rewardDesc = program.reward_description || 'Premio'

  // Prossimo reward con stamps_required > bollini attuali
  const nextReward = rewards.find((r: any) => r.stamps_required > stamps)
  const isComplete = stamps >= total

  // Cerchi: max 10 visibili
  const circleCount = Math.min(total, 10)
  const filledCount = total <= 10
    ? Math.min(stamps, circleCount)
    : Math.min(Math.round((stamps / total) * circleCount), circleCount)

  const circles = []
  for (let i = 0; i < circleCount; i++) {
    circles.push(
      <div
        key={i}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: i < filledCount ? 'white' : 'rgba(255,255,255,0.3)',
          display: 'flex',
        }}
      />
    )
  }

  const row4 = isComplete
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
      gap: 10,
      width: '100%',
      height: '100%',
    }}>
      {/* Riga 1: titolo */}
      <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.8)', fontWeight: 600, letterSpacing: 2 }}>
        I TUOI BOLLINI
      </div>

      {/* Riga 2: contatore grande */}
      <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, color: 'white', lineHeight: 1 }}>
        {stamps} / {total}
      </div>

      {/* Riga 3: cerchi bollini */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {circles}
      </div>

      {/* Riga 4: prossimo premio */}
      <div style={{ display: 'flex', fontSize: 22, color: 'white', fontWeight: isComplete ? 700 : 500 }}>
        {row4}
      </div>
    </div>
  )
}

// ============================================
// POINTS / PUNTI
// ============================================
function generatePointsLayout(card: any, program: any, color: string, rewards: any[]) {
  const points = Math.round(card.points_balance || 0)
  const pointsRequired = program.stamps_required || 100
  const progress = Math.min((points / pointsRequired) * 100, 100)
  const rewardDesc = program.reward_description || 'Premio'

  const nextReward = rewards.find((r: any) => r.stamps_required > points)
  const isComplete = points >= pointsRequired

  const row4 = isComplete
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
      gap: 8,
      width: '100%',
      height: '100%',
    }}>
      {/* Riga 1: titolo */}
      <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.8)', fontWeight: 600, letterSpacing: 2 }}>
        I TUOI PUNTI
      </div>

      {/* Riga 2: punti grandi */}
      <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, color: 'white', lineHeight: 1 }}>
        {points}
      </div>

      {/* Riga 3: barra progresso + X/Y punti */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '80%' }}>
        <div style={{
          display: 'flex',
          width: '100%',
          height: 16,
          backgroundColor: 'rgba(255,255,255,0.25)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            width: `${progress}%`,
            height: '100%',
            backgroundColor: 'white',
            borderRadius: 8,
          }} />
        </div>
        <div style={{ display: 'flex', fontSize: 20, color: 'rgba(255,255,255,0.8)' }}>
          {points} / {pointsRequired} punti
        </div>
      </div>

      {/* Riga 4: prossimo premio */}
      <div style={{ display: 'flex', fontSize: 22, color: 'white', fontWeight: isComplete ? 700 : 500 }}>
        {row4}
      </div>
    </div>
  )
}

// ============================================
// CASHBACK
// ============================================
function generateCashbackLayout(card: any, program: any, color: string) {
  const cashback = card.cashback_balance || 0
  const percent = program.cashback_percent || 5
  const minRedeem = program.min_cashback_redeem || 5
  const canRedeem = cashback >= minRedeem

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      width: '100%',
      height: '100%',
    }}>
      {/* Riga 1: titolo */}
      <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.8)', fontWeight: 600, letterSpacing: 2 }}>
        IL TUO CREDITO
      </div>

      {/* Riga 2: saldo grande */}
      <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, color: 'white', lineHeight: 1 }}>
        {`\u20AC${cashback.toFixed(2)}`}
      </div>

      {/* Riga 3: percentuale */}
      <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
        +{percent}% su ogni acquisto
      </div>

      {/* Riga 4: stato riscatto */}
      {canRedeem ? (
        <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.25)', padding: '6px 20px', borderRadius: 10 }}>
          <span style={{ display: 'flex', fontSize: 22, color: 'white', fontWeight: 700 }}>
            CREDITO DISPONIBILE
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.75)' }}>
          {`Min. \u20AC${minRedeem} per riscattare`}
        </div>
      )}
    </div>
  )
}

// ============================================
// TIERS / LIVELLI VIP
// ============================================
function generateTiersLayout(card: any, program: any, color: string, tiers: any[]) {
  const currentTierName = card.current_tier || 'Bronze'
  const totalSpent = card.total_spent || 0

  const currentTierData = tiers.find((t: any) => t.name === currentTierName)
  const discount = currentTierData?.discount_percent || 0
  const nextTierData = tiers.find((t: any) => t.min_spend > totalSpent)
  const remaining = nextTierData ? Math.ceil(nextTierData.min_spend - totalSpent) : 0

  const row3 = discount > 0
    ? `-${discount}% sconto  \u00B7  Spesa: \u20AC${totalSpent.toFixed(0)}`
    : `Spesa totale: \u20AC${totalSpent.toFixed(0)}`

  const row4 = nextTierData
    ? `Prossimo: ${nextTierData.name} a \u20AC${nextTierData.min_spend} (mancano \u20AC${remaining})`
    : 'Livello massimo raggiunto'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      width: '100%',
      height: '100%',
    }}>
      {/* Riga 1: titolo */}
      <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.8)', fontWeight: 600, letterSpacing: 2 }}>
        IL TUO LIVELLO
      </div>

      {/* Riga 2: nome livello grande */}
      <div style={{
        display: 'flex',
        fontSize: 72,
        fontWeight: 800,
        color: 'white',
        lineHeight: 1,
        textTransform: 'uppercase',
      }}>
        {currentTierName}
      </div>

      {/* Riga 3: sconto e spesa */}
      <div style={{ display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.85)' }}>
        {row3}
      </div>

      {/* Riga 4: prossimo livello */}
      <div style={{ display: 'flex', fontSize: 20, color: 'rgba(255,255,255,0.7)' }}>
        {row4}
      </div>
    </div>
  )
}

// ============================================
// SUBSCRIPTION / ABBONAMENTO
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
      gap: 10,
      width: '100%',
      height: '100%',
    }}>
      {/* Riga 1: titolo */}
      <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.8)', fontWeight: 600, letterSpacing: 2 }}>
        ABBONAMENTO
      </div>

      {/* Riga 2: stato con badge colorato */}
      <div style={{
        display: 'flex',
        fontSize: 72,
        fontWeight: 800,
        color: 'white',
        lineHeight: 1,
        backgroundColor: isActive ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
        padding: '4px 24px',
        borderRadius: 12,
      }}>
        {isActive ? 'ATTIVO' : 'SCADUTO'}
      </div>

      {/* Riga 3: prezzo */}
      <div style={{ display: 'flex', fontSize: 30, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
        {`\u20AC${price}/${periodLabel}`}
      </div>

      {/* Riga 4: utilizzi giornalieri */}
      <div style={{ display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.8)' }}>
        {`Utilizzi oggi: ${usesToday} / ${dailyLimit}`}
      </div>
    </div>
  )
}
