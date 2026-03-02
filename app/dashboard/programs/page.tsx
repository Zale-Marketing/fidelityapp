'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Program } from '@/lib/types'

const PROGRAM_TYPE_INFO: Record<string, { icon: string, name: string }> = {
  stamps: { icon: '🎫', name: 'Bollini' },
  points: { icon: '⭐', name: 'Punti' },
  cashback: { icon: '💰', name: 'Cashback' },
  tiers: { icon: '👑', name: 'Livelli VIP' },
  subscription: { icon: '🔄', name: 'Abbonamento' },
  missions: { icon: '🎮', name: 'Missioni' }
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<(Program & { cards_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadPrograms()
  }, [])

  async function loadPrograms() {
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

    if (!profile) {
      router.push('/register')
      return
    }

    // Carica programmi con conteggio cards
    const { data: programsData } = await supabase
      .from('programs')
      .select(`
        *,
        cards:cards(count)
      `)
      .eq('merchant_id', profile.merchant_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (programsData) {
      setPrograms(programsData.map(p => ({
        ...p,
        cards_count: p.cards?.[0]?.count || 0
      })))
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4">
        <div className="flex justify-between items-center flex-wrap gap-2 max-w-6xl mx-auto">
          <div>
            <Link href="/dashboard" className="text-indigo-600 hover:underline text-sm">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">🎯 I Tuoi Programmi</h1>
          </div>
          <Link
            href="/dashboard/programs/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700"
          >
            + Nuovo Programma
          </Link>
        </div>
      </header>

      <main className="px-4 py-6 max-w-6xl mx-auto">
        {programs.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold mb-2">Nessun programma ancora</h2>
            <p className="text-gray-500 mb-6">Crea il tuo primo programma fedeltà in pochi minuti!</p>
            <Link
              href="/dashboard/programs/new"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 font-medium"
            >
              Crea il Primo Programma →
            </Link>
          </div>
        ) : (
          // Programs Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map(program => {
              const typeInfo = PROGRAM_TYPE_INFO[program.program_type || 'stamps'] || PROGRAM_TYPE_INFO.stamps

              return (
                <Link
                  key={program.id}
                  href={`/dashboard/programs/${program.id}`}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all group"
                >
                  {/* Card Header */}
                  <div 
                    className="p-6 text-white"
                    style={{ backgroundColor: program.primary_color || '#6366f1' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {program.logo_url ? (
                          <img 
                            src={program.logo_url} 
                            alt="" 
                            className="w-12 h-12 object-contain rounded-lg bg-white/20 p-1"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-2xl">
                            {typeInfo.icon}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg group-hover:underline">{program.name}</h3>
                          <p className="text-white/70 text-sm">{typeInfo.name}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mini Preview */}
                    {program.program_type === 'stamps' && (
                      <div className="mt-4 flex justify-center gap-1">
                        {Array.from({ length: Math.min(program.stamps_required || 10, 8) }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-5 h-5 rounded-full ${i < 3 ? 'bg-white' : 'bg-white/30'}`}
                          />
                        ))}
                        {(program.stamps_required || 10) > 8 && (
                          <span className="text-white/70 text-xs ml-1">+{(program.stamps_required || 10) - 8}</span>
                        )}
                      </div>
                    )}

                    {program.program_type === 'cashback' && (
  <div className="mt-4 text-center">
    <p className="text-3xl font-bold">{(program as any).cashback_percent || 5}%</p>
    <p className="text-white/70 text-sm">cashback</p>
    <p className="text-white/50 text-xs mt-1">
      min. €{(program as any).min_cashback_redeem || 5} per riscattare
    </p>
  </div>
)}

                    {program.program_type === 'points' && (
  <div className="mt-4 text-center">
    <p className="text-2xl font-bold">⭐ Punti</p>
    <p className="text-white/70 text-sm">
      {(program as any).points_per_euro || 1}€ = 1 punto
    </p>
  </div>
)}

                    {program.program_type === 'tiers' && (
                      <div className="mt-4 flex justify-center gap-2">
                        <span>🥉</span>
                        <span>🥈</span>
                        <span>🥇</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">Card attive</p>
                      <p className="text-2xl font-bold text-gray-900">{program.cards_count}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        program.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {program.is_active ? '✓ Attivo' : 'Non attivo'}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}

            {/* Add New Card */}
            <Link
              href="/dashboard/programs/new"
              className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center min-h-[200px] hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center mb-3">
                <span className="text-3xl text-gray-400 group-hover:text-indigo-600">+</span>
              </div>
              <p className="font-medium text-gray-600 group-hover:text-indigo-600">Nuovo Programma</p>
              <p className="text-sm text-gray-400">Scegli tra 6 tipologie</p>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}