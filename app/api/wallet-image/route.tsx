import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cardId = searchParams.get('cardId')
  const colorParam = searchParams.get('color') // automatically decoded by searchParams API

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
  const primaryColor = (colorParam && colorParam.startsWith('#'))
    ? colorParam
    : (program.primary_color || '#6366f1')

  // Hero image generata solo per stamps e points
  if (programType !== 'stamps' && programType !== 'points') {
    return new Response('Not needed', { status: 204 })
  }

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
      imageContent = generateStampsLayout(card, program)
      break
    case 'points':
      imageContent = generatePointsLayout(card, program)
      break
    case 'cashback':
      imageContent = generateCashbackLayout()
      break
    case 'tiers':
      imageContent = generateTiersLayout(card, tiers)
      break
    case 'subscription':
      imageContent = generateSubscriptionLayout(card)
      break
    default:
      imageContent = generateStampsLayout(card, program)
  }

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: primaryColor,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {imageContent}
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
// STAMPS — solo cerchi bollini, niente testo
// ============================================
function generateStampsLayout(card: any, program: any) {
  const stamps = card.current_stamps || card.stamp_count || 0
  const total = program.stamps_required || 10

  const useTwoRows = total > 10
  const circlesPerRow = useTwoRows ? Math.ceil(total / 2) : total
  const gap = useTwoRows ? 10 : 14
  const diameter = useTwoRows
    ? Math.min(48, Math.floor(952 / circlesPerRow) - 12)
    : Math.min(64, Math.floor(952 / total) - 14)

  const allIndices = Array.from({ length: total }, (_, i) => i)
  const row1 = useTwoRows ? allIndices.slice(0, circlesPerRow) : allIndices
  const row2 = useTwoRows ? allIndices.slice(circlesPerRow) : []

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap,
      width: '100%',
      height: '100%',
    }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap, alignItems: 'center' }}>
        {row1.map((i) => (
          <div
            key={i}
            style={{
              width: diameter,
              height: diameter,
              borderRadius: '50%',
              backgroundColor: i < stamps ? 'rgba(255,255,255,1)' : 'transparent',
              border: i < stamps ? 'none' : '3px solid rgba(255,255,255,0.6)',
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
                backgroundColor: i < stamps ? 'rgba(255,255,255,1)' : 'transparent',
                border: i < stamps ? 'none' : '3px solid rgba(255,255,255,0.6)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// POINTS — barra progresso orizzontale, niente testo
// ============================================
function generatePointsLayout(card: any, program: any) {
  const points = Math.round(card.points_balance || 0)
  const pointsRequired = program.stamps_required || 100
  const fillWidth = Math.min(Math.round((points / pointsRequired) * 800), 800)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
    }}>
      <div style={{
        display: 'flex',
        width: 800,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          width: fillWidth,
          height: 24,
          backgroundColor: 'white',
        }} />
      </div>
    </div>
  )
}

// ============================================
// CASHBACK — simbolo € decorativo watermark
// ============================================
function generateCashbackLayout() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
    }}>
      <div style={{
        display: 'flex',
        fontSize: 220,
        fontWeight: 900,
        color: 'rgba(255,255,255,0.12)',
        lineHeight: 1,
      }}>
        {'\u20AC'}
      </div>
    </div>
  )
}

// ============================================
// TIERS — nome livello corrente come watermark
// ============================================
function generateTiersLayout(card: any, tiers: any[]) {
  const currentTierName = (card.current_tier || 'Bronze').toUpperCase()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
    }}>
      <div style={{
        display: 'flex',
        fontSize: 160,
        fontWeight: 900,
        color: 'rgba(255,255,255,0.12)',
        lineHeight: 1,
      }}>
        {currentTierName}
      </div>
    </div>
  )
}

// ============================================
// SUBSCRIPTION — banda colorata di stato, niente testo
// ============================================
function generateSubscriptionLayout(card: any) {
  const isActive = (card.subscription_status || 'active') === 'active'
  const bandColor = isActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
    }}>
      <div style={{
        display: 'flex',
        width: '100%',
        height: 80,
        backgroundColor: bandColor,
      }} />
    </div>
  )
}
