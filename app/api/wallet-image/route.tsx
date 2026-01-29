import React from 'react'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const type = searchParams.get('type') || 'stamps'
  const color = searchParams.get('color') || '#6366f1'
  
  // Stamps params
  const stamps = parseInt(searchParams.get('stamps') || '0')
  const total = parseInt(searchParams.get('total') || '10')
  
  // Points params
  const points = parseInt(searchParams.get('points') || '0')
  const goal = parseInt(searchParams.get('goal') || '100')
  
  // Cashback params
  const cashback = searchParams.get('cashback') || '0.00'
  const percent = searchParams.get('percent') || '5'
  
  // Tiers params
  const tier = searchParams.get('tier') || 'Base'
  const discount = searchParams.get('discount') || '0'
  const spent = searchParams.get('spent') || '0'
  
  // Subscription params
  const status = searchParams.get('status') || 'expired'
  const end = searchParams.get('end') || ''
  const uses = parseInt(searchParams.get('uses') || '0')
  const limit = parseInt(searchParams.get('limit') || '1')

  // Genera l'immagine in base al tipo
  let content: React.ReactElement

  switch (type) {
    case 'stamps':
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
          <div style={{ fontSize: 24, color: 'white', marginBottom: 10 }}>🎫 Bollini</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: i < stamps ? '#fff' : 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}>
                {i < stamps ? '✓' : ''}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 32, color: 'white', marginTop: 15, fontWeight: 'bold' }}>
            {stamps}/{total}
          </div>
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
          <div style={{ fontSize: 24, color: 'white', marginBottom: 5 }}>⭐ Punti</div>
          <div style={{ fontSize: 48, color: 'white', fontWeight: 'bold' }}>{points}</div>
          <div style={{ 
            width: '80%', 
            height: 12, 
            backgroundColor: 'rgba(255,255,255,0.3)', 
            borderRadius: 6,
            marginTop: 10,
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${pointsProgress}%`, 
              height: '100%', 
              backgroundColor: 'white',
              borderRadius: 6,
            }} />
          </div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>
            {points}/{goal} per il premio
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
          <div style={{ fontSize: 24, color: 'white', marginBottom: 5 }}>💰 Cashback</div>
          <div style={{ fontSize: 48, color: 'white', fontWeight: 'bold' }}>€{cashback}</div>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>
            credito disponibile
          </div>
          <div style={{ 
            fontSize: 14, 
            color: 'white', 
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '5px 15px',
            borderRadius: 20,
            marginTop: 10
          }}>
            Guadagni {percent}% su ogni acquisto
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
          <div style={{ fontSize: 24, color: 'white', marginBottom: 5 }}>👑 Livello VIP</div>
          <div style={{ fontSize: 40, color: 'white', fontWeight: 'bold' }}>{tier}</div>
          {parseInt(discount) > 0 && (
            <div style={{ 
              fontSize: 24, 
              color: 'white', 
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '5px 20px',
              borderRadius: 20,
              marginTop: 10
            }}>
              -{discount}% su tutto
            </div>
          )}
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 10 }}>
            Spesa totale: €{spent}
          </div>
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
          <div style={{ fontSize: 48 }}>{isActive ? '✅' : '❌'}</div>
          <div style={{ fontSize: 28, color: 'white', fontWeight: 'bold', marginTop: 5 }}>
            {isActive ? 'ATTIVO' : 'SCADUTO'}
          </div>
          {isActive && end && (
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>
              Fino al {end}
            </div>
          )}
          {isActive && (
            <div style={{ 
              fontSize: 18, 
              color: 'white', 
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '5px 15px',
              borderRadius: 20,
              marginTop: 10
            }}>
              {uses}/{limit} utilizzi oggi
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
          <div style={{ fontSize: 32, color: 'white' }}>FidelityApp</div>
        </div>
      )
  }

  return new ImageResponse(content, {
    width: 400,
    height: 200,
  })
}