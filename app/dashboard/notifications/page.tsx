'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import { Bell, MessageCircle } from 'lucide-react'
import { usePlan } from '@/lib/hooks/usePlan'
import UpgradePrompt from '@/components/ui/UpgradePrompt'

type Program = {
  id: string
  name: string
  program_type: string
  primary_color: string
}

type CustomerTag = {
  id: string
  merchant_id: string
  name: string
  color: string
  created_at: string
}

type NotificationLog = {
  id: string
  program_id: string | null
  program_name: string
  message: string
  sent_at: string
  recipients: number
}

type WhatsAppLog = {
  id: string
  to_phone: string
  message: string
  status: string
  event_type: string
  created_at: string
}

type WaSegment = 'all' | 'active' | 'dormant' | 'lost' | 'program'

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { isFree, loading: planLoading } = usePlan()

  const [merchantId, setMerchantId] = useState('')
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [activeTab, setActiveTab] = useState<'push' | 'whatsapp'>('push')

  // Push state
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [message, setMessage] = useState('')
  const [sentCount, setSentCount] = useState<number | null>(null)
  const [tags, setTags] = useState<CustomerTag[]>([])
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [recipientCount, setRecipientCount] = useState<number>(0)
  const [countLoading, setCountLoading] = useState(false)
  const countTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [notifHistory, setNotifHistory] = useState<NotificationLog[]>([])

  // WhatsApp state
  const [waConnected, setWaConnected] = useState(false)
  const [waSegment, setWaSegment] = useState<WaSegment>('all')
  const [waProgram, setWaProgram] = useState<string>('')
  const [waMessage, setWaMessage] = useState('')
  const [waRecipientCount, setWaRecipientCount] = useState(0)
  const [waCountLoading, setWaCountLoading] = useState(false)
  const [waSending, setWaSending] = useState(false)
  const [waSentResult, setWaSentResult] = useState<{ sent: number; failed: number } | null>(null)
  const [waLogs, setWaLogs] = useState<WhatsAppLog[]>([])
  const waCountTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const VARIABLES = ['{nome}', '{bollini}', '{premio}', '{link_carta}']

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('merchant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.merchant_id) { router.push('/register'); return }

      setMerchantId(profile.merchant_id)

      const [progsRes, tagsRes, logsRes] = await Promise.all([
        supabase.from('programs').select('id, name, program_type, primary_color')
          .eq('merchant_id', profile.merchant_id).is('deleted_at', null).order('created_at'),
        supabase.from('customer_tags').select('*')
          .eq('merchant_id', profile.merchant_id).order('name'),
        supabase.from('notification_logs').select('*')
          .eq('merchant_id', profile.merchant_id).order('sent_at', { ascending: false }).limit(20),
      ])

      if (progsRes.data) setPrograms(progsRes.data)
      if (tagsRes.data) setTags(tagsRes.data)
      if (logsRes.data) {
        const programMap = new Map(progsRes.data?.map((p: any) => [p.id, p.name]) || [])
        setNotifHistory(logsRes.data.map((l: any) => ({
          id: l.id,
          program_id: l.program_id,
          program_name: l.program_id ? (programMap.get(l.program_id) || 'Programma') : 'Tutti i programmi',
          message: l.message,
          sent_at: l.sent_at,
          recipients: l.recipients_count || 0,
        })))
      }

      // WhatsApp status (non-blocking)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const waRes = await fetch('/api/whatsapp/status?action=status', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (waRes.ok) {
            const waData = await waRes.json()
            setWaConnected(waData.status === 'connected')
          }
        }
      } catch { /* ignore */ }

      // WhatsApp logs
      try {
        const { data: wlData } = await supabase
          .from('whatsapp_logs')
          .select('id, to_phone, message, status, event_type, created_at')
          .eq('merchant_id', profile.merchant_id)
          .order('created_at', { ascending: false })
          .limit(30)
        if (wlData) setWaLogs(wlData)
      } catch { /* ignore */ }

      setLoading(false)
    }

    load()
  }, [])

  // Push recipient count
  async function computeRecipientCount(
    mid: string, progs: Program[], prog: string, tag: string
  ) {
    if (!mid) return
    setCountLoading(true)
    const programIds = prog === 'all' ? progs.map(p => p.id) : [prog]
    if (!programIds.length) { setRecipientCount(0); setCountLoading(false); return }

    if (tag === 'all') {
      const { data: cards } = await supabase.from('cards').select('card_holder_id')
        .in('program_id', programIds).eq('status', 'active').not('card_holder_id', 'is', null)
      setRecipientCount(new Set((cards || []).map((c: any) => c.card_holder_id)).size)
    } else {
      const { data: holderTags } = await supabase.from('card_holder_tags')
        .select('card_holder_id').eq('tag_id', tag)
      const ids = (holderTags || []).map((ht: any) => ht.card_holder_id)
      if (!ids.length) { setRecipientCount(0); setCountLoading(false); return }
      const { data: cards } = await supabase.from('cards').select('card_holder_id')
        .in('program_id', programIds).in('card_holder_id', ids).eq('status', 'active')
      setRecipientCount(new Set((cards || []).map((c: any) => c.card_holder_id)).size)
    }
    setCountLoading(false)
  }

  useEffect(() => {
    if (!merchantId) return
    if (countTimer.current) clearTimeout(countTimer.current)
    countTimer.current = setTimeout(() => {
      computeRecipientCount(merchantId, programs, selectedProgram, selectedTag)
    }, 300)
    return () => { if (countTimer.current) clearTimeout(countTimer.current) }
  }, [merchantId, selectedProgram, selectedTag, programs])

  // WhatsApp recipient count per segmento
  async function computeWaRecipientCount(mid: string, seg: WaSegment, progId: string) {
    if (!mid) return
    setWaCountLoading(true)

    const now = new Date()
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

    let cardsQuery = supabase.from('cards').select('card_holder_id, updated_at')
      .eq('merchant_id', mid).not('card_holder_id', 'is', null).is('deleted_at', null)

    if (seg === 'program' && progId) {
      cardsQuery = cardsQuery.eq('program_id', progId)
    }

    const { data: allCards } = await cardsQuery
    let filtered = allCards || []

    if (seg === 'active') filtered = filtered.filter((c: any) => c.updated_at && c.updated_at >= d30)
    else if (seg === 'dormant') filtered = filtered.filter((c: any) => c.updated_at && c.updated_at < d30 && c.updated_at >= d90)
    else if (seg === 'lost') filtered = filtered.filter((c: any) => !c.updated_at || c.updated_at < d90)

    const holderIds = [...new Set(filtered.map((c: any) => c.card_holder_id).filter(Boolean))]
    if (!holderIds.length) { setWaRecipientCount(0); setWaCountLoading(false); return }

    const { data: holders } = await supabase.from('card_holders').select('id')
      .in('id', holderIds).not('phone', 'is', null).neq('phone', '')

    setWaRecipientCount((holders || []).length)
    setWaCountLoading(false)
  }

  useEffect(() => {
    if (!merchantId) return
    if (waCountTimer.current) clearTimeout(waCountTimer.current)
    waCountTimer.current = setTimeout(() => {
      computeWaRecipientCount(merchantId, waSegment, waProgram)
    }, 300)
    return () => { if (waCountTimer.current) clearTimeout(waCountTimer.current) }
  }, [merchantId, waSegment, waProgram])

  // Push send
  const handleSend = async () => {
    if (!message.trim()) { alert('Inserisci un messaggio.'); return }
    if (message.length > 200) { alert('Messaggio troppo lungo (max 200 caratteri).'); return }

    setSending(true)
    setSentCount(null)
    try {
      const targetPrograms = selectedProgram === 'all' ? programs : programs.filter(p => p.id === selectedProgram)
      if (!targetPrograms.length) { setSending(false); return }

      let taggedHolderIds: string[] | null = null
      if (selectedTag !== 'all') {
        const { data: ht } = await supabase.from('card_holder_tags').select('card_holder_id').eq('tag_id', selectedTag)
        taggedHolderIds = (ht || []).map((h: any) => h.card_holder_id)
        if (!taggedHolderIds.length) { setSending(false); return }
      }

      for (const prog of targetPrograms) {
        let q = supabase.from('cards').select('id').eq('program_id', prog.id).eq('status', 'active')
        if (taggedHolderIds !== null) q = q.in('card_holder_id', taggedHolderIds)
        const { data: cards } = await q
        if (!cards?.length) continue

        for (let i = 0; i < cards.length; i += 10) {
          const batch = cards.slice(i, i + 10)
          await Promise.allSettled(batch.map(card =>
            fetch('/api/send-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cardId: card.id, message: message.trim(), header: prog.name }),
            }).catch(() => {})
          ))
        }
      }

      for (const prog of targetPrograms) {
        await supabase.from('notification_logs').insert({
          merchant_id: merchantId,
          program_id: selectedProgram === 'all' ? null : prog.id,
          message: message.trim(),
          sent_at: new Date().toISOString(),
          recipients_count: recipientCount,
        })
      }

      setSentCount(recipientCount)
      setMessage('')
      setSelectedTag('all')
    } catch (err) {
      console.error(err)
      alert("Errore durante l'invio.")
    }
    setSending(false)
  }

  // WhatsApp send
  const handleWaSend = async () => {
    if (!waMessage.trim()) { alert('Inserisci un messaggio.'); return }
    if (!waRecipientCount) { alert('Nessun destinatario con numero WhatsApp.'); return }

    setWaSending(true)
    setWaSentResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch('/api/whatsapp/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: waMessage.trim(),
          segment: waSegment === 'program' ? 'all' : waSegment,
          programId: waSegment === 'program' && waProgram ? waProgram : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Errore durante l'invio.")
        setWaSending(false)
        return
      }

      const result = await res.json()
      setWaSentResult({ sent: result.sent, failed: result.failed })
      setWaMessage('')

      // Refresh logs
      const { data: wlData } = await supabase
        .from('whatsapp_logs')
        .select('id, to_phone, message, status, event_type, created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (wlData) setWaLogs(wlData)
    } catch (err) {
      console.error(err)
      alert("Errore durante l'invio.")
    }
    setWaSending(false)
  }

  function insertVariable(v: string) {
    setWaMessage(prev => prev + v)
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Notifiche</h1>
        <p className="text-sm text-gray-500 mt-1">Invia messaggi ai clienti</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-1 border border-[#E8E8E8] bg-white rounded-[8px] p-1 inline-flex">
          <button
            onClick={() => setActiveTab('push')}
            className={`px-4 py-2 rounded-[6px] text-sm font-medium transition-colors ${
              activeTab === 'push' ? 'bg-[#111111] text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Push Notification
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-4 py-2 rounded-[6px] text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'whatsapp' ? 'bg-[#111111] text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageCircle size={14} />
            WhatsApp
          </button>
        </div>
      </div>

      {/* ── Push Tab ── */}
      {activeTab === 'push' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            {!planLoading && isFree ? (
              <UpgradePrompt feature="Notifiche Push" requiredPlan="PRO" />
            ) : (
              <>
                <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                  <h2 className="font-semibold text-base text-gray-900 mb-1">Invia Messaggio</h2>
                  <p className="text-gray-500 text-sm mb-5">Il messaggio apparirà nella carta Google Wallet</p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Programma</label>
                      <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}
                        className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none bg-white">
                        <option value="all">Tutti i programmi</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    {tags.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Filtra per tag</label>
                        <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)}
                          className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none bg-white">
                          <option value="all">Tutti i tag</option>
                          {tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Messaggio</label>
                      <textarea value={message} onChange={e => setMessage(e.target.value)}
                        placeholder="Es: Oggi -20% su tutto!" rows={4} maxLength={200}
                        className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none resize-none" />
                      <p className="text-xs text-gray-400 text-right mt-1">{message.length}/200</p>
                    </div>

                    <div className="bg-gray-50 border border-[#E8E8E8] rounded-[8px] px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {countLoading ? 'Calcolo...' : `${recipientCount} clienti`}
                      </span>
                      {countLoading && <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />}
                    </div>

                    {sentCount !== null && (
                      <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-[8px] p-4">
                        <p className="text-[#16A34A] font-semibold text-sm">Notifica inviata a {sentCount} clienti!</p>
                      </div>
                    )}

                    <button onClick={handleSend}
                      disabled={sending || !message.trim() || recipientCount === 0 || countLoading}
                      className="w-full bg-[#111111] text-white py-3 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors">
                      {sending ? 'Invio...' : 'Invia Notifica'}
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 border border-[#E8E8E8] rounded-[12px] p-4">
                  <p className="font-medium text-gray-800 text-sm mb-2">Come funziona</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>Il messaggio appare nella carta Google Wallet</li>
                    <li>I clienti ricevono una notifica push sul telefono</li>
                    <li>L'aggiornamento avviene in 1-5 minuti</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          <div>
            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h2 className="font-semibold text-base text-gray-900 mb-4">Cronologia Invii</h2>
              {notifHistory.length === 0 ? (
                <EmptyState icon={Bell} title="Nessuna notifica inviata" description="Invia il primo messaggio!" />
              ) : (
                <div className="space-y-3">
                  {notifHistory.map(log => (
                    <div key={log.id} className="border border-[#F0F0F0] rounded-[8px] p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">{log.program_name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.sent_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-800 text-sm">{log.message}</p>
                      <p className="text-xs text-gray-400 mt-2">Inviata a {log.recipients} clienti</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mt-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h2 className="font-medium text-gray-800 text-sm mb-3">Messaggi Correnti nel Wallet</h2>
              {programs.length === 0 ? (
                <p className="text-gray-400 text-sm">Nessun programma</p>
              ) : (
                <div className="space-y-2">
                  {programs.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.primary_color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                      </div>
                      <Link href={`/dashboard/programs/${p.id}`} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">Vedi</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── WhatsApp Tab ── */}
      {activeTab === 'whatsapp' && (
        <>
          {!planLoading && isFree ? (
            <UpgradePrompt feature="WhatsApp Marketing" requiredPlan="PRO" />
          ) : !waConnected ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-[12px] p-5 max-w-md">
              <p className="text-yellow-800 text-sm font-medium mb-2">WhatsApp non connesso</p>
              <p className="text-yellow-700 text-sm mb-4">
                Configura SendApp Cloud nelle impostazioni per inviare messaggi WhatsApp ai tuoi clienti.
              </p>
              <Link href="/dashboard/settings/whatsapp"
                className="inline-flex bg-[#111111] text-white px-4 py-2 rounded-[8px] text-sm font-semibold hover:bg-[#333333] transition-colors">
                Configura WhatsApp
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Form invio */}
              <div>
                <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                  <h2 className="font-semibold text-base text-gray-900 mb-1">Campagna WhatsApp</h2>
                  <p className="text-gray-500 text-sm mb-5">Invia un messaggio direttamente su WhatsApp dei clienti</p>

                  <div className="space-y-4">
                    {/* Segmento */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Segmento</label>
                      <select value={waSegment} onChange={e => setWaSegment(e.target.value as WaSegment)}
                        className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none bg-white">
                        <option value="all">Tutti i clienti</option>
                        <option value="active">Attivi (ultimi 30 giorni)</option>
                        <option value="dormant">Dormienti (30-90 giorni)</option>
                        <option value="lost">Persi (più di 90 giorni)</option>
                        <option value="program">Programma specifico</option>
                      </select>
                    </div>

                    {waSegment === 'program' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Programma</label>
                        <select value={waProgram} onChange={e => setWaProgram(e.target.value)}
                          className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none bg-white">
                          <option value="">Seleziona programma</option>
                          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Contatore live */}
                    <div className="bg-gray-50 border border-[#E8E8E8] rounded-[8px] px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {waCountLoading ? 'Calcolo destinatari...' : `${waRecipientCount} clienti con numero WhatsApp`}
                      </span>
                      {waCountLoading && <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />}
                    </div>

                    {/* Variabili */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Messaggio
                        <span className="text-xs font-normal text-gray-400 ml-1">— usa variabili:</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {VARIABLES.map(v => (
                          <button key={v} type="button" onClick={() => insertVariable(v)}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded font-mono transition-colors">
                            {v}
                          </button>
                        ))}
                      </div>
                      <textarea value={waMessage} onChange={e => setWaMessage(e.target.value)}
                        placeholder={"Es: Ciao {nome}! Hai {bollini} bollini. Ti mancano poco per il premio!"}
                        rows={4} maxLength={1000}
                        className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none resize-none" />
                      <p className="text-xs text-gray-400 text-right mt-1">{waMessage.length}/1000</p>
                    </div>

                    {/* Preview bolla WhatsApp */}
                    {waMessage.trim() && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Preview</p>
                        <div className="bg-[#ECF8C6] rounded-[12px] rounded-tl-none px-4 py-3 max-w-xs text-sm text-gray-800 whitespace-pre-wrap shadow-sm border border-[#D4EFA0]">
                          {waMessage
                            .replace(/\{nome\}/g, 'Mario')
                            .replace(/\{bollini\}/g, '7')
                            .replace(/\{premio\}/g, 'Caffè Gratis')
                            .replace(/\{link_carta\}/g, 'fidelityapp.it/c/...')}
                        </div>
                      </div>
                    )}

                    {waSentResult && (
                      <div className={`rounded-[8px] p-4 ${waSentResult.failed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-[#DCFCE7] border border-[#BBF7D0]'}`}>
                        <p className={`font-semibold text-sm ${waSentResult.failed > 0 ? 'text-yellow-800' : 'text-[#16A34A]'}`}>
                          Inviati: {waSentResult.sent} — Falliti: {waSentResult.failed}
                        </p>
                      </div>
                    )}

                    <button onClick={handleWaSend}
                      disabled={waSending || !waMessage.trim() || waRecipientCount === 0 || waCountLoading}
                      className="w-full bg-[#111111] text-white py-3 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors">
                      {waSending ? 'Invio campagna...' : 'Invia Campagna WhatsApp'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Storico WhatsApp */}
              <div>
                <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                  <h2 className="font-semibold text-base text-gray-900 mb-4">Storico WhatsApp</h2>
                  {waLogs.length === 0 ? (
                    <EmptyState icon={MessageCircle} title="Nessun messaggio inviato" description="Invia la prima campagna WhatsApp!" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[#F0F0F0]">
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">Data</th>
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">Numero</th>
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">Messaggio</th>
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">Stato</th>
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">Tipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {waLogs.map(log => (
                            <tr key={log.id} className="border-b border-[#F8F8F8] hover:bg-gray-50">
                              <td className="py-2 px-2 text-gray-500 whitespace-nowrap">
                                {new Date(log.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2 px-2 text-gray-700 font-mono">{log.to_phone}</td>
                              <td className="py-2 px-2 text-gray-700 max-w-[160px] truncate" title={log.message}>
                                {log.message ? log.message.slice(0, 50) + (log.message.length > 50 ? '...' : '') : '—'}
                              </td>
                              <td className="py-2 px-2">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                                  log.status === 'sent' ? 'bg-green-100 text-green-700' :
                                  log.status === 'failed' ? 'bg-red-100 text-red-700' :
                                  log.status === 'received' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-gray-400">{log.event_type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-4 mt-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">WhatsApp connesso</p>
                      <p className="text-xs text-gray-500 mt-0.5">SendApp Cloud</p>
                    </div>
                    <Link href="/dashboard/settings/whatsapp"
                      className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
                      Gestisci
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
