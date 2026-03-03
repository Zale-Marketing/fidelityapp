import { createHmac } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type WebhookEvent =
  | 'bollino_aggiunto'
  | 'carta_creata'
  | 'premio_riscattato'
  | 'nuovo_cliente'

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  merchant_id: string
  data: Record<string, unknown>
}

export async function triggerWebhook(
  merchantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const { data: endpoints, error } = await supabase
    .from('webhook_endpoints')
    .select('id, url, secret')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .contains('events', [event])

  if (error || !endpoints || endpoints.length === 0) return

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    merchant_id: merchantId,
    data,
  }

  const body = JSON.stringify(payload)

  await Promise.allSettled(
    endpoints.map(async (endpoint: { id: string; url: string; secret: string }) => {
      const signature = createHmac('sha256', endpoint.secret)
        .update(body)
        .digest('hex')

      await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FidelityApp-Signature': `sha256=${signature}`,
          'X-FidelityApp-Event': event,
          'User-Agent': 'FidelityApp-Webhooks/1.0',
        },
        body,
        signal: AbortSignal.timeout(5000),
      })
    })
  )
}
