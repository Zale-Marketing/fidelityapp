'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ProgramType = 'stamps' | 'points' | 'cashback' | 'tiers' | 'subscription' | 'missions'

const PROGRAM_TYPES = [
  {
    id: 'stamps' as ProgramType,
    name: 'Bollini / Timbri',
    icon: '🎫',
    description: 'Raccogli bollini ad ogni acquisto e ottieni premi',
    example: '10 caffè = 1 gratis',
    color: '#6366f1',
    ideal: 'Bar, Pizzerie, Gelaterie'
  },
  {
    id: 'points' as ProgramType,
    name: 'Punti su Spesa',
    icon: '⭐',
    description: 'Accumula punti in base a quanto spendi',
    example: '1€ = 1 punto → 100 punti = €10',
    color: '#10b981',
    ideal: 'Ristoranti, Negozi'
  },
  {
    id: 'cashback' as ProgramType,
    name: 'Cashback',
    icon: '💰',
    description: 'Percentuale di ogni spesa torna come credito',
    example: '5% cashback su ogni acquisto',
    color: '#f59e0b',
    ideal: 'Ristoranti, Abbigliamento'
  },
  {
    id: 'tiers' as ProgramType,
    name: 'Livelli VIP',
    icon: '👑',
    description: 'Sali di livello e sblocca vantaggi esclusivi',
    example: 'Bronze → Silver → Gold',
    color: '#8b5cf6',
    ideal: 'Ristoranti, Spa, Hotel'
  },
  {
    id: 'subscription' as ProgramType,
    name: 'Abbonamento',
    icon: '🔄',
    description: 'Quota fissa per vantaggi garantiti',
    example: '€19.99/mese = 1 caffè/giorno',
    color: '#ec4899',
    ideal: 'Bar, Palestre'
  },
  {
    id: 'missions' as ProgramType,
    name: 'Missioni',
    icon: '🎮',
    description: 'Sfide temporanee con bonus extra',
    example: '3 visite questa settimana = +5 punti',
    color: '#06b6d4',
    ideal: 'Add-on per altri tipi'
  }
]

