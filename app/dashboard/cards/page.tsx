'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import MetricCard from '@/components/ui/MetricCard'
import EmptyState from '@/components/ui/EmptyState'
import UpgradePrompt from '@/components/ui/UpgradePrompt'
import { usePlan } from '@/lib/hooks/usePlan'
import { CreditCard, Send, X, Download } from 'lucide-react'

type Segment = 'all' | 'active' | 'dormant' | 'lost'

type CardRow = {
  id: string
  last_use_date: string | null
  updated_at: string | null
  created_at: string
  status: string
  card_holder_id: string | null
  program_id: string | null
  stamp_count: number | null
  current_stamps: number | null
  points_balance: number | null
  cashback_balance: number | null
  total_spent: number | null
}

type CardHolder = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
}

type CardWithHolder = CardRow & {
  holder: CardHolder | null
  program_name: string | null
}

function daysSince(card: { last_use_date: string | null; created_at: string }): number {
  const dateStr = card.last_use_date || card.created_at
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function getSegment(card: CardWithHolder): 'active' | 'dormant' | 'lost' {
  const days = daysSince(card)
  if (days <= 30) return 'active'
  if (days <= 90) return 'dormant'
  return 'lost'
}

const SEGMENT_LABELS: Record<string, string> = {
  all: 'Tutti',
  active: 'Attivi',
  dormant: 'Dormienti',
  lost: 'Persi',
}

const SEGMENT_BADGE_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  dormant: 'bg-yellow-100 text-yellow-700',
  lost: 'bg-red-100 text-red-700',
}

