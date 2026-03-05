'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { usePlan } from '@/lib/hooks/usePlan'
import UpgradePrompt from '@/components/ui/UpgradePrompt'
import Link from 'next/link'
import {
  ArrowLeft,
  Star,
  Bell,
  Share2,
  BarChart2,
  Tag,
  FileText,
  Lock,
} from 'lucide-react'

type ModuleKey =
  | 'module_reviews'
  | 'module_alerts'
  | 'module_social'
  | 'module_competitor'
  | 'module_price'
  | 'module_reports'

type ConfigState = {
  module_reviews: boolean
  module_alerts: boolean
  module_social: boolean
  module_competitor: boolean
  module_price: boolean
  module_reports: boolean
}

const MODULES: ReadonlyArray<{
  key: ModuleKey
  title: string
  desc: string
  icon: React.ElementType
  available: boolean
}> = [
  {
    key: 'module_reviews',
    title: 'Monitoraggio Recensioni',
    desc: 'Recupera automaticamente le nuove recensioni Google Maps ogni 6 ore',
    icon: Star,
    available: true,
  },
  {
    key: 'module_alerts',
    title: 'Alert WhatsApp',
    desc: 'Ricevi un messaggio WhatsApp per ogni recensione negativa o urgente',
    icon: Bell,
    available: true,
  },
  {
    key: 'module_social',
    title: 'Social Listening',
    desc: 'Monitora le menzioni della tua attivita sui social media',
    icon: Share2,
    available: false,
  },
  {
    key: 'module_competitor',
    title: 'Competitor Radar',
    desc: 'Analizza i competitor nella tua zona su Google Maps',
    icon: BarChart2,
    available: false,
  },
  {
    key: 'module_price',
    title: 'Price Intelligence',
    desc: 'Monitora i prezzi dei competitor nella tua categoria',
    icon: Tag,
    available: false,
  },
  {
    key: 'module_reports',
    title: 'Report Mensile AI',
    desc: 'Ricevi ogni mese un report AI con trend e raccomandazioni',
    icon: FileText,
    available: false,
  },
] as const

const DEFAULT_CONFIG: ConfigState = {
  module_reviews: true,
  module_alerts: true,
  module_social: false,
  module_competitor: false,
  module_price: false,
  module_reports: false,
}

const REVIEW_TIERS: ReadonlyArray<{
  id: string
  name: string
  desc: string
  price: string
}> = [
  { id: 'starter',      name: 'Starter',      desc: 'ultime 200 recensioni',   price: 'Incluso' },
  { id: 'growth',       name: 'Growth',       desc: 'ultime 500 recensioni',   price: '+€4.99/mese' },
  { id: 'professional', name: 'Professional', desc: 'ultime 1.500 recensioni', price: '+€9.99/mese' },
  { id: 'complete',     name: 'Complete',     desc: 'tutta la tua storia',     price: '+€19.99/mese' },
] as const

