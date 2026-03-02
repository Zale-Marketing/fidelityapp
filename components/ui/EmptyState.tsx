import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <Icon size={48} className="text-[#D1D5DB] mb-4" strokeWidth={1.5} />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-6 bg-[#111111] text-white px-5 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          onClick={onAction}
          className="mt-6 bg-[#111111] text-white px-5 py-2.5 rounded-[8px] text-sm font-medium hover:bg-[#333333] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
