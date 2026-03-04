import { createClient } from '@supabase/supabase-js'

const SENDAPP_BASE = 'https://app.sendapp.cloud/api'

// ─── Phone normalization ──────────────────────────────────────────────────────

/**
 * Normalizza un numero di telefono italiano al formato SendApp: 393331234567
 * Accetta: +39333..., 0039333..., 39333..., 333...
 */
export function formatPhoneIT(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-\(\)\.+]/g, '')
  if (cleaned.startsWith('0039') && cleaned.length >= 13) return cleaned.slice(2)
  if (cleaned.startsWith('39') && cleaned.length >= 11) return cleaned
  if (cleaned.match(/^[3][0-9]{9}$/)) return `39${cleaned}`
  return null
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function sendappGet(path: string): Promise<any> {
  const res = await fetch(`${SENDAPP_BASE}${path}`)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`SendApp ${path} returned non-JSON (${res.status}): ${text.substring(0, 200)}`)
  }
}

async function sendappPost(path: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${SENDAPP_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`SendApp ${path} returned non-JSON (${res.status}): ${text.substring(0, 200)}`)
  }
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export async function createInstance(accessToken: string): Promise<{ instance_id: string }> {
  return sendappGet(`/create_instance?access_token=${encodeURIComponent(accessToken)}`)
}

export async function getQRCode(instanceId: string, accessToken: string): Promise<{ qr: string }> {
  return sendappGet(
    `/get_qrcode?instance_id=${encodeURIComponent(instanceId)}&access_token=${encodeURIComponent(accessToken)}`
  )
}

export async function getInstanceStatus(instanceId: string, accessToken: string): Promise<{ status: string; phone?: string }> {
  return sendappGet(
    `/get_status?instance_id=${encodeURIComponent(instanceId)}&access_token=${encodeURIComponent(accessToken)}`
  )
}

export async function setWebhook(instanceId: string, accessToken: string, webhookUrl: string): Promise<any> {
  return sendappGet(
    `/set_webhook?webhook_url=${encodeURIComponent(webhookUrl)}&enable=true&instance_id=${encodeURIComponent(instanceId)}&access_token=${encodeURIComponent(accessToken)}`
  )
}

export async function rebootInstance(instanceId: string, accessToken: string): Promise<any> {
  return sendappGet(
    `/reboot?instance_id=${encodeURIComponent(instanceId)}&access_token=${encodeURIComponent(accessToken)}`
  )
}

export async function resetInstance(instanceId: string, accessToken: string): Promise<any> {
  return sendappGet(
    `/reset_instance?instance_id=${encodeURIComponent(instanceId)}&access_token=${encodeURIComponent(accessToken)}`
  )
}

export async function reconnectInstance(instanceId: string, accessToken: string): Promise<any> {
  return sendappGet(
    `/reconnect?instance_id=${encodeURIComponent(instanceId)}&access_token=${encodeURIComponent(accessToken)}`
  )
}

export async function sendTextMessage(
  number: string,
  message: string,
  instanceId: string,
  accessToken: string
): Promise<any> {
  return sendappPost('/send', { number, type: 'text', message, instance_id: instanceId, access_token: accessToken })
}

export async function sendMediaMessage(
  number: string,
  message: string,
  mediaUrl: string,
  instanceId: string,
  accessToken: string
): Promise<any> {
  return sendappPost('/send', { number, type: 'media', message, media_url: mediaUrl, instance_id: instanceId, access_token: accessToken })
}

export async function sendGroupText(
  groupId: string,
  message: string,
  instanceId: string,
  accessToken: string
): Promise<any> {
  return sendappPost('/send_group', { group_id: groupId, type: 'text', message, instance_id: instanceId, access_token: accessToken })
}

export async function sendGroupMedia(
  groupId: string,
  message: string,
  mediaUrl: string,
  instanceId: string,
  accessToken: string
): Promise<any> {
  return sendappPost('/send_group', { group_id: groupId, type: 'media', message, media_url: mediaUrl, instance_id: instanceId, access_token: accessToken })
}

// ─── High-level helper ────────────────────────────────────────────────────────

/**
 * Carica le credenziali SendApp del merchant dal DB, invia un messaggio,
 * e logga il risultato in whatsapp_logs.
 */
export async function sendWhatsAppToCustomer(
  merchantId: string,
  toPhone: string,
  message: string,
  eventType: string
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const normalizedPhone = formatPhoneIT(toPhone)
  if (!normalizedPhone) {
    console.warn(`[sendapp] formatPhoneIT failed for: ${toPhone}`)
    return
  }

  const { data: merchant } = await supabase
    .from('merchants')
    .select('sendapp_instance_id, sendapp_access_token, sendapp_status')
    .eq('id', merchantId)
    .single()

  if (!merchant?.sendapp_instance_id || !merchant?.sendapp_access_token) {
    return
  }
  if (merchant.sendapp_status !== 'connected') {
    return
  }

  let status = 'sent'
  let error: string | undefined

  try {
    await sendTextMessage(
      normalizedPhone,
      message,
      merchant.sendapp_instance_id,
      merchant.sendapp_access_token
    )
  } catch (err: any) {
    status = 'failed'
    error = err?.message ?? String(err)
    console.error(`[sendapp] sendTextMessage failed for ${normalizedPhone}:`, err)
  }

  await supabase.from('whatsapp_logs').insert({
    merchant_id: merchantId,
    to_phone: normalizedPhone,
    message,
    status,
    error: error ?? null,
    event_type: eventType,
  })
}
