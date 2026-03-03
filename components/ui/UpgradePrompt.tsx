import Link from 'next/link'
import { Lock } from 'lucide-react'

interface UpgradePromptProps {
  feature: string
  requiredPlan?: 'PRO' | 'BUSINESS'
}

export default function UpgradePrompt({ feature, requiredPlan = 'PRO' }: UpgradePromptProps) {
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="w-12 h-12 bg-[#FEF3C7] rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock size={20} className="text-yellow-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Funzionalita {requiredPlan}
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        {feature} e disponibile nel piano {requiredPlan}. Aggiorna per sbloccarla.
      </p>
      <Link
        href="/dashboard/upgrade"
        className="inline-block bg-[#111111] text-white px-6 py-3 rounded-[8px] font-semibold text-sm hover:bg-[#333333] transition-colors"
      >
        Vedi Piani e Prezzi
      </Link>
    </div>
  )
}
