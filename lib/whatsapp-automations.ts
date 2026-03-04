import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppToCustomer } from '@/lib/sendapp'

export type TriggerType = 'welcome' | 'stamp_added' | 'reward_redeemed' | 'dormant' | 'birthday'

export type AutomationVariables = {
  nome?: string
  bollini?: string | number
  programma?: string
  mancanti?: string | number
  premio?: string
  link_carta?: string
  azienda?: string
}

export const DEFAULT_TEMPLATES: Record<TriggerType, string> = {
  welcome: 'Ciao {nome}! 🎉 Benvenuto da {azienda}. La tua carta fedeltà è attiva: {link_carta}',
  stamp_added: 'Ciao {nome}! Hai {bollini} bollini su {programma}. Ti mancano {mancanti} per il premio 🎯',
  reward_redeemed: 'Complimenti {nome}! Hai riscattato: {premio} 🏆 Grazie da {azienda}!',
  dormant: 'Ehi {nome}, ci manchi! 😊 Hai già {bollini} bollini su {programma}. Vieni a trovarci!',
  birthday: 'Buon compleanno {nome}! 🎂 Vieni a festeggiare con noi da {azienda}!',
}

export function interpolate(template: string, variables: AutomationVariables): string {
  return template
    .replace(/\{nome\}/g, variables.nome ?? '')
    .replace(/\{bollini\}/g, String(variables.bollini ?? ''))
    .replace(/\{programma\}/g, variables.programma ?? '')
    .replace(/\{mancanti\}/g, String(variables.mancanti ?? ''))
    .replace(/\{premio\}/g, variables.premio ?? '')
    .replace(/\{link_carta\}/g, variables.link_carta ?? '')
    .replace(/\{azienda\}/g, variables.azienda ?? '')
}

/**
 * Invia un messaggio WhatsApp automatico basato su template da DB o default.
 * Recupera il nome dell'azienda automaticamente se non fornito in variables.azienda.
 */
export async function sendAutomatedMessage(
  merchantId: string,
  triggerType: TriggerType,
  toPhone: string,
  variables: AutomationVariables
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch merchant name if not provided
  let vars = { ...variables }
  if (!vars.azienda) {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('name')
      .eq('id', merchantId)
      .single()
    vars.azienda = merchant?.name ?? ''
  }

  // Try to load custom template from DB
  const { data: automation } = await supabase
    .from('whatsapp_automations')
    .select('message_template, is_active')
    .eq('merchant_id', merchantId)
    .eq('trigger_type', triggerType)
    .single()

  // If automation exists but is disabled, skip
  if (automation && !automation.is_active) {
    return
  }

  const template = automation?.message_template ?? DEFAULT_TEMPLATES[triggerType]
  const message = interpolate(template, vars)

  await sendWhatsAppToCustomer(merchantId, toPhone, message, triggerType)
}
