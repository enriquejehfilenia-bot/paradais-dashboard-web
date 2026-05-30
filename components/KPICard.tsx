interface Props {
  label:      string
  value:      string
  badge?:     string
  badgeType?: 'green' | 'amber' | 'red' | 'neutral'
}

const badgeStyles = {
  green:   'bg-green-900/40 text-green-400 border border-green-800',
  amber:   'bg-amber-900/40 text-amber-400 border border-amber-800',
  red:     'bg-red-900/40   text-red-400   border border-red-800',
  neutral: 'bg-surface      text-text-soft border border-border',
}

export default function KPICard({ label, value, badge, badgeType = 'neutral' }: Props) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden">
      {/* Línea accent superior */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-accent rounded-t-2xl" />
      <p className="text-xs font-semibold text-text-soft mb-2">{label}</p>
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