export default function CardsSegmentationPage() {
  const router = useRouter()
  const supabase = createClient()

  const [cards, setCards] = useState<CardWithHolder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSegment, setActiveSegment] = useState<Segment>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showSendModal, setShowSendModal] = useState(false)
  const [notifMessage, setNotifMessage] = useState('')
  const [notifHeader, setNotifHeader] = useState('Messaggio speciale')
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState<number | null>(null)

  const { isFree, isPro, loading: planLoading } = usePlan()

  useEffect(() => {
    async function load() {
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

      if (!profile?.merchant_id) {
        setLoading(false)
        return
      }

      const merchantId = profile.merchant_id

      // Fetch active cards with card_holder assigned
      const { data: rawCards } = await supabase
        .from('cards')
        .select('id, last_use_date, updated_at, created_at, status, card_holder_id, program_id, stamp_count, current_stamps, points_balance, cashback_balance, total_spent')
        .eq('merchant_id', merchantId)
        .eq('status', 'active')
        .not('card_holder_id', 'is', null)
        .order('created_at', { ascending: false })

      if (!rawCards || rawCards.length === 0) {
        setCards([])
        setLoading(false)
        return
      }

      // Fetch card holders separately
      const holderIds = [...new Set(rawCards.map(c => c.card_holder_id as string))]
      const { data: holders } = await supabase
        .from('card_holders')
        .select('id, full_name, email, phone')
        .in('id', holderIds)

      const holderMap = new Map<string, CardHolder>()
      if (holders) {
        for (const h of holders) {
          holderMap.set(h.id, h)
        }
      }

      // Fetch programs separately to get names
      const programIds = [...new Set(rawCards.filter(c => c.program_id).map(c => c.program_id as string))]
      const programMap = new Map<string, string>()
      if (programIds.length > 0) {
        const { data: programs } = await supabase
          .from('programs')
          .select('id, name')
          .in('id', programIds)
        if (programs) {
          for (const p of programs) {
            programMap.set(p.id, p.name)
          }
        }
      }

      const merged: CardWithHolder[] = rawCards.map(c => ({
        ...c,
        holder: c.card_holder_id ? (holderMap.get(c.card_holder_id) || null) : null,
        program_name: c.program_id ? (programMap.get(c.program_id) || null) : null,
      }))

      setCards(merged)
      setLoading(false)
    }

    load()
  }, [])

  // Counts computed from full unfiltered list
  const counts = {
    all: cards.length,
    active: cards.filter(c => getSegment(c) === 'active').length,
    dormant: cards.filter(c => getSegment(c) === 'dormant').length,
    lost: cards.filter(c => getSegment(c) === 'lost').length,
  }

  // Filtered display
  const segmentedCards = activeSegment === 'all'
    ? cards
    : cards.filter(c => getSegment(c) === activeSegment)

  // Checkbox logic
  function toggleCard(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    const allVisible = segmentedCards.map(c => c.id)
    const allSelected = allVisible.every(id => selectedIds.has(id))
    if (allSelected) {
      // Deselect all in current segment
      setSelectedIds(prev => {
        const next = new Set(prev)
        for (const id of allVisible) next.delete(id)
        return next
      })
    } else {
      // Select all in current segment
      setSelectedIds(prev => {
        const next = new Set(prev)
        for (const id of allVisible) next.add(id)
        return next
      })
    }
  }

  const allVisibleSelected =
    segmentedCards.length > 0 &&
    segmentedCards.every(c => selectedIds.has(c.id))

  // CSV Export (CSV2-01)
  function exportCSV() {
    const headers = ['Nome', 'Email', 'Telefono', 'Programma', 'Saldo', 'Ultima visita', 'Iscrizione']
    const rows = cards.map(c => {
      // Pick the most relevant balance based on what is non-null
      const saldo = c.stamp_count ?? c.current_stamps ?? c.points_balance ?? c.cashback_balance ?? c.total_spent ?? 0
      return [
        c.holder?.full_name || '',
        c.holder?.email || '',
        c.holder?.phone || '',
        c.program_name || '',
        String(saldo),
        c.last_use_date || c.created_at.split('T')[0],
        c.created_at.split('T')[0],
      ]
    })

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    // \uFEFF = UTF-8 BOM — required for Italian accented characters in Excel on Windows
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `clienti-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Bulk send
  async function handleBulkSend() {
    if (!notifMessage.trim()) return
    setSending(true)

    const ids = Array.from(selectedIds)
    for (let i = 0; i < ids.length; i += 10) {
      const batch = ids.slice(i, i + 10)
      await Promise.allSettled(
        batch.map(cardId =>
          fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId, message: notifMessage, header: notifHeader }),
          })
        )
      )
    }

    setSentCount(ids.length)
    setSending(false)
    setShowSendModal(false)
    setSelectedIds(new Set())
    setNotifMessage('')
    setNotifHeader('Messaggio speciale')
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500">Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CreditCard size={28} className="text-[#111111]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Carte</h1>
            <p className="text-sm text-gray-500">Gestisci e segmenta i clienti per attivita</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowSendModal(true)}
              className="flex items-center gap-2 bg-[#111111] text-white px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors"
            >
              <Send size={16} />
              Invia a {selectedIds.size} client{selectedIds.size === 1 ? 'e' : 'i'}
            </button>
          )}
          {!planLoading && (
            isPro ? (
              <button
                onClick={exportCSV}
                disabled={cards.length === 0}
                className="flex items-center gap-2 border border-[#E0E0E0] text-gray-700 px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                Esporta CSV
              </button>
            ) : (
              <button
                onClick={() => {
                  window.location.href = '/dashboard/upgrade'
                }}
                className="flex items-center gap-2 border border-[#E0E0E0] text-gray-500 px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors"
                title="Disponibile nel piano PRO"
              >
                <Download size={16} />
                Esporta CSV
              </button>
            )
          )}
        </div>
      </div>

      {/* Sent success banner */}
      {sentCount !== null && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-green-700 text-sm font-medium">
            Notifica inviata a {sentCount} client{sentCount === 1 ? 'e' : 'i'}.
          </p>
          <button onClick={() => setSentCount(null)} className="text-green-500 hover:text-green-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        <MetricCard label="Tutti" value={counts.all} />
        <MetricCard label="Attivi (<=30 gg)" value={counts.active} />
        <MetricCard label="Dormienti (31-90 gg)" value={counts.dormant} />
        <MetricCard label="Persi (>90 gg)" value={counts.lost} />
      </div>

      {/* CSV2-02: UpgradePrompt block for FREE merchants */}
      {!planLoading && isFree && (
        <div className="mb-6">
          <UpgradePrompt feature="Esportazione CSV dei tuoi clienti" requiredPlan="PRO" />
        </div>
      )}

      {/* Segment Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'active', 'dormant', 'lost'] as Segment[]).map(seg => (
          <button
            key={seg}
            onClick={() => {
              setActiveSegment(seg)
              setSelectedIds(new Set())
            }}
            className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
              activeSegment === seg
                ? 'bg-[#111111] text-white'
                : 'border border-[#E0E0E0] text-gray-700 hover:bg-[#F5F5F5]'
            }`}
          >
            {SEGMENT_LABELS[seg]} ({counts[seg]})
          </button>
        ))}
      </div>

      {/* Cards Table */}
      <div className="bg-white border border-[#E8E8E8] shadow-sm rounded-xl overflow-hidden">
        {segmentedCards.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Nessuna carta in questo segmento"
            description="Non ci sono carte cliente in questa categoria al momento."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9F9F9] border-b border-[#E8E8E8]">
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      className="rounded"
                      aria-label="Seleziona tutti"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Programma</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Segmento</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Ultima attivita</th>
                </tr>
              </thead>
              <tbody>
                {segmentedCards.map(card => {
                  const seg = getSegment(card)
                  return (
                    <tr
                      key={card.id}
                      className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(card.id)}
                          onChange={() => toggleCard(card.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {card.holder?.full_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {card.holder?.email || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {card.program_name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENT_BADGE_STYLES[seg]}`}
                        >
                          {seg === 'active' ? 'Attivo' : seg === 'dormant' ? 'Dormiente' : 'Perso'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(card.last_use_date || card.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Invia notifica a {selectedIds.size} client{selectedIds.size === 1 ? 'e' : 'i'}
              </h2>
              <button
                onClick={() => setShowSendModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intestazione
                </label>
                <input
                  type="text"
                  value={notifHeader}
                  onChange={(e) => setNotifHeader(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm outline-none focus:ring-2 focus:ring-[#111111]"
                  placeholder="Messaggio speciale"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Messaggio <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm outline-none focus:ring-2 focus:ring-[#111111] resize-none"
                  placeholder="Scrivi il tuo messaggio qui..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 border border-[#E0E0E0] text-gray-700 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleBulkSend}
                disabled={sending || !notifMessage.trim()}
                className="flex-1 bg-[#111111] text-white py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Invio in corso...' : `Invia a ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
