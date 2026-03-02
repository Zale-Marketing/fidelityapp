'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Program = {
  id: string
  name: string
  program_type: string
  primary_color: string
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

  // Form
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [message, setMessage] = useState('')
  const [sentCount, setSentCount] = useState<number | null>(null)

  // Log notifiche (ultime inviate - dalla tabella programs come wallet_message)
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

      // Carica storia notifiche dalla tabella notification_logs se esiste,
      // altrimenti mostra cronologia da wallet_message dei programmi
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
      // Determina quali programmi aggiornare
      const targetPrograms = selectedProgram === 'all'
        ? programs
        : programs.filter(p => p.id === selectedProgram)

      if (targetPrograms.length === 0) {
        alert('Nessun programma selezionato.')
        setSending(false)
        return
      }

      let totalCards = 0
      let errorCount = 0

      for (const prog of targetPrograms) {
        // 1. Aggiorna wallet_message nel programma
        await supabase
          .from('programs')
          .update({ wallet_message: message.trim() })
          .eq('id', prog.id)

        // 2. Prendi tutte le card attive del programma
        const { data: cards } = await supabase
          .from('cards')
          .select('id')
          .eq('program_id', prog.id)
          .eq('status', 'active')

        if (!cards || cards.length === 0) continue

        totalCards += cards.length

        // 3. Aggiorna ogni carta nel Google Wallet (batch)
        const batchSize = 10
        for (let i = 0; i < cards.length; i += batchSize) {
          const batch = cards.slice(i, i + batchSize)
          const updates = batch.map(card =>
            fetch('/api/wallet-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cardId: card.id })
            }).catch(() => { errorCount++ })
          )
          await Promise.allSettled(updates)
        }
      }

      // 4. Salva log notifica
      for (const prog of targetPrograms) {
        const { data: cardCount } = await supabase
          .from('cards')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', prog.id)
          .eq('status', 'active')

        await supabase
          .from('notification_logs')
          .insert({
            merchant_id: merchantId,
            program_id: selectedProgram === 'all' ? null : prog.id,
            message: message.trim(),
            sent_at: new Date().toISOString(),
            recipients_count: totalCards,
          })
          .select()
      }

      setSentCount(totalCards)
      setMessage('')

      // Ricarica history
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
      alert('Errore durante l\'invio. Riprova.')
    }

    setSending(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <Link href="/dashboard" className="text-indigo-600 hover:underline text-sm">
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900">📢 Notifiche</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">

          {/* ============ FORM INVIO ============ */}
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="font-bold text-lg text-gray-900 mb-1">Invia Messaggio</h2>
              <p className="text-gray-500 text-sm mb-5">
                Il messaggio apparirà nella carta Google Wallet dei tuoi clienti
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Programma destinatario
                  </label>
                  <select
                    value={selectedProgram}
                    onChange={e => setSelectedProgram(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  >
                    <option value="all">Tutti i programmi</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Messaggio
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Es: Oggi -20% su tutto! Vieni a trovarci."
                    rows={4}
                    maxLength={200}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{message.length}/200</p>
                </div>

                {sentCount !== null && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-green-700 font-semibold">
                      Messaggio inviato a {sentCount} carte!
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      I clienti lo vedranno nella loro carta Wallet nei prossimi minuti.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {sending ? 'Invio in corso...' : '📤 Invia Notifica'}
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-semibold text-blue-800 mb-2">Come funziona</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Il messaggio appare nella carta Google Wallet</li>
                <li>• I clienti ricevono una notifica push sul telefono</li>
                <li>• L'aggiornamento avviene in 1-5 minuti</li>
                <li>• Puoi sovrascrivere il messaggio in qualsiasi momento</li>
              </ul>
            </div>
          </div>

          {/* ============ STORIA NOTIFICHE ============ */}
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-lg text-gray-900 mb-4">Cronologia Invii</h2>

              {notifHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📭</div>
                  <p>Nessuna notifica inviata ancora</p>
                  <p className="text-sm mt-1">Invia il primo messaggio ai tuoi clienti!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifHistory.map(log => (
                    <div key={log.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
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
                        Inviata a {log.recipients} carte
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Programmi e wallet_message attuali */}
            <div className="bg-white rounded-xl shadow-sm p-6 mt-4">
              <h2 className="font-semibold text-gray-800 mb-3">Messaggi Correnti nel Wallet</h2>
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
                        className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                      >
                        Vedi →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
