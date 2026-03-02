import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe non configurato' }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { merchantId } = await req.json()

  const { data: merchant } = await supabase
    .from('merchants')
    .select('stripe_customer_id')
    .eq('id', merchantId)
    .single()

  if (!merchant?.stripe_customer_id) {
    return NextResponse.json({ error: 'Nessun abbonamento attivo trovato' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: merchant.stripe_customer_id,
    return_url: `${appUrl}/dashboard/billing`,
  })

  return NextResponse.json({ portalUrl: session.url })
}
