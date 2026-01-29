'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CardHolder, CustomerTag } from '@/lib/types'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<(CardHolder & { cards_count: number, tags: CustomerTag[] })[]>([])
  const [tags, setTags] = useState<CustomerTag[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Form nuovo cliente
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

  // Form nuovo tag
  const [newTag, setNewTag] = useState({ name: '', color: '#6366f1' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
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

    // Carica tags prima
    const { data: tagsData } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('merchant_id', profile.merchant_id)

    if (tagsData) setTags(tagsData)

    // Carica clienti con conteggio cards
    const { data: customersData } = await supabase
      .from('card_holders')
      .select(`
        *,
        cards:cards(count)
      `)
      .eq('merchant_id', profile.merchant_id)
      .order('created_at', { ascending: false })

    if (customersData && tagsData) {
      // Carica i tag per ogni cliente
      const { data: holderTags } = await supabase
        .from('card_holder_tags')
        .select('card_holder_id, tag_id')

      const customersWithTags = customersData.map(c => ({
        ...c,
        cards_count: c.cards?.[0]?.count || 0,
        tags: holderTags
          ?.filter(ht => ht.card_holder_id === c.id)
          .map(ht => tagsData.find(t => t.id === ht.tag_id))
          .filter(Boolean) as CustomerTag[] || []
      }))
      setCustomers(customersWithTags)
    }

    setLoading(false)
  }

  async function createCustomer() {
    if (!merchantId || !newCustomer.full_name) return

    // Crea il cliente
    const { data, error } = await supabase
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

    if (!error && data) {
      // Aggiungi i tag selezionati
      if (newCustomer.selectedTags.length > 0) {
        await supabase
          .from('card_holder_tags')
          .insert(
            newCustomer.selectedTags.map(tagId => ({
              card_holder_id: data.id,
              tag_id: tagId
            }))
          )
      }

      // Aggiungi alla lista con i tag
      const customerTags = tags.filter(t => newCustomer.selectedTags.includes(t.id))
      setCustomers([{ ...data, cards_count: 0, tags: customerTags }, ...customers])
      
      setShowAddModal(false)
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
  }

  async function createTag() {
    if (!merchantId || !newTag.name) return

    const { data, error } = await supabase
      .from('customer_tags')
      .insert({
        merchant_id: merchantId,
        name: newTag.name,
        color: newTag.color
      })
      .select()
      .single()

    if (!error && data) {
      setTags([...tags, data])
      setShowTagModal(false)
      setNewTag({ name: '', color: '#6366f1' })
    }
  }

  async function deleteTag(tagId: string) {
    if (!confirm('Sei sicuro di voler eliminare questo tag?')) return

    await supabase
      .from('customer_tags')
      .delete()
      .eq('id', tagId)

    setTags(tags.filter(t => t.id !== tagId))
    
    // Rimuovi il tag dai clienti nella UI
    setCustomers(customers.map(c => ({
      ...c,
      tags: c.tags.filter(t => t.id !== tagId)
    })))
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

  // Filtra clienti
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
    
    const matchesTag = filterTag === 'all' || c.tags.some(t => t.id === filterTag)
    
    return matchesSearch && matchesTag
  })

  // Statistiche
  const stats = {
    total: customers.length,
    withEmail: customers.filter(c => c.contact_email).length,
    withMarketing: customers.filter(c => c.marketing_consent).length,
    thisMonth: customers.filter(c => {
      const created = new Date(c.created_at)
      const now = new Date()
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    }).length
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
        <div className="flex justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-indigo-600 hover:underline text-sm">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">👥 Clienti CRM</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowTagModal(true)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
            >
              🏷️ Gestisci Tag
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              + Nuovo Cliente
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">Totale Clienti</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">Con Email</p>
            <p className="text-3xl font-bold text-blue-600">{stats.withEmail}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">Consenso Marketing</p>
            <p className="text-3xl font-bold text-green-600">{stats.withMarketing}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">Nuovi Questo Mese</p>
            <p className="text-3xl font-bold text-purple-600">{stats.thisMonth}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Cerca per nome, email o telefono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterTag('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterTag === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tutti
              </button>
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setFilterTag(filterTag === tag.id ? 'all' : tag.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterTag === tag.id 
                      ? 'ring-2 ring-offset-2' 
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: tag.color + '20', 
                    color: tag.color
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Contatti</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tag</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cards</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Timbri</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ultima Visita</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery || filterTag !== 'all' 
                      ? 'Nessun cliente trovato con questi filtri' 
                      : 'Nessun cliente ancora. Clicca "Nuovo Cliente" per iniziare!'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-semibold">
                            {customer.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {customer.full_name || 'Cliente Anonimo'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(customer.created_at).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {customer.contact_email && (
                          <p className="text-gray-600">📧 {customer.contact_email}</p>
                        )}
                        {customer.phone && (
                          <p className="text-gray-600">📱 {customer.phone}</p>
                        )}
                        {!customer.contact_email && !customer.phone && (
                          <p className="text-gray-400 italic">Nessun contatto</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.length > 0 ? (
                          customer.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: tag.color + '20',
                                color: tag.color
                              }}
                            >
                              {tag.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-sm font-medium">
                        {customer.cards_count}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-gray-900">
                        {customer.total_stamps || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {customer.last_visit 
                        ? new Date(customer.last_visit).toLocaleDateString('it-IT')
                        : 'Mai'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                        href={`/dashboard/customers/${customer.id}`}
                        className="text-indigo-600 hover:underline font-medium"
                      >
                        Dettagli →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal Nuovo Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">➕ Nuovo Cliente</h2>
            </div>
            <div className="p-6 space-y-4">
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
              
              {/* TAG SELECTION */}
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
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          newCustomer.selectedTags.includes(tag.id)
                            ? 'ring-2 ring-offset-2'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: tag.color + '20',
                          color: tag.color,
                          boxShadow: newCustomer.selectedTags.includes(tag.id) 
                            ? `0 0 0 2px white, 0 0 0 4px ${tag.color}` 
                            : 'none'
                        }}
                      >
                        {newCustomer.selectedTags.includes(tag.id) ? '✓ ' : ''}{tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newCustomer.contact_email}
                  onChange={(e) => setNewCustomer({...newCustomer, contact_email: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="mario@email.com"
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
                  rows={3}
                  placeholder="Note aggiuntive sul cliente..."
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={newCustomer.marketing_consent}
                  onChange={(e) => setNewCustomer({...newCustomer, marketing_consent: e.target.checked})}
                  className="w-5 h-5 rounded text-indigo-600"
                />
                <label htmlFor="marketing" className="text-sm text-gray-700">
                  ✅ Consenso comunicazioni marketing (GDPR)
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={createCustomer}
                disabled={!newCustomer.full_name}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Salva Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gestione Tag */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">🏷️ Gestione Tag</h2>
            </div>
            <div className="p-6">
              {/* Tag esistenti */}
              <div className="space-y-2 mb-6">
                {tags.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nessun tag creato</p>
                ) : (
                  tags.map(tag => (
                    <div 
                      key={tag.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: tag.color + '20' }}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium">{tag.name}</span>
                      </div>
                      <button
                        onClick={() => deleteTag(tag.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Nuovo tag */}
              <div className="border-t pt-4">
                <p className="font-medium mb-3">Nuovo Tag</p>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newTag.color}
                    onChange={(e) => setNewTag({...newTag, color: e.target.value})}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newTag.name}
                    onChange={(e) => setNewTag({...newTag, name: e.target.value})}
                    placeholder="Nome tag (es. VIP)"
                    className="flex-1 px-4 py-2 border rounded-lg"
                  />
                  <button
                    onClick={createTag}
                    disabled={!newTag.name}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t">
              <button
                onClick={() => setShowTagModal(false)}
                className="w-full px-4 py-2 border rounded-lg hover:bg-gray-50"
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