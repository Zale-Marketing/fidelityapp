'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { usePlan } from '@/lib/hooks/usePlan'
import UpgradePrompt from '@/components/ui/UpgradePrompt'
import { DEFAULT_TEMPLATES, TriggerType, interpolate } from '@/lib/whatsapp-automations'
import { ArrowLeft, Save, ToggleLeft, ToggleRight, Eye } from 'lucide-react'
import Link from 'next/link'

type Automation = {
  trigger_type: TriggerType
  message_template: string
  is_active: boolean
  dormant_days: number
}

const TRIGGERS: {
  type: TriggerType
  title: string
  description: string
  variables: string[]
  hasDormantDays?: boolean
}[] = [
  {
    type: 'welcome',
    title: 'Benvenuto nuovo cliente',
    description: 'Inviato quando un cliente crea la sua prima carta fedeltà',
    variables: ['nome', 'programma', 'link_carta', 'azienda'],
  },
  {
    type: 'stamp_added',
    title: 'Bollino aggiunto',
    description: 'Inviato quando viene aggiunto un bollino alla carta del cliente (solo programmi stampe)',
    variables: ['nome', 'bollini', 'programma', 'mancanti', 'azienda'],
  },
  {
    type: 'reward_redeemed',
    title: 'Premio riscattato',
    description: 'Inviato quando un cliente riscatta il suo premio',
    variables: ['nome', 'premio', 'azienda'],
  },
  {
    type: 'dormant',
    title: 'Cliente dormiente',
    description: 'Inviato ai clienti inattivi per riportarli nel negozio',
    variables: ['nome', 'bollini', 'programma', 'azienda'],
    hasDormantDays: true,
  },
  {
    type: 'birthday',
    title: 'Compleanno',
    description: 'Inviato nel giorno del compleanno del cliente',
    variables: ['nome', 'azienda'],
  },
]

const EXAMPLE_VALUES: Record<string, string> = {
  nome: 'Mario Rossi',
  bollini: '7',
  programma: 'Caffè Gratis',
  mancanti: '3',
  premio: 'Caffè gratis',
  link_carta: 'https://fidelityapp.it/c/abc123',
  azienda: 'Bar Centrale',
}

