'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

type ProgramInfo = {
  id: string
  name: string
  program_type: string
  primary_color: string
  logo_url: string | null
  stamps_required: number
  reward_description: string | null
  points_per_euro: number | null
  cashback_percent: number | null
  subscription_price: number | null
  subscription_period: string | null
  min_cashback_redeem: number | null
  daily_limit: number | null
  merchant_id: string
}

type RewardItem = {
  id: string
  name: string
  stamps_required: number
  sort_order: number
}

type MerchantInfo = {
  id: string
  name: string
  logo_url: string | null
}

const TYPE_ICONS: Record<string, string> = {
  stamps: '🎫',
  points: '⭐',
  cashback: '💰',
  tiers: '👑',
  subscription: '🔄',
}

const TYPE_LABELS: Record<string, string> = {
  stamps: 'Bollini',
  points: 'Punti',
  cashback: 'Cashback',
  tiers: 'Livelli VIP',
  subscription: 'Abbonamento',
}

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const programId = params.programId as string

  const [program, setProgram] = useState<ProgramInfo | null>(null)
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null)
  const [rewards, setRewards] = useState<RewardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [cardLink, setCardLink] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')

  useEffect(() => {
    async function load() {
      const { data: prog, error: progErr } = await supabase
        .from('programs')
        .select('id, name, program_type, primary_color, logo_url, stamps_required, reward_description, points_per_euro, cashback_percent, subscription_price, subscription_period, merchant_id, min_cashback_redeem, daily_limit')
        .eq('id', programId)
        .single()

      if (progErr || !prog) {
        setError('Programma non trovato.')
        setLoading(false)
        return
      }

      setProgram(prog)

      if (prog.program_type === 'stamps') {
        const { data: rewardsData } = await supabase
          .from('rewards')
          .select('id, name, stamps_required, sort_order')
          .eq('program_id', prog.id)
          .eq('is_active', true)
          .order('stamps_required', { ascending: true })
        if (rewardsData) setRewards(rewardsData)
      }

      const { data: merch } = await supabase
        .from('merchants')
        .select('id, name, logo_url')
        .eq('id', (prog as any).merchant_id)
        .single()

      if (merch) setMerchant(merch)
      setLoading(false)
    }

    load()
  }, [programId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setError('Il nome è obbligatorio.')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      const merchantId = program.merchant_id || merchant?.id
      if (!merchantId || !program) {
        setError('Errore interno: merchant non trovato.')
        setSubmitting(false)
        return
      }

      // 1. Crea o trova card_holder esistente per email (se fornita)
      let cardHolderId: string | null = null

      if (email) {
        // Controlla se esiste già un card_holder con questa email per questo merchant
        const { data: existingHolder } = await supabase
          .from('card_holders')
          .select('id')
          .eq('merchant_id', merchantId)
          .eq('contact_email', email.toLowerCase().trim())
          .maybeSingle()

        if (existingHolder) {
          cardHolderId = existingHolder.id

          // Controlla se ha già una carta per questo programma
          const { data: existingCard } = await supabase
            .from('cards')
            .select('id, scan_token')
            .eq('card_holder_id', cardHolderId)
            .eq('program_id', program.id)
            .maybeSingle()

          if (existingCard) {
            // Ha già la carta - reindirizza direttamente
            const link = `${window.location.origin}/c/${existingCard.scan_token}`
            setCardLink(link)
            setDone(true)
            setSubmitting(false)
            return
          }
        }
      }

      // 2. Crea card_holder se non esiste
      if (!cardHolderId) {
        const { data: newHolder, error: holderErr } = await supabase
          .from('card_holders')
          .insert({
            merchant_id: merchantId,
            full_name: fullName.trim(),
            contact_email: email ? email.toLowerCase().trim() : null,
            phone: phone ? phone.trim() : null,
            birth_date: birthDate || null,
          })
          .select('id')
          .single()

        if (holderErr || !newHolder) {
          setError('Errore nella creazione del profilo. Riprova.')
          setSubmitting(false)
          return
        }

        cardHolderId = newHolder.id
      }

      // 3. Crea carta
      const scanToken = crypto.randomUUID().replace(/-/g, '')

      const cardData: Record<string, any> = {
        merchant_id: merchantId,
        program_id: program.id,
        card_holder_id: cardHolderId,
        scan_token: scanToken,
        status: 'active',
      }

      // Valori iniziali per tipo programma
      if (program.program_type === 'stamps') {
        cardData.current_stamps = 0
        cardData.stamp_count = 0
      } else if (program.program_type === 'points') {
        cardData.points_balance = 0
        cardData.total_spent = 0
      } else if (program.program_type === 'cashback') {
        cardData.cashback_balance = 0
        cardData.total_spent = 0
      } else if (program.program_type === 'tiers') {
        cardData.total_spent = 0
        cardData.current_tier = null
      } else if (program.program_type === 'subscription') {
        cardData.subscription_status = 'inactive'
        cardData.daily_uses = 0
      }

      const { data: newCard, error: cardErr } = await supabase
        .from('cards')
        .insert(cardData)
        .select('id, scan_token')
        .single()

      if (cardErr || !newCard) {
        setError('Errore nella creazione della carta. Riprova.')
        setSubmitting(false)
        return
      }

      const link = `${window.location.origin}/c/${newCard.scan_token}`
      setCardLink(link)
      setDone(true)

      // Fire-and-forget webhook dispatch via server route (do NOT await)
      const dispatchWebhook = (event: string, data: Record<string, unknown>) => {
        fetch('/api/webhooks/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId, event, data }),
        }).catch(console.error)
      }

      dispatchWebhook('nuovo_cliente', {
        card_holder_id: cardHolderId,
        full_name: fullName.trim(),
        email: email ? email.toLowerCase().trim() : null,
        program_id: programId,
      })
      dispatchWebhook('card_creata', {
        card_id: newCard.id,
        card_holder_id: cardHolderId,
        program_id: programId,
        merchant_id: merchantId,
      })

      setTimeout(() => {
        router.push(`/c/${newCard.scan_token}`)
      }, 2500)
    } catch {
      setError('Errore inatteso. Riprova.')
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error && !program) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Pagina non trovata</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const primaryColor = program?.primary_color || '#6366f1'
  const programType = program?.program_type || 'stamps'

  // ========== SUCCESS STATE ==========
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div style={{ backgroundColor: primaryColor }} className="p-6 pb-20">
          <div className="max-w-md mx-auto text-center text-white">
            <div className="text-5xl mb-2">{TYPE_ICONS[programType] || '🎫'}</div>
            <h1 className="text-2xl font-bold">{merchant?.name}</h1>
            <p className="text-white/80">{program?.name}</p>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 -mt-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Benvenuto!</h2>
            <p className="text-gray-500 mb-6">
              La tua carta fedeltà è stata creata. Salvala subito sul tuo telefono!
            </p>

            <a
              href={cardLink}
              className="block w-full text-white py-4 rounded-xl font-bold text-lg mb-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              Vai alla tua Carta →
            </a>

            <p className="text-sm text-gray-400 mt-2 text-center">
              Reindirizzamento automatico in pochi secondi...
            </p>

            <div className="mt-4">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'La mia carta fedeltà', url: cardLink })
                  } else {
                    navigator.clipboard.writeText(cardLink)
                    alert('Link copiato!')
                  }
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200"
              >
                📤 Condividi / Copia link
              </button>
            </div>
          </div>

          <p className="text-center text-gray-400 text-sm mt-6 mb-8">
            Powered by FidelityApp
          </p>
        </div>
      </div>
    )
  }

  // ========== FORM STATE ==========
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header colorato */}
      <div style={{ backgroundColor: primaryColor }} className="p-6 pb-20">
        <div className="max-w-md mx-auto text-center text-white">
          {program?.logo_url ? (
            <img
              src={program.logo_url}
              alt="Logo"
              className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-4 border-white/30"
            />
          ) : (
            <div className="text-5xl mb-2">{TYPE_ICONS[programType] || '🎫'}</div>
          )}
          <h1 className="text-2xl font-bold">{merchant?.name}</h1>
          <p className="text-white/80 text-lg">{program?.name}</p>
          <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 inline-block">
            <p className="text-sm font-medium">{TYPE_LABELS[programType] || 'Fedeltà'}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-md mx-auto px-4 -mt-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6">
            {/* BenefitPreview — Come funziona */}
            <div className="border-b pb-5 mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
                Come funziona
              </h3>

              {programType === 'stamps' && (
                <div className="space-y-2">
                  {rewards.length > 0 ? (
                    rewards.map(reward => (
                      <div key={reward.id} className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {reward.stamps_required}
                        </div>
                        <span className="text-gray-800 font-medium text-sm">{reward.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {program?.stamps_required}
                      </div>
                      <span className="text-gray-800 font-medium text-sm">
                        {program?.reward_description || 'Premio speciale'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {programType === 'points' && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-700 font-medium">
                    €{program?.points_per_euro ?? 1} spesi = 1 punto
                  </p>
                  <p className="text-sm text-gray-500">
                    {program?.stamps_required} punti → {program?.reward_description || 'Premio speciale'}
                  </p>
                </div>
              )}

              {programType === 'cashback' && (
                <div className="space-y-1">
                  <p className="text-lg font-bold" style={{ color: primaryColor }}>
                    {program?.cashback_percent ?? 5}% cashback
                  </p>
                  <p className="text-sm text-gray-500">
                    Riscatti da €{program?.min_cashback_redeem ?? 5}
                  </p>
                </div>
              )}

              {programType === 'tiers' && (
                <p className="text-sm text-gray-700">
                  Sali di livello in base alla spesa e sblocca sconti crescenti
                </p>
              )}

              {programType === 'subscription' && (
                <div className="space-y-1">
                  <p className="text-lg font-bold" style={{ color: primaryColor }}>
                    €{program?.subscription_price ?? 0}/
                    {program?.subscription_period === 'monthly' ? 'mese'
                      : program?.subscription_period === 'yearly' ? 'anno'
                      : 'settimana'}
                  </p>
                  {program?.daily_limit != null && (
                    <p className="text-sm text-gray-500">
                      {program.daily_limit} utilizz{program.daily_limit === 1 ? 'o' : 'i'} al giorno inclus{program.daily_limit === 1 ? 'o' : 'i'}
                    </p>
                  )}
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">Iscriviti al programma</h2>
            <p className="text-gray-500 text-sm mb-6">
              Inserisci i tuoi dati per ricevere la tua carta fedeltà digitale
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome e Cognome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Mario Rossi"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent outline-none"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-gray-400 font-normal">(opzionale)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mario@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono <span className="text-gray-400 font-normal">(opzionale)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+39 333 000 0000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data di nascita <span className="text-gray-400 font-normal">(opzionale)</span>
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent outline-none"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? 'Creazione in corso...' : 'Ottieni la mia carta →'}
              </button>

              <p className="text-center text-xs text-gray-400">
                I tuoi dati saranno usati solo per il programma fedeltà di {merchant?.name}.
              </p>
            </form>
          </div>

        </div>

        <p className="text-center text-gray-400 text-sm mt-6 mb-8">
          Powered by FidelityApp
        </p>
      </div>
    </div>
  )
}
