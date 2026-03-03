'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Html5Qrcode } from 'html5-qrcode'

type ScanMode = 'ready' | 'scanning' | 'manual' | 'processing' | 'success' | 'error' | 'input_amount' | 'reward_ready' | 'intermediate_reward'

type CardData = {
  card: any
  program: any
  customer: any
}

export default function StampPage() {
  const [mode, setMode] = useState<ScanMode>('ready')
  const [manualCode, setManualCode] = useState('')
  const [message, setMessage] = useState('')
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [amount, setAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showActivateSubscription, setShowActivateSubscription] = useState(false)
  const [intermediateReward, setIntermediateReward] = useState<any>(null)
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const idempotencyKeyRef = useRef('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    return () => {
      stopScanner()
    }
  }, [])

  // Auto-reset after success or non-subscription error — STAMP-04
  useEffect(() => {
    if (mode === 'success') {
      const timer = setTimeout(() => {
        resetScanner().then(() => startScanner())
      }, 3000)
      return () => clearTimeout(timer)
    }
    if (mode === 'error' && !showActivateSubscription) {
      const timer = setTimeout(() => {
        resetScanner().then(() => startScanner())
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [mode, showActivateSubscription])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    // Auto-start camera immediately after auth — STAMP-01
    await startScanner()
  }

  async function startScanner() {
    setMode('scanning')
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      scannerRef.current = new Html5Qrcode('qr-reader')
      
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        () => {}
      )
    } catch (err) {
      console.error('Scanner error:', err)
      setMode('manual')
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current = null
      } catch (e) {
        // Ignore
      }
    }
  }

  async function onScanSuccess(decodedText: string) {
    await stopScanner()
    await processCode(decodedText)
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualCode.trim()) return
    await processCode(manualCode.trim())
  }

  // 🆕 FUNZIONE PER AGGIORNARE IL WALLET
  async function updateWallet(cardId: string) {
    try {
      await fetch('/api/wallet-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_SECRET || ''}`
        },
        body: JSON.stringify({ cardId })
      })
      console.log('Wallet aggiornato')
    } catch (e) {
      console.log('Errore aggiornamento wallet')
    }
  }

  async function processCode(code: string) {
    setMode('processing')
    setMessage('Cerco la carta...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')

      const { data: profile } = await supabase
        .from('profiles')
        .select('merchant_id')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('Profilo non trovato')

      const cardSelect = `*, programs (*), card_holders (*)`
      let card: any = null

      if (code.includes('/c/')) {
        // URL formato https://.../c/TOKEN — estrai il token e cerca per scan_token
        const token = code.split('/c/')[1]?.split('?')[0] || code
        const { data } = await supabase
          .from('cards')
          .select(cardSelect)
          .eq('scan_token', token)
          .eq('merchant_id', profile.merchant_id)
          .single()
        card = data
      } else {
        const trimmed = code.trim()
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)

        if (isUUID) {
          const { data: byId } = await supabase
            .from('cards')
            .select(cardSelect)
            .eq('id', trimmed)
            .eq('merchant_id', profile.merchant_id)
            .single()
          card = byId
        }

        if (!card) {
          const { data: byToken } = await supabase
            .from('cards')
            .select(cardSelect)
            .eq('scan_token', trimmed)
            .eq('merchant_id', profile.merchant_id)
            .single()
          card = byToken
        }

        // Codice corto 8 char (alternateText mostrato sotto il QR Google Wallet)
        if (!card && trimmed.length === 8) {
          const { data: byPrefix } = await supabase
            .from('cards')
            .select(cardSelect)
            .ilike('scan_token', trimmed.toLowerCase() + '%')
            .eq('merchant_id', profile.merchant_id)
            .limit(1)
          card = byPrefix?.[0] ?? null
        }
      }

      if (!card) {
        throw new Error('Carta non trovata o non appartiene a questo negozio')
      }

      const program = card.programs
      const customer = card.card_holders

      setCardData({ card, program, customer })

      const scanKey = `${card.id}-${crypto.randomUUID()}`
      setIdempotencyKey(scanKey)
      idempotencyKeyRef.current = scanKey

      const programType = program.program_type || 'stamps'

      if (programType === 'stamps') {
        const currentStamps = card.current_stamps || card.stamp_count || 0
        if (currentStamps >= program.stamps_required) {
          setMode('reward_ready')
          const customerName = customer?.full_name || customer?.email || ''
          setMessage(`🎉 PREMIO DISPONIBILE!${customerName ? `\n\n👤 ${customerName}` : ''}\n\n${currentStamps}/${program.stamps_required} bollini`)
        } else {
          await addStamp(card, program, customer)
        }
      } else if (['points', 'cashback', 'tiers'].includes(programType)) {
        setMode('input_amount')
        setMessage('')
      } else if (programType === 'subscription') {
        await useSubscription(card, program, customer)
      } else {
        await addStamp(card, program, customer)
      }

    } catch (err: any) {
      setMode('error')
      setMessage(err.message || 'Errore sconosciuto')
    }
  }

  async function addStamp(card: any, program: any, customer?: any) {
    const currentStamps = card.current_stamps || card.stamp_count || 0
    const newStamps = currentStamps + 1

    const { error } = await supabase
      .from('cards')
      .update({ 
        current_stamps: newStamps,
        stamp_count: newStamps,
        updated_at: new Date().toISOString()
      })
      .eq('id', card.id)

    if (error) throw error

    const { error: txError } = await supabase.from('stamp_transactions').insert({
      card_id: card.id,
      program_id: program.id,
      merchant_id: card.merchant_id,
      card_holder_id: card.card_holder_id || null,
      delta: 1,
      type: 'add',
      transaction_type: 'stamp',
      idempotency_key: idempotencyKeyRef.current || idempotencyKey || `${card.id}-${Date.now()}`
    })

    if (txError) {
      console.error('Errore log transazione:', txError)
    }

    // Carica premi intermedi del programma
    const { data: rewards } = await supabase
      .from('rewards')
      .select('*')
      .eq('program_id', program.id)
      .eq('is_active', true)
      .order('stamps_required', { ascending: true })

    // 🆕 AGGIORNA WALLET
    await updateWallet(card.id)

    const customerName = customer?.full_name || customer?.email || cardData?.customer?.full_name || ''

    if (newStamps >= program.stamps_required) {
      setMode('reward_ready')
      setMessage(`🎉 PREMIO COMPLETATO!${customerName ? `\n\n👤 ${customerName}` : ''}\n\n${newStamps}/${program.stamps_required} bollini`)
    } else {
      // Controlla se è stato raggiunto esattamente un premio intermedio
      const reachedReward = rewards?.find((r: any) => r.stamps_required === newStamps) || null
      if (reachedReward) {
        setIntermediateReward(reachedReward)
        setMode('intermediate_reward')
        setMessage(`${customerName ? `👤 ${customerName}\n\n` : ''}${newStamps}/${program.stamps_required} bollini`)
      } else {
        setMode('success')
        setMessage(`+1 bollino!${customerName ? `\n\n👤 ${customerName}` : ''}\n\n${newStamps}/${program.stamps_required} bollini`)
      }
    }
  }

  async function handleAmountSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cardData || !amount || parseFloat(amount) <= 0) return

    setProcessing(true)
    const amountNum = parseFloat(amount)
    const { card, program, customer } = cardData
    const programType = program.program_type

    try {
      if (programType === 'points') {
        await addPoints(card, program, amountNum, customer)
      } else if (programType === 'cashback') {
        await addCashback(card, program, amountNum, customer)
      } else if (programType === 'tiers') {
        await addTierSpend(card, program, amountNum, customer)
      }
    } catch (err: any) {
      setMode('error')
      setMessage(err.message || 'Errore durante l\'operazione')
    } finally {
      setProcessing(false)
    }
  }

  async function addPoints(card: any, program: any, amountSpent: number, customer?: any) {
    const eurosPerPoint = program.points_per_euro || 1
    const pointsEarned = Math.floor(amountSpent / eurosPerPoint)
    const newBalance = (card.points_balance || 0) + pointsEarned

    const { error } = await supabase
      .from('cards')
      .update({ 
        points_balance: newBalance,
        total_spent: (card.total_spent || 0) + amountSpent,
        updated_at: new Date().toISOString()
      })
      .eq('id', card.id)

    if (error) throw error

    await supabase.from('stamp_transactions').insert({
      card_id: card.id,
      program_id: program.id,
      merchant_id: card.merchant_id,
      card_holder_id: card.card_holder_id || null,
      delta: pointsEarned,
      type: 'add',
      transaction_type: 'points',
      amount_spent: amountSpent,
      points_earned: pointsEarned,
      idempotency_key: idempotencyKeyRef.current || idempotencyKey || `${card.id}-${Date.now()}`
    })

    // 🆕 AGGIORNA WALLET
    await updateWallet(card.id)

    const customerName = customer?.full_name || customer?.email || ''
    const pointsForReward = program.stamps_required || 100

    if (newBalance >= pointsForReward) {
      setMode('reward_ready')
      setMessage(`€${amountSpent.toFixed(2)} spesi${customerName ? `\n\n👤 ${customerName}` : ''}\n\n+${pointsEarned} punti!\n\n🎉 PREMIO DISPONIBILE!\n${newBalance}/${pointsForReward} punti`)
    } else {
      setMode('success')
      setMessage(`€${amountSpent.toFixed(2)} spesi${customerName ? `\n\n👤 ${customerName}` : ''}\n\n+${pointsEarned} punti!\n\nTotale: ${newBalance}/${pointsForReward} punti`)
    }
  }

  async function addCashback(card: any, program: any, amountSpent: number, customer?: any) {
    const percent = program.cashback_percent || 5
    const cashbackEarned = amountSpent * (percent / 100)
    const newBalance = (card.cashback_balance || 0) + cashbackEarned

    const { error } = await supabase
      .from('cards')
      .update({ 
        cashback_balance: newBalance,
        total_spent: (card.total_spent || 0) + amountSpent,
        updated_at: new Date().toISOString()
      })
      .eq('id', card.id)

    if (error) throw error

    await supabase.from('stamp_transactions').insert({
      card_id: card.id,
      program_id: program.id,
      merchant_id: card.merchant_id,
      card_holder_id: card.card_holder_id || null,
      delta: 0,
      type: 'add',
      transaction_type: 'cashback',
      amount_spent: amountSpent,
      cashback_earned: cashbackEarned,
      idempotency_key: idempotencyKeyRef.current || idempotencyKey || `${card.id}-${Date.now()}`
    })

    // 🆕 AGGIORNA WALLET
    await updateWallet(card.id)

    const customerName = customer?.full_name || customer?.email || ''

    setMode('success')
    setMessage(`€${amountSpent.toFixed(2)} spesi${customerName ? `\n\n👤 ${customerName}` : ''}\n\n+€${cashbackEarned.toFixed(2)} cashback!\n\nCredito: €${newBalance.toFixed(2)}`)
  }

  async function addTierSpend(card: any, program: any, amountSpent: number, customer?: any) {
    const newTotalSpent = (card.total_spent || 0) + amountSpent

    const { data: tiers } = await supabase
      .from('tiers')
      .select('*')
      .eq('program_id', program.id)
      .order('min_spend', { ascending: false })

    let newTier = card.current_tier
    let tierDiscount = 0
    let tierEmoji = ''
    
    if (tiers) {
      for (const tier of tiers) {
        if (newTotalSpent >= tier.min_spend) {
          newTier = tier.name
          tierDiscount = tier.discount_percent
          tierEmoji = tier.badge_emoji
          break
        }
      }
    }

    const { error } = await supabase
      .from('cards')
      .update({ 
        total_spent: newTotalSpent,
        current_tier: newTier,
        updated_at: new Date().toISOString()
      })
      .eq('id', card.id)

    if (error) throw error

    await supabase.from('stamp_transactions').insert({
      card_id: card.id,
      program_id: program.id,
      merchant_id: card.merchant_id,
      card_holder_id: card.card_holder_id || null,
      delta: 0,
      type: 'add',
      transaction_type: 'tier_spend',
      amount_spent: amountSpent,
      idempotency_key: idempotencyKeyRef.current || idempotencyKey || `${card.id}-${Date.now()}`
    })

    // 🆕 AGGIORNA WALLET
    await updateWallet(card.id)

    const tierChanged = newTier !== card.current_tier
    const customerName = customer?.full_name || customer?.email || ''
    
    let msg = `€${amountSpent.toFixed(2)} registrati!${customerName ? `\n\n👤 ${customerName}` : ''}\n\nSpesa totale: €${newTotalSpent.toFixed(2)}`
    
    if (tierChanged && newTier) {
      msg += `\n\n🎉 NUOVO LIVELLO!\n${tierEmoji} ${newTier}`
      if (tierDiscount > 0) {
        msg += ` (-${tierDiscount}%)`
      }
    } else if (newTier) {
      msg += `\n\n${tierEmoji} ${newTier}`
    }

    setMode('success')
    setMessage(msg)
  }

  async function useSubscription(card: any, program: any, customer?: any) {
    const now = new Date()
    const subEnd = card.subscription_end ? new Date(card.subscription_end) : null
    
    if (!subEnd || subEnd < now || card.subscription_status !== 'active') {
      setShowActivateSubscription(true)
      setMode('error')
      const customerName = customer?.full_name || customer?.email || 'Cliente'
      setMessage(`⚠️ Abbonamento non attivo\n\n👤 ${customerName}\n\nVuoi attivarlo?`)
      return
    }

    const today = now.toISOString().split('T')[0]
    const lastUseDate = card.last_use_date
    let dailyUses = card.daily_uses || 0

    if (lastUseDate !== today) {
      dailyUses = 0
    }

    const dailyLimit = program.daily_limit || 1
    
    if (dailyUses >= dailyLimit) {
      setMode('error')
      setMessage(`⚠️ Limite giornaliero raggiunto!\n\n${dailyUses}/${dailyLimit} utilizzi oggi`)
      return
    }

    const { error } = await supabase
      .from('cards')
      .update({ 
        daily_uses: dailyUses + 1,
        last_use_date: today,
        updated_at: new Date().toISOString()
      })
      .eq('id', card.id)

    if (error) throw error

    await supabase.from('stamp_transactions').insert({
      card_id: card.id,
      program_id: program.id,
      merchant_id: card.merchant_id,
      card_holder_id: card.card_holder_id || null,
      delta: 0,
      type: 'add',
      transaction_type: 'subscription_use',
      idempotency_key: idempotencyKeyRef.current || idempotencyKey || `${card.id}-${Date.now()}`
    })

    // 🆕 AGGIORNA WALLET
    await updateWallet(card.id)

    const customerName = customer?.full_name || customer?.email || ''

    setMode('success')
    setMessage(`✅ Abbonamento utilizzato!${customerName ? `\n\n👤 ${customerName}` : ''}\n\n${dailyUses + 1}/${dailyLimit} utilizzi oggi`)
  }

  async function activateSubscription(months: number) {
    if (!cardData) return
    
    const { card, program, customer } = cardData
    
    const now = new Date()
    const endDate = new Date(now)
    endDate.setMonth(endDate.getMonth() + months)
    
    const { error } = await supabase
      .from('cards')
      .update({ 
        subscription_status: 'active',
        subscription_end: endDate.toISOString(),
        daily_uses: 0,
        last_use_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', card.id)

    if (error) {
      alert('Errore: ' + error.message)
      return
    }

    await supabase.from('stamp_transactions').insert({
      card_id: card.id,
      program_id: program.id,
      merchant_id: card.merchant_id,
      card_holder_id: card.card_holder_id || null,
      delta: months,
      type: 'add',
      transaction_type: 'subscription_activated',
      idempotency_key: idempotencyKeyRef.current || idempotencyKey || `${card.id}-${Date.now()}`
    })

    // 🆕 AGGIORNA WALLET
    await updateWallet(card.id)

    const customerName = customer?.full_name || customer?.email || ''
    
    setShowActivateSubscription(false)
    setMode('success')
    setMessage(`✅ Abbonamento attivato!${customerName ? `\n\n👤 ${customerName}` : ''}\n\n📅 Scade: ${endDate.toLocaleDateString('it-IT')}\n\n💰 Prezzo: €${program.subscription_price || 0}/${program.subscription_period || 'mese'}`)
  }

  async function redeemCashback() {
    if (!cardData) return
    
    const { card, program } = cardData
    const minRedeem = program.min_cashback_redeem || 5
    const balance = card.cashback_balance || 0

    if (balance < minRedeem) {
      alert(`Minimo €${minRedeem} per riscattare. Saldo attuale: €${balance.toFixed(2)}`)
      return
    }

    if (!confirm(`Riscattare €${balance.toFixed(2)} di credito?`)) return

    const { error } = await supabase
      .from('cards')
      .update({ 
        cashback_balance: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', card.id)

    if (error) {
      alert('Errore: ' + error.message)
      return
    }

    await supabase.from('stamp_transactions').insert({
      card_id: card.id,
      program_id: program.id,
      merchant_id: card.merchant_id,
      card_holder_id: card.card_holder_id || null,
      delta: 0,
      type: 'redeem',
      transaction_type: 'cashback_redeem',
      cashback_spent: balance,
      idempotency_key: idempotencyKeyRef.current || idempotencyKey || `${card.id}-${Date.now()}`
    })

    // 🆕 AGGIORNA WALLET
    await updateWallet(card.id)

    setMode('success')
    setMessage(`💰 Riscattati €${balance.toFixed(2)}!`)
  }

  async function redeemStampsReward() {
    if (!cardData) return
    
    const { card, program, customer } = cardData
    const currentStamps = card.current_stamps || card.stamp_count || 0

    if (!confirm(`Riscattare il premio "${program.reward_description || program.reward_text || 'Premio'}"?\n\nI bollini verranno azzerati.`)) return

    const { error } = await supabase
      .from('cards')
      .update({ 
        current_stamps: 0,
        stamp_count: 0,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', card.id)

    if (error) {
      alert('Errore: ' + error.message)
      return
    }

    await supabase.from('stamp_transactions').insert({
      card_id: card.id,
      program_id: program.id,
      merchant_id: card.merchant_id,
      card_holder_id: card.card_holder_id || null,
      delta: -currentStamps,
      type: 'redeem',
      transaction_type: 'reward_redeemed',
      idempotency_key: idempotencyKeyRef.current || idempotencyKey || `${card.id}-${Date.now()}`
    })

    // 🆕 AGGIORNA WALLET
    await updateWallet(card.id)

    // Fire-and-forget webhook dispatch for premio_riscattato
    fetch('/api/webhooks/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: card.merchant_id,
        event: 'premio_riscattato',
        data: {
          card_id: card.id,
          card_holder_id: card.card_holder_id,
          program_id: card.program_id,
          merchant_id: card.merchant_id,
          reward: {
            id: null,
            name: program.reward_description || program.reward_text || 'Premio',
            description: null,
            stamps_required: program.stamps_required,
            reward_type: null,
            type: 'final',
          },
          card: {
            stamp_count: 0,
            previous_stamp_count: currentStamps,
          },
        },
      }),
    }).catch(console.error)

    setMode('success')
    setMessage(`🎁 Premio riscattato!\n\n"${program.reward_description || program.reward_text || 'Premio'}"\n\nBollini azzerati.`)

    // WhatsApp automatico dopo riscatto premio (fire-and-forget)
    if (customer?.phone) {
      const prizeName = program.reward_description || program.reward_text || 'Premio'
      const msg = `Complimenti ${customer.full_name || ''}! Hai riscattato il premio: ${prizeName}. Buon utilizzo! 🏆`
      fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: customer.phone, message: msg }),
      }).catch(console.error)
    }
  }

  async function redeemIntermediateReward() {
    if (!cardData || !intermediateReward) return

    const { card, program } = cardData
    const currentStamps = card.current_stamps || card.stamp_count || 0

    await supabase.from('stamp_transactions').insert({
      card_id: card.id,
      program_id: program.id,
      merchant_id: card.merchant_id,
      card_holder_id: card.card_holder_id || null,
      delta: 0,
      type: 'redeem',
      transaction_type: 'intermediate_reward_redeemed',
      note: intermediateReward.id,
      idempotency_key: `${idempotencyKeyRef.current || card.id}-int-${intermediateReward.id}`
    })

    // Trigger premio_riscattato — bollino_aggiunto è già stato triggerato al momento della scansione
    fetch('/api/webhooks/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: card.merchant_id,
        event: 'premio_riscattato',
        data: {
          card_id: card.id,
          card_holder_id: card.card_holder_id,
          program_id: card.program_id,
          merchant_id: card.merchant_id,
          reward: {
            id: intermediateReward.id,
            name: intermediateReward.name,
            description: intermediateReward.description ?? null,
            stamps_required: intermediateReward.stamps_required,
            reward_type: intermediateReward.reward_type ?? null,
            type: 'intermediate',
          },
          card: {
            stamp_count: currentStamps,
            previous_stamp_count: currentStamps,
          },
        },
      }),
    }).catch(console.error)

    setIntermediateReward(null)
    setMode('success')
    setMessage(`🎁 Premio riscattato!\n\n"${intermediateReward.name}"`)
  }

  async function redeemPointsReward() {
    if (!cardData) return
    
    const { card, program } = cardData
    const pointsForReward = program.stamps_required || 100
    const currentPoints = card.points_balance || 0
    
    if (currentPoints < pointsForReward) {
      alert(`Punti insufficienti. Servono ${pointsForReward} punti, il cliente ne ha ${currentPoints}.`)
      return
    }
    
    if (!confirm(`Riscattare il premio "${program.reward_description || program.reward_text || 'Sconto'}"?\n\nVerranno scalati ${pointsForReward} punti.`)) return

    const newBalance = currentPoints - pointsForReward

    const { error } = await supabase
      .from('cards')
      .update({ 
        points_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', card.id)

    if (error) {
      alert('Errore: ' + error.message)
      return
    }

    await supabase.from('stamp_transactions').insert({
      card_id: card.id,
      program_id: program.id,
      merchant_id: card.merchant_id,
      card_holder_id: card.card_holder_id || null,
      delta: -pointsForReward,
      type: 'redeem',
      transaction_type: 'points_redeemed',
      points_spent: pointsForReward,
      idempotency_key: idempotencyKeyRef.current || idempotencyKey || `${card.id}-${Date.now()}`
    })

    // 🆕 AGGIORNA WALLET
    await updateWallet(card.id)

    // Fire-and-forget webhook dispatch for premio_riscattato
    fetch('/api/webhooks/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: card.merchant_id,
        event: 'premio_riscattato',
        data: {
          card_id: card.id,
          card_holder_id: card.card_holder_id,
          program_id: card.program_id,
          merchant_id: card.merchant_id,
          reward: {
            name: program.reward_description || program.reward_text || 'Sconto',
            stamps_required: program.stamps_required,
          },
          card: {
            stamp_count: newBalance,
            previous_stamp_count: currentPoints,
          },
        },
      }),
    }).catch(console.error)

    setMode('success')
    setMessage(`🎁 Premio riscattato!\n\n"${program.reward_description || program.reward_text || 'Sconto'}"\n\nPunti rimanenti: ${newBalance}`)
  }

  async function resetScanner() {
    await stopScanner()
    setMode('ready')
    setMessage('')
    setManualCode('')
    setCardData(null)
    setAmount('')
    setShowActivateSubscription(false)
    setIdempotencyKey('')
    idempotencyKeyRef.current = ''
    setIntermediateReward(null)
  }

  function getTypeInfo(type: string) {
    const types: Record<string, { icon: string, name: string, color: string }> = {
      stamps: { icon: '🎫', name: 'Bollini', color: '#6366f1' },
      points: { icon: '⭐', name: 'Punti', color: '#10b981' },
      cashback: { icon: '💰', name: 'Cashback', color: '#f59e0b' },
      tiers: { icon: '👑', name: 'VIP', color: '#8b5cf6' },
      subscription: { icon: '🔄', name: 'Abbonamento', color: '#ec4899' },
      missions: { icon: '🎮', name: 'Missioni', color: '#06b6d4' }
    }
    return types[type] || types.stamps
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-indigo-800">
      <header className="px-6 py-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/80 hover:text-white">
          <span>←</span>
          <span>Dashboard</span>
        </Link>
      </header>

      <main className="p-6 max-w-lg mx-auto">
        
        {mode === 'ready' && (
          <div className="text-center space-y-8">
            <div>
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">📷</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Scanner</h1>
              <p className="text-white/70">Scansiona la carta del cliente</p>
            </div>

            <button
              onClick={startScanner}
              className="w-full bg-white text-indigo-600 py-5 rounded-2xl font-bold text-xl shadow-lg hover:bg-gray-50 transition-all active:scale-95"
            >
              📷 Avvia Scansione
            </button>

            <button
              onClick={() => setMode('manual')}
              className="w-full bg-white/20 text-white py-4 rounded-2xl font-medium hover:bg-white/30 transition-all"
            >
              ⌨️ Inserisci Codice Manualmente
            </button>
          </div>
        )}

        {mode === 'scanning' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-4 shadow-xl">
              <div id="qr-reader" className="overflow-hidden rounded-2xl"></div>
            </div>
            <button
              onClick={resetScanner}
              className="w-full bg-white/20 text-white py-4 rounded-2xl font-medium hover:bg-white/30"
            >
              ✕ Annulla
            </button>
          </div>
        )}

        {mode === 'manual' && (
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">⌨️ Codice Manuale</h2>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-lg text-center focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                placeholder="Incolla codice o URL"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50"
              >
                Cerca Carta
              </button>
            </form>
            <button
              onClick={resetScanner}
              className="w-full mt-4 py-3 text-gray-500 hover:text-gray-700"
            >
              ← Torna indietro
            </button>
          </div>
        )}

        {mode === 'processing' && (
          <div className="bg-white rounded-3xl p-8 shadow-xl text-center">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">{message}</p>
          </div>
        )}

        {mode === 'input_amount' && cardData && (
          <div className="space-y-4">
            <div 
              className="rounded-3xl p-6 text-white shadow-xl"
              style={{ backgroundColor: getTypeInfo(cardData.program.program_type).color }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">{getTypeInfo(cardData.program.program_type).icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{cardData.program.name}</h3>
                  <p className="text-white/70">{getTypeInfo(cardData.program.program_type).name}</p>
                </div>
              </div>
              
              {cardData.customer && (
                <div className="bg-white/20 rounded-xl px-4 py-2 mb-3">
                  <p className="text-sm">👤 {cardData.customer.full_name || cardData.customer.email || 'Cliente'}</p>
                </div>
              )}

              <div className="bg-white/20 rounded-xl p-4 text-center">
                {cardData.program.program_type === 'points' && (
                  <>
                    <p className="text-white/70 text-sm">Punti attuali</p>
                    <p className="text-3xl font-bold">{cardData.card.points_balance || 0}</p>
                  </>
                )}
                {cardData.program.program_type === 'cashback' && (
                  <>
                    <p className="text-white/70 text-sm">Credito disponibile</p>
                    <p className="text-3xl font-bold">€{(cardData.card.cashback_balance || 0).toFixed(2)}</p>
                  </>
                )}
                {cardData.program.program_type === 'tiers' && (
                  <>
                    <p className="text-white/70 text-sm">Livello attuale</p>
                    <p className="text-2xl font-bold">{cardData.card.current_tier || 'Base'}</p>
                    <p className="text-sm text-white/70">Spesa totale: €{(cardData.card.total_spent || 0).toFixed(2)}</p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">💶 Importo Speso</h3>
              <form onSubmit={handleAmountSubmit} className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl text-gray-400">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-14 pr-4 py-5 border-2 border-gray-200 rounded-2xl text-4xl font-bold text-center focus:border-indigo-500"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 20, 50].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(v.toString())}
                      className="py-3 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                      €{v}
                    </button>
                  ))}
                </div>
                {amount && parseFloat(amount) > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    {cardData.program.program_type === 'points' && (
                      <p className="text-lg">Guadagna <span className="font-bold text-green-600 text-2xl">+{Math.floor(parseFloat(amount) / (cardData.program.points_per_euro || 1))}</span> punti</p>
                    )}
                    {cardData.program.program_type === 'cashback' && (
                      <p className="text-lg">Guadagna <span className="font-bold text-amber-600 text-2xl">+€{(parseFloat(amount) * (cardData.program.cashback_percent || 5) / 100).toFixed(2)}</span> cashback</p>
                    )}
                    {cardData.program.program_type === 'tiers' && (
                      <p className="text-lg">Nuova spesa totale: <span className="font-bold text-purple-600 text-xl">€{((cardData.card.total_spent || 0) + parseFloat(amount)).toFixed(2)}</span></p>
                    )}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={processing || !amount || parseFloat(amount) <= 0}
                  className="w-full bg-green-500 text-white py-5 rounded-2xl font-bold text-xl disabled:opacity-50 hover:bg-green-600 transition-colors"
                >
                  {processing ? '⏳ Attendere...' : '✓ Conferma'}
                </button>
              </form>
              {cardData.program.program_type === 'cashback' && (cardData.card.cashback_balance || 0) >= (cardData.program.min_cashback_redeem || 5) && (
                <button
                  onClick={redeemCashback}
                  className="w-full mt-4 bg-amber-500 text-white py-4 rounded-2xl font-bold hover:bg-amber-600 transition-colors"
                >
                  💰 Riscatta €{(cardData.card.cashback_balance || 0).toFixed(2)} di credito
                </button>
              )}
              <button onClick={resetScanner} className="w-full mt-4 py-3 text-gray-500 hover:text-gray-700">← Annulla</button>
            </div>
          </div>
        )}

        {mode === 'reward_ready' && cardData && (
          <div className="bg-white rounded-3xl p-8 shadow-xl text-center">
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">🎁</span>
            </div>
            <h2 className="text-3xl font-bold text-yellow-600 mb-4">Premio Disponibile!</h2>
            <p className="text-gray-600 text-lg whitespace-pre-line mb-6">{message}</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500">Premio</p>
              <p className="text-xl font-bold text-gray-900">{cardData.program.reward_description || cardData.program.reward_text || 'Premio speciale'}</p>
            </div>
            <div className="space-y-3">
              {(cardData.program.program_type === 'stamps' || !cardData.program.program_type) && (
                <button onClick={redeemStampsReward} className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-600 transition-colors">
                  🎁 Riscatta Premio (azzera bollini)
                </button>
              )}
              {cardData.program.program_type === 'points' && (
                <button onClick={redeemPointsReward} className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-600 transition-colors">
                  🎁 Riscatta Premio (scala {cardData.program.stamps_required || 100} punti)
                </button>
              )}
              {cardData.program.program_type === 'cashback' && (cardData.card.cashback_balance || 0) >= (cardData.program.min_cashback_redeem || 5) && (
                <button onClick={redeemCashback} className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-600 transition-colors">
                  💰 Riscatta €{(cardData.card.cashback_balance || 0).toFixed(2)} di credito
                </button>
              )}
              {(cardData.program.program_type === 'stamps' || !cardData.program.program_type) && (
                <button
                  onClick={async () => { await addStamp(cardData.card, cardData.program, cardData.customer) }}
                  className="w-full bg-indigo-100 text-indigo-700 py-3 rounded-xl font-medium hover:bg-indigo-200 transition-colors"
                >
                  +1 Aggiungi comunque un bollino
                </button>
              )}
            </div>
            <button onClick={resetScanner} className="w-full mt-4 py-3 text-gray-500 hover:text-gray-700">← Scansiona un'altra carta</button>
          </div>
        )}

        {mode === 'intermediate_reward' && intermediateReward && (
          <div className="bg-white rounded-3xl p-8 shadow-xl text-center">
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">🎁</span>
            </div>
            <h2 className="text-3xl font-bold text-yellow-600 mb-3">Premio Intermedio!</h2>
            <p className="text-gray-900 text-2xl font-bold mb-2">{intermediateReward.name}</p>
            {intermediateReward.description && (
              <p className="text-gray-600 text-base mb-4">{intermediateReward.description}</p>
            )}
            <p className="text-gray-500 text-lg whitespace-pre-line mb-8">{message}</p>
            <div className="space-y-3">
              <button
                onClick={redeemIntermediateReward}
                className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-600 transition-colors"
              >
                🎁 Ritira Premio
              </button>
              <button
                onClick={() => resetScanner().then(() => startScanner())}
                className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Solo bollino — ritira dopo
              </button>
            </div>
          </div>
        )}

        {mode === 'success' && (
          <div className="fixed inset-0 bg-green-500 flex flex-col items-center justify-center p-8 text-center z-50">
            <div className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Fatto!</h2>
            <p className="text-white/90 text-xl whitespace-pre-line mb-8">{message}</p>
            <p className="text-white/60 text-sm">Reset automatico in corso...</p>
          </div>
        )}

        {mode === 'error' && !showActivateSubscription && (
          <div className="fixed inset-0 bg-red-600 flex flex-col items-center justify-center p-8 text-center z-50">
            <div className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Errore</h2>
            <p className="text-white/90 text-xl whitespace-pre-line mb-8">{message}</p>
            <p className="text-white/60 text-sm">Reset automatico in corso...</p>
          </div>
        )}

        {mode === 'error' && showActivateSubscription && (
          <div className="bg-white rounded-3xl p-8 shadow-xl text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">🔄</span>
            </div>
            <h2 className="text-3xl font-bold text-red-600 mb-4">Abbonamento Scaduto</h2>
            <p className="text-gray-600 text-lg whitespace-pre-line mb-6">{message}</p>

            {cardData && (
              <div className="space-y-3 mb-6">
                <p className="text-sm text-gray-500 mb-4">Seleziona la durata:</p>
                <div className="bg-pink-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-500">Programma</p>
                  <p className="font-bold text-pink-600">{cardData.program.name}</p>
                  <p className="text-lg font-bold text-gray-900 mt-2">€{cardData.program.subscription_price || 0}/{cardData.program.subscription_period || 'mese'}</p>
                </div>
                <button onClick={() => activateSubscription(1)} className="w-full bg-pink-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-pink-600 transition-colors">🔄 Attiva 1 Mese</button>
                <button onClick={() => activateSubscription(3)} className="w-full bg-pink-400 text-white py-3 rounded-xl font-medium hover:bg-pink-500 transition-colors">📅 Attiva 3 Mesi</button>
                <button onClick={() => activateSubscription(6)} className="w-full bg-pink-300 text-white py-3 rounded-xl font-medium hover:bg-pink-400 transition-colors">📅 Attiva 6 Mesi</button>
                <button onClick={() => activateSubscription(12)} className="w-full bg-pink-200 text-pink-700 py-3 rounded-xl font-medium hover:bg-pink-300 transition-colors">🎉 Attiva 1 Anno</button>
              </div>
            )}

            <button onClick={resetScanner} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-colors">
              ← Annulla
            </button>
          </div>
        )}

      </main>
    </div>
  )
}