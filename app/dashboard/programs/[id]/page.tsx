'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { Program, Card, CardHolder, CustomerTag } from '@/lib/types'

export default function ProgramDetailPage() {
  const [program, setProgram] = useState<Program | null>(null)
  const [cards, setCards] = useState<(Card & { card_holder?: CardHolder })[]>([])
  const [customers, setCustomers] = useState<CardHolder[]>([])
  const [tags, setTags] = useState<CustomerTag[]>([])
  const [tiers, setTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  
  // Modal states
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [cardToAssign, setCardToAssign] = useState<Card | null>(null)
  const [createdCard, setCreatedCard] = useState<{ card: Card, holder: CardHolder | null, link: string } | null>(null)
  
  // Customer search/create
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

    // Load program
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

    // Load cards with card holders
    const { data: cardsData } = await supabase
      .from('cards')
      .select(`
        *,
        card_holder:card_holders(*)
      `)
      .eq('program_id', programId)
      .order('created_at', { ascending: false })

    if (cardsData) setCards(cardsData as any)

    // Load all customers for search
    const { data: customersData } = await supabase
      .from('card_holders')
      .select('*')
      .eq('merchant_id', profile.merchant_id)
      .order('full_name')

    if (customersData) setCustomers(customersData)

    // Load tags
    const { data: tagsData } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('merchant_id', profile.merchant_id)

    if (tagsData) setTags(tagsData)
// Load tiers if VIP program
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

  // Filter customers based on search
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
      setNewCustomer({
        ...newCustomer,
        selectedTags: newCustomer.selectedTags.filter(t => t !== tagId)
      })
    } else {
      setNewCustomer({
        ...newCustomer,
        selectedTags: [...newCustomer.selectedTags, tagId]
      })
    }
  }

  function resetForm() {
    setSelectedCustomer(null)
    setCustomerSearch('')
    setCreateNewCustomer(false)
    setShowCustomerDropdown(false)
    setNewCustomer({
      full_name: '',
      contact_email: '',
      phone: '',
      birth_date: '',
      notes: '',
      marketing_consent: false,
      acquisition_source: '',
      selectedTags: []
    })
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
        // Add tags
        if (newCustomer.selectedTags.length > 0) {
          await supabase
            .from('card_holder_tags')
            .insert(
              newCustomer.selectedTags.map(tagId => ({
                card_holder_id: newHolder.id,
                tag_id: tagId
              }))
            )
        }

        // Update local customers list
        setCustomers([...customers, newHolder])
        return { id: newHolder.id, holder: newHolder }
      }
    }

    return null
  }

  async function createCard() {
    if (!merchantId || !program) return

    const customerData = await createOrGetCustomer()

    // Generate unique token
    const scanToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16)

    // Create card
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
      
      // Add to local list
      setCards([{ ...newCard, card_holder: customerData?.holder } as any, ...cards])
      
      // Show success modal
      setCreatedCard({
        card: newCard,
        holder: customerData?.holder || null,
        link: cardLink
      })
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

    // Update card with customer
    const { error } = await supabase
      .from('cards')
      .update({ card_holder_id: customerData.id })
      .eq('id', cardToAssign.id)

    if (!error) {
      // Update local list
      setCards(cards.map(c => 
        c.id === cardToAssign.id 
          ? { ...c, card_holder_id: customerData.id, card_holder: customerData.holder }
          : c
      ))
      
      // Show success
      setCreatedCard({
        card: cardToAssign,
        holder: customerData.holder,
        link: `${window.location.origin}/c/${cardToAssign.scan_token}`
      })
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
    const body = encodeURIComponent(
      `Ciao ${createdCard.holder.full_name || ''}!\n\n` +
      `Ecco la tua carta fedeltà "${program?.name}".\n\n` +
      `Clicca qui per aggiungerla al tuo wallet:\n${createdCard.link}\n\n` +
      `Grazie per essere nostro cliente!`
    )
    
    window.open(`mailto:${createdCard.holder.contact_email}?subject=${subject}&body=${body}`)
  }

  function sendViaWhatsApp() {
    if (!createdCard || !createdCard.holder?.phone) return
    
    // Clean phone number
    let phone = createdCard.holder.phone.replace(/\D/g, '')
    if (phone.startsWith('0')) phone = '39' + phone.substring(1)
    if (!phone.startsWith('39')) phone = '39' + phone
    
    const message = encodeURIComponent(
      `Ciao ${createdCard.holder.full_name || ''}! 🎉\n\n` +
      `Ecco la tua carta fedeltà "${program?.name}".\n\n` +
      `👉 Clicca qui per aggiungerla al tuo wallet:\n${createdCard.link}\n\n` +
      `Grazie per essere nostro cliente! 💜`
    )
    
    window.open(`https://wa.me/${phone}?text=${message}`)
  }

  function copyLink() {
    if (!createdCard) return
    navigator.clipboard.writeText(createdCard.link)
    alert('Link copiato!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!program) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <Link href="/dashboard/programs" className="text-indigo-600 hover:underline text-sm">
              ← Tutti i Programmi
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{program.name}</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/dashboard/programs/${program.id}/edit`}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
            >
              ✏️ Modifica
            </Link>
            <button
              onClick={() => setShowCreateCard(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              + Nuova Card
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {/* Program Info */}
<div 
  className="rounded-2xl p-6 mb-6 text-white"
  style={{ backgroundColor: program.primary_color }}
>
  <div className="flex justify-between items-start">
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">
          {program.program_type === 'stamps' && '🎫'}
          {program.program_type === 'points' && '⭐'}
          {program.program_type === 'cashback' && '💰'}
          {program.program_type === 'tiers' && '👑'}
          {program.program_type === 'subscription' && '🔄'}
          {(!program.program_type || program.program_type === 'stamps') && '🎫'}
        </span>
        <h2 className="text-3xl font-bold">{program.name}</h2>
      </div>
      <p className="opacity-90 mt-1">{program.description || 'Programma fedeltà'}</p>
      
      <div className="mt-4 flex gap-4 flex-wrap">
        {/* BOLLINI */}
        {(!program.program_type || program.program_type === 'stamps') && (
          <>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm opacity-80">Timbri Richiesti</p>
              <p className="text-2xl font-bold">{program.stamps_required}</p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm opacity-80">Premio</p>
              <p className="text-lg font-semibold">{program.reward_description || 'Premio'}</p>
            </div>
          </>
        )}
        
        {/* PUNTI */}
        {program.program_type === 'points' && (
          <>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm opacity-80">Conversione</p>
              <p className="text-2xl font-bold">€{(program as any).points_per_euro || 1} = 1 pt</p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm opacity-80">Punti per Premio</p>
              <p className="text-2xl font-bold">{program.stamps_required}</p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm opacity-80">Premio</p>
              <p className="text-lg font-semibold">{program.reward_description || 'Sconto'}</p>
            </div>
          </>
        )}
        
        {/* CASHBACK */}
        {program.program_type === 'cashback' && (
          <>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm opacity-80">Cashback</p>
              <p className="text-2xl font-bold">{(program as any).cashback_percent || 5}%</p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm opacity-80">Min. Riscatto</p>
              <p className="text-2xl font-bold">€{(program as any).min_cashback_redeem || 5}</p>
            </div>
          </>
        )}
        
        {/* TIERS / VIP */}
        {program.program_type === 'tiers' && (
          <div className="flex gap-2 flex-wrap">
            {tiers.map(tier => (
              <div key={tier.id} className="bg-white/20 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-2xl">{tier.badge_emoji}</span>
                <div>
                  <p className="font-bold">{tier.name}</p>
                  <p className="text-xs opacity-80">€{tier.min_spend}+ → {tier.discount_percent}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* SUBSCRIPTION */}
        {program.program_type === 'subscription' && (
          <>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm opacity-80">Prezzo</p>
              <p className="text-2xl font-bold">€{(program as any).subscription_price || 0}</p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm opacity-80">Periodo</p>
              <p className="text-lg font-semibold">
                {(program as any).subscription_period === 'weekly' ? 'Settimanale' : 
                 (program as any).subscription_period === 'monthly' ? 'Mensile' : 'Annuale'}
              </p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm opacity-80">Limite/Giorno</p>
              <p className="text-2xl font-bold">{(program as any).daily_limit || 1}</p>
            </div>
          </>
        )}
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm opacity-80">Card Attive</p>
      <p className="text-4xl font-bold">{cards.length}</p>
    </div>
  </div>
</div>

        {/* Cards List */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b">
            <h3 className="font-bold">💳 Card Generate ({cards.length})</h3>
          </div>
          
          {cards.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-4xl mb-2">💳</p>
              <p>Nessuna card ancora</p>
              <button
                onClick={() => setShowCreateCard(true)}
                className="mt-4 text-indigo-600 hover:underline"
              >
                Crea la prima card →
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {cards.map(card => (
                <div key={card.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: card.card_holder ? program.primary_color : '#9ca3af' }}
                      >
                        {card.card_holder?.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        {card.card_holder ? (
                          <>
                            <p className="font-medium">{card.card_holder.full_name || 'Cliente Anonimo'}</p>
                            <p className="text-sm text-gray-500">
                              {card.card_holder.contact_email || card.card_holder.phone || 'Nessun contatto'}
                            </p>
                          </>
                        ) : (
                          <p className="font-medium text-gray-400 italic">Nessun cliente associato</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Stats per tipo */}
<div className="text-center">
  {(!program.program_type || program.program_type === 'stamps') && (
    <>
      <p className="text-2xl font-bold" style={{ color: program.primary_color }}>
        {card.current_stamps || card.stamp_count || 0}/{program.stamps_required}
      </p>
      <p className="text-xs text-gray-400">bollini</p>
    </>
  )}
  
  {program.program_type === 'points' && (
    <>
      <p className="text-2xl font-bold" style={{ color: program.primary_color }}>
        {(card as any).points_balance || 0}
      </p>
      <p className="text-xs text-gray-400">punti</p>
      <p className="text-xs text-gray-300">€{(card as any).total_spent || 0} spesi</p>
    </>
  )}
  
  {program.program_type === 'cashback' && (
    <>
      <p className="text-2xl font-bold" style={{ color: program.primary_color }}>
        €{((card as any).cashback_balance || 0).toFixed(2)}
      </p>
      <p className="text-xs text-gray-400">credito</p>
      <p className="text-xs text-gray-300">€{(card as any).total_spent || 0} spesi</p>
    </>
  )}
  
  {program.program_type === 'tiers' && (
    <>
      <p className="text-lg font-bold" style={{ color: program.primary_color }}>
        {(card as any).current_tier || 'Base'}
      </p>
      <p className="text-xs text-gray-400">livello</p>
      <p className="text-xs text-gray-300">€{((card as any).total_spent || 0).toFixed(2)} spesi</p>
    </>
  )}
  
  {program.program_type === 'subscription' && (
    <>
      <p className="text-lg font-bold" style={{ color: (card as any).subscription_status === 'active' ? '#10b981' : '#ef4444' }}>
        {(card as any).subscription_status === 'active' ? '✅ Attivo' : '❌ Inattivo'}
      </p>
      <p className="text-xs text-gray-400">
        {(card as any).daily_uses || 0}/{(program as any).daily_limit || 1} oggi
      </p>
    </>
  )}
</div>
                      
                      {/* Status */}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        card.status === 'reward_ready' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {card.status === 'reward_ready' ? '🎁 Premio!' : 'Attiva'}
                      </span>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {!card.card_holder || (!card.card_holder.full_name && !card.card_holder.contact_email && !card.card_holder.phone) ? (
                          // Card SENZA cliente O con cliente vuoto - mostra Associa
                          <button
                            onClick={() => openAssignModal(card)}
                            className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1.5 rounded-lg text-sm font-medium"
                          >
                            👤 Associa Cliente
                          </button>
                        ) : !card.card_holder.contact_email && !card.card_holder.phone ? (
                          // Card CON cliente (con nome) ma SENZA contatti - apre stesso modal
                          <button
                            onClick={() => openAssignModal(card)}
                            className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1.5 rounded-lg text-sm font-medium"
                          >
                            ✏️ Cambia/Aggiungi Contatti
                          </button>
                        ) : (
                          // Card CON cliente E contatti - può inviare
                          <button
                            onClick={() => {
                              setCreatedCard({
                                card: card,
                                holder: card.card_holder || null,
                                link: `${window.location.origin}/c/${card.scan_token}`
                              })
                              setShowSuccessModal(true)
                            }}
                            className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg text-sm font-medium"
                          >
                            📤 Invia
                          </button>
                        )}
                        
                        <Link
                          href={`/c/${card.scan_token}`}
                          target="_blank"
                          className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg text-sm font-medium"
                        >
                          Apri →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Crea Card */}
      {showCreateCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">➕ Nuova Card per "{program.name}"</h2>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Customer Search */}
              {!createNewCustomer && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔍 Cerca Cliente Esistente
                  </label>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      setShowCustomerDropdown(true)
                      setSelectedCustomer(null)
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Digita nome, email o telefono..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    autoComplete="off"
                  />
                  
                  {/* Dropdown Results */}
                  {showCustomerDropdown && customerSearch && (
                    <div className="mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto relative z-10">
                      {filteredCustomers.length === 0 ? (
                        <p className="p-3 text-gray-500 text-sm">Nessun cliente trovato</p>
                      ) : (
                        filteredCustomers.map(customer => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => selectCustomer(customer)}
                            className="w-full p-3 text-left hover:bg-gray-50 flex items-center gap-3"
                          >
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold text-sm">
                                {customer.full_name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{customer.full_name || 'Anonimo'}</p>
                              <p className="text-xs text-gray-500">
                                {customer.contact_email || customer.phone || ''}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  
                  {/* Selected Customer */}
                  {selectedCustomer && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span className="font-medium">{selectedCustomer.full_name}</span>
                        {selectedCustomer.contact_email && (
                          <span className="text-sm text-gray-500">({selectedCustomer.contact_email})</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null)
                          setCustomerSearch('')
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-gray-400 text-sm">oppure</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Toggle Create New */}
              <button
                type="button"
                onClick={toggleNewCustomer}
                className={`w-full p-4 rounded-lg border-2 border-dashed transition-all ${
                  createNewCustomer 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-300 hover:border-indigo-300'
                }`}
              >
                <span className="text-lg">{createNewCustomer ? '✓' : '+'}</span>
                <span className="ml-2 font-medium">
                  {createNewCustomer ? 'Creando nuovo cliente...' : 'Crea Nuovo Cliente'}
                </span>
              </button>

              {/* New Customer Form */}
              {createNewCustomer && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={newCustomer.full_name}
                      onChange={(e) => setNewCustomer({...newCustomer, full_name: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Mario Rossi"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newCustomer.contact_email}
                        onChange={(e) => setNewCustomer({...newCustomer, contact_email: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="email@esempio.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefono
                      </label>
                      <input
                        type="tel"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="+39 333 1234567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data di Nascita
                    </label>
                    <input
                      type="date"
                      value={newCustomer.birth_date}
                      onChange={(e) => setNewCustomer({...newCustomer, birth_date: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Come ci ha conosciuto?
                    </label>
                    <select
                      value={newCustomer.acquisition_source}
                      onChange={(e) => setNewCustomer({...newCustomer, acquisition_source: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note
                    </label>
                    <textarea
                      value={newCustomer.notes}
                      onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={2}
                      placeholder="Note aggiuntive sul cliente..."
                    />
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🏷️ Tag
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTagInForm(tag.id)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                              newCustomer.selectedTags.includes(tag.id)
                                ? 'ring-2 ring-offset-1'
                                : 'opacity-60 hover:opacity-100'
                            }`}
                            style={{
                              backgroundColor: tag.color + '20',
                              color: tag.color
                            }}
                          >
                            {newCustomer.selectedTags.includes(tag.id) ? '✓ ' : ''}{tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="marketing-create"
                      checked={newCustomer.marketing_consent}
                      onChange={(e) => setNewCustomer({...newCustomer, marketing_consent: e.target.checked})}
                      className="w-5 h-5 rounded text-indigo-600"
                    />
                    <label htmlFor="marketing-create" className="text-sm text-gray-700">
                      ✅ Consenso comunicazioni marketing (GDPR)
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateCard(false)
                  resetForm()
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={createCard}
                disabled={createNewCustomer && !newCustomer.full_name}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
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
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">👤 Associa Cliente alla Card</h2>
              <p className="text-sm text-gray-500 mt-1">
                Token: {cardToAssign.scan_token} • {cardToAssign.stamp_count} timbri
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Customer Search */}
              {!createNewCustomer && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔍 Cerca Cliente Esistente
                  </label>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      setShowCustomerDropdown(true)
                      setSelectedCustomer(null)
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Digita nome, email o telefono..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    autoComplete="off"
                  />
                  
                  {/* Dropdown Results */}
                  {showCustomerDropdown && customerSearch && (
                    <div className="mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto relative z-10">
                      {filteredCustomers.length === 0 ? (
                        <p className="p-3 text-gray-500 text-sm">Nessun cliente trovato</p>
                      ) : (
                        filteredCustomers.map(customer => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => selectCustomer(customer)}
                            className="w-full p-3 text-left hover:bg-gray-50 flex items-center gap-3"
                          >
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold text-sm">
                                {customer.full_name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{customer.full_name || 'Anonimo'}</p>
                              <p className="text-xs text-gray-500">
                                {customer.contact_email || customer.phone || ''}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  
                  {/* Selected Customer */}
                  {selectedCustomer && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span className="font-medium">{selectedCustomer.full_name}</span>
                        {selectedCustomer.contact_email && (
                          <span className="text-sm text-gray-500">({selectedCustomer.contact_email})</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null)
                          setCustomerSearch('')
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-gray-400 text-sm">oppure</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Toggle Create New */}
              <button
                type="button"
                onClick={toggleNewCustomer}
                className={`w-full p-4 rounded-lg border-2 border-dashed transition-all ${
                  createNewCustomer 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-300 hover:border-indigo-300'
                }`}
              >
                <span className="text-lg">{createNewCustomer ? '✓' : '+'}</span>
                <span className="ml-2 font-medium">
                  {createNewCustomer ? 'Creando nuovo cliente...' : 'Crea Nuovo Cliente'}
                </span>
              </button>

              {/* New Customer Form */}
              {createNewCustomer && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={newCustomer.full_name}
                      onChange={(e) => setNewCustomer({...newCustomer, full_name: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Mario Rossi"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newCustomer.contact_email}
                        onChange={(e) => setNewCustomer({...newCustomer, contact_email: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="email@esempio.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefono
                      </label>
                      <input
                        type="tel"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="+39 333 1234567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data di Nascita
                    </label>
                    <input
                      type="date"
                      value={newCustomer.birth_date}
                      onChange={(e) => setNewCustomer({...newCustomer, birth_date: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Come ci ha conosciuto?
                    </label>
                    <select
                      value={newCustomer.acquisition_source}
                      onChange={(e) => setNewCustomer({...newCustomer, acquisition_source: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note
                    </label>
                    <textarea
                      value={newCustomer.notes}
                      onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={2}
                      placeholder="Note aggiuntive sul cliente..."
                    />
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🏷️ Tag
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTagInForm(tag.id)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                              newCustomer.selectedTags.includes(tag.id)
                                ? 'ring-2 ring-offset-1'
                                : 'opacity-60 hover:opacity-100'
                            }`}
                            style={{
                              backgroundColor: tag.color + '20',
                              color: tag.color
                            }}
                          >
                            {newCustomer.selectedTags.includes(tag.id) ? '✓ ' : ''}{tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="marketing-assign"
                      checked={newCustomer.marketing_consent}
                      onChange={(e) => setNewCustomer({...newCustomer, marketing_consent: e.target.checked})}
                      className="w-5 h-5 rounded text-indigo-600"
                    />
                    <label htmlFor="marketing-assign" className="text-sm text-gray-700">
                      ✅ Consenso comunicazioni marketing (GDPR)
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAssignModal(false)
                  setCardToAssign(null)
                  resetForm()
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={assignCustomerToCard}
                disabled={!selectedCustomer && (!createNewCustomer || !newCustomer.full_name)}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Associa Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Success - Invia Card */}
      {showSuccessModal && createdCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md text-center">
            <div className="p-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {cardToAssign ? 'Cliente Associato!' : 'Card Creata!'}
              </h2>
              {createdCard.holder && (
                <p className="text-gray-600 mb-6">
                  Card per <strong>{createdCard.holder.full_name}</strong>
                </p>
              )}

              {/* Link */}
              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <p className="text-xs text-gray-500 mb-1">Link della card:</p>
                <p className="text-sm font-mono break-all">{createdCard.link}</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {createdCard.holder?.contact_email && (
                  <button
                    onClick={sendViaEmail}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    📧 Invia via Email
                  </button>
                )}
                
                {createdCard.holder?.phone && (
                  <button
                    onClick={sendViaWhatsApp}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Invia via WhatsApp
                  </button>
                )}
                
                <button
                  onClick={copyLink}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
                >
                  📋 Copia Link
                </button>

                {!createdCard.holder?.contact_email && !createdCard.holder?.phone && createdCard.holder && (
                  <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                    ⚠️ Nessun contatto disponibile. Aggiungi email o telefono al cliente per inviare la card.
                  </p>
                )}

                {!createdCard.holder && (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    💡 Card creata senza cliente. Puoi associare un cliente in seguito.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t">
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  setCreatedCard(null)
                }}
                className="w-full px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}