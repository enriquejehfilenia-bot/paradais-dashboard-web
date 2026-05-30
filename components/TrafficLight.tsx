const fm = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

interface Props {
  label: string
  real:  number
  meta:  number
}

export default function TrafficLight({ label, real, meta }: Props) {
  const pct = meta > 0 ? (real / meta) * 100 : 0
  let css: string, icon: string
  if (pct >= 100)      { css = 'border-l-green  bg-green-50';  icon = '✅' }
  else if (pct >= 85)  { css = 'border-l-amber  bg-yellow-50'; icon = '⚠️' }
  else                 { css = 'border-l-red    bg-red-50';    icon = '🔴' }

  return (
    <div className={`border-l-4 rounded-r-lg px-3 py-2 mb-2 text-sm ${css}`}>
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="font-semibold text-text-main">{icon} {label}</span>
        <span className="text-xs font-bold text-text-soft">{pct.toFixed(1)}%</span>
      </div>
      <div className="text-xs text-text-soft mt-0.5">
        Real: <strong className="text-text-main">{fm(real)}</strong>
        {' · '}Meta: {fm(meta)}
      </div>
    </div>
  )
}
