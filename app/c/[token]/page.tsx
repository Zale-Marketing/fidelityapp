'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import type { Card, Program, Merchant } from '@/lib/types'

export default function CustomerCardPage() {
  const [card, setCard] = useState<Card | null>(null)
  const [program, setProgram] = useState<Program | null>(null)
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [loading, setLoading] = useState(true)
  const [walletLoading, setWalletLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    async function loadCard() {
      const token = params.token as string

      const { data: cardData, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('scan_token', token)
        .single()

      if (cardError || !cardData) {
        setError('Card non trovata')
        setLoading(false)
        return
      }

      setCard(cardData)

      const { data: programData } = await supabase
        .from('programs')
        .select('*')
        .eq('id', cardData.program_id)
        .single()

      if (programData) {
        setProgram(programData)
      }

      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', cardData.merchant_id)
        .single()

      if (merchantData) {
        setMerchant(merchantData)
      }

      setLoading(false)
    }

    loadCard()

    const interval = setInterval(loadCard, 5000)
    return () => clearInterval(interval)
  }, [params.token, supabase])

  useEffect(() => {
    async function generateQR() {
      if (card && qrRef.current) {
        const QRCode = (await import('qrcode')).default
        const canvas = document.createElement('canvas')
        await QRCode.toCanvas(canvas, window.location.href, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
        qrRef.current.innerHTML = ''
        qrRef.current.appendChild(canvas)
      }
    }
    generateQR()
  }, [card])

  const addToGoogleWallet = async () => {
    if (!card) return
    
    setWalletLoading(true)
    
    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id })
      })

      const data = await response.json()

      if (data.walletLink) {
        window.open(data.walletLink, '_blank')
      } else {
        alert('Errore: ' + (data.error || 'Impossibile generare il link'))
      }
    } catch (err) {
      alert('Errore nella connessione')
    }
    
    setWalletLoading(false)
  }

  const saveQRAsImage = async () => {
    if (!qrRef.current) return
    
    const canvas = qrRef.current.querySelector('canvas')
    if (canvas) {
      const link = document.createElement('a')
      link.download = `fidelity-card-${card?.scan_token.substring(0, 8)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (error || !card || !program || !merchant) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow p-8 text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Card Non Trovata</h1>
          <p className="text-gray-500">Il link potrebbe essere errato o la card non esiste più.</p>
        </div>
      </div>
    )
  }

  const progress = (card.stamp_count / program.stamps_required) * 100

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Card Header */}
      <div 
        className="p-6 pb-20"
        style={{ backgroundColor: program.primary_color }}
      >
        <div className="max-w-md mx-auto text-center text-white">
          <h1 className="text-2xl font-bold">{merchant.name}</h1>
          <p className="text-white/80">{program.name}</p>
        </div>
      </div>

      {/* Card Body */}
      <div className="max-w-md mx-auto px-4 -mt-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Progress */}
          <div className="p-6">
            {card.status === 'reward_ready' ? (
              <div className="bg-orange-100 text-orange-700 rounded-xl p-4 text-center mb-6">
                <div className="text-4xl mb-2">🎉</div>
                <p className="font-bold text-lg">Premio Disponibile!</p>
                <p className="text-sm">Mostra questa schermata in cassa</p>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Progressi</span>
                  <span>{card.stamp_count} / {program.stamps_required}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${progress}%`,
                      backgroundColor: program.primary_color
                    }}
                  />
                </div>
              </div>
            )}

            {/* Bollini */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {[...Array(program.stamps_required)].map((_, i) => (
                <div 
                  key={i}
                  className={`aspect-square rounded-full flex items-center justify-center text-lg ${
                    i < card.stamp_count 
                      ? 'text-white' 
                      : 'bg-gray-100 text-gray-300'
                  }`}
                  style={i < card.stamp_count ? { backgroundColor: program.primary_color } : {}}
                >
                  {i < card.stamp_count ? '✓' : (i + 1)}
                </div>
              ))}
            </div>

            {/* Premio */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Premio</p>
              <p className="font-bold text-gray-900">{program.reward_text}</p>
            </div>
          </div>

          {/* Google Wallet Button */}
          <div className="px-6 pb-4">
            <button
              onClick={addToGoogleWallet}
              disabled={walletLoading}
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {walletLoading ? (
                <span>Caricamento...</span>
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  <span>Aggiungi a Google Wallet</span>
                </>
              )}
            </button>
          </div>

          {/* QR Code */}
          <div className="border-t border-dashed p-6">
            <p className="text-center text-sm text-gray-500 mb-4">
              Oppure mostra questo QR in cassa
            </p>
            <div 
              ref={qrRef}
              className="flex justify-center mb-4"
            />
            <button
              onClick={saveQRAsImage}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200"
            >
              📥 Salva QR come Immagine
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6 mb-8">
          Powered by FidelityApp
        </p>
      </div>
    </div>
  )
}