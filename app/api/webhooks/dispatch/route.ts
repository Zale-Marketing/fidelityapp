import { NextRequest, NextResponse } from 'next/server'
import { triggerWebhook, type WebhookEvent } from '@/lib/webhooks'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { merchantId, event, data } = body

  if (!merchantId || !event) {
    return NextResponse.json({ error: 'merchantId e event sono obbligatori' }, { status: 400 })
  }

  // Fire-and-forget — do NOT await
  triggerWebhook(merchantId, event as WebhookEvent, data ?? {}).catch(console.error)

  return NextResponse.json({ ok: true })
}
