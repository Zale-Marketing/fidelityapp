import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAYTAPI_BASE = `https://api.maytapi.com/api/${process.env.MAYTAPI_PRODUCT_ID}`

async function callMaytapi(path: string, options: RequestInit = {}) {
  const res = await fetch(`${MAYTAPI_BASE}${path}`, {
    ...options,
    headers: {
      'x-maytapi-key': process.env.MAYTAPI_API_TOKEN!,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    },
  })
  return res
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getMerchantId(req: NextRequest): Promise<{ merchantId: string | null; error: NextResponse | null }> {
  const supabase = getSupabase()
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return { merchantId: null, error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { merchantId: null, error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('merchant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.merchant_id) {
    return { merchantId: null, error: NextResponse.json({ error: 'Profilo non trovato' }, { status: 401 }) }
  }

  return { merchantId: profile.merchant_id, error: null }
}

// POST — create Maytapi session, store phone_id
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const { merchantId, error } = await getMerchantId(req)
    if (error) return error

    // Check if merchant already has a phone_id (idempotent)
    const { data: merchant } = await supabase
      .from('merchants')
      .select('maytapi_phone_id')
      .eq('id', merchantId)
      .single()

    if (merchant?.maytapi_phone_id) {
      return NextResponse.json({ phoneId: merchant.maytapi_phone_id })
    }

    // Create new Maytapi phone session
    const addRes = await callMaytapi('/addPhone', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    if (!addRes.ok) {
      const errText = await addRes.text()
      console.error('Maytapi addPhone error:', addRes.status, errText)
      return NextResponse.json({ error: 'Errore nella creazione della sessione Maytapi' }, { status: 502 })
    }

    const addData = await addRes.json()
    console.log('Maytapi addPhone response:', JSON.stringify(addData))

    // Try multiple possible field names for phone_id
    const phoneId: string | undefined =
      addData?.id ??
      addData?.pid ??
      addData?.data?.id ??
      addData?.data?.pid

    if (!phoneId) {
      console.error('Maytapi addPhone: phone_id missing from response:', JSON.stringify(addData))
      return NextResponse.json({ error: 'Risposta Maytapi non valida: phone_id mancante' }, { status: 502 })
    }

    // Save phone_id to merchants table
    const { error: updateError } = await supabase
      .from('merchants')
      .update({
        maytapi_phone_id: phoneId,
        maytapi_session_status: 'pending',
      })
      .eq('id', merchantId)

    if (updateError) {
      console.error('Error saving phone_id:', updateError)
      return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
    }

    return NextResponse.json({ phoneId })
  } catch (err) {
    console.error('WhatsApp connect error:', err)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

// PATCH — disconnect WhatsApp (clear phone_id)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const { merchantId, error } = await getMerchantId(req)
    if (error) return error

    const { error: updateError } = await supabase
      .from('merchants')
      .update({
        maytapi_phone_id: null,
        maytapi_session_status: 'inactive',
        maytapi_daily_count: 0,
      })
      .eq('id', merchantId)

    if (updateError) {
      console.error('Error disconnecting WhatsApp:', updateError)
      return NextResponse.json({ error: 'Errore nella disconnessione' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('WhatsApp disconnect error:', err)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
