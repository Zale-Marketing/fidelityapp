'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import type { Card, Program, Merchant } from '@/lib/types'

type Tier = {
  id: string
  name: string
  min_spend: number
  discount_percent: number
  badge_emoji: string
  benefits: string
}

type Reward = {
  id: string
  name: string
  stamps_required: number
}

export default function CustomerCardPage() {
  const [card, setCard] = useState<Card | null>(null)
  const [program, setProgram] = useState<Program | null>(null)
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
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
        
        // Load tiers if VIP program
        if (programData.program_type === 'tiers') {
          const { data: tiersData } = await supabase
            .from('tiers')
            .select('*')
            .eq('program_id', programData.id)
            .order('min_spend', { ascending: true })

          if (tiersData) setTiers(tiersData)
        }

        // Load rewards for stamps program (separate query per CLAUDE.md rules)
        if (programData.program_type === 'stamps') {
          const { data: rewardsData } = await supabase
            .from('rewards')
            .select('id, name, stamps_required')
            .eq('program_id', programData.id)
            .eq('is_active', true)
            .order('stamps_required', { ascending: true })
          if (rewardsData) setRewards(rewardsData)
        }
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_SECRET || ''}`
        },
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

  // Helper functions
  function getCurrentTier(totalSpent: number): Tier | null {
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (totalSpent >= tiers[i].min_spend) {
        return tiers[i]
      }
    }
    return tiers[0] || null
  }

  function getNextTier(totalSpent: number): Tier | null {
    for (const tier of tiers) {
      if (totalSpent < tier.min_spend) {
        return tier
      }
    }
    return null
  }

  function getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      stamps: '🎫',
      points: '⭐',
      cashback: '💰',
      tiers: '👑',
      subscription: '🔄'
    }
    return icons[type] || '🎫'
  }

  function getProgressMessage(): string {
    if (!program || !card) return ''

    const programType = (program as any).program_type || 'stamps'
    const currentStamps = card.stamp_count || (card as any).current_stamps || 0
    const pointsBalance = (card as any).points_balance || 0
    const pointsForReward = program.stamps_required || 100
    const cashbackBalance = (card as any).cashback_balance || 0
    const minCashbackRedeem = (program as any).min_cashback_redeem || 5
    const canRedeemCashback = cashbackBalance >= minCashbackRedeem
    const totalSpent = (card as any).total_spent || 0
    const nextTier = getNextTier(totalSpent)
    const subscriptionStatus = (card as any).subscription_status
    const subscriptionEnd = (card as any).subscription_end
    const isSubscriptionActive = subscriptionStatus === 'active' && subscriptionEnd && new Date(subscriptionEnd) > new Date()

    if (programType === 'stamps') {
      const nextReward = rewards
        .filter(r => r.stamps_required > currentStamps)
        .sort((a, b) => a.stamps_required - b.stamps_required)[0]
      if (nextReward) {
        const remaining = nextReward.stamps_required - currentStamps
        return `Ancora ${remaining} bollin${remaining === 1 ? 'o' : 'i'} per ${nextReward.name}`
      }
      const remaining = program.stamps_required - currentStamps
      if (remaining <= 0) return 'Premio pronto! Mostra la carta in cassa'
      return `Ancora ${remaining} bollin${remaining === 1 ? 'o' : 'i'} al premio`
    }

    if (programType === 'points') {
      const remaining = pointsForReward - pointsBalance
      if (remaining <= 0) return 'Premio pronto! Mostra la carta in cassa'
      return `Ancora ${remaining} punt${remaining === 1 ? 'o' : 'i'} al premio`
    }

    if (programType === 'cashback') {
      if (canRedeemCashback) return 'Pronto per riscattare!'
      return `Ancora €${(minCashbackRedeem - cashbackBalance).toFixed(2)} per riscattare`
    }

    if (programType === 'tiers') {
      if (!nextTier) return 'Livello massimo raggiunto'
      const remaining = nextTier.min_spend - totalSpent
      return `Ancora €${remaining.toFixed(2)} per ${nextTier.name}`
    }

    if (programType === 'subscription') {
      return isSubscriptionActive ? 'Abbonamento Attivo' : 'Abbonamento Scaduto'
    }

    return ''
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

  const programType = (program as any).program_type || 'stamps'
  const stampsProgress = ((card.stamp_count || (card as any).current_stamps || 0) / program.stamps_required) * 100
  const currentStamps = card.stamp_count || (card as any).current_stamps || 0
  
  // Points
  const pointsBalance = (card as any).points_balance || 0
  const pointsForReward = program.stamps_required || 100
  const pointsProgress = (pointsBalance / pointsForReward) * 100
  
  // Cashback
  const cashbackBalance = (card as any).cashback_balance || 0
  const minCashbackRedeem = (program as any).min_cashback_redeem || 5
  const canRedeemCashback = cashbackBalance >= minCashbackRedeem
  
  // Tiers
  const totalSpent = (card as any).total_spent || 0
  const currentTier = getCurrentTier(totalSpent)
  const nextTier = getNextTier(totalSpent)
  
  // Subscription
  const subscriptionStatus = (card as any).subscription_status
  const subscriptionEnd = (card as any).subscription_end
  const dailyUses = (card as any).daily_uses || 0
  const dailyLimit = (program as any).daily_limit || 1
  const isSubscriptionActive = subscriptionStatus === 'active' && subscriptionEnd && new Date(subscriptionEnd) > new Date()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Card Header */}
      <div 
        className="p-6 pb-20"
        style={{ backgroundColor: program.primary_color }}
      >
        <div className="max-w-md mx-auto text-center text-white">
          <span className="text-4xl mb-2 block">{getTypeIcon(programType)}</span>
          <h1 className="text-2xl font-bold">{merchant.name}</h1>
          <p className="text-white/80">{program.name}</p>
        </div>
      </div>

      {/* Card Body */}
      <div className="max-w-md mx-auto px-4 -mt-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6">
            
            {/* ============ BOLLINI ============ */}
            {programType === 'stamps' && (
              <>
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
                      <span>{currentStamps} / {program.stamps_required}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(stampsProgress, 100)}%`,
                          backgroundColor: program.primary_color
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Bollini Grid */}
                <div className="grid grid-cols-5 gap-3 mb-6">
                  {[...Array(program.stamps_required)].map((_, i) => (
                    <div 
                      key={i}
                      className={`aspect-square rounded-full flex items-center justify-center text-lg ${
                        i < currentStamps 
                          ? 'text-white' 
                          : 'bg-gray-100 text-gray-300'
                      }`}
                      style={i < currentStamps ? { backgroundColor: program.primary_color } : {}}
                    >
                      {i < currentStamps ? '✓' : (i + 1)}
                    </div>
                  ))}
                </div>

                {/* Premio */}
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500">Premio</p>
                  <p className="font-bold text-gray-900">{(program as any).reward_text || program.reward_description}</p>
                </div>
              </>
            )}

            {/* ============ PUNTI ============ */}
            {programType === 'points' && (
              <>
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500 mb-1">I tuoi punti</p>
                  <p className="text-5xl font-bold" style={{ color: program.primary_color }}>
                    {pointsBalance}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Ogni €{(program as any).points_per_euro || 1} spesi = 1 punto
                  </p>
                </div>

                {/* Progress to reward */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Verso il premio</span>
                    <span>{pointsBalance} / {pointsForReward}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(pointsProgress, 100)}%`,
                        backgroundColor: program.primary_color
                      }}
                    />
                  </div>
                </div>

                {pointsBalance >= pointsForReward && (
                  <div className="bg-green-100 text-green-700 rounded-xl p-4 text-center mb-6">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="font-bold text-lg">Premio Disponibile!</p>
                    <p className="text-sm">Mostra questa schermata in cassa</p>
                  </div>
                )}

                {/* Premio */}
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500">Premio a {pointsForReward} punti</p>
                <p className="font-bold text-gray-900">{(program as any).reward_text || program.reward_description || 'Sconto speciale'}</p>
                </div>

                <div className="mt-4 text-center text-sm text-gray-400">
                  Spesa totale: €{totalSpent.toFixed(2)}
                </div>
              </>
            )}

            {/* ============ CASHBACK ============ */}
            {programType === 'cashback' && (
              <>
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500 mb-1">Il tuo credito</p>
                  <p className="text-5xl font-bold" style={{ color: program.primary_color }}>
                    €{cashbackBalance.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Guadagni il {(program as any).cashback_percent || 5}% su ogni acquisto
                  </p>
                </div>

                {/* Redeem status */}
                {canRedeemCashback ? (
                  <div className="bg-green-100 text-green-700 rounded-xl p-4 text-center mb-6">
                    <div className="text-4xl mb-2">💰</div>
                    <p className="font-bold text-lg">Puoi riscattare!</p>
                    <p className="text-sm">Mostra questa schermata in cassa per usare il credito</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-center mb-6">
                    <p className="text-sm text-gray-500">Minimo per riscattare</p>
                    <p className="font-bold text-gray-900">€{minCashbackRedeem.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Ti mancano €{(minCashbackRedeem - cashbackBalance).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="text-center text-sm text-gray-400">
                  Spesa totale: €{totalSpent.toFixed(2)}
                </div>
              </>
            )}

            {/* ============ LIVELLI VIP ============ */}
            {programType === 'tiers' && (
              <>
                {/* Current Tier */}
                <div className="text-center mb-6">
                  {currentTier && (
                    <>
                      <span className="text-6xl block mb-2">{currentTier.badge_emoji}</span>
                      <p className="text-2xl font-bold" style={{ color: program.primary_color }}>
                        {currentTier.name}
                      </p>
                      {currentTier.discount_percent > 0 && (
                        <p className="text-lg text-gray-600">
                          Sconto {currentTier.discount_percent}%
                        </p>
                      )}
                      {currentTier.benefits && (
                        <p className="text-sm text-gray-500 mt-2">{currentTier.benefits}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Spesa totale */}
                <div className="bg-gray-50 rounded-xl p-4 text-center mb-4">
                  <p className="text-sm text-gray-500">Spesa totale</p>
                  <p className="text-3xl font-bold text-gray-900">€{totalSpent.toFixed(2)}</p>
                </div>

                {/* Next Tier Progress */}
                {nextTier && (
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                      <span>Prossimo livello: {nextTier.badge_emoji} {nextTier.name}</span>
                      <span>€{nextTier.min_spend}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min((totalSpent / nextTier.min_spend) * 100, 100)}%`,
                          backgroundColor: program.primary_color
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      Mancano €{(nextTier.min_spend - totalSpent).toFixed(2)}
                    </p>
                  </div>
                )}

                {/* All Tiers */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-3">Tutti i livelli</p>
                  <div className="space-y-2">
                    {tiers.map(tier => {
                      const isActive = currentTier?.id === tier.id
                      const isUnlocked = totalSpent >= tier.min_spend
                      return (
                        <div 
                          key={tier.id} 
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isActive ? 'bg-indigo-50 ring-2' : isUnlocked ? 'bg-green-50' : 'bg-gray-50'
                          }`}
                          style={isActive ? { borderColor: program.primary_color } : {}}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{tier.badge_emoji}</span>
                            <div>
                              <p className={`font-medium ${isActive ? 'text-indigo-700' : ''}`}>
                                {tier.name}
                              </p>
                              <p className="text-xs text-gray-500">€{tier.min_spend}+</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {tier.discount_percent > 0 && (
                              <p className="font-bold text-green-600">-{tier.discount_percent}%</p>
                            )}
                            {isUnlocked && <span className="text-xs text-green-600">✓ Sbloccato</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ============ ABBONAMENTO ============ */}
            {programType === 'subscription' && (
              <>
                <div className="text-center mb-6">
                  {isSubscriptionActive ? (
                    <>
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">✅</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">Abbonamento Attivo</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Scade il {new Date(subscriptionEnd).toLocaleDateString('it')}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">❌</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">Abbonamento Non Attivo</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Contatta il negozio per attivarlo
                      </p>
                    </>
                  )}
                </div>

                {isSubscriptionActive && (
                  <>
                    {/* Daily usage */}
                    <div className="bg-gray-50 rounded-xl p-4 text-center mb-4">
                      <p className="text-sm text-gray-500">Utilizzi oggi</p>
                      <p className="text-3xl font-bold" style={{ color: program.primary_color }}>
                        {dailyUses} / {dailyLimit}
                      </p>
                      {dailyUses >= dailyLimit ? (
                        <p className="text-xs text-orange-600 mt-1">Limite giornaliero raggiunto</p>
                      ) : (
                        <p className="text-xs text-green-600 mt-1">
                          {dailyLimit - dailyUses} utilizz{dailyLimit - dailyUses === 1 ? 'o' : 'i'} rimanent{dailyLimit - dailyUses === 1 ? 'e' : 'i'}
                        </p>
                      )}
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-blue-700">
                        Mostra questa schermata in cassa per utilizzare il tuo abbonamento
                      </p>
                    </div>
                  </>
                )}

                {/* Subscription details */}
                <div className="mt-4 text-center text-sm text-gray-400">
                  <p>€{(program as any).subscription_price || 0}/{
                    (program as any).subscription_period === 'weekly' ? 'settimana' : 
                    (program as any).subscription_period === 'monthly' ? 'mese' : 'anno'
                  }</p>
                </div>
              </>
            )}

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
              Mostra questo QR in cassa
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