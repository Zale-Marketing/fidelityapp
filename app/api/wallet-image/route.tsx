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
    .select(`
      *,
      programs (*)
    `)
    .eq('id', cardId)
    .single()

  if (error || !card) {
    console.error('Card not found:', error)
    return new Response('Card not found', { status: 404 })
  }

  const program = card.programs
  const programType = program.program_type || 'stamps'
  const primaryColor = program.primary_color || '#6366f1'

  // 2. Fetch rewards SEPARATAMENTE
  const { data: rewards } = await supabase
    .from('rewards')
    .select('*')
    .eq('program_id', program.id)
    .eq('is_active', true)
    .order('stamps_required', { ascending: true })

  const intermediateRewards = rewards || []

  // Dimensioni Google Wallet hero image
  const WIDTH = 1032
  const HEIGHT = 336

  // Genera l'immagine in base al tipo di programma
  let imageContent

  switch (programType) {
    case 'stamps':
      imageContent = generateStampsLayout(card, program, primaryColor, intermediateRewards)
      break
    case 'points':
      imageContent = generatePointsLayout(card, program, primaryColor)
      break
    case 'cashback':
      imageContent = generateCashbackLayout(card, program, primaryColor)
      break
    case 'tiers':
      imageContent = generateTiersLayout(card, program, primaryColor)
      break
    case 'subscription':
      imageContent = generateSubscriptionLayout(card, program, primaryColor)
      break
    default:
      imageContent = generateStampsLayout(card, program, primaryColor, intermediateRewards)
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
        
        {/* Powered by Zale Marketing - CENTRATO */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <span style={{ 
            fontSize: 18, 
            color: 'rgba(255,255,255,0.4)',
          }}>
            Powered by Zale Marketing
          </span>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
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
// 🎫 STAMPS / BOLLINI LAYOUT
// ============================================
function generateStampsLayout(card: any, program: any, color: string, rewards: any[]) {
  const stamps = card.current_stamps || card.stamp_count || card.stamps || 0
  const total = program.stamps_required || 10
  const rewardDesc = program.reward_description || program.reward_text || 'Premio'
  
  // Prossimo premio intermedio (non il finale)
  const nextReward = rewards.find((r: any) => r.stamps_required > stamps && r.stamps_required < total)
  
  // Max 10 bollini per riga
  const stampsPerRow = Math.min(total, 10)
  const rows = Math.ceil(total / stampsPerRow)
  const stampSize = total <= 10 ? 28 : 22

  // Genera le righe di bollini
  const stampRows = []
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const startIdx = rowIndex * stampsPerRow
    const endIdx = Math.min(startIdx + stampsPerRow, total)
    const rowStamps = []
    
    for (let i = startIdx; i < endIdx; i++) {
      const isFilled = i < stamps
      rowStamps.push(
        <div
          key={i}
          style={{
            width: stampSize,
            height: stampSize,
            borderRadius: '50%',
            backgroundColor: isFilled ? 'white' : 'rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isFilled && (
            <div style={{
              width: stampSize * 0.5,
              height: stampSize * 0.5,
              borderRadius: '50%',
              backgroundColor: color,
            }} />
          )}
        </div>
      )
    }
    
    stampRows.push(
      <div key={rowIndex} style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {rowStamps}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 30px',
      width: '100%',
      height: '100%',
    }}>
      {/* Titolo */}
      <div style={{ 
        display: 'flex',
        fontSize: 42, 
        color: 'rgba(255,255,255,0.9)', 
        fontWeight: 700,
        marginBottom: 2,
        letterSpacing: 2,
      }}>
        I TUOI BOLLINI
      </div>
      
      {/* Contatore */}
      <div style={{ 
        display: 'flex',
        alignItems: 'baseline',
        marginBottom: 10,
      }}>
        <span style={{ 
          fontSize: 100, 
          fontWeight: 800, 
          color: 'white',
          lineHeight: 1,
        }}>{stamps}</span>
        <span style={{ 
          fontSize: 50, 
          color: 'rgba(255,255,255,0.6)', 
          marginLeft: 8,
          fontWeight: 600,
        }}>/ {total}</span>
      </div>
      
      {/* Griglia bollini */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        marginBottom: 10,
      }}>
        {stampRows}
      </div>
      
      {/* Premio */}
      {stamps >= total ? (
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(255,255,255,0.25)',
          padding: '8px 24px',
          borderRadius: 12,
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 28, color: 'white', fontWeight: 700 }}>
            PREMIO PRONTO: {rewardDesc}
          </span>
        </div>
      ) : nextReward ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }}>
            Prossimo a {nextReward.stamps_required}:
          </span>
          <span style={{ fontSize: 28, color: 'white', fontWeight: 700 }}>
            {nextReward.name}
          </span>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          fontSize: 26,
          color: 'white',
          fontWeight: 600,
        }}>
          Premio: {rewardDesc}
        </div>
      )}
    </div>
  )
}

