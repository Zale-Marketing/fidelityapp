'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MetricCard from '@/components/ui/MetricCard'
import EmptyState from '@/components/ui/EmptyState'
import { BarChart2, Users, TrendingUp, CreditCard, Plus, Stamp, Star, Coins, Crown, RefreshCw } from 'lucide-react'

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

const TYPE_ICONS: Record<string, any> = {
  stamps: Stamp,
  points: Star,
  cashback: Coins,
  tiers: Crown,
  subscription: RefreshCw,
}

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchantId, setMerchantId] = useState('')

  const [totalCards, setTotalCards] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [totalStampsMonth, setTotalStampsMonth] = useState(0)
  const [totalRewardsMonth, setTotalRewardsMonth] = useState(0)
  const [newCardsMonth, setNewCardsMonth] = useState(0)

  const [programStats, setProgramStats] = useState<ProgramStat[]>([])
  const [timeline, setTimeline] = useState<DayStat[]>([])
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Statistiche del programma fedeltà</p>
        </div>
        {/* Periodo */}
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-[#111111] text-white'
                  : 'bg-white border border-[#E0E0E0] text-gray-600 hover:bg-[#F5F5F5]'
              }`}
            >
              {p === '7d' ? '7 giorni' : p === '30d' ? '30 giorni' : '90 giorni'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <MetricCard label="Card Totali" value={totalCards} icon={<CreditCard size={20} />} />
        <MetricCard label="Clienti" value={totalCustomers} icon={<Users size={20} />} />
        <MetricCard label="Nuove Card (mese)" value={newCardsMonth} icon={<Plus size={20} />} />
        <MetricCard label="Timbri (mese)" value={totalStampsMonth} icon={<TrendingUp size={20} />} />
        <MetricCard label="Premi (mese)" value={totalRewardsMonth} icon={<BarChart2 size={20} />} />
      </div>

      {/* Grafico Timbri nel tempo */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="font-semibold text-base text-gray-900 mb-4">Attività nel tempo</h2>

        {timeline.every(d => d.stamps === 0 && d.new_cards === 0) ? (
          <EmptyState
            icon={BarChart2}
            title="Nessun dato"
            description="Nessun dato per il periodo selezionato"
          />
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#111111]" />
                <span className="text-gray-600">Timbri / Punti</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#16A34A]" />
                <span className="text-gray-600">Nuove Card</span>
              </div>
            </div>

            <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
              {timeline.map((day) => {
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
                        className="w-2 bg-[#111111] rounded-t transition-all"
                        style={{ height: stampH || 1, minHeight: day.stamps > 0 ? 4 : 0 }}
                        title={`${day.stamps} timbri`}
                      />
                      <div
                        className="w-2 bg-[#16A34A] rounded-t transition-all"
                        style={{ height: cardH || 1, minHeight: day.new_cards > 0 ? 4 : 0 }}
                        title={`${day.new_cards} nuove card`}
                      />
                    </div>
                    {period !== '90d' && (
                      <p className="text-gray-400" style={{ fontSize: '10px' }}>{label}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stats per programma */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="font-semibold text-base text-gray-900 mb-4">Performance per Programma</h2>

        {programStats.length === 0 ? (
          <EmptyState
            icon={BarChart2}
            title="Nessun programma"
            description="Crea il tuo primo programma per vedere le statistiche"
            actionLabel="Crea programma"
            actionHref="/dashboard/programs/new"
          />
        ) : (
          <div className="space-y-3">
            {programStats.map(prog => {
              const TypeIcon = TYPE_ICONS[prog.program_type] || Stamp
              return (
                <Link
                  key={prog.id}
                  href={`/dashboard/programs/${prog.id}`}
                  className="block hover:bg-gray-50/50 rounded-[8px] p-4 transition-colors border border-[#F0F0F0]"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: prog.primary_color + '20' }}
                    >
                      <TypeIcon size={18} style={{ color: prog.primary_color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{prog.name}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1">
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                backgroundColor: prog.primary_color,
                                width: `${Math.min((prog.cards_count / Math.max(totalCards, 1)) * 100, 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-6 flex-shrink-0 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{prog.cards_count}</p>
                        <p className="text-xs text-gray-400">card</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{prog.stamps_this_month}</p>
                        <p className="text-xs text-gray-400">timbri/mese</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{prog.rewards_this_month}</p>
                        <p className="text-xs text-gray-400">premi/mese</p>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-gray-400">
        Vuoi esportare i dati?{' '}
        <Link href="/dashboard/customers" className="text-gray-700 hover:text-gray-900 underline transition-colors">
          Vai a Clienti CRM
        </Link>
      </div>
    </div>
  )
}
