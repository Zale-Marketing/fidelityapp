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

// GET — ?action=status or ?action=qr
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const { merchantId, error } = await getMerchantId(req)
    if (error) return error

    const { data: merchant } = await supabase
      .from('merchants')
      .select('maytapi_phone_id, maytapi_session_status, maytapi_daily_count, maytapi_last_reset_date')
      .eq('id', merchantId)
      .single()

    if (!merchant?.maytapi_phone_id) {
      return NextResponse.json({ status: 'not_connected', dailyCount: 0, dailyLimit: 200 })
    }

    const phoneId = merchant.maytapi_phone_id
    const action = req.nextUrl.searchParams.get('action') || 'status'

    if (action === 'qr') {
      // Proxy QR code PNG from Maytapi
      const qrRes = await callMaytapi(`/${phoneId}/qrCode`)

      if (!qrRes.ok) {
        return new NextResponse('QR code non disponibile', { status: 404, headers: { 'Content-Type': 'text/plain' } })
      }

      const buffer = await qrRes.arrayBuffer()
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store',
        },
      })
    }

    // action=status (default)
    const statusRes = await callMaytapi(`/${phoneId}/status`)

    if (!statusRes.ok) {
      // Return cached DB status on Maytapi error
      return NextResponse.json({
        status: merchant.maytapi_session_status || 'not_connected',
        dailyCount: merchant.maytapi_daily_count || 0,
        dailyLimit: 200,
      })
    }

    const statusData = await statusRes.json()
    const liveStatus: string = statusData?.data?.status || statusData?.status || 'idle'

    // Update DB status if changed to active
    if (liveStatus === 'active' && merchant.maytapi_session_status !== 'active') {
      await supabase
        .from('merchants')
        .update({ maytapi_session_status: 'active' })
        .eq('id', merchantId)
    }

    // Compute daily count with reset
    const today = new Date().toISOString().split('T')[0]
    const needsReset = merchant.maytapi_last_reset_date !== today
    const dailyCount = needsReset ? 0 : (merchant.maytapi_daily_count || 0)

    return NextResponse.json({
      status: liveStatus,
      dailyCount,
      dailyLimit: 200,
    })
  } catch (err) {
    console.error('WhatsApp status error:', err)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