export default function WhatsAppAutomationsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { isFree, loading: planLoading } = usePlan()

  const [loading, setLoading] = useState(true)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [waConnected, setWaConnected] = useState(false)
  const [automations, setAutomations] = useState<Record<TriggerType, Automation>>({} as Record<TriggerType, Automation>)
  const [saving, setSaving] = useState<TriggerType | null>(null)
  const [saved, setSaved] = useState<TriggerType | null>(null)
  const [showPreview, setShowPreview] = useState<TriggerType | null>(null)

  // Refs per le textarea (per inserimento variabili al cursore)
  const textareaRefs = useRef<Partial<Record<TriggerType, HTMLTextAreaElement | null>>>({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('merchant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.merchant_id) { setLoading(false); return }
    setMerchantId(profile.merchant_id)

    const { data: merchant } = await supabase
      .from('merchants')
      .select('sendapp_status')
      .eq('id', profile.merchant_id)
      .single()

    setWaConnected(merchant?.sendapp_status === 'connected')

    const { data: existing } = await supabase
      .from('whatsapp_automations')
      .select('*')
      .eq('merchant_id', profile.merchant_id)

    // Inizializza con default, poi sovrascrive con valori dal DB
    const initial: Record<TriggerType, Automation> = {} as Record<TriggerType, Automation>
    for (const t of TRIGGERS) {
      const dbRow = existing?.find(r => r.trigger_type === t.type)
      initial[t.type] = {
        trigger_type: t.type,
        message_template: dbRow?.message_template ?? DEFAULT_TEMPLATES[t.type],
        is_active: dbRow?.is_active ?? true,
        dormant_days: dbRow?.dormant_days ?? 30,
      }
    }
    setAutomations(initial)
    setLoading(false)
  }

  function insertVariable(triggerType: TriggerType, variable: string) {
    const ta = textareaRefs.current[triggerType]
    if (!ta) return

    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const current = automations[triggerType].message_template
    const insertion = `{${variable}}`
    const newValue = current.slice(0, start) + insertion + current.slice(end)

    setAutomations(prev => ({
      ...prev,
      [triggerType]: { ...prev[triggerType], message_template: newValue },
    }))

    // Ripristina focus e cursore dopo aggiornamento
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + insertion.length, start + insertion.length)
    }, 0)
  }

  async function saveAutomation(triggerType: TriggerType) {
    if (!merchantId) return
    setSaving(triggerType)

    const auto = automations[triggerType]
    const { error } = await supabase
      .from('whatsapp_automations')
      .upsert(
        {
          merchant_id: merchantId,
          trigger_type: triggerType,
          message_template: auto.message_template,
          is_active: auto.is_active,
          ...(triggerType === 'dormant' ? { dormant_days: auto.dormant_days } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'merchant_id,trigger_type' }
      )

    setSaving(null)
    if (!error) {
      setSaved(triggerType)
      setTimeout(() => setSaved(null), 2000)
    }
  }

  if (planLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isFree) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <UpgradePrompt feature="Automazioni WhatsApp" requiredPlan="PRO" />
      </div>
    )
  }

  if (!waConnected) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium mb-2">WhatsApp non connesso</p>
          <p className="text-amber-700 text-sm mb-4">Connetti prima il tuo numero WhatsApp per usare le automazioni.</p>
          <Link href="/dashboard/settings/whatsapp" className="text-sm text-amber-900 underline">
            Vai alle impostazioni WhatsApp →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/settings" className="text-sm text-gray-500 hover:text-black flex items-center gap-1">
          <ArrowLeft size={14} />
          Impostazioni
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Automazioni WhatsApp</h1>
        <p className="text-gray-500 text-sm mt-1">
          Personalizza i messaggi automatici inviati ai tuoi clienti. Lascia il template di default o scrivi il tuo.
        </p>
      </div>

      {TRIGGERS.map(trigger => {
        const auto = automations[trigger.type]
        if (!auto) return null
        const isSaving = saving === trigger.type
        const isSaved = saved === trigger.type
        const preview = interpolate(auto.message_template, EXAMPLE_VALUES as any)

        return (
          <div key={trigger.type} className="bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900">{trigger.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{trigger.description}</p>
              </div>
              <button
                onClick={() =>
                  setAutomations(prev => ({
                    ...prev,
                    [trigger.type]: { ...prev[trigger.type], is_active: !prev[trigger.type].is_active },
                  }))
                }
                className="flex-shrink-0 flex items-center gap-2 text-sm font-medium"
              >
                {auto.is_active ? (
                  <>
                    <ToggleRight size={24} className="text-green-500" />
                    <span className="text-green-700">Attivo</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft size={24} className="text-gray-400" />
                    <span className="text-gray-500">Disattivo</span>
                  </>
                )}
              </button>
            </div>

            {/* Dormant days */}
            {trigger.hasDormantDays && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 whitespace-nowrap">Giorni di inattività:</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={auto.dormant_days}
                  onChange={e =>
                    setAutomations(prev => ({
                      ...prev,
                      [trigger.type]: { ...prev[trigger.type], dormant_days: Number(e.target.value) },
                    }))
                  }
                  className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            )}

            {/* Template textarea */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Messaggio</label>
              <textarea
                ref={el => { textareaRefs.current[trigger.type] = el }}
                value={auto.message_template}
                onChange={e =>
                  setAutomations(prev => ({
                    ...prev,
                    [trigger.type]: { ...prev[trigger.type], message_template: e.target.value },
                  }))
                }
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none font-mono"
                placeholder="Scrivi il tuo messaggio..."
              />
            </div>

            {/* Variable chips */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Clicca per inserire una variabile:</p>
              <div className="flex flex-wrap gap-2">
                {trigger.variables.map(v => (
                  <button
                    key={v}
                    onClick={() => insertVariable(trigger.type, v)}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-md font-mono transition-colors"
                  >
                    {`{${v}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview toggle */}
            <div>
              <button
                onClick={() => setShowPreview(showPreview === trigger.type ? null : trigger.type)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors"
              >
                <Eye size={14} />
                {showPreview === trigger.type ? 'Nascondi preview' : 'Mostra preview'}
              </button>
              {showPreview === trigger.type && (
                <div className="mt-2 bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Preview con valori di esempio:</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{preview}</p>
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <button
                onClick={() => saveAutomation(trigger.type)}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSaved
                    ? 'bg-green-100 text-green-700'
                    : 'bg-black text-white hover:bg-gray-800 disabled:opacity-50'
                }`}
              >
                <Save size={14} />
                {isSaving ? 'Salvataggio...' : isSaved ? 'Salvato!' : 'Salva'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
