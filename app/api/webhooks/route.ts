import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const ALLOWED_EVENTS = ['bollino_aggiunto', 'card_creata', 'premio_riscattato', 'nuovo_cliente']

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthenticatedMerchantId(request: NextRequest): Promise<string | null> {
  const supabase = getSupabase()
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('merchant_id')
    .eq('id', user.id)
    .single()

  return profile?.merchant_id ?? null
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  const merchantId = await getAuthenticatedMerchantId(request)
  if (!merchantId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { data: endpoints, error } = await supabase
    .from('webhook_endpoints')
    .select('id, merchant_id, url, events, is_active, created_at')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(endpoints ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  const merchantId = await getAuthenticatedMerchantId(request)
  if (!merchantId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const body = await request.json()
  const { url, events } = body

  if (!url || !url.startsWith('https://')) {
    return NextResponse.json({ error: 'URL deve iniziare con https://' }, { status: 400 })
  }

  if (!events || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: 'Seleziona almeno un evento' }, { status: 400 })
  }

  const invalidEvents = events.filter((e: string) => !ALLOWED_EVENTS.includes(e))
  if (invalidEvents.length > 0) {
    return NextResponse.json({ error: `Eventi non validi: ${invalidEvents.join(', ')}` }, { status: 400 })
  }

  const secret = randomBytes(32).toString('hex')

  const { data: endpoint, error } = await supabase
    .from('webhook_endpoints')
    .insert({
      merchant_id: merchantId,
      url,
      events,
      secret,
      is_active: true,
    })
    .select('id, merchant_id, url, events, is_active, created_at, secret')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    {
      ...endpoint,
      secret_note: 'Salva questo secret — non sara mostrato di nuovo',
    },
    { status: 201 }
  )
}
