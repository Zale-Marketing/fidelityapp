'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type DashboardStats = {
  totalPrograms: number
  totalCards: number
  totalCustomers: number
  stampsThisMonth: number
  rewardsThisMonth: number
  activeCards: number
}

type RecentActivity = {
  id: string
  type: 'stamp' | 'redeem' | 'new_card' | 'new_customer'
  description: string
  time: string
  program?: string
}

export default function DashboardPage() {
  const [merchantName, setMerchantName] = useState('')
  const [stats, setStats] = useState<DashboardStats>({
    totalPrograms: 0,
    totalCards: 0,
    totalCustomers: 0,
    stampsThisMonth: 0,
    rewardsThisMonth: 0,
    activeCards: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('merchant_id, merchants(name)')
      .eq('id', user.id)
      .single()

    if (!profile?.merchant_id) {
      router.push('/register')
      return
    }

    setMerchantName((profile.merchants as any)?.name || 'La tua attività')
    const merchantId = profile.merchant_id

    // Carica statistiche base
    const [
      { count: programsCount },
      { count: cardsCount },
      { count: customersCount },
      { count: activeCardsCount },
      { data: transactionsData }
    ] = await Promise.all([
      supabase.from('programs').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId),
      supabase.from('cards').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId),
      supabase.from('card_holders').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId),
      supabase.from('cards').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId).eq('status', 'active'),
      supabase.from('stamp_transactions')
        .select('*')
        .eq('merchant_id', merchantId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    ])

    // Conta attività del mese
    let stampsThisMonth = 0
    let rewardsThisMonth = 0

    if (transactionsData) {
      transactionsData.forEach(t => {
        if (t.transaction_type === 'stamp' || t.type === 'add') {
          stampsThisMonth += t.delta || t.stamps_added || 1
        }
        if (t.transaction_type === 'reward_redeemed' || 
            t.transaction_type === 'points_redeemed' || 
            t.transaction_type === 'cashback_redeem' ||
            t.type === 'redeem') {
          rewardsThisMonth++
        }
      })
    }

    setStats({
      totalPrograms: programsCount || 0,
      totalCards: cardsCount || 0,
      totalCustomers: customersCount || 0,
      stampsThisMonth,
      rewardsThisMonth,
      activeCards: activeCardsCount || 0
    })

    // ========== CARICA ATTIVITÀ RECENTE ==========
    const { data: recentTx, error: recentError } = await supabase
      .from('stamp_transactions')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('=== DEBUG ATTIVITÀ ===')
    console.log('recentTx:', recentTx)
    console.log('recentError:', recentError)

    if (recentTx && recentTx.length > 0) {
      // Carica i nomi dei programmi
      const programIds = [...new Set(recentTx.map(t => t.program_id).filter(Boolean))]
      
      const { data: programsData } = await supabase
        .from('programs')
        .select('id, name, program_type')
        .in('id', programIds)
      
      const programsMap = new Map(programsData?.map(p => [p.id, p]) || [])

      // Carica i nomi dei clienti tramite le cards
      const cardIds = [...new Set(recentTx.map(t => t.card_id).filter(Boolean))]
      
      const { data: cardsData } = await supabase
        .from('cards')
        .select('id, card_holder_id')
        .in('id', cardIds)

      const holderIds = [...new Set(cardsData?.map(c => c.card_holder_id).filter(Boolean))]
      
      let holdersMap = new Map()
      if (holderIds.length > 0) {
        const { data: holdersData } = await supabase
          .from('card_holders')
          .select('id, full_name')
          .in('id', holderIds)
        
        holdersMap = new Map(holdersData?.map(h => [h.id, h.full_name]) || [])
      }

      const cardToHolderMap = new Map(cardsData?.map(c => [c.id, c.card_holder_id]) || [])

      // Costruisci le attività
      const activities: RecentActivity[] = recentTx.map(tx => {
        const holderId = cardToHolderMap.get(tx.card_id)
        const customerName = holderId ? (holdersMap.get(holderId) || 'Cliente') : 'Cliente'
        const program = programsMap.get(tx.program_id)
        const programName = program?.name || ''
        const txType = tx.transaction_type || tx.type

        let actType: 'stamp' | 'redeem' | 'new_card' | 'new_customer' = 'stamp'
        let description = ''

        if (txType === 'stamp' || txType === 'add') {
          actType = 'stamp'
          description = `+${tx.delta || tx.stamps_added || 1} bollino a ${customerName}`
        } else if (txType === 'points') {
          actType = 'stamp'
          description = `+${tx.points_earned || 0} punti a ${customerName} (€${tx.amount_spent || 0})`
        } else if (txType === 'cashback') {
          actType = 'stamp'
          description = `+€${(tx.cashback_earned || 0).toFixed(2)} cashback a ${customerName}`
        } else if (txType === 'tier_spend') {
          actType = 'stamp'
          description = `€${tx.amount_spent || 0} registrati per ${customerName}`
        } else if (txType === 'subscription_use') {
          actType = 'stamp'
          description = `Abbonamento usato da ${customerName}`
        } else if (txType === 'reward_redeemed' || txType === 'redeem') {
          actType = 'redeem'
          description = `🎁 Premio riscattato da ${customerName}`
        } else if (txType === 'points_redeemed') {
          actType = 'redeem'
          description = `🎁 Premio punti riscattato da ${customerName}`
        } else if (txType === 'cashback_redeem') {
          actType = 'redeem'
          description = `💰 Cashback riscattato da ${customerName}`
        } else {
          description = `Attività di ${customerName}`
        }

        return {
          id: tx.id,
          type: actType,
          description,
          time: new Date(tx.created_at).toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }),
          program: programName
        }
      })

      console.log('activities finali:', activities)
      setRecentActivity(activities)
    }

    // ========== TOP CLIENTI ==========
    const { data: topCardsData } = await supabase
      .from('cards')
      .select('id, current_stamps, stamp_count, points_balance, total_spent, card_holder_id')
      .eq('merchant_id', merchantId)
      .not('card_holder_id', 'is', null)

    if (topCardsData && topCardsData.length > 0) {
      const holderIds = [...new Set(topCardsData.map(c => c.card_holder_id).filter(Boolean))]
      const { data: holdersData } = await supabase
        .from('card_holders')
        .select('id, full_name')
        .in('id', holderIds)

      const holdersMap = new Map(holdersData?.map(h => [h.id, h]) || [])

      const customerMap = new Map<string, { id: string, full_name: string, total_stamps: number, total_spent: number }>()

      topCardsData.forEach(card => {
        const holder = holdersMap.get(card.card_holder_id)
        if (!holder) return

        const existing = customerMap.get(holder.id)
        const stamps = card.current_stamps || card.stamp_count || 0
        const spent = Number(card.total_spent) || 0

        if (existing) {
          existing.total_stamps += stamps
          existing.total_spent += spent
        } else {
          customerMap.set(holder.id, {
            id: holder.id,
            full_name: holder.full_name || 'Cliente Anonimo',
            total_stamps: stamps,
            total_spent: spent
          })
        }
      })

      const aggregatedCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.total_spent - a.total_spent || b.total_stamps - a.total_stamps)
        .slice(0, 5)

      setTopCustomers(aggregatedCustomers)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">👋 Ciao, {merchantName}!</h1>
            <p className="text-gray-500">Ecco come sta andando la tua attività</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/stamp"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              📷 Scanner
            </Link>
            <Link
              href="/dashboard/settings"
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
            >
              ⚙️
            </Link>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-gray-500 text-xs uppercase">Programmi</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalPrograms}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-gray-500 text-xs uppercase">Card Attive</p>
            <p className="text-3xl font-bold text-indigo-600">{stats.activeCards}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-gray-500 text-xs uppercase">Clienti</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalCustomers}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-gray-500 text-xs uppercase">Timbri Mese</p>
            <p className="text-3xl font-bold text-green-600">{stats.stampsThisMonth}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-gray-500 text-xs uppercase">Premi Mese</p>
            <p className="text-3xl font-bold text-purple-600">{stats.rewardsThisMonth}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-gray-500 text-xs uppercase">Card Totali</p>
            <p className="text-3xl font-bold text-gray-600">{stats.totalCards}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/dashboard/programs"
            className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 rounded-xl hover:shadow-lg transition-all"
          >
            <span className="text-3xl">🎯</span>
            <h3 className="font-bold mt-2">Programmi</h3>
            <p className="text-indigo-100 text-sm">Gestisci le tue carte fedeltà</p>
          </Link>
          
          <Link
            href="/dashboard/customers"
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl hover:shadow-lg transition-all"
          >
            <span className="text-3xl">👥</span>
            <h3 className="font-bold mt-2">Clienti CRM</h3>
            <p className="text-blue-100 text-sm">Gestisci i tuoi clienti</p>
          </Link>
          
          <Link
            href="/dashboard/notifications"
            className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl hover:shadow-lg transition-all"
          >
            <span className="text-3xl">📢</span>
            <h3 className="font-bold mt-2">Notifiche</h3>
            <p className="text-purple-100 text-sm">Invia messaggi ai clienti</p>
          </Link>
          
          <Link
            href="/dashboard/analytics"
            className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl hover:shadow-lg transition-all"
          >
            <span className="text-3xl">📊</span>
            <h3 className="font-bold mt-2">Analytics</h3>
            <p className="text-green-100 text-sm">Statistiche dettagliate</p>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4">⚡ Attività Recente</h2>
            {recentActivity.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nessuna attività ancora</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'stamp' ? 'bg-green-100' :
                      activity.type === 'redeem' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {activity.type === 'stamp' && '➕'}
                      {activity.type === 'redeem' && '🎁'}
                      {activity.type === 'new_card' && '💳'}
                      {activity.type === 'new_customer' && '👤'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{activity.description}</p>
                      <p className="text-xs text-gray-400">{activity.program}</p>
                    </div>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">🏆 Top Clienti</h2>
              <Link href="/dashboard/customers" className="text-indigo-600 text-sm hover:underline">
                Vedi tutti →
              </Link>
            </div>
            {topCustomers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nessun cliente ancora</p>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((customer, index) => (
                  <Link
                    key={customer.id}
                    href={`/dashboard/customers/${customer.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{customer.full_name || 'Cliente Anonimo'}</p>
                      <p className="text-xs text-gray-400">
                        {customer.total_stamps > 0 ? `${customer.total_stamps} bollini` : ''}
                        {customer.total_stamps > 0 && customer.total_spent > 0 ? ' • ' : ''}
                        {customer.total_spent > 0 ? `€${customer.total_spent.toFixed(0)} spesi` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      {customer.total_spent > 0 ? (
                        <>
                          <p className="font-bold text-indigo-600">€{customer.total_spent.toFixed(0)}</p>
                          <p className="text-xs text-gray-400">spesi</p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-indigo-600">{customer.total_stamps || 0}</p>
                          <p className="text-xs text-gray-400">bollini</p>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alert se non ci sono programmi */}
        {stats.totalPrograms === 0 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <span className="text-4xl">🚀</span>
            <h3 className="font-bold text-lg mt-2">Inizia Subito!</h3>
            <p className="text-gray-600 mb-4">Crea il tuo primo programma fedeltà in 2 minuti</p>
            <Link
              href="/dashboard/programs/new"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Crea Programma →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}