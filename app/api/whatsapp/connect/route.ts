import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { setWebhook } from '@/lib/sendapp'

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

// POST — salva credenziali SendApp, registra webhook, aggiorna status='connected'
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const { merchantId, error } = await getMerchantId(req)
    if (error) return error

    let body: { instanceId?: string; accessToken?: string } = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
    }

    const instanceId = body.instanceId?.trim()
    const accessToken = body.accessToken?.trim()

    if (!instanceId || !accessToken) {
      return NextResponse.json({ error: 'instanceId e accessToken sono richiesti' }, { status: 400 })
    }

    // Registra webhook su SendApp
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/incoming`
    try {
      await setWebhook(instanceId, accessToken, webhookUrl)
    } catch (err) {
      console.error('[whatsapp/connect] setWebhook error:', err)
      // Non bloccante — continua comunque
    }

    // Salva credenziali e imposta status connected
    const { error: updateError } = await supabase
      .from('merchants')
      .update({
        sendapp_instance_id: instanceId,
        sendapp_access_token: accessToken,
        sendapp_status: 'connected',
        sendapp_provider: 'cloud',
      })
      .eq('id', merchantId)

    if (updateError) {
      console.error('[whatsapp/connect] update error:', updateError)
      return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: 'connected' })
  } catch (err) {
    console.error('[whatsapp/connect] error:', err)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

// PATCH — disconnetti WhatsApp (svuota credenziali)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const { merchantId, error } = await getMerchantId(req)
    if (error) return error

    const { error: updateError } = await supabase
      .from('merchants')
      .update({
        sendapp_instance_id: null,
        sendapp_access_token: null,
        sendapp_status: 'disconnected',
      })
      .eq('id', merchantId)

    if (updateError) {
      console.error('[whatsapp/connect PATCH] error:', updateError)
      return NextResponse.json({ error: 'Errore nella disconnessione' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[whatsapp/connect PATCH] error:', err)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
