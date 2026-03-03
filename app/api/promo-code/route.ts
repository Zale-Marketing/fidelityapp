import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const VALID_CODES: Record<string, { months: number }> = {
  BETA2026: { months: 12 },
}

export async function POST(req: NextRequest) {
  const { merchantId, code } = await req.json()

  if (!merchantId || !code) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  }

  const promo = VALID_CODES[code?.toUpperCase()]
  if (!promo) {
    return NextResponse.json({ error: 'Codice non valido' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Controlla che il merchant non abbia già un piano PRO attivo da promo
  const { data: merchant } = await supabase
    .from('merchants')
    .select('plan, plan_expires_at')
    .eq('id', merchantId)
    .single()

  if (merchant?.plan === 'business' && merchant?.plan_expires_at) {
    const expires = new Date(merchant.plan_expires_at)
    if (expires > new Date()) {
      return NextResponse.json({ error: 'Hai già un piano BUSINESS attivo' }, { status: 400 })
    }
  }

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + promo.months)

  const { error } = await supabase
    .from('merchants')
    .update({ plan: 'business', plan_expires_at: expiresAt.toISOString() })
    .eq('id', merchantId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, expiresAt: expiresAt.toISOString() })
}
