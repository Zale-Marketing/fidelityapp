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
      const stampsPerRow = Math.min(total, 5)
      content = (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: color,
          padding: '20px',
        }}>
          <div style={{ display: 'flex', fontSize: 20, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
            Carta Bollini
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 220 }}>
            {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
              <div key={i} style={{
                display: 'flex',
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: i < stamps ? '#fff' : 'rgba(255,255,255,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: color,
                fontWeight: 'bold',
              }}>
                {i < stamps ? 'V' : ''}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 12 }}>
            <div style={{ display: 'flex', fontSize: 42, color: 'white', fontWeight: 'bold' }}>{stamps}</div>
            <div style={{ display: 'flex', fontSize: 20, color: 'rgba(255,255,255,0.7)' }}>/ {total}</div>
          </div>
          {stamps >= total && (
            <div style={{ display: 'flex', fontSize: 14, color: '#fef08a', marginTop: 4, fontWeight: 'bold' }}>
              PREMIO DISPONIBILE!
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
          backgroundColor: color,
          padding: '20px',
        }}>
          <div style={{ display: 'flex', fontSize: 20, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
            I tuoi Punti
          </div>
          <div style={{ display: 'flex', fontSize: 52, color: 'white', fontWeight: 'bold' }}>{points}</div>
          <div style={{ 
            display: 'flex',
            width: '85%', 
            height: 10, 
            backgroundColor: 'rgba(255,255,255,0.25)', 
            borderRadius: 5,
            marginTop: 12,
            overflow: 'hidden'
          }}>
            <div style={{ 
              display: 'flex',
              width: `${pointsProgress}%`, 
              height: '100%', 
              backgroundColor: 'white',
              borderRadius: 5,
            }} />
          </div>
          <div style={{ display: 'flex', fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
            {points >= goal ? 'Premio disponibile!' : `${goal - points} punti al premio`}
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
          backgroundColor: color,
          padding: '20px',
        }}>
          <div style={{ display: 'flex', fontSize: 20, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
            Il tuo Credito
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <div style={{ display: 'flex', fontSize: 24, color: 'white', marginRight: 4 }}>EUR</div>
            <div style={{ display: 'flex', fontSize: 52, color: 'white', fontWeight: 'bold' }}>{cashback}</div>
          </div>
          <div style={{ 
            display: 'flex',
            fontSize: 14, 
            color: 'white', 
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '6px 16px',
            borderRadius: 20,
            marginTop: 12
          }}>
            +{percent}% su ogni acquisto
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
          backgroundColor: color,
          padding: '20px',
        }}>
          <div style={{ display: 'flex', fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
            Il tuo Livello
          </div>
          <div style={{ display: 'flex', fontSize: 36, color: 'white', fontWeight: 'bold' }}>{tier}</div>
          {parseInt(discount) > 0 && (
            <div style={{ 
              display: 'flex',
              fontSize: 22, 
              color: '#fef08a', 
              fontWeight: 'bold',
              marginTop: 4
            }}>
              -{discount}% SCONTO
            </div>
          )}
          <div style={{ display: 'flex', fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>
            Spesa totale: EUR {spent}
          </div>
          {nextTier && (
            <div style={{ display: 'flex', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              Prossimo: {nextTier} (EUR {nextMin})
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
          backgroundColor: isActive ? color : '#6b7280',
          padding: '20px',
        }}>
          <div style={{ 
            display: 'flex', 
            fontSize: 40,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isActive ? 'OK' : 'X'}
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: 'white', fontWeight: 'bold', marginTop: 8 }}>
            {isActive ? 'ABBONAMENTO ATTIVO' : 'SCADUTO'}
          </div>
          {isActive && end && (
            <div style={{ display: 'flex', fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              Valido fino al {end}
            </div>
          )}
          {isActive && (
            <div style={{ 
              display: 'flex',
              fontSize: 16, 
              color: 'white', 
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '6px 16px',
              borderRadius: 20,
              marginTop: 10
            }}>
              {uses}/{limit} utilizzi oggi
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
          backgroundColor: color,
          padding: '20px',
        }}>
          <div style={{ display: 'flex', fontSize: 20, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
            Le tue Missioni
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontSize: 42, color: 'white', fontWeight: 'bold' }}>{activeMissions}</div>
              <div style={{ display: 'flex', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Attive</div>
            </div>
            <div style={{ display: 'flex', width: 2, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontSize: 42, color: '#fef08a', fontWeight: 'bold' }}>{completedMissions}</div>
              <div style={{ display: 'flex', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Completate</div>
            </div>
          </div>
          {activeMissions > 0 && (
            <div style={{ 
              display: 'flex',
              fontSize: 14, 
              color: 'white', 
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '6px 16px',
              borderRadius: 20,
              marginTop: 12
            }}>
              Completa le missioni per premi extra!
            </div>
          )}
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
          backgroundColor: color,
        }}>
          <div style={{ display: 'flex', fontSize: 32, color: 'white' }}>FidelityApp</div>
        </div>
      )
  }

  return new ImageResponse(content, {
    width: 400,
    height: 200,
  })
}