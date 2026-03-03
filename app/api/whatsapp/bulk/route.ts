import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatPhoneIT, sendTextMessage } from '@/lib/sendapp'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Sostituisce le variabili nel messaggio per un destinatario specifico.
 * Variabili supportate: {nome} {bollini} {premio} {link_carta}
 */
function interpolate(
  template: string,
  vars: { nome?: string; bollini?: number | null; premio?: string | null; link_carta?: string }
): string {
  return template
    .replace(/\{nome\}/g, vars.nome || '')
    .replace(/\{bollini\}/g, vars.bollini != null ? String(vars.bollini) : '')
    .replace(/\{premio\}/g, vars.premio || '')
    .replace(/\{link_carta\}/g, vars.link_carta || '')
}

// POST — { message: string, segment: 'all'|'active'|'dormant'|'lost'|'program', programId?: string }
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()

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

    let body: { message?: unknown; segment?: unknown; programId?: unknown } = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
    }

    if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
      return NextResponse.json({ error: '"message" non può essere vuoto' }, { status: 400 })
    }

    const messageTemplate = (body.message as string).trim()
    const segment = (body.segment as string) || 'all'
    const programId = body.programId as string | undefined

    // Carica credenziali merchant
    const { data: merchant } = await supabase
      .from('merchants')
      .select('sendapp_instance_id, sendapp_access_token, sendapp_status')
      .eq('id', merchantId)
      .single()

    if (!merchant?.sendapp_instance_id || !merchant?.sendapp_access_token) {
      return NextResponse.json({ error: 'WhatsApp non connesso' }, { status: 400 })
    }

    if (merchant.sendapp_status !== 'connected') {
      return NextResponse.json({ error: 'Sessione WhatsApp non attiva' }, { status: 400 })
    }

    // Calcola date per segmentazione
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

    // Carica cards del merchant (o di un programma specifico)
    let cardsQuery = supabase
      .from('cards')
      .select('id, card_holder_id, program_id, current_stamps, stamp_count, scan_token, updated_at')
      .eq('merchant_id', merchantId)
      .not('card_holder_id', 'is', null)
      .is('deleted_at', null)

    if (programId) {
      cardsQuery = cardsQuery.eq('program_id', programId)
    }

    const { data: allCards } = await cardsQuery

    if (!allCards || allCards.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, total: 0 })
    }

    // Filtra per segmento
    let filteredCards = allCards
    if (segment === 'active') {
      filteredCards = allCards.filter(c => c.updated_at && c.updated_at >= thirtyDaysAgo)
    } else if (segment === 'dormant') {
      filteredCards = allCards.filter(c =>
        c.updated_at && c.updated_at < thirtyDaysAgo && c.updated_at >= ninetyDaysAgo
      )
    } else if (segment === 'lost') {
      filteredCards = allCards.filter(c => !c.updated_at || c.updated_at < ninetyDaysAgo)
    }

    // Ottieni card_holder_id unici
    const holderIds = [...new Set(filteredCards.map(c => c.card_holder_id).filter(Boolean))]

    if (holderIds.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, total: 0 })
    }

    // Carica card_holders con phone
    const { data: holders } = await supabase
      .from('card_holders')
      .select('id, full_name, phone')
      .in('id', holderIds)
      .not('phone', 'is', null)
      .neq('phone', '')

    if (!holders || holders.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, total: 0 })
    }

    // Carica nome programma per variabili
    const programMap = new Map<string, string>()
    if (filteredCards.length > 0) {
      const programIds = [...new Set(filteredCards.map(c => c.program_id).filter(Boolean))]
      const { data: programs } = await supabase
        .from('programs')
        .select('id, name, reward_description, stamps_required')
        .in('id', programIds)
      if (programs) {
        programs.forEach((p: any) => programMap.set(p.id, p.name))
      }
    }

    // Crea mappa card_holder → dati carta
    const holderCardMap = new Map<string, any>()
    filteredCards.forEach(c => {
      if (c.card_holder_id && !holderCardMap.has(c.card_holder_id)) {
        holderCardMap.set(c.card_holder_id, c)
      }
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    let sent = 0
    let failed = 0

    for (const holder of holders) {
      const normalizedPhone = formatPhoneIT(holder.phone)
      if (!normalizedPhone) {
        failed++
        continue
      }

      const card = holderCardMap.get(holder.id)
      const bollini = card ? (card.current_stamps ?? card.stamp_count ?? 0) : 0
      const linkCarta = card ? `${appUrl}/c/${card.scan_token}` : appUrl

      const personalizedMessage = interpolate(messageTemplate, {
        nome: holder.full_name || '',
        bollini,
        premio: '',
        link_carta: linkCarta,
      })

      let status = 'sent'
      let errorMsg: string | undefined

      try {
        await sendTextMessage(
          normalizedPhone,
          personalizedMessage,
          merchant.sendapp_instance_id,
          merchant.sendapp_access_token
        )
        sent++
      } catch (err: any) {
        status = 'failed'
        errorMsg = err?.message ?? String(err)
        failed++
      }

      // Log ogni messaggio
      await supabase.from('whatsapp_logs').insert({
        merchant_id: merchantId,
        to_phone: normalizedPhone,
        message: personalizedMessage,
        status,
        error: errorMsg ?? null,
        event_type: 'bulk',
      })

      // Rate limiting — 500ms tra messaggi
      await sleep(500)
    }

    return NextResponse.json({ sent, failed, total: holders.length })
  } catch (err) {
    console.error('[whatsapp/bulk] error:', err)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