// ============================================
// ⭐ POINTS / PUNTI LAYOUT
// ============================================
function generatePointsLayout(card: any, program: any, color: string) {
  const points = card.points_balance || card.points || 0
  const pointsRequired = program.stamps_required || 100
  const eurosPerPoint = program.points_per_euro || 1
  const progress = Math.min((points / pointsRequired) * 100, 100)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 30px',
      width: '100%',
      height: '100%',
    }}>
      {/* Titolo */}
      <div style={{ 
        display: 'flex',
        fontSize: 42, 
        color: 'rgba(255,255,255,0.9)', 
        fontWeight: 700,
        marginBottom: 0,
        letterSpacing: 2,
      }}>
        I TUOI PUNTI
      </div>
      
      {/* Punti */}
      <div style={{ 
        display: 'flex',
        fontSize: 120, 
        fontWeight: 800, 
        color: 'white',
        lineHeight: 1,
        marginBottom: 8,
      }}>
        {points}
      </div>
      
      {/* Barra progresso */}
      <div style={{
        display: 'flex',
        width: '85%',
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 12,
        marginBottom: 8,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: 'white',
          borderRadius: 12,
        }} />
      </div>
      
      {/* Info */}
      <div style={{
        display: 'flex',
        fontSize: 28,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 4,
      }}>
        {points} / {pointsRequired} punti
      </div>
      
      {/* Conversione */}
      <div style={{
        display: 'flex',
        fontSize: 20,
        color: 'rgba(255,255,255,0.6)',
      }}>
        €{eurosPerPoint} = 1 punto
      </div>
    </div>
  )
}

// ============================================
// 💰 CASHBACK LAYOUT
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
      padding: '12px 30px',
      width: '100%',
      height: '100%',
    }}>
      {/* Titolo */}
      <div style={{ 
        display: 'flex',
        fontSize: 42, 
        color: 'rgba(255,255,255,0.9)', 
        fontWeight: 700,
        marginBottom: 0,
        letterSpacing: 2,
      }}>
        IL TUO CREDITO
      </div>
      
      {/* Importo */}
      <div style={{ 
        display: 'flex',
        alignItems: 'baseline',
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 70, color: 'white', fontWeight: 700 }}>€</span>
        <span style={{ fontSize: 130, fontWeight: 800, color: 'white', lineHeight: 1 }}>
          {cashback.toFixed(2)}
        </span>
      </div>
      
      {/* Percentuale */}
      <div style={{
        display: 'flex',
        fontSize: 32,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 10,
        fontWeight: 600,
      }}>
        +{percent}% su ogni acquisto
      </div>
      
      {/* Stato */}
      {canRedeem ? (
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(255,255,255,0.25)',
          padding: '10px 30px',
          borderRadius: 16,
        }}>
          <span style={{ fontSize: 26, color: 'white', fontWeight: 700 }}>
            CREDITO DISPONIBILE
          </span>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          fontSize: 22,
          color: 'rgba(255,255,255,0.6)',
        }}>
          Min. €{minRedeem} per riscattare
        </div>
      )}
    </div>
  )
}

