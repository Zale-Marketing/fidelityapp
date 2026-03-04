import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthClient } from '@/lib/google-wallet'
import { sendAutomatedMessage } from '@/lib/whatsapp-automations'

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || ''

export async function GET(request: NextRequest) {
  // 1. Auth check — Vercel sends Authorization: Bearer CRON_SECRET automatically
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Find today's birthdays — fetch all, filter in JS (safer than Postgres EXTRACT via SDK)
  const today = new Date()
  const todayMonth = today.getUTCMonth() + 1
  const todayDay = today.getUTCDate()

  const { data: allHolders, error: holdersError } = await supabase
    .from('card_holders')
    .select('id, full_name, birth_date, contact_phone, phone')
    .not('birth_date', 'is', null)

  if (holdersError) {
    console.error('Birthday cron: error loading card_holders:', holdersError)
    return NextResponse.json({ error: holdersError.message }, { status: 500 })
  }

  const birthdayHolders = (allHolders || []).filter(h => {
    const bd = new Date(h.birth_date!)
    return (bd.getUTCMonth() + 1) === todayMonth && bd.getUTCDate() === todayDay
  })

  if (birthdayHolders.length === 0) {
    return NextResponse.json({ sent: 0, total: 0 })
  }

  // 3. Find active cards for birthday holders — separate query (no nested select)
  const holderIds = birthdayHolders.map(h => h.id)
  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id, card_holder_id, merchant_id')
    .in('card_holder_id', holderIds)
    .eq('status', 'active')

  if (cardsError) {
    console.error('Birthday cron: error loading cards:', cardsError)
    return NextResponse.json({ error: cardsError.message }, { status: 500 })
  }

  if (!cards || cards.length === 0) {
    return NextResponse.json({ sent: 0, total: 0 })
  }

  // 4. Map holder id to name and phone for personalization
  const holderMap = new Map(birthdayHolders.map(h => [h.id, h as { full_name: string; contact_phone?: string; phone?: string }]))

  // 5. Send birthday notification to each card
  const client = await getAuthClient()
  let sent = 0
  const dateStr = today.toISOString().slice(0, 10)

  for (const card of cards) {
    const sanitizedId = card.id.replace(/-/g, '').substring(0, 32)
    const objectId = `${ISSUER_ID}.${sanitizedId}`
    const holder = holderMap.get(card.card_holder_id)
    const fullName = holder?.full_name || 'Caro cliente'
    const firstName = fullName.split(' ')[0]

    try {
      await client.request({
        url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}/addMessage`,
        method: 'POST',
        data: {
          message: {
            header: 'Tanti auguri!',
            body: `Tanti auguri ${firstName}! Oggi hai un regalo speciale che ti aspetta.`,
            id: `bday_${dateStr}_${card.id}`,
            messageType: 'TEXT_AND_NOTIFY',
          },
        },
      })
      sent++
    } catch (err: any) {
      if (err.code !== 404) {
        console.warn(`Birthday cron: notif failed for card ${card.id}:`, err.message)
      }
      // 404 = card not in wallet — skip silently
    }

    // WhatsApp messaggio compleanno (fire-and-forget)
    const phone = holder?.contact_phone || holder?.phone
    if (phone && card.merchant_id) {
      sendAutomatedMessage(card.merchant_id, 'birthday', phone, {
        nome: firstName,
      }).catch(() => { /* ignore WA errors */ })
    }
  }

  return NextResponse.json({ sent, total: cards.length })
}
