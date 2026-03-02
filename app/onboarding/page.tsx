'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Step = 1 | 2 | 3 | 4

const CATEGORIES = [
  { id: 'bar', label: 'Bar / Caffetteria', icon: '☕', recommended: 'stamps' },
  { id: 'restaurant', label: 'Ristorante / Pizzeria', icon: '🍕', recommended: 'stamps' },
  { id: 'retail', label: 'Negozio / Boutique', icon: '🛍️', recommended: 'points' },
  { id: 'beauty', label: 'Parrucchiere / Beauty', icon: '💅', recommended: 'cashback' },
  { id: 'gym', label: 'Palestra / Fitness', icon: '💪', recommended: 'subscription' },
  { id: 'hotel', label: 'Hotel / Hospitality', icon: '🏨', recommended: 'tiers' },
  { id: 'food', label: 'Alimentari / Pescheria', icon: '🥩', recommended: 'cashback' },
  { id: 'other', label: 'Altro', icon: '🏪', recommended: 'stamps' },
]

const PROGRAM_TYPES = [
  {
    id: 'stamps',
    name: 'Bollini',
    icon: '🎫',
    description: 'Ogni visita = 1 bollino. Raggiungi X bollini e vinci il premio!',
    example: '10 caffè → 1 caffè gratis',
    color: '#6366f1',
  },
  {
    id: 'points',
    name: 'Punti su Spesa',
    icon: '⭐',
    description: 'I clienti guadagnano punti in base a quanto spendono.',
    example: '1€ = 1 punto → 100 punti = €10 sconto',
    color: '#10b981',
  },
  {
    id: 'cashback',
    name: 'Cashback',
    icon: '💰',
    description: 'Una % della spesa torna come credito da usare al prossimo acquisto.',
    example: '5% cashback su ogni acquisto',
    color: '#f59e0b',
  },
  {
    id: 'tiers',
    name: 'Livelli VIP',
    icon: '👑',
    description: 'I clienti salgono di livello e sbloccano sconti crescenti.',
    example: 'Bronze → Silver → Gold → Diamond',
    color: '#8b5cf6',
  },
  {
    id: 'subscription',
    name: 'Abbonamento',
    icon: '🔄',
    description: 'Quota fissa mensile per vantaggi illimitati o un numero di utilizzi al giorno.',
    example: '€19.99/mese = 1 caffè al giorno',
    color: '#ec4899',
  },
]

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#14b8a6', '#3b82f6', '#a855f7',
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>(1)
  const [merchantId, setMerchantId] = useState('')
  const [merchantName, setMerchantName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createdProgramId, setCreatedProgramId] = useState('')

  // Step 1
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('')

  // Step 2
  const [programType, setProgramType] = useState('')

  // Step 3 - config
  const [programName, setProgramName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [stampsRequired, setStampsRequired] = useState(10)
  const [rewardDescription, setRewardDescription] = useState('')
  const [pointsPerEuro, setPointsPerEuro] = useState(1)
  const [cashbackPercent, setCashbackPercent] = useState(5)
  const [minCashbackRedeem, setMinCashbackRedeem] = useState(5)
  const [subscriptionPrice, setSubscriptionPrice] = useState(19.99)
  const [subscriptionPeriod, setSubscriptionPeriod] = useState('monthly')
  const [dailyLimit, setDailyLimit] = useState(1)

  useEffect(() => {
    async function init() {
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

      if (!profile?.merchant_id) {
        router.push('/register')
        return
      }

      setMerchantId(profile.merchant_id)

      // Se ha già programmi → vai alla dashboard
      const { count } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', profile.merchant_id)

      if ((count || 0) > 0) {
        router.push('/dashboard')
        return
      }

      const { data: merchant } = await supabase
        .from('merchants')
        .select('name')
        .eq('id', profile.merchant_id)
        .single()

      if (merchant) {
        setMerchantName(merchant.name)
        setBusinessName(merchant.name)
        setProgramName(`Carta Fedeltà ${merchant.name}`)
      }

      setLoading(false)
    }

    init()
  }, [])

  // Imposta defaults quando si sceglie tipo programma
  useEffect(() => {
    if (!programType) return
    const type = PROGRAM_TYPES.find(t => t.id === programType)
    if (type) setPrimaryColor(type.color)

    if (programType === 'stamps') {
      setStampsRequired(10)
      setRewardDescription('1 omaggio')
    } else if (programType === 'points') {
      setStampsRequired(100)
      setRewardDescription('€10 di sconto')
      setPointsPerEuro(1)
    } else if (programType === 'cashback') {
      setCashbackPercent(5)
      setMinCashbackRedeem(5)
    } else if (programType === 'subscription') {
      setSubscriptionPrice(19.99)
      setSubscriptionPeriod('monthly')
      setDailyLimit(1)
    }
  }, [programType])

  // Imposta tipo raccomandato quando si sceglie categoria
  const handleCategorySelect = (catId: string) => {
    setCategory(catId)
    const cat = CATEGORIES.find(c => c.id === catId)
    if (cat) setProgramType(cat.recommended)
  }

  const handleSaveProgram = async () => {
    if (!programName.trim()) return
    setSaving(true)

    // Prima aggiorna nome azienda se cambiato
    if (businessName !== merchantName) {
      await supabase
        .from('merchants')
        .update({ name: businessName })
        .eq('id', merchantId)
    }

    const programData: Record<string, any> = {
      merchant_id: merchantId,
      name: programName.trim(),
      program_type: programType,
      primary_color: primaryColor,
    }

    if (programType === 'stamps') {
      programData.stamps_required = stampsRequired
      programData.reward_description = rewardDescription
    } else if (programType === 'points') {
      programData.stamps_required = stampsRequired
      programData.reward_description = rewardDescription
      programData.points_per_euro = pointsPerEuro
    } else if (programType === 'cashback') {
      programData.cashback_percent = cashbackPercent
      programData.min_cashback_redeem = minCashbackRedeem
      programData.stamps_required = 0
    } else if (programType === 'tiers') {
      programData.stamps_required = 0
    } else if (programType === 'subscription') {
      programData.subscription_price = subscriptionPrice
      programData.subscription_period = subscriptionPeriod
      programData.daily_limit = dailyLimit
      programData.stamps_required = 0
    }

    const { data: newProg, error } = await supabase
      .from('programs')
      .insert(programData)
      .select('id')
      .single()

    if (error || !newProg) {
      alert('Errore nel salvare il programma. Riprova.')
      setSaving(false)
      return
    }

    // Per tiers, crea livelli default
    if (programType === 'tiers') {
      await supabase.from('tiers').insert([
        { program_id: newProg.id, name: 'Bronze', min_spend: 0, discount_percent: 0, badge_emoji: '🥉', sort_order: 1 },
        { program_id: newProg.id, name: 'Silver', min_spend: 200, discount_percent: 5, badge_emoji: '🥈', sort_order: 2 },
        { program_id: newProg.id, name: 'Gold', min_spend: 500, discount_percent: 10, badge_emoji: '🥇', sort_order: 3 },
      ])
    }

    setCreatedProgramId(newProg.id)
    setStep(4)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const selectedTypeInfo = PROGRAM_TYPES.find(t => t.id === programType)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`flex-1 h-2 mx-1 rounded-full transition-all ${
                  s <= step ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-500">
            {step === 1 && 'Passo 1 di 4 — La tua attività'}
            {step === 2 && 'Passo 2 di 4 — Tipo di programma'}
            {step === 3 && 'Passo 3 di 4 — Configurazione'}
            {step === 4 && 'Passo 4 di 4 — Fatto!'}
          </p>
        </div>

        {/* ==================== STEP 1 ==================== */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">👋</div>
              <h1 className="text-2xl font-bold text-gray-900">Benvenuto in FidelityApp!</h1>
              <p className="text-gray-500 mt-2">
                In 3 minuti avrai il tuo programma fedeltà attivo. Iniziamo!
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Come si chiama la tua attività?
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="Es: Bar Roma, Pizzeria Da Mario..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Che tipo di attività hai?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        category === cat.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <p className="text-sm font-medium text-gray-800 mt-1">{cat.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!businessName.trim() || !category}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-40 hover:bg-indigo-700 transition-colors"
              >
                Avanti →
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 2 ==================== */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600 mb-4 text-sm">
              ← Indietro
            </button>
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🎯</div>
              <h1 className="text-2xl font-bold text-gray-900">Che tipo di programma vuoi?</h1>
              {category && (
                <p className="text-indigo-600 font-medium mt-2">
                  Consigliato per la tua attività: {PROGRAM_TYPES.find(t => t.id === CATEGORIES.find(c => c.id === category)?.recommended)?.name}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {PROGRAM_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setProgramType(type.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    programType === type.id
                      ? 'border-2 bg-opacity-10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={programType === type.id ? {
                    borderColor: type.color,
                    backgroundColor: type.color + '15',
                  } : {}}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{type.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{type.name}</p>
                      <p className="text-sm text-gray-500">{type.description}</p>
                      <p className="text-xs text-gray-400 mt-1 italic">{type.example}</p>
                    </div>
                    {programType === type.id && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm"
                        style={{ backgroundColor: type.color }}
                      >
                        ✓
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!programType}
              className="w-full mt-6 bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-40 hover:bg-indigo-700 transition-colors"
            >
              Avanti →
            </button>
          </div>
        )}

        {/* ==================== STEP 3 ==================== */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <button onClick={() => setStep(2)} className="text-gray-400 hover:text-gray-600 mb-4 text-sm">
              ← Indietro
            </button>
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">{selectedTypeInfo?.icon || '⚙️'}</div>
              <h1 className="text-2xl font-bold text-gray-900">Configura il tuo programma</h1>
              <p className="text-gray-500 mt-1">Puoi modificare tutto in seguito</p>
            </div>

            <div className="space-y-5">
              {/* Nome programma */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nome del programma
                </label>
                <input
                  type="text"
                  value={programName}
                  onChange={e => setProgramName(e.target.value)}
                  placeholder="Es: Carta Fedeltà Bar Roma"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Colore */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Colore della carta
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setPrimaryColor(color)}
                      className={`w-9 h-9 rounded-full border-2 transition-transform ${
                        primaryColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Config STAMPS */}
              {programType === 'stamps' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Quanti bollini per il premio?
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={5} max={20} value={stampsRequired}
                        onChange={e => setStampsRequired(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="font-bold text-2xl text-indigo-600 w-8 text-right">{stampsRequired}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Consigliato: 8-12 bollini</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Che cosa vince il cliente?
                    </label>
                    <input
                      type="text"
                      value={rewardDescription}
                      onChange={e => setRewardDescription(e.target.value)}
                      placeholder="Es: 1 caffè gratis, 10% di sconto..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                </>
              )}

              {/* Config POINTS */}
              {programType === 'points' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Quanti € per 1 punto?
                    </label>
                    <input
                      type="number" min={0.5} max={10} step={0.5}
                      value={pointsPerEuro}
                      onChange={e => setPointsPerEuro(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Ogni €{pointsPerEuro} spesi = 1 punto</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Punti per il premio
                    </label>
                    <input
                      type="number" min={10} max={1000} step={10}
                      value={stampsRequired}
                      onChange={e => setStampsRequired(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Premio
                    </label>
                    <input
                      type="text"
                      value={rewardDescription}
                      onChange={e => setRewardDescription(e.target.value)}
                      placeholder="Es: €10 di sconto, regalo speciale..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                </>
              )}

              {/* Config CASHBACK */}
              {programType === 'cashback' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Percentuale cashback
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={1} max={15} value={cashbackPercent}
                        onChange={e => setCashbackPercent(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="font-bold text-2xl text-amber-500 w-12 text-right">{cashbackPercent}%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Minimo per riscattare (€)
                    </label>
                    <input
                      type="number" min={1} max={50} step={1}
                      value={minCashbackRedeem}
                      onChange={e => setMinCashbackRedeem(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Il cliente può usare il cashback solo quando accumula almeno €{minCashbackRedeem}</p>
                  </div>
                </>
              )}

              {/* Config TIERS */}
              {programType === 'tiers' && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="font-semibold text-purple-800 mb-2">Livelli creati automaticamente:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🥉</span>
                      <span className="font-medium">Bronze</span>
                      <span className="text-gray-500 text-sm">— €0+ (nessuno sconto)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🥈</span>
                      <span className="font-medium">Silver</span>
                      <span className="text-gray-500 text-sm">— €200+ → 5% sconto</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🥇</span>
                      <span className="font-medium">Gold</span>
                      <span className="text-gray-500 text-sm">— €500+ → 10% sconto</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Puoi personalizzare i livelli dopo la creazione</p>
                </div>
              )}

              {/* Config SUBSCRIPTION */}
              {programType === 'subscription' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Prezzo abbonamento (€)
                    </label>
                    <input
                      type="number" min={1} max={999} step={0.01}
                      value={subscriptionPrice}
                      onChange={e => setSubscriptionPrice(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Periodo
                    </label>
                    <select
                      value={subscriptionPeriod}
                      onChange={e => setSubscriptionPeriod(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    >
                      <option value="weekly">Settimanale</option>
                      <option value="monthly">Mensile</option>
                      <option value="yearly">Annuale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Utilizzi al giorno inclusi
                    </label>
                    <input
                      type="number" min={1} max={10}
                      value={dailyLimit}
                      onChange={e => setDailyLimit(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Es: 1 = un caffè al giorno incluso</p>
                  </div>
                </>
              )}

              {/* Preview */}
              <div
                className="rounded-xl p-4 text-white text-center"
                style={{ backgroundColor: primaryColor }}
              >
                <p className="text-sm opacity-80 mb-1">Anteprima colore carta</p>
                <p className="font-bold text-lg">{programName || 'Il tuo programma'}</p>
              </div>

              <button
                onClick={handleSaveProgram}
                disabled={saving || !programName.trim()}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-40 hover:bg-indigo-700 transition-colors"
              >
                {saving ? 'Creazione in corso...' : 'Crea il mio programma →'}
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 4 ==================== */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Il tuo programma è attivo!
            </h1>
            <p className="text-gray-500 mb-8 text-lg">
              Condividi il link con i tuoi clienti: possono iscriversi da soli in 30 secondi.
            </p>

            {/* Link box */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-indigo-700 font-semibold mb-2">Link iscrizione clienti:</p>
              <p className="font-mono text-sm text-indigo-600 break-all mb-3">
                {typeof window !== 'undefined' ? `${window.location.origin}/join/${createdProgramId}` : ''}
              </p>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/join/${createdProgramId}`
                  if (navigator.share) {
                    navigator.share({ title: `Iscriviti a ${programName}`, url })
                  } else {
                    navigator.clipboard.writeText(url).then(() => alert('Link copiato!'))
                  }
                }}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700"
              >
                📤 Condividi / Copia Link
              </button>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <a
                href="/stamp"
                className="block w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700"
              >
                📷 Vai allo Scanner QR
              </a>
              <a
                href={`/dashboard/programs/${createdProgramId}`}
                className="block w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200"
              >
                Gestisci Programma →
              </a>
              <a
                href="/dashboard"
                className="block w-full text-indigo-600 py-3 font-semibold hover:underline"
              >
                Vai alla Dashboard
              </a>
            </div>

            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left">
              <p className="font-semibold text-yellow-800 mb-2">Prossimi passi:</p>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>1. Metti il link QR alla cassa o sul menu</li>
                <li>2. Configura il logo del programma nelle impostazioni</li>
                <li>3. Aggiungi premi intermedi (opzionale)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
