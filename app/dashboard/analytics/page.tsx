'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type DayStat = {
  date: string
  stamps: number
  rewards: number
  new_cards: number
}

type ProgramStat = {
  id: string
  name: string
  program_type: string
  primary_color: string
  cards_count: number
  stamps_this_month: number
  rewards_this_month: number
  conversion_rate: number
}

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchantId, setMerchantId] = useState('')

  // Overview
  const [totalCards, setTotalCards] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [totalStampsMonth, setTotalStampsMonth] = useState(0)
  const [totalRewardsMonth, setTotalRewardsMonth] = useState(0)
  const [newCardsMonth, setNewCardsMonth] = useState(0)

  // Per programma
  const [programStats, setProgramStats] = useState<ProgramStat[]>([])

  // Timeline ultimi 30 giorni
  const [timeline, setTimeline] = useState<DayStat[]>([])

  // Periodo selezionato
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    loadAnalytics()
  }, [period])

  async function loadAnalytics() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('merchant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.merchant_id) { router.push('/register'); return }

    const mid = profile.merchant_id
    setMerchantId(mid)

    const now = new Date()
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Conteggi base
    const [
      { count: cardsCount },
      { count: customersCount },
      { count: newCardsCount },
    ] = await Promise.all([
      supabase.from('cards').select('*', { count: 'exact', head: true }).eq('merchant_id', mid),
      supabase.from('card_holders').select('*', { count: 'exact', head: true }).eq('merchant_id', mid),
      supabase.from('cards').select('*', { count: 'exact', head: true })
        .eq('merchant_id', mid)
        .gte('created_at', monthStart.toISOString()),
    ])

    setTotalCards(cardsCount || 0)
    setTotalCustomers(customersCount || 0)
    setNewCardsMonth(newCardsCount || 0)

    // Transazioni del mese
    const { data: monthTx } = await supabase
      .from('stamp_transactions')
      .select('type, transaction_type, delta, points_earned, created_at')
      .eq('merchant_id', mid)
      .gte('created_at', monthStart.toISOString())

    let stamps = 0
    let rewards = 0
    if (monthTx) {
      monthTx.forEach(tx => {
        const t = tx.transaction_type || tx.type
        if (['stamp', 'add', 'points', 'cashback', 'tier_spend', 'subscription_use'].includes(t)) {
          stamps += Math.abs(tx.delta || tx.points_earned || 1)
        }
        if (['reward_redeemed', 'redeem', 'points_redeemed', 'cashback_redeem'].includes(t)) {
          rewards++
        }
      })
    }
    setTotalStampsMonth(stamps)
    setTotalRewardsMonth(rewards)

    // Timeline per periodo selezionato
    const { data: periodTx } = await supabase
      .from('stamp_transactions')
      .select('type, transaction_type, delta, points_earned, created_at')
      .eq('merchant_id', mid)
      .gte('created_at', startDate.toISOString())
      .order('created_at')

    const { data: periodCards } = await supabase
      .from('cards')
      .select('created_at')
      .eq('merchant_id', mid)
      .gte('created_at', startDate.toISOString())

    // Raggruppa per giorno
    const dayMap = new Map<string, DayStat>()
    for (let d = 0; d < days; d++) {
      const date = new Date(now.getTime() - (days - 1 - d) * 24 * 60 * 60 * 1000)
      const key = date.toISOString().split('T')[0]
      dayMap.set(key, { date: key, stamps: 0, rewards: 0, new_cards: 0 })
    }

    periodTx?.forEach(tx => {
      const key = tx.created_at.split('T')[0]
      const day = dayMap.get(key)
      if (!day) return
      const t = tx.transaction_type || tx.type
      if (['stamp', 'add', 'points', 'cashback', 'tier_spend', 'subscription_use'].includes(t)) {
        day.stamps += Math.abs(tx.delta || tx.points_earned || 1)
      }
      if (['reward_redeemed', 'redeem', 'points_redeemed', 'cashback_redeem'].includes(t)) {
        day.rewards++
      }
    })

    periodCards?.forEach(card => {
      const key = card.created_at.split('T')[0]
      const day = dayMap.get(key)
      if (day) day.new_cards++
    })

    setTimeline(Array.from(dayMap.values()))

    // Stats per programma
    const { data: progs } = await supabase
      .from('programs')
      .select('id, name, program_type, primary_color')
      .eq('merchant_id', mid)

    if (progs) {
      const progStats: ProgramStat[] = []

      for (const prog of progs) {
        const [
          { count: pCards },
          { data: pTx }
        ] = await Promise.all([
          supabase.from('cards').select('*', { count: 'exact', head: true }).eq('program_id', prog.id),
          supabase.from('stamp_transactions')
            .select('type, transaction_type, delta')
            .eq('program_id', prog.id)
            .gte('created_at', monthStart.toISOString()),
        ])

        let pStamps = 0
        let pRewards = 0
        pTx?.forEach(tx => {
          const t = tx.transaction_type || tx.type
          if (['stamp', 'add', 'points', 'cashback', 'tier_spend', 'subscription_use'].includes(t)) pStamps++
          if (['reward_redeemed', 'redeem', 'points_redeemed', 'cashback_redeem'].includes(t)) pRewards++
        })

        progStats.push({
          id: prog.id,
          name: prog.name,
          program_type: prog.program_type,
          primary_color: prog.primary_color,
          cards_count: pCards || 0,
          stamps_this_month: pStamps,
          rewards_this_month: pRewards,
          conversion_rate: pStamps > 0 ? Math.round((pRewards / pStamps) * 100) : 0,
        })
      }

      setProgramStats(progStats.sort((a, b) => b.cards_count - a.cards_count))
    }

    setLoading(false)
  }

  const maxStamps = Math.max(...timeline.map(d => d.stamps), 1)
  const maxCards = Math.max(...timeline.map(d => d.new_cards), 1)

  const TYPE_ICONS: Record<string, string> = {
    stamps: '🎫', points: '⭐', cashback: '💰', tiers: '👑', subscription: '🔄',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-indigo-600 hover:underline text-sm">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold text-gray-900">📊 Analytics</h1>
          </div>
          {/* Periodo */}
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  period === p
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p === '7d' ? '7 giorni' : p === '30d' ? '30 giorni' : '90 giorni'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Card Totali</p>
            <p className="text-3xl font-bold text-gray-900">{totalCards}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Clienti</p>
            <p className="text-3xl font-bold text-blue-600">{totalCustomers}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Nuove Card (mese)</p>
            <p className="text-3xl font-bold text-green-600">{newCardsMonth}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Timbri (mese)</p>
            <p className="text-3xl font-bold text-indigo-600">{totalStampsMonth}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Premi (mese)</p>
            <p className="text-3xl font-bold text-purple-600">{totalRewardsMonth}</p>
          </div>
        </div>

        {/* Grafico Timbri nel tempo */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-bold text-lg text-gray-900 mb-4">Attività nel tempo</h2>

          {timeline.every(d => d.stamps === 0 && d.new_cards === 0) ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📈</p>
              <p>Nessun dato per il periodo selezionato</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Legenda */}
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-gray-600">Timbri / Punti</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-gray-600">Nuove Card</span>
                </div>
              </div>

              {/* Barchart semplice */}
              <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
                {timeline.map((day, i) => {
                  const stampH = maxStamps > 0 ? Math.round((day.stamps / maxStamps) * 120) : 0
                  const cardH = maxCards > 0 ? Math.round((day.new_cards / maxCards) * 120) : 0
                  const label = new Date(day.date).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: period === '90d' ? 'short' : '2-digit'
                  })

                  return (
                    <div key={day.date} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: period === '90d' ? '8px' : '20px' }}>
                      <div className="flex items-end gap-px h-32">
                        <div
                          className="w-2 bg-indigo-500 rounded-t transition-all"
                          style={{ height: stampH || 1, minHeight: day.stamps > 0 ? 4 : 0 }}
                          title={`${day.stamps} timbri`}
                        />
                        <div
                          className="w-2 bg-green-500 rounded-t transition-all"
                          style={{ height: cardH || 1, minHeight: day.new_cards > 0 ? 4 : 0 }}
                          title={`${day.new_cards} nuove card`}
                        />
                      </div>
                      {period !== '90d' && (
                        <p className="text-xs text-gray-400" style={{ fontSize: '10px' }}>{label}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Stats per programma */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-lg text-gray-900 mb-4">Performance per Programma</h2>

          {programStats.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Nessun programma trovato.</p>
              <Link href="/dashboard/programs/new" className="text-indigo-600 hover:underline mt-2 block">
                Crea il primo programma →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {programStats.map(prog => (
                <Link
                  key={prog.id}
                  href={`/dashboard/programs/${prog.id}`}
                  className="block hover:bg-gray-50 rounded-xl p-4 transition-colors border border-gray-100"
                >
                  <div className="flex items-center gap-4">
                    {/* Color + icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: prog.primary_color + '20' }}
                    >
                      {TYPE_ICONS[prog.program_type] || '🎫'}
                    </div>

                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{prog.name}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1">
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                backgroundColor: prog.primary_color,
                                width: `${Math.min((prog.cards_count / Math.max(totalCards, 1)) * 100, 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 flex-shrink-0 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{prog.cards_count}</p>
                        <p className="text-xs text-gray-400">card</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-indigo-600">{prog.stamps_this_month}</p>
                        <p className="text-xs text-gray-400">timbri/mese</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-purple-600">{prog.rewards_this_month}</p>
                        <p className="text-xs text-gray-400">premi/mese</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Export hint */}
        <div className="mt-6 text-center text-sm text-gray-400">
          Vuoi esportare i dati?{' '}
          <Link href="/dashboard/customers" className="text-indigo-600 hover:underline">
            Vai a Clienti CRM →
          </Link>
        </div>
      </main>
    </div>
  )
}
