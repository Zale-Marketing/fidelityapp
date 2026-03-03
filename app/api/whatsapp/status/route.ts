import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getQRCode, getInstanceStatus } from '@/lib/sendapp'

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

// GET — ?action=qr  → { qr: base64 }
//       ?action=status → { status, phone? }
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const { merchantId, error } = await getMerchantId(req)
    if (error) return error

    const { data: merchant } = await supabase
      .from('merchants')
      .select('sendapp_instance_id, sendapp_access_token, sendapp_status')
      .eq('id', merchantId)
      .single()

    if (!merchant?.sendapp_instance_id || !merchant?.sendapp_access_token) {
      return NextResponse.json({ status: 'not_connected' })
    }

    const instanceId = merchant.sendapp_instance_id
    const accessToken = merchant.sendapp_access_token
    const action = req.nextUrl.searchParams.get('action') || 'status'

    if (action === 'qr') {
      try {
        const qrData = await getQRCode(instanceId, accessToken)
        // SendApp restituisce { qr: "base64string" }
        return NextResponse.json({ qr: qrData.qr || qrData })
      } catch (err) {
        console.error('[whatsapp/status] getQRCode error:', err)
        return NextResponse.json({ error: 'QR non disponibile' }, { status: 404 })
      }
    }

    // action=status
    try {
      const statusData = await getInstanceStatus(instanceId, accessToken)
      const liveStatus: string = statusData?.status || 'disconnected'

      // Aggiorna DB se cambia a connected
      if (liveStatus === 'connected' && merchant.sendapp_status !== 'connected') {
        await supabase
          .from('merchants')
          .update({ sendapp_status: 'connected' })
          .eq('id', merchantId)
      }

      return NextResponse.json({
        status: liveStatus,
        phone: statusData?.phone || null,
      })
    } catch (err) {
      console.error('[whatsapp/status] getInstanceStatus error:', err)
      // Fallback al valore DB
      return NextResponse.json({ status: merchant.sendapp_status || 'not_connected' })
    }
  } catch (err) {
    console.error('[whatsapp/status] error:', err)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
