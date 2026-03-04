'use client'

import { usePlan } from '@/lib/hooks/usePlan'
import UpgradePrompt from '@/components/ui/UpgradePrompt'
import Link from 'next/link'
import { Eye, Settings } from 'lucide-react'

export default function OcioDashboardPage() {
  const { isBusiness, loading } = usePlan()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isBusiness) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <UpgradePrompt feature="Dashboard OCIO — Reputation Intelligence" requiredPlan="BUSINESS" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye size={24} />
            OCIO
          </h1>
          <p className="text-gray-500 text-sm mt-1">Reputation Intelligence — in configurazione</p>
        </div>
        <Link
          href="/dashboard/ocio/settings"
          className="flex items-center gap-2 px-4 py-2 border border-[#E0E0E0] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Settings size={16} />
          Impostazioni
        </Link>
      </div>

      <div className="bg-white border border-[#E8E8E8] rounded-xl p-8 text-center">
        <Eye size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Dashboard in arrivo</h2>
        <p className="text-sm text-gray-500 mb-4">
          Qui vedrai tutte le recensioni analizzate dall&apos;AI con sentiment, urgenza e risposte suggerite.
        </p>
        <Link
          href="/dashboard/ocio/settings"
          className="inline-flex items-center gap-2 bg-[#111111] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#333333] transition-colors"
        >
          <Settings size={15} />
          Configura URL Google Maps
        </Link>
      </div>
    </div>
  )
}