export default function OcioSettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { isBusiness, loading: planLoading } = usePlan()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string>('')
  const [mapsUrl, setMapsUrl] = useState<string>('')
  const [alertPhone, setAlertPhone] = useState<string>('')
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG)
  const [reviewTier, setReviewTier] = useState<string>('professional')
  // Traccia se il DB aveva già un link al momento del caricamento
  const [hadMapsUrlOnLoad, setHadMapsUrlOnLoad] = useState<boolean>(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const token = session.access_token
    setAccessToken(token)

    try {
      const res = await fetch('/api/ocio/config', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (res.status === 403) {
        setLoading(false)
        return
      }

      if (res.ok) {
        const { data } = await res.json()
        if (data) {
          const existingUrl = data.google_maps_url ?? ''
          setMapsUrl(existingUrl)
          // Se il DB aveva già un link, lo segniamo
          setHadMapsUrlOnLoad(existingUrl.trim() !== '')
          setAlertPhone(data.alert_whatsapp_number ?? '')
          setConfig({
            module_reviews: data.module_reviews ?? true,
            module_alerts: data.module_alerts ?? true,
            module_social: data.module_social ?? false,
            module_competitor: data.module_competitor ?? false,
            module_price: data.module_price ?? false,
            module_reports: data.module_reports ?? false,
          })
          setReviewTier(data.review_tier ?? 'professional')
        }
      }
    } catch {
      // Se API fallisce, i default vengono usati
    }

    setLoading(false)
  }

  function toggleModule(key: ModuleKey) {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function saveConfig() {
    setError(null)
    setSaving(true)

    const res = await fetch('/api/ocio/config', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        google_maps_url: mapsUrl.trim() || null,
        module_reviews: config.module_reviews,
        module_alerts: config.module_alerts,
        alert_whatsapp_number: alertPhone.trim() || null,
        review_tier: reviewTier,
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Errore durante il salvataggio')
      setSaving(false)
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)

    // isFirstTime = true se al caricamento il DB non aveva ancora un link
    const isFirstTime = !hadMapsUrlOnLoad && mapsUrl.trim() !== ''

    // Gestione schedule Trigger.dev — non-blocking
    const scheduleAction = config.module_reviews ? 'create' : 'cancel'
    try {
      await fetch('/api/ocio/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: scheduleAction, isFirstTime }),
      })
    } catch {
      // Silenzioso
    }

    setSaving(false)
  }

  if (planLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isBusiness) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <UpgradePrompt feature="Modulo OCIO — Reputation Intelligence" requiredPlan="BUSINESS" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/dashboard/settings"
          className="text-sm text-gray-500 hover:text-black flex items-center gap-1"
        >
          <ArrowLeft size={14} />
          Impostazioni
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">OCIO — Impostazioni</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configura il modulo di Reputation Intelligence per la tua attivita.
        </p>
      </div>

      <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">URL Google Maps</h2>
        <div className="space-y-2">
          <input
            type="url"
            value={mapsUrl}
            onChange={e => setMapsUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="text-xs text-gray-500">
            Incolla il link Google Maps della tua attivita. Viene usato per il monitoraggio automatico delle recensioni.
          </p>
        </div>
      </div>

      {/* Profondita di analisi storica */}
      <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Profondita di analisi storica</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Quante recensioni passate vuoi che analizziamo? Piu recensioni analizziamo, piu precisi sono gli insight sulle tue aree di miglioramento.
          </p>
        </div>
        <div className="border border-[#E8E8E8] rounded-xl overflow-hidden divide-y divide-[#E8E8E8]">
          {REVIEW_TIERS.map(tier => {
            const isSelected = reviewTier === tier.id
            return (
              <button
                key={tier.id}
                onClick={() => setReviewTier(tier.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors ${
                  isSelected ? 'bg-gray-50 border-l-2 border-l-black' : 'hover:bg-gray-50/50'
                }`}
              >
                {/* Radio circle */}
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                {/* Name + desc */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900">{tier.name}</span>
                  <span className="text-sm text-gray-500 ml-2">{tier.desc}</span>
                </div>
                {/* Price */}
                <span className={`text-sm font-semibold flex-shrink-0 ${
                  tier.price === 'Incluso' ? 'text-green-600' : 'text-gray-700'
                }`}>
                  {tier.price}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400">
          Le nuove recensioni vengono sempre analizzate automaticamente, indipendentemente dal piano scelto.
        </p>
      </div>

      <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Moduli</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Attiva o disattiva i moduli disponibili. I moduli in grigio saranno disponibili prossimamente.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODULES.map(module => (
            <div
              key={module.key}
              className="relative bg-white border border-[#E8E8E8] rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <module.icon size={18} className="text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{module.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{module.desc}</p>
                </div>
                <button
                  onClick={() => module.available ? toggleModule(module.key) : undefined}
                  disabled={!module.available}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    config[module.key] && module.available ? 'bg-black' : 'bg-gray-200'
                  } disabled:opacity-50`}
                  aria-label={`Toggle ${module.title}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config[module.key] && module.available ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {!module.available && (
                <div className="absolute inset-0 bg-white/60 rounded-xl flex items-start justify-end p-3 pointer-events-none">
                  <Lock size={15} className="text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {config.module_alerts && (
          <div className="mt-3">
            <label className="text-xs text-gray-500 block mb-1">
              Numero WhatsApp per alert (es. +39333...):
            </label>
            <input
              type="tel"
              value={alertPhone}
              onChange={e => setAlertPhone(e.target.value)}
              placeholder="+393331234567"
              className="w-full border border-[#E0E0E0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-gray-400 mt-1">
              Riceverai un WhatsApp per ogni recensione negativa o urgente.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            saved
              ? 'bg-green-100 text-green-700'
              : 'bg-[#111111] text-white hover:bg-[#333333] disabled:opacity-50'
          }`}
        >
          {saving ? 'Salvataggio...' : saved ? 'Salvato!' : 'Salva impostazioni'}
        </button>
      </div>
    </div>
  )
}
