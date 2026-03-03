import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { triggerWebhook, type WebhookEvent } from '@/lib/webhooks'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function buildNuovoClientePayload(merchantId: string, rawData: any) {
  const { card_holder_id, program_id } = rawData

  const [{ data: holder }, { data: program }, { data: card }] = await Promise.all([
    supabase
      .from('card_holders')
      .select('id, full_name, contact_email, contact_phone, phone, birth_date, marketing_consent, created_at')
      .eq('id', card_holder_id)
      .single(),
    supabase
      .from('programs')
      .select('id, name, program_type')
      .eq('id', program_id)
      .single(),
    supabase
      .from('cards')
      .select('id, scan_token, status, created_at')
      .eq('card_holder_id', card_holder_id)
      .eq('program_id', program_id)
      .maybeSingle(),
  ])

  return {
    merchant: { id: merchantId },
    card_holder: holder ? {
      id: holder.id,
      full_name: holder.full_name ?? null,
      email: holder.contact_email ?? null,
      phone: holder.contact_phone ?? holder.phone ?? null,
      birth_date: holder.birth_date ?? null,
      marketing_consent: holder.marketing_consent ?? null,
      member_since: holder.created_at ?? null,
    } : null,
    program: program ? {
      id: program.id,
      name: program.name,
      type: program.program_type,
    } : null,
    card: card ? {
      id: card.id,
      scan_token: card.scan_token ?? null,
      status: card.status ?? null,
      created_at: card.created_at ?? null,
    } : null,
  }
}

async function buildCartaCreataPayload(merchantId: string, rawData: any) {
  const { card_id, card_holder_id, program_id } = rawData

  const [{ data: card }, { data: holder }, { data: program }] = await Promise.all([
    supabase
      .from('cards')
      .select('id, scan_token, wallet_provider, created_at')
      .eq('id', card_id)
      .single(),
    supabase
      .from('card_holders')
      .select('id, full_name, contact_email, contact_phone, phone')
      .eq('id', card_holder_id)
      .single(),
    supabase
      .from('programs')
      .select('id, name, program_type')
      .eq('id', program_id)
      .single(),
  ])

  return {
    merchant: { id: merchantId },
    card: card ? {
      id: card.id,
      scan_token: card.scan_token ?? null,
      wallet_provider: card.wallet_provider ?? null,
      created_at: card.created_at ?? null,
    } : null,
    card_holder: holder ? {
      id: holder.id,
      full_name: holder.full_name ?? null,
      email: holder.contact_email ?? null,
      phone: holder.contact_phone ?? holder.phone ?? null,
    } : null,
    program: program ? {
      id: program.id,
      name: program.name,
      type: program.program_type,
    } : null,
  }
}

async function buildPremioRiscattatoPayload(merchantId: string, rawData: any) {
  const { card_id, card_holder_id, program_id, reward_description } = rawData

  const [{ data: card }, { data: program }] = await Promise.all([
    supabase
      .from('cards')
      .select('id, scan_token, stamp_count, current_stamps, status')
      .eq('id', card_id)
      .single(),
    supabase
      .from('programs')
      .select('id, name, program_type, stamps_required')
      .eq('id', program_id)
      .single(),
  ])

  let holder = null
  if (card_holder_id) {
    const { data } = await supabase
      .from('card_holders')
      .select('id, full_name, contact_email, contact_phone, phone, last_visit')
      .eq('id', card_holder_id)
      .single()
    holder = data
  }

  return {
    merchant: { id: merchantId },
    card: card ? {
      id: card.id,
      scan_token: card.scan_token ?? null,
      stamp_count: card.current_stamps ?? card.stamp_count ?? null,
      status: card.status ?? null,
    } : null,
    card_holder: holder ? {
      id: holder.id,
      full_name: holder.full_name ?? null,
      email: holder.contact_email ?? null,
      phone: holder.contact_phone ?? holder.phone ?? null,
      last_visit: holder.last_visit ?? null,
    } : null,
    program: program ? {
      id: program.id,
      name: program.name,
      type: program.program_type,
    } : null,
    reward: {
      name: reward_description ?? null,
      stamps_required: program?.stamps_required ?? null,
    },
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { merchantId, event, data } = body

  console.log('[dispatch] POST ricevuto — event:', event, '| merchantId:', merchantId)

  if (!merchantId || !event) {
    return NextResponse.json({ error: 'merchantId e event sono obbligatori' }, { status: 400 })
  }

  let enrichedData: Record<string, unknown>
  try {
    if (event === 'nuovo_cliente') {
      enrichedData = await buildNuovoClientePayload(merchantId, data ?? {})
    } else if (event === 'carta_creata') {
      enrichedData = await buildCartaCreataPayload(merchantId, data ?? {})
    } else if (event === 'premio_riscattato') {
      enrichedData = await buildPremioRiscattatoPayload(merchantId, data ?? {})
    } else {
      enrichedData = data ?? {}
    }
  } catch (e) {
    console.error('[dispatch] Errore enrichment payload:', e)
    enrichedData = data ?? {}
  }

  // Awaited — su Vercel serverless il fire-and-forget viene killato prima del completamento
  await triggerWebhook(merchantId, event as WebhookEvent, enrichedData)

  return NextResponse.json({ ok: true })
}
