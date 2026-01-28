import { NextRequest, NextResponse } from 'next/server'
import { generateWalletLink } from '@/lib/google-wallet'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { cardId } = await request.json()

    if (!cardId) {
      return NextResponse.json({ error: 'Card ID mancante' }, { status: 400 })
    }

    // Carica la card
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card non trovata' }, { status: 404 })
    }

    // Carica il programma
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', card.program_id)
      .single()

    if (programError || !program) {
      return NextResponse.json({ error: 'Programma non trovato' }, { status: 404 })
    }

    // Carica il merchant
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', card.merchant_id)
      .single()

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant non trovato' }, { status: 404 })
    }

    // Genera il link Google Wallet
    const walletLink = await generateWalletLink(
      program.id,
      card.id,
      card.scan_token,
      card.stamp_count,
      program.stamps_required,
      program.name,
      merchant.name,
      program.primary_color
    )

    // Aggiorna la card con il provider wallet
    await supabase
      .from('cards')
      .update({ wallet_provider: 'google' })
      .eq('id', cardId)

    return NextResponse.json({ walletLink })

  } catch (error: any) {
    console.error('Errore generazione wallet link:', error)
    return NextResponse.json(
      { error: 'Errore nella generazione del link: ' + error.message },
      { status: 500 }
    )
  }
}