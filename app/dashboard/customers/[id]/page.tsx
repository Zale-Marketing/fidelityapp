'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { CardHolder, Card, StampTransaction, CustomerTag, Program } from '@/lib/types'
import { ArrowLeft, Pencil, Trash2, Plus, Mail, Phone, MapPin, Tag, CreditCard, History, Check, X, Save } from 'lucide-react'

export default function CustomerDetailPage() {
  const [customer, setCustomer] = useState<CardHolder | null>(null)
  const [cards, setCards] = useState<(Card & { program: Program })[]>([])
  const [transactions, setTransactions] = useState<(StampTransaction & { program?: Program })[]>([])
  const [allTags, setAllTags] = useState<CustomerTag[]>([])
  const [customerTags, setCustomerTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<CardHolder>>({})
  const [showAddCard, setShowAddCard] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('')

  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    loadCustomer()
  }, [customerId])

  async function loadCustomer() {
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

    if (!profile) return

    const { data: customerData } = await supabase
      .from('card_holders')
      .select('*')
      .eq('id', customerId)
      .eq('merchant_id', profile.merchant_id)
      .single()

    if (!customerData) {
      router.push('/dashboard/customers')
      return
    }

    setCustomer(customerData)
    setEditForm(customerData)

    const { data: cardsData } = await supabase
      .from('cards')
      .select(`*, program:programs(*)`)
      .eq('card_holder_id', customerId)
      .order('created_at', { ascending: false })

    if (cardsData) setCards(cardsData as any)

    const { data: txData } = await supabase
      .from('stamp_transactions')
      .select(`*, program:programs(name)`)
      .eq('card_holder_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (txData) setTransactions(txData as any)

    const { data: tagsData } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('merchant_id', profile.merchant_id)

    if (tagsData) setAllTags(tagsData)

    const { data: customerTagsData } = await supabase
      .from('card_holder_tags')
      .select('tag_id')
      .eq('card_holder_id', customerId)

    if (customerTagsData) {
      setCustomerTags(customerTagsData.map(t => t.tag_id))
    }

    const { data: programsData } = await supabase
      .from('programs')
      .select('*')
      .eq('merchant_id', profile.merchant_id)

    if (programsData) setPrograms(programsData)

    setLoading(false)
  }

  async function saveCustomer() {
    if (!customer) return

    const { error } = await supabase
      .from('card_holders')
      .update({
        full_name: editForm.full_name,
        contact_email: editForm.contact_email,
        phone: editForm.phone,
        birth_date: editForm.birth_date,
        notes: editForm.notes,
        marketing_consent: editForm.marketing_consent,
        acquisition_source: editForm.acquisition_source
      })
      .eq('id', customer.id)

    if (!error) {
      setCustomer({ ...customer, ...editForm } as CardHolder)
      setEditing(false)
    }
  }

  async function toggleTag(tagId: string) {
    if (!customer) return

    if (customerTags.includes(tagId)) {
      await supabase
        .from('card_holder_tags')
        .delete()
        .eq('card_holder_id', customer.id)
        .eq('tag_id', tagId)
      setCustomerTags(customerTags.filter(t => t !== tagId))
    } else {
      await supabase
        .from('card_holder_tags')
        .insert({ card_holder_id: customer.id, tag_id: tagId })
      setCustomerTags([...customerTags, tagId])
    }
  }

  async function createCardForCustomer() {
    if (!customer || !selectedProgram) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('merchant_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (!profile) return

    const scanToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16)

    const { data: newCard, error } = await supabase
      .from('cards')
      .insert({
        program_id: selectedProgram,
        merchant_id: profile.merchant_id,
        card_holder_id: customer.id,
        scan_token: scanToken,
        stamp_count: 0,
        status: 'active'
      })
      .select(`*, program:programs(*)`)
      .single()

    if (!error && newCard) {
      setCards([newCard as any, ...cards])
      setShowAddCard(false)
      setSelectedProgram('')
    }
  }

  async function deleteCustomer() {
    if (!customer) return

    if (!confirm('Sei sicuro di voler eliminare questo cliente? Tutte le sue card verranno eliminate.')) {
      return
    }

    await supabase.from('card_holders').delete().eq('id', customer.id)
    router.push('/dashboard/customers')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!customer) return null

  const totalStamps = transactions.filter(t => t.type === 'add').reduce((sum, t) => sum + t.delta, 0)
  const totalRewards = transactions.filter(t => t.type === 'redeem').length
  const daysSinceLastVisit = customer.last_visit
    ? Math.floor((Date.now() - new Date(customer.last_visit).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="px-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3">
            <ArrowLeft size={16} />
            Tutti i Clienti
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            {customer.full_name || 'Cliente Anonimo'}
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-2 border border-[#E0E0E0] text-gray-700 px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors"
          >
            <Pencil size={14} />
            {editing ? 'Annulla' : 'Modifica'}
          </button>
          <button
            onClick={deleteCustomer}
            className="flex items-center gap-2 border border-[#FEE2E2] text-[#DC2626] px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-[#FEE2E2]/50 transition-colors"
          >
            <Trash2 size={14} />
            Elimina
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left Column */}
        <div className="lg:col-span-1 space-y-4">

          {/* Card Info Base */}
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-gray-600">
                  {customer.full_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{customer.full_name || 'Anonimo'}</h2>
                <p className="text-gray-500 text-sm">
                  Cliente dal {new Date(customer.created_at).toLocaleDateString('it-IT')}
                </p>
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={editForm.full_name || ''}
                    onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.contact_email || ''}
                    onChange={(e) => setEditForm({...editForm, contact_email: e.target.value})}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Nascita</label>
                  <input
                    type="date"
                    value={editForm.birth_date || ''}
                    onChange={(e) => setEditForm({...editForm, birth_date: e.target.value})}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fonte</label>
                  <select
                    value={editForm.acquisition_source || ''}
                    onChange={(e) => setEditForm({...editForm, acquisition_source: e.target.value})}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                  >
                    <option value="">-- Seleziona --</option>
                    <option value="Passaparola">Passaparola</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Google">Google</option>
                    <option value="Volantino">Volantino</option>
                    <option value="Passante">Passante</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="marketing"
                    checked={editForm.marketing_consent || false}
                    onChange={(e) => setEditForm({...editForm, marketing_consent: e.target.checked})}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="marketing" className="text-sm text-gray-700">Consenso Marketing</label>
                </div>
                <button
                  onClick={saveCustomer}
                  className="w-full flex items-center justify-center gap-2 bg-[#111111] text-white py-2.5 rounded-[8px] text-sm font-semibold hover:bg-[#333333] transition-colors"
                >
                  <Save size={14} />
                  Salva Modifiche
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {customer.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400 flex-shrink-0" />
                    <a href={`mailto:${customer.contact_email}`} className="text-sm text-gray-700 hover:text-gray-900 hover:underline transition-colors">
                      {customer.contact_email}
                    </a>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400 flex-shrink-0" />
                    <a href={`tel:${customer.phone}`} className="text-sm text-gray-700 hover:text-gray-900 hover:underline transition-colors">
                      {customer.phone}
                    </a>
                  </div>
                )}
                {customer.birth_date && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Data nascita:</span>
                    <span className="text-sm text-gray-700">{new Date(customer.birth_date).toLocaleDateString('it-IT')}</span>
                  </div>
                )}
                {customer.acquisition_source && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Fonte: {customer.acquisition_source}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {customer.marketing_consent ? (
                    <Check size={14} className="text-[#16A34A] flex-shrink-0" />
                  ) : (
                    <X size={14} className="text-[#DC2626] flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-700">
                    {customer.marketing_consent ? 'Consenso Marketing' : 'No Marketing'}
                  </span>
                </div>
                {customer.notes && (
                  <div className="mt-3 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-[8px]">
                    <p className="text-sm text-[#92400E]">{customer.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Tag size={14} className="text-gray-500" />
              Tag
            </h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    customerTags.includes(tag.id)
                      ? 'ring-2 ring-offset-2'
                      : 'opacity-50 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                    boxShadow: customerTags.includes(tag.id) ? `0 0 0 2px white, 0 0 0 4px ${tag.color}` : 'none'
                  }}
                >
                  {customerTags.includes(tag.id) ? '+ ' : ''}{tag.name}
                </button>
              ))}
              {allTags.length === 0 && (
                <p className="text-gray-400 text-sm">Nessun tag disponibile</p>
              )}
            </div>
          </div>

          {/* Statistiche */}
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h3 className="font-semibold text-gray-900 mb-4">Statistiche</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px]">
                <p className="text-2xl font-bold text-gray-900">{totalStamps}</p>
                <p className="text-xs text-gray-500 mt-0.5">Timbri Totali</p>
              </div>
              <div className="text-center p-3 bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px]">
                <p className="text-2xl font-bold text-gray-900">{totalRewards}</p>
                <p className="text-xs text-gray-500 mt-0.5">Premi Riscattati</p>
              </div>
              <div className="text-center p-3 bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px]">
                <p className="text-2xl font-bold text-gray-900">{cards.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Card Attive</p>
              </div>
              <div className="text-center p-3 bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px]">
                <p className="text-2xl font-bold text-gray-900">
                  {daysSinceLastVisit !== null ? `${daysSinceLastVisit}g` : '-'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Ultima Visita</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Cards del Cliente */}
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard size={16} className="text-gray-500" />
                Carte Fedeltà
              </h3>
              <button
                onClick={() => setShowAddCard(true)}
                className="flex items-center gap-1.5 bg-[#111111] text-white px-3 py-1.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors"
              >
                <Plus size={14} />
                Nuova Card
              </button>
            </div>

            {cards.length === 0 ? (
              <p className="text-gray-400 text-center py-8 text-sm">Nessuna card associata</p>
            ) : (
              <div className="grid gap-3">
                {cards.map(card => (
                  <div
                    key={card.id}
                    className="border border-[#E8E8E8] rounded-[8px] p-4 hover:shadow-sm transition-shadow"
                    style={{ borderLeftColor: card.program?.primary_color, borderLeftWidth: 3 }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{card.program?.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{card.program?.reward_description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold" style={{ color: card.program?.primary_color }}>
                          {card.stamp_count}/{card.program?.stamps_required}
                        </p>
                        <p className="text-xs text-gray-400">timbri</p>
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (card.stamp_count / (card.program?.stamps_required || 1)) * 100)}%`,
                          backgroundColor: card.program?.primary_color
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        card.status === 'reward_ready'
                          ? 'bg-[#DCFCE7] text-[#16A34A]'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {card.status === 'reward_ready' ? 'Premio Pronto' : 'Attiva'}
                      </span>
                      <Link
                        href={`/c/${card.scan_token}`}
                        target="_blank"
                        className="text-sm text-gray-700 hover:text-gray-900 hover:underline transition-colors"
                      >
                        Apri Card
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Storico Transazioni */}
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <History size={16} className="text-gray-500" />
              Storico Attività
            </h3>

            {transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-8 text-sm">Nessuna attività registrata</p>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-4 p-3 rounded-[8px] hover:bg-[#F9F9F9] transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'add' ? 'bg-[#DCFCE7]' :
                      tx.type === 'redeem' ? 'bg-gray-100' :
                      tx.type === 'bonus' ? 'bg-[#FEF3C7]' : 'bg-gray-100'
                    }`}>
                      {tx.type === 'add' && <Plus size={14} className="text-[#16A34A]" />}
                      {tx.type === 'redeem' && <Check size={14} className="text-gray-600" />}
                      {tx.type === 'bonus' && <Plus size={14} className="text-[#B45309]" />}
                      {tx.type === 'expire' && <X size={14} className="text-gray-500" />}
                      {tx.type === 'manual' && <Pencil size={14} className="text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900">
                        {tx.type === 'add' && `+${tx.delta} timbro${tx.delta > 1 ? 'i' : ''}`}
                        {tx.type === 'redeem' && 'Premio riscattato'}
                        {tx.type === 'bonus' && `+${tx.delta} bonus`}
                        {tx.type === 'expire' && `${tx.delta} timbri scaduti`}
                        {tx.type === 'manual' && `Modifica manuale: ${tx.delta > 0 ? '+' : ''}${tx.delta}`}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{tx.program?.name}</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 flex-shrink-0">
                      {new Date(tx.created_at).toLocaleDateString('it-IT')}
                      <br />
                      {new Date(tx.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Aggiungi Card */}
      {showAddCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] w-full max-w-md">
            <div className="p-6 border-b border-[#F0F0F0]">
              <h2 className="text-lg font-semibold text-gray-900">Nuova Card per {customer.full_name}</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Seleziona Programma</label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
              >
                <option value="">-- Seleziona un programma --</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="p-6 border-t border-[#F0F0F0] flex gap-3">
              <button
                onClick={() => setShowAddCard(false)}
                className="flex-1 px-4 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm hover:bg-[#F5F5F5] transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={createCardForCustomer}
                disabled={!selectedProgram}
                className="flex-1 bg-[#111111] text-white px-4 py-2.5 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
              >
                Crea Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
