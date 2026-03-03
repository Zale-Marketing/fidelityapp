'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { MessageCircle, Wifi, WifiOff } from 'lucide-react'
import { usePlan } from '@/lib/hooks/usePlan'
import UpgradePrompt from '@/components/ui/UpgradePrompt'

type SessionStatus = 'not_connected' | 'pending' | 'qr-code' | 'active' | 'idle' | 'phone-error'

export default function WhatsAppSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { isFree, loading: planLoading } = usePlan()

  const [loading, setLoading] = useState(true)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('not_connected')
  const [connecting, setConnecting] = useState(false)
  const [qrTimestamp, setQrTimestamp] = useState(0)
  const [dailyCount, setDailyCount] = useState(0)

  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchStatus() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/whatsapp/status?action=status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) return

      const data = await res.json()
      setSessionStatus((data.status || 'not_connected') as SessionStatus)
      setDailyCount(data.dailyCount || 0)
      return data.status as string
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      await fetchStatus()
      setLoading(false)
    }
    load()
  }, [])

  // Poll status every 3s when pending or qr-code
  useEffect(() => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current)
      statusPollRef.current = null
    }

    if (sessionStatus === 'pending' || sessionStatus === 'qr-code') {
      statusPollRef.current = setInterval(async () => {
        const newStatus = await fetchStatus()
        if (newStatus === 'active') {
          if (statusPollRef.current) {
            clearInterval(statusPollRef.current)
            statusPollRef.current = null
          }
        }
      }, 3000)
    }

    return () => {
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current)
        statusPollRef.current = null
      }
    }
  }, [sessionStatus])

  // Refresh QR image every 30s while waiting for scan
  useEffect(() => {
    if (qrRefreshRef.current) {
      clearInterval(qrRefreshRef.current)
      qrRefreshRef.current = null
    }

    if (sessionStatus === 'pending' || sessionStatus === 'qr-code') {
      qrRefreshRef.current = setInterval(() => {
        setQrTimestamp(Date.now())
      }, 30000)
    }

    return () => {
      if (qrRefreshRef.current) {
        clearInterval(qrRefreshRef.current)
        qrRefreshRef.current = null
      }
    }
  }, [sessionStatus])

  async function handleConnect() {
    setConnecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Errore nella connessione. Riprova.')
        return
      }

      setSessionStatus('pending')
      setQrTimestamp(Date.now())
    } catch {
      alert('Errore nella connessione. Riprova.')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/whatsapp/connect', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Errore nella disconnessione.')
        return
      }

      setSessionStatus('not_connected')
      setDailyCount(0)
      setQrTimestamp(0)
    } catch {
      alert('Errore nella disconnessione.')
    }
  }

  if (loading || planLoading) {
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
        <h1 className="text-2xl font-semibold text-gray-900">WhatsApp Marketing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connetti il tuo numero WhatsApp per inviare messaggi ai clienti
        </p>
      </div>

      {/* Plan gate */}
      {isFree ? (
        <UpgradePrompt feature="WhatsApp Marketing" requiredPlan="PRO" />
      ) : (
        <div className="max-w-lg">
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">

            {/* not_connected */}
            {sessionStatus === 'not_connected' && (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <MessageCircle size={32} className="text-gray-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Nessun numero connesso
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  Collega il tuo numero WhatsApp per iniziare a inviare messaggi ai tuoi clienti.
                </p>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="bg-[#111111] text-white px-6 py-3 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
                >
                  {connecting ? 'Connessione in corso...' : 'Connetti WhatsApp'}
                </button>
              </div>
            )}

            {/* pending / qr-code */}
            {(sessionStatus === 'pending' || sessionStatus === 'qr-code') && (
              <div className="flex flex-col items-center text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Scansiona il QR code
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Apri WhatsApp sul tuo telefono, poi:
                  <br />
                  tre puntini → Dispositivi collegati → Collega un dispositivo
                </p>
                {qrTimestamp > 0 && (
                  <div className="w-48 h-48 border border-[#E8E8E8] rounded-[8px] overflow-hidden mb-4 flex items-center justify-center bg-gray-50">
                    <img
                      src={`/api/whatsapp/status?action=qr&t=${qrTimestamp}`}
                      alt="QR Code WhatsApp"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Aggiornamento automatico ogni 3 secondi...
                </p>
              </div>
            )}

            {/* active */}
            {sessionStatus === 'active' && (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                  <Wifi size={32} className="text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  WhatsApp connesso
                </h2>
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                  Attivo
                </span>
                <p className="text-sm text-gray-600 mb-6">
                  Oggi: {dailyCount}/200 messaggi inviati
                </p>
                <button
                  onClick={handleDisconnect}
                  className="border border-[#E0E0E0] text-gray-700 px-6 py-3 rounded-[8px] text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Disconnetti
                </button>
              </div>
            )}

            {/* idle / phone-error */}
            {(sessionStatus === 'idle' || sessionStatus === 'phone-error') && (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <WifiOff size={32} className="text-red-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Connessione persa
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  WhatsApp e stato disconnesso dal tuo telefono. Riconnetti per continuare.
                </p>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="bg-[#111111] text-white px-6 py-3 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
                >
                  {connecting ? 'Riconnessione in corso...' : 'Riconnetti'}
                </button>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="bg-gray-50 border border-[#E8E8E8] rounded-[12px] p-4 mt-4">
            <p className="font-medium text-gray-800 text-sm mb-2">Come funziona</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Collega il tuo numero WhatsApp tramite QR code</li>
              <li>Invia messaggi ai clienti da /dashboard/notifications</li>
              <li>Limite di 200 messaggi al giorno per evitare ban</li>
              <li>I messaggi arrivano direttamente su WhatsApp del cliente</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
