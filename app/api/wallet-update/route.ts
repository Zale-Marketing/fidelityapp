import { NextRequest, NextResponse } from 'next/server'
import { updateWalletCard } from '@/lib/google-wallet'
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

    // Aggiorna il wallet
    await updateWalletCard(
      card.id,
      card.stamp_count,
      program.stamps_required,
      program.primary_color,
      program.logo_url
    )

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Errore aggiornamento wallet:', error)
    return NextResponse.json(
      { error: 'Errore: ' + error.message },
      { status: 500 }
    )
  }
}