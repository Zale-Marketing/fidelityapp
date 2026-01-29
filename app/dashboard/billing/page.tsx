'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function BillingPage() {
  const [merchant, setMerchant] = useState<any>(null)
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
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
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', profile.merchant_id)
          .single()

        if (merchantData) {
          setMerchant(merchantData)
        }

        const { data: programsData } = await supabase
          .from('programs')
          .select('*')
          .eq('merchant_id', profile.merchant_id)

        if (programsData) {
          setPrograms(programsData)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const isPro = merchant?.plan === 'PRO'

  const handleUpgrade = async () => {
    setUpgrading(true)
    
    const { error } = await supabase
      .from('merchants')
      .update({ plan: 'PRO' })
      .eq('id', merchant?.id)

    if (!error) {
      setMerchant({ ...merchant, plan: 'PRO' })
      alert('🎉 Upgrade a PRO completato!')
    } else {
      alert('Errore durante upgrade')
    }

    setUpgrading(false)
  }

  const handleDowngrade = async () => {
    if (programs.length > 5) {
      alert(`Hai ${programs.length} programmi. Devi eliminarne almeno ${programs.length - 5} prima di tornare a FREE.`)
      return
    }

    const confirm = window.confirm('Sei sicuro di voler tornare al piano FREE?')
    if (!confirm) return

    const { error } = await supabase
      .from('merchants')
      .update({ plan: 'FREE' })
      .eq('id', merchant?.id)

    if (!error) {
      setMerchant({ ...merchant, plan: 'FREE' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Caricamento...</p>
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
        {/* Piano Attuale */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">Piano attuale</p>
              <p className="text-3xl font-bold text-gray-900">
                {isPro ? '🚀 PRO' : 'FREE'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-sm">Programmi utilizzati</p>
              <p className="text-2xl font-bold">
                {programs.length} / {isPro ? '∞' : '5'}
              </p>
            </div>
          </div>
        </div>

        {/* Piani */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* FREE */}
          <div className={`bg-white rounded-xl shadow p-6 ${!isPro ? 'ring-2 ring-indigo-600' : ''}`}>
            {!isPro && (
              <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                ATTUALE
              </span>
            )}
            <h2 className="text-2xl font-bold text-gray-900 mt-2">FREE</h2>
            <p className="text-4xl font-bold text-gray-900 mt-4">
              €0 <span className="text-lg font-normal text-gray-500">/mese</span>
            </p>
            
            <ul className="mt-6 space-y-3">
              <li className="flex items-center text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Fino a 5 programmi fidelity
              </li>
              <li className="flex items-center text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Carte illimitate
              </li>
              <li className="flex items-center text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Scanner QR
              </li>
              <li className="flex items-center text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Dashboard base
              </li>
              <li className="flex items-center text-gray-400">
                <span className="mr-2">✗</span>
                Programmi illimitati
              </li>
            </ul>

            {isPro && (
              <button
                onClick={handleDowngrade}
                className="w-full mt-6 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Passa a FREE
              </button>
            )}
          </div>

          {/* PRO */}
          <div className={`bg-white rounded-xl shadow p-6 ${isPro ? 'ring-2 ring-indigo-600' : ''}`}>
            {isPro && (
              <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                ATTUALE
              </span>
            )}
            <h2 className="text-2xl font-bold text-gray-900 mt-2">PRO</h2>
            <p className="text-4xl font-bold text-gray-900 mt-4">
              €19 <span className="text-lg font-normal text-gray-500">/mese</span>
            </p>
            
            <ul className="mt-6 space-y-3">
              <li className="flex items-center text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Programmi illimitati
              </li>
              <li className="flex items-center text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Carte illimitate
              </li>
              <li className="flex items-center text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Scanner QR
              </li>
              <li className="flex items-center text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Dashboard avanzata
              </li>
              <li className="flex items-center text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Supporto prioritario
              </li>
            </ul>

            {!isPro && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="w-full mt-6 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {upgrading ? 'Upgrade in corso...' : 'Passa a PRO'}
              </button>
            )}
          </div>
        </div>

        {/* Nota */}
        <p className="text-center text-gray-400 text-sm mt-8">
          💡 Per ora l'upgrade è gratuito (demo). In futuro verrà collegato Stripe.
        </p>
      </main>
    </div>
  )
}