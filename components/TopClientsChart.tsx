'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import TrafficLight from './TrafficLight'
import { BP_RE, isEspecial } from './SpecialAccounts'

const fm = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const SKIP_RE = /^(TOTAL|OTROS CLIENTES|SUBTOTAL|SUMA|GRAND TOTAL)/i

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

// ── Semáforos ─────────────────────────────────────────────────────────────
interface SemaforosProps {
  byClient:      Record<string, number>
  projections:   Record<string, number>
  especialesNorm: Set<string>
}

function SemaforosSection({ byClient, projections, especialesNorm }: SemaforosProps) {
  const hayProy = Object.keys(projections).length > 0

  // Mapa normalizado de proyecciones privadas (excluye BP y especiales)
  const projPriv: Record<string, { label: string; meta: number }> = {}
  for (const [k, v] of Object.entries(projections)) {
    const kt = k.trim()
    if (SKIP_RE.test(kt) || BP_RE.test(kt)) continue
    const kn = normalize(kt)
    const esEsp = Array.from(especialesNorm).some(en => en.includes(kn) || kn.includes(en))
    if (esEsp) continue
    projPriv[kn] = { label: kt, meta: v }
  }

  // Clientes privados reales (excluyendo especiales)
  const cliPriv: Record<string, number> = {}
  for (const [c, v] of Object.entries(byClient)) {
    const cn = normalize(c)
    const esEsp = Array.from(especialesNorm).some(en => en.includes(cn) || cn.includes(en))
    if (!esEsp) cliPriv[c] = v
  }

  // Unión: clientes reales + clientes en proyección (clave normalizada)
  const visto = new Set<string>()
  const items: { label: string; real: number; meta: number }[] = []

  // 1. Primero los que están en proyecciones (tienen meta)
  for (const [kn, pEntry] of Object.entries(projPriv)) {
    if (visto.has(kn)) continue
    visto.add(kn)
    const realKey = Object.keys(cliPriv).find(c => {
      const cn = normalize(c)
      return cn === kn || cn.includes(kn) || kn.includes(cn)
    })
    items.push({ label: pEntry.label, real: cliPriv[realKey ?? ''] ?? 0, meta: pEntry.meta })
  }

  // 2. Luego los clientes reales sin proyección
  for (const [c, v] of Object.entries(cliPriv)) {
    const cn = normalize(c)
    if (visto.has(cn)) continue
    // verificar que no haya sido ya cubierto por una clave similar
    const yaCubierto = Array.from(visto).some(kv => cn.includes(kv) || kv.includes(cn))
    if (yaCubierto) continue
    visto.add(cn)
    items.push({ label: c, real: v, meta: 0 })
  }

  // Ordenar: con meta primero (desc meta), luego sin meta (desc ventas)
  items.sort((a, b) => {
    if (a.meta > 0 && b.meta > 0) return b.meta - a.meta
    if (a.meta > 0) return -1
    if (b.meta > 0) return 1
    return b.real - a.real
  })

  return (
    <div className="mt-4">
      <p className="text-[0.65rem] font-bold text-text-soft uppercase tracking-widest mb-2">
        🚦 Semáforos de cumplimiento
      </p>
      {!hayProy && items.length > 0 && (
        <p className="text-[0.65rem] text-amber-600 bg-amber-50 rounded px-2 py-1 mb-2">
          ⚠️ Sin proyección cargada — mostrando ventas reales (meta $0)
        </p>
      )}
      {items.length === 0 && (
        <p className="text-xs text-text-soft italic">Sin clientes privados</p>
      )}
      {items.map(({ label, real, meta }) => (
        <TrafficLight key={label} label={label} real={real} meta={meta} />
      ))}
    </div>
  )
}

export default function TopClientsChart({ data, projections }: Props) {
  // Filtrar privados (excluir BP + públicos + relacionados)
  const privados = data.filter(r =>
    !isEspecial(String(r.cliente ?? ''), String(r.tipo ?? ''))
  )

  // Nombres normalizados de cuentas especiales (para filtrar semáforos)
  const especialesNorm = new Set(
    data
      .filter(r => isEspecial(String(r.cliente ?? ''), String(r.tipo ?? '')))
      .map(r => normalize(String(r.cliente ?? '')))
  )

  const byClient: Record<string, number> = {}
  for (const r of privados) {
    const c = String(r.cliente ?? '')
    byClient[c] = (byClient[c] ?? 0) + Number(r.total_venta_real ?? 0)
  }

  const total = Object.values(byClient).reduce((a, b) => a + b, 0)
  // Recharts layout="vertical" renderiza data[0] ARRIBA → ordenar ascendente para que el mayor quede abajo visualmente
  // PERO el usuario quiere mayor arriba → ordenar DESCENDENTE sin reverse
  const top10 = Object.entries(byClient)
    .sort(([, a], [, b]) => b - a)   // mayor primero → data[0] = SETEL → aparece ARRIBA
    .slice(0, 10)
    .map(([Cliente, Ventas]) => ({ Cliente, Ventas, pct: total > 0 ? Ventas / total * 100 : 0 }))

  if (!top10.length) return <div className="flex items-center justify-center h-40 text-text-soft text-sm">Sin datos</div>

  return (
    <div>
      <ResponsiveContainer width="100%" height={Math.max(280, top10.length * 36)}>
        <BarChart data={top10} layout="vertical" margin={{ top: 4, right: 60, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2C2926" horizontal={false} />
          <XAxis type="number" tickFormatter={v => `$${(v/1e6).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#A8A29E' }} />
          <YAxis type="category" dataKey="Cliente" tick={{ fontSize: 10, fill: '#F2F0EE' }} width={120} />
          <Tooltip formatter={(v: number) => fm(v)} contentStyle={{ borderRadius: 8, border: '1px solid #2C2926', background: '#1C1917', color: '#F2F0EE', fontSize: 12 }} />
          <Bar dataKey="Ventas" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: number) => fm(v), fontSize: 10, fill: '#F2F0EE' }}>
            {top10.map((entry, i) => <Cell key={i} fill={barColor(entry.pct)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Semáforos */}
      <SemaforosSection byClient={byClient} projections={projections} especialesNorm={especialesNorm} />
    </div>
  )
}
