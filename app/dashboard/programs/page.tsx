'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Program } from '@/lib/types'
import EmptyState from '@/components/ui/EmptyState'
import { Target, Plus, Stamp, Star, Coins, Crown, RefreshCw, ExternalLink, Pencil, Trash2 } from 'lucide-react'

const PROGRAM_TYPE_INFO: Record<string, { Icon: any, name: string }> = {
  stamps: { Icon: Stamp, name: 'Bollini' },
  points: { Icon: Star, name: 'Punti' },
  cashback: { Icon: Coins, name: 'Cashback' },
  tiers: { Icon: Crown, name: 'Livelli VIP' },
  subscription: { Icon: RefreshCw, name: 'Abbonamento' },
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<(Program & { cards_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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

    const { data: programsData } = await supabase
      .from('programs')
      .select('*')
      .eq('merchant_id', profile.merchant_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (programsData && programsData.length > 0) {
      const programIds = programsData.map(p => p.id)
      const { data: cardRows } = await supabase
        .from('cards')
        .select('program_id')
        .in('program_id', programIds)
        .is('deleted_at', null)

      const countMap = new Map<string, number>()
      for (const c of cardRows || []) {
        if (c.program_id) countMap.set(c.program_id, (countMap.get(c.program_id) || 0) + 1)
      }

      setPrograms(programsData.map(p => ({ ...p, cards_count: countMap.get(p.id) || 0 })))
    } else if (programsData) {
      setPrograms([])
    }

    setLoading(false)
  }

  async function handleSoftDelete(program: Program & { cards_count: number }) {
    if (!confirm(`Archiviare il programma "${program.name}"? Potrà essere eliminato definitivamente dalla scheda programma.`)) return
    setDeletingId(program.id)
    await supabase
      .from('programs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', program.id)
    setPrograms(prev => prev.filter(p => p.id !== program.id))
    setDeletingId(null)
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="px-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Programmi</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci le tue carte fedeltà</p>
        </div>
        <Link
          href="/dashboard/programs/new"
          className="bg-[#111111] text-white px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Nuovo Programma
        </Link>
      </div>

      {programs.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nessun programma ancora"
          description="Crea il tuo primo programma fedeltà in pochi minuti!"
          actionLabel="Crea il Primo Programma"
          actionHref="/dashboard/programs/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(program => {
            const typeInfo = PROGRAM_TYPE_INFO[program.program_type || 'stamps'] || PROGRAM_TYPE_INFO.stamps
            const initial = program.name.charAt(0).toUpperCase()
            const color = program.primary_color || '#111111'
            const isActive = program.is_active !== false

            return (
              <div
                key={program.id}
                className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Top row: logo + name + status */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3 min-w-0">
                    {program.logo_url ? (
                      <img
                        src={program.logo_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                        style={{ backgroundColor: color }}
                      >
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm leading-tight truncate">{program.name}</p>
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                        {typeInfo.name}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                      isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isActive ? 'Attivo' : 'Archiviato'}
                  </span>
                </div>

                {/* Main stat */}
                <div className="flex-1 mb-5">
                  <p className="text-xs text-gray-500 mb-1">Carte attive</p>
                  <p className="text-3xl font-bold text-gray-900">{program.cards_count}</p>
                </div>

                {/* Footer: date + actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[#F0F0F0]">
                  <p className="text-xs text-gray-400">{formatDate(program.created_at)}</p>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/dashboard/programs/${program.id}`}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-[6px] transition-colors"
                      title="Apri"
                    >
                      <ExternalLink size={15} />
                    </Link>
                    <Link
                      href={`/dashboard/programs/${program.id}/edit`}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-[6px] transition-colors"
                      title="Modifica"
                    >
                      <Pencil size={15} />
                    </Link>
                    <button
                      onClick={() => handleSoftDelete(program)}
                      disabled={deletingId === program.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-[6px] transition-colors disabled:opacity-40"
                      title="Elimina"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add New */}
          <Link
            href="/dashboard/programs/new"
            className="bg-white border-2 border-dashed border-[#E0E0E0] rounded-[12px] p-6 flex flex-col items-center justify-center min-h-[180px] hover:border-gray-400 hover:bg-gray-50/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center mb-3 transition-colors">
              <Plus size={22} className="text-gray-400 group-hover:text-gray-600" />
            </div>
            <p className="font-medium text-sm text-gray-600 group-hover:text-gray-900">Nuovo Programma</p>
            <p className="text-xs text-gray-400 mt-1">Scegli tra 5 tipologie</p>
          </Link>
        </div>
      )}
    </div>
  )
}