export default function NewProgramPage() {
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState<ProgramType | null>(null)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form base
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  
  // Link e Google Wallet (UNIFICATI)
  const [externalRewardsUrl, setExternalRewardsUrl] = useState('')
  const [termsUrl, setTermsUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [walletMessage, setWalletMessage] = useState('')
  
  // Bollini
  const [stampsRequired, setStampsRequired] = useState(10)
  const [rewardDescription, setRewardDescription] = useState('')
  
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

    // ⛔ BLOCCA SVG - Google Wallet NON lo supporta!
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    
    if (!allowedTypes.includes(file.type)) {
      alert('❌ Formato non supportato!\n\nGoogle Wallet accetta solo:\n• PNG\n• JPG/JPEG\n• WebP\n\n⚠️ I file SVG NON sono supportati.')
      e.target.value = ''
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('L\'immagine deve essere inferiore a 2MB')
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

    // Dati base del programma
    const programData: any = {
      merchant_id: merchantId,
      name,
      description,
      program_type: selectedType,
      primary_color: primaryColor,
      secondary_color: primaryColor,
      text_color: '#ffffff',
      logo_url: logoUrl || null,
      // Link e Google Wallet
      external_rewards_url: externalRewardsUrl || null,
      terms_url: termsUrl || null,
      rules_url: termsUrl || null, // Mantieni sincronizzato
      website_url: websiteUrl || null,
      wallet_message: walletMessage || null,
      is_active: true,
      allow_multiple_redemption: true
    }

    // Campi specifici per tipo
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
        
      case 'missions':
        programData.stamps_required = 0
        programData.reward_description = 'Sistema missioni'
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

    // Se è un programma Tiers, crea i livelli
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

    setSaving(false)
    router.push(`/dashboard/programs/${data.id}`)
  }

  const selectedTypeData = PROGRAM_TYPES.find(t => t.id === selectedType)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/dashboard/programs" className="text-indigo-600 hover:underline text-sm">
            ← Tutti i Programmi
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">➕ Nuovo Programma Fedeltà</h1>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        
        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
              step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}>1</div>
            <span className="font-medium hidden sm:inline">Scegli Tipo</span>
          </div>
          <div className={`w-16 h-1 rounded ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
              step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}>2</div>
            <span className="font-medium hidden sm:inline">Configura</span>
          </div>
        </div>

        {/* STEP 1: Choose Type */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-2">Che tipo di programma vuoi?</h2>
            <p className="text-gray-500 text-center mb-8">Scegli la meccanica più adatta alla tua attività</p>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PROGRAM_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => selectType(type.id)}
                  className="bg-white rounded-2xl p-6 text-left hover:shadow-xl transition-all border-2 border-transparent hover:border-indigo-300 group relative overflow-hidden"
                >
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
                    style={{ backgroundColor: type.color }}
                  />
                  
                  <div className="relative">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                      style={{ backgroundColor: type.color + '20' }}
                    >
                      {type.icon}
                    </div>
                    
                    <h3 className="font-bold text-lg mb-1 group-hover:text-indigo-600 transition-colors">
                      {type.name}
                    </h3>
                    <p className="text-gray-500 text-sm mb-3">{type.description}</p>
                    
                    <div 
                      className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                      style={{ backgroundColor: type.color + '20', color: type.color }}
                    >
                      {type.example}
                    </div>
                    
                    <p className="text-gray-400 text-xs mt-3">📍 Ideale per: {type.ideal}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Configure */}
        {step === 2 && selectedType && (
          <div className="grid lg:grid-cols-5 gap-6">
            
            {/* Form - 3 columns */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Type Header */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ backgroundColor: selectedTypeData?.color + '20' }}
                  >
                    {selectedTypeData?.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold text-xl">{selectedTypeData?.name}</h2>
                    <p className="text-gray-500">{selectedTypeData?.description}</p>
                  </div>
                  <button 
                    onClick={() => setStep(1)}
                    className="text-indigo-600 hover:underline text-sm whitespace-nowrap"
                  >
                    ← Cambia tipo
                  </button>
                </div>
              </div>

              {/* ⚠️ DISCLAIMER IMPORTANTE */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-bold text-amber-900">Importante: scegli bene!</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Dopo la creazione <strong>NON potrai modificare</strong>: nome programma, logo e colori.
                      Questi elementi sono permanenti per garantire continuità ai tuoi clienti.
                    </p>
                    <p className="text-sm text-amber-700 mt-2">
                      ✅ Potrai sempre modificare: soglie, premi, percentuali, link e messaggi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-lg mb-4">📝 Informazioni Base</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Programma * <span className="text-amber-600 text-xs">(non modificabile dopo)</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="es. Carta Fedeltà Bar Roma"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrizione (opzionale)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      rows={2}
                      placeholder="Una breve descrizione del programma..."
                    />
                  </div>
                </div>
              </div>

              {/* Type-Specific Config */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-lg mb-4">⚙️ Configurazione {selectedTypeData?.name}</h3>

                {/* BOLLINI */}
                {selectedType === 'stamps' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quanti bollini per ottenere il premio?
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="5"
                          max="30"
                          value={stampsRequired}
                          onChange={(e) => setStampsRequired(parseInt(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="w-20 text-center">
                          <span className="text-3xl font-bold text-indigo-600">{stampsRequired}</span>
                          <p className="text-xs text-gray-400">bollini</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Qual è il premio finale?
                      </label>
                      <input
                        type="text"
                        value={rewardDescription}
                        onChange={(e) => setRewardDescription(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="es. Caffè Gratis, Pizza Omaggio, Sconto 50%..."
                      />
                    </div>
                    
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-sm text-indigo-700">
                        💡 <strong>Tip:</strong> Dopo la creazione potrai aggiungere premi intermedi 
                        (es. a 5 bollini = caffè, a 10 = cornetto, a 20 = colazione)
                      </p>
                    </div>
                  </div>
                )}

                {/* PUNTI */}
                {selectedType === 'points' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ogni quanti € spesi il cliente guadagna 1 punto?
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">Ogni</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={eurosPerPoint}
                            onChange={(e) => setEurosPerPoint(parseInt(e.target.value) || 1)}
                            className="w-24 pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl text-center text-xl font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                        <span className="text-gray-500">= 1 punto</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Punti per ottenere il premio
                        </label>
                        <input
                          type="number"
                          min="5"
                          step="5"
                          value={pointsForReward}
                          onChange={(e) => setPointsForReward(parseInt(e.target.value) || 100)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-xl font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Valore premio (€)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={pointsRewardValue}
                          onChange={(e) => setPointsRewardValue(parseInt(e.target.value) || 10)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-xl font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-sm text-green-700">
                        📊 <strong>Esempio:</strong> Cliente spende €{eurosPerPoint * 50} → Guadagna {50} punti → 
                        A {pointsForReward} punti ottiene €{pointsRewardValue} di sconto
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        💡 Il cliente deve spendere €{eurosPerPoint * pointsForReward} per ottenere il premio
                      </p>
                    </div>
                  </div>
                )}

                {/* CASHBACK */}
                {selectedType === 'cashback' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Percentuale di cashback
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={cashbackPercent}
                          onChange={(e) => setCashbackPercent(parseInt(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="w-24 text-center">
                          <span className="text-4xl font-bold text-amber-600">{cashbackPercent}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimo per riscattare il credito (€)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={minCashbackRedeem}
                        onChange={(e) => setMinCashbackRedeem(parseFloat(e.target.value) || 5)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    
                    <div className="bg-amber-50 rounded-xl p-4">
                      <p className="text-sm text-amber-700">
                        💰 <strong>Esempio:</strong> Cliente spende €100 → Riceve €{(100 * cashbackPercent / 100).toFixed(2)} di credito → 
                        Può usarlo quando ha almeno €{minCashbackRedeem}
                      </p>
                    </div>
                  </div>
                )}

                {/* TIERS */}
                {selectedType === 'tiers' && (
                  <div className="space-y-4">
                    <div className="bg-purple-50 rounded-xl p-4 mb-4">
                      <p className="text-sm text-purple-800">
                        <strong>👑 Come funziona:</strong> I clienti salgono automaticamente di livello in base a quanto spendono 
                        nel tempo. Ogni livello sblocca vantaggi esclusivi che incentivano a tornare.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      {tiers.map((tier, i) => (
                        <div key={i} className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
                          <div className="flex items-center gap-3 mb-3">
                            <select
                              value={tier.emoji}
                              onChange={(e) => {
                                const newTiers = [...tiers]
                                newTiers[i].emoji = e.target.value
                                setTiers(newTiers)
                              }}
                              className="w-16 text-2xl bg-purple-50 border-2 border-purple-200 rounded-lg p-2 cursor-pointer"
                            >
                              <option value="🥉">🥉</option>
                              <option value="🥈">🥈</option>
                              <option value="🥇">🥇</option>
                              <option value="💎">💎</option>
                              <option value="👑">👑</option>
                              <option value="⭐">⭐</option>
                              <option value="🌟">🌟</option>
                              <option value="💜">💜</option>
                            </select>
                            
                            <input
                              type="text"
                              value={tier.name}
                              onChange={(e) => {
                                const newTiers = [...tiers]
                                newTiers[i].name = e.target.value
                                setTiers(newTiers)
                              }}
                              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg font-bold text-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
                              placeholder="Nome livello"
                            />
                            
                            {tiers.length > 2 && (
                              <button
                                onClick={() => setTiers(tiers.filter((_, idx) => idx !== i))}
                                className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                📊 Spesa minima per raggiungere
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
                                <input
                                  type="number"
                                  value={tier.minSpend}
                                  onChange={(e) => {
                                    const newTiers = [...tiers]
                                    newTiers[i].minSpend = parseInt(e.target.value) || 0
                                    setTiers(newTiers)
                                  }}
                                  className="w-full pl-8 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400"
                                  placeholder="0"
                                />
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {tier.minSpend === 0 ? 'Livello iniziale' : `Dopo €${tier.minSpend} di spesa totale`}
                              </p>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                🏷️ Sconto permanente
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={tier.discount}
                                  onChange={(e) => {
                                    const newTiers = [...tiers]
                                    newTiers[i].discount = parseInt(e.target.value) || 0
                                    setTiers(newTiers)
                                  }}
                                  className="w-full pr-8 pl-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400"
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {tier.discount === 0 ? 'Nessuno sconto' : `${tier.discount}% su ogni acquisto`}
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              🎁 Vantaggi di questo livello
                            </label>
                            <textarea
                              value={tier.benefits}
                              onChange={(e) => {
                                const newTiers = [...tiers]
                                newTiers[i].benefits = e.target.value
                                setTiers(newTiers)
                              }}
                              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400 text-sm"
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
                      className="w-full py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 hover:border-purple-500 hover:bg-purple-50 transition-colors font-medium"
                    >
                      + Aggiungi Livello
                    </button>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">📋 Riepilogo del tuo programma:</p>
                      <div className="space-y-2">
                        {tiers.map((tier, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span>{tier.emoji}</span>
                            <span className="font-medium">{tier.name}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-gray-600">
                              {tier.minSpend === 0 ? 'Inizio' : `da €${tier.minSpend}`}
                            </span>
                            {tier.discount > 0 && (
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                                {tier.discount}% sconto
                              </span>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prezzo Abbonamento
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
                          <input
                            type="number"
                            step="0.01"
                            value={subscriptionPrice}
                            onChange={(e) => setSubscriptionPrice(parseFloat(e.target.value) || 0)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-xl font-bold focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Periodo
                        </label>
                        <select
                          value={subscriptionPeriod}
                          onChange={(e) => setSubscriptionPeriod(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="weekly">Settimanale</option>
                          <option value="monthly">Mensile</option>
                          <option value="yearly">Annuale</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Limite giornaliero (quante volte può usare l&apos;abbonamento al giorno)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cosa include l&apos;abbonamento?
                      </label>
                      <textarea
                        value={subscriptionBenefits}
                        onChange={(e) => setSubscriptionBenefits(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        rows={3}
                        placeholder="es. 1 caffè gratis al giorno&#10;10% di sconto su tutto&#10;Accesso prioritario"
                      />
                    </div>
                    
                    <div className="bg-pink-50 rounded-xl p-4">
                      <p className="text-sm text-pink-700">
                        🔄 <strong>Esempio:</strong> €{subscriptionPrice}/{subscriptionPeriod === 'weekly' ? 'settimana' : subscriptionPeriod === 'monthly' ? 'mese' : 'anno'} → 
                        {dailyLimit} utilizzo/i al giorno
                      </p>
                    </div>
                  </div>
                )}

                {/* MISSIONS */}
                {selectedType === 'missions' && (
                  <div className="bg-cyan-50 rounded-xl p-6 text-center">
                    <p className="text-5xl mb-4">🎮</p>
                    <h4 className="font-bold text-lg text-cyan-800 mb-2">Sistema Missioni</h4>
                    <p className="text-cyan-700">
                      Le missioni sono un add-on che si aggiunge agli altri programmi.<br/>
                      Crea prima un programma base (Bollini, Punti, ecc.) e poi potrai<br/>
                      aggiungere missioni per aumentare l&apos;engagement!
                    </p>
                    <button
                      onClick={() => setStep(1)}
                      className="mt-4 bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700"
                    >
                      ← Scegli un altro tipo
                    </button>
                  </div>
                )}
              </div>

              {/* Logo Upload */}
              {selectedType !== 'missions' && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-lg mb-2">🖼️ Logo Aziendale <span className="text-amber-600 text-xs font-normal">(non modificabile dopo)</span></h3>
                  <p className="text-sm text-gray-500 mb-4">Scegli con cura: non potrai cambiarlo dopo la creazione</p>
                  
                  <div className="flex items-start gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img 
                          src={logoPreview} 
                          alt="Logo" 
                          className="w-24 h-24 object-contain bg-gray-100 rounded-xl"
                        />
                        <button
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-sm hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400">
                        <span className="text-3xl">📷</span>
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
                            file:rounded-lg file:border-0
                            file:text-sm file:font-medium
                            file:bg-indigo-50 file:text-indigo-700
                            hover:file:bg-indigo-100
                            disabled:opacity-50"
                        />
                      </label>
                      {uploading && (
                        <p className="text-sm text-indigo-600 mt-2">⏳ Caricamento...</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">⚠️ Solo PNG, JPG, WebP • Max 2MB • NO SVG!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Color Picker */}
              {selectedType !== 'missions' && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-lg mb-2">🎨 Colore del Programma <span className="text-amber-600 text-xs font-normal">(non modificabile dopo)</span></h3>
                  <p className="text-sm text-gray-500 mb-4">Scegli con cura: non potrai cambiarlo dopo la creazione</p>
                  
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-14 h-14 rounded-xl cursor-pointer border-2 border-gray-200"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#1e293b'].map(c => (
                        <button
                          key={c}
                          onClick={() => setPrimaryColor(c)}
                          className={`w-10 h-10 rounded-xl transition-transform hover:scale-110 ${primaryColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 🔗 LINK E GOOGLE WALLET - SEZIONE UNIFICATA */}
              {selectedType !== 'missions' && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-lg mb-2">🔗 Link e Google Wallet</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Questi link appariranno nel retro della carta Google Wallet dei tuoi clienti
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        📋 Link Catalogo Premi
                      </label>
                      <input
                        type="url"
                        value={externalRewardsUrl}
                        onChange={(e) => setExternalRewardsUrl(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://tuosito.com/premi"
                      />
                      <p className="text-xs text-gray-400 mt-1">Mostrato come &quot;Catalogo Premi&quot; nel Wallet</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        📜 Link Regolamento
                      </label>
                      <input
                        type="url"
                        value={termsUrl}
                        onChange={(e) => setTermsUrl(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://tuosito.com/regolamento"
                      />
                      <p className="text-xs text-gray-400 mt-1">Mostrato come &quot;Regolamento&quot; nel Wallet</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        🌐 Sito Web Attività
                      </label>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://tuosito.com"
                      />
                      <p className="text-xs text-gray-400 mt-1">Mostrato come &quot;Sito Web&quot; nel Wallet</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        💬 Messaggio Personalizzato
                      </label>
                      <textarea
                        value={walletMessage}
                        onChange={(e) => setWalletMessage(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        rows={2}
                        placeholder="es. Grazie per essere nostro cliente! Presenta la carta ad ogni acquisto."
                      />
                      <p className="text-xs text-gray-400 mt-1">Appare come messaggio nella carta</p>
                    </div>
                    
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">💡</span>
                        <div>
                          <p className="font-medium text-indigo-900">Come appariranno i link</p>
                          <p className="text-sm text-indigo-700 mt-1">
                            Nel retro della carta Google Wallet i clienti vedranno:
                          </p>
                          <ul className="text-sm text-indigo-700 mt-2 space-y-1">
                            <li>• <strong>Catalogo Premi</strong> → link al tuo catalogo</li>
                            <li>• <strong>Regolamento</strong> → link alle regole</li>
                            <li>• <strong>Sito Web</strong> → link al tuo sito</li>
                            <li>• <strong>Zale Marketing</strong> → sempre presente in fondo</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedType !== 'missions' && (
                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 px-6 py-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                  >
                    ← Indietro
                  </button>
                  <button
                    onClick={createProgram}
                    disabled={saving || !name}
                    className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-bold text-lg transition-colors"
                  >
                    {saving ? '⏳ Creando...' : '✨ Crea Programma'}
                  </button>
                </div>
              )}
            </div>

            {/* Preview - 2 columns */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-6">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-lg mb-4 text-center">📱 Anteprima</h3>
                  
                  <div className="bg-gray-900 rounded-[2.5rem] p-3 max-w-[280px] mx-auto">
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
                              className="w-11 h-11 object-contain rounded-xl bg-white/20 p-1"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
                              {selectedTypeData?.icon}
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-white text-sm leading-tight">
                              {name || 'Nome Programma'}
                            </h3>
                            <p className="text-white/60 text-xs">{selectedTypeData?.name}</p>
                          </div>
                        </div>

                        <div className="bg-white/15 rounded-xl p-4 mb-4">
                          {selectedType === 'stamps' && (
                            <>
                              <div className="flex justify-center gap-1.5 flex-wrap mb-3">
                                {Array.from({ length: Math.min(stampsRequired, 8) }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                      i < 4 ? 'bg-white text-indigo-600' : 'bg-white/30 text-white'
                                    }`}
                                  >
                                    {i < 4 ? '✓' : ''}
                                  </div>
                                ))}
                              </div>
                              <p className="text-center text-white text-sm">4/{stampsRequired} bollini</p>
                              {rewardDescription && (
                                <p className="text-center text-white/70 text-xs mt-1">🎁 {rewardDescription}</p>
                              )}
                            </>
                          )}

                          {selectedType === 'points' && (
                            <div className="text-center">
                              <p className="text-white/60 text-xs mb-1">I TUOI PUNTI</p>
                              <p className="text-4xl font-bold text-white">50</p>
                              <div className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-white rounded-full transition-all" 
                                  style={{ width: `${Math.min((50 / pointsForReward) * 100, 100)}%` }} 
                                />
                              </div>
                              <p className="text-white/70 text-xs mt-2">
                                50/{pointsForReward} punti → €{pointsRewardValue} sconto
                              </p>
                            </div>
                          )}

                          {selectedType === 'cashback' && (
                            <div className="text-center">
                              <p className="text-white/60 text-xs mb-1">IL TUO CREDITO</p>
                              <p className="text-4xl font-bold text-white">€12.50</p>
                              <p className="text-white/70 text-xs mt-2">
                                +{cashbackPercent}% su ogni acquisto
                              </p>
                            </div>
                          )}

                          {selectedType === 'tiers' && (
                            <div className="text-center">
                              <p className="text-white/60 text-xs mb-2">IL TUO LIVELLO</p>
                              <div className="flex justify-center items-end gap-2 mb-2">
                                {tiers.slice(0, 3).map((tier, i) => (
                                  <div 
                                    key={i} 
                                    className={`text-center transition-all ${i === 1 ? 'scale-125 opacity-100' : 'scale-90 opacity-50'}`}
                                  >
                                    <p className="text-2xl">{tier.emoji}</p>
                                    <p className="text-white text-xs font-medium">{tier.name}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedType === 'subscription' && (
                            <div className="text-center">
                              <p className="text-white/60 text-xs mb-1">ABBONAMENTO ATTIVO</p>
                              <p className="text-2xl font-bold text-white">
                                €{subscriptionPrice}
                                <span className="text-base font-normal text-white/60">
                                  /{subscriptionPeriod === 'weekly' ? 'sett' : subscriptionPeriod === 'monthly' ? 'mese' : 'anno'}
                                </span>
                              </p>
                              <div className="mt-3 bg-white/20 rounded-lg py-2 text-white text-sm">
                                ✓ {dailyLimit - 1}/{dailyLimit} utilizzi oggi
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-white rounded-xl p-3 text-center">
                          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-1">
                            <span className="text-3xl">📱</span>
                          </div>
                          <p className="text-xs text-gray-400">Scansiona</p>
                        </div>

                        {(externalRewardsUrl || termsUrl || websiteUrl) && (
                          <div className="flex justify-center gap-3 mt-3 text-xs text-white/70 flex-wrap">
                            {externalRewardsUrl && <span className="underline">📋 Premi</span>}
                            {termsUrl && <span className="underline">📜 Regolamento</span>}
                            {websiteUrl && <span className="underline">🌐 Sito</span>}
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
      </main>
    </div>
  )
}