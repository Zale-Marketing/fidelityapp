import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_REPLY_STATUSES = ['pending', 'replied', 'ignored'] as const
type ReplyStatus = (typeof VALID_REPLY_STATUSES)[number]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth: verify Bearer token
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  // Resolve route param
  const { id } = await params

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('merchant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.merchant_id) {
    return NextResponse.json({ error: 'Profilo non trovato' }, { status: 401 })
  }

  // Plan check: must be BUSINESS
  const { data: merchant } = await supabase
    .from('merchants')
    .select('plan')
    .eq('id', profile.merchant_id)
    .single()

  if (!merchant || (merchant.plan as string).toLowerCase() !== 'business') {
    return NextResponse.json({ error: 'Piano BUSINESS richiesto' }, { status: 403 })
  }

  // Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { reply_status } = body

  // Validate reply_status
  if (!reply_status || !VALID_REPLY_STATUSES.includes(reply_status as ReplyStatus)) {
    return NextResponse.json(
      { error: `reply_status non valido. Valori validi: ${VALID_REPLY_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  // Verify ownership: check that this review belongs to this merchant
  const { data: reviewCheck } = await supabase
    .from('ocio_reviews')
    .select('merchant_id')
    .eq('id', id)
    .single()

  if (!reviewCheck) {
    return NextResponse.json({ error: 'Recensione non trovata' }, { status: 404 })
  }

  if (reviewCheck.merchant_id !== profile.merchant_id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    reply_status,
  }
  if (reply_status === 'replied') {
    updatePayload.replied_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('ocio_reviews')
    .update(updatePayload)
    .eq('id', id)
    .eq('merchant_id', profile.merchant_id)

  if (updateError) {
    return NextResponse.json({ error: 'Errore aggiornamento recensione' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
