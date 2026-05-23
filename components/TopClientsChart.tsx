'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import TrafficLight from './TrafficLight'

const fm = (n: number) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const TIPOS_EXCL = new Set(['PÚBLICO','PUBLICO','RELACIONADO','RELACIONADOS','PUBLIC'])
const BP_RE      = /BANCO.*PAC[IÍ]FICO|PAC[IÍ]FICO.*BANCO/i

interface Props {
  data:        Record<string, unknown>[]
  projections: Record<string, number>
}

function barColor(pct: number) {
  if (pct >= 15) return '#10B981'
  if (pct >= 8)  return '#F59E0B'
  return '#DC2626'
}

function normalize(s: string) { return s.toUpperCase().replace(/[ÍÁÉÓÚÜ]/g, c => ({'Í':'I','Á':'A','É':'E','Ó':'O','Ú':'U','Ü':'U'}[c]??c)) }

export default function TopClientsChart({ data, projections }: Props) {
  // Filtrar privados (excluir BP + públicos + relacionados)
  const privados = data.filter(r => {
    const cli  = String(r.cliente ?? '')
    const tipo = normalize(String(r.tipo ?? ''))
    return !BP_RE.test(cli) && !TIPOS_EXCL.has(tipo)
  })

  const byClient: Record<string, number> = {}
  for (const r of privados) {
    const c = String(r.cliente ?? '')
    byClient[c] = (byClient[c] ?? 0) + Number(r.total_venta_real ?? 0)
  }

  const total = Object.values(byClient).reduce((a, b) => a + b, 0)
  const top10 = Object.entries(byClient)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([Cliente, Ventas]) => ({ Cliente, Ventas, pct: total > 0 ? Ventas / total * 100 : 0 }))
    .reverse() // Recharts invierte barras horizontales

  if (!top10.length) return <div className="flex items-center justify-center h-40 text-text-soft text-sm">Sin datos</div>

  return (
    <div>
      <ResponsiveContainer width="100%" height={Math.max(280, top10.length * 36)}>
        <BarChart data={top10} layout="vertical" margin={{ top: 4, right: 60, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" horizontal={false} />
          <XAxis type="number" tickFormatter={v => `$${(v/1e6).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#78716C' }} />
          <YAxis type="category" dataKey="Cliente" tick={{ fontSize: 10, fill: '#1C1917' }} width={120} />
          <Tooltip formatter={(v: number) => fm(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }} />
          <Bar dataKey="Ventas" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: number) => fm(v), fontSize: 10, fill: '#1C1917' }}>
            {top10.map((entry, i) => <Cell key={i} fill={barColor(entry.pct)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Semáforos */}
      <div className="mt-4">
        <p className="text-[0.65rem] font-bold text-text-soft uppercase tracking-widest mb-2">
          🚦 Semáforos de cumplimiento
        </p>
        {top10.slice().reverse().map(({ Cliente, Ventas }) => {
          const key = Object.keys(projections).find(k => {
            const kn = normalize(k), cn = normalize(Cliente)
            return kn.includes(cn) || cn.includes(kn)
          })
          if (!key) return null
          return <TrafficLight key={Cliente} label={Cliente} real={Ventas} meta={projections[key]} />
        })}
        {!Object.keys(projections).length && (
          <p className="text-xs text-text-soft italic">Sin datos de proyección — carga un Excel con pestaña PROYECCION</p>
        )}
      </div>
    </div>
  )
}