// ============================================
// 👑 TIERS / LIVELLI VIP LAYOUT
// ============================================
function generateTiersLayout(card: any, program: any, color: string) {
  const currentTier = card.current_tier || 'Bronze'
  const totalSpend = card.total_spent || 0
  
  const tierEmojis: Record<string, string> = {
    'Bronze': '🥉',
    'Silver': '🥈',
    'Gold': '🥇',
    'Platinum': '💎',
    'Diamond': '👑',
  }
  
  const tierEmoji = tierEmojis[currentTier] || ''

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 30px',
      width: '100%',
      height: '100%',
    }}>
      {/* Titolo */}
      <div style={{ 
        display: 'flex',
        fontSize: 42, 
        color: 'rgba(255,255,255,0.9)', 
        fontWeight: 700,
        marginBottom: 4,
        letterSpacing: 2,
      }}>
        IL TUO LIVELLO
      </div>
      
      {/* Nome livello */}
      <div style={{ 
        display: 'flex',
        fontSize: 90, 
        fontWeight: 800, 
        color: 'white',
        lineHeight: 1,
        marginBottom: 12,
        textTransform: 'uppercase',
      }}>
        {tierEmoji} {currentTier}
      </div>
      
      {/* Spesa totale */}
      <div style={{
        display: 'flex',
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: '10px 30px',
        borderRadius: 16,
      }}>
        <span style={{ fontSize: 28, color: 'white' }}>
          Spesa totale: €{totalSpend.toFixed(0)}
        </span>
      </div>
    </div>
  )
}

// ============================================
// 🔄 SUBSCRIPTION / ABBONAMENTO LAYOUT
// ============================================
function generateSubscriptionLayout(card: any, program: any, color: string) {
  const status = card.subscription_status || 'active'
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
  const isActive = status === 'active'
  const usesRemaining = Math.max(0, dailyLimit - usesToday)

  if (isActive) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 30px',
        width: '100%',
        height: '100%',
      }}>
        {/* Titolo */}
        <div style={{ 
          display: 'flex',
          fontSize: 42, 
          color: 'rgba(255,255,255,0.9)', 
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: 2,
        }}>
          ABBONAMENTO
        </div>
        
        {/* Badge attivo */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(34,197,94,0.4)',
          padding: '6px 24px',
          borderRadius: 20,
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 28, color: 'white', fontWeight: 700 }}>ATTIVO</span>
        </div>
        
        {/* Prezzo */}
        <div style={{ 
          display: 'flex',
          alignItems: 'baseline',
          marginBottom: 12,
        }}>
          <span style={{ fontSize: 80, fontWeight: 800, color: 'white' }}>€{price}</span>
          <span style={{ fontSize: 30, color: 'rgba(255,255,255,0.7)', marginLeft: 8 }}>/{periodLabel}</span>
        </div>
        
        {/* Utilizzi */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(255,255,255,0.2)',
          padding: '10px 30px',
          borderRadius: 16,
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.8)' }}>Utilizzi oggi</span>
          <span style={{ fontSize: 50, fontWeight: 800, color: 'white', lineHeight: 1 }}>
            {usesRemaining} / {dailyLimit}
          </span>
        </div>
      </div>
    )
  } else {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 30px',
        width: '100%',
        height: '100%',
      }}>
        {/* Titolo */}
        <div style={{ 
          display: 'flex',
          fontSize: 42, 
          color: 'rgba(255,255,255,0.9)', 
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: 2,
        }}>
          ABBONAMENTO
        </div>
        
        {/* Badge scaduto */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(239,68,68,0.4)',
          padding: '10px 30px',
          borderRadius: 20,
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 32, color: 'white', fontWeight: 700 }}>SCADUTO</span>
        </div>
        
        <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.8)' }}>
          Rinnova per continuare
        </div>
      </div>
    )
  }
}
