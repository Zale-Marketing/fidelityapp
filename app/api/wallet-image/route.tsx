import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const WIDTH = 1032
const HEIGHT = 336

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const type = searchParams.get('type') || 'stamps'
  const color = searchParams.get('color') || '#6366f1'
  
  const stamps = parseInt(searchParams.get('stamps') || '0')
  const total = parseInt(searchParams.get('total') || '10')
  
  const points = parseInt(searchParams.get('points') || '0')
  const goal = parseInt(searchParams.get('goal') || '100')
  
  const cashback = searchParams.get('cashback') || '0.00'
  const percent = searchParams.get('percent') || '5'
  
  const tier = searchParams.get('tier') || 'Base'
  const discount = searchParams.get('discount') || '0'
  const spent = searchParams.get('spent') || '0'
  const nextTier = searchParams.get('next') || ''
  const nextMin = searchParams.get('nextmin') || '0'
  
  const status = searchParams.get('status') || 'expired'
  const end = searchParams.get('end') || ''
  const uses = parseInt(searchParams.get('uses') || '0')
  const limit = parseInt(searchParams.get('limit') || '1')
  
  const activeMissions = parseInt(searchParams.get('active') || '0')
  const completedMissions = parseInt(searchParams.get('completed') || '0')
  
  const reward = searchParams.get('reward') || ''
  
  let stepRewards: Array<{ stamps?: number, points?: number, reward: string }> = []
  try {
    const rewardsParam = searchParams.get('rewards')
    if (rewardsParam) {
      stepRewards = JSON.parse(decodeURIComponent(rewardsParam))
    }
  } catch {}

  const darkerColor = adjustColor(color, -40)

  let content: React.ReactElement

  switch (type) {
    case 'stamps':
      const isStampComplete = stamps >= total
      
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: `linear-gradient(180deg, ${color} 0%, ${darkerColor} 100%)`,
          padding: '28px 48px',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2 }}>
                I tuoi bollini
              </span>
              <span style={{ fontSize: 56, fontWeight: 'bold', color: 'white', lineHeight: 1.1 }}>
                {stamps} / {total}
              </span>
            </div>
            {isStampComplete && (
              <div style={{
                display: 'flex',
                backgroundColor: '#fef08a',
                color: '#854d0e',
                padding: '10px 24px',
                borderRadius: 24,
                fontSize: 18,
                fontWeight: 'bold',
              }}>
                🎁 PREMIO PRONTO!
              </div>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            maxWidth: '100%',
          }}>
            {Array.from({ length: Math.min(total, 15) }).map((_, i) => (
              <div key={i} style={{
                display: 'flex',
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: i < stamps ? 'white' : 'rgba(255,255,255,0.2)',
                border: i < stamps ? 'none' : '2px solid rgba(255,255,255,0.4)',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: color,
                fontWeight: 'bold',
              }}>
                {i < stamps ? '✓' : ''}
              </div>
            ))}
            {total > 15 && (
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, alignSelf: 'center' }}>
                +{total - 15} altri
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {stepRewards.length > 0 ? (
                stepRewards.slice(0, 3).map((r, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    color: stamps >= (r.stamps || 0) ? '#fef08a' : 'rgba(255,255,255,0.7)',
                  }}>
                    <span>{stamps >= (r.stamps || 0) ? '✓' : '○'}</span>
                    <span>{r.stamps} bollini → {r.reward}</span>
                  </div>
                ))
              ) : reward ? (
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>
                  Premio: {reward}
                </span>
              ) : null}
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Powered by Zale Marketing
            </span>
          </div>
        </div>
      )
      break

    case 'points':
      const progressPercent = Math.min((points / goal) * 100, 100)
      const remaining = Math.max(goal - points, 0)
      const isPointsComplete = points >= goal
      
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: `linear-gradient(180deg, ${color} 0%, ${darkerColor} 100%)`,
          padding: '28px 48px',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2 }}>
                I tuoi punti
              </span>
              <span style={{ fontSize: 64, fontWeight: 'bold', color: 'white', lineHeight: 1.1 }}>
                {points.toLocaleString('it-IT')}
              </span>
            </div>
            {isPointsComplete && (
              <div style={{
                display: 'flex',
                backgroundColor: '#fef08a',
                color: '#854d0e',
                padding: '10px 24px',
                borderRadius: 24,
                fontSize: 18,
                fontWeight: 'bold',
              }}>
                🎁 PREMIO DISPONIBILE!
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              display: 'flex',
              width: '100%',
              height: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex',
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: 'white',
                borderRadius: 10,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{points} / {goal} punti</span>
              {remaining > 0 ? (
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Ancora {remaining} per il premio</span>
              ) : (
                <span style={{ color: '#fef08a', fontWeight: 'bold' }}>Premio sbloccato!</span>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {stepRewards.length > 0 ? (
                stepRewards.slice(0, 3).map((r, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    color: points >= (r.points || 0) ? '#fef08a' : 'rgba(255,255,255,0.7)',
                  }}>
                    <span>{points >= (r.points || 0) ? '✓' : '○'}</span>
                    <span>{r.points} punti → {r.reward}</span>
                  </div>
                ))
              ) : reward ? (
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>
                  Premio: {reward}
                </span>
              ) : null}
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Powered by Zale Marketing
            </span>
          </div>
        </div>
      )
      break

    case 'cashback':
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: `linear-gradient(180deg, ${color} 0%, ${darkerColor} 100%)`,
          padding: '28px 48px',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2 }}>
            Credito disponibile
          </span>
          
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: 48, color: 'white', marginRight: 8 }}>€</span>
            <span style={{ fontSize: 96, fontWeight: 'bold', color: 'white', lineHeight: 1 }}>
              {cashback}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{
              display: 'flex',
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '12px 24px',
              borderRadius: 24,
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>💰</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>+{percent}%</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>su ogni acquisto</span>
              </div>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Powered by Zale Marketing
            </span>
          </div>
        </div>
      )
      break

    case 'tiers':
      const discountNum = parseInt(discount)
      
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: `linear-gradient(180deg, ${color} 0%, ${darkerColor} 100%)`,
          padding: '28px 48px',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2 }}>
            Il tuo livello
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 48 }}>👑</span>
            <span style={{ fontSize: 56, fontWeight: 'bold', color: 'white' }}>{tier}</span>
            {discountNum > 0 && (
              <div style={{
                display: 'flex',
                backgroundColor: '#fef08a',
                color: '#854d0e',
                padding: '8px 20px',
                borderRadius: 20,
                fontSize: 22,
                fontWeight: 'bold',
              }}>
                -{discount}% SCONTO
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                Spesa totale: €{parseInt(spent).toLocaleString('it-IT')}
              </span>
              {nextTier && (
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                  Prossimo: {nextTier} (€{parseInt(nextMin).toLocaleString('it-IT')})
                </span>
              )}
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Powered by Zale Marketing
            </span>
          </div>
        </div>
      )
      break

    case 'subscription':
      const isActive = status === 'active'
      const bgGradient = isActive 
        ? `linear-gradient(180deg, ${color} 0%, ${darkerColor} 100%)`
        : 'linear-gradient(180deg, #6b7280 0%, #374151 100%)'
      
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: bgGradient,
          padding: '28px 48px',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2 }}>
            Stato abbonamento
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              display: 'flex',
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
            }}>
              {isActive ? '✓' : '✗'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 42, fontWeight: 'bold', color: 'white' }}>
                {isActive ? 'ATTIVO' : 'SCADUTO'}
              </span>
              {isActive && end && (
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
                  Valido fino al {end}
                </span>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {isActive ? (
              <div style={{
                display: 'flex',
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '10px 20px',
                borderRadius: 16,
                alignItems: 'baseline',
                gap: 8,
              }}>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Utilizzi oggi:</span>
                <span style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>{uses} / {limit}</span>
              </div>
            ) : (
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
                Rinnova per continuare a usufruire dei vantaggi
              </span>
            )}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Powered by Zale Marketing
            </span>
          </div>
        </div>
      )
      break

    case 'missions':
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: `linear-gradient(180deg, ${color} 0%, ${darkerColor} 100%)`,
          padding: '28px 48px',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2 }}>
            Le tue missioni
          </span>
          
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.15)',
              padding: '16px 32px',
              borderRadius: 16,
            }}>
              <span style={{ fontSize: 48, fontWeight: 'bold', color: 'white' }}>{activeMissions}</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Attive</span>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#fef08a',
              padding: '16px 32px',
              borderRadius: 16,
            }}>
              <span style={{ fontSize: 48, fontWeight: 'bold', color: '#854d0e' }}>{completedMissions}</span>
              <span style={{ fontSize: 14, color: '#a16207' }}>Completate</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
              Completa le sfide per ottenere premi esclusivi!
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Powered by Zale Marketing
            </span>
          </div>
        </div>
      )
      break

    default:
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: `linear-gradient(180deg, ${color} 0%, ${darkerColor} 100%)`,
        }}>
          <span style={{ fontSize: 48, color: 'white', fontWeight: 'bold' }}>
            FidelityApp
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 16 }}>
            Powered by Zale Marketing
          </span>
        </div>
      )
  }

  return new ImageResponse(content, {
    width: WIDTH,
    height: HEIGHT,
  })
}

function adjustColor(hex: string, amount: number): string {
  hex = hex.replace('#', '')
  const num = parseInt(hex, 16)
  let r = Math.max(0, Math.min(255, (num >> 16) + amount))
  let g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
  let b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}