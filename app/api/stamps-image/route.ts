import { NextRequest, NextResponse } from 'next/server'
import { createCanvas, loadImage } from 'canvas'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parametri
    const stamps = parseInt(searchParams.get('stamps') || '0')
    const total = parseInt(searchParams.get('total') || '5')
    const color = searchParams.get('color') || '#6366f1'
    const logoUrl = searchParams.get('logo') || ''
    
    // Dimensioni immagine (hero image Google Wallet: 1032x336)
    const width = 1032
    const height = 336
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    
    // Sfondo bianco
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    
    // Calcola dimensioni cerchi in base al numero totale
    let circleRadius: number
    let spacing: number
    let rows = 1
    let itemsPerRow = total
    
    if (total <= 5) {
      circleRadius = 50
      spacing = 25
    } else if (total <= 10) {
      circleRadius = 40
      spacing = 20
    } else if (total <= 15) {
      circleRadius = 32
      spacing = 15
    } else {
      // Per 16+ bollini, dividi su 2 righe
      rows = 2
      itemsPerRow = Math.ceil(total / 2)
      circleRadius = 28
      spacing = 12
    }
    
    // Carica logo se presente
    let logoImage: any = null
    if (logoUrl) {
      try {
        logoImage = await loadImage(logoUrl)
      } catch (e) {
        console.log('Impossibile caricare logo:', e)
      }
    }
    
    // Disegna i cerchi
    let stampIndex = 0
    
    for (let row = 0; row < rows; row++) {
      const itemsThisRow = row === rows - 1 ? total - (row * itemsPerRow) : itemsPerRow
      const totalRowWidth = (circleRadius * 2 * itemsThisRow) + (spacing * (itemsThisRow - 1))
      const startX = (width - totalRowWidth) / 2 + circleRadius
      const centerY = rows === 1 
        ? height / 2 
        : (height / 2) + (row === 0 ? -circleRadius - 10 : circleRadius + 10)
      
      for (let i = 0; i < itemsThisRow; i++) {
        const x = startX + (i * (circleRadius * 2 + spacing))
        const isFilled = stampIndex < stamps
        
        if (isFilled) {
          if (logoImage) {
            // Cerchio con logo
            ctx.save()
            ctx.beginPath()
            ctx.arc(x, centerY, circleRadius, 0, Math.PI * 2)
            ctx.closePath()
            ctx.clip()
            ctx.drawImage(
              logoImage,
              x - circleRadius,
              centerY - circleRadius,
              circleRadius * 2,
              circleRadius * 2
            )
            ctx.restore()
            
            // Bordo
            ctx.beginPath()
            ctx.arc(x, centerY, circleRadius, 0, Math.PI * 2)
            ctx.strokeStyle = color
            ctx.lineWidth = 3
            ctx.stroke()
          } else {
            // Cerchio pieno con colore + checkmark disegnato
            ctx.beginPath()
            ctx.arc(x, centerY, circleRadius, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
            
            // Disegna checkmark manualmente (non emoji)
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = Math.max(4, circleRadius / 8)
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            const checkSize = circleRadius * 0.5
            ctx.moveTo(x - checkSize * 0.5, centerY)
            ctx.lineTo(x - checkSize * 0.1, centerY + checkSize * 0.4)
            ctx.lineTo(x + checkSize * 0.5, centerY - checkSize * 0.3)
            ctx.stroke()
          }
        } else {
          // Cerchio vuoto
          ctx.beginPath()
          ctx.arc(x, centerY, circleRadius, 0, Math.PI * 2)
          ctx.fillStyle = '#f0f0f0'
          ctx.fill()
          ctx.strokeStyle = '#d0d0d0'
          ctx.lineWidth = 2
          ctx.stroke()
          
          // Numero nel cerchio vuoto
          ctx.font = `bold ${Math.max(16, circleRadius * 0.6)}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = '#a0a0a0'
          ctx.fillText((stampIndex + 1).toString(), x, centerY)
        }
        
        stampIndex++
      }
    }
    
    // Converti in PNG
    const buffer = canvas.toBuffer('image/png')
    
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
    
  } catch (error: any) {
    console.error('Errore generazione immagine:', error)
    return NextResponse.json(
      { error: 'Errore nella generazione: ' + error.message },
      { status: 500 }
    )
  }
}