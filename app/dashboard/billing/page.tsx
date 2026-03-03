'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import StatusBadge from '@/components/ui/StatusBadge'
import { Check, X } from 'lucide-react'

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

  const planLower = (merchant?.plan || '').toLowerCase()
  const isPro = planLower === 'pro' || planLower === 'business'
  const isBusiness = planLower === 'business'
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
        setPromoSuccess(`Piano BUSINESS attivato! Accesso gratuito fino al ${expires}.`)
        setPromoCode('')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('merchant_id').eq('id', user.id).single()
          if (profile) {
            const { data: merchantData } = await supabase.from('merchants').select('*').eq('id', profile.merchant_id).single()
            if (merchantData) setMerchant(merchantData)
          }
        }
        router.refresh()
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="px-6 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Abbonamento</h1>
        <p className="text-sm text-gray-500 mt-1">Gestisci il tuo piano</p>
      </div>

      {/* Messaggi */}
      {successMsg && (
        <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-[8px] p-4 mb-6">
          <p className="text-[#16A34A] font-semibold text-sm">Upgrade completato! Il tuo piano PRO è attivo.</p>
        </div>
      )}
      {canceledMsg && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-[8px] p-4 mb-6">
          <p className="text-yellow-700 text-sm">Acquisto annullato. Puoi riprovare in qualsiasi momento.</p>
        </div>
      )}

      {!stripeAvailable && (
        <div className="bg-orange-50 border border-orange-200 rounded-[8px] p-4 mb-6">
          <p className="font-semibold text-orange-800 text-sm">Stripe non ancora attivo</p>
          <p className="text-orange-700 text-sm mt-1">
            Leggi <strong>BLOCCO.md</strong> per configurare Stripe e abilitare i pagamenti.
          </p>
        </div>
      )}

      {/* Piano Attuale */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-gray-500 text-sm">Piano attuale</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-3xl font-bold text-gray-900">
                {isBusiness ? 'BUSINESS' : isPro ? 'PRO' : 'FREE'}
              </p>
              {isPro && <StatusBadge variant="active" />}
            </div>
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
            <p className="text-2xl font-bold text-gray-900">
              {programs.length} / {isPro ? '' : '5'}
            </p>
          </div>
        </div>

        {!isPro && (
          <div className="mt-4">
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-[#111111]"
                style={{ width: `${Math.min((programs.length / 5) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{programs.length} su 5 programmi usati</p>
          </div>
        )}

        {isPro && merchant?.stripe_customer_id && (
          <button
            onClick={handleManageSubscription}
            disabled={openingPortal}
            className="mt-4 border border-[#E0E0E0] text-gray-700 px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors"
          >
            {openingPortal ? 'Apertura...' : 'Gestisci Abbonamento'}
          </button>
        )}
      </div>

      {/* Piani */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* FREE */}
        <div className={`bg-white border rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${!isPro ? 'border-[#111111]' : 'border-[#E8E8E8]'}`}>
          {!isPro && (
            <span className="bg-[#111111] text-white text-xs px-2.5 py-1 rounded-full font-medium">ATTUALE</span>
          )}
          <h2 className="text-2xl font-bold text-gray-900 mt-3">FREE</h2>
          <p className="text-4xl font-bold text-gray-900 mt-4">
            €0 <span className="text-lg font-normal text-gray-500">/mese</span>
          </p>
          <ul className="mt-6 space-y-3 text-gray-600 text-sm">
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Fino a 5 programmi</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Clienti illimitati</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Google Wallet</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Scanner QR</li>
            <li className="flex items-center gap-2"><X size={16} className="text-[#DC2626] flex-shrink-0" /> Analytics avanzate</li>
            <li className="flex items-center gap-2"><X size={16} className="text-[#DC2626] flex-shrink-0" /> Notifiche push</li>
          </ul>
        </div>

        {/* PRO */}
        <div className={`bg-white rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${isPro && !isBusiness ? 'border-2 border-[#111111]' : 'border-2 border-dashed border-[#E0E0E0]'}`}>
          {isPro && !isBusiness && (
            <span className="bg-[#111111] text-white text-xs px-2.5 py-1 rounded-full font-medium">ATTUALE</span>
          )}
          <div className="flex items-center gap-2 mt-3">
            <h2 className="text-2xl font-bold text-gray-900">PRO</h2>
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">POPOLARE</span>
          </div>

          <p className="text-4xl font-bold text-gray-900 mt-4">
            €39 <span className="text-lg font-normal text-gray-500">/mese</span>
          </p>

          <ul className="mt-6 space-y-3 text-gray-600 text-sm">
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Programmi illimitati</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Clienti illimitati</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Google Wallet</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Scanner QR</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Analytics avanzate</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Notifiche push clienti</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> WhatsApp Marketing</li>
          </ul>

          {!isPro && (
            <div className="mt-6">
              <button
                onClick={() => handleUpgrade('PRO_MONTHLY')}
                disabled={checkingOut}
                className="w-full bg-[#111111] text-white py-3 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
              >
                {checkingOut ? 'Reindirizzamento...' : 'Attiva PRO — €39/mese'}
              </button>
            </div>
          )}
        </div>

        {/* BUSINESS */}
        <div className={`bg-white rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${isBusiness ? 'border-2 border-[#111111]' : 'border border-[#E8E8E8]'}`}>
          {isBusiness && (
            <span className="bg-[#111111] text-white text-xs px-2.5 py-1 rounded-full font-medium">ATTUALE</span>
          )}
          <h2 className="text-2xl font-bold text-gray-900 mt-3">BUSINESS</h2>
          <p className="text-4xl font-bold text-gray-900 mt-4">
            €99 <span className="text-lg font-normal text-gray-500">/mese</span>
          </p>
          <ul className="mt-6 space-y-3 text-gray-600 text-sm">
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Tutto il piano PRO</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Webhook integrations</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> API pubblica</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> Multi-sede</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-[#16A34A] flex-shrink-0" /> White-label</li>
          </ul>
          <div className="mt-6">
            <a
              href="#coupon"
              className="block w-full bg-[#111111] text-white py-3 rounded-[8px] text-sm font-semibold hover:bg-[#333333] transition-colors text-center"
            >
              Attiva BUSINESS
            </a>
          </div>
        </div>
      </div>

      {/* Codice Promo */}
      {!isBusiness && (
        <div id="coupon" className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h3 className="font-semibold text-gray-900 mb-1 text-sm">Hai un codice promo?</h3>
          <p className="text-sm text-gray-500 mb-4">Inserisci il codice per attivare il piano BUSINESS gratuitamente.</p>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={promoCode}
              onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); setPromoSuccess('') }}
              onKeyDown={e => e.key === 'Enter' && handlePromoCode()}
              placeholder="Es. BETA2026"
              className="flex-1 min-w-0 border border-[#E0E0E0] rounded-[8px] px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-[#111111] transition-colors"
            />
            <button
              onClick={handlePromoCode}
              disabled={promoLoading || !promoCode.trim()}
              className="bg-[#111111] text-white px-5 py-2.5 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
            >
              {promoLoading ? 'Verifica...' : 'Applica'}
            </button>
          </div>
          {promoError && <p className="mt-3 text-sm text-[#DC2626]">{promoError}</p>}
          {promoSuccess && <p className="mt-3 text-sm text-[#16A34A] font-medium">{promoSuccess}</p>}
        </div>
      )}

      {/* FAQ */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">Domande Frequenti</h3>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-gray-800">Posso disdire quando voglio?</p>
            <p className="text-gray-600 mt-1">Sì, puoi disdire in qualsiasi momento dal portale clienti Stripe. L'accesso PRO rimane attivo fino alla fine del periodo pagato.</p>
          </div>
          <div>
            <p className="font-medium text-gray-800">I miei dati rimangono se torno a FREE?</p>
            <p className="text-gray-600 mt-1">Sì, tutti i clienti e le carte rimangono. Solo i programmi oltre il 5° vengono messi in pausa (non cancellati).</p>
          </div>
          <div>
            <p className="font-medium text-gray-800">È sicuro il pagamento?</p>
            <p className="text-gray-600 mt-1">Sì, i pagamenti sono gestiti da Stripe, leader mondiale nei pagamenti online. I dati della carta non passano mai dai nostri server.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full" /></div>}>
      <BillingContent />
    </Suspense>
  )
}
