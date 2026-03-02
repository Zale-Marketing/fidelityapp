interface MetricCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  valueClassName?: string
  trend?: string
}

export default function MetricCard({ label, value, icon, valueClassName, trend }: MetricCardProps) {
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      {icon && <div className="mb-3 text-[#D1D5DB]">{icon}</div>}
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold text-gray-900 mt-1 ${valueClassName || ''}`}>{value}</p>
      {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
    </div>
  )
}
