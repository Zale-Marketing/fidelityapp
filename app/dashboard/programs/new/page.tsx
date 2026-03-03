'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Stamp, Star, Coins, Crown, RefreshCw, ArrowLeft, Plus, X, MapPin } from 'lucide-react'

type ProgramType = 'stamps' | 'points' | 'cashback' | 'tiers' | 'subscription'

const PROGRAM_TYPES = [
  {
    id: 'stamps' as ProgramType,
    name: 'Bollini / Timbri',
    Icon: Stamp,
    description: 'Raccogli bollini ad ogni acquisto e ottieni premi',
    example: '10 caffè = 1 gratis',
    color: '#6366f1',
    ideal: 'Bar, Pizzerie, Gelaterie'
  },
  {
    id: 'points' as ProgramType,
    name: 'Punti su Spesa',
    Icon: Star,
    description: 'Accumula punti in base a quanto spendi',
    example: '1€ = 1 punto → 100 punti = €10',
    color: '#10b981',
    ideal: 'Ristoranti, Negozi'
  },
  {
    id: 'cashback' as ProgramType,
    name: 'Cashback',
    Icon: Coins,
    description: 'Percentuale di ogni spesa torna come credito',
    example: '5% cashback su ogni acquisto',
    color: '#f59e0b',
    ideal: 'Ristoranti, Abbigliamento'
  },
  {
    id: 'tiers' as ProgramType,
    name: 'Livelli VIP',
    Icon: Crown,
    description: 'Sali di livello e sblocca vantaggi esclusivi',
    example: 'Bronze → Silver → Gold',
    color: '#8b5cf6',
    ideal: 'Ristoranti, Spa, Hotel'
  },
  {
    id: 'subscription' as ProgramType,
    name: 'Abbonamento',
    Icon: RefreshCw,
    description: 'Quota fissa per vantaggi garantiti',
    example: '€19.99/mese = 1 caffè/giorno',
    color: '#ec4899',
    ideal: 'Bar, Palestre'
  },
]

