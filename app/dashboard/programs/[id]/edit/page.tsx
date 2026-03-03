'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Stamp, Star, Coins, Crown, RefreshCw, Plus, Pencil, Trash2, Check, X, Lock } from 'lucide-react'

type Reward = {
  id: string
  name: string
  description: string
  stamps_required: number
  image_url: string
  is_active: boolean
}

type Tier = {
  id: string
  name: string
  min_spend: number
  discount_percent: number
  badge_emoji: string
  benefits: string
  sort_order: number
}

const PROGRAM_TYPE_INFO: Record<string, { Icon: any, name: string }> = {
  stamps: { Icon: Stamp, name: 'Bollini / Timbri' },
  points: { Icon: Star, name: 'Punti su Spesa' },
  cashback: { Icon: Coins, name: 'Cashback' },
  tiers: { Icon: Crown, name: 'Livelli VIP' },
  subscription: { Icon: RefreshCw, name: 'Abbonamento' },
  missions: { Icon: Star, name: 'Missioni' }
}

export default function EditProgramPage() {
  const [program, setProgram] = useState<any>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [merchantName, setMerchantName] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [logoUrl, setLogoUrl] = useState('')

  const [externalRewardsUrl, setExternalRewardsUrl] = useState('')
  const [termsUrl, setTermsUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [googleReviewsUrl, setGoogleReviewsUrl] = useState('')
  const [walletMessage, setWalletMessage] = useState('')

  const [stampsRequired, setStampsRequired] = useState(10)
  const [rewardDescription, setRewardDescription] = useState('')
  const [allowMultipleRedemption, setAllowMultipleRedemption] = useState(true)

  const [eurosPerPoint, setEurosPerPoint] = useState(1)

  const [cashbackPercent, setCashbackPercent] = useState(5)
  const [minCashbackRedeem, setMinCashbackRedeem] = useState(5)

  const [subscriptionPrice, setSubscriptionPrice] = useState(19.99)
  const [subscriptionPeriod, setSubscriptionPeriod] = useState('monthly')
  const [subscriptionBenefits, setSubscriptionBenefits] = useState('')
  const [dailyLimit, setDailyLimit] = useState(1)

  const [showAddReward, setShowAddReward] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [newReward, setNewReward] = useState({ name: '', description: '', stamps_required: 5, image_url: '' })
  const [showAddTier, setShowAddTier] = useState(false)
  const [editingTier, setEditingTier] = useState<Tier | null>(null)
  const [newTier, setNewTier] = useState({ name: '', min_spend: 0, discount_percent: 0, badge_emoji: '⭐', benefits: '' })

  const router = useRouter()
  const params = useParams()
  const programId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    loadProgram()
  }, [programId])

  async function loadProgram() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('merchant_id, merchants(name)')
      .eq('id', user.id)
      .single()

    if (!profile) return
    setMerchantId(profile.merchant_id)
    setMerchantName((profile.merchants as any)?.name || 'La tua attività')

    const { data: programData } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .eq('merchant_id', profile.merchant_id)
      .single()

    if (!programData) {
      router.push('/dashboard/programs')
      return
    }

    setProgram(programData)
    setName(programData.name || '')
    setDescription(programData.description || '')
    setPrimaryColor(programData.primary_color || '#6366f1')
    setLogoUrl(programData.logo_url || '')

    setExternalRewardsUrl(programData.external_rewards_url || '')
    setTermsUrl(programData.terms_url || programData.rules_url || '')
    setWebsiteUrl(programData.website_url || '')
    setGoogleReviewsUrl(programData.google_reviews_url || '')
    setWalletMessage(programData.wallet_message || '')
    setStampsRequired(programData.stamps_required || 10)
    setRewardDescription(programData.reward_description || '')
    setAllowMultipleRedemption(programData.allow_multiple_redemption ?? true)
    setEurosPerPoint(programData.points_per_euro || 1)
    setCashbackPercent(programData.cashback_percent || 5)
    setMinCashbackRedeem(programData.min_cashback_redeem || 5)
    setSubscriptionPrice(programData.subscription_price || 19.99)
    setSubscriptionPeriod(programData.subscription_period || 'monthly')
    setSubscriptionBenefits(programData.subscription_benefits || '')
    setDailyLimit(programData.daily_limit || 1)

    if (programData.program_type === 'stamps' || programData.program_type === 'points') {
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('program_id', programId)
        .order('stamps_required', { ascending: true })

      if (rewardsData) setRewards(rewardsData)
    }

    if (programData.program_type === 'tiers') {
      const { data: tiersData } = await supabase
        .from('tiers')
        .select('*')
        .eq('program_id', programId)
        .order('sort_order', { ascending: true })

      if (tiersData) setTiers(tiersData)
    }

    setLoading(false)
  }

  async function saveProgram() {
    if (!program) return
    setSaving(true)

    const updateData: any = {
      description,
      external_rewards_url: externalRewardsUrl || null,
      terms_url: termsUrl || null,
      rules_url: termsUrl || null,
      website_url: websiteUrl || null,
      google_reviews_url: googleReviewsUrl || null,
      wallet_message: walletMessage || null,
      updated_at: new Date().toISOString()
    }

    switch (program.program_type) {
      case 'stamps':
        updateData.stamps_required = stampsRequired
        updateData.reward_description = rewardDescription
        updateData.allow_multiple_redemption = allowMultipleRedemption
        break
      case 'points':
        updateData.points_per_euro = eurosPerPoint
        updateData.stamps_required = stampsRequired
        updateData.reward_description = rewardDescription
        break
      case 'cashback':
        updateData.cashback_percent = cashbackPercent
        updateData.min_cashback_redeem = minCashbackRedeem
        break
      case 'subscription':
        updateData.subscription_price = subscriptionPrice
        updateData.subscription_period = subscriptionPeriod
        updateData.subscription_benefits = subscriptionBenefits
        updateData.daily_limit = dailyLimit
        break
    }

    const { error } = await supabase
      .from('programs')
      .update(updateData)
      .eq('id', program.id)

    setSaving(false)

    if (error) {
      alert('Errore: ' + error.message)
      return
    }

    router.push(`/dashboard/programs/${program.id}`)
  }

  async function deleteProgram() {
    if (!confirm('Sei sicuro? Tutte le card dei clienti verranno eliminate. Questa azione è irreversibile.')) return

    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', program.id)

    if (error) {
      alert('Errore: ' + error.message)
      return
    }

    router.push('/dashboard/programs')
  }

  async function addReward() {
    if (!merchantId || !newReward.name) return

    const { data, error } = await supabase
      .from('rewards')
      .insert({
        program_id: programId,
        merchant_id: merchantId,
        name: newReward.name,
        description: newReward.description,
        stamps_required: newReward.stamps_required,
        image_url: newReward.image_url
      })
      .select()
      .single()

    if (!error && data) {
      setRewards([...rewards, data].sort((a, b) => a.stamps_required - b.stamps_required))
      setNewReward({ name: '', description: '', stamps_required: 5, image_url: '' })
      setShowAddReward(false)
    }
  }

  async function updateReward() {
    if (!editingReward) return

    const { error } = await supabase
      .from('rewards')
      .update({
        name: editingReward.name,
        description: editingReward.description,
        stamps_required: editingReward.stamps_required,
        image_url: editingReward.image_url
      })
      .eq('id', editingReward.id)

    if (!error) {
      setRewards(rewards.map(r => r.id === editingReward.id ? editingReward : r).sort((a, b) => a.stamps_required - b.stamps_required))
      setEditingReward(null)
    }
  }

  async function deleteReward(id: string) {
    if (!confirm('Eliminare questo premio?')) return
    await supabase.from('rewards').delete().eq('id', id)
    setRewards(rewards.filter(r => r.id !== id))
  }

  async function addTier() {
    if (!merchantId || !newTier.name) return

    const { data, error } = await supabase
      .from('tiers')
      .insert({
        program_id: programId,
        merchant_id: merchantId,
        name: newTier.name,
        min_spend: newTier.min_spend,
        discount_percent: newTier.discount_percent,
        badge_emoji: newTier.badge_emoji,
        benefits: newTier.benefits,
        sort_order: tiers.length
      })
      .select()
      .single()

    if (!error && data) {
      setTiers([...tiers, data].sort((a, b) => a.min_spend - b.min_spend))
      setNewTier({ name: '', min_spend: 0, discount_percent: 0, badge_emoji: '⭐', benefits: '' })
      setShowAddTier(false)
    }
  }

  async function updateTier() {
    if (!editingTier) return

    const { error } = await supabase
      .from('tiers')
      .update({
        name: editingTier.name,
        min_spend: editingTier.min_spend,
        discount_percent: editingTier.discount_percent,
        badge_emoji: editingTier.badge_emoji,
        benefits: editingTier.benefits
      })
      .eq('id', editingTier.id)

    if (!error) {
      setTiers(tiers.map(t => t.id === editingTier.id ? editingTier : t).sort((a, b) => a.min_spend - b.min_spend))
      setEditingTier(null)
    }
  }

  async function deleteTier(id: string) {
    if (!confirm('Eliminare questo livello?')) return
    await supabase.from('tiers').delete().eq('id', id)
    setTiers(tiers.filter(t => t.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!program) return null

  const typeInfo = PROGRAM_TYPE_INFO[program.program_type] || PROGRAM_TYPE_INFO.stamps
  const TypeIcon = typeInfo.Icon

  return (
    <div className="px-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/dashboard/programs/${program.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3">
            <ArrowLeft size={16} />
            Torna al Programma
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[8px] flex items-center justify-center"
              style={{ backgroundColor: (program.primary_color || '#6366f1') + '20' }}
            >
              <TypeIcon size={18} style={{ color: program.primary_color || '#6366f1' }} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Modifica: {program.name}</h1>
              <p className="text-sm text-gray-500">{typeInfo.name}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={deleteProgram}
            className="flex items-center gap-2 border border-[#FEE2E2] text-[#DC2626] px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-[#FEE2E2]/50 transition-colors"
          >
            <Trash2 size={14} />
            Elimina
          </button>
          <button
            onClick={saveProgram}
            disabled={saving}
            className="bg-[#111111] text-white px-6 py-2 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Form Column */}
        <div className="space-y-4">

          {/* Disclaimer */}
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[12px] p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#F59E0B] flex items-center justify-center mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <p className="font-medium text-[#92400E] text-sm">Cosa puoi modificare</p>
                <div className="mt-2 space-y-1 text-xs text-[#B45309]">
                  <p><strong>Modificabili</strong> (si applicano subito a tutte le carte): Soglie, premi, percentuali, link, messaggi</p>
                  <p className="mt-1"><strong>Non modificabili</strong> (crea un nuovo programma per cambiarli): Nome, logo, colori</p>
                  <p className="mt-1 italic">I QR code delle carte esistenti continueranno a funzionare.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Base - BLOCCATE */}
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] opacity-75">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Lock size={14} className="text-gray-400" />
                Informazioni Base
              </h2>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Non modificabile</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Nome Programma</label>
                <div className="w-full px-3 py-2.5 bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] text-gray-600 text-sm">
                  {name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Descrizione</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                  rows={2}
                  placeholder="Descrizione del programma..."
                />
                <p className="text-xs text-[#16A34A] mt-1">La descrizione è modificabile</p>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Logo</label>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain bg-[#F9F9F9] rounded-[8px] border border-[#E8E8E8]"/>
                  ) : (
                    <div className="w-14 h-14 bg-[#F9F9F9] rounded-[8px] flex items-center justify-center">
                      <TypeIcon size={22} style={{ color: program.primary_color || '#6366f1' }} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Colore</label>
                  <div
                    className="w-14 h-14 rounded-[8px] border-2 border-[#E8E8E8]"
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 bg-[#F9F9F9] p-3 rounded-[8px]">
                Per cambiare nome, logo o colori devi creare un nuovo programma. I clienti con carte esistenti continueranno a usare questo.
              </p>
            </div>
          </div>

          {/* BOLLINI CONFIG */}
          {program.program_type === 'stamps' && (
            <>
              <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <h2 className="font-semibold text-gray-900 mb-4">Configurazione Bollini</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bollini per il premio finale</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="5"
                        max="30"
                        value={stampsRequired}
                        onChange={(e) => setStampsRequired(parseInt(e.target.value))}
                        className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#111111]"
                      />
                      <span className="text-2xl font-bold text-gray-900 w-10 text-center">{stampsRequired}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Premio Finale</label>
                    <input
                      type="text"
                      value={rewardDescription}
                      onChange={(e) => setRewardDescription(e.target.value)}
                      className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                      placeholder="es. Caffè Gratis"
                    />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-[#F9F9F9] rounded-[8px]">
                    <input
                      type="checkbox"
                      checked={allowMultipleRedemption}
                      onChange={(e) => setAllowMultipleRedemption(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <p className="font-medium text-sm text-gray-900">Permetti riscatto multiplo</p>
                      <p className="text-xs text-gray-500">Il cliente può riscattare più volte</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Premi a Livelli */}
              <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold text-gray-900">Premi a Livelli</h2>
                  <button
                    onClick={() => setShowAddReward(true)}
                    className="flex items-center gap-1.5 bg-[#111111] text-white px-3 py-1.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors"
                  >
                    <Plus size={14} />
                    Aggiungi
                  </button>
                </div>

                {rewards.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">Nessun premio intermedio configurato</p>
                ) : (
                  <div className="space-y-2">
                    {rewards.map(reward => (
                      <div key={reward.id} className="flex items-center gap-3 p-3 bg-[#F9F9F9] rounded-[8px]">
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 text-sm">
                          {reward.stamps_required}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{reward.name}</p>
                          <p className="text-xs text-gray-500">{reward.stamps_required} bollini</p>
                        </div>
                        <button onClick={() => setEditingReward(reward)} className="text-gray-400 hover:text-gray-700 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteReward(reward.id)} className="text-gray-400 hover:text-[#DC2626] transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {showAddReward && (
                  <div className="mt-4 p-4 bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] space-y-3">
                    <input
                      type="text"
                      placeholder="Nome premio"
                      value={newReward.name}
                      onChange={(e) => setNewReward({...newReward, name: e.target.value})}
                      className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Bollini richiesti"
                      value={newReward.stamps_required}
                      onChange={(e) => setNewReward({...newReward, stamps_required: parseInt(e.target.value) || 5})}
                      className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddReward(false)} className="flex-1 py-2 border border-[#E0E0E0] rounded-[8px] text-sm hover:bg-[#F5F5F5] transition-colors">Annulla</button>
                      <button onClick={addReward} className="flex-1 py-2 bg-[#111111] text-white rounded-[8px] text-sm hover:bg-[#333333] transition-colors">Aggiungi</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* PUNTI CONFIG */}
          {program.program_type === 'points' && (
            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h2 className="font-semibold text-gray-900 mb-4">Configurazione Punti</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ogni quanti € spesi = 1 punto?</label>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm">Ogni</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                      <input
                        type="number"
                        min="1"
                        value={eurosPerPoint}
                        onChange={(e) => setEurosPerPoint(parseInt(e.target.value) || 1)}
                        className="w-24 pl-7 pr-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm text-center font-bold focus:border-[#111111] focus:outline-none"
                      />
                    </div>
                    <span className="text-gray-500 text-sm">= 1 punto</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Punti per premio</label>
                  <input
                    type="number"
                    value={stampsRequired}
                    onChange={(e) => setStampsRequired(parseInt(e.target.value) || 100)}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Premio</label>
                  <input
                    type="text"
                    value={rewardDescription}
                    onChange={(e) => setRewardDescription(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                    placeholder="es. €10 di sconto"
                  />
                </div>

                <div className="bg-[#F9F9F9] border border-[#E8E8E8] p-3 rounded-[8px] text-sm text-gray-600">
                  <ul className="space-y-1">
                    <li>• Cliente spende €{eurosPerPoint} → Guadagna 1 punto</li>
                    <li>• A {stampsRequired} punti → Ottiene: {rewardDescription || 'premio'}</li>
                    <li>• <strong>Spesa totale per premio: €{eurosPerPoint * stampsRequired}</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* CASHBACK CONFIG */}
          {program.program_type === 'cashback' && (
            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h2 className="font-semibold text-gray-900 mb-4">Configurazione Cashback</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Percentuale Cashback</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={cashbackPercent}
                      onChange={(e) => setCashbackPercent(parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#111111]"
                    />
                    <span className="text-2xl font-bold text-gray-900 w-14 text-center">{cashbackPercent}%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Minimo per riscattare (€)</label>
                  <input
                    type="number"
                    min="1"
                    value={minCashbackRedeem}
                    onChange={(e) => setMinCashbackRedeem(parseFloat(e.target.value) || 5)}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>

                <div className="bg-[#F9F9F9] border border-[#E8E8E8] p-3 rounded-[8px] text-sm text-gray-600">
                  Spendi €100 → Ricevi €{(100 * cashbackPercent / 100).toFixed(2)} → Usabile da €{minCashbackRedeem}
                </div>
              </div>
            </div>
          )}

          {/* TIERS CONFIG */}
          {program.program_type === 'tiers' && (
            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-gray-900">Livelli VIP</h2>
                <button
                  onClick={() => setShowAddTier(true)}
                  className="flex items-center gap-1.5 bg-[#111111] text-white px-3 py-1.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors"
                >
                  <Plus size={14} />
                  Aggiungi Livello
                </button>
              </div>

              {tiers.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Nessun livello configurato. Aggiungi il primo!</p>
              ) : (
                <div className="space-y-3">
                  {tiers.map((tier) => (
                    <div key={tier.id} className="border border-[#E0E0E0] rounded-[8px] p-4 hover:border-gray-400 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{tier.badge_emoji}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{tier.name}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span>{tier.min_spend === 0 ? 'Livello iniziale' : `Da €${tier.min_spend}`}</span>
                            {tier.discount_percent > 0 && (
                              <span className="bg-[#DCFCE7] text-[#16A34A] px-1.5 py-0.5 rounded-full">{tier.discount_percent}% sconto</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingTier(tier)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-[#F5F5F5] rounded-[8px] transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteTier(tier.id)}
                            className="p-1.5 text-gray-400 hover:text-[#DC2626] hover:bg-[#FEE2E2]/50 rounded-[8px] transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {tier.benefits && (
                        <div className="bg-[#F9F9F9] rounded-[8px] p-2.5 mt-2">
                          <p className="text-xs text-gray-500 mb-0.5 font-medium">Vantaggi:</p>
                          <p className="text-sm text-gray-700">{tier.benefits}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {showAddTier && (
                <div className="mt-4 p-4 bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] space-y-3">
                  <h3 className="font-medium text-gray-900 text-sm">Nuovo Livello</h3>

                  <div className="flex gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Icona</label>
                      <select
                        value={newTier.badge_emoji}
                        onChange={(e) => setNewTier({...newTier, badge_emoji: e.target.value})}
                        className="w-14 px-1.5 py-2 border border-[#E0E0E0] rounded-[8px] text-xl bg-white focus:border-[#111111] focus:outline-none"
                      >
                        <option value="🥉">🥉</option>
                        <option value="🥈">🥈</option>
                        <option value="🥇">🥇</option>
                        <option value="💎">💎</option>
                        <option value="👑">👑</option>
                        <option value="⭐">⭐</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nome Livello</label>
                      <input
                        type="text"
                        placeholder="es. Platinum"
                        value={newTier.name}
                        onChange={(e) => setNewTier({...newTier, name: e.target.value})}
                        className="w-full px-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Spesa minima (€)</label>
                      <input
                        type="number"
                        placeholder="es. 1000"
                        value={newTier.min_spend}
                        onChange={(e) => setNewTier({...newTier, min_spend: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Sconto permanente (%)</label>
                      <input
                        type="number"
                        placeholder="es. 15"
                        value={newTier.discount_percent}
                        onChange={(e) => setNewTier({...newTier, discount_percent: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Vantaggi di questo livello</label>
                    <textarea
                      placeholder="es. 15% sconto, spedizione gratuita, accesso eventi VIP..."
                      value={newTier.benefits}
                      onChange={(e) => setNewTier({...newTier, benefits: e.target.value})}
                      className="w-full px-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setShowAddTier(false)} className="flex-1 py-2 border border-[#E0E0E0] rounded-[8px] text-sm hover:bg-[#F5F5F5] transition-colors">Annulla</button>
                    <button onClick={addTier} disabled={!newTier.name} className="flex-1 py-2 bg-[#111111] text-white rounded-[8px] text-sm hover:bg-[#333333] disabled:opacity-50 transition-colors">Aggiungi Livello</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUBSCRIPTION CONFIG */}
          {program.program_type === 'subscription' && (
            <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h2 className="font-semibold text-gray-900 mb-4">Configurazione Abbonamento</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Prezzo (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={subscriptionPrice}
                      onChange={(e) => setSubscriptionPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Periodo</label>
                    <select
                      value={subscriptionPeriod}
                      onChange={(e) => setSubscriptionPeriod(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                    >
                      <option value="weekly">Settimanale</option>
                      <option value="monthly">Mensile</option>
                      <option value="yearly">Annuale</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Limite utilizzi giornalieri</label>
                  <input
                    type="number"
                    min="1"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cosa include?</label>
                  <textarea
                    value={subscriptionBenefits}
                    onChange={(e) => setSubscriptionBenefits(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                    rows={3}
                    placeholder="1 caffè gratis al giorno&#10;10% sconto su tutto..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Link e Google Wallet */}
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h2 className="font-semibold text-gray-900 mb-1">Link e Google Wallet</h2>
            <p className="text-sm text-gray-500 mb-4">
              Questi link appariranno nel retro della carta Google Wallet dei tuoi clienti
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Link Catalogo Premi</label>
                <input
                  type="url"
                  value={externalRewardsUrl}
                  onChange={(e) => setExternalRewardsUrl(e.target.value)}
                  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                  placeholder="https://tuosito.com/premi"
                />
                <p className="text-xs text-gray-400 mt-1">Mostrato come &quot;Catalogo Premi&quot; nel Wallet</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Link Regolamento</label>
                <input
                  type="url"
                  value={termsUrl}
                  onChange={(e) => setTermsUrl(e.target.value)}
                  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                  placeholder="https://tuosito.com/regolamento"
                />
                <p className="text-xs text-gray-400 mt-1">Mostrato come &quot;Regolamento&quot; nel Wallet</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sito Web Attività</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                  placeholder="https://tuosito.com"
                />
                <p className="text-xs text-gray-400 mt-1">Mostrato come &quot;Sito Web&quot; nel Wallet</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Recensioni Google (opzionale)
                </label>
                <input
                  type="url"
                  value={googleReviewsUrl}
                  onChange={e => setGoogleReviewsUrl(e.target.value)}
                  placeholder="https://g.page/r/..."
                  className="border border-[#E0E0E0] rounded-[8px] px-3 py-2 text-sm focus:border-[#111111] focus:outline-none w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Apparira un banner sul cliente dopo ogni riscatto premio
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Messaggio Personalizzato</label>
                <textarea
                  value={walletMessage}
                  onChange={(e) => setWalletMessage(e.target.value)}
                  className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
                  rows={2}
                  placeholder="es. Grazie per essere nostro cliente! Presenta la carta ad ogni acquisto."
                />
                <p className="text-xs text-gray-400 mt-1">Appare come messaggio nella carta</p>
              </div>

              <div className="bg-[#F9F9F9] border border-[#E8E8E8] rounded-[8px] p-3">
                <p className="font-medium text-gray-700 text-sm mb-1">Come appariranno i link</p>
                <ul className="text-xs text-gray-500 space-y-0.5">
                  <li>• <strong>Catalogo Premi</strong> → link al tuo catalogo</li>
                  <li>• <strong>Regolamento</strong> → link alle regole</li>
                  <li>• <strong>Sito Web</strong> → link al tuo sito</li>
                </ul>
              </div>

              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] p-3">
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-[#16A34A] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-[#166534] text-sm">Queste modifiche si applicano subito</p>
                    <p className="text-xs text-[#16A34A] mt-0.5">
                      I link modificati saranno visibili nelle nuove carte che i clienti aggiungeranno al wallet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Column */}
        <div className="lg:sticky lg:top-6 h-fit">
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h2 className="font-semibold text-gray-900 mb-4 text-center">Anteprima</h2>

            <div className="bg-gray-900 rounded-[2.5rem] p-3 max-w-[280px] mx-auto">
              <div className="bg-gray-800 rounded-[2rem] overflow-hidden">
                <div className="p-5" style={{ backgroundColor: primaryColor }}>
                  <div className="flex items-center gap-3 mb-4">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-11 h-11 object-contain rounded-[8px] bg-white/20 p-1"/>
                    ) : (
                      <div className="w-11 h-11 rounded-[8px] bg-white/20 flex items-center justify-center">
                        <TypeIcon size={20} className="text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-white">{name || 'Nome Programma'}</h3>
                      <p className="text-white/60 text-xs">{merchantName}</p>
                    </div>
                  </div>

                  <div className="bg-white/15 rounded-[8px] p-4 mb-4">
                    {program.program_type === 'stamps' && (
                      <>
                        <div className="flex justify-center gap-1.5 flex-wrap mb-2">
                          {Array.from({ length: Math.min(stampsRequired, 8) }).map((_, i) => (
                            <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center ${i < 4 ? 'bg-white' : 'bg-white/30'}`}>
                              {i < 4 && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />}
                            </div>
                          ))}
                        </div>
                        <p className="text-center text-white text-xs">4/{stampsRequired} bollini</p>
                        {rewardDescription && <p className="text-center text-white/80 text-xs mt-1">{rewardDescription}</p>}
                      </>
                    )}

                    {program.program_type === 'points' && (
                      <div className="text-center">
                        <p className="text-white/60 text-xs">I TUOI PUNTI</p>
                        <p className="text-3xl font-bold text-white">47</p>
                        <div className="mt-2 h-1.5 bg-white/30 rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full" style={{ width: `${Math.min((47 / stampsRequired) * 100, 100)}%` }}/>
                        </div>
                        <p className="text-white/60 text-xs mt-1">47/{stampsRequired} punti</p>
                        {rewardDescription && <p className="text-white text-xs mt-1">{rewardDescription}</p>}
                      </div>
                    )}

                    {program.program_type === 'cashback' && (
                      <div className="text-center">
                        <p className="text-white/60 text-xs">IL TUO CREDITO</p>
                        <p className="text-3xl font-bold text-white">€12.50</p>
                        <p className="text-white/70 text-xs mt-1">+{cashbackPercent}% su ogni acquisto</p>
                      </div>
                    )}

                    {program.program_type === 'tiers' && (
                      <div className="text-center">
                        <p className="text-white/60 text-xs mb-2">IL TUO LIVELLO</p>
                        {tiers.length > 0 ? (
                          <div className="flex justify-center items-end gap-2">
                            {tiers.slice(0, 3).map((tier, i) => (
                              <div key={i} className={`text-center transition-all ${i === 1 ? 'scale-125 opacity-100' : 'scale-90 opacity-50'}`}>
                                <p className="text-xl">{tier.badge_emoji}</p>
                                <p className="text-white text-xs font-medium">{tier.name}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-white/60 text-sm">Configura i livelli</p>
                        )}
                      </div>
                    )}

                    {program.program_type === 'subscription' && (
                      <div className="text-center">
                        <p className="text-white/60 text-xs">ABBONAMENTO</p>
                        <p className="text-2xl font-bold text-white">€{subscriptionPrice}<span className="text-sm font-normal">/{subscriptionPeriod === 'monthly' ? 'mese' : subscriptionPeriod === 'weekly' ? 'sett' : 'anno'}</span></p>
                        <p className="text-white/60 text-xs mt-1">{dailyLimit} utilizzo/i al giorno</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-[8px] p-3 text-center">
                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-[8px] flex items-center justify-center">
                      <div className="w-10 h-10 bg-gray-300 rounded-sm" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Scansiona</p>
                  </div>

                  {(externalRewardsUrl || termsUrl || websiteUrl) && (
                    <div className="flex justify-center gap-3 mt-3 text-xs text-white/70 flex-wrap">
                      {externalRewardsUrl && <span className="underline">Premi</span>}
                      {termsUrl && <span className="underline">Regolamento</span>}
                      {websiteUrl && <span className="underline">Sito</span>}
                    </div>
                  )}
                </div>

                <div className="bg-gray-100 py-2 text-center">
                  <p className="text-xs text-gray-400">Powered by <span className="font-medium">Zale Marketing</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Reward Modal */}
      {editingReward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Modifica Premio</h2>
            <div className="space-y-3">
              <input type="text" value={editingReward.name} onChange={(e) => setEditingReward({...editingReward, name: e.target.value})} className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none" placeholder="Nome"/>
              <input type="number" value={editingReward.stamps_required} onChange={(e) => setEditingReward({...editingReward, stamps_required: parseInt(e.target.value) || 5})} className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none" placeholder="Bollini richiesti"/>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditingReward(null)} className="flex-1 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm hover:bg-[#F5F5F5] transition-colors">Annulla</button>
              <button onClick={updateReward} className="flex-1 py-2.5 bg-[#111111] text-white rounded-[8px] text-sm hover:bg-[#333333] transition-colors">Salva</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tier Modal */}
      {editingTier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Modifica Livello</h2>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Icona</label>
                  <select
                    value={editingTier.badge_emoji}
                    onChange={(e) => setEditingTier({...editingTier, badge_emoji: e.target.value})}
                    className="w-14 px-1.5 py-2 border border-[#E0E0E0] rounded-[8px] text-xl focus:border-[#111111] focus:outline-none"
                  >
                    <option value="🥉">🥉</option>
                    <option value="🥈">🥈</option>
                    <option value="🥇">🥇</option>
                    <option value="💎">💎</option>
                    <option value="👑">👑</option>
                    <option value="⭐">⭐</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                  <input
                    type="text"
                    value={editingTier.name}
                    onChange={(e) => setEditingTier({...editingTier, name: e.target.value})}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Spesa minima (€)</label>
                  <input
                    type="number"
                    value={editingTier.min_spend}
                    onChange={(e) => setEditingTier({...editingTier, min_spend: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sconto (%)</label>
                  <input
                    type="number"
                    value={editingTier.discount_percent}
                    onChange={(e) => setEditingTier({...editingTier, discount_percent: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vantaggi</label>
                <textarea
                  value={editingTier.benefits || ''}
                  onChange={(e) => setEditingTier({...editingTier, benefits: e.target.value})}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none"
                  rows={3}
                  placeholder="Descrivi i vantaggi di questo livello..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingTier(null)} className="flex-1 py-2.5 border border-[#E0E0E0] rounded-[8px] text-sm hover:bg-[#F5F5F5] transition-colors">Annulla</button>
              <button onClick={updateTier} className="flex-1 py-2.5 bg-[#111111] text-white rounded-[8px] text-sm hover:bg-[#333333] transition-colors">Salva Modifiche</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
