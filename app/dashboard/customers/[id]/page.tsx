'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { Card, Program, StampTransaction } from '@/lib/types'

export default function CustomerDetailPage() {
  const [card, setCard] = useState<Card | null>(null)
  const [program, setProgram] = useState<Program | null>(null)
  const [transactions, setTransactions] = useState<StampTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Carica card
      const { data: cardData } = await supabase
        .from('cards')
        .select('*')
        .eq('id', params.id)
        .single()

      if (cardData) {
        setCard(cardData)

        // Carica programma
        const { data: programData } = await supabase
          .from('programs')
          .select('*')
          .eq('id', cardData.program_id)
          .single()

        if (programData) {
          setProgram(programData)
        }

        // Carica storico timbri
        const { data: transactionsData } = await supabase
          .from('stamp_transactions')
          .select('*')
          .eq('card_id', cardData.id)
          .order('created_at', { ascending: false })

        if (transactionsData) {
          setTransactions(transactionsData)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [params.id, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Caricamento...</p>
      </div>
    )
  }

  if (!card || !program) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Cliente non trovato</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/customers" className="text-indigo-600 hover:text-indigo-700">
              ← Clienti
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Dettaglio Cliente</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Card Info */}
        <div 
          className="rounded-xl p-6 text-white mb-8"
          style={{ backgroundColor: program.primary_color }}
        >
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{program.name}</h2>
              <p className="text-white/80 mt-1">{program.reward_text}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              card.status === 'active' 
                ? 'bg-white/20 text-white'
                : card.status === 'reward_ready'
                ? 'bg-orange-400 text-white'
                : 'bg-gray-400 text-white'
            }`}>
              {card.status === 'active' && 'Attiva'}
              {card.status === 'reward_ready' && '🎉 Premio Pronto!'}
              {card.status === 'redeemed' && 'Riscattata'}
            </span>
          </div>

          {/* Bollini */}
          <div className="mt-6">
            <div className="flex flex-wrap gap-2">
              {[...Array(program.stamps_required)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    i < card.stamp_count 
                      ? 'bg-white text-indigo-600' 
                      : 'bg-white/20'
                  }`}
                >
                  {i < card.stamp_count ? '✓' : ''}
                </div>
              ))}
            </div>
            <p className="mt-4 text-white/80">
              {card.stamp_count} / {program.stamps_required} timbri
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Informazioni Card</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Token</p>
              <p className="font-mono text-gray-900">{card.scan_token}</p>
            </div>
            <div>
              <p className="text-gray-500">Creata il</p>
              <p className="text-gray-900">
                {new Date(card.created_at).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Ultimo aggiornamento</p>
              <p className="text-gray-900">
                {new Date(card.updated_at).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Wallet</p>
              <p className="text-gray-900">
                {card.wallet_provider === 'apple' && '🍎 Apple Wallet'}
                {card.wallet_provider === 'google' && '🤖 Google Wallet'}
                {card.wallet_provider === 'none' && 'Non aggiunto'}
                {!card.wallet_provider && 'Non aggiunto'}
              </p>
            </div>
          </div>
        </div>

        {/* Storico Timbri */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-bold text-gray-900">
              Storico Timbri ({transactions.length})
            </h3>
          </div>
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nessun timbro ancora
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'add' 
                        ? 'bg-green-100 text-green-600'
                        : tx.type === 'remove'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-orange-100 text-orange-600'
                    }`}>
                      {tx.type === 'add' && '+1'}
                      {tx.type === 'remove' && '-1'}
                      {tx.type === 'redeem' && '🎁'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {tx.type === 'add' && 'Timbro aggiunto'}
                        {tx.type === 'remove' && 'Timbro rimosso'}
                        {tx.type === 'redeem' && 'Premio riscattato'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}