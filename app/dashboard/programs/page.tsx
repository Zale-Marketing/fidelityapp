'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Program, Merchant } from '@/lib/types'

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
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
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', profile.merchant_id)
          .single()

        if (merchantData) {
          setMerchant(merchantData)
        }

        const { data: programsData } = await supabase
          .from('programs')
          .select('*')
          .eq('merchant_id', profile.merchant_id)
          .order('created_at', { ascending: false })

        if (programsData) {
          setPrograms(programsData)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const canCreateMore = merchant?.plan === 'PRO' || programs.length < 5

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
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Programmi Fidelity</h1>
          </div>
          {canCreateMore ? (
            <Link
              href="/dashboard/programs/new"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              + Nuovo Programma
            </Link>
          ) : (
            <div className="text-right">
              <p className="text-red-600 font-semibold">Limite raggiunto (5)</p>
              <Link href="/billing" className="text-indigo-600 text-sm hover:underline">
                Passa a PRO →
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {programs.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Nessun programma ancora
            </h2>
            <p className="text-gray-500 mb-6">
              Crea il tuo primo programma fidelity per iniziare
            </p>
            <Link
              href="/dashboard/programs/new"
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 inline-block"
            >
              Crea Programma
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <Link
                key={program.id}
                href={`/dashboard/programs/${program.id}`}
                className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden"
              >
                <div 
                  className="h-4"
                  style={{ backgroundColor: program.primary_color }}
                />
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {program.name}
                  </h2>
                  <p className="text-gray-500 mb-4">{program.reward_text}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">
                      {program.stamps_required} timbri
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      program.status === 'active' 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {program.status === 'active' ? 'Attivo' : 'Bloccato'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-gray-500">
          {programs.length}/5 programmi usati (Piano {merchant?.plan})
        </div>
      </main>
    </div>
  )
}