export default function NewProgramPage() {
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState<ProgramType | null>(null)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [planBlocked, setPlanBlocked] = useState(false)
  const [currentProgramCount, setCurrentProgramCount] = useState(0)

  // Form base
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Link e Google Wallet
  const [externalRewardsUrl, setExternalRewardsUrl] = useState('')
  const [termsUrl, setTermsUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [walletMessage, setWalletMessage] = useState('')

  // Bollini
  const [stampsRequired, setStampsRequired] = useState(10)
  const [rewardDescription, setRewardDescription] = useState('')
  const [intermediateRewards, setIntermediateRewards] = useState<{name: string, stamps: number}[]>([])
  const [newRewardName, setNewRewardName] = useState('')
  const [newRewardStamps, setNewRewardStamps] = useState(5)

  // Punti
  const [eurosPerPoint, setEurosPerPoint] = useState(1)
  const [pointsForReward, setPointsForReward] = useState(100)
  const [pointsRewardValue, setPointsRewardValue] = useState(10)

  // Cashback
  const [cashbackPercent, setCashbackPercent] = useState(5)
  const [minCashbackRedeem, setMinCashbackRedeem] = useState(5)

  // Tiers
  const [tiers, setTiers] = useState([
    { name: 'Bronze', minSpend: 0, discount: 0, emoji: '🥉', benefits: 'Accesso al programma fedeltà' },
    { name: 'Silver', minSpend: 200, discount: 5, emoji: '🥈', benefits: '5% sconto su tutto + regalo compleanno' },
    { name: 'Gold', minSpend: 500, discount: 10, emoji: '🥇', benefits: '10% sconto + priorità prenotazioni + eventi esclusivi' },
  ])

  // Subscription
  const [subscriptionPrice, setSubscriptionPrice] = useState(19.99)
  const [subscriptionPeriod, setSubscriptionPeriod] = useState('monthly')
  const [subscriptionBenefits, setSubscriptionBenefits] = useState('')
  const [dailyLimit, setDailyLimit] = useState(1)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('merchant_id')
      .eq('id', user.id)
      .single()

    if (profile) {
      setMerchantId(profile.merchant_id)

      const { data: merchantData } = await supabase
        .from('merchants')
        .select('plan')
        .eq('id', profile.merchant_id)
        .single()

      const { count: progCount } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', profile.merchant_id)

      const count = progCount || 0
      setCurrentProgramCount(count)

      if (merchantData?.plan !== 'PRO' && count >= 5) {
        setPlanBlocked(true)
      }
    }
  }

  function selectType(type: ProgramType) {
    setSelectedType(type)
    const typeData = PROGRAM_TYPES.find(t => t.id === type)
    setPrimaryColor(typeData?.color || '#6366f1')
    setStep(2)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !merchantId) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

    if (!allowedTypes.includes(file.type)) {
      alert('Formato non supportato. Usa PNG, JPG o WebP. I file SVG non sono supportati.')
      e.target.value = ''
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("L'immagine deve essere inferiore a 2MB")
      return
    }

    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${merchantId}/new-${Date.now()}.${fileExt}`

      const { error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        alert('Errore upload: ' + error.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      setLogoUrl(publicUrl)
      setLogoPreview(publicUrl)
    } catch (err) {
      alert('Errore durante il caricamento')
    } finally {
      setUploading(false)
    }
  }

  function removeLogo() {
    setLogoUrl('')
    setLogoPreview(null)
  }

  async function createProgram() {
    if (!merchantId || !name || !selectedType) return

    setSaving(true)

    const programData: any = {
      merchant_id: merchantId,
      name,
      description,
      program_type: selectedType,
      primary_color: primaryColor,
      secondary_color: primaryColor,
      text_color: '#ffffff',
      logo_url: logoUrl || null,
      external_rewards_url: externalRewardsUrl || null,
      terms_url: termsUrl || null,
      rules_url: termsUrl || null,
      website_url: websiteUrl || null,
      wallet_message: walletMessage || null,
      is_active: true,
      allow_multiple_redemption: true
    }

    switch (selectedType) {
      case 'stamps':
        programData.stamps_required = stampsRequired
        programData.reward_description = rewardDescription
        break

      case 'points':
        programData.points_per_euro = eurosPerPoint
        programData.stamps_required = pointsForReward
        programData.reward_description = `€${pointsRewardValue} di sconto`
        break

      case 'cashback':
        programData.cashback_percent = cashbackPercent
        programData.min_cashback_redeem = minCashbackRedeem
        programData.stamps_required = 0
        programData.reward_description = `${cashbackPercent}% cashback`
        break

      case 'tiers':
        programData.stamps_required = 0
        programData.reward_description = 'Programma VIP a livelli'
        break

      case 'subscription':
        programData.subscription_price = subscriptionPrice
        programData.subscription_period = subscriptionPeriod
        programData.subscription_benefits = subscriptionBenefits
        programData.daily_limit = dailyLimit
        programData.stamps_required = 0
        programData.reward_description = subscriptionBenefits
        break
    }

    const { data, error } = await supabase
      .from('programs')
      .insert(programData)
      .select()
      .single()

    if (error) {
      alert('Errore: ' + error.message)
      setSaving(false)
      return
    }

    if (selectedType === 'tiers' && data) {
      for (let i = 0; i < tiers.length; i++) {
        await supabase
          .from('tiers')
          .insert({
            program_id: data.id,
            merchant_id: merchantId,
            name: tiers[i].name,
            min_spend: tiers[i].minSpend,
            discount_percent: tiers[i].discount,
            badge_emoji: tiers[i].emoji,
            benefits: tiers[i].benefits,
            sort_order: i
          })
      }
    }

    if (selectedType === 'stamps' && data && intermediateRewards.length > 0) {
      for (const reward of intermediateRewards) {
        await supabase
          .from('rewards')
          .insert({
            program_id: data.id,
            merchant_id: merchantId,
            name: reward.name,
            description: reward.name,
            stamps_required: reward.stamps,
            is_active: true
          })
      }
    }

    setSaving(false)
    router.push(`/dashboard/programs/${data.id}`)
  }

  const selectedTypeData = PROGRAM_TYPES.find(t => t.id === selectedType)
  const SelectedIcon = selectedTypeData?.Icon || Stamp

  return (
    <div className="px-6 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <Link href="/dashboard/programs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3">
          <ArrowLeft size={16} />
          Tutti i Programmi
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Nuovo Programma Fedeltà</h1>
        <p className="text-sm text-gray-500 mt-1">Crea un nuovo programma per i tuoi clienti</p>
      </div>

      {/* Blocco piano FREE */}
      {planBlocked && (
        <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="w-12 h-12 bg-[#FEF3C7] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">🔒</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Limite Piano FREE raggiunto</h2>
          <p className="text-gray-600 mb-2">
            Hai già {currentProgramCount} programmi attivi. Il piano FREE include fino a 5 programmi.
          </p>
          <p className="text-gray-500 mb-6">
            Passa a <strong>PRO</strong> per creare programmi illimitati a soli €19/mese.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/dashboard/billing"
              className="bg-[#111111] text-white px-6 py-3 rounded-[8px] font-semibold text-sm hover:bg-[#333333] transition-colors"
            >
              Passa a PRO — €19/mese
            </Link>
            <Link
              href="/dashboard/programs"
              className="bg-[#F5F5F5] text-gray-700 px-6 py-3 rounded-[8px] font-semibold text-sm hover:bg-[#E8E8E8] transition-colors"
            >
              Torna ai Programmi
            </Link>
          </div>
        </div>
      )}

      {!planBlocked && <>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
            step >= 1 ? 'bg-[#111111] text-white' : 'bg-gray-200 text-gray-500'
          }`}>1</div>
          <span className="font-medium text-sm hidden sm:inline">Scegli Tipo</span>
        </div>
        <div className={`w-12 h-0.5 rounded ${step >= 2 ? 'bg-[#111111]' : 'bg-gray-200'}`} />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
            step >= 2 ? 'bg-[#111111] text-white' : 'bg-gray-200 text-gray-500'
          }`}>2</div>
          <span className="font-medium text-sm hidden sm:inline">Configura</span>
        </div>
      </div>

      {/* STEP 1: Choose Type */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold text-center mb-1">Che tipo di programma vuoi?</h2>
          <p className="text-gray-500 text-center text-sm mb-6">Scegli la meccanica più adatta alla tua attività</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROGRAM_TYPES.map((type) => {
              const TypeIcon = type.Icon
              return (
                <button
                  key={type.id}
                  onClick={() => selectType(type.id)}
                  className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 text-left hover:border-[#111111] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                >
                  <div
                    className="w-12 h-12 rounded-[8px] flex items-center justify-center mb-4"
                    style={{ backgroundColor: type.color + '20' }}
                  >
                    <TypeIcon size={22} style={{ color: type.color }} />
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">{type.name}</h3>
                  <p className="text-gray-500 text-sm mb-3">{type.description}</p>

                  <div
                    className="inline-block px-2.5 py-1 rounded-full text-xs font-medium mb-2"
                    style={{ backgroundColor: type.color + '15', color: type.color }}
                  >
                    {type.example}
                  </div>

                  <p className="text-gray-400 text-xs flex items-center gap-1">
                    <MapPin size={10} />
                    {type.ideal}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* STEP 2: Configure */}
      {step === 2 && selectedType && selectedTypeData && (
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Form - 3 columns */}
          <div className="lg:col-span-3 space-y-4">

            {/* Type Header */}
            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-[8px] flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: selectedTypeData.color + '20' }}
                >
                  <SelectedIcon size={22} style={{ color: selectedTypeData.color }} />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900">{selectedTypeData.name}</h2>
                  <p className="text-gray-500 text-sm">{selectedTypeData.description}</p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap"
                >
                  Cambia tipo
                </button>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[12px] p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#F59E0B] flex items-center justify-center mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="font-medium text-[#92400E] text-sm">Scegli bene prima di procedere</p>
                  <p className="text-[#B45309] text-sm mt-1">
                    Dopo la creazione <strong>non potrai modificare</strong> nome, logo e colori. Potrai sempre modificare soglie, premi, percentuali e link.
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h3 className="font-semibold text-gray-900 mb-4">Informazioni Base</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nome Programma <span className="text-[#F59E0B] text-xs font-normal">(non modificabile dopo)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                    placeholder="es. Carta Fedeltà Bar Roma"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Descrizione (opzionale)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                    rows={2}
                    placeholder="Una breve descrizione del programma..."
                  />
                </div>
              </div>
            </div>

            {/* Type-Specific Config */}
            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h3 className="font-semibold text-gray-900 mb-4">Configurazione {selectedTypeData.name}</h3>

              {/* BOLLINI */}
              {selectedType === 'stamps' && (
                <div className="space-y-5">
                  {/* Premio Finale */}
                  <div className="bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] p-4">
                    <h4 className="font-medium text-gray-900 mb-3 text-sm">Premio Finale</h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Quanti bollini per il premio finale?
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="5"
                            max="30"
                            value={stampsRequired}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value)
                              setStampsRequired(newValue)
                              setIntermediateRewards(prev => prev.filter(r => r.stamps < newValue))
                            }}
                            className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#111111]"
                          />
                          <div className="w-16 text-center">
                            <span className="text-2xl font-bold text-gray-900">{stampsRequired}</span>
                            <p className="text-xs text-gray-400">bollini</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Qual è il premio finale?
                        </label>
                        <input
                          type="text"
                          value={rewardDescription}
                          onChange={(e) => setRewardDescription(e.target.value)}
                          className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                          placeholder="es. Colazione Completa Gratis"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Premi Intermedi */}
                  <div className="border border-[#E0E0E0] rounded-[8px] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Premi Intermedi</h4>
                        <p className="text-xs text-gray-500">Opzionali - incentivano il cliente durante il percorso</p>
                      </div>
                      {intermediateRewards.length > 0 && (
                        <span className="bg-[#DCFCE7] text-[#16A34A] px-2 py-0.5 rounded-full text-xs font-medium">
                          {intermediateRewards.length} premi
                        </span>
                      )}
                    </div>

                    {intermediateRewards.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {intermediateRewards
                          .sort((a, b) => a.stamps - b.stamps)
                          .map((reward, index) => (
                            <div key={index} className="flex items-center gap-3 p-2.5 bg-[#F9F9F9] rounded-[8px]">
                              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 text-sm">
                                {reward.stamps}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{reward.name}</p>
                                <p className="text-xs text-gray-500">A {reward.stamps} bollini</p>
                              </div>
                              <button
                                onClick={() => setIntermediateRewards(prev => prev.filter((_, i) => i !== index))}
                                className="text-gray-400 hover:text-[#DC2626] p-1 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}

                    <div className="border border-dashed border-[#E0E0E0] rounded-[8px] p-3">
                      <p className="text-xs font-medium text-gray-600 mb-2">Aggiungi premio intermedio</p>

                      <div className="flex gap-2">
                        <div className="w-20">
                          <label className="block text-xs text-gray-500 mb-1">Bollini</label>
                          <select
                            value={newRewardStamps}
                            onChange={(e) => setNewRewardStamps(parseInt(e.target.value))}
                            className="w-full px-2 py-2 border border-[#E0E0E0] rounded-[8px] text-sm text-center font-bold focus:border-[#111111] focus:outline-none"
                          >
                            {Array.from({ length: stampsRequired - 1 }, (_, i) => i + 1)
                              .filter(n => !intermediateRewards.some(r => r.stamps === n))
                              .map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                          </select>
                        </div>

                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Nome Premio</label>
                          <input
                            type="text"
                            value={newRewardName}
                            onChange={(e) => setNewRewardName(e.target.value)}
                            className="w-full px-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                            placeholder="es. Caffè Gratis"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={() => {
                              if (!newRewardName.trim()) { alert('Inserisci un nome per il premio'); return }
                              if (intermediateRewards.some(r => r.stamps === newRewardStamps)) { alert('Esiste già un premio a questa soglia!'); return }
                              if (newRewardStamps >= stampsRequired) { alert('I premi intermedi devono essere PRIMA del premio finale!'); return }
                              setIntermediateRewards(prev => [...prev, { name: newRewardName, stamps: newRewardStamps }])
                              setNewRewardName('')
                              const usedStamps = [...intermediateRewards.map(r => r.stamps), newRewardStamps]
                              const nextAvailable = Array.from({ length: stampsRequired - 1 }, (_, i) => i + 1).find(n => !usedStamps.includes(n))
                              if (nextAvailable) setNewRewardStamps(nextAvailable)
                            }}
                            disabled={!newRewardName.trim() || intermediateRewards.length >= stampsRequired - 1}
                            className="px-3 py-2 bg-[#111111] text-white rounded-[8px] text-sm hover:bg-[#333333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {(intermediateRewards.length > 0 || rewardDescription) && (
                      <div className="mt-3 bg-[#F9F9F9] rounded-[8px] p-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Percorso premi del cliente:</p>
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">0</span>
                          {intermediateRewards.sort((a, b) => a.stamps - b.stamps).map((reward, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-gray-400">→</span>
                              <span className="bg-[#DCFCE7] text-[#16A34A] px-2 py-0.5 rounded-full font-medium">{reward.stamps} = {reward.name}</span>
                            </div>
                          ))}
                          {rewardDescription && (
                            <>
                              <span className="text-gray-400">→</span>
                              <span className="bg-[#111111] text-white px-2 py-0.5 rounded-full font-medium">{stampsRequired} = {rewardDescription}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] p-3">
                    <p className="text-sm text-gray-600">
                      <strong>Tip:</strong> I premi intermedi mantengono alta la motivazione del cliente. Un caffè gratis a 5 bollini fa tornare il cliente più spesso!
                    </p>
                  </div>
                </div>
              )}

              {/* PUNTI */}
              {selectedType === 'points' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Ogni quanti € spesi il cliente guadagna 1 punto?
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-sm">Ogni</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={eurosPerPoint}
                          onChange={(e) => setEurosPerPoint(parseInt(e.target.value) || 1)}
                          className="w-24 pl-7 pr-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm text-center font-bold focus:border-[#111111] focus:outline-none"
                        />
                      </div>
                      <span className="text-gray-500 text-sm">= 1 punto</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Punti per il premio</label>
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={pointsForReward}
                        onChange={(e) => setPointsForReward(parseInt(e.target.value) || 100)}
                        className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm text-center font-bold focus:border-[#111111] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Valore premio (€)</label>
                      <input
                        type="number"
                        min="1"
                        value={pointsRewardValue}
                        onChange={(e) => setPointsRewardValue(parseInt(e.target.value) || 10)}
                        className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm text-center font-bold focus:border-[#111111] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] p-3 text-sm text-gray-600">
                    <strong>Esempio:</strong> Cliente spende €{eurosPerPoint * 50} → Guadagna 50 punti → A {pointsForReward} punti ottiene €{pointsRewardValue} di sconto
                  </div>
                </div>
              )}

              {/* CASHBACK */}
              {selectedType === 'cashback' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Percentuale di cashback</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={cashbackPercent}
                        onChange={(e) => setCashbackPercent(parseInt(e.target.value))}
                        className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#111111]"
                      />
                      <div className="w-16 text-center">
                        <span className="text-2xl font-bold text-gray-900">{cashbackPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Minimo per riscattare il credito (€)</label>
                    <input
                      type="number"
                      min="1"
                      value={minCashbackRedeem}
                      onChange={(e) => setMinCashbackRedeem(parseFloat(e.target.value) || 5)}
                      className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                    />
                  </div>

                  <div className="bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] p-3 text-sm text-gray-600">
                    <strong>Esempio:</strong> Cliente spende €100 → Riceve €{(100 * cashbackPercent / 100).toFixed(2)} di credito → Usabile da €{minCashbackRedeem}
                  </div>
                </div>
              )}

              {/* TIERS */}
              {selectedType === 'tiers' && (
                <div className="space-y-4">
                  <div className="bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] p-3 text-sm text-gray-600">
                    I clienti salgono automaticamente di livello in base a quanto spendono. Ogni livello sblocca vantaggi esclusivi.
                  </div>

                  <div className="space-y-3">
                    {tiers.map((tier, i) => (
                      <div key={i} className="border border-[#E0E0E0] rounded-[8px] p-4 hover:border-gray-400 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <select
                            value={tier.emoji}
                            onChange={(e) => {
                              const newTiers = [...tiers]
                              newTiers[i].emoji = e.target.value
                              setTiers(newTiers)
                            }}
                            className="w-14 text-xl bg-[#F9F9F9] border border-[#E0E0E0] rounded-[8px] p-1.5 cursor-pointer focus:border-[#111111] focus:outline-none"
                          >
                            <option value="🥉">🥉</option>
                            <option value="🥈">🥈</option>
                            <option value="🥇">🥇</option>
                            <option value="💎">💎</option>
                            <option value="👑">👑</option>
                            <option value="⭐">⭐</option>
                            <option value="🌟">🌟</option>
                          </select>

                          <input
                            type="text"
                            value={tier.name}
                            onChange={(e) => {
                              const newTiers = [...tiers]
                              newTiers[i].name = e.target.value
                              setTiers(newTiers)
                            }}
                            className="flex-1 px-3 py-2 border border-[#E0E0E0] rounded-[8px] font-semibold text-sm focus:border-[#111111] focus:outline-none"
                            placeholder="Nome livello"
                          />

                          {tiers.length > 2 && (
                            <button
                              onClick={() => setTiers(tiers.filter((_, idx) => idx !== i))}
                              className="text-gray-400 hover:text-[#DC2626] transition-colors"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Spesa minima (€)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">€</span>
                              <input
                                type="number"
                                value={tier.minSpend}
                                onChange={(e) => {
                                  const newTiers = [...tiers]
                                  newTiers[i].minSpend = parseInt(e.target.value) || 0
                                  setTiers(newTiers)
                                }}
                                className="w-full pl-7 pr-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                                placeholder="0"
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {tier.minSpend === 0 ? 'Livello iniziale' : `Dopo €${tier.minSpend} di spesa`}
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Sconto permanente</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={tier.discount}
                                onChange={(e) => {
                                  const newTiers = [...tiers]
                                  newTiers[i].discount = parseInt(e.target.value) || 0
                                  setTiers(newTiers)
                                }}
                                className="w-full pr-7 pl-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                                placeholder="0"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">%</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {tier.discount === 0 ? 'Nessuno sconto' : `${tier.discount}% su ogni acquisto`}
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Vantaggi di questo livello</label>
                          <textarea
                            value={tier.benefits}
                            onChange={(e) => {
                              const newTiers = [...tiers]
                              newTiers[i].benefits = e.target.value
                              setTiers(newTiers)
                            }}
                            className="w-full px-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                            rows={2}
                            placeholder="es. 5% sconto, regalo compleanno, accesso anticipato promozioni..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setTiers([...tiers, {
                      name: `Livello ${tiers.length + 1}`,
                      minSpend: (tiers[tiers.length - 1]?.minSpend || 0) + 300,
                      discount: (tiers[tiers.length - 1]?.discount || 0) + 5,
                      emoji: '💎',
                      benefits: ''
                    }])}
                    className="w-full py-2.5 border border-dashed border-[#E0E0E0] rounded-[8px] text-gray-600 hover:border-[#111111] hover:text-gray-900 transition-colors text-sm font-medium"
                  >
                    + Aggiungi Livello
                  </button>

                  <div className="bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Riepilogo programma:</p>
                    <div className="space-y-1.5">
                      {tiers.map((tier, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span>{tier.emoji}</span>
                          <span className="font-medium">{tier.name}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-600">{tier.minSpend === 0 ? 'Inizio' : `da €${tier.minSpend}`}</span>
                          {tier.discount > 0 && (
                            <span className="bg-[#DCFCE7] text-[#16A34A] px-1.5 py-0.5 rounded text-xs">{tier.discount}% sconto</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBSCRIPTION */}
              {selectedType === 'subscription' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Prezzo Abbonamento</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">€</span>
                        <input
                          type="number"
                          step="0.01"
                          value={subscriptionPrice}
                          onChange={(e) => setSubscriptionPrice(parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm font-bold focus:border-[#111111] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Periodo</label>
                      <select
                        value={subscriptionPeriod}
                        onChange={(e) => setSubscriptionPeriod(e.target.value)}
                        className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                      >
                        <option value="weekly">Settimanale</option>
                        <option value="monthly">Mensile</option>
                        <option value="yearly">Annuale</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Limite giornaliero (utilizzi al giorno inclusi)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Cosa include l&apos;abbonamento?
                    </label>
                    <textarea
                      value={subscriptionBenefits}
                      onChange={(e) => setSubscriptionBenefits(e.target.value)}
                      className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                      rows={3}
                      placeholder="es. 1 caffè gratis al giorno&#10;10% di sconto su tutto&#10;Accesso prioritario"
                    />
                  </div>

                  <div className="bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] p-3 text-sm text-gray-600">
                    <strong>Esempio:</strong> €{subscriptionPrice}/{subscriptionPeriod === 'weekly' ? 'settimana' : subscriptionPeriod === 'monthly' ? 'mese' : 'anno'} → {dailyLimit} utilizzo/i al giorno inclusi
                  </div>
                </div>
              )}
            </div>

            {/* Logo Upload */}
            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h3 className="font-semibold text-gray-900 mb-1">
                Logo Aziendale <span className="text-[#F59E0B] text-xs font-normal">(non modificabile dopo)</span>
              </h3>
              <p className="text-sm text-gray-500 mb-4">Scegli con cura: non potrai cambiarlo dopo la creazione</p>

              <div className="flex items-start gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-20 h-20 object-contain bg-[#F9F9F9] rounded-[8px]"
                    />
                    <button
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 bg-[#DC2626] text-white w-5 h-5 rounded-full text-xs hover:bg-red-700 flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed border-[#E0E0E0] rounded-[8px] flex items-center justify-center text-gray-400">
                    <span className="text-2xl">+</span>
                  </div>
                )}

                <div className="flex-1">
                  <label className="block">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-[8px] file:border-0
                        file:text-sm file:font-medium
                        file:bg-[#F5F5F5] file:text-gray-700
                        hover:file:bg-[#E8E8E8]
                        disabled:opacity-50"
                    />
                  </label>
                  {uploading && (
                    <p className="text-sm text-gray-600 mt-2">Caricamento in corso...</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Solo PNG, JPG, WebP · Max 2MB · No SVG</p>
                </div>
              </div>
            </div>

            {/* Color Picker */}
            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h3 className="font-semibold text-gray-900 mb-1">
                Colore del Programma <span className="text-[#F59E0B] text-xs font-normal">(non modificabile dopo)</span>
              </h3>
              <p className="text-sm text-gray-500 mb-4">Scegli con cura: non potrai cambiarlo dopo la creazione</p>

              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded-[8px] cursor-pointer border border-[#E0E0E0]"
                />
                <div className="flex gap-2 flex-wrap">
                  {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#1e293b'].map(c => (
                    <button
                      key={c}
                      onClick={() => setPrimaryColor(c)}
                      className={`w-9 h-9 rounded-[8px] transition-transform hover:scale-110 ${primaryColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Link e Google Wallet */}
            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h3 className="font-semibold text-gray-900 mb-1">Link e Google Wallet</h3>
              <p className="text-sm text-gray-500 mb-4">
                Questi link appariranno nel retro della carta Google Wallet dei tuoi clienti
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Link Catalogo Premi</label>
                  <input
                    type="url"
                    value={externalRewardsUrl}
                    onChange={(e) => setExternalRewardsUrl(e.target.value)}
                    className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                    placeholder="https://tuosito.com/premi"
                  />
                  <p className="text-xs text-gray-400 mt-1">Mostrato come &quot;Catalogo Premi&quot; nel Wallet</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Link Regolamento</label>
                  <input
                    type="url"
                    value={termsUrl}
                    onChange={(e) => setTermsUrl(e.target.value)}
                    className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                    placeholder="https://tuosito.com/regolamento"
                  />
                  <p className="text-xs text-gray-400 mt-1">Mostrato come &quot;Regolamento&quot; nel Wallet</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sito Web Attività</label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                    placeholder="https://tuosito.com"
                  />
                  <p className="text-xs text-gray-400 mt-1">Mostrato come &quot;Sito Web&quot; nel Wallet</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Messaggio Personalizzato</label>
                  <textarea
                    value={walletMessage}
                    onChange={(e) => setWalletMessage(e.target.value)}
                    className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                    rows={2}
                    placeholder="es. Grazie per essere nostro cliente! Presenta la carta ad ogni acquisto."
                  />
                  <p className="text-xs text-gray-400 mt-1">Appare come messaggio nella carta</p>
                </div>

                <div className="bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] p-3">
                  <p className="font-medium text-gray-700 text-sm mb-1">Come appariranno i link</p>
                  <ul className="text-xs text-gray-500 space-y-0.5">
                    <li>• <strong>Catalogo Premi</strong> → link al tuo catalogo</li>
                    <li>• <strong>Regolamento</strong> → link alle regole</li>
                    <li>• <strong>Sito Web</strong> → link al tuo sito</li>
                    <li>• <strong>Zale Marketing</strong> → sempre presente in fondo</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 border border-[#E0E0E0] rounded-[8px] text-sm font-medium text-gray-700 hover:bg-[#F5F5F5] transition-colors"
              >
                Indietro
              </button>
              <button
                onClick={createProgram}
                disabled={saving || !name}
                className="flex-1 bg-[#111111] text-white px-6 py-3 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creazione in corso...' : 'Crea Programma'}
              </button>
            </div>
          </div>

          {/* Preview - 2 columns */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6">
              <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <h3 className="font-semibold text-gray-900 mb-4 text-center">Anteprima</h3>

                <div className="bg-gray-900 rounded-[2.5rem] p-3 max-w-[260px] mx-auto">
                  <div className="bg-gray-800 rounded-[2rem] overflow-hidden">

                    <div
                      className="p-5"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo"
                            className="w-10 h-10 object-contain rounded-[8px] bg-white/20 p-1"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-[8px] bg-white/20 flex items-center justify-center">
                            <SelectedIcon size={18} className="text-white" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-white text-sm leading-tight">
                            {name || 'Nome Programma'}
                          </h3>
                          <p className="text-white/60 text-xs">{selectedTypeData.name}</p>
                        </div>
                      </div>

                      <div className="bg-white/15 rounded-[8px] p-4 mb-4">
                        {selectedType === 'stamps' && (
                          <>
                            <div className="flex justify-center gap-1.5 flex-wrap mb-3">
                              {Array.from({ length: Math.min(stampsRequired, 8) }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    i < 4 ? 'bg-white' : 'bg-white/30'
                                  }`}
                                  style={{ color: i < 4 ? primaryColor : 'transparent' }}
                                >
                                  {i < 4 ? <div className="w-2 h-2 rounded-full bg-current" style={{backgroundColor: primaryColor}} /> : null}
                                </div>
                              ))}
                            </div>
                            <p className="text-center text-white text-xs">4/{stampsRequired} bollini</p>
                            {rewardDescription && (
                              <p className="text-center text-white/70 text-xs mt-1">{rewardDescription}</p>
                            )}
                          </>
                        )}

                        {selectedType === 'points' && (
                          <div className="text-center">
                            <p className="text-white/60 text-xs mb-1">I TUOI PUNTI</p>
                            <p className="text-3xl font-bold text-white">50</p>
                            <div className="mt-2 h-1.5 bg-white/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-white rounded-full"
                                style={{ width: `${Math.min((50 / pointsForReward) * 100, 100)}%` }}
                              />
                            </div>
                            <p className="text-white/70 text-xs mt-1">
                              50/{pointsForReward} punti
                            </p>
                          </div>
                        )}

                        {selectedType === 'cashback' && (
                          <div className="text-center">
                            <p className="text-white/60 text-xs mb-1">IL TUO CREDITO</p>
                            <p className="text-3xl font-bold text-white">€12.50</p>
                            <p className="text-white/70 text-xs mt-1">+{cashbackPercent}% su ogni acquisto</p>
                          </div>
                        )}

                        {selectedType === 'tiers' && (
                          <div className="text-center">
                            <p className="text-white/60 text-xs mb-2">IL TUO LIVELLO</p>
                            <div className="flex justify-center items-end gap-2 mb-1">
                              {tiers.slice(0, 3).map((tier, i) => (
                                <div
                                  key={i}
                                  className={`text-center transition-all ${i === 1 ? 'scale-125 opacity-100' : 'scale-90 opacity-50'}`}
                                >
                                  <p className="text-xl">{tier.emoji}</p>
                                  <p className="text-white text-xs font-medium">{tier.name}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedType === 'subscription' && (
                          <div className="text-center">
                            <p className="text-white/60 text-xs mb-1">ABBONAMENTO ATTIVO</p>
                            <p className="text-xl font-bold text-white">
                              €{subscriptionPrice}
                              <span className="text-sm font-normal text-white/60">
                                /{subscriptionPeriod === 'weekly' ? 'sett' : subscriptionPeriod === 'monthly' ? 'mese' : 'anno'}
                              </span>
                            </p>
                            <div className="mt-2 bg-white/20 rounded-[8px] py-1.5 text-white text-xs">
                              {dailyLimit - 1}/{dailyLimit} utilizzi oggi
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-[8px] p-3 text-center">
                        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-[8px] flex items-center justify-center mb-1">
                          <div className="w-10 h-10 bg-gray-300 rounded-sm" />
                        </div>
                        <p className="text-xs text-gray-400">Scansiona</p>
                      </div>

                      {(externalRewardsUrl || termsUrl || websiteUrl) && (
                        <div className="flex justify-center gap-3 mt-3 text-xs text-white/70 flex-wrap">
                          {externalRewardsUrl && <span className="underline">Premi</span>}
                          {termsUrl && <span className="underline">Regolamento</span>}
                          {websiteUrl && <span className="underline">Sito</span>}
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-100 py-2 text-center">
                      <p className="text-xs text-gray-400">
                        Powered by <span className="font-medium">Zale Marketing</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </> /* end !planBlocked */}
    </div>
  )
}
