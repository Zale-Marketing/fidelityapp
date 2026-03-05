import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthenticatedMerchant(req: NextRequest): Promise<
  | { error: NextResponse }
  | { merchantId: string; token: string }
> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  }

  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('merchant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.merchant_id) {
    return { error: NextResponse.json({ error: 'Profilo non trovato' }, { status: 401 }) }
  }

  const { data: merchant } = await supabase
    .from('merchants')
    .select('plan')
    .eq('id', profile.merchant_id)
    .single()

  if (!merchant || (merchant.plan as string).toLowerCase() !== 'business') {
    return { error: NextResponse.json({ error: 'Piano BUSINESS richiesto' }, { status: 403 }) }
  }

  return { merchantId: profile.merchant_id, token }
}

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedMerchant(req)
  if ('error' in auth) return auth.error

  const { merchantId } = auth

  const { data, error } = await supabase
    .from('ocio_config')
    .select('*')
    .eq('merchant_id', merchantId)
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Errore lettura configurazione' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? null })
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthenticatedMerchant(req)
  if ('error' in auth) return auth.error

  const { merchantId } = auth

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Validate google_maps_url if provided
  if (body.google_maps_url && typeof body.google_maps_url === 'string' && body.google_maps_url.trim() !== '') {
    if (!body.google_maps_url.startsWith('https://')) {
      return NextResponse.json({ error: 'URL non valido' }, { status: 400 })
    }
  }

  // Controlla se esiste già un google_maps_url nel DB per questo merchant
  const { data: existingConfig } = await supabase
    .from('ocio_config')
    .select('google_maps_url')
    .eq('merchant_id', merchantId)
    .maybeSingle()

  const hasExistingUrl = existingConfig?.google_maps_url != null &&
    existingConfig.google_maps_url.trim() !== ''

  // Build upsert payload — solo campi sicuri
  const allowedFields = [
    'google_maps_url',
    'module_reviews',
    'module_alerts',
    'alert_whatsapp_number',
    'alert_min_rating',
  ]

  const payload: Record<string, unknown> = {
    merchant_id: merchantId,
    updated_at: new Date().toISOString(),
  }

  for (const field of allowedFields) {
    if (field in body) {
      // google_maps_url si scrive SOLO se il DB è ancora vuoto
      // Se esiste già un link, solo l'admin può cambiarlo da Supabase
      if (field === 'google_maps_url' && hasExistingUrl) {
        continue // ignora, non sovrascrivere
      }
      payload[field] = body[field]
    }
  }

  const { error } = await supabase
    .from('ocio_config')
    .upsert(payload, { onConflict: 'merchant_id' })

  if (error) {
    return NextResponse.json({ error: 'Errore salvataggio configurazione' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
