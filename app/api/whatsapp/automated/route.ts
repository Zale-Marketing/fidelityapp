import { NextRequest, NextResponse } from 'next/server'
import { sendAutomatedMessage, TriggerType, AutomationVariables } from '@/lib/whatsapp-automations'

// POST — { merchantId, triggerType, phone, variables }
// Chiamato dalle pagine client-side (join, stamp) per inviare messaggi automatici WA
export async function POST(req: NextRequest) {
  try {
    let body: {
      merchantId?: string
      triggerType?: string
      phone?: string
      variables?: AutomationVariables
    }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
    }

    const { merchantId, triggerType, phone, variables } = body

    if (!merchantId || !triggerType || !phone) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    const validTriggers: TriggerType[] = ['welcome', 'stamp_added', 'reward_redeemed', 'dormant', 'birthday']
    if (!validTriggers.includes(triggerType as TriggerType)) {
      return NextResponse.json({ error: 'triggerType non valido' }, { status: 400 })
    }

    // Fire-and-forget — non aspettiamo per tenere la risposta veloce
    sendAutomatedMessage(merchantId, triggerType as TriggerType, phone, variables ?? {}).catch(console.error)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[whatsapp/automated] error:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
