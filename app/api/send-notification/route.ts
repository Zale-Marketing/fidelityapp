import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/lib/google-wallet'
import { createClient } from '@supabase/supabase-js'

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || ''

export async function POST(request: NextRequest) {
  try {
    const { cardId, message, header } = await request.json()

    if (!cardId || !message || !header) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    // Valida che la carta esista (service role key per leggere lato server)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: card } = await supabase
      .from('cards')
      .select('id')
      .eq('id', cardId)
      .single()

    if (!card) {
      return NextResponse.json({ error: 'Card non trovata' }, { status: 404 })
    }

    // Costruisce objectId con la stessa logica di google-wallet.ts (sanitizeId)
    const sanitizedId = cardId.replace(/-/g, '').substring(0, 32)
    const objectId = `${ISSUER_ID}.${sanitizedId}`

    const client = await getAuthClient()

    try {
      await client.request({
        url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}/addMessage`,
        method: 'POST',
        data: {
          message: {
            header,
            body: message,
            id: `notif_${Date.now()}`,
            messageType: 'TEXT_AND_NOTIFY',
          },
        },
      })
      return NextResponse.json({ success: true })
    } catch (apiError: any) {
      const errMsg = apiError.message || ''
      if (apiError.code === 429 || errMsg.includes('QuotaExceeded')) {
        return NextResponse.json({ success: false, reason: 'quota' })
      }
      throw apiError
    }
  } catch (error: any) {
    console.error('Errore send-notification:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
