'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewProgramPage() {
  const [name, setName] = useState('')
  const [stampsRequired, setStampsRequired] = useState(10)
  const [rewardText, setRewardText] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [merchantId, setMerchantId] = useState<string | null>(null)
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
      }
    }

    checkAuth()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!merchantId) {
      setError('Errore: merchant non trovato')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('programs')
      .insert({
        merchant_id: merchantId,
        name,
        stamps_required: stampsRequired,
        reward_text: rewardText,
        primary_color: primaryColor,
      })

    if (insertError) {
      setError('Errore nella creazione del programma')
      setLoading(false)
      return
    }

    router.push('/dashboard/programs')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/programs" className="text-indigo-600 hover:text-indigo-700">
              ← Programmi
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Nuovo Programma</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Programma *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Es: Caffè Gratis"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timbri Necessari *
              </label>
              <input
                type="number"
                value={stampsRequired}
                onChange={(e) => setStampsRequired(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                min={1}
                max={50}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Quanti timbri servono per il premio
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Premio *
              </label>
              <input
                type="text"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Es: 1 Caffè Omaggio"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Colore Tema
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 rounded cursor-pointer"
                />
                <span className="text-gray-500">{primaryColor}</span>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anteprima Card
              </label>
              <div 
                className="rounded-xl p-6 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <h3 className="font-bold text-lg">{name || 'Nome Programma'}</h3>
                <p className="text-white/80 text-sm mt-1">
                  {rewardText || 'Premio'}
                </p>
                <div className="flex mt-4 space-x-2">
                  {[...Array(Math.min(stampsRequired, 10))].map((_, i) => (
                    <div 
                      key={i}
                      className="w-6 h-6 rounded-full bg-white/30"
                    />
                  ))}
                  {stampsRequired > 10 && (
                    <span className="text-white/70 text-sm">+{stampsRequired - 10}</span>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Creazione...' : 'Crea Programma'}
              </button>
              <Link
                href="/dashboard/programs"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annulla
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}