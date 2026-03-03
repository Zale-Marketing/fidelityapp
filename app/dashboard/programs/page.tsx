'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Program } from '@/lib/types'
import EmptyState from '@/components/ui/EmptyState'
import StatusBadge from '@/components/ui/StatusBadge'
import { Target, Plus, Stamp, Star, Coins, Crown, RefreshCw } from 'lucide-react'

const PROGRAM_TYPE_ICONS: Record<string, { Icon: any, name: string }> = {
  stamps: { Icon: Stamp, name: 'Bollini' },
  points: { Icon: Star, name: 'Punti' },
  cashback: { Icon: Coins, name: 'Cashback' },
  tiers: { Icon: Crown, name: 'Livelli VIP' },
  subscription: { Icon: RefreshCw, name: 'Abbonamento' },
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map(program => {
            const typeInfo = PROGRAM_TYPE_ICONS[program.program_type || 'stamps'] || PROGRAM_TYPE_ICONS.stamps
            const TypeIcon = typeInfo.Icon

            return (
              <Link
                key={program.id}
                href={`/dashboard/programs/${program.id}`}
                className="bg-white border border-[#E8E8E8] rounded-[12px] overflow-hidden hover:shadow-md transition-all group"
              >
                {/* Card Header */}
                <div
                  className="p-6 text-white"
                  style={{ backgroundColor: program.primary_color || '#111111' }}
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
                        <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                          <TypeIcon size={24} className="text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-base group-hover:underline">{program.name}</h3>
                        <div className="flex items-center gap-1 text-white/70 text-sm mt-0.5">
                          <TypeIcon size={12} />
                          <span>{typeInfo.name}</span>
                        </div>
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
                        min. {(program as any).min_cashback_redeem || 5} per riscattare
                      </p>
                    </div>
                  )}

                  {program.program_type === 'points' && (
                    <div className="mt-4 text-center">
                      <p className="text-2xl font-bold">Punti</p>
                      <p className="text-white/70 text-sm">
                        {(program as any).points_per_euro || 1} = 1 punto
                      </p>
                    </div>
                  )}

                  {program.program_type === 'tiers' && (
                    <div className="mt-4 flex justify-center gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 rounded-full bg-amber-700/80" />
                        <span className="text-white/60 text-xs">Bronze</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 rounded-full bg-gray-300/80" />
                        <span className="text-white/60 text-xs">Silver</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 rounded-full bg-yellow-400/80" />
                        <span className="text-white/60 text-xs">Gold</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="p-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">Card attive</p>
                    <p className="text-2xl font-bold text-gray-900">{program.cards_count}</p>
                  </div>
                  <StatusBadge variant={program.is_active !== false ? 'active' : 'inactive'} />
                </div>
              </Link>
            )
          })}

          {/* Add New Card */}
          <Link
            href="/dashboard/programs/new"
            className="bg-white border-2 border-dashed border-[#E0E0E0] rounded-[12px] p-6 flex flex-col items-center justify-center min-h-[200px] hover:border-gray-400 hover:bg-gray-50/50 transition-all group"
          >
            <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center mb-3 transition-colors">
              <Plus size={24} className="text-gray-400 group-hover:text-gray-600" />
            </div>
            <p className="font-medium text-sm text-gray-600 group-hover:text-gray-900">Nuovo Programma</p>
            <p className="text-xs text-gray-400 mt-1">Scegli tra 5 tipologie</p>
          </Link>
        </div>
      )}
    </div>
  )
}
