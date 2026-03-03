import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAYTAPI_BASE = `https://api.maytapi.com/api/${process.env.MAYTAPI_PRODUCT_ID}`

function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  if (cleaned.startsWith('39') && cleaned.length >= 11) return cleaned
  if (cleaned.startsWith('+39')) return cleaned.slice(1)
  if (cleaned.startsWith('0039')) return cleaned.slice(2)
  if (cleaned.match(/^[3][0-9]{9}$/)) return `39${cleaned}`
  return null
}

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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()

    // Auth check
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

    // Parse and validate body
    let body: { recipients?: unknown; message?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
    }

    if (!Array.isArray(body.recipients)) {
      return NextResponse.json({ error: 'recipients deve essere un array' }, { status: 400 })
    }
    if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
      return NextResponse.json({ error: 'message non puo essere vuoto' }, { status: 400 })
    }

    const recipients = body.recipients as Array<{ phone: string; name?: string }>
    const message = (body.message as string).trim()

    // Load merchant
    const { data: merchant } = await supabase
      .from('merchants')
      .select('maytapi_phone_id, maytapi_session_status, maytapi_daily_count, maytapi_last_reset_date')
      .eq('id', merchantId)
      .single()

    if (!merchant?.maytapi_phone_id) {
      return NextResponse.json(
        { error: 'WhatsApp non connesso. Collega il tuo numero nelle impostazioni.' },
        { status: 400 }
      )
    }

    if (merchant.maytapi_session_status !== 'active') {
      return NextResponse.json(
        { error: 'Sessione WhatsApp non attiva. Riconnetti il tuo numero.' },
        { status: 400 }
      )
    }

    // Rate limit check
    const today = new Date().toISOString().split('T')[0]
    const needsReset = merchant.maytapi_last_reset_date !== today
    const currentCount = needsReset ? 0 : (merchant.maytapi_daily_count ?? 0)

    if (currentCount >= 200) {
      return NextResponse.json(
        { error: 'Limite giornaliero di 200 messaggi raggiunto. Riprova domani.' },
        { status: 429 }
      )
    }

    // Phone normalization
    const phoneId = merchant.maytapi_phone_id
    let skippedCount = 0
    const validRecipients: Array<{ phone: string; name?: string }> = []

    for (const r of recipients) {
      const normalized = normalizePhone(r.phone || '')
      if (!normalized) {
        skippedCount++
      } else {
        validRecipients.push({ phone: normalized, name: r.name })
      }
    }

    // Capacity check — truncate if over limit
    const remaining = 200 - currentCount
    const toSend = validRecipients.slice(0, remaining)
    const truncated = validRecipients.length - toSend.length

    // Batch send — 10 at a time, 200ms between batches
    let successCount = 0
    let failCount = 0
    const BATCH_SIZE = 10

    for (let i = 0; i < toSend.length; i += BATCH_SIZE) {
      const batch = toSend.slice(i, i + BATCH_SIZE)

      const results = await Promise.allSettled(
        batch.map(r =>
          callMaytapi(`/${phoneId}/sendMessage`, {
            method: 'POST',
            body: JSON.stringify({
              to_number: r.phone,
              type: 'text',
              message,
            }),
          })
        )
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.ok) {
          successCount++
        } else {
          failCount++
        }
      }

      if (i + BATCH_SIZE < toSend.length) {
        await sleep(200)
      }
    }

    // Update daily counter
    await supabase
      .from('merchants')
      .update({
        maytapi_daily_count: currentCount + successCount,
        maytapi_last_reset_date: today,
      })
      .eq('id', merchantId)

    return NextResponse.json({
      sent: successCount,
      failed: failCount,
      skipped: skippedCount + truncated,
      dailyCount: currentCount + successCount,
      dailyLimit: 200,
    })
  } catch (err) {
    console.error('WhatsApp send error:', err)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
