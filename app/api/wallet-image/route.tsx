import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { getNextRewardText } from '@/lib/wallet-helpers'

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

  const { data: rewardsData } = await supabase
    .from('rewards')
    .select('*')
    .eq('program_id', program.id)
    .eq('is_active', true)
    .order('stamps_required', { ascending: true })
  const rewards = rewardsData || []

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

        {/* Footer */}
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
          <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>
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
// Cerchi adattivi: 1 riga se <=10, 2 righe se >10
// ============================================
function generateStampsLayout(card: any, program: any, color: string, rewards: any[]) {
  const stamps = card.current_stamps || card.stamp_count || 0
  const total = program.stamps_required || 10

  const { header: prizeHeader, body: prizeBody } = getNextRewardText(
    stamps,
    total,
    program.reward_description || '',
    rewards
  )

  // Calcolo dimensioni cerchi adattive
  const useTwoRows = total > 10
  const circlesPerRow = useTwoRows ? Math.ceil(total / 2) : total
  const gap = useTwoRows ? 10 : 12
  const diameter = useTwoRows
    ? Math.min(44, Math.floor((1032 - 80) / circlesPerRow) - 10)
    : Math.min(56, Math.floor((1032 - 80) / total) - 12)

  const allIndices = Array.from({ length: total }, (_, i) => i)
  const row1 = useTwoRows ? allIndices.slice(0, circlesPerRow) : allIndices
  const row2 = useTwoRows ? allIndices.slice(circlesPerRow) : []

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      width: '100%',
      height: '100%',
      paddingBottom: 28,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap, alignItems: 'center' }}>
          {row1.map((i) => (
            <div
              key={i}
              style={{
                width: diameter,
                height: diameter,
                borderRadius: '50%',
                backgroundColor: i < stamps ? 'white' : 'transparent',
                border: '3px solid white',
              }}
            />
          ))}
        </div>
        {useTwoRows && (
          <div style={{ display: 'flex', flexDirection: 'row', gap, alignItems: 'center' }}>
            {row2.map((i) => (
              <div
                key={i}
                style={{
                  width: diameter,
                  height: diameter,
                  borderRadius: '50%',
                  backgroundColor: i < stamps ? 'white' : 'transparent',
                  border: '3px solid white',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}>
        <div style={{
          display: 'flex',
          fontSize: 18,
          color: 'rgba(255,255,255,0.7)',
          fontWeight: 600,
          letterSpacing: 2,
          lineHeight: 1,
        }}>
          {prizeHeader}
        </div>
        <div style={{
          display: 'flex',
          fontSize: 22,
          color: 'white',
          fontWeight: 700,
          lineHeight: 1,
        }}>
          {prizeBody}
        </div>
      </div>
    </div>
  )
}

// ============================================
// POINTS / PUNTI
// Titolo 32px + punti 80px + sub 26px
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
      gap: 8,
      width: '100%',
      height: '100%',
      paddingBottom: 28,
    }}>
      <div style={{
        display: 'flex',
        fontSize: 32,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: 600,
        letterSpacing: 3,
        lineHeight: 1,
      }}>
        I TUOI PUNTI
      </div>

      <div style={{
        display: 'flex',
        fontSize: 80,
        fontWeight: 800,
        color: 'white',
        lineHeight: 1,
      }}>
        {points}
      </div>

      <div style={{
        display: 'flex',
        fontSize: 26,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1,
      }}>
        {`/ ${pointsRequired} punti`}
      </div>

      <div style={{
        display: 'flex',
        fontSize: 26,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: isComplete ? 700 : 500,
        lineHeight: 1,
      }}>
        {subText}
      </div>
    </div>
  )
}

// ============================================
// CASHBACK
// Titolo 32px + saldo 80px + sub 26px
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
      gap: 8,
      width: '100%',
      height: '100%',
      paddingBottom: 28,
    }}>
      <div style={{
        display: 'flex',
        fontSize: 32,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: 600,
        letterSpacing: 3,
        lineHeight: 1,
      }}>
        IL TUO CREDITO
      </div>

      <div style={{
        display: 'flex',
        fontSize: 80,
        fontWeight: 800,
        color: 'white',
        lineHeight: 1,
      }}>
        {`\u20AC${cashback.toFixed(2)}`}
      </div>

      <div style={{
        display: 'flex',
        fontSize: 26,
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
// Titolo 32px + livello 80px + sub 26px
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
      gap: 8,
      width: '100%',
      height: '100%',
      paddingBottom: 28,
    }}>
      <div style={{
        display: 'flex',
        fontSize: 32,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: 600,
        letterSpacing: 3,
        lineHeight: 1,
      }}>
        IL TUO LIVELLO
      </div>

      <div style={{
        display: 'flex',
        fontSize: 80,
        fontWeight: 800,
        color: 'white',
        lineHeight: 1,
        textTransform: 'uppercase',
      }}>
        {currentTierName}
      </div>

      <div style={{
        display: 'flex',
        fontSize: 26,
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
// Titolo 32px + stato 80px + sub 26px
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
      gap: 8,
      width: '100%',
      height: '100%',
      paddingBottom: 28,
    }}>
      <div style={{
        display: 'flex',
        fontSize: 32,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: 600,
        letterSpacing: 3,
        lineHeight: 1,
      }}>
        ABBONAMENTO
      </div>

      <div style={{
        display: 'flex',
        fontSize: 80,
        fontWeight: 800,
        color: 'white',
        lineHeight: 1,
        backgroundColor: isActive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
        padding: '0 24px',
        borderRadius: 12,
      }}>
        {isActive ? 'ATTIVO' : 'SCADUTO'}
      </div>

      <div style={{
        display: 'flex',
        fontSize: 26,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1,
      }}>
        {`\u20AC${price}/${periodLabel}  \u00B7  Utilizzi oggi: ${usesToday}/${dailyLimit}`}
      </div>
    </div>
  )
}
