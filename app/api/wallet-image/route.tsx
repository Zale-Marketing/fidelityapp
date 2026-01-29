import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Dimensioni raccomandate da Google Wallet per hero image
const WIDTH = 1032
const HEIGHT = 336

function adjustColor(hex: string, amount: number): string {
  hex = hex.replace('#', '')
  const num = parseInt(hex, 16)
  let r = (num >> 16) + amount
  let g = ((num >> 8) & 0x00FF) + amount
  let b = (num & 0x0000FF) + amount
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const type = searchParams.get('type') || 'stamps'
  const color = searchParams.get('color') || '#6366f1'
  const darkerColor = adjustColor(color, -40)
  
  // STAMPS
  const stamps = parseInt(searchParams.get('stamps') || '0')
  const totalStamps = parseInt(searchParams.get('total') || '10')
  const reward = searchParams.get('reward') || ''
  const rewardsJson = searchParams.get('rewards')
  let stepRewards: Array<{ stamps?: number, points?: number, reward: string }> = []
  if (rewardsJson) {
    try { stepRewards = JSON.parse(decodeURIComponent(rewardsJson)) } catch {}
  }
  
  // POINTS
  const points = parseInt(searchParams.get('points') || '0')
  const goal = parseInt(searchParams.get('goal') || '100')
  
  // CASHBACK
  const cashback = parseFloat(searchParams.get('cashback') || '0')
  const percent = parseInt(searchParams.get('percent') || '5')
  
  // TIERS
  const tier = searchParams.get('tier') || 'Base'
  const discount = parseInt(searchParams.get('discount') || '0')
  const spent = parseInt(searchParams.get('spent') || '0')
  const nextTier = searchParams.get('next') || ''
  const nextMin = parseInt(searchParams.get('nextmin') || '0')
  
  // SUBSCRIPTION
  const status = searchParams.get('status') || 'active'
  const endDate = searchParams.get('end') || ''
  const uses = parseInt(searchParams.get('uses') || '0')
  const limit = parseInt(searchParams.get('limit') || '1')
  
  // MISSIONS
  const activeMissions = parseInt(searchParams.get('active') || '0')
  const completedMissions = parseInt(searchParams.get('completed') || '0')

  // ========================================================================
  // RENDER CONTENT BASED ON TYPE
  // ========================================================================
  
  let content
  
  switch (type) {
    case 'stamps':
      content = renderStamps(stamps, totalStamps, reward, stepRewards, color)
      break
    case 'points':
      content = renderPoints(points, goal, reward, stepRewards)
      break
    case 'cashback':
      content = renderCashback(cashback, percent)
      break
    case 'tiers':
      content = renderTiers(tier, discount, spent, nextTier, nextMin)
      break
    case 'subscription':
      content = renderSubscription(status, endDate, uses, limit)
      break
    case 'missions':
      content = renderMissions(activeMissions, completedMissions)
      break
    default:
      content = renderStamps(stamps, totalStamps, reward, stepRewards, color)
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: `linear-gradient(180deg, ${color} 0%, ${darkerColor} 100%)`,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          padding: '24px 48px',
        }}
      >
        {content}
        
        {/* Powered by Zale Marketing - sempre visibile in basso a destra */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 32,
            fontSize: 18,
            color: 'rgba(255,255,255,0.6)',
            display: 'flex',
          }}
        >
          Powered by Zale Marketing
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  )
}

// ============================================================================
// STAMPS - Bollini
// ============================================================================
function renderStamps(
  stamps: number, 
  total: number, 
  reward: string, 
  stepRewards: Array<{ stamps?: number, reward: string }>,
  color: string
) {
  const isComplete = stamps >= total
  const maxVisible = Math.min(total, 12) // Massimo 12 bollini visibili
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Titolo */}
      <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.8)', marginBottom: 8, display: 'flex' }}>
        I TUOI BOLLINI
      </div>
      
      {/* Contatore grande */}
      <div style={{ fontSize: 56, fontWeight: 'bold', color: 'white', marginBottom: 16, display: 'flex' }}>
        {stamps} / {total}
      </div>
      
      {/* Griglia bollini */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
        {Array.from({ length: maxVisible }).map((_, i) => {
          const isFilled = i < stamps
          return (
            <div
              key={i}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: isFilled ? 'white' : 'rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 'bold',
                color: isFilled ? color : 'rgba(255,255,255,0.5)',
              }}
            >
              {isFilled ? '✓' : ''}
            </div>
          )
        })}
      </div>
      
      {/* Premio o stato */}
      {isComplete ? (
        <div style={{ 
          backgroundColor: '#fbbf24', 
          color: '#78350f', 
          padding: '12px 32px', 
          borderRadius: 16, 
          fontSize: 28, 
          fontWeight: 'bold',
          display: 'flex',
        }}>
          🎁 PREMIO PRONTO!
        </div>
      ) : reward ? (
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.9)', display: 'flex' }}>
          🎁 Premio: {reward}
        </div>
      ) : null}
    </div>
  )
}

