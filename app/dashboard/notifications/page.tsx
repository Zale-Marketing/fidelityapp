'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import { Bell } from 'lucide-react'

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

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [merchantId, setMerchantId] = useState('')
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [message, setMessage] = useState('')
  const [sentCount, setSentCount] = useState<number | null>(null)

  const [tags, setTags] = useState<CustomerTag[]>([])
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [recipientCount, setRecipientCount] = useState<number>(0)
  const [countLoading, setCountLoading] = useState(false)

  const countTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [notifHistory, setNotifHistory] = useState<NotificationLog[]>([])

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

      const { data: progs } = await supabase
        .from('programs')
        .select('id, name, program_type, primary_color')
        .eq('merchant_id', profile.merchant_id)
        .order('created_at')

      if (progs) setPrograms(progs)

      const { data: tagsData } = await supabase
        .from('customer_tags')
        .select('*')
        .eq('merchant_id', profile.merchant_id)
        .order('name')
      if (tagsData) setTags(tagsData)

      const { data: logs } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('merchant_id', profile.merchant_id)
        .order('sent_at', { ascending: false })
        .limit(20)

      if (logs) {
        const programMap = new Map(progs?.map(p => [p.id, p.name]) || [])
        setNotifHistory(logs.map((l: any) => ({
          id: l.id,
          program_id: l.program_id,
          program_name: l.program_id ? (programMap.get(l.program_id) || 'Programma') : 'Tutti i programmi',
          message: l.message,
          sent_at: l.sent_at,
          recipients: l.recipients_count || 0,
        })))
      }

      setLoading(false)
    }

    load()
  }, [])

  async function computeRecipientCount(
    currentMerchantId: string,
    currentPrograms: Program[],
    currentSelectedProgram: string,
    currentSelectedTag: string
  ) {
    if (!currentMerchantId) return
    setCountLoading(true)

    const programIds = currentSelectedProgram === 'all'
      ? currentPrograms.map(p => p.id)
      : [currentSelectedProgram]

    if (programIds.length === 0) {
      setRecipientCount(0)
      setCountLoading(false)
      return
    }

    if (currentSelectedTag === 'all') {
      const { data: cards } = await supabase
        .from('cards')
        .select('card_holder_id')
        .in('program_id', programIds)
        .eq('status', 'active')
        .not('card_holder_id', 'is', null)
      const uniqueHolders = new Set((cards || []).map((c: any) => c.card_holder_id))
      setRecipientCount(uniqueHolders.size)
    } else {
      const { data: holderTags } = await supabase
        .from('card_holder_tags')
        .select('card_holder_id')
        .eq('tag_id', currentSelectedTag)

      const taggedHolderIds = (holderTags || []).map((ht: any) => ht.card_holder_id)

      if (taggedHolderIds.length === 0) {
        setRecipientCount(0)
        setCountLoading(false)
        return
      }

      const { data: cards } = await supabase
        .from('cards')
        .select('card_holder_id')
        .in('program_id', programIds)
        .in('card_holder_id', taggedHolderIds)
        .eq('status', 'active')

      const uniqueHolders = new Set((cards || []).map((c: any) => c.card_holder_id))
      setRecipientCount(uniqueHolders.size)
    }

    setCountLoading(false)
  }

  useEffect(() => {
    if (!merchantId) return
    if (countTimer.current) clearTimeout(countTimer.current)
    countTimer.current = setTimeout(() => {
      computeRecipientCount(merchantId, programs, selectedProgram, selectedTag)
    }, 300)
    return () => {
      if (countTimer.current) clearTimeout(countTimer.current)
    }
  }, [merchantId, selectedProgram, selectedTag, programs])

  const handleSend = async () => {
    if (!message.trim()) {
      alert('Inserisci un messaggio.')
      return
    }
    if (message.length > 200) {
      alert('Il messaggio è troppo lungo (max 200 caratteri).')
      return
    }

    setSending(true)
    setSentCount(null)

    try {
      const targetPrograms = selectedProgram === 'all'
        ? programs
        : programs.filter(p => p.id === selectedProgram)

      if (targetPrograms.length === 0) {
        alert('Nessun programma selezionato.')
        setSending(false)
        return
      }

      let taggedHolderIds: string[] | null = null
      if (selectedTag !== 'all') {
        const { data: holderTags } = await supabase
          .from('card_holder_tags')
          .select('card_holder_id')
          .eq('tag_id', selectedTag)
        taggedHolderIds = (holderTags || []).map((ht: any) => ht.card_holder_id)
        if (taggedHolderIds.length === 0) {
          setSending(false)
          return
        }
      }

      let errorCount = 0

      for (const prog of targetPrograms) {
        let query = supabase
          .from('cards')
          .select('id')
          .eq('program_id', prog.id)
          .eq('status', 'active')

        if (taggedHolderIds !== null) {
          query = query.in('card_holder_id', taggedHolderIds)
        }

        const { data: cards } = await query

        if (!cards || cards.length === 0) continue

        const batchSize = 10
        for (let i = 0; i < cards.length; i += batchSize) {
          const batch = cards.slice(i, i + batchSize)
          const updates = batch.map(card =>
            fetch('/api/send-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cardId: card.id, message: message.trim(), header: prog.name })
            }).catch(() => { errorCount++ })
          )
          await Promise.allSettled(updates)
        }
      }

      for (const prog of targetPrograms) {
        await supabase
          .from('notification_logs')
          .insert({
            merchant_id: merchantId,
            program_id: selectedProgram === 'all' ? null : prog.id,
            message: message.trim(),
            sent_at: new Date().toISOString(),
            recipients_count: recipientCount,
          })
          .select()
      }

      setSentCount(recipientCount)
      setMessage('')
      setSelectedTag('all')

      const { data: newLogs } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('sent_at', { ascending: false })
        .limit(20)

      if (newLogs) {
        const programMap = new Map(programs.map(p => [p.id, p.name]))
        setNotifHistory(newLogs.map((l: any) => ({
          id: l.id,
          program_id: l.program_id,
          program_name: l.program_id ? (programMap.get(l.program_id) || 'Programma') : 'Tutti i programmi',
          message: l.message,
          sent_at: l.sent_at,
          recipients: l.recipients_count || 0,
        })))
      }

    } catch (err) {
      console.error(err)
      alert("Errore durante l'invio. Riprova.")
    }

    setSending(false)
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Notifiche</h1>
        <p className="text-sm text-gray-500 mt-1">Invia messaggi ai clienti nel loro Google Wallet</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">

        {/* Form Invio */}
        <div>
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h2 className="font-semibold text-base text-gray-900 mb-1">Invia Messaggio</h2>
            <p className="text-gray-500 text-sm mb-5">
              Il messaggio apparirà nella carta Google Wallet dei tuoi clienti
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Programma destinatario
                </label>
                <select
                  value={selectedProgram}
                  onChange={e => setSelectedProgram(e.target.value)}
                  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors bg-white"
                >
                  <option value="all">Tutti i programmi</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Filtra per tag
                  </label>
                  <select
                    value={selectedTag}
                    onChange={e => setSelectedTag(e.target.value)}
                    className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors bg-white"
                  >
                    <option value="all">Tutti i tag</option>
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.id}>{tag.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Messaggio
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Es: Oggi -20% su tutto! Vieni a trovarci."
                  rows={4}
                  maxLength={200}
                  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{message.length}/200</p>
              </div>

              {/* Recipient count preview */}
              <div className="bg-gray-50 border border-[#E8E8E8] rounded-[8px] px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {countLoading
                    ? 'Calcolo destinatari...'
                    : `${recipientCount} client${recipientCount === 1 ? 'e' : 'i'} ricever${recipientCount === 1 ? 'a' : 'anno'} questa notifica`
                  }
                </span>
                {countLoading && (
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {sentCount !== null && (
                <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-[8px] p-4">
                  <p className="text-[#16A34A] font-semibold text-sm">
                    Notifica inviata a {sentCount} clienti!
                  </p>
                  <p className="text-[#15803D] text-xs mt-1">
                    I clienti la vedranno nella loro carta Wallet nei prossimi minuti.
                  </p>
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={sending || !message.trim() || recipientCount === 0 || countLoading}
                className="w-full bg-[#111111] text-white py-3 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
              >
                {sending ? 'Invio in corso...' : 'Invia Notifica'}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-gray-50 border border-[#E8E8E8] rounded-[12px] p-4">
            <p className="font-medium text-gray-800 text-sm mb-2">Come funziona</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Il messaggio appare nella carta Google Wallet</li>
              <li>I clienti ricevono una notifica push sul telefono</li>
              <li>L'aggiornamento avviene in 1-5 minuti</li>
              <li>Puoi sovrascrivere il messaggio in qualsiasi momento</li>
            </ul>
          </div>
        </div>

        {/* Storia Notifiche */}
        <div>
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h2 className="font-semibold text-base text-gray-900 mb-4">Cronologia Invii</h2>

            {notifHistory.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="Nessuna notifica inviata"
                description="Invia il primo messaggio ai tuoi clienti!"
              />
            ) : (
              <div className="space-y-3">
                {notifHistory.map(log => (
                  <div key={log.id} className="border border-[#F0F0F0] rounded-[8px] p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                        {log.program_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(log.sent_at).toLocaleDateString('it-IT', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-gray-800 text-sm">{log.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Inviata a {log.recipients} clienti
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messaggi correnti nel wallet */}
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mt-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h2 className="font-medium text-gray-800 text-sm mb-3">Messaggi Correnti nel Wallet</h2>
            {programs.length === 0 ? (
              <p className="text-gray-400 text-sm">Nessun programma</p>
            ) : (
              <div className="space-y-2">
                {programs.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.primary_color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    </div>
                    <Link
                      href={`/dashboard/programs/${p.id}`}
                      className="text-xs text-gray-500 hover:text-gray-900 whitespace-nowrap transition-colors"
                    >
                      Vedi
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
