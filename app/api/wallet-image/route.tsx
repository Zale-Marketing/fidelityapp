import React from 'react'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

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

  let content: React.ReactElement

  switch (type) {
    case 'stamps':
      // Calcola righe: max 5 per riga
      const rows: number[][] = []
      for (let i = 0; i < total; i += 5) {
        rows.push(Array.from({ length: Math.min(5, total - i) }, (_, j) => i + j))
      }
      
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          padding: '16px',
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} style={{ display: 'flex', gap: '8px' }}>
                {row.map((i) => (
                  <div key={i} style={{
                    display: 'flex',
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: i < stamps ? 'white' : 'rgba(255,255,255,0.25)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: color,
                    border: i < stamps ? 'none' : '2px solid rgba(255,255,255,0.4)',
                  }}>
                    {i < stamps ? '✓' : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            marginTop: '12px',
            gap: '8px'
          }}>
            <span style={{ fontSize: 40, fontWeight: 'bold', color: 'white' }}>{stamps}</span>
            <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)' }}>/ {total}</span>
          </div>
          {stamps >= total && (
            <div style={{ 
              display: 'flex',
              backgroundColor: '#fef08a',
              color: '#854d0e',
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 'bold',
              marginTop: '8px'
            }}>
              🎁 PREMIO PRONTO!
            </div>
          )}
        </div>
      )
      break

    case 'points':
      const pointsProgress = Math.min((points / goal) * 100, 100)
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          padding: '20px',
        }}>
          <div style={{ display: 'flex', fontSize: 14, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '2px' }}>
            I tuoi punti
          </div>
          <div style={{ display: 'flex', fontSize: 56, color: 'white', fontWeight: 'bold', marginTop: '4px' }}>
            {points}
          </div>
          <div style={{ 
            display: 'flex',
            width: '80%', 
            height: 8, 
            backgroundColor: 'rgba(255,255,255,0.25)', 
            borderRadius: 4,
            marginTop: '16px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              display: 'flex',
              width: `${pointsProgress}%`, 
              height: '100%', 
              backgroundColor: 'white',
              borderRadius: 4,
            }} />
          </div>
          <div style={{ display: 'flex', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
            {points >= goal ? '🎁 Premio disponibile!' : `Ancora ${goal - points} per il premio`}
          </div>
        </div>
      )
      break

    case 'cashback':
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          padding: '20px',
        }}>
          <div style={{ display: 'flex', fontSize: 14, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Credito disponibile
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '4px' }}>
            <span style={{ fontSize: 28, color: 'white', marginRight: '4px' }}>€</span>
            <span style={{ fontSize: 56, color: 'white', fontWeight: 'bold' }}>{cashback}</span>
          </div>
          <div style={{ 
            display: 'flex',
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '8px 16px',
            borderRadius: 20,
            marginTop: '16px'
          }}>
            <span style={{ fontSize: 14, color: 'white' }}>+{percent}% su ogni acquisto</span>
          </div>
        </div>
      )
      break

    case 'tiers':
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          padding: '20px',
        }}>
          <div style={{ display: 'flex', fontSize: 14, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Il tuo livello
          </div>
          <div style={{ display: 'flex', fontSize: 36, color: 'white', fontWeight: 'bold', marginTop: '8px' }}>
            {tier}
          </div>
          {parseInt(discount) > 0 && (
            <div style={{ 
              display: 'flex',
              backgroundColor: '#fef08a',
              color: '#854d0e',
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 18,
              fontWeight: 'bold',
              marginTop: '8px'
            }}>
              -{discount}% SCONTO
            </div>
          )}
          <div style={{ display: 'flex', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: '12px' }}>
            Spesa totale: €{spent}
          </div>
          {nextTier && (
            <div style={{ display: 'flex', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
              Prossimo: {nextTier} (€{nextMin})
            </div>
          )}
        </div>
      )
      break

    case 'subscription':
      const isActive = status === 'active'
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: isActive 
            ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
            : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
          padding: '20px',
        }}>
          <div style={{ 
            display: 'flex', 
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
          }}>
            {isActive ? '✓' : '✗'}
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: 'white', fontWeight: 'bold', marginTop: '8px' }}>
            {isActive ? 'ATTIVO' : 'SCADUTO'}
          </div>
          {isActive && end && (
            <div style={{ display: 'flex', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
              Fino al {end}
            </div>
          )}
          {isActive && (
            <div style={{ 
              display: 'flex',
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '6px 14px',
              borderRadius: 16,
              marginTop: '12px'
            }}>
              <span style={{ fontSize: 14, color: 'white' }}>{uses}/{limit} utilizzi oggi</span>
            </div>
          )}
        </div>
      )
      break

    case 'missions':
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          padding: '20px',
        }}>
          <div style={{ display: 'flex', fontSize: 14, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Le tue missioni
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 40, color: 'white', fontWeight: 'bold' }}>{activeMissions}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Attive</span>
            </div>
            <div style={{ display: 'flex', width: 2, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 40, color: '#fef08a', fontWeight: 'bold' }}>{completedMissions}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Completate</span>
            </div>
          </div>
        </div>
      )
      break

    default:
      content = (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        }}>
          <span style={{ fontSize: 28, color: 'white', fontWeight: 'bold' }}>FidelityApp</span>
        </div>
      )
  }

  return new ImageResponse(content, {
    width: 400,
    height: 200,
  })
}