'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { Program, Card } from '@/lib/types'

export default function ProgramDetailPage() {
  const [program, setProgram] = useState<Program | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingCard, setGeneratingCard] = useState(false)
  const [newCardLink, setNewCardLink] = useState<string | null>(null)
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

      // Carica programma
      const { data: programData } = await supabase
        .from('programs')
        .select('*')
        .eq('id', params.id)
        .single()

      if (programData) {
        setProgram(programData)

        // Carica cards di questo programma
        const { data: cardsData } = await supabase
          .from('cards')
          .select('*')
          .eq('program_id', params.id)
          .order('created_at', { ascending: false })

        if (cardsData) {
          setCards(cardsData)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [params.id, router, supabase])

  const generateNewCard = async () => {
    if (!program) return

    setGeneratingCard(true)

    // Crea card holder (cliente anonimo)
    const { data: holderData, error: holderError } = await supabase
      .from('card_holders')
      .insert({ merchant_id: program.merchant_id })
      .select()
      .single()

    if (holderError || !holderData) {
      alert('Errore nella creazione cliente')
      setGeneratingCard(false)
      return
    }

    // Crea card
    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .insert({
        merchant_id: program.merchant_id,
        program_id: program.id,
        card_holder_id: holderData.id,
        wallet_provider: 'none',
      })
      .select()
      .single()

    if (cardError || !cardData) {
      alert('Errore nella creazione card')
      setGeneratingCard(false)
      return
    }

    // Genera link
    const link = `${window.location.origin}/c/${cardData.scan_token}`
    setNewCardLink(link)
    setCards([cardData, ...cards])
    setGeneratingCard(false)
  }

  const copyLink = () => {
    if (newCardLink) {
      navigator.clipboard.writeText(newCardLink)
      alert('Link copiato!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Caricamento...</p>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Programma non trovato</p>
      </div>
    )
  }

  const activeCards = cards.filter(c => c.status === 'active').length
  const rewardsReady = cards.filter(c => c.status === 'reward_ready').length
  const redeemed = cards.filter(c => c.status === 'redeemed').length

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/programs" className="text-indigo-600 hover:text-indigo-700">
              ← Programmi
            </Link>
            <h1 className="text-xl font-bold text-gray-900">{program.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Info Programma */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{program.name}</h2>
              <p className="text-gray-500 mt-1">{program.reward_text}</p>
              <p className="text-sm text-gray-400 mt-2">
                {program.stamps_required} timbri per il premio
              </p>
            </div>
            <div 
              className="w-16 h-16 rounded-xl"
              style={{ backgroundColor: program.primary_color }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Carte Attive</p>
            <p className="text-3xl font-bold text-green-600">{activeCards}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Premi Pronti</p>
            <p className="text-3xl font-bold text-orange-600">{rewardsReady}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Premi Riscattati</p>
            <p className="text-3xl font-bold text-blue-600">{redeemed}</p>
          </div>
        </div>

        {/* Genera Nuova Card */}
        <div className="bg-indigo-50 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Genera Link per Cliente
          </h3>
          
          {newCardLink ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Link da inviare al cliente:</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newCardLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm"
                  />
                  <button
                    onClick={copyLink}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Copia
                  </button>
                </div>
              </div>
              <button
                onClick={() => setNewCardLink(null)}
                className="text-indigo-600 hover:underline text-sm"
              >
                Genera un altro link
              </button>
            </div>
          ) : (
            <button
              onClick={generateNewCard}
              disabled={generatingCard}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {generatingCard ? 'Generazione...' : '+ Genera Nuova Card'}
            </button>
          )}
        </div>

        {/* Lista Cards */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-bold text-gray-900">
              Carte Emesse ({cards.length})
            </h3>
          </div>
          {cards.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nessuna carta emessa ancora
            </div>
          ) : (
            <div className="divide-y">
              {cards.map((card) => (
                <div key={card.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-mono text-sm text-gray-600">
                      {card.scan_token.substring(0, 8)}...
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(card.created_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {card.stamp_count}/{program.stamps_required}
                      </p>
                      <p className="text-xs text-gray-400">timbri</p>
                    </div>
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