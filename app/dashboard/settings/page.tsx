'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, Zap } from 'lucide-react'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [merchant, setMerchant] = useState<any>(null)
  const [businessName, setBusinessName] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setFullName(profileData.full_name || '')

        const { data: merchantData } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', profileData.merchant_id)
          .single()

        if (merchantData) {
          setMerchant(merchantData)
          setBusinessName(merchantData.name)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')

    const { error: merchantError } = await supabase
      .from('merchants')
      .update({ name: businessName })
      .eq('id', merchant?.id)

    if (merchantError) {
      setMessage('Errore nel salvare il nome attività')
      setSaving(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile?.id)

    if (profileError) {
      setMessage('Errore nel salvare il nome')
      setSaving(false)
      return
    }

    setMessage('Salvato!')
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="px-6 py-6 max-w-2xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Impostazioni</h1>
        <p className="text-sm text-gray-500 mt-1">Gestisci il tuo account e la tua attività</p>
      </div>

      {/* Info Account */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Informazioni Account</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome Attività
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Il tuo Nome
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm focus:border-[#111111] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">L'email non può essere modificata</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ruolo
            </label>
            <input
              type="text"
              value={profile?.role === 'OWNER' ? 'Proprietario' : 'Staff'}
              disabled
              className="w-full px-3 py-3 border border-[#E0E0E0] rounded-[8px] text-sm bg-gray-50 text-gray-500"
            />
          </div>

          {message && (
            <p className={`text-sm font-medium ${message.includes('Errore') ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
              {message}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#111111] text-white py-3 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </div>

      {/* Piano */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Piano</h2>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {merchant?.plan === 'PRO' ? 'PRO' : 'FREE'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {merchant?.plan === 'PRO' ? 'Programmi illimitati' : 'Fino a 5 programmi'}
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="border border-[#E0E0E0] text-gray-700 px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#F5F5F5] transition-colors"
          >
            Gestisci Piano
          </Link>
        </div>
      </div>

      {/* Integrazioni */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Integrazioni</h2>
        <div className="space-y-3">
          <Link
            href="/dashboard/settings/whatsapp"
            className="flex items-center justify-between p-4 border border-[#E8E8E8] rounded-[8px] hover:bg-[#F9F9F9] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[8px] bg-green-50 flex items-center justify-center">
                <MessageCircle size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">WhatsApp Marketing</p>
                <p className="text-xs text-gray-500">Connetti il tuo numero e invia messaggi</p>
              </div>
            </div>
            <span className="text-gray-400 text-sm">›</span>
          </Link>

          <Link
            href="/dashboard/settings/webhooks"
            className="flex items-center justify-between p-4 border border-[#E8E8E8] rounded-[8px] hover:bg-[#F9F9F9] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[8px] bg-indigo-50 flex items-center justify-center">
                <Zap size={18} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Webhook</p>
                <p className="text-xs text-gray-500">Ricevi eventi in tempo reale nel tuo sistema</p>
              </div>
            </div>
            <span className="text-gray-400 text-sm">›</span>
          </Link>
        </div>
      </div>

      {/* Sessione */}
      <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Sessione</h2>
        <button
          onClick={handleLogout}
          className="w-full border border-[#FEE2E2] text-[#DC2626] py-3 rounded-[8px] text-sm font-semibold hover:bg-[#FEE2E2]/50 transition-colors"
        >
          Esci dall'account
        </button>
      </div>
    </div>
  )
}
