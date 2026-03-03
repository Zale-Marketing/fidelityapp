'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, X } from 'lucide-react'

type CardDetail = {
  id: string
  scan_token: string
  status: string
  stamp_count: number | null
  current_stamps: number | null
  points_balance: number | null
  cashback_balance: number | null
  total_spent: number | null
  subscription_status: string | null
  daily_uses: number | null
  last_use_date: string | null
  created_at: string
  program_id: string | null
  card_holder_id: string | null
}

type CardHolder = {
  id: string
  full_name: string | null
  contact_email: string | null
  phone: string | null
}

type ProgramInfo = {
  id: string
  name: string
  program_type: string
  primary_color: string
}

export default function CardDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClient()

  const [card, setCard] = useState<CardDetail | null>(null)
  const [holder, setHolder] = useState<CardHolder | null>(null)
  const [program, setProgram] = useState<ProgramInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('merchant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.merchant_id) { router.push('/dashboard'); return }

      const { data: cardData } = await supabase
        .from('cards')
        .select('id, scan_token, status, stamp_count, current_stamps, points_balance, cashback_balance, total_spent, subscription_status, daily_uses, last_use_date, created_at, program_id, card_holder_id')
        .eq('id', id)
        .eq('merchant_id', profile.merchant_id)
        .single()

      if (!cardData) { router.push('/dashboard/cards'); return }
      setCard(cardData)

      if (cardData.card_holder_id) {
        const { data: holderData } = await supabase
          .from('card_holders')
          .select('id, full_name, contact_email, phone')
          .eq('id', cardData.card_holder_id)
          .single()
        if (holderData) setHolder(holderData)
      }

      if (cardData.program_id) {
        const { data: programData } = await supabase
          .from('programs')
          .select('id, name, program_type, primary_color')
          .eq('id', cardData.program_id)
          .single()
        if (programData) setProgram(programData)
      }

      setLoading(false)
    }

    load()
  }, [id])

  async function handleDeleteCard() {
    if (!card) return
    setDeleting(true)
    setDeleteError('')

    const { error } = await supabase
      .from('cards')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', card.id)

    if (error) {
      setDeleteError('Errore durante l\'eliminazione. Riprova.')
      setDeleting(false)
      return
    }

    router.refresh()
    router.push('/dashboard/cards')
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function getBalance(): string {
    if (!card) return '—'
    if (card.stamp_count != null) return `${card.stamp_count} bollini`
    if (card.current_stamps != null) return `${card.current_stamps} bollini`
    if (card.points_balance != null) return `${card.points_balance} punti`
    if (card.cashback_balance != null) return `€${card.cashback_balance} cashback`
    if (card.total_spent != null) return `€${card.total_spent} spesi`
    return '—'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!card) return null

  return (
    <div className="px-6 py-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/cards"
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Scheda Carta</h1>
          <p className="text-sm text-gray-500 mt-0.5">{holder?.full_name || 'Cliente anonimo'}</p>
        </div>
      </div>

      {/* Card Info */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Informazioni carta</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Programma</p>
            <p className="font-medium text-gray-900 mt-0.5">{program?.name || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Saldo</p>
            <p className="font-medium text-gray-900 mt-0.5">{getBalance()}</p>
          </div>
          <div>
            <p className="text-gray-500">Stato</p>
            <p className="font-medium text-gray-900 mt-0.5 capitalize">{card.status}</p>
          </div>
          <div>
            <p className="text-gray-500">Ultima attività</p>
            <p className="font-medium text-gray-900 mt-0.5">{formatDate(card.last_use_date)}</p>
          </div>
          <div>
            <p className="text-gray-500">Creata il</p>
            <p className="font-medium text-gray-900 mt-0.5">{formatDate(card.created_at)}</p>
          </div>
          <div>
            <p className="text-gray-500">Token</p>
            <p className="font-mono text-xs text-gray-600 mt-0.5 truncate">{card.scan_token}</p>
          </div>
        </div>
      </div>

      {/* Holder Info */}
      {holder && (
        <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Cliente</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Nome</p>
              <p className="font-medium text-gray-900 mt-0.5">{holder.full_name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium text-gray-900 mt-0.5">{holder.contact_email || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Telefono</p>
              <p className="font-medium text-gray-900 mt-0.5">{holder.phone || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="bg-white border border-red-100 rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="text-sm font-semibold text-red-600 uppercase tracking-widest mb-2">Zona pericolosa</h2>
        <p className="text-sm text-gray-500 mb-4">Elimina questa carta. L'operazione è irreversibile.</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 border border-red-200 text-red-600 px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
          Elimina carta
        </button>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Elimina carta</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Sei sicuro di voler eliminare la carta di <strong>{holder?.full_name || 'questo cliente'}</strong>? L'operazione non può essere annullata.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-[#E0E0E0] text-gray-700 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteCard}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-[8px] text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
