'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CardHolder, CustomerTag } from '@/lib/types'
import MetricCard from '@/components/ui/MetricCard'
import EmptyState from '@/components/ui/EmptyState'
import { Users, Search, Tag, Mail, Phone, Plus, Trash2, Download, Check } from 'lucide-react'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<(CardHolder & { cards_count: number, tags: CustomerTag[] })[]>([])
  const [tags, setTags] = useState<CustomerTag[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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

  const [newTag, setNewTag] = useState({ name: '', color: '#111111' })

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

    const { data: tagsData } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('merchant_id', profile.merchant_id)

    if (tagsData) setTags(tagsData)

    const { data: customersData } = await supabase
      .from('card_holders')
      .select(`
        *,
        cards:cards(count)
      `)
      .eq('merchant_id', profile.merchant_id)
      .order('created_at', { ascending: false })

    if (customersData && tagsData) {
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
      setNewTag({ name: '', color: '#111111' })
    }
  }

  async function deleteTag(tagId: string) {
    if (!confirm('Sei sicuro di voler eliminare questo tag?')) return

    await supabase
      .from('customer_tags')
      .delete()
      .eq('id', tagId)

    setTags(tags.filter(t => t.id !== tagId))

    setCustomers(customers.map(c => ({
      ...c,
      tags: c.tags.filter(t => t.id !== tagId)
    })))
  }

  async function exportCSV() {
    if (exporting) return
    setExporting(true)

    try {
      const holderIds = filteredCustomers.map(c => c.id)

      if (holderIds.length === 0) {
        setExporting(false)
        return
      }

      const { data: cards } = await supabase
        .from('cards')
        .select(`
          card_holder_id,
          stamp_count,
          points_balance,
          cashback_balance,
          current_tier,
          subscription_status,
          programs:program_id (name, program_type)
        `)
        .in('card_holder_id', holderIds)
        .eq('status', 'active')

      const rows: string[][] = []
      rows.push(['Nome', 'Email', 'Telefono', 'Programma', 'Saldo Corrente', 'Data Iscrizione', 'Tag'])

      for (const customer of filteredCustomers) {
        const customerCards = (cards || []).filter(c => c.card_holder_id === customer.id)
        const tagNames = customer.tags.map(t => t.name).join('; ')
        const dateIscrizione = new Date(customer.created_at).toLocaleDateString('it-IT')

        if (customerCards.length === 0) {
          rows.push([
            customer.full_name || '',
            customer.contact_email || '',
            customer.phone || '',
            '',
            '',
            dateIscrizione,
            tagNames,
          ])
        } else {
          for (const card of customerCards) {
            const programRaw = card.programs as unknown
            const program = Array.isArray(programRaw) ? (programRaw[0] as { name: string; program_type: string } | undefined) : (programRaw as { name: string; program_type: string } | null)
            const programName = program?.name || ''
            const programType = program?.program_type || ''

            let saldo = ''
            if (programType === 'stamps') saldo = String(card.stamp_count ?? 0)
            else if (programType === 'points') saldo = String(card.points_balance ?? 0)
            else if (programType === 'cashback') saldo = `${card.cashback_balance ?? 0}`
            else if (programType === 'tiers') saldo = card.current_tier || ''
            else if (programType === 'subscription') saldo = card.subscription_status || ''

            rows.push([
              customer.full_name || '',
              customer.contact_email || '',
              customer.phone || '',
              programName,
              saldo,
              dateIscrizione,
              tagNames,
            ])
          }
        }
      }

      const csvContent = rows.map(row =>
        row.map(cell => {
          const str = String(cell ?? '')
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        }).join(',')
      ).join('\n')

      const today = new Date().toISOString().slice(0, 10)
      const filename = `clienti-${today}.csv`
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (err) {
      console.error('Errore export CSV:', err)
      alert("Errore durante l'esportazione. Riprova.")
    }

    setExporting(false)
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

  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)

    const matchesTag = filterTag === 'all' || c.tags.some(t => t.id === filterTag)

    return matchesSearch && matchesTag
  })

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="px-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clienti</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci i tuoi clienti</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTagModal(true)}
            className="border border-[#E0E0E0] text-gray-700 px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors flex items-center gap-2"
          >
            <Tag size={14} />
            Gestisci Tag
          </button>
          <button
            onClick={exportCSV}
            disabled={exporting || filteredCustomers.length === 0}
            className="border border-[#E0E0E0] text-gray-700 px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Download size={14} />
            {exporting ? 'Esportazione...' : 'Esporta CSV'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#111111] text-white px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors flex items-center gap-2"
          >
            <Plus size={14} />
            Nuovo Cliente
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Totale Clienti" value={stats.total} icon={<Users size={20} />} />
        <MetricCard label="Con Email" value={stats.withEmail} icon={<Mail size={20} />} />
        <MetricCard label="Consenso Marketing" value={stats.withMarketing} icon={<Check size={20} />} />
        <MetricCard label="Nuovi Questo Mese" value={stats.thisMonth} icon={<Plus size={20} />} />
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per nome, email o telefono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterTag('all')}
              className={`px-3 py-2 rounded-[8px] text-sm font-medium transition-colors ${
                filterTag === 'all'
                  ? 'bg-[#111111] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tutti
            </button>
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setFilterTag(filterTag === tag.id ? 'all' : tag.id)}
                className={`px-3 py-2 rounded-[8px] text-sm font-medium transition-all ${
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
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F0F0F0]">
          <span className="text-sm text-gray-500">
            {filteredCustomers.length} client{filteredCustomers.length === 1 ? 'e' : 'i'}
            {(searchQuery || filterTag !== 'all') ? ' (filtrati)' : ''}
          </span>
        </div>
      </div>

      {/* Customers Table */}
      {filteredCustomers.length === 0 && !searchQuery && filterTag === 'all' ? (
        <EmptyState
          icon={Users}
          title="Nessun cliente"
          description="I clienti appariranno qui quando si iscrivono al tuo programma"
          actionLabel="Aggiungi Cliente"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="bg-white rounded-[12px] border border-[#E8E8E8] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9F9F9] border-b border-[#F0F0F0]">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contatti</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tag</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cards</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Timbri</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ultima Visita</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                    Nessun cliente trovato con questi filtri
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-700 font-semibold text-sm">
                            {customer.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">
                            {customer.full_name || 'Cliente Anonimo'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(customer.created_at).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-0.5">
                        {customer.contact_email && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Mail size={12} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[140px]">{customer.contact_email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone size={12} className="text-gray-400 flex-shrink-0" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {!customer.contact_email && !customer.phone && (
                          <p className="text-gray-400 italic text-xs">Nessun contatto</p>
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
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                        {customer.cards_count}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-base font-bold text-gray-900">
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
                        className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        Dettagli
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nuovo Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#F0F0F0]">
              <h2 className="text-lg font-semibold text-gray-900">Nuovo Cliente</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={newCustomer.full_name}
                  onChange={(e) => setNewCustomer({...newCustomer, full_name: e.target.value})}
                  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                  placeholder="Mario Rossi"
                />
              </div>

              {tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tag
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
                        {newCustomer.selectedTags.includes(tag.id) ? 'ok ' : ''}{tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={newCustomer.contact_email}
                  onChange={(e) => setNewCustomer({...newCustomer, contact_email: e.target.value})}
                  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                  placeholder="mario@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefono</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                  placeholder="+39 333 1234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Data di Nascita</label>
                <input
                  type="date"
                  value={newCustomer.birth_date}
                  onChange={(e) => setNewCustomer({...newCustomer, birth_date: e.target.value})}
                  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Come ci ha conosciuto?</label>
                <select
                  value={newCustomer.acquisition_source}
                  onChange={(e) => setNewCustomer({...newCustomer, acquisition_source: e.target.value})}
                  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors bg-white"
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Note</label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors resize-none"
                  rows={3}
                  placeholder="Note aggiuntive sul cliente..."
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-[8px] border border-[#E8E8E8]">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={newCustomer.marketing_consent}
                  onChange={(e) => setNewCustomer({...newCustomer, marketing_consent: e.target.checked})}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="marketing" className="text-sm text-gray-700">
                  Consenso comunicazioni marketing (GDPR)
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-[#F0F0F0] flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 border border-[#E0E0E0] text-gray-700 px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={createCustomer}
                disabled={!newCustomer.full_name}
                className="flex-1 bg-[#111111] text-white px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] disabled:opacity-50 transition-colors"
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
          <div className="bg-white rounded-[12px] w-full max-w-md">
            <div className="p-6 border-b border-[#F0F0F0]">
              <h2 className="text-lg font-semibold text-gray-900">Gestione Tag</h2>
            </div>
            <div className="p-6">
              <div className="space-y-2 mb-6">
                {tags.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-sm">Nessun tag creato</p>
                ) : (
                  tags.map(tag => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 rounded-[8px]"
                      style={{ backgroundColor: tag.color + '15' }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium text-sm">{tag.name}</span>
                      </div>
                      <button
                        onClick={() => deleteTag(tag.id)}
                        className="text-[#DC2626] hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-[#F0F0F0] pt-4">
                <p className="font-medium text-sm text-gray-700 mb-3">Nuovo Tag</p>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newTag.color}
                    onChange={(e) => setNewTag({...newTag, color: e.target.value})}
                    className="w-10 h-10 rounded-[8px] cursor-pointer border border-[#E0E0E0]"
                  />
                  <input
                    type="text"
                    value={newTag.name}
                    onChange={(e) => setNewTag({...newTag, name: e.target.value})}
                    placeholder="Nome tag (es. VIP)"
                    className="flex-1 px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                  />
                  <button
                    onClick={createTag}
                    disabled={!newTag.name}
                    className="bg-[#111111] text-white px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-[#333333] disabled:opacity-50 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#F0F0F0]">
              <button
                onClick={() => setShowTagModal(false)}
                className="w-full border border-[#E0E0E0] text-gray-700 px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors"
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
