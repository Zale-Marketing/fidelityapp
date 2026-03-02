type BadgeVariant = 'active' | 'inactive' | 'expired' | 'pending'

const BADGE_STYLES: Record<BadgeVariant, string> = {
  active: 'bg-[#DCFCE7] text-[#16A34A]',
  inactive: 'bg-gray-100 text-gray-500',
  expired: 'bg-[#FEE2E2] text-[#DC2626]',
  pending: 'bg-yellow-100 text-yellow-700',
}

const BADGE_LABELS: Record<BadgeVariant, string> = {
  active: 'Attivo',
  inactive: 'Inattivo',
  expired: 'Scaduto',
  pending: 'In attesa',
}

export default function StatusBadge({ variant, label }: { variant: BadgeVariant; label?: string }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${BADGE_STYLES[variant]}`}>
      {label || BADGE_LABELS[variant]}
    </span>
  )
}
