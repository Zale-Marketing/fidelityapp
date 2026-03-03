import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { merchantId } = await req.json()

  if (!merchantId) {
    return NextResponse.json({ error: 'merchantId mancante' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { id: programId } = await params

  // Verifica che il programma appartenga a questo merchant
  const { data: program } = await supabase
    .from('programs')
    .select('id')
    .eq('id', programId)
    .eq('merchant_id', merchantId)
    .single()

  if (!program) {
    return NextResponse.json({ error: 'Programma non trovato' }, { status: 404 })
  }

  // Cascade delete: transazioni → premi → livelli → carte → programma
  await supabase.from('stamp_transactions').delete().eq('program_id', programId)
  await supabase.from('rewards').delete().eq('program_id', programId)
  await supabase.from('tiers').delete().eq('program_id', programId)
  await supabase.from('cards').delete().eq('program_id', programId)

  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', programId)
    .eq('merchant_id', merchantId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
