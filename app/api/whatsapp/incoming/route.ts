import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST — riceve webhook in entrata da SendApp, logga in whatsapp_logs
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
    }

    // SendApp manda: { instance_id, from, type, message, ... }
    const instanceId: string = body.instance_id || body.instanceId || ''
    const from: string = body.from || body.number || ''
    const messageText: string = body.message || body.text || ''

    if (!instanceId) {
      return NextResponse.json({ received: true })
    }

    // Trova il merchant per instance_id
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('sendapp_instance_id', instanceId)
      .single()

    if (merchant?.id) {
      await supabase.from('whatsapp_logs').insert({
        merchant_id: merchant.id,
        to_phone: from,
        message: messageText,
        status: 'received',
        event_type: 'incoming',
      })
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[whatsapp/incoming] error:', err)
    return NextResponse.json({ received: true }) // sempre 200 verso SendApp
  }
}
