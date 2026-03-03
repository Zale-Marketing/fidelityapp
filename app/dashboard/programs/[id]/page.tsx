'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { Program, Card, CardHolder, CustomerTag } from '@/lib/types'
import { ArrowLeft, Pencil, Trash2, Plus, Share2, Copy, Send, Mail, Search, UserPlus, CreditCard, Check, X } from 'lucide-react'

export default function ProgramDetailPage() {
  const [program, setProgram] = useState<Program | null>(null)
  const [cards, setCards] = useState<(Card & { card_holder?: CardHolder })[]>([])
  const [customers, setCustomers] = useState<CardHolder[]>([])
  const [tags, setTags] = useState<CustomerTag[]>([])
  const [tiers, setTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [merchantId, setMerchantId] = useState<string | null>(null)

  const [showCreateCard, setShowCreateCard] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [showDeleteCardModal, setShowDeleteCardModal] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null)
  const [deletingCard, setDeletingCard] = useState(false)
  const [cardToAssign, setCardToAssign] = useState<Card | null>(null)
  const [createdCard, setCreatedCard] = useState<{ card: Card, holder: CardHolder | null, link: string } | null>(null)

  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CardHolder | null>(null)
  const [createNewCustomer, setCreateNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    full_name: '',
    contact_email: '',
    phone: '',
    birth_date: '',
    notes: '',
    marketing_consent: false,
    acquisition_source: '',
    selectedTags: [] as string[]
  })

  const router = useRouter()
  const params = useParams()
  const programId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    loadProgram()
  }, [programId])

  async function loadProgram() {
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
    setMerchantId(profile.merchant_id)

    const { data: programData } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .eq('merchant_id', profile.merchant_id)
      .single()

    if (!programData) {
      router.push('/dashboard/programs')
      return
    }
    setProgram(programData)

    const { data: cardsData } = await supabase
      .from('cards')
      .select(`*, card_holder:card_holders(*)`)
      .eq('program_id', programId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (cardsData) setCards(cardsData as any)

    const { data: customersData } = await supabase
      .from('card_holders')
      .select('*')
      .eq('merchant_id', profile.merchant_id)
      .order('full_name')

    if (customersData) setCustomers(customersData)

    const { data: tagsData } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('merchant_id', profile.merchant_id)

    if (tagsData) setTags(tagsData)

    if (programData.program_type === 'tiers') {
      const { data: tiersData } = await supabase
        .from('tiers')
        .select('*')
        .eq('program_id', programId)
        .order('min_spend', { ascending: true })

      if (tiersData) setTiers(tiersData)
    }

    setLoading(false)
  }

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return false
    const search = customerSearch.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(search) ||
      c.contact_email?.toLowerCase().includes(search) ||
      c.phone?.includes(search)
    )
  })

  function selectCustomer(customer: CardHolder) {
    setSelectedCustomer(customer)
    setCustomerSearch(customer.full_name || customer.contact_email || '')
    setShowCustomerDropdown(false)
    setCreateNewCustomer(false)
  }

  function toggleNewCustomer() {
    setCreateNewCustomer(!createNewCustomer)
    setSelectedCustomer(null)
    setCustomerSearch('')
  }

  function toggleTagInForm(tagId: string) {
    if (newCustomer.selectedTags.includes(tagId)) {
      setNewCustomer({ ...newCustomer, selectedTags: newCustomer.selectedTags.filter(t => t !== tagId) })
    } else {
      setNewCustomer({ ...newCustomer, selectedTags: [...newCustomer.selectedTags, tagId] })
    }
  }

  function resetForm() {
    setSelectedCustomer(null)
    setCustomerSearch('')
    setCreateNewCustomer(false)
    setShowCustomerDropdown(false)
    setNewCustomer({ full_name: '', contact_email: '', phone: '', birth_date: '', notes: '', marketing_consent: false, acquisition_source: '', selectedTags: [] })
  }

  async function createOrGetCustomer(): Promise<{ id: string, holder: CardHolder } | null> {
    if (selectedCustomer) {
      return { id: selectedCustomer.id, holder: selectedCustomer }
    }

    if (createNewCustomer && newCustomer.full_name && merchantId) {
      const { data: newHolder, error } = await supabase
        .from('card_holders')
        .insert({
          merchant_id: merchantId,
          full_name: newCustomer.full_name,
          contact_email: newCustomer.contact_email || null,
          phone: newCustomer.phone || null,
          birth_date: newCustomer.birth_date || null,
          notes: newCustomer.notes || null,
          marketing_consent: newCustomer.marketing_consent,
          acquisition_source: newCustomer.acquisition_source || null
        })
        .select()
        .single()

      if (!error && newHolder) {
        if (newCustomer.selectedTags.length > 0) {
          await supabase.from('card_holder_tags').insert(
            newCustomer.selectedTags.map(tagId => ({ card_holder_id: newHolder.id, tag_id: tagId }))
          )
        }
        setCustomers([...customers, newHolder])
        return { id: newHolder.id, holder: newHolder }
      }
    }

    return null
  }

  async function softDeleteProgram() {
    if (!program || !merchantId) return
    setDeleteLoading(true)
    setDeleteError('')
    const { error } = await supabase
      .from('programs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', program.id)
      .eq('merchant_id', merchantId)
    if (error) {
      setDeleteError("Errore durante l'archiviazione. Riprova.")
      setDeleteLoading(false)
      return
    }
    router.refresh()
    router.push('/dashboard/programs')
  }

  async function hardDeleteProgram() {
    if (!program || !merchantId) return
    if (deleteConfirmName !== program.name) return
    setDeleteLoading(true)
    setDeleteError('')
    await supabase.from('stamp_transactions').delete().eq('program_id', program.id)
    await supabase.from('rewards').delete().eq('program_id', program.id)
    await supabase.from('tiers').delete().eq('program_id', program.id)
    await supabase.from('cards').delete().eq('program_id', program.id)
    const { error } = await supabase.from('programs').delete().eq('id', program.id).eq('merchant_id', merchantId)
    if (error) {
      setDeleteError("Errore durante l'eliminazione. Riprova.")
      setDeleteLoading(false)
      return
    }
    router.refresh()
    router.push('/dashboard/programs')
  }

  async function softDeleteCard(card: Card) {
    setDeletingCard(true)
    const { error } = await supabase
      .from('cards')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', card.id)
    if (!error) {
      setCards(prev => prev.filter(c => c.id !== card.id))
      setShowDeleteCardModal(false)
      setCardToDelete(null)
    }
    setDeletingCard(false)
  }

  async function createCard() {
    if (!merchantId || !program) return

    const customerData = await createOrGetCustomer()
    const scanToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16)

    const { data: newCard, error } = await supabase
      .from('cards')
      .insert({
        program_id: program.id,
        merchant_id: merchantId,
        card_holder_id: customerData?.id || null,
        scan_token: scanToken,
        stamp_count: 0,
        status: 'active'
      })
      .select()
      .single()

    if (!error && newCard) {
      const cardLink = `${window.location.origin}/c/${scanToken}`
      setCards([{ ...newCard, card_holder: customerData?.holder } as any, ...cards])
      setCreatedCard({ card: newCard, holder: customerData?.holder || null, link: cardLink })
      setShowCreateCard(false)
      setShowSuccessModal(true)
      resetForm()
    }
  }

  async function assignCustomerToCard() {
    if (!cardToAssign) return

    const customerData = await createOrGetCustomer()

    if (!customerData) {
      alert('Seleziona o crea un cliente')
      return
    }

    const { error } = await supabase
      .from('cards')
      .update({ card_holder_id: customerData.id })
      .eq('id', cardToAssign.id)

    if (!error) {
      setCards(cards.map(c =>
        c.id === cardToAssign.id
          ? { ...c, card_holder_id: customerData.id, card_holder: customerData.holder }
          : c
      ))
      setCreatedCard({ card: cardToAssign, holder: customerData.holder, link: `${window.location.origin}/c/${cardToAssign.scan_token}` })
      setShowAssignModal(false)
      setShowSuccessModal(true)
      setCardToAssign(null)
      resetForm()
    }
  }

  function openAssignModal(card: Card) {
    setCardToAssign(card)
    setShowAssignModal(true)
    resetForm()
  }

  function sendViaEmail() {
    if (!createdCard || !createdCard.holder?.contact_email) return
    const subject = encodeURIComponent(`La tua carta fedeltà ${program?.name}`)
    const body = encodeURIComponent(`Ciao ${createdCard.holder.full_name || ''}!\n\nEcco la tua carta fedeltà "${program?.name}".\n\nClicca qui per aggiungerla al tuo wallet:\n${createdCard.link}\n\nGrazie per essere nostro cliente!`)
    window.open(`mailto:${createdCard.holder.contact_email}?subject=${subject}&body=${body}`)
  }

  function sendViaWhatsApp() {
    if (!createdCard || !createdCard.holder?.phone) return
    let phone = createdCard.holder.phone.replace(/\D/g, '')
    if (phone.startsWith('0')) phone = '39' + phone.substring(1)
    if (!phone.startsWith('39')) phone = '39' + phone
    const message = encodeURIComponent(`Ciao ${createdCard.holder.full_name || ''}!\n\nEcco la tua carta fedeltà "${program?.name}".\n\nClicca qui per aggiungerla al tuo wallet:\n${createdCard.link}\n\nGrazie per essere nostro cliente!`)
    window.open(`https://wa.me/${phone}?text=${message}`)
  }

  function copyLink() {
    if (!createdCard) return
    navigator.clipboard.writeText(createdCard.link)
    alert('Link copiato!')
  }

  const CustomerForm = () => (
    <div className="space-y-4">
      {!createNewCustomer && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Search size={14} />
            Cerca Cliente Esistente
          </label>
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); setSelectedCustomer(null) }}
            onFocus={() => setShowCustomerDropdown(true)}
            placeholder="Digita nome, email o telefono..."
            className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
            autoComplete="off"
          />

          {showCustomerDropdown && customerSearch && (
            <div className="mt-1 bg-white border border-[#E0E0E0] rounded-[8px] shadow-lg max-h-48 overflow-y-auto z-10 relative">
              {filteredCustomers.length === 0 ? (
                <p className="p-3 text-gray-500 text-sm">Nessun cliente trovato</p>
              ) : (
                filteredCustomers.map(customer => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => selectCustomer(customer)}
                    className="w-full p-3 text-left hover:bg-[#F9F9F9] flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-sm">
                        {customer.full_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{customer.full_name || 'Anonimo'}</p>
                      <p className="text-xs text-gray-500">{customer.contact_email || customer.phone || ''}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedCustomer && (
            <div className="mt-2 p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#16A34A]" />
                <span className="font-medium text-sm">{selectedCustomer.full_name}</span>
                {selectedCustomer.contact_email && (
                  <span className="text-xs text-gray-500">({selectedCustomer.contact_email})</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[#E8E8E8]"></div>
        <span className="text-gray-400 text-xs">oppure</span>
        <div className="flex-1 h-px bg-[#E8E8E8]"></div>
      </div>

      <button
        type="button"
        onClick={toggleNewCustomer}
        className={`w-full p-4 rounded-[8px] border-2 border-dashed transition-all flex items-center justify-center gap-2 text-sm font-medium ${
          createNewCustomer
            ? 'border-[#111111] bg-[#F9F9F9] text-gray-900'
            : 'border-[#E0E0E0] text-gray-500 hover:border-[#111111] hover:text-gray-900'
        }`}
      >
        {createNewCustomer ? <Check size={16} /> : <UserPlus size={16} />}
        {createNewCustomer ? 'Creando nuovo cliente...' : 'Crea Nuovo Cliente'}
      </button>

      {createNewCustomer && (
        <div className="space-y-3 p-4 bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px]">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
            <input type="text" value={newCustomer.full_name} onChange={(e) => setNewCustomer({...newCustomer, full_name: e.target.value})} className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none" placeholder="Mario Rossi"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={newCustomer.contact_email} onChange={(e) => setNewCustomer({...newCustomer, contact_email: e.target.value})} className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none" placeholder="email@esempio.com"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <input type="tel" value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none" placeholder="+39 333 1234567"/>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data di Nascita</label>
            <input type="date" value={newCustomer.birth_date} onChange={(e) => setNewCustomer({...newCustomer, birth_date: e.target.value})} className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Come ci ha conosciuto?</label>
            <select value={newCustomer.acquisition_source} onChange={(e) => setNewCustomer({...newCustomer, acquisition_source: e.target.value})} className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none">
              <option value="">-- Seleziona --</option>
              <option value="Passaparola">Passaparola</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Google">Google</option>
              <option value="TikTok">TikTok</option>
              <option value="Volantino">Volantino</option>
              <option value="Passante">Passante</option>
              <option value="Altro">Altro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={newCustomer.notes} onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})} className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none" rows={2} placeholder="Note aggiuntive..."/>
          </div>

          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTagInForm(tag.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${newCustomer.selectedTags.includes(tag.id) ? 'ring-2 ring-offset-1' : 'opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: tag.color + '20', color: tag.color }}
                  >
                    {newCustomer.selectedTags.includes(tag.id) ? '+ ' : ''}{tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-[#E8E8E8] rounded-[8px]">
            <input type="checkbox" checked={newCustomer.marketing_consent} onChange={(e) => setNewCustomer({...newCustomer, marketing_consent: e.target.checked})} className="w-4 h-4 rounded"/>
            <span className="text-sm text-gray-700">Consenso comunicazioni marketing (GDPR)</span>
          </label>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!program) return null

  return (
    <div className="px-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <Link href="/dashboard/programs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3">
            <ArrowLeft size={16} />
            Tutti i Programmi
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">{program.name}</h1>
        </div>
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          <button
            onClick={() => {
              const joinUrl = `${window.location.origin}/join/${program.id}`
              if (navigator.share) {
                navigator.share({ title: `Iscriviti a ${program.name}`, url: joinUrl })
              } else {
                navigator.clipboard.writeText(joinUrl).then(() => alert('Link iscrizione copiato!'))
              }
            }}
            className="flex items-center gap-2 border border-[#E0E0E0] text-gray-700 px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors"
          >
            <Share2 size={14} />
            Link Iscrizione
          </button>
          <Link
            href={`/dashboard/programs/${program.id}/edit`}
            className="flex items-center gap-2 border border-[#E0E0E0] text-gray-700 px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors"
          >
            <Pencil size={14} />
            Modifica
          </Link>
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteError('') }}
            className="flex items-center gap-2 border border-[#FEE2E2] text-[#DC2626] px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-[#FEE2E2]/50 transition-colors"
          >
            <Trash2 size={14} />
            Elimina
          </button>
          <button
            onClick={() => setShowCreateCard(true)}
            className="flex items-center gap-2 bg-[#111111] text-white px-4 py-2 rounded-[8px] text-sm font-semibold hover:bg-[#333333] transition-colors"
          >
            <Plus size={14} />
            Nuova Card
          </button>
        </div>
      </div>

      {/* Join Link Banner */}
      <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[12px] p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-medium text-[#166534] text-sm">Link iscrizione clienti</p>
          <p className="text-[#16A34A] text-xs font-mono truncate max-w-xs mt-0.5">
            {typeof window !== 'undefined' ? `${window.location.origin}/join/${program.id}` : `/join/${program.id}`}
          </p>
        </div>
        <button
          onClick={() => {
            const joinUrl = `${window.location.origin}/join/${program.id}`
            if (navigator.share) {
              navigator.share({ title: `Iscriviti a ${program.name}`, url: joinUrl })
            } else {
              navigator.clipboard.writeText(joinUrl).then(() => alert('Link copiato!'))
            }
          }}
          className="flex items-center gap-2 bg-[#16A34A] text-white px-4 py-2 rounded-[8px] text-sm font-semibold hover:bg-[#15803D] transition-colors whitespace-nowrap"
        >
          <Copy size={14} />
          Copia / Condividi
        </button>
      </div>

      {/* Program Info Card */}
      <div
        className="rounded-[12px] p-6 mb-6 text-white"
        style={{ backgroundColor: program.primary_color }}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{program.name}</h2>
            <p className="opacity-90 text-sm">{program.description || 'Programma fedeltà'}</p>

            <div className="mt-4 flex gap-3 flex-wrap">
              {(!program.program_type || program.program_type === 'stamps') && (
                <>
                  <div className="bg-white/20 rounded-[8px] px-4 py-2">
                    <p className="text-xs opacity-80">Timbri Richiesti</p>
                    <p className="text-xl font-bold">{program.stamps_required}</p>
                  </div>
                  <div className="bg-white/20 rounded-[8px] px-4 py-2">
                    <p className="text-xs opacity-80">Premio</p>
                    <p className="text-base font-semibold">{program.reward_description || 'Premio'}</p>
                  </div>
                </>
              )}

              {program.program_type === 'points' && (
                <>
                  <div className="bg-white/20 rounded-[8px] px-4 py-2">
                    <p className="text-xs opacity-80">Conversione</p>
                    <p className="text-xl font-bold">€{(program as any).points_per_euro || 1} = 1 pt</p>
                  </div>
                  <div className="bg-white/20 rounded-[8px] px-4 py-2">
                    <p className="text-xs opacity-80">Punti per Premio</p>
                    <p className="text-xl font-bold">{program.stamps_required}</p>
                  </div>
                  <div className="bg-white/20 rounded-[8px] px-4 py-2">
                    <p className="text-xs opacity-80">Premio</p>
                    <p className="text-base font-semibold">{program.reward_description || 'Sconto'}</p>
                  </div>
                </>
              )}

              {program.program_type === 'cashback' && (
                <>
                  <div className="bg-white/20 rounded-[8px] px-4 py-2">
                    <p className="text-xs opacity-80">Cashback</p>
                    <p className="text-xl font-bold">{(program as any).cashback_percent || 5}%</p>
                  </div>
                  <div className="bg-white/20 rounded-[8px] px-4 py-2">
                    <p className="text-xs opacity-80">Min. Riscatto</p>
                    <p className="text-xl font-bold">€{(program as any).min_cashback_redeem || 5}</p>
                  </div>
                </>
              )}

              {program.program_type === 'tiers' && (
                <div className="flex gap-2 flex-wrap">
                  {tiers.map(tier => (
                    <div key={tier.id} className="bg-white/20 rounded-[8px] px-3 py-2 flex items-center gap-2">
                      <span className="text-lg">{tier.badge_emoji}</span>
                      <div>
                        <p className="font-bold text-sm">{tier.name}</p>
                        <p className="text-xs opacity-80">€{tier.min_spend}+ → {tier.discount_percent}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {program.program_type === 'subscription' && (
                <>
                  <div className="bg-white/20 rounded-[8px] px-4 py-2">
                    <p className="text-xs opacity-80">Prezzo</p>
                    <p className="text-xl font-bold">€{(program as any).subscription_price || 0}</p>
                  </div>
                  <div className="bg-white/20 rounded-[8px] px-4 py-2">
                    <p className="text-xs opacity-80">Periodo</p>
                    <p className="text-base font-semibold">
                      {(program as any).subscription_period === 'weekly' ? 'Settimanale' :
                       (program as any).subscription_period === 'monthly' ? 'Mensile' : 'Annuale'}
                    </p>
                  </div>
                  <div className="bg-white/20 rounded-[8px] px-4 py-2">
                    <p className="text-xs opacity-80">Limite/Giorno</p>
                    <p className="text-xl font-bold">{(program as any).daily_limit || 1}</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="text-right ml-6">
            <p className="text-sm opacity-80">Card Attive</p>
            <p className="text-4xl font-bold">{cards.length}</p>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="p-5 border-b border-[#F0F0F0] flex items-center gap-2">
          <CreditCard size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900">Card Generate ({cards.length})</h3>
        </div>

        {cards.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-[#F5F5F5] rounded-full flex items-center justify-center mx-auto mb-3">
              <CreditCard size={22} className="text-gray-400" />
            </div>
            <p className="text-gray-500 mb-3">Nessuna card ancora</p>
            <button
              onClick={() => setShowCreateCard(true)}
              className="text-sm text-gray-700 hover:text-gray-900 underline transition-colors"
            >
              Crea la prima card
            </button>
          </div>
        ) : (
          <div>
            {cards.map((card, idx) => (
              <div key={card.id} className={`p-4 hover:bg-[#F9F9F9] transition-colors ${idx < cards.length - 1 ? 'border-b border-[#F0F0F0]' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: card.card_holder ? program.primary_color : '#9ca3af' }}
                    >
                      {card.card_holder?.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      {card.card_holder ? (
                        <>
                          <p className="font-medium text-gray-900 text-sm">{card.card_holder.full_name || 'Cliente Anonimo'}</p>
                          <p className="text-xs text-gray-500">
                            {card.card_holder.contact_email || card.card_holder.phone || 'Nessun contatto'}
                          </p>
                        </>
                      ) : (
                        <p className="font-medium text-gray-400 italic text-sm">Nessun cliente associato</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Stats per tipo */}
                    <div className="text-center">
                      {(!program.program_type || program.program_type === 'stamps') && (
                        <>
                          <p className="text-lg font-bold" style={{ color: program.primary_color }}>
                            {card.current_stamps || card.stamp_count || 0}/{program.stamps_required}
                          </p>
                          <p className="text-xs text-gray-400">bollini</p>
                        </>
                      )}

                      {program.program_type === 'points' && (
                        <>
                          <p className="text-lg font-bold" style={{ color: program.primary_color }}>{(card as any).points_balance || 0}</p>
                          <p className="text-xs text-gray-400">punti</p>
                        </>
                      )}

                      {program.program_type === 'cashback' && (
                        <>
                          <p className="text-lg font-bold" style={{ color: program.primary_color }}>€{((card as any).cashback_balance || 0).toFixed(2)}</p>
                          <p className="text-xs text-gray-400">credito</p>
                        </>
                      )}

                      {program.program_type === 'tiers' && (
                        <>
                          <p className="text-base font-bold" style={{ color: program.primary_color }}>{(card as any).current_tier || 'Base'}</p>
                          <p className="text-xs text-gray-400">livello</p>
                        </>
                      )}

                      {program.program_type === 'subscription' && (
                        <>
                          <p className={`text-sm font-bold ${(card as any).subscription_status === 'active' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                            {(card as any).subscription_status === 'active' ? 'Attivo' : 'Inattivo'}
                          </p>
                          <p className="text-xs text-gray-400">{(card as any).daily_uses || 0}/{(program as any).daily_limit || 1} oggi</p>
                        </>
                      )}
                    </div>

                    {/* Status badge */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      card.status === 'reward_ready'
                        ? 'bg-[#DCFCE7] text-[#16A34A]'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {card.status === 'reward_ready' ? 'Premio!' : 'Attiva'}
                    </span>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {!card.card_holder || (!card.card_holder.full_name && !card.card_holder.contact_email && !card.card_holder.phone) ? (
                        <button
                          onClick={() => openAssignModal(card)}
                          className="border border-[#E0E0E0] text-gray-700 hover:bg-[#F5F5F5] px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors"
                        >
                          Associa Cliente
                        </button>
                      ) : !card.card_holder.contact_email && !card.card_holder.phone ? (
                        <button
                          onClick={() => openAssignModal(card)}
                          className="border border-[#E0E0E0] text-gray-700 hover:bg-[#F5F5F5] px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors"
                        >
                          Aggiungi Contatti
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setCreatedCard({ card, holder: card.card_holder || null, link: `${window.location.origin}/c/${card.scan_token}` })
                            setShowSuccessModal(true)
                          }}
                          className="flex items-center gap-1.5 border border-[#E0E0E0] text-gray-700 hover:bg-[#F5F5F5] px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors"
                        >
                          <Send size={12} />
                          Invia
                        </button>
                      )}

                      <Link
                        href={`/c/${card.scan_token}`}
                        target="_blank"
                        className="border border-[#E0E0E0] text-gray-700 hover:bg-[#F5F5F5] px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors"
                      >
                        Apri
                      </Link>

                      <button
                        onClick={() => { setCardToDelete(card); setShowDeleteCardModal(true) }}
                        className="border border-[#FEE2E2] text-[#DC2626] hover:bg-[#FEE2E2]/50 p-1.5 rounded-[8px] transition-colors"
                        title="Elimina carta"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crea Card */}
      {showCreateCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#F0F0F0]">
              <h2 className="text-lg font-semibold text-gray-900">Nuova Card per &quot;{program.name}&quot;</h2>
            </div>

            <div className="p-6">
              <CustomerForm />
            </div>

            <div className="p-6 border-t border-[#F0F0F0] flex gap-3">
              <button
                type="button"
                onClick={() => { setShowCreateCard(false); resetForm() }}
                className="flex-1 px-4 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm hover:bg-[#F5F5F5] transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={createCard}
                disabled={createNewCustomer && !newCustomer.full_name}
                className="flex-1 bg-[#111111] text-white px-4 py-2.5 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
              >
                Crea Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Associa Cliente */}
      {showAssignModal && cardToAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#F0F0F0]">
              <h2 className="text-lg font-semibold text-gray-900">Associa Cliente alla Card</h2>
              <p className="text-sm text-gray-500 mt-1">
                Token: {cardToAssign.scan_token} · {cardToAssign.stamp_count} timbri
              </p>
            </div>

            <div className="p-6">
              <CustomerForm />
            </div>

            <div className="p-6 border-t border-[#F0F0F0] flex gap-3">
              <button
                type="button"
                onClick={() => { setShowAssignModal(false); setCardToAssign(null); resetForm() }}
                className="flex-1 px-4 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm hover:bg-[#F5F5F5] transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={assignCustomerToCard}
                disabled={!selectedCustomer && (!createNewCustomer || !newCustomer.full_name)}
                className="flex-1 bg-[#111111] text-white px-4 py-2.5 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
              >
                Associa Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Success */}
      {showSuccessModal && createdCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] w-full max-w-md text-center">
            <div className="p-8">
              <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-[#16A34A]" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {cardToAssign ? 'Cliente Associato!' : 'Card Creata!'}
              </h2>
              {createdCard.holder && (
                <p className="text-gray-600 mb-6">
                  Card per <strong>{createdCard.holder.full_name}</strong>
                </p>
              )}

              <div className="bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] p-3 mb-6 text-left">
                <p className="text-xs text-gray-500 mb-1">Link della card:</p>
                <p className="text-xs font-mono break-all text-gray-700">{createdCard.link}</p>
              </div>

              <div className="space-y-2">
                {createdCard.holder?.contact_email && (
                  <button
                    onClick={sendViaEmail}
                    className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white py-3 rounded-[8px] text-sm font-medium hover:bg-[#1D4ED8] transition-colors"
                  >
                    <Mail size={16} />
                    Invia via Email
                  </button>
                )}

                {createdCard.holder?.phone && (
                  <button
                    onClick={sendViaWhatsApp}
                    className="w-full flex items-center justify-center gap-2 bg-[#16A34A] text-white py-3 rounded-[8px] text-sm font-medium hover:bg-[#15803D] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Invia via WhatsApp
                  </button>
                )}

                <button
                  onClick={copyLink}
                  className="w-full flex items-center justify-center gap-2 bg-[#F5F5F5] text-gray-700 py-3 rounded-[8px] text-sm font-medium hover:bg-[#E8E8E8] transition-colors"
                >
                  <Copy size={16} />
                  Copia Link
                </button>

                {!createdCard.holder?.contact_email && !createdCard.holder?.phone && createdCard.holder && (
                  <p className="text-xs text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] p-3 rounded-[8px]">
                    Nessun contatto disponibile. Aggiungi email o telefono al cliente per inviare la card.
                  </p>
                )}

                {!createdCard.holder && (
                  <p className="text-xs text-gray-500 bg-[#F9F9F9] p-3 rounded-[8px]">
                    Card creata senza cliente. Puoi associare un cliente in seguito.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[#F0F0F0]">
              <button
                onClick={() => { setShowSuccessModal(false); setCreatedCard(null) }}
                className="w-full px-4 py-2.5 text-gray-600 hover:bg-[#F9F9F9] rounded-[8px] text-sm transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Elimina Programma */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestisci programma</h3>
            <p className="text-gray-600 text-sm mb-4">
              Scegli come vuoi procedere con <strong>{program.name}</strong>.
            </p>

            {deleteError && (
              <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-[8px] p-3 mb-4 text-sm text-[#DC2626]">
                {deleteError}
              </div>
            )}

            <div className="border border-[#E8E8E8] rounded-[12px] p-4 mb-3">
              <div className="font-semibold text-gray-900 text-sm mb-1">Archivia programma</div>
              <p className="text-gray-500 text-xs mb-3">
                Il programma sparisce dalla dashboard ma tutti i dati rimangono nel database. Azione non reversibile dalla UI.
              </p>
              <button
                onClick={softDeleteProgram}
                disabled={deleteLoading}
                className="w-full px-4 py-2.5 bg-[#111111] text-white rounded-[8px] text-sm font-medium hover:bg-[#333333] disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? 'Archiviazione...' : 'Archivia programma'}
              </button>
            </div>

            <div className="border border-[#FEE2E2] rounded-[12px] p-4 mb-4">
              <div className="font-semibold text-[#DC2626] text-sm mb-1">Elimina definitivamente</div>
              <p className="text-gray-500 text-xs mb-3">
                Elimina il programma e tutti i dati associati (carte, premi, transazioni). Irreversibile.
              </p>
              <input
                type="text"
                placeholder={`Digita "${program.name}" per confermare`}
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                className="w-full border border-[#E0E0E0] rounded-[8px] px-3 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#DC2626] transition-colors"
              />
              <button
                onClick={hardDeleteProgram}
                disabled={deleteLoading || deleteConfirmName !== program.name}
                className="w-full px-4 py-2.5 bg-[#DC2626] text-white rounded-[8px] text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteLoading ? 'Eliminazione...' : 'Elimina definitivamente'}
              </button>
            </div>

            <button
              onClick={() => { setShowDeleteModal(false); setDeleteError(''); setDeleteConfirmName('') }}
              disabled={deleteLoading}
              className="w-full px-4 py-2.5 border border-[#E0E0E0] text-gray-700 rounded-[8px] text-sm hover:bg-[#F5F5F5] disabled:opacity-50 transition-colors"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Modal Elimina Carta */}
      {showDeleteCardModal && cardToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Elimina carta</h3>
            <p className="text-gray-600 text-sm mb-6">
              Sei sicuro? La carta di <strong>{cardToDelete.card_holder?.full_name || 'cliente anonimo'}</strong> verrà archiviata.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteCardModal(false); setCardToDelete(null) }}
                disabled={deletingCard}
                className="flex-1 border border-[#E0E0E0] text-gray-700 py-2.5 rounded-[8px] text-sm hover:bg-[#F5F5F5] disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={() => softDeleteCard(cardToDelete)}
                disabled={deletingCard}
                className="flex-1 bg-[#DC2626] text-white py-2.5 rounded-[8px] text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deletingCard ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
