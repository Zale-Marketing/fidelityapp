import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe non configurato. Aggiungi STRIPE_SECRET_KEY.' }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { merchantId, plan } = await req.json()

  if (!merchantId || !plan) {
    return NextResponse.json({ error: 'merchantId e plan sono richiesti' }, { status: 400 })
  }

  // Recupera merchant
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, name, stripe_customer_id')
    .eq('id', merchantId)
    .single()

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant non trovato' }, { status: 404 })
  }

  // Prezzi: da configurare nella dashboard Stripe
  // STRIPE_PRICE_PRO_MONTHLY e STRIPE_PRICE_PRO_YEARLY vanno aggiunti in .env
  const priceId = plan === 'PRO_YEARLY'
    ? process.env.STRIPE_PRICE_PRO_YEARLY
    : process.env.STRIPE_PRICE_PRO_MONTHLY

  if (!priceId) {
    return NextResponse.json({ error: 'Price ID Stripe non configurato. Aggiungi STRIPE_PRICE_PRO_MONTHLY.' }, { status: 503 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Crea o riusa customer Stripe
  let customerId = merchant.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: merchant.name,
      metadata: { merchant_id: merchantId },
    })
    customerId = customer.id

    await supabase
      .from('merchants')
      .update({ stripe_customer_id: customerId })
      .eq('id', merchantId)
  }

  // Crea sessione checkout
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
    metadata: { merchant_id: merchantId, plan },
    subscription_data: {
      metadata: { merchant_id: merchantId },
    },
  })

  return NextResponse.json({ checkoutUrl: session.url })
}
