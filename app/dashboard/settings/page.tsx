'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

    // Aggiorna merchant
    const { error: merchantError } = await supabase
      .from('merchants')
      .update({ name: businessName })
      .eq('id', merchant?.id)

    if (merchantError) {
      setMessage('Errore nel salvare il nome attività')
      setSaving(false)
      return
    }

    // Aggiorna profilo
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile?.id)

    if (profileError) {
      setMessage('Errore nel salvare il nome')
      setSaving(false)
      return
    }

    setMessage('✅ Salvato!')
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Impostazioni</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Info Account */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Informazioni Account</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Attività
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Il tuo Nome
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">L'email non può essere modificata</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ruolo
              </label>
              <input
                type="text"
                value={profile?.role === 'OWNER' ? 'Proprietario' : 'Staff'}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            {message && (
              <p className={`text-sm ${message.includes('Errore') ? 'text-red-500' : 'text-green-500'}`}>
                {message}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        </div>

        {/* Piano */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Piano</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold">
                {merchant?.plan === 'PRO' ? '🚀 PRO' : 'FREE'}
              </p>
              <p className="text-gray-500 text-sm">
                {merchant?.plan === 'PRO' ? 'Programmi illimitati' : 'Fino a 5 programmi'}
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
            >
              Gestisci Piano
            </Link>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Sessione</h2>
          <button
            onClick={handleLogout}
            className="w-full bg-red-50 text-red-600 py-2 rounded-lg font-semibold hover:bg-red-100"
          >
            Esci dall'account
          </button>
        </div>
      </main>
    </div>
  )
}