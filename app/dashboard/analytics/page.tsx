'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MetricCard from '@/components/ui/MetricCard'
import EmptyState from '@/components/ui/EmptyState'
import { BarChart2, Users, TrendingUp, CreditCard, Plus, Stamp, Star, Coins, Crown, RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

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

  // ANALYTICS-01: active customers with trend
  const [activeCount, setActiveCount] = useState(0)
  const [trend, setTrend] = useState<number | null>(null)
  // ANALYTICS-03: return rate
  const [returnRate, setReturnRate] = useState<number | null>(null)
  // ANALYTICS-04: all-time rewards redeemed
  const [totalRewardsAllTime, setTotalRewardsAllTime] = useState(0)
  // ANALYTICS-05: segment distribution for pie chart
  const [segCounts, setSegCounts] = useState({ active: 0, dormant: 0, lost: 0 })

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

    // ANALYTICS-01: active customers with 30-day trend
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString().split('T')[0]
    const todayStr = now.toISOString().split('T')[0]

    const [
      { count: activeNow },
      { count: activePrev },
    ] = await Promise.all([
      supabase.from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', mid)
        .gte('last_use_date', thirtyDaysAgo)
        .lte('last_use_date', todayStr),
      supabase.from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', mid)
        .gte('last_use_date', sixtyDaysAgo)
        .lt('last_use_date', thirtyDaysAgo),
    ])
    setActiveCount(activeNow || 0)
    const trendVal = (activePrev && activePrev > 0)
      ? Math.round((((activeNow || 0) - activePrev) / activePrev) * 100)
      : null
    setTrend(trendVal)

    // ANALYTICS-03: return rate from stamp_transactions
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString()
    const { data: txData } = await supabase
      .from('stamp_transactions')
      .select('card_id, created_at')
      .eq('merchant_id', mid)
      .eq('type', 'add')
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: true })

    const byCard = new Map<string, Date[]>()
    txData?.forEach(tx => {
      const dates = byCard.get(tx.card_id) || []
      dates.push(new Date(tx.created_at))
      byCard.set(tx.card_id, dates)
    })
    let returned = 0
    let eligible = 0
    byCard.forEach(dates => {
      if (dates.length < 2) return
      eligible++
      const diffDays = (dates[1].getTime() - dates[0].getTime()) / 86400000
      if (diffDays <= 30) returned++
    })
    setReturnRate(eligible > 0 ? Math.round((returned / eligible) * 100) : null)

    // ANALYTICS-04: all-time rewards redeemed
    const { count: allTimeRewards } = await supabase
      .from('stamp_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', mid)
      .in('type', ['redeem'])
    const { count: allTimeRewards2 } = await supabase
      .from('stamp_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', mid)
      .in('transaction_type', ['reward_redeemed', 'points_redeemed', 'cashback_redeem'])
    setTotalRewardsAllTime((allTimeRewards || 0) + (allTimeRewards2 || 0))

    // ANALYTICS-05: customer segment distribution for pie chart
    const todayForSeg = now.toISOString().split('T')[0]
    const thirtyAgoForSeg = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
    const ninetyAgoForSeg = new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0]

    const [
      { count: segActive },
      { count: segDormant },
      { count: segLost },
    ] = await Promise.all([
      supabase.from('cards').select('*', { count: 'exact', head: true })
        .eq('merchant_id', mid).gte('last_use_date', thirtyAgoForSeg),
      supabase.from('cards').select('*', { count: 'exact', head: true })
        .eq('merchant_id', mid).gte('last_use_date', ninetyAgoForSeg).lt('last_use_date', thirtyAgoForSeg),
      supabase.from('cards').select('*', { count: 'exact', head: true })
        .eq('merchant_id', mid).lt('last_use_date', ninetyAgoForSeg),
    ])
    setSegCounts({ active: segActive || 0, dormant: segDormant || 0, lost: segLost || 0 })

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
          <p className="text-sm text-gray-500 mt-1">Statistiche del programma fedelta</p>
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

      {/* KPI Cards Row 1: existing 4 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <MetricCard label="Card Totali" value={totalCards} icon={<CreditCard size={20} />} />
        <MetricCard label="Clienti" value={totalCustomers} icon={<Users size={20} />} />
        <MetricCard label="Nuove Card (mese)" value={newCardsMonth} icon={<Plus size={20} />} />
        <MetricCard label="Timbri (mese)" value={totalStampsMonth} icon={<TrendingUp size={20} />} />
      </div>

      {/* KPI Cards Row 2: new analytics KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* ANALYTICS-01: active customers with trend */}
        <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-gray-500 mb-1">Clienti Attivi (30gg)</p>
          <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          {trend !== null && (
            <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend}% vs mese scorso
            </p>
          )}
          {trend === null && <p className="text-xs mt-1 text-gray-400">Nessun dato mese scorso</p>}
        </div>
        {/* ANALYTICS-03: return rate */}
        <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-gray-500 mb-1">Tasso di Ritorno</p>
          <p className="text-2xl font-bold text-gray-900">{returnRate !== null ? `${returnRate}%` : '—'}</p>
          <p className="text-xs mt-1 text-gray-400">Tornati entro 30gg</p>
        </div>
        {/* ANALYTICS-04: all-time rewards */}
        <MetricCard label="Premi Riscattati (totale)" value={totalRewardsAllTime} icon={<BarChart2 size={20} />} />
        {/* existing: Premi (mese) */}
        <MetricCard label="Premi (mese)" value={totalRewardsMonth} icon={<BarChart2 size={20} />} />
      </div>

      {/* ANALYTICS-02: recharts BarChart replacing manual div chart */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="font-semibold text-base text-gray-900 mb-4">Timbri / Punti per giorno</h2>

        {timeline.every(d => d.stamps === 0 && d.new_cards === 0) ? (
          <EmptyState
            icon={BarChart2}
            title="Nessun dato"
            description="Nessun dato per il periodo selezionato"
          />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickFormatter={(v: string) => {
                  const d = new Date(v)
                  return `${d.getDate()}/${d.getMonth() + 1}`
                }}
                interval={period === '30d' ? 4 : period === '7d' ? 0 : 14}
              />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E8E8', boxShadow: 'none' }}
                labelFormatter={(label) => new Date(String(label)).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
              />
              <Bar dataKey="stamps" fill="#111111" radius={[4, 4, 0, 0]} maxBarSize={20} name="Timbri / Punti" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ANALYTICS-05: PieChart for customer segment distribution */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="font-semibold text-base text-gray-900 mb-4">Distribuzione Clienti</h2>
        {(segCounts.active + segCounts.dormant + segCounts.lost) === 0 ? (
          <EmptyState icon={Users} title="Nessun cliente" description="Nessun dato di attivita cliente disponibile" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Attivi', value: segCounts.active, color: '#16A34A' },
                  { name: 'Dormienti', value: segCounts.dormant, color: '#F59E0B' },
                  { name: 'Persi', value: segCounts.lost, color: '#DC2626' },
                ]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
              >
                {[
                  { name: 'Attivi', value: segCounts.active, color: '#16A34A' },
                  { name: 'Dormienti', value: segCounts.dormant, color: '#F59E0B' },
                  { name: 'Persi', value: segCounts.lost, color: '#DC2626' },
                ].map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E8E8', boxShadow: 'none' }}
              />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
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
