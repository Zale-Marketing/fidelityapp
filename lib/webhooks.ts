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
  console.log(`[webhook] triggerWebhook START — merchantId=${merchantId} event=${event}`)

  const { data: endpoints, error } = await supabase
    .from('webhook_endpoints')
    .select('id, url, secret')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .filter('events', 'cs', `{"${event}"}`)

  if (error) {
    console.error(`[webhook] Errore query endpoint: ${error.message}`)
    return
  }
  if (!endpoints || endpoints.length === 0) {
    console.log(`[webhook] Nessun endpoint attivo trovato per merchantId=${merchantId} event=${event}`)
    return
  }

  console.log(`[webhook] ${endpoints.length} endpoint trovati: ${endpoints.map((e: { url: string }) => e.url).join(', ')}`)

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    merchant_id: merchantId,
    data,
  }

  const body = JSON.stringify(payload)
  console.log(`[webhook] Payload: ${body}`)

  await Promise.allSettled(
    endpoints.map(async (endpoint: { id: string; url: string; secret: string }) => {
      const signature = createHmac('sha256', endpoint.secret)
        .update(body)
        .digest('hex')

      console.log(`[webhook] Invio POST → ${endpoint.url}`)
      try {
        const res = await fetch(endpoint.url, {
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
        console.log(`[webhook] Risposta da ${endpoint.url} → status ${res.status}`)
      } catch (err) {
        console.error(`[webhook] Errore fetch verso ${endpoint.url}:`, err)
      }
    })
  )
}
