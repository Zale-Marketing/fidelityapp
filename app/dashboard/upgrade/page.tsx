'use client'

import Link from 'next/link'
import { Check, Lock, ArrowRight } from 'lucide-react'
import { usePlan } from '@/lib/hooks/usePlan'

const PLANS = [
  {
    id: 'free',
    name: 'FREE',
    price: 0,
    period: 'mese',
    features: [
      '1 programma (solo bollini)',
      'Max 50 carte clienti',
      'Google Wallet',
      'Scanner QR',
    ],
    locked: [
      'Notifiche push',
      'WhatsApp Marketing',
      'Segmentazione clienti',
      'Automazione compleanno',
      'Recensioni Google',
      'Analytics avanzate',
      'Export CSV',
    ],
    cta: null,
    popular: false,
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 39,
    period: 'mese',
    features: [
      'Programmi illimitati',
      'Clienti illimitati',
      'Google Wallet',
      'Scanner QR',
      'Notifiche push',
      'WhatsApp Marketing',
      'Segmentazione clienti',
      'Automazione compleanno',
      'Recensioni Google',
      'Analytics avanzate',
      'Export CSV',
    ],
    locked: [],
    cta: { label: 'Attiva PRO', href: '/dashboard/billing' },
    popular: true,
  },
  {
    id: 'business',
    name: 'BUSINESS',
    price: 99,
    period: 'mese',
    features: [
      'Tutto il piano PRO',
      'Webhook integrations',
      'API pubblica',
      'Multi-sede',
      'White-label',
    ],
    locked: [],
    cta: { label: 'Attiva BUSINESS', href: '/dashboard/billing' },
    popular: false,
  },
]

export default function UpgradePage() {
  const { plan, loading } = usePlan()

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Piani e Prezzi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Scegli il piano piu adatto alla tua attivita
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {PLANS.map((p) => {
            const isCurrentPlan = !loading && plan === p.id
            return (
              <div
                key={p.id}
                className={`bg-white rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col ${
                  p.popular
                    ? 'border-2 border-[#111111]'
                    : 'border border-[#E8E8E8]'
                }`}
              >
                {p.popular && (
                  <div className="mb-4">
                    <span className="bg-[#111111] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      Piu popolare
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">{p.name}</h2>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-gray-500 font-medium">EUR</span>
                    <span className="text-3xl font-bold text-gray-900">{p.price}</span>
                    <span className="text-sm text-gray-500">/{p.period}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2 mb-6">
                  {p.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Check size={14} className="text-green-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                  {p.locked.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Lock size={14} className="text-gray-300 flex-shrink-0" />
                      <span className="text-sm text-gray-400">{feature}</span>
                    </div>
                  ))}
                </div>

                <div>
                  {isCurrentPlan ? (
                    <div className="w-full py-3 rounded-[8px] text-center text-sm font-semibold text-gray-500 border border-[#E0E0E0] bg-[#F5F5F5]">
                      Piano attuale
                    </div>
                  ) : p.cta ? (
                    <Link
                      href={p.cta.href}
                      className="w-full py-3 rounded-[8px] bg-[#111111] text-white text-sm font-semibold hover:bg-[#333333] transition-colors flex items-center justify-center gap-2"
                    >
                      {p.cta.label}
                      <ArrowRight size={14} />
                    </Link>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
