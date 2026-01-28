'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Card, Program } from '@/lib/types'

type CardWithProgram = Card & { program: Program }

export default function CustomersPage() {
  const [cards, setCards] = useState<CardWithProgram[]>([])
  const [loading, setLoading] = useState(true)
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
        const { data: cardsData } = await supabase
          .from('cards')
          .select(`
            *,
            program:programs(*)
          `)
          .eq('merchant_id', profile.merchant_id)
          .order('created_at', { ascending: false })

        if (cardsData) {
          setCards(cardsData as CardWithProgram[])
        }
      }

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

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
            <h1 className="text-xl font-bold text-gray-900">Clienti</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {cards.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Nessun cliente ancora
            </h2>
            <p className="text-gray-500 mb-6">
              Genera delle card dai tuoi programmi per avere clienti
            </p>
            <Link
              href="/dashboard/programs"
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 inline-block"
            >
              Vai ai Programmi
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Card
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Programma
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Progressi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-600">
                        {card.scan_token.substring(0, 12)}...
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: card.program.primary_color }}
                        />
                        <span className="text-gray-900">{card.program.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ 
                              width: `${(card.stamp_count / card.program.stamps_required) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {card.stamp_count}/{card.program.stamps_required}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        card.status === 'active' 
                          ? 'bg-green-100 text-green-700'
                          : card.status === 'reward_ready'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {card.status === 'active' && 'Attiva'}
                        {card.status === 'reward_ready' && 'Premio!'}
                        {card.status === 'redeemed' && 'Riscattata'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(card.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/customers/${card.id}`}
                        className="text-indigo-600 hover:text-indigo-700 text-sm"
                      >
                        Dettagli →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}