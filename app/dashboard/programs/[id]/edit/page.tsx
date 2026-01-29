'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

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

const PROGRAM_TYPE_INFO: Record<string, { icon: string, name: string, color: string }> = {
  stamps: { icon: '🎫', name: 'Bollini / Timbri', color: '#6366f1' },
  points: { icon: '⭐', name: 'Punti su Spesa', color: '#10b981' },
  cashback: { icon: '💰', name: 'Cashback', color: '#f59e0b' },
  tiers: { icon: '👑', name: 'Livelli VIP', color: '#8b5cf6' },
  subscription: { icon: '🔄', name: 'Abbonamento', color: '#ec4899' },
  missions: { icon: '🎮', name: 'Missioni', color: '#06b6d4' }
}

export default function EditProgramPage() {
  const [program, setProgram] = useState<any>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [merchantName, setMerchantName] = useState('')
  
  // Form base
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [secondaryColor, setSecondaryColor] = useState('#4f46e5')
  const [textColor, setTextColor] = useState('#ffffff')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [externalRewardsUrl, setExternalRewardsUrl] = useState('')
  const [rulesUrl, setRulesUrl] = useState('')
  // Google Wallet
const [termsUrl, setTermsUrl] = useState('')
const [websiteUrl, setWebsiteUrl] = useState('')
const [walletMessage, setWalletMessage] = useState('')
  
  // Bollini
  const [stampsRequired, setStampsRequired] = useState(10)
  const [rewardDescription, setRewardDescription] = useState('')
  const [allowMultipleRedemption, setAllowMultipleRedemption] = useState(true)
  
  // Punti
  const [eurosPerPoint, setEurosPerPoint] = useState(1) // Ogni X€ = 1 punto
  
  // Cashback
  const [cashbackPercent, setCashbackPercent] = useState(5)
  const [minCashbackRedeem, setMinCashbackRedeem] = useState(5)
  
  // Subscription
  const [subscriptionPrice, setSubscriptionPrice] = useState(19.99)
  const [subscriptionPeriod, setSubscriptionPeriod] = useState('monthly')
  const [subscriptionBenefits, setSubscriptionBenefits] = useState('')
  const [dailyLimit, setDailyLimit] = useState(1)
  
  // Modals
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

    // Load program
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
    
    // Set form values
    setName(programData.name || '')
    setDescription(programData.description || '')
    setPrimaryColor(programData.primary_color || '#6366f1')
    setSecondaryColor(programData.secondary_color || '#4f46e5')
    setTextColor(programData.text_color || '#ffffff')
    setLogoUrl(programData.logo_url || '')
    setLogoPreview(programData.logo_url || null)
    setExternalRewardsUrl(programData.external_rewards_url || '')
    setRulesUrl(programData.rules_url || '')
    setTermsUrl(programData.terms_url || '')
setWebsiteUrl(programData.website_url || '')
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

    // Load rewards (for stamps/points)
    if (programData.program_type === 'stamps' || programData.program_type === 'points') {
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('program_id', programId)
        .order('stamps_required', { ascending: true })

      if (rewardsData) setRewards(rewardsData)
    }

    // Load tiers (for tiers type)
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !merchantId) return

    // ⛔ Blocca SVG - Google Wallet non lo supporta!
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    
    if (!allowedTypes.includes(file.type)) {
      alert('❌ Formato non supportato!\n\nGoogle Wallet accetta solo:\n• PNG\n• JPG/JPEG\n• WebP\n\n⚠️ I file SVG NON sono supportati.')
      e.target.value = ''
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('L\'immagine deve essere inferiore a 2MB')
      return
    }

    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${merchantId}/${programId}-${Date.now()}.${fileExt}`

      const { error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (error) {
        alert('Errore: ' + error.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      setLogoUrl(publicUrl)
      setLogoPreview(publicUrl)
    } catch (err) {
      alert('Errore durante il caricamento')
    } finally {
      setUploading(false)
    }
  }

  async function saveProgram() {
    if (!program) return
    setSaving(true)

    const updateData: any = {
      name,
      description,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      text_color: textColor,
      logo_url: logoUrl || null,
      external_rewards_url: externalRewardsUrl || null,
      rules_url: rulesUrl || null,
      terms_url: termsUrl || null,
website_url: websiteUrl || null,
wallet_message: walletMessage || null,
      updated_at: new Date().toISOString()
    }

    // Add type-specific fields
    switch (program.program_type) {
      case 'stamps':
        updateData.stamps_required = stampsRequired
        updateData.reward_description = rewardDescription
        updateData.allow_multiple_redemption = allowMultipleRedemption
        break
      case 'points':
        updateData.points_per_euro = eurosPerPoint
        updateData.stamps_required = stampsRequired // points for reward
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
    if (!confirm('Sei sicuro? Tutte le card verranno eliminate.')) return

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

  // REWARDS CRUD
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

  // TIERS CRUD
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!program) return null

  const typeInfo = PROGRAM_TYPE_INFO[program.program_type] || PROGRAM_TYPE_INFO.stamps

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <Link href={`/dashboard/programs/${program.id}`} className="text-indigo-600 hover:underline text-sm">
              ← Torna al Programma
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-2xl">{typeInfo.icon}</span>
              <h1 className="text-2xl font-bold text-gray-900">Modifica: {program.name}</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">{typeInfo.name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={deleteProgram}
              className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
            >
              🗑️ Elimina
            </button>
            <button
              onClick={saveProgram}
              disabled={saving || !name}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : '💾 Salva'}
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* Form Column */}
          <div className="space-y-6">
            
            {/* Basic Info */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-lg mb-4">📝 Informazioni Base</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Programma *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* === TYPE-SPECIFIC SECTIONS === */}

            {/* BOLLINI CONFIG */}
            {program.program_type === 'stamps' && (
              <>
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="font-bold text-lg mb-4">🎫 Configurazione Bollini</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bollini per il premio finale
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="5"
                          max="30"
                          value={stampsRequired}
                          onChange={(e) => setStampsRequired(parseInt(e.target.value))}
                          className="flex-1 accent-indigo-600"
                        />
                        <span className="text-2xl font-bold text-indigo-600 w-12 text-center">{stampsRequired}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premio Finale</label>
                      <input
                        type="text"
                        value={rewardDescription}
                        onChange={(e) => setRewardDescription(e.target.value)}
                        className="w-full px-4 py-2 border rounded-xl"
                        placeholder="es. Caffè Gratis"
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl">
                      <input
                        type="checkbox"
                        checked={allowMultipleRedemption}
                        onChange={(e) => setAllowMultipleRedemption(e.target.checked)}
                        className="w-5 h-5 rounded text-indigo-600"
                      />
                      <div>
                        <p className="font-medium text-sm">Permetti riscatto multiplo</p>
                        <p className="text-xs text-gray-500">Il cliente può riscattare più volte</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Rewards Management for Stamps */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg">🎁 Premi a Livelli</h2>
                    <button
                      onClick={() => setShowAddReward(true)}
                      className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm"
                    >
                      + Aggiungi
                    </button>
                  </div>

                  {rewards.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">Nessun premio intermedio configurato</p>
                  ) : (
                    <div className="space-y-2">
                      {rewards.map(reward => (
                        <div key={reward.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                            {reward.stamps_required}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{reward.name}</p>
                            <p className="text-xs text-gray-500">{reward.stamps_required} bollini</p>
                          </div>
                          <button onClick={() => setEditingReward(reward)} className="text-gray-400 hover:text-indigo-600">✏️</button>
                          <button onClick={() => deleteReward(reward.id)} className="text-gray-400 hover:text-red-600">🗑️</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showAddReward && (
                    <div className="mt-4 p-4 bg-indigo-50 rounded-xl space-y-3">
                      <input
                        type="text"
                        placeholder="Nome premio"
                        value={newReward.name}
                        onChange={(e) => setNewReward({...newReward, name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Bollini richiesti"
                        value={newReward.stamps_required}
                        onChange={(e) => setNewReward({...newReward, stamps_required: parseInt(e.target.value) || 5})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowAddReward(false)} className="flex-1 py-2 border rounded-lg">Annulla</button>
                        <button onClick={addReward} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg">Aggiungi</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* PUNTI CONFIG */}
{program.program_type === 'points' && (
  <div className="bg-white rounded-2xl shadow-sm p-6">
    <h2 className="font-bold text-lg mb-4">⭐ Configurazione Punti</h2>
    
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ogni quanti € spesi = 1 punto?
        </label>
        <div className="flex items-center gap-3">
          <span className="text-gray-500">Ogni</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            <input
              type="number"
              min="1"
              value={eurosPerPoint}
              onChange={(e) => setEurosPerPoint(parseInt(e.target.value) || 1)}
              className="w-24 pl-8 pr-2 py-2 border rounded-xl text-center font-bold"
            />
          </div>
          <span className="text-gray-500">= 1 punto</span>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Punti per premio</label>
        <input
          type="number"
          value={stampsRequired}
          onChange={(e) => setStampsRequired(parseInt(e.target.value) || 100)}
          className="w-full px-4 py-2 border rounded-xl"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Premio</label>
        <input
          type="text"
          value={rewardDescription}
          onChange={(e) => setRewardDescription(e.target.value)}
          className="w-full px-4 py-2 border rounded-xl"
          placeholder="es. €10 di sconto"
        />
      </div>
      
      <div className="bg-green-50 p-4 rounded-xl">
        <p className="text-sm text-green-700">
          📊 <strong>Come funziona:</strong>
        </p>
        <ul className="text-sm text-green-700 mt-2 space-y-1">
          <li>• Cliente spende €{eurosPerPoint} → Guadagna 1 punto</li>
          <li>• Cliente spende €{eurosPerPoint * 10} → Guadagna 10 punti</li>
          <li>• A {stampsRequired} punti → Ottiene: {rewardDescription || 'premio'}</li>
          <li>• <strong>Spesa totale per premio: €{eurosPerPoint * stampsRequired}</strong></li>
        </ul>
      </div>
    </div>
  </div>
)}

            {/* CASHBACK CONFIG */}
            {program.program_type === 'cashback' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-bold text-lg mb-4">💰 Configurazione Cashback</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Percentuale Cashback</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={cashbackPercent}
                        onChange={(e) => setCashbackPercent(parseInt(e.target.value))}
                        className="flex-1 accent-amber-500"
                      />
                      <span className="text-2xl font-bold text-amber-600 w-16 text-center">{cashbackPercent}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimo per riscattare (€)</label>
                    <input
                      type="number"
                      min="1"
                      value={minCashbackRedeem}
                      onChange={(e) => setMinCashbackRedeem(parseFloat(e.target.value) || 5)}
                      className="w-full px-4 py-2 border rounded-xl"
                    />
                  </div>
                  
                  <div className="bg-amber-50 p-3 rounded-xl">
                    <p className="text-sm text-amber-700">
                      💰 Spendi €100 → Ricevi €{(100 * cashbackPercent / 100).toFixed(2)} → Usabile da €{minCashbackRedeem}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TIERS CONFIG */}
{program.program_type === 'tiers' && (
  <div className="bg-white rounded-2xl shadow-sm p-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="font-bold text-lg">👑 Livelli VIP</h2>
      <button
        onClick={() => setShowAddTier(true)}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700"
      >
        + Aggiungi Livello
      </button>
    </div>
    
    <div className="bg-purple-50 rounded-xl p-4 mb-4">
      <p className="text-sm text-purple-800">
        <strong>💡 Come funziona:</strong> I clienti salgono di livello in base alla spesa totale. 
        Ogni livello sblocca vantaggi esclusivi permanenti.
      </p>
    </div>

    {tiers.length === 0 ? (
      <p className="text-center text-gray-400 py-8">Nessun livello configurato. Aggiungi il primo!</p>
    ) : (
      <div className="space-y-3">
        {tiers.map((tier, i) => (
          <div key={tier.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{tier.badge_emoji}</span>
              <div className="flex-1">
                <p className="font-bold text-lg">{tier.name}</p>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>📊 {tier.min_spend === 0 ? 'Livello iniziale' : `Da €${tier.min_spend}`}</span>
                  {tier.discount_percent > 0 && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      🏷️ {tier.discount_percent}% sconto
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => setEditingTier(tier)} 
                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => deleteTier(tier.id)} 
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  🗑️
                </button>
              </div>
            </div>
            {tier.benefits && (
              <div className="bg-gray-50 rounded-lg p-3 mt-2">
                <p className="text-xs font-medium text-gray-500 mb-1">🎁 Vantaggi:</p>
                <p className="text-sm text-gray-700">{tier.benefits}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    )}

    {showAddTier && (
      <div className="mt-4 p-5 bg-purple-50 rounded-xl space-y-4">
        <h3 className="font-bold text-purple-800">➕ Nuovo Livello</h3>
        
        <div className="flex gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Icona</label>
            <select
              value={newTier.badge_emoji}
              onChange={(e) => setNewTier({...newTier, badge_emoji: e.target.value})}
              className="w-16 px-2 py-2 border-2 border-purple-200 rounded-lg text-2xl bg-white"
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome Livello *</label>
            <input
              type="text"
              placeholder="es. Platinum"
              value={newTier.name}
              onChange={(e) => setNewTier({...newTier, name: e.target.value})}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📊 Spesa minima (€)</label>
            <input
              type="number"
              placeholder="es. 1000"
              value={newTier.min_spend}
              onChange={(e) => setNewTier({...newTier, min_spend: parseInt(e.target.value) || 0})}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">🏷️ Sconto permanente (%)</label>
            <input
              type="number"
              placeholder="es. 15"
              value={newTier.discount_percent}
              onChange={(e) => setNewTier({...newTier, discount_percent: parseInt(e.target.value) || 0})}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">🎁 Vantaggi di questo livello</label>
          <textarea
            placeholder="es. 15% sconto, spedizione gratuita, accesso eventi VIP..."
            value={newTier.benefits}
            onChange={(e) => setNewTier({...newTier, benefits: e.target.value})}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
            rows={2}
          />
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddTier(false)} 
            className="flex-1 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Annulla
          </button>
          <button 
            onClick={addTier} 
            disabled={!newTier.name}
            className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Aggiungi Livello
          </button>
        </div>
      </div>
    )}
  </div>
)}

            {/* SUBSCRIPTION CONFIG */}
            {program.program_type === 'subscription' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-bold text-lg mb-4">🔄 Configurazione Abbonamento</h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prezzo (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={subscriptionPrice}
                        onChange={(e) => setSubscriptionPrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
                      <select
                        value={subscriptionPeriod}
                        onChange={(e) => setSubscriptionPeriod(e.target.value)}
                        className="w-full px-4 py-2 border rounded-xl"
                      >
                        <option value="weekly">Settimanale</option>
                        <option value="monthly">Mensile</option>
                        <option value="yearly">Annuale</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Limite utilizzi giornalieri</label>
                    <input
                      type="number"
                      min="1"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-2 border rounded-xl"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cosa include?</label>
                    <textarea
                      value={subscriptionBenefits}
                      onChange={(e) => setSubscriptionBenefits(e.target.value)}
                      className="w-full px-4 py-2 border rounded-xl"
                      rows={3}
                      placeholder="1 caffè gratis al giorno&#10;10% sconto su tutto..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Logo */}
<div className="bg-white rounded-2xl shadow-sm p-6">
  <h2 className="font-bold text-lg mb-4">🖼️ Logo Aziendale</h2>
  
  <div className="space-y-4">
    {logoPreview ? (
      <div className="flex items-center gap-4">
        <img 
          src={logoPreview} 
          alt="Logo" 
          className="w-24 h-24 object-contain bg-gray-100 rounded-xl border"
        />
        <div className="flex-1">
          <p className="text-sm text-green-600 font-medium mb-2">✓ Logo caricato</p>
          <div className="flex gap-2">
            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              📷 Cambia
              <input 
  type="file" 
  accept="image/png,image/jpeg,image/jpg,image/webp" 
  onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <button 
              onClick={() => { setLogoUrl(''); setLogoPreview(null) }}
              className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🗑️ Rimuovi
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
        <div className="text-4xl mb-2">📷</div>
        <p className="text-gray-500 mb-3">Nessun logo caricato</p>
        <label className="cursor-pointer inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          + Carica Logo
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleLogoUpload} 
            disabled={uploading}
            className="hidden"
          />
        </label>
        <p className="text-xs text-gray-400 mt-3">PNG, JPG o WebP • Max 2MB • ⚠️ NO SVG</p>
      </div>
    )}
    
    {uploading && (
      <div className="flex items-center gap-2 text-indigo-600">
        <div className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
        <span className="text-sm">Caricamento in corso...</span>
      </div>
    )}
  </div>
</div>

            {/* Colors */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-lg mb-4">🎨 Colori</h2>
              <div className="flex items-center gap-4">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer"/>
                <div className="flex gap-2 flex-wrap">
                  {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#1e293b'].map(c => (
                    <button key={c} onClick={() => setPrimaryColor(c)} className={`w-8 h-8 rounded-lg ${primaryColor === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`} style={{ backgroundColor: c }}/>
                  ))}
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-lg mb-4">🔗 Link Esterni</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Catalogo Premi</label>
                  <input type="url" value={externalRewardsUrl} onChange={(e) => setExternalRewardsUrl(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="https://..."/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Regolamento</label>
                  <input type="url" value={rulesUrl} onChange={(e) => setRulesUrl(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="https://..."/>
                </div>
              </div>
            </div>

            {/* Google Wallet Settings */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-lg mb-4">📱 Google Wallet</h2>
              <p className="text-sm text-gray-500 mb-4">
                Personalizza come appare la carta nel Google Wallet dei tuoi clienti
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link Regolamento (mostrato nel Wallet)
                  </label>
                  <input
                    type="url"
                    value={termsUrl}
                    onChange={(e) => setTermsUrl(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://tuosito.com/regolamento"
                  />
                  <p className="text-xs text-gray-400 mt-1">I clienti vedranno questo link nella loro carta</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sito Web Attività
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://tuosito.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Messaggio Personalizzato
                  </label>
                  <textarea
                    value={walletMessage}
                    onChange={(e) => setWalletMessage(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                    placeholder="es. Grazie per essere nostro cliente! Presenta la carta ad ogni acquisto."
                  />
                  <p className="text-xs text-gray-400 mt-1">Questo messaggio appare nella carta Google Wallet</p>
                </div>
                
                <div className="bg-indigo-50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <p className="font-medium text-indigo-900">Come funziona</p>
                      <p className="text-sm text-indigo-700 mt-1">
                        Quando un cliente aggiunge la carta al Google Wallet, vedrà il logo, 
                        i colori e i link che hai configurato. L&apos;immagine della carta si aggiorna 
                        automaticamente con i bollini/punti/credito attuali.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-medium text-amber-900">Importante</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Se modifichi il <strong>logo</strong> o il <strong>nome del programma</strong>, 
                        le carte già salvate nel wallet dei clienti manterranno i dati precedenti. 
                        Solo le nuove carte mostreranno le modifiche. Questo è un limite tecnico di Google Wallet.
                      </p>
                      <p className="text-sm text-amber-700 mt-2">
                        <strong>Consiglio:</strong> Configura logo e nome definitivi prima di distribuire le carte ai clienti.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Column */}

          {/* Preview Column */}
          <div className="lg:sticky lg:top-6 h-fit">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-lg mb-4 text-center">📱 Anteprima</h2>
              
              <div className="bg-gray-900 rounded-[2.5rem] p-3 max-w-[300px] mx-auto">
                <div className="bg-gray-800 rounded-[2rem] overflow-hidden">
                  <div className="p-5" style={{ backgroundColor: primaryColor }}>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-12 h-12 object-contain rounded-xl bg-white/20 p-1"/>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">{typeInfo.icon}</div>
                      )}
                      <div>
                        <h3 className="font-bold text-white">{name || 'Nome Programma'}</h3>
                        <p className="text-white/60 text-xs">{merchantName}</p>
                      </div>
                    </div>

                    {/* Type-specific preview */}
                    <div className="bg-white/15 rounded-xl p-4 mb-4">
                      {program.program_type === 'stamps' && (
                        <>
                          <div className="flex justify-center gap-1.5 flex-wrap mb-2">
                            {Array.from({ length: Math.min(stampsRequired, 8) }).map((_, i) => (
                              <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 4 ? 'bg-white' : 'bg-white/30'}`} style={{ color: i < 4 ? primaryColor : 'white' }}>
                                {i < 4 ? '✓' : i + 1}
                              </div>
                            ))}
                          </div>
                          <p className="text-center text-white text-sm">4/{stampsRequired} bollini</p>
                        </>
                      )}

                      {program.program_type === 'points' && (
  <div className="text-center">
    <p className="text-white/60 text-xs">I TUOI PUNTI</p>
    <p className="text-3xl font-bold text-white">47</p>
    <div className="mt-2 h-2 bg-white/30 rounded-full overflow-hidden">
      <div 
        className="h-full bg-white rounded-full" 
        style={{ width: `${Math.min((47 / stampsRequired) * 100, 100)}%` }}
      />
    </div>
    <p className="text-white/60 text-xs mt-2">
      47/{stampsRequired} punti
    </p>
    <p className="text-white/50 text-xs">
      (ogni €{eurosPerPoint} = 1 pt)
    </p>
    {rewardDescription && (
      <p className="text-white text-xs mt-1">🎁 {rewardDescription}</p>
    )}
  </div>
)}

                      {program.program_type === 'cashback' && (
  <div className="text-center">
    <p className="text-white/60 text-xs">IL TUO CREDITO</p>
    <p className="text-3xl font-bold text-white">€12.50</p>
    <p className="text-white/70 text-xs mt-1">
      +{cashbackPercent}% su ogni acquisto
    </p>
    <p className="text-white/50 text-xs mt-1">
      Min. €{minCashbackRedeem} per riscattare
    </p>
    {12.50 >= minCashbackRedeem ? (
      <div className="mt-2 bg-white/20 rounded-lg py-1.5 text-white text-xs font-medium">
        ✓ Credito disponibile!
      </div>
    ) : (
      <div className="mt-2 bg-white/10 rounded-lg py-1.5 text-white/60 text-xs">
        🔒 Ancora €{(minCashbackRedeem - 12.50).toFixed(2)}
      </div>
    )}
  </div>
)}

                      {program.program_type === 'tiers' && (
  <div className="text-center">
    <p className="text-white/60 text-xs mb-2">IL TUO LIVELLO</p>
    {tiers.length > 0 ? (
      <>
        <div className="flex justify-center items-end gap-2 mb-2">
          {tiers.slice(0, 4).map((tier, i) => (
            <div 
              key={i} 
              className={`text-center transition-all ${i === 1 ? 'scale-125 opacity-100' : 'scale-90 opacity-50'}`}
            >
              <p className="text-2xl">{tier.badge_emoji}</p>
              <p className="text-white text-xs font-medium">{tier.name}</p>
              {i === 1 && tier.discount_percent > 0 && (
                <p className="text-white/80 text-xs">-{tier.discount_percent}%</p>
              )}
            </div>
          ))}
        </div>
        {tiers[1]?.benefits && (
          <div className="bg-white/20 rounded-lg p-2 mt-2">
            <p className="text-white text-xs">
              {tiers[1].benefits}
            </p>
          </div>
        )}
        {tiers[2] && (
          <p className="text-white/50 text-xs mt-2">
            Prossimo: {tiers[2].badge_emoji} {tiers[2].name} (€{tiers[2].min_spend})
          </p>
        )}
      </>
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

                    {/* QR */}
                    <div className="bg-white rounded-xl p-3 text-center">
                      <div className="w-20 h-20 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-3xl">📱</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Scansiona</p>
                    </div>

                    {(externalRewardsUrl || rulesUrl) && (
                      <div className="flex justify-center gap-3 mt-3 text-xs text-white/70">
                        {externalRewardsUrl && <span className="underline">📋 Premi</span>}
                        {rulesUrl && <span className="underline">📜 Regolamento</span>}
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-100 py-2 text-center">
                    <p className="text-xs text-gray-400">Creato con ❤️ da <span className="font-medium">Zale Marketing</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Reward Modal */}
      {editingReward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">✏️ Modifica Premio</h2>
            <div className="space-y-3">
              <input type="text" value={editingReward.name} onChange={(e) => setEditingReward({...editingReward, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="Nome"/>
              <input type="number" value={editingReward.stamps_required} onChange={(e) => setEditingReward({...editingReward, stamps_required: parseInt(e.target.value) || 5})} className="w-full px-4 py-2 border rounded-lg" placeholder="Bollini"/>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditingReward(null)} className="flex-1 py-2 border rounded-lg">Annulla</button>
              <button onClick={updateReward} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg">Salva</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tier Modal */}
{editingTier && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl w-full max-w-md p-6">
      <h2 className="text-xl font-bold mb-4">✏️ Modifica Livello</h2>
      
      <div className="space-y-4">
        <div className="flex gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Icona</label>
            <select 
              value={editingTier.badge_emoji} 
              onChange={(e) => setEditingTier({...editingTier, badge_emoji: e.target.value})} 
              className="w-16 px-2 py-2 border rounded-lg text-2xl"
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
            <input 
              type="text" 
              value={editingTier.name} 
              onChange={(e) => setEditingTier({...editingTier, name: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📊 Spesa minima (€)</label>
            <input 
              type="number" 
              value={editingTier.min_spend} 
              onChange={(e) => setEditingTier({...editingTier, min_spend: parseInt(e.target.value) || 0})} 
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">🏷️ Sconto (%)</label>
            <input 
              type="number" 
              value={editingTier.discount_percent} 
              onChange={(e) => setEditingTier({...editingTier, discount_percent: parseInt(e.target.value) || 0})} 
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">🎁 Vantaggi</label>
          <textarea 
            value={editingTier.benefits || ''} 
            onChange={(e) => setEditingTier({...editingTier, benefits: e.target.value})} 
            className="w-full px-4 py-2 border rounded-lg" 
            rows={3}
            placeholder="Descrivi i vantaggi di questo livello..."
          />
        </div>
      </div>
      
      <div className="flex gap-3 mt-6">
        <button onClick={() => setEditingTier(null)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">
          Annulla
        </button>
        <button onClick={updateTier} className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          Salva Modifiche
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}