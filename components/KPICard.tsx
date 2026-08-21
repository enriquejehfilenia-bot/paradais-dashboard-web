import { useEffect, useRef, useState } from 'react'

interface Props {
  label:      string
  value:      number
  format:     (n: number) => string
  badge?:     string
  badgeType?: 'green' | 'amber' | 'red' | 'neutral'
  index?:     number
}

const badgeStyles = {
  green:   'bg-green-900/40 text-green-400 border border-green-800',
  amber:   'bg-amber-900/40 text-amber-400 border border-amber-800',
  red:     'bg-red-900/40   text-red-400   border border-red-800',
  neutral: 'bg-surface      text-text-soft border border-border',
}

// Cuenta ascendente suave hacia `target` cada vez que cambia (ej. al filtrar).
function useCountUp(target: number, duration = 400) {
  const [display, setDisplay] = useState(target)
  const prevRef = useRef(target)
  useEffect(() => {
    const from = prevRef.current
    const to = target
    if (from === to) return
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(step)
      else prevRef.current = to
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return display
}

export default function KPICard({ label, value, format, badge, badgeType = 'neutral', index = 0 }: Props) {
  const shown = useCountUp(value)
  return (
    <div
      className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden animate-fade-up
        transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)]
        hover:-translate-y-0.5 hover:bg-[#211E1B]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Línea accent superior */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-accent rounded-t-2xl" />
      <p className="text-xs font-semibold text-text-soft mb-2">{label}</p>
      <p className="text-[1.75rem] font-bold font-serif text-text-main leading-none mb-2 tabular-nums">
        {format(shown)}
      </p>
      {badge && (
        <span className={`inline-block text-[0.65rem] font-bold px-2 py-0.5 rounded-full ${badgeStyles[badgeType]}`}>
          {badge}
        </span>
      )}
    </div>
  )
}
