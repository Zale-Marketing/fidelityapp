import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatPhoneIT, sendTextMessage } from '@/lib/sendapp'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fidelityapp-six.vercel.app'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function callOpenAI(apiKey: string, systemPrompt: string, messages: { role: string; content: string }[], userMessage: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: userMessage },
      ],
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? 'Non ho potuto elaborare la tua richiesta.'
}

async function callAnthropic(apiKey: string, systemPrompt: string, messages: { role: string; content: string }[], userMessage: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: userMessage },
      ],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text ?? 'Non ho potuto elaborare la tua richiesta.'
}

// POST — riceve webhook in entrata da SendApp, gestisce comandi rapidi e chatbot AI
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
    }

    // SendApp manda: { instance_id, from, type, message, ... }
    const instanceId: string = body.instance_id || body.instanceId || ''
    const from: string = body.from || body.number || ''
    const messageText: string = body.message || body.text || ''

    if (!instanceId || !from || !messageText) {
      return NextResponse.json({ received: true })
    }

    // Trova il merchant per instance_id — includi campi chatbot
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id, name, sendapp_instance_id, sendapp_access_token, sendapp_status, ai_chatbot_enabled, ai_provider, ai_api_key, ai_system_prompt')
      .eq('sendapp_instance_id', instanceId)
      .single()

    if (!merchant?.id) {
      return NextResponse.json({ received: true })
    }

    // Logga messaggio in entrata
    await supabase.from('whatsapp_logs').insert({
      merchant_id: merchant.id,
      to_phone: from,
      message: messageText,
      status: 'received',
      event_type: 'incoming',
    })

    if (merchant.sendapp_status !== 'connected' || !merchant.sendapp_instance_id || !merchant.sendapp_access_token) {
      return NextResponse.json({ received: true })
    }

    // Normalizza il numero mittente
    const normalizedFrom = formatPhoneIT(from) || from

    // Cerca il card_holder per quel merchant+phone
    const { data: cardHolder } = await supabase
      .from('card_holders')
      .select('id, full_name, contact_phone, phone')
      .eq('merchant_id', merchant.id)
      .or(`contact_phone.eq.${normalizedFrom},phone.eq.${normalizedFrom},contact_phone.eq.${from},phone.eq.${from}`)
      .limit(1)
      .single()

    // Cerca la carta attiva del cliente per quel merchant
    let card: any = null
    let program: any = null
    let rewards: any[] = []
    let cardLink = ''

    if (cardHolder?.id) {
      const { data: cardData } = await supabase
        .from('cards')
        .select('id, scan_token, current_stamps, stamp_count, points_balance, cashback_balance, program_id, status')
        .eq('merchant_id', merchant.id)
        .eq('card_holder_id', cardHolder.id)
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      card = cardData

      if (card?.program_id) {
        const { data: progData } = await supabase
          .from('programs')
          .select('id, name, program_type, stamps_required, reward_description')
          .eq('id', card.program_id)
          .single()
        program = progData

        const { data: rewardsData } = await supabase
          .from('rewards')
          .select('id, name, stamps_required')
          .eq('program_id', card.program_id)
          .eq('is_active', true)
          .order('stamps_required', { ascending: true })
        rewards = rewardsData ?? []
      }

      if (card?.scan_token) {
        cardLink = `${APP_URL}/c/${card.scan_token}`
      }
    }

    let responseMessage = ''

    if (!merchant.ai_chatbot_enabled) {
      // ── Comandi rapidi (fallback) ──────────────────────────────────────────
      const msg = messageText.toLowerCase()
      const stamps = card?.current_stamps ?? card?.stamp_count ?? 0
      const programName = program?.name || 'il tuo programma fedeltà'

      if (msg.includes('punti') || msg.includes('bollini')) {
        responseMessage = `Ciao! Hai ${stamps} ${program?.program_type === 'points' ? 'punti' : 'bollini'} su ${programName} 🎯`
      } else if (msg.includes('premio') || msg.includes('premi')) {
        if (rewards.length > 0) {
          const list = rewards.map(r => `• ${r.name} (${r.stamps_required} bollini)`).join('\n')
          responseMessage = `I premi disponibili:\n${list}`
        } else {
          responseMessage = `Non ci sono premi configurati al momento per ${programName}.`
        }
      } else if (msg.includes('carta') || msg.includes('card')) {
        responseMessage = cardLink
          ? `La tua carta fedeltà: ${cardLink}`
          : 'Non ho trovato una carta associata al tuo numero.'
      } else {
        responseMessage = `Ciao! Ecco cosa puoi chiedermi:\n• Scrivi *bollini* per vedere il tuo saldo\n• Scrivi *premi* per vedere i premi disponibili\n• Scrivi *carta* per il link alla tua carta\nPer assistenza contatta direttamente ${merchant.name}.`
      }
    } else if (merchant.ai_api_key) {
      // ── Chatbot AI ────────────────────────────────────────────────────────
      try {
        // Carica o crea la conversazione
        const { data: existingConv } = await supabase
          .from('whatsapp_conversations')
          .select('id, messages')
          .eq('merchant_id', merchant.id)
          .eq('phone', normalizedFrom)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const convMessages: { role: string; content: string; timestamp: string }[] =
          (existingConv?.messages as any[]) ?? []

        // Costruisci contesto cliente per il system prompt
        const stamps = card?.current_stamps ?? card?.stamp_count ?? 0
        const rewardsList = rewards.map(r => `- ${r.name} (${r.stamps_required} bollini)`).join('\n') || 'Nessuno'
        const customerContext = `\n\n--- DATI CLIENTE ---\nNome: ${cardHolder?.full_name || 'Cliente'}\nBollini: ${stamps} su ${program?.name || 'programma fedeltà'}\nPremi disponibili:\n${rewardsList}\nLink carta: ${cardLink || 'N/A'}`

        const systemPrompt = (merchant.ai_system_prompt || `Sei l'assistente virtuale di ${merchant.name}. Rispondi sempre in modo cordiale e professionale. Parla solo di argomenti relativi alla nostra attività e al programma fedeltà.`) + customerContext

        // Storico messaggi per la conversazione (ultimi 10 messaggi)
        const chatHistory = convMessages.slice(-10).map(m => ({
          role: m.role === 'incoming' ? 'user' : 'assistant',
          content: m.content,
        }))

        const provider = (merchant.ai_provider as string) || 'openai'
        if (provider === 'anthropic') {
          responseMessage = await callAnthropic(merchant.ai_api_key, systemPrompt, chatHistory, messageText)
        } else {
          responseMessage = await callOpenAI(merchant.ai_api_key, systemPrompt, chatHistory, messageText)
        }

        // Aggiorna la conversazione
        const updatedMessages = [
          ...convMessages,
          { role: 'incoming', content: messageText, timestamp: new Date().toISOString() },
          { role: 'outgoing', content: responseMessage, timestamp: new Date().toISOString() },
        ]

        if (existingConv?.id) {
          await supabase
            .from('whatsapp_conversations')
            .update({ messages: updatedMessages, last_message_at: new Date().toISOString() })
            .eq('id', existingConv.id)
        } else {
          await supabase.from('whatsapp_conversations').insert({
            merchant_id: merchant.id,
            card_holder_id: cardHolder?.id ?? null,
            phone: normalizedFrom,
            messages: updatedMessages,
            last_message_at: new Date().toISOString(),
          })
        }
      } catch (aiErr) {
        console.error('[whatsapp/incoming] AI error:', aiErr)
        responseMessage = `Ciao! Al momento non riesco a rispondere. Contatta direttamente ${merchant.name} per assistenza.`
      }
    } else {
      // AI abilitata ma nessuna API key configurata
      return NextResponse.json({ received: true })
    }

    // Invia la risposta al cliente
    if (responseMessage) {
      try {
        await sendTextMessage(normalizedFrom, responseMessage, merchant.sendapp_instance_id, merchant.sendapp_access_token)
        await supabase.from('whatsapp_logs').insert({
          merchant_id: merchant.id,
          to_phone: normalizedFrom,
          message: responseMessage,
          status: 'sent',
          event_type: merchant.ai_chatbot_enabled ? 'chatbot_response' : 'incoming',
        })
      } catch (sendErr) {
        console.error('[whatsapp/incoming] send error:', sendErr)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[whatsapp/incoming] error:', err)
    return NextResponse.json({ received: true }) // sempre 200 verso SendApp
  }
}