// ============================================================================
// POINTS - Punti
// ============================================================================
function renderPoints(
  points: number, 
  goal: number, 
  reward: string,
  stepRewards: Array<{ points?: number, reward: string }>
) {
  const progress = Math.min((points / goal) * 100, 100)
  const remaining = Math.max(goal - points, 0)
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Titolo */}
      <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.8)', marginBottom: 8, display: 'flex' }}>
        I TUOI PUNTI
      </div>
      
      {/* Punti grandi */}
      <div style={{ fontSize: 72, fontWeight: 'bold', color: 'white', marginBottom: 16, display: 'flex' }}>
        {points}
      </div>
      
      {/* Barra progresso */}
      <div style={{ 
        width: '80%', 
        height: 24, 
        backgroundColor: 'rgba(255,255,255,0.25)', 
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        marginBottom: 12,
      }}>
        <div style={{ 
          width: `${progress}%`, 
          height: '100%', 
          backgroundColor: 'white', 
          borderRadius: 12,
          display: 'flex',
        }} />
      </div>
      
      {/* Info progresso */}
      <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.9)', marginBottom: 8, display: 'flex' }}>
        {points} / {goal} punti
      </div>
      
      {remaining > 0 ? (
        <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
          Ancora {remaining} punti per il premio
        </div>
      ) : (
        <div style={{ 
          backgroundColor: '#fbbf24', 
          color: '#78350f', 
          padding: '10px 28px', 
          borderRadius: 12, 
          fontSize: 26, 
          fontWeight: 'bold',
          display: 'flex',
        }}>
          🎁 PREMIO PRONTO!
        </div>
      )}
      
      {reward && remaining > 0 && (
        <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.8)', marginTop: 8, display: 'flex' }}>
          🎁 {reward}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CASHBACK - Credito
// ============================================================================
function renderCashback(cashback: number, percent: number) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Titolo */}
      <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.8)', marginBottom: 12, display: 'flex' }}>
        CREDITO DISPONIBILE
      </div>
      
      {/* Importo GRANDE */}
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20 }}>
        <span style={{ fontSize: 56, color: 'white', marginRight: 8 }}>€</span>
        <span style={{ fontSize: 96, fontWeight: 'bold', color: 'white' }}>
          {cashback.toFixed(2)}
        </span>
      </div>
      
      {/* Badge percentuale */}
      <div style={{ 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        padding: '12px 32px', 
        borderRadius: 24, 
        fontSize: 28, 
        color: 'white',
        display: 'flex',
      }}>
        💰 +{percent}% su ogni acquisto
      </div>
    </div>
  )
}

// ============================================================================
// TIERS - Livelli VIP
// ============================================================================
function renderTiers(
  tier: string, 
  discount: number, 
  spent: number, 
  nextTier: string, 
  nextMin: number
) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Titolo */}
      <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.8)', marginBottom: 12, display: 'flex' }}>
        IL TUO LIVELLO
      </div>
      
      {/* Corona e livello */}
      <div style={{ fontSize: 64, marginBottom: 8, display: 'flex' }}>👑</div>
      <div style={{ fontSize: 48, fontWeight: 'bold', color: 'white', marginBottom: 12, display: 'flex' }}>
        {tier}
      </div>
      
      {/* Sconto */}
      {discount > 0 && (
        <div style={{ 
          backgroundColor: '#fbbf24', 
          color: '#78350f', 
          padding: '10px 28px', 
          borderRadius: 16, 
          fontSize: 28, 
          fontWeight: 'bold',
          marginBottom: 16,
          display: 'flex',
        }}>
          🏷️ {discount}% SCONTO
        </div>
      )}
      
      {/* Spesa totale */}
      <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.8)', marginBottom: 8, display: 'flex' }}>
        Spesa totale: €{spent}
      </div>
      
      {/* Prossimo livello */}
      {nextTier && nextMin > spent && (
        <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
          Prossimo: {nextTier} (€{nextMin - spent} mancanti)
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SUBSCRIPTION - Abbonamento
// ============================================================================
function renderSubscription(status: string, endDate: string, uses: number, limit: number) {
  const isActive = status === 'active'
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Titolo */}
      <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.8)', marginBottom: 16, display: 'flex' }}>
        STATO ABBONAMENTO
      </div>
      
      {/* Cerchio stato */}
      <div style={{ 
        width: 100, 
        height: 100, 
        borderRadius: '50%', 
        backgroundColor: isActive ? '#22c55e' : '#ef4444',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 48, color: 'white' }}>
          {isActive ? '✓' : '✗'}
        </span>
      </div>
      
      {/* Stato */}
      <div style={{ fontSize: 42, fontWeight: 'bold', color: 'white', marginBottom: 12, display: 'flex' }}>
        {isActive ? 'ATTIVO' : 'SCADUTO'}
      </div>
      
      {/* Data scadenza */}
      {endDate && (
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.8)', marginBottom: 8, display: 'flex' }}>
          {isActive ? `Valido fino al ${endDate}` : `Scaduto il ${endDate}`}
        </div>
      )}
      
      {/* Utilizzi giornalieri */}
      {isActive && (
        <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
          Utilizzi oggi: {uses} / {limit}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MISSIONS - Missioni
// ============================================================================
function renderMissions(active: number, completed: number) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Titolo */}
      <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.8)', marginBottom: 20, display: 'flex' }}>
        LE TUE MISSIONI
      </div>
      
      {/* Box statistiche */}
      <div style={{ display: 'flex', gap: 48, marginBottom: 24 }}>
        {/* Attive */}
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.15)', 
          padding: '24px 48px', 
          borderRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: 56, fontWeight: 'bold', color: 'white', display: 'flex' }}>
            {active}
          </div>
          <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.8)', display: 'flex' }}>
            Attive
          </div>
        </div>
        
        {/* Completate */}
        <div style={{ 
          backgroundColor: '#fbbf24', 
          padding: '24px 48px', 
          borderRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: 56, fontWeight: 'bold', color: '#78350f', display: 'flex' }}>
            {completed}
          </div>
          <div style={{ fontSize: 22, color: '#78350f', display: 'flex' }}>
            Completate
          </div>
        </div>
      </div>
      
      {/* Messaggio motivazionale */}
      <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.9)', display: 'flex' }}>
        🎯 Completa missioni per guadagnare premi!
      </div>
    </div>
  )
}