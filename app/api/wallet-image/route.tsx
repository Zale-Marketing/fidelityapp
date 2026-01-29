import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Dimensioni Google Wallet Hero Image: 1032x336 (ratio 3:1)
const WIDTH = 1032
const HEIGHT = 336

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const type = searchParams.get('type') || 'stamps'
  const color = searchParams.get('color') || '#6366f1'
  
  // Stamps
  const stamps = parseInt(searchParams.get('stamps') || '0')
  const total = parseInt(searchParams.get('total') || '10')
  
  // Points
  const points = parseInt(searchParams.get('points') || '0')
  const goal = parseInt(searchParams.get('goal') || '100')
  
  // Cashback
  const cashback = searchParams.get('cashback') || '0.00'
  const percent = searchParams.get('percent') || '5'
  
  // Tiers
  const tier = searchParams.get('tier') || 'Base'
  const discount = searchParams.get('discount') || '0'
  const spent = searchParams.get('spent') || '0'
  const nextTier = searchParams.get('next') || ''
  const nextMin = searchParams.get('nextmin') || '0'
  
  // Subscription
  const status = searchParams.get('status') || 'expired'
  const end = searchParams.get('end') || ''
  const uses = parseInt(searchParams.get('uses') || '0')
  const limit = parseInt(searchParams.get('limit') || '1')
  
  // Missions
  const activeMissions = parseInt(searchParams.get('active') || '0')
  const completedMissions = parseInt(searchParams.get('completed') || '0')
  
  // Reward description
  const reward = searchParams.get('reward') || ''

  // Genera il colore più scuro per il gradiente
  const darkerColor = adjustColor(color, -30)
  const lighterColor = adjustColor(color, 20)

  let content: React.ReactElement

  switch (type) {
    // =========================================================================
    // STAMPS - Carta Bollini
    // =========================================================================
    case 'stamps':
      const stampsPerRow = Math.min(total, 10)
      const stampSize = total <= 10 ? 48 : 36
      const stampGap = total <= 10 ? 16 : 12
      
      content = (
        <div style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${darkerColor} 100%)`,
          padding: '32px 48px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Sinistra: Bollini */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '16px',
          }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: `${stampGap}px`,
              maxWidth: '500px',
            }}>
              {Array.from({ length: total }).map((_, i) => (
                <div key={i} style={{
                  display: 'flex',
                  width: stampSize,
                  height: stampSize,
                  borderRadius: stampSize / 2,
                  backgroundColor: i < stamps ? 'white' : 'rgba(255,255,255,0.2)',
                  border: i < stamps ? 'none' : '3px solid rgba(255,255,255,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: stampSize * 0.5,
                  fontWeight: 'bold',
                  color: color,
                }}>
                  {i < stamps ? '✓' : ''}
                </div>
              ))}
            </div>
          </div>
          
          {/* Destra: Contatore e Info */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
            }}>
              <span style={{ fontSize: 96, fontWeight: 'bold', color: 'white', lineHeight: 1 }}>
                {stamps}
              </span>
              <span style={{ fontSize: 36, color: 'rgba(255,255,255,0.7)' }}>
                / {total}
              </span>
            </div>
            
            {stamps >= total ? (
              <div style={{
                display: 'flex',
                backgroundColor: '#fef08a',
                color: '#854d0e',
                padding: '8px 20px',
                borderRadius: 24,
                fontSize: 20,
                fontWeight: 'bold',
              }}>
                🎁 PREMIO PRONTO!
              </div>
            ) : (
              <div style={{
                display: 'flex',
                color: 'rgba(255,255,255,0.8)',
                fontSize: 18,
              }}>
                {total - stamps} {total - stamps === 1 ? 'bollino' : 'bollini'} al premio
              </div>
            )}
          </div>
        </div>
      )
      break

    // =========================================================================
    // POINTS - Carta Punti
    // =========================================================================
    case 'points':
      const progressPercent = Math.min((points / goal) * 100, 100)
      const remaining = Math.max(goal - points, 0)
      
      content = (
        <div style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${darkerColor} 100%)`,
          padding: '32px 48px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Sinistra: Punti */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{
              display: 'flex',
              fontSize: 16,
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase',
              letterSpacing: '3px',
            }}>
              I tuoi punti
            </div>
            <div style={{
              display: 'flex',
              fontSize: 108,
              fontWeight: 'bold',
              color: 'white',
              lineHeight: 1,
            }}>
              {points.toLocaleString('it-IT')}
            </div>
          </div>
          
          {/* Destra: Progress bar e info */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '16px',
            width: '400px',
          }}>
            {/* Progress bar */}
            <div style={{
              display: 'flex',
              width: '100%',
              height: 24,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex',
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: 'white',
                borderRadius: 12,
              }} />
            </div>
            
            {/* Info sotto progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              fontSize: 16,
              color: 'rgba(255,255,255,0.8)',
            }}>
              <span>{points} / {goal} punti</span>
              {remaining > 0 ? (
                <span>Ancora {remaining} per il premio</span>
              ) : (
                <span style={{ color: '#fef08a', fontWeight: 'bold' }}>🎁 Premio disponibile!</span>
              )}
            </div>
            
            {/* Reward description */}
            {reward && (
              <div style={{
                display: 'flex',
                backgroundColor: 'rgba(255,255,255,0.15)',
                padding: '10px 20px',
                borderRadius: 16,
                fontSize: 16,
                color: 'white',
              }}>
                Premio: {reward}
              </div>
            )}
          </div>
        </div>
      )
      break

    // =========================================================================
    // CASHBACK - Carta Credito
    // =========================================================================
    case 'cashback':
      content = (
        <div style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${darkerColor} 100%)`,
          padding: '32px 48px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Sinistra: Credito */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{
              display: 'flex',
              fontSize: 16,
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase',
              letterSpacing: '3px',
            }}>
              Credito disponibile
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
            }}>
              <span style={{ fontSize: 48, color: 'white', marginRight: '8px' }}>€</span>
              <span style={{ fontSize: 108, fontWeight: 'bold', color: 'white', lineHeight: 1 }}>
                {cashback}
              </span>
            </div>
          </div>
          
          {/* Destra: Badge percentuale */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '16px',
          }}>
            <div style={{
              display: 'flex',
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '16px 32px',
              borderRadius: 32,
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{ fontSize: 48 }}>💰</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 32, fontWeight: 'bold', color: 'white' }}>+{percent}%</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>su ogni acquisto</span>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              fontSize: 16,
              color: 'rgba(255,255,255,0.7)',
            }}>
              Accumula credito e usalo quando vuoi
            </div>
          </div>
        </div>
      )
      break

    // =========================================================================
    // TIERS - Livelli VIP
    // =========================================================================
    case 'tiers':
      const discountNum = parseInt(discount)
      
      content = (
        <div style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${darkerColor} 100%)`,
          padding: '32px 48px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Sinistra: Livello */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{
              display: 'flex',
              fontSize: 16,
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase',
              letterSpacing: '3px',
            }}>
              Il tuo livello
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <span style={{ fontSize: 64 }}>👑</span>
              <span style={{ fontSize: 64, fontWeight: 'bold', color: 'white' }}>
                {tier}
              </span>
            </div>
            
            {discountNum > 0 && (
              <div style={{
                display: 'flex',
                backgroundColor: '#fef08a',
                color: '#854d0e',
                padding: '8px 20px',
                borderRadius: 20,
                fontSize: 24,
                fontWeight: 'bold',
                marginTop: '8px',
              }}>
                -{discount}% SCONTO
              </div>
            )}
          </div>
          
          {/* Destra: Spesa e prossimo livello */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '12px',
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Spesa totale</span>
              <span style={{ fontSize: 36, fontWeight: 'bold', color: 'white' }}>€{parseInt(spent).toLocaleString('it-IT')}</span>
            </div>
            
            {nextTier && (
              <div style={{
                display: 'flex',
                backgroundColor: 'rgba(255,255,255,0.15)',
                padding: '12px 20px',
                borderRadius: 16,
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Prossimo livello</span>
                <span style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>
                  {nextTier} (€{parseInt(nextMin).toLocaleString('it-IT')})
                </span>
              </div>
            )}
          </div>
        </div>
      )
      break

    // =========================================================================
    // SUBSCRIPTION - Abbonamento
    // =========================================================================
    case 'subscription':
      const isActive = status === 'active'
      const bgGradient = isActive 
        ? `linear-gradient(135deg, ${color} 0%, ${darkerColor} 100%)`
        : 'linear-gradient(135deg, #6b7280 0%, #374151 100%)'
      
      content = (
        <div style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: bgGradient,
          padding: '32px 48px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Sinistra: Stato */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}>
            <div style={{
              display: 'flex',
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 56,
            }}>
              {isActive ? '✓' : '✗'}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <span style={{ fontSize: 42, fontWeight: 'bold', color: 'white' }}>
                {isActive ? 'ATTIVO' : 'SCADUTO'}
              </span>
              {isActive && end && (
                <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)' }}>
                  Valido fino al {end}
                </span>
              )}
            </div>
          </div>
          
          {/* Destra: Utilizzi */}
          {isActive && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '8px',
            }}>
              <div style={{
                display: 'flex',
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '16px 28px',
                borderRadius: 24,
                alignItems: 'baseline',
                gap: '8px',
              }}>
                <span style={{ fontSize: 48, fontWeight: 'bold', color: 'white' }}>{uses}</span>
                <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.7)' }}>/ {limit}</span>
              </div>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
                utilizzi oggi
              </span>
            </div>
          )}
          
          {!isActive && (
            <div style={{
              display: 'flex',
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '16px 24px',
              borderRadius: 16,
            }}>
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)' }}>
                Rinnova per continuare
              </span>
            </div>
          )}
        </div>
      )
      break

    // =========================================================================
    // MISSIONS - Missioni
    // =========================================================================
    case 'missions':
      content = (
        <div style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${darkerColor} 100%)`,
          padding: '32px 48px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Sinistra: Titolo */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{
              display: 'flex',
              fontSize: 16,
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase',
              letterSpacing: '3px',
            }}>
              Le tue missioni
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <span style={{ fontSize: 56 }}>🎮</span>
              <span style={{ fontSize: 28, color: 'white' }}>
                Completa le sfide per ottenere premi!
              </span>
            </div>
          </div>
          
          {/* Destra: Contatori */}
          <div style={{
            display: 'flex',
            gap: '32px',
          }}>
            {/* Attive */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.15)',
              padding: '20px 32px',
              borderRadius: 20,
            }}>
              <span style={{ fontSize: 56, fontWeight: 'bold', color: 'white' }}>{activeMissions}</span>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>Attive</span>
            </div>
            
            {/* Completate */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#fef08a',
              padding: '20px 32px',
              borderRadius: 20,
            }}>
              <span style={{ fontSize: 56, fontWeight: 'bold', color: '#854d0e' }}>{completedMissions}</span>
              <span style={{ fontSize: 16, color: '#a16207' }}>Completate</span>
            </div>
          </div>
        </div>
      )
      break

    // =========================================================================
    // DEFAULT
    // =========================================================================
    default:
      content = (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${darkerColor} 100%)`,
        }}>
          <span style={{ fontSize: 48, color: 'white', fontWeight: 'bold' }}>
            FidelityApp
          </span>
        </div>
      )
  }

  return new ImageResponse(content, {
    width: WIDTH,
    height: HEIGHT,
  })
}

// ============================================================================
// UTILITY: Schiarisce/scurisce un colore HEX
// ============================================================================
function adjustColor(hex: string, amount: number): string {
  hex = hex.replace('#', '')
  
  const num = parseInt(hex, 16)
  let r = (num >> 16) + amount
  let g = ((num >> 8) & 0x00FF) + amount
  let b = (num & 0x0000FF) + amount
  
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}
