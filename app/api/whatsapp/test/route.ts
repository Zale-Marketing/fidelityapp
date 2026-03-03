import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatPhoneIT, sendTextMessage } from '@/lib/sendapp'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST — { phone: string, message: string }
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('merchant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.merchant_id) {
      return NextResponse.json({ error: 'Profilo non trovato' }, { status: 401 })
    }

    const merchantId = profile.merchant_id

    let body: { phone?: unknown; message?: unknown } = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
    }

    if (!body.phone || typeof body.phone !== 'string') {
      return NextResponse.json({ error: '"phone" è richiesto' }, { status: 400 })
    }
    if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
      return NextResponse.json({ error: '"message" non può essere vuoto' }, { status: 400 })
    }

    const normalizedPhone = formatPhoneIT(body.phone)
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Numero di telefono non valido' }, { status: 400 })
    }

    const { data: merchant } = await supabase
      .from('merchants')
      .select('sendapp_instance_id, sendapp_access_token, sendapp_status')
      .eq('id', merchantId)
      .single()

    if (!merchant?.sendapp_instance_id || !merchant?.sendapp_access_token) {
      return NextResponse.json({ error: 'WhatsApp non connesso' }, { status: 400 })
    }

    if (merchant.sendapp_status !== 'connected') {
      return NextResponse.json({ error: 'Sessione WhatsApp non attiva' }, { status: 400 })
    }

    await sendTextMessage(
      normalizedPhone,
      (body.message as string).trim(),
      merchant.sendapp_instance_id,
      merchant.sendapp_access_token
    )

    await supabase.from('whatsapp_logs').insert({
      merchant_id: merchantId,
      to_phone: normalizedPhone,
      message: (body.message as string).trim(),
      status: 'sent',
      event_type: 'test',
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[whatsapp/test] error:', err)
    return NextResponse.json({ error: err?.message || 'Errore interno del server' }, { status: 500 })
  }
}
