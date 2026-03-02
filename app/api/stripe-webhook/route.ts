import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe non configurato')
    return NextResponse.json({ error: 'Stripe non configurato' }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Firma webhook mancante' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Firma webhook non valida' }, { status: 400 })
  }

  console.log('Stripe webhook:', event.type)

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const merchantId = session.metadata?.merchant_id
      if (!merchantId) break

      await supabase
        .from('merchants')
        .update({
          plan: 'PRO',
          stripe_subscription_id: (session as any).subscription as string,
          stripe_subscription_status: 'active',
          plan_expires_at: null,
        })
        .eq('id', merchantId)

      console.log(`Merchant ${merchantId} upgraded to PRO`)
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = (invoice as any).subscription as string
      if (!subId) break
      const subscription = await stripe.subscriptions.retrieve(subId)
      const merchantId = subscription.metadata?.merchant_id
      if (!merchantId) break

      await supabase
        .from('merchants')
        .update({
          plan: 'PRO',
          stripe_subscription_status: 'active',
          plan_expires_at: null,
        })
        .eq('id', merchantId)

      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = (invoice as any).subscription as string
      if (!subId) break
      const subscription = await stripe.subscriptions.retrieve(subId)
      const merchantId = subscription.metadata?.merchant_id
      if (!merchantId) break

      await supabase
        .from('merchants')
        .update({ stripe_subscription_status: 'past_due' })
        .eq('id', merchantId)

      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const merchantId = sub.metadata?.merchant_id
      if (!merchantId) break

      const status = sub.status
      const planActive = ['active', 'trialing'].includes(status)
      const periodEnd = (sub as any).current_period_end

      await supabase
        .from('merchants')
        .update({
          plan: planActive ? 'PRO' : 'FREE',
          stripe_subscription_status: status,
          plan_expires_at: planActive ? null : (periodEnd ? new Date(periodEnd * 1000).toISOString() : null),
        })
        .eq('id', merchantId)

      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const merchantId = sub.metadata?.merchant_id
      if (!merchantId) break

      const periodEnd = (sub as any).current_period_end

      await supabase
        .from('merchants')
        .update({
          plan: 'FREE',
          stripe_subscription_id: null,
          stripe_subscription_status: 'canceled',
          plan_expires_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        })
        .eq('id', merchantId)

      console.log(`Merchant ${merchantId} downgraded to FREE`)
      break
    }
  }

  return NextResponse.json({ received: true })
}
