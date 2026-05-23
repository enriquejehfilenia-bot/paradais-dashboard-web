'use client'
import TrafficLight from './TrafficLight'

const TIPOS_EXCL = new Set(['PÚBLICO','PUBLICO','RELACIONADO','RELACIONADOS','PUBLIC'])
const BP_RE      = /BANCO.*PAC[IÍ]FICO|PAC[IÍ]FICO.*BANCO/i

const fm = (n: number) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function normalize(s: string) {
  return s.toUpperCase().replace(/[ÍÁÉÓÚÜ]/g, c => ({'Í':'I','Á':'A','É':'E','Ó':'O','Ú':'U','Ü':'U'}[c]??c))
}

interface Props {
  data:        Record<string, unknown>[]
  projections: Record<string, number>
}

export default function SpecialAccounts({ data, projections }: Props) {
  // Filtrar cuentas especiales: BP + Público + Relacionado
  const especiales = data.filter(r => {
    const cli  = String(r.cliente ?? '')
    const tipo = normalize(String(r.tipo ?? ''))
    return BP_RE.test(cli) || TIPOS_EXCL.has(tipo)
  })

  const byClient: Record<string, { ventas: number; costos: number }> = {}
  for (const r of especiales) {
    const c = String(r.cliente ?? '')
    if (!byClient[c]) byClient[c] = { ventas: 0, costos: 0 }
    byClient[c].ventas += Number(r.total_venta_real ?? 0)
    byClient[c].costos += Number(r.costos           ?? 0)
  }

  const sorted = Object.entries(byClient).sort(([, a], [, b]) => b.ventas - a.ventas)

  if (!sorted.length) return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-card">
      <p className="text-xs font-bold text-text-soft uppercase tracking-widest mb-3">⭐ Cuentas Especiales</p>
      <p className="text-sm text-text-soft italic">Sin datos de cuentas especiales</p>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-card">
      <p className="text-xs font-bold text-text-soft uppercase tracking-widest mb-3">⭐ Cuentas Especiales</p>
      <p className="text-[0.65rem] font-bold text-text-soft uppercase tracking-widest mb-3">
        Semáforos de cumplimiento
      </p>
      {sorted.map(([cliente, { ventas }]) => {
        const cn  = normalize(cliente)
        const key = Object.keys(projections).find(k => {
          const kn = normalize(k)
          return kn.includes(cn) || cn.includes(kn)
        })

        if (key) {
          return <TrafficLight key={cliente} label={cliente} real={ventas} meta={projections[key]} />
        }

        return (
          <div key={cliente} className="border-l-4 border-l-[#475569] bg-stone-50 rounded-r-lg px-3 py-2 mb-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-main">— {cliente}</span>
              <span className="text-xs text-text-soft italic">sin proyección</span>
            </div>
            <p className="text-xs text-text-soft mt-0.5">
              Real: <strong className="text-text-main">{fm(ventas)}</strong>
            </p>
          </div>
        )
      })}
    </div>
  )
}
