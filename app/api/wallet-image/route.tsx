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

  // Fetch card data with program, merchant, and rewards
  const { data: card, error } = await supabase
    .from('cards')
    .select(`
      *,
      programs (
        *,
        merchants (name),
        rewards (*)
      )
    `)
    .eq('id', cardId)
    .single()

  if (error || !card) {
    return new Response('Card not found', { status: 404 })
  }

  const program = card.programs
  const programType = program.program_type || 'stamps'
  const primaryColor = program.primary_color || '#6366f1'
  
  // Get intermediate rewards sorted by stamps_required
  const intermediateRewards = (program.rewards || [])
    .filter((r: any) => r.is_active !== false)
    .sort((a: any, b: any) => a.stamps_required - b.stamps_required)

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
      imageContent = generatePointsLayout(card, program, primaryColor, intermediateRewards)
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

  // HEADERS NO-CACHE per aggiornamento ISTANTANEO
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
            bottom: 12,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <span style={{ 
            fontSize: 22, 
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
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

  // Aggiungi headers NO-CACHE per aggiornamento ISTANTANEO
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
  const stamps = card.stamps || 0
  const total = program.stamps_required || 10
  const rewardDesc = program.reward_description || 'Premio'
  
  // Trova il prossimo premio (intermedio o finale)
  const nextReward = rewards.find((r: any) => r.stamps_required > stamps)
  const completedRewards = rewards.filter((r: any) => r.stamps_required <= stamps)
  
  // Calcola quanti bollini mostrare per riga (max 10 per riga)
  const stampsPerRow = Math.min(total, 10)
  const rows = Math.ceil(total / stampsPerRow)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 40px',
      width: '100%',
      height: '100%',
    }}>
      {/* Titolo */}
      <div style={{ 
        fontSize: 36, 
        color: 'rgba(255,255,255,0.8)', 
        marginBottom: 4,
        fontWeight: 600,
      }}>
        I TUOI BOLLINI
      </div>
      
      {/* Contatore grande */}
      <div style={{ 
        fontSize: 72, 
        fontWeight: 'bold', 
        color: 'white',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'baseline',
        lineHeight: 1,
      }}>
        <span>{stamps}</span>
        <span style={{ fontSize: 48, color: 'rgba(255,255,255,0.7)', marginLeft: 8 }}>/ {total}</span>
      </div>
      
      {/* Griglia bollini - con wrap automatico */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
      }}>
        {Array.from({ length: rows }).map((_, rowIndex) => {
          const startIdx = rowIndex * stampsPerRow
          const endIdx = Math.min(startIdx + stampsPerRow, total)
          const rowStamps = endIdx - startIdx
          
          return (
            <div key={rowIndex} style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
            }}>
              {Array.from({ length: rowStamps }).map((_, i) => {
                const stampIndex = startIdx + i
                const isFilled = stampIndex < stamps
                
                return (
                  <div
                    key={stampIndex}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: isFilled ? 'white' : 'rgba(255,255,255,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Bollino pieno: cerchio colorato interno */}
                    {isFilled && (
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: color,
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      
      {/* Premio - mostra stato attuale */}
      {stamps >= total ? (
        // PREMIO FINALE PRONTO
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.25)',
          padding: '10px 28px',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 28 }}>🎁</span>
          <span style={{ fontSize: 26, color: 'white', fontWeight: 'bold' }}>
            PREMIO PRONTO: {rewardDesc}
          </span>
        </div>
      ) : nextReward && nextReward.stamps_required < total ? (
        // PROSSIMO PREMIO INTERMEDIO
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}>
          <div style={{
            fontSize: 22,
            color: 'rgba(255,255,255,0.7)',
          }}>
            Prossimo premio a {nextReward.stamps_required} bollini:
          </div>
          <div style={{
            fontSize: 26,
            color: 'white',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>🎁</span>
            <span>{nextReward.name}</span>
          </div>
          {completedRewards.length > 0 && (
            <div style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.6)',
              marginTop: 2,
            }}>
              ✅ {completedRewards.length} premio/i già sbloccati
            </div>
          )}
        </div>
      ) : (
        // PREMIO FINALE (nessun intermedio o tutti completati)
        <div style={{
          fontSize: 26,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>🎁</span>
          <span>Premio: {rewardDesc}</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// ⭐ POINTS / PUNTI LAYOUT
// ============================================
function generatePointsLayout(card: any, program: any, color: string, rewards: any[]) {
  const points = card.points || 0
  const pointsRequired = program.stamps_required || 100
  const eurosPerPoint = program.points_per_euro || 1
  const rewardDesc = program.reward_description || 'Premio'
  const progress = Math.min((points / pointsRequired) * 100, 100)
  
  // Prossimo premio
  const nextReward = rewards.find((r: any) => r.stamps_required > points)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 40px',
      width: '100%',
      height: '100%',
    }}>
      {/* Titolo */}
      <div style={{ 
        fontSize: 36, 
        color: 'rgba(255,255,255,0.8)', 
        marginBottom: 4,
        fontWeight: 600,
      }}>
        I TUOI PUNTI
      </div>
      
      {/* Punti grandi */}
      <div style={{ 
        fontSize: 96, 
        fontWeight: 'bold', 
        color: 'white',
        lineHeight: 1,
        marginBottom: 8,
      }}>
        {points}
      </div>
      
      {/* Barra progresso */}
      <div style={{
        width: '80%',
        maxWidth: 600,
        height: 28,
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 14,
        marginBottom: 8,
        overflow: 'hidden',
        display: 'flex',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: 'white',
          borderRadius: 14,
        }} />
      </div>
      
      {/* Info progresso */}
      <div style={{
        fontSize: 28,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 4,
      }}>
        {points} / {pointsRequired} punti
      </div>
      
      {/* Conversione */}
      <div style={{
        fontSize: 20,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 10,
      }}>
        (ogni €{eurosPerPoint} spesi = 1 punto)
      </div>
      
      {/* Premio */}
      {points >= pointsRequired ? (
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.25)',
          padding: '10px 28px',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 28 }}>🎁</span>
          <span style={{ fontSize: 26, color: 'white', fontWeight: 'bold' }}>
            PREMIO PRONTO!
          </span>
        </div>
      ) : nextReward ? (
        <div style={{
          fontSize: 24,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>🎁</span>
          <span>Prossimo: {nextReward.name} (mancano {nextReward.stamps_required - points})</span>
        </div>
      ) : (
        <div style={{
          fontSize: 24,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>🎁</span>
          <span>{rewardDesc}</span>
        </div>
      )}
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
      padding: '16px 40px',
      width: '100%',
      height: '100%',
    }}>
      {/* Titolo */}
      <div style={{ 
        fontSize: 36, 
        color: 'rgba(255,255,255,0.8)', 
        marginBottom: 4,
        fontWeight: 600,
      }}>
        IL TUO CREDITO
      </div>
      
      {/* Importo GIGANTE */}
      <div style={{ 
        display: 'flex',
        alignItems: 'baseline',
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 64, color: 'white', fontWeight: 'bold' }}>€</span>
        <span style={{ fontSize: 110, fontWeight: 'bold', color: 'white', lineHeight: 1 }}>
          {cashback.toFixed(2)}
        </span>
      </div>
      
      {/* Percentuale */}
      <div style={{
        fontSize: 30,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>💰</span>
        <span>+{percent}% su ogni acquisto</span>
      </div>
      
      {/* Stato riscatto */}
      {canRedeem ? (
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.25)',
          padding: '12px 36px',
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 32 }}>✅</span>
          <span style={{ fontSize: 28, color: 'white', fontWeight: 'bold' }}>
            CREDITO DISPONIBILE!
          </span>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.2)',
          padding: '10px 28px',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 24 }}>🔒</span>
          <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.8)' }}>
            Minimo €{minRedeem} per usare (ancora €{(minRedeem - cashback).toFixed(2)})
          </span>
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
  const totalSpend = card.total_spend || 0
  const discountPercent = card.discount_percent || 0
  
  // Tier info
  const tierEmojis: Record<string, string> = {
    'Bronze': '🥉',
    'Silver': '🥈',
    'Gold': '🥇',
    'Platinum': '💎',
    'Diamond': '👑',
  }
  
  const tierEmoji = tierEmojis[currentTier] || '⭐'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 40px',
      width: '100%',
      height: '100%',
    }}>
      {/* Titolo */}
      <div style={{ 
        fontSize: 36, 
        color: 'rgba(255,255,255,0.8)', 
        marginBottom: 8,
        fontWeight: 600,
      }}>
        IL TUO LIVELLO
      </div>
      
      {/* Emoji livello GIGANTE */}
      <div style={{ 
        fontSize: 90,
        marginBottom: 4,
        lineHeight: 1,
      }}>
        {tierEmoji}
      </div>
      
      {/* Nome livello */}
      <div style={{ 
        fontSize: 60, 
        fontWeight: 'bold', 
        color: 'white',
        marginBottom: 12,
        textTransform: 'uppercase',
        lineHeight: 1,
      }}>
        {currentTier}
      </div>
      
      {/* Info sconto e spesa */}
      <div style={{
        display: 'flex',
        gap: 20,
      }}>
        {discountPercent > 0 && (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '10px 24px',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 24 }}>🏷️</span>
            <span style={{ fontSize: 26, color: 'white', fontWeight: 'bold' }}>
              -{discountPercent}% sconto
            </span>
          </div>
        )}
        
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.2)',
          padding: '10px 24px',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 24 }}>💳</span>
          <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.9)' }}>
            Spesa: €{totalSpend.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 🔄 SUBSCRIPTION / ABBONAMENTO LAYOUT
// ============================================
function generateSubscriptionLayout(card: any, program: any, color: string) {
  const status = card.subscription_status || 'active'
  const usesToday = card.uses_today || 0
  const dailyLimit = program.daily_limit || 1
  const price = program.subscription_price || 19.99
  const period = program.subscription_period || 'monthly'
  
  const periodLabels: Record<string, string> = {
    'weekly': 'settimana',
    'monthly': 'mese',
    'yearly': 'anno',
  }
  
  const periodLabel = periodLabels[period] || 'mese'
  const isActive = status === 'active'
  const usesRemaining = Math.max(0, dailyLimit - usesToday)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 40px',
      width: '100%',
      height: '100%',
    }}>
      {/* Titolo */}
      <div style={{ 
        fontSize: 36, 
        color: 'rgba(255,255,255,0.8)', 
        marginBottom: 8,
        fontWeight: 600,
      }}>
        ABBONAMENTO
      </div>
      
      {/* Stato */}
      {isActive ? (
        <>
          {/* Badge attivo */}
          <div style={{
            backgroundColor: 'rgba(34,197,94,0.3)',
            padding: '6px 20px',
            borderRadius: 20,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <span style={{ fontSize: 26, color: 'white', fontWeight: 'bold' }}>ATTIVO</span>
          </div>
          
          {/* Prezzo */}
          <div style={{ 
            display: 'flex',
            alignItems: 'baseline',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 72, fontWeight: 'bold', color: 'white' }}>€{price}</span>
            <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.7)', marginLeft: 8 }}>/{periodLabel}</span>
          </div>
          
          {/* Utilizzi oggi */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '14px 36px',
            borderRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>
              Utilizzi rimasti oggi
            </div>
            <div style={{ fontSize: 52, fontWeight: 'bold', color: 'white', lineHeight: 1 }}>
              {usesRemaining} / {dailyLimit}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Badge scaduto */}
          <div style={{
            backgroundColor: 'rgba(239,68,68,0.3)',
            padding: '10px 28px',
            borderRadius: 20,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span style={{ fontSize: 28 }}>⚠️</span>
            <span style={{ fontSize: 30, color: 'white', fontWeight: 'bold' }}>SCADUTO</span>
          </div>
          
          <div style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
          }}>
            Rinnova per continuare a usare i vantaggi!
          </div>
        </>
      )}
    </div>
  )
}
