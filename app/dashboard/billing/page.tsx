'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function BillingContent() {
  const [merchant, setMerchant] = useState<any>(null)
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [stripeAvailable, setStripeAvailable] = useState(true)
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoSuccess, setPromoSuccess] = useState('')
  const [promoError, setPromoError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const successMsg = searchParams.get('success') === '1'
  const canceledMsg = searchParams.get('canceled') === '1'

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('merchant_id')
        .eq('id', user.id)
        .single()

      if (profile) {
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', profile.merchant_id)
          .single()

        if (merchantData) setMerchant(merchantData)

        const { data: programsData } = await supabase
          .from('programs')
          .select('*')
          .eq('merchant_id', profile.merchant_id)

        if (programsData) setPrograms(programsData)
      }

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const isPro = merchant?.plan === 'PRO'
  const subStatus = merchant?.stripe_subscription_status

  const handleUpgrade = async (plan: 'PRO_MONTHLY' | 'PRO_YEARLY') => {
    if (!merchant?.id) return
    setCheckingOut(true)

    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: merchant.id, plan }),
      })

      const data = await res.json()

      if (data.error) {
        if (data.error.includes('non configurato') || data.error.includes('Price ID')) {
          setStripeAvailable(false)
          alert('Stripe non ancora configurato. Vedi BLOCCO.md per le istruzioni.')
        } else {
          alert('Errore: ' + data.error)
        }
        setCheckingOut(false)
        return
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch {
      alert('Errore di connessione. Riprova.')
    }

    setCheckingOut(false)
  }

  const handlePromoCode = async () => {
    if (!merchant?.id || !promoCode.trim()) return
    setPromoLoading(true)
    setPromoError('')
    setPromoSuccess('')

    try {
      const res = await fetch('/api/promo-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: merchant.id, code: promoCode.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        setPromoError(data.error)
      } else {
        const expires = new Date(data.expiresAt).toLocaleDateString('it-IT')
        setPromoSuccess(`Piano PRO attivato! Accesso gratuito fino al ${expires}.`)
        setPromoCode('')
        // Ricarica dati merchant
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('merchant_id').eq('id', user.id).single()
          if (profile) {
            const { data: merchantData } = await supabase.from('merchants').select('*').eq('id', profile.merchant_id).single()
            if (merchantData) setMerchant(merchantData)
          }
        }
      }
    } catch {
      setPromoError('Errore di connessione. Riprova.')
    }

    setPromoLoading(false)
  }

  const handleManageSubscription = async () => {
    if (!merchant?.id) return
    setOpeningPortal(true)

    try {
      const res = await fetch('/api/stripe-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: merchant.id }),
      })

      const data = await res.json()

      if (data.portalUrl) {
        window.location.href = data.portalUrl
      } else {
        alert('Errore: ' + (data.error || 'Impossibile aprire il portale'))
      }
    } catch {
      alert('Errore di connessione. Riprova.')
    }

    setOpeningPortal(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Abbonamento</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Messaggio successo/annullamento */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-green-700 font-semibold">Upgrade completato! Il tuo piano PRO è attivo.</p>
          </div>
        )}
        {canceledMsg && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-yellow-700">Acquisto annullato. Puoi riprovare in qualsiasi momento.</p>
          </div>
        )}

        {/* Stripe non configurato warning */}
        {!stripeAvailable && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <p className="font-semibold text-orange-800">Stripe non ancora attivo</p>
            <p className="text-orange-700 text-sm mt-1">
              Leggi <strong>BLOCCO.md</strong> per configurare Stripe e abilitare i pagamenti.
            </p>
          </div>
        )}

        {/* Piano Attuale */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <p className="text-gray-500 text-sm">Piano attuale</p>
              <p className="text-3xl font-bold text-gray-900">
                {isPro ? 'PRO' : 'FREE'}
              </p>
              {subStatus && subStatus !== 'active' && (
                <p className="text-sm text-orange-600 mt-1">
                  Stato abbonamento: {subStatus === 'past_due' ? 'Pagamento scaduto' : subStatus}
                </p>
              )}
              {merchant?.plan_expires_at && (
                <p className="text-sm text-gray-500 mt-1">
                  Accesso PRO fino al {new Date(merchant.plan_expires_at).toLocaleDateString('it-IT')}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-sm">Programmi</p>
              <p className="text-2xl font-bold">
                {programs.length} / {isPro ? '∞' : '5'}
              </p>
            </div>
          </div>

          {/* Barra utilizzo programmi FREE */}
          {!isPro && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-indigo-600"
                  style={{ width: `${Math.min((programs.length / 5) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{programs.length} su 5 programmi usati</p>
            </div>
          )}

          {/* Pulsante gestione se PRO con Stripe */}
          {isPro && merchant?.stripe_customer_id && (
            <button
              onClick={handleManageSubscription}
              disabled={openingPortal}
              className="mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
            >
              {openingPortal ? 'Apertura...' : 'Gestisci Abbonamento →'}
            </button>
          )}
        </div>

        {/* Piani */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* FREE */}
          <div className={`bg-white rounded-xl shadow p-6 ${!isPro ? 'ring-2 ring-indigo-600' : ''}`}>
            {!isPro && (
              <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">ATTUALE</span>
            )}
            <h2 className="text-2xl font-bold text-gray-900 mt-2">FREE</h2>
            <p className="text-4xl font-bold text-gray-900 mt-4">
              €0 <span className="text-lg font-normal text-gray-500">/mese</span>
            </p>
            <ul className="mt-6 space-y-3 text-gray-600">
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Fino a 5 programmi</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Clienti illimitati</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Google Wallet</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Scanner QR</li>
              <li className="flex items-center gap-2"><span className="text-red-400">✗</span> Analytics avanzate</li>
              <li className="flex items-center gap-2"><span className="text-red-400">✗</span> Notifiche push</li>
            </ul>
          </div>

          {/* PRO */}
          <div className={`bg-white rounded-xl shadow p-6 ${isPro ? 'ring-2 ring-indigo-600' : 'border-2 border-dashed border-indigo-300'}`}>
            {isPro && (
              <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">ATTUALE</span>
            )}
            <div className="flex items-center gap-2 mt-2">
              <h2 className="text-2xl font-bold text-gray-900">PRO</h2>
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">POPOLARE</span>
            </div>

            {/* Prezzi mensile / annuale */}
            <div className="mt-4 space-y-2">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-gray-900">€19</p>
                <span className="text-gray-500">/mese</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-green-600">€149</p>
                <span className="text-gray-500">/anno</span>
                <span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-0.5 rounded-full">Risparmi €79</span>
              </div>
            </div>

            <ul className="mt-6 space-y-3 text-gray-600">
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Programmi illimitati</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Clienti illimitati</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Google Wallet</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Scanner QR</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Analytics avanzate</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Notifiche push clienti</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Supporto prioritario</li>
            </ul>

            {!isPro && (
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => handleUpgrade('PRO_MONTHLY')}
                  disabled={checkingOut}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {checkingOut ? 'Reindirizzamento...' : 'Attiva PRO — €19/mese'}
                </button>
                <button
                  onClick={() => handleUpgrade('PRO_YEARLY')}
                  disabled={checkingOut}
                  className="w-full border-2 border-green-500 text-green-700 py-3 rounded-lg font-semibold hover:bg-green-50 disabled:opacity-50"
                >
                  {checkingOut ? 'Reindirizzamento...' : 'Attiva PRO Annuale — €149/anno'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Codice Promo */}
        {!isPro && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h3 className="font-bold text-gray-900 mb-1">Hai un codice promo?</h3>
            <p className="text-sm text-gray-500 mb-4">Inserisci il codice per attivare il piano PRO gratuitamente.</p>
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); setPromoSuccess('') }}
                onKeyDown={e => e.key === 'Enter' && handlePromoCode()}
                placeholder="Es. BETA2026"
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handlePromoCode}
                disabled={promoLoading || !promoCode.trim()}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {promoLoading ? 'Verifica...' : 'Applica'}
              </button>
            </div>
            {promoError && <p className="mt-3 text-sm text-red-600">{promoError}</p>}
            {promoSuccess && <p className="mt-3 text-sm text-green-700 font-medium">{promoSuccess}</p>}
          </div>
        )}

        {/* FAQ */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-900 mb-4">Domande Frequenti</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-gray-800">Posso disdire quando voglio?</p>
              <p className="text-gray-600 mt-1">Sì, puoi disdire in qualsiasi momento dal portale clienti Stripe. L'accesso PRO rimane attivo fino alla fine del periodo pagato.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">I miei dati rimangono se torno a FREE?</p>
              <p className="text-gray-600 mt-1">Sì, tutti i clienti e le carte rimangono. Solo i programmi oltre il 5° vengono messi in pausa (non cancellati).</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">È sicuro il pagamento?</p>
              <p className="text-gray-600 mt-1">Sì, i pagamenti sono gestiti da Stripe, leader mondiale nei pagamenti online. I dati della carta non passano mai dai nostri server.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>}>
      <BillingContent />
    </Suspense>
  )
}
