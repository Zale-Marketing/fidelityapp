'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { MessageCircle, Wifi, WifiOff, RefreshCw, Power, Send } from 'lucide-react'
import { usePlan } from '@/lib/hooks/usePlan'
import UpgradePrompt from '@/components/ui/UpgradePrompt'

type ConnectionStatus = 'not_connected' | 'connecting' | 'qr_pending' | 'connected' | 'disconnected'

export default function WhatsAppSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { isFree, loading: planLoading } = usePlan()

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ConnectionStatus>('not_connected')
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)

  // Credentials form
  const [instanceId, setInstanceId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  // Reconnect / Reboot
  const [reconnecting, setReconnecting] = useState(false)
  const [rebooting, setRebooting] = useState(false)

  // Test message
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('Ciao! Questo è un messaggio di test da FidelityApp.')
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null)

  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopQrPoll() {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current)
      qrPollRef.current = null
    }
  }

  async function fetchQR(token: string) {
    const res = await fetch('/api/whatsapp/status?action=qr', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    if (data.qr) setQrBase64(data.qr)
  }

  async function fetchStatus(token: string): Promise<string> {
    const res = await fetch('/api/whatsapp/status?action=status', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return 'not_connected'
    const data = await res.json()
    return data.status || 'not_connected'
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('merchant_id')
        .eq('id', user.id)
        .single()

      if (profile?.merchant_id) {
        const { data: merchant } = await supabase
          .from('merchants')
          .select('sendapp_instance_id, sendapp_access_token, sendapp_status')
          .eq('id', profile.merchant_id)
          .single()

        if (merchant) {
          setInstanceId(merchant.sendapp_instance_id || '')
          setAccessToken(merchant.sendapp_access_token || '')
          const dbStatus = merchant.sendapp_status || 'disconnected'
          if (dbStatus === 'connected') setStatus('connected')
          else if (merchant.sendapp_instance_id) setStatus('qr_pending')
          else setStatus('not_connected')
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  // Poll QR code ogni 3s quando in qr_pending
  useEffect(() => {
    stopQrPoll()

    if (status === 'qr_pending') {
      const startPoll = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        await fetchQR(session.access_token)

        qrPollRef.current = setInterval(async () => {
          const { data: { session: s } } = await supabase.auth.getSession()
          if (!s) return

          // Aggiorna QR e controlla status
          await fetchQR(s.access_token)
          const liveStatus = await fetchStatus(s.access_token)

          if (liveStatus === 'connected') {
            stopQrPoll()
            setStatus('connected')
            setQrBase64(null)
          }
        }, 3000)
      }
      startPoll()
    }

    return stopQrPoll
  }, [status])

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    if (!instanceId.trim() || !accessToken.trim()) {
      setConnectError('Inserisci Instance ID e Access Token.')
      return
    }

    setConnecting(true)
    setConnectError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ instanceId: instanceId.trim(), accessToken: accessToken.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        setConnectError(err.error || 'Errore nella connessione.')
        return
      }

      setStatus('qr_pending')
    } catch {
      setConnectError('Errore nella connessione. Riprova.')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch('/api/whatsapp/connect', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      setStatus('not_connected')
      setQrBase64(null)
      setInstanceId('')
      setAccessToken('')
    } catch {
      alert('Errore nella disconnessione.')
    }
  }

  async function handleReconnect() {
    setReconnecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ instanceId, accessToken }),
      })
      if (res.ok) {
        setStatus('qr_pending')
        setQrBase64(null)
      }
    } catch {
      alert('Errore nel reconnect.')
    } finally {
      setReconnecting(false)
    }
  }

  async function handleReboot() {
    setRebooting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      // Chiama direttamente la lib reboot via endpoint connect (reuses credentials)
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ instanceId, accessToken, action: 'reboot' }),
      })
      if (res.ok) alert('Reboot avviato.')
    } catch {
      alert('Errore nel reboot.')
    } finally {
      setRebooting(false)
    }
  }

  async function handleTestSend(e: React.FormEvent) {
    e.preventDefault()
    if (!testPhone.trim() || !testMessage.trim()) return
    setTestSending(true)
    setTestResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ phone: testPhone.trim(), message: testMessage.trim() }),
      })

      setTestResult(res.ok ? 'ok' : 'error')
    } catch {
      setTestResult('error')
    } finally {
      setTestSending(false)
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
    <div className="px-6 py-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">WhatsApp Marketing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connetti il tuo numero WhatsApp tramite SendApp Cloud
        </p>
      </div>

      {isFree ? (
        <UpgradePrompt feature="WhatsApp Marketing" requiredPlan="PRO" />
      ) : (
        <>
          {/* Piano cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {/* SendApp Cloud */}
            <div className="bg-white border-2 border-[#111111] rounded-[12px] p-5 relative">
              <span className="absolute top-3 right-3 bg-[#111111] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                Consigliato
              </span>
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle size={18} className="text-[#111111]" />
                <span className="font-semibold text-gray-900">SendApp Cloud</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">€19<span className="text-sm font-normal text-gray-500">/mese</span></p>
              <p className="text-xs text-gray-500 mb-3">Istanza WhatsApp su cloud dedicato</p>
              <a
                href="https://app.sendapp.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-[#111111] text-white py-2 rounded-[8px] text-sm font-semibold hover:bg-[#333333] transition-colors"
              >
                Acquista su SendApp →
              </a>
            </div>

            {/* SendApp Official */}
            <div className="bg-gray-50 border border-[#E8E8E8] rounded-[12px] p-5 relative opacity-60">
              <span className="absolute top-3 right-3 bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                Prossimamente
              </span>
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle size={18} className="text-gray-400" />
                <span className="font-semibold text-gray-500">SendApp Official</span>
              </div>
              <p className="text-2xl font-bold text-gray-500 mb-1">da €49<span className="text-sm font-normal text-gray-400">/mese</span></p>
              <p className="text-xs text-gray-400 mb-3">Numero WhatsApp Business ufficiale</p>
              <button
                disabled
                className="block w-full text-center border border-gray-200 text-gray-400 py-2 rounded-[8px] text-sm font-semibold cursor-not-allowed"
              >
                Non disponibile
              </button>
            </div>
          </div>

          {/* Connessione */}
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h2 className="font-semibold text-base text-gray-900 mb-4">Connessione</h2>

            {/* not_connected — form credenziali */}
            {status === 'not_connected' && (
              <form onSubmit={handleConnect} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Access Token</label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={e => setAccessToken(e.target.value)}
                    placeholder="Il tuo Access Token SendApp"
                    className="w-full border border-[#E0E0E0] rounded-[8px] px-3 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Instance ID</label>
                  <input
                    type="text"
                    value={instanceId}
                    onChange={e => setInstanceId(e.target.value)}
                    placeholder="Es: instance_abc123"
                    className="w-full border border-[#E0E0E0] rounded-[8px] px-3 py-2.5 text-sm focus:border-[#111111] focus:outline-none font-mono"
                  />
                </div>
                {connectError && (
                  <p className="text-red-600 text-xs">{connectError}</p>
                )}
                <button
                  type="submit"
                  disabled={connecting}
                  className="w-full bg-[#111111] text-white py-2.5 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
                >
                  {connecting ? 'Connessione...' : 'Connetti WhatsApp'}
                </button>
              </form>
            )}

            {/* qr_pending — mostra QR */}
            {status === 'qr_pending' && (
              <div className="flex flex-col items-center text-center">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Scansiona il QR code</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Apri WhatsApp → tre puntini → Dispositivi collegati → Collega un dispositivo
                </p>
                <div className="w-52 h-52 border border-[#E8E8E8] rounded-[8px] overflow-hidden flex items-center justify-center bg-gray-50 mb-3">
                  {qrBase64 ? (
                    <img
                      src={`data:image/png;base64,${qrBase64}`}
                      alt="QR Code WhatsApp"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="animate-spin w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full" />
                  )}
                </div>
                <p className="text-xs text-gray-400">Aggiornamento automatico ogni 3 secondi...</p>
              </div>
            )}

            {/* connected */}
            {status === 'connected' && (
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-3">
                  <Wifi size={28} className="text-green-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">WhatsApp connesso</h3>
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                  Attivo
                </span>
                {phone && (
                  <p className="text-sm text-gray-600 mb-4">Numero: {phone}</p>
                )}
                <div className="flex gap-2 flex-wrap justify-center">
                  <button
                    onClick={handleReconnect}
                    disabled={reconnecting}
                    className="flex items-center gap-1.5 border border-[#E0E0E0] text-gray-700 px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw size={14} />
                    {reconnecting ? 'Reconnect...' : 'Reconnect'}
                  </button>
                  <button
                    onClick={handleReboot}
                    disabled={rebooting}
                    className="flex items-center gap-1.5 border border-[#E0E0E0] text-gray-700 px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <Power size={14} />
                    {rebooting ? 'Reboot...' : 'Reboot'}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-1.5 border border-red-200 text-red-600 px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    <WifiOff size={14} />
                    Disconnetti
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Test messaggio — solo se connesso */}
          {status === 'connected' && (
            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-2 mb-4">
                <Send size={16} className="text-gray-500" />
                <h2 className="font-semibold text-base text-gray-900">Messaggio di Test</h2>
              </div>

              <form onSubmit={handleTestSend} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Numero di telefono</label>
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="+39 333 000 0000"
                    className="w-full border border-[#E0E0E0] rounded-[8px] px-3 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Messaggio</label>
                  <textarea
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    rows={3}
                    className="w-full border border-[#E0E0E0] rounded-[8px] px-3 py-2.5 text-sm focus:border-[#111111] focus:outline-none resize-none"
                  />
                </div>

                {testResult === 'ok' && (
                  <p className="text-green-600 text-sm font-medium">Messaggio inviato!</p>
                )}
                {testResult === 'error' && (
                  <p className="text-red-600 text-sm">Errore nell'invio. Verifica il numero e riprova.</p>
                )}

                <button
                  type="submit"
                  disabled={testSending || !testPhone.trim() || !testMessage.trim()}
                  className="w-full bg-[#111111] text-white py-2.5 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
                >
                  {testSending ? 'Invio...' : 'Invia test'}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
