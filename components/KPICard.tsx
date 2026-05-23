interface Props {
  label:     string
  value:     string
  badge?:    string
  badgeType?: 'green' | 'amber' | 'red' | 'neutral'
}

const badgeStyles = {
  green:   'bg-green-100 text-green-800',
  amber:   'bg-yellow-100 text-yellow-800',
  red:     'bg-red-100 text-red-800',
  neutral: 'bg-stone-100 text-stone-600',
}

export default function KPICard({ label, value, badge, badgeType = 'neutral' }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-card relative overflow-hidden">
      {/* Borde dorado superior */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-accent rounded-t-2xl" />
      <p className="text-[0.65rem] font-bold text-text-soft uppercase tracking-[0.1em] mb-2">
        {label}
      </p>
      <p className="text-[1.75rem] font-bold font-serif text-text-main leading-none mb-2">
        {value}
      </p>
      {badge && (
        <span className={`inline-block text-[0.65rem] font-bold px-2 py-0.5 rounded-full ${badgeStyles[badgeType]}`}>
          {badge}
        </span>
      )}
    </div>
  )
}
