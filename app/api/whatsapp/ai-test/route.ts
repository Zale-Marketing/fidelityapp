import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fidelityapp-six.vercel.app'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function callOpenAI(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
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
        { role: 'user', content: userMessage },
      ],
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'OpenAI error')
  return data.choices?.[0]?.message?.content ?? 'Nessuna risposta.'
}

async function callAnthropic(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
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
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'Anthropic error')
  return data.content?.[0]?.text ?? 'Nessuna risposta.'
}

// POST — { message, card_holder_id? }
// Richiede autenticazione — simula risposta chatbot AI
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

    let body: { message?: string; card_holder_id?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
    }

    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'Messaggio vuoto' }, { status: 400 })
    }

    const merchantId = profile.merchant_id

    const { data: merchant } = await supabase
      .from('merchants')
      .select('name, ai_chatbot_enabled, ai_provider, ai_api_key, ai_system_prompt')
      .eq('id', merchantId)
      .single()

    if (!merchant?.ai_chatbot_enabled) {
      return NextResponse.json({ error: 'Chatbot AI non abilitato' }, { status: 400 })
    }
    if (!merchant?.ai_api_key) {
      return NextResponse.json({ error: 'API key non configurata' }, { status: 400 })
    }

    // Costruisci contesto cliente di esempio (o reale se card_holder_id fornito)
    let customerContext = '\n\n--- DATI CLIENTE ---\nNome: Cliente di test\nBollini: 5 su Programma Fedeltà\nPremi disponibili:\n- Caffè gratis (10 bollini)\nLink carta: N/A'

    if (body.card_holder_id) {
      const { data: ch } = await supabase
        .from('card_holders')
        .select('id, full_name')
        .eq('id', body.card_holder_id)
        .eq('merchant_id', merchantId)
        .single()

      if (ch) {
        const { data: card } = await supabase
          .from('cards')
          .select('id, scan_token, current_stamps, stamp_count, program_id')
          .eq('merchant_id', merchantId)
          .eq('card_holder_id', ch.id)
          .is('deleted_at', null)
          .limit(1)
          .single()

        let programName = 'Programma Fedeltà'
        let stamps = 0
        let rewardsList = 'Nessuno'
        let cardLink = ''

        if (card) {
          stamps = card.current_stamps ?? card.stamp_count ?? 0
          if (card.scan_token) cardLink = `${APP_URL}/c/${card.scan_token}`

          if (card.program_id) {
            const { data: prog } = await supabase
              .from('programs')
              .select('name')
              .eq('id', card.program_id)
              .single()
            if (prog) programName = prog.name

            const { data: rewards } = await supabase
              .from('rewards')
              .select('name, stamps_required')
              .eq('program_id', card.program_id)
              .eq('is_active', true)
              .order('stamps_required', { ascending: true })
            if (rewards?.length) {
              rewardsList = rewards.map(r => `- ${r.name} (${r.stamps_required} bollini)`).join('\n')
            }
          }
        }

        customerContext = `\n\n--- DATI CLIENTE ---\nNome: ${ch.full_name}\nBollini: ${stamps} su ${programName}\nPremi disponibili:\n${rewardsList}\nLink carta: ${cardLink || 'N/A'}`
      }
    }

    const systemPrompt = (merchant.ai_system_prompt || `Sei l'assistente virtuale di ${merchant.name}. Rispondi sempre in modo cordiale e professionale. Parla solo di argomenti relativi alla nostra attività e al programma fedeltà.`) + customerContext

    const provider = (merchant.ai_provider as string) || 'openai'
    let response: string

    if (provider === 'anthropic') {
      response = await callAnthropic(merchant.ai_api_key, systemPrompt, body.message.trim())
    } else {
      response = await callOpenAI(merchant.ai_api_key, systemPrompt, body.message.trim())
    }

    return NextResponse.json({ response })
  } catch (err: any) {
    console.error('[whatsapp/ai-test] error:', err)
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 })
  }
}
