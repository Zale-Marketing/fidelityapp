'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Card, Program } from '@/lib/types'

export default function StampPage() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    card?: Card
    program?: Program
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [staffId, setStaffId] = useState<string | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
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

      if (profile) {
        setMerchantId(profile.merchant_id)
        setStaffId(user.id)
      }
    }

    checkAuth()
  }, [router, supabase])

  const startScanner = async () => {
    setScanning(true)
    setResult(null)

    const { Html5Qrcode } = await import('html5-qrcode')
    
    if (scannerRef.current) {
      const html5QrCode = new Html5Qrcode('qr-reader')
      html5QrCodeRef.current = html5QrCode

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          onScanSuccess,
          () => {}
        )
      } catch (err) {
        console.error('Errore camera:', err)
        setResult({
          success: false,
          message: 'Errore accesso camera. Controlla i permessi.'
        })
        setScanning(false)
      }
    }
  }

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current = null
      } catch (err) {
        console.error('Errore stop scanner:', err)
      }
    }
    setScanning(false)
  }

  const onScanSuccess = async (decodedText: string) => {
    // Estrai il token dal link o usa direttamente il testo
    let token = decodedText
    if (decodedText.includes('/c/')) {
      token = decodedText.split('/c/')[1]
    }

    await stopScanner()
    await processStamp(token)
  }

  const processStamp = async (token: string) => {
    setLoading(true)

    // Trova la card con questo token
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('scan_token', token)
      .single()

    if (cardError || !card) {
      setResult({
        success: false,
        message: 'Card non trovata. QR non valido.'
      })
      setLoading(false)
      return
    }

    // Verifica che sia del nostro merchant
    if (card.merchant_id !== merchantId) {
      setResult({
        success: false,
        message: 'Questa card non appartiene alla tua attività.'
      })
      setLoading(false)
      return
    }

    // Carica il programma
    const { data: program } = await supabase
      .from('programs')
      .select('*')
      .eq('id', card.program_id)
      .single()

    if (!program) {
      setResult({
        success: false,
        message: 'Programma non trovato.'
      })
      setLoading(false)
      return
    }

    // Controlla se la card ha già il premio pronto
    if (card.status === 'reward_ready') {
      setResult({
        success: false,
        message: '🎁 Questa card ha già un premio da riscattare!',
        card,
        program
      })
      setLoading(false)
      return
    }

    if (card.status === 'redeemed') {
      setResult({
        success: false,
        message: 'Questa card è già stata riscattata.',
        card,
        program
      })
      setLoading(false)
      return
    }

    // Genera idempotency key (basato su timestamp arrotondato a 30 secondi)
    const timeWindow = Math.floor(Date.now() / 30000)
    const idempotencyKey = `${card.id}-${timeWindow}`

    // Prova a inserire la transazione
    const { error: txError } = await supabase
      .from('stamp_transactions')
      .insert({
        merchant_id: merchantId,
        program_id: program.id,
        card_id: card.id,
        staff_user_id: staffId,
        type: 'add',
        delta: 1,
        idempotency_key: idempotencyKey
      })

    if (txError) {
      if (txError.code === '23505') {
        // Duplicato - già timbrato in questa finestra
        setResult({
          success: false,
          message: 'Già timbrato! Aspetta 30 secondi.',
          card,
          program
        })
        setLoading(false)
        return
      }
      setResult({
        success: false,
        message: 'Errore nel timbro: ' + txError.message
      })
      setLoading(false)
      return
    }

    // Aggiorna il conteggio sulla card
    const newCount = card.stamp_count + 1
    const newStatus = newCount >= program.stamps_required ? 'reward_ready' : 'active'

    await supabase
      .from('cards')
      .update({ 
        stamp_count: newCount,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', card.id)

    // 🔥 AGGIORNA IL GOOGLE WALLET (se il cliente l'ha salvato)
    fetch('/api/wallet-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card.id })
    }).catch(err => console.log('Wallet update skipped:', err))

    // Aggiorna la card locale per il risultato
    const updatedCard = { ...card, stamp_count: newCount, status: newStatus }

    if (newStatus === 'reward_ready') {
      setResult({
        success: true,
        message: `🎉 PREMIO RAGGIUNTO! ${newCount}/${program.stamps_required}`,
        card: updatedCard,
        program
      })
    } else {
      setResult({
        success: true,
        message: `Timbro aggiunto! ${newCount}/${program.stamps_required}`,
        card: updatedCard,
        program
      })
    }

    setLoading(false)
  }

  const redeemReward = async () => {
    if (!result?.card || !result?.program) return

    setLoading(true)

    const idempotencyKey = `redeem-${result.card.id}-${Date.now()}`

    // Registra transazione redeem
    await supabase
      .from('stamp_transactions')
      .insert({
        merchant_id: merchantId,
        program_id: result.program.id,
        card_id: result.card.id,
        staff_user_id: staffId,
        type: 'redeem',
        delta: 0,
        idempotency_key: idempotencyKey
      })

    // Reset card
    await supabase
      .from('cards')
      .update({ 
        stamp_count: 0,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', result.card.id)

    // 🔥 AGGIORNA IL GOOGLE WALLET (reset a 0)
    fetch('/api/wallet-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: result.card.id })
    }).catch(err => console.log('Wallet update skipped:', err))

    setResult({
      success: true,
      message: '✅ Premio riscattato! Card azzerata.',
      card: { ...result.card, stamp_count: 0, status: 'active' },
      program: result.program
    })

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 p-4">
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="text-white hover:text-gray-300">
            ← Dashboard
          </Link>
          <h1 className="text-white font-bold">Scanner Timbri</h1>
          <div className="w-20"></div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {/* Scanner Area */}
        {!result && (
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            {scanning ? (
              <>
                <div 
                  id="qr-reader" 
                  ref={scannerRef}
                  className="rounded-lg overflow-hidden"
                />
                <button
                  onClick={stopScanner}
                  className="w-full mt-4 bg-red-600 text-white py-3 rounded-lg font-semibold"
                >
                  Annulla
                </button>
              </>
            ) : (
              <button
                onClick={startScanner}
                className="w-full bg-indigo-600 text-white py-6 rounded-xl text-xl font-bold hover:bg-indigo-700"
              >
                📷 Avvia Scanner
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white">Elaborazione...</p>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className={`rounded-xl p-6 ${
            result.success ? 'bg-green-600' : 'bg-red-600'
          }`}>
            <p className="text-white text-2xl font-bold text-center mb-4">
              {result.message}
            </p>

            {result.card && result.program && (
              <div className="bg-white/10 rounded-lg p-4 mb-4">
                <p className="text-white/80 text-sm">Programma</p>
                <p className="text-white font-bold">{result.program.name}</p>
                
                {/* Bollini visivi */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {[...Array(result.program.stamps_required)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-8 h-8 rounded-full ${
                        i < result.card!.stamp_count 
                          ? 'bg-white' 
                          : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Bottone Riscatta se premio pronto */}
            {result.card?.status === 'reward_ready' && (
              <button
                onClick={redeemReward}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold mb-4"
              >
                🎁 Riscatta Premio
              </button>
            )}

            <button
              onClick={() => {
                setResult(null)
                startScanner()
              }}
              className="w-full bg-white/20 text-white py-3 rounded-lg font-semibold"
            >
              Scansiona Altro
            </button>
          </div>
        )}
      </main>
    </div>
  )
}