'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Profile, Merchant, Program, Card } from '@/lib/types'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      // Verifica utente loggato
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Carica profilo
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)

        // Carica merchant
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', profileData.merchant_id)
          .single()

        if (merchantData) {
          setMerchant(merchantData)
        }

        // Carica programmi
        const { data: programsData } = await supabase
          .from('programs')
          .select('*')
          .eq('merchant_id', profileData.merchant_id)

        if (programsData) {
          setPrograms(programsData)
        }

        // Carica cards
        const { data: cardsData } = await supabase
          .from('cards')
          .select('*')
          .eq('merchant_id', profileData.merchant_id)

        if (cardsData) {
          setCards(cardsData)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Caricamento...</p>
      </div>
    )
  }

  const totalStamps = cards.reduce((sum, card) => sum + card.stamp_count, 0)
  const rewardsReady = cards.filter(c => c.status === 'reward_ready').length

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{merchant?.name}</h1>
            <p className="text-sm text-gray-500">
              Piano: <span className="font-semibold">{merchant?.plan}</span>
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">{profile?.email}</span>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Programmi</p>
            <p className="text-3xl font-bold text-indigo-600">{programs.length}</p>
            <p className="text-xs text-gray-400">max 5 (FREE)</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Carte Attive</p>
            <p className="text-3xl font-bold text-green-600">{cards.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Timbri Totali</p>
            <p className="text-3xl font-bold text-blue-600">{totalStamps}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Premi da Riscattare</p>
            <p className="text-3xl font-bold text-orange-600">{rewardsReady}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/dashboard/programs"
            className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition group"
          >
            <div className="text-3xl mb-2">🎯</div>
            <h2 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600">
              Programmi Fidelity
            </h2>
            <p className="text-gray-500">Crea e gestisci i tuoi programmi</p>
          </Link>

          <Link
            href="/dashboard/customers"
            className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition group"
          >
            <div className="text-3xl mb-2">👥</div>
            <h2 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600">
              Clienti
            </h2>
            <p className="text-gray-500">Visualizza clienti e progressi</p>
          </Link>

          <Link
            href="/stamp"
            className="bg-indigo-600 p-6 rounded-xl shadow hover:shadow-lg transition group"
          >
            <div className="text-3xl mb-2">📷</div>
            <h2 className="text-xl font-bold text-white">
              Scanner Timbri
            </h2>
            <p className="text-indigo-200">Apri lo scanner QR</p>
          </Link>
        </div>
      </main>
    </div>
  )
}