'use client'
import { useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import KPICard         from './KPICard'
import FilterBar, { Filters } from './FilterBar'
import TrendChart      from './TrendChart'
import DonutChart      from './DonutChart'
import TopClientsChart from './TopClientsChart'
import SpecialAccounts from './SpecialAccounts'

const fm = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fp = (n: number) => `${n.toFixed(1)}%`

interface Props {
  data:         Record<string, unknown>[]
  projections:  Record<string, number>
  onLogout:    () => void
  filename?:   string
  updatedAt?:   string
  // Pre-computed totals from server (exact, no float accumulation)
  totalVentas?: number | null
  totalCostos?: number | null
  totalMargen?: number | null
}

function inDateRange(row: Record<string, unknown>, desde: string, hasta: string): boolean {
  if (!desde && !hasta) return true
  const raw = String(row.fecha ?? '')
  if (!raw || raw === 'null') return true
  try {
    const d   = new Date(raw)
    const dsd = desde ? new Date(desde) : null
    const hst = hasta ? new Date(hasta) : null
    if (dsd && d < dsd) return false
    if (hst && d > hst) return false
    return true
  } catch { return true }
}

export default function Dashboard({
  data, projections, onLogout, filename, updatedAt,
  totalVentas, totalCostos, totalMargen,
}: Props) {
  const [filters, setFilters] = useState<Filters>({
    empresa: [], tipo: [], ciudad: [], depto: [], clientes: [], desde: '', hasta: '',
  })

  const filtered = useMemo(() => {
    return data.filter(row => {
      if (filters.empresa.length  > 0 && !filters.empresa.includes(String(row.empresa              ?? ''))) return false
      if (filters.tipo.length     > 0 && !filters.tipo.includes(String(row.tipo                    ?? ''))) return false
      if (filters.ciudad.length   > 0 && !filters.ciudad.includes(String(row.ciudad               ?? ''))) return false
      if (filters.depto.length    > 0 && !filters.depto.includes(String(row.departamento_limpio   ?? ''))) return false
      if (filters.clientes.length > 0 && !filters.clientes.includes(String(row.cliente            ?? ''))) return false
      if (!inDateRange(row, filters.desde, filters.hasta))                                                  return false
      return true
    })
  }, [data, filters])

  // Si no hay filtros activos y el servidor envió totales pre-calculados, úsalos
  // (evita el error de acumulación de punto flotante en 2.600+ filas)
  const noFilters = useMemo(() =>
    filters.empresa.length  === 0 && filters.tipo.length  === 0 &&
    filters.ciudad.length   === 0 && filters.depto.length === 0 &&
    filters.clientes.length === 0 && !filters.desde && !filters.hasta,
  [filters])

  const ventasSum = useMemo(() => filtered.reduce((s, r) => s + Number(r.total_venta_real ?? 0), 0), [filtered])
  const costosSum = useMemo(() => filtered.reduce((s, r) => s + Number(r.costos          ?? 0), 0), [filtered])

  const ventas = noFilters && totalVentas != null ? totalVentas : ventasSum
  const costos = noFilters && totalCostos != null ? totalCostos : costosSum
  const margen = noFilters && totalMargen != null ? totalMargen : ventas - costos
  const rentab = ventas > 0 ? (margen / ventas) * 100 : 0

  const router      = useRouter()
  const chartRef1   = useRef<HTMLDivElement>(null)  // Tendencia
  const chartRef2   = useRef<HTMLDivElement>(null)  // Donut
  const chartRef3   = useRef<HTMLDivElement>(null)  // Cuentas especiales
  const chartRef4   = useRef<HTMLDivElement>(null)  // Top clientes

  const handleLogout = useCallback(onLogout, [onLogout])

  function fmtDate(iso?: string) {
    if (!iso) return ''
    try { return new Date(iso).toLocaleString('es-EC') } catch { return iso }
  }

  return (
    <div className="min-h-screen bg-bg px-4 md:px-8 py-4">

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b-2 border-accent">
        <img src="/icon-192.png" alt="Paradais DDB" className="w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="font-serif font-bold text-xl text-text-main leading-tight">Ventas &amp; Costos</h1>
          <p className="text-xs text-text-soft italic">Paradais DDB · Dashboard Ejecutivo</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
            🟢 En vivo
          </span>
          {updatedAt && (
            <span className="hidden md:inline text-[0.65rem] text-text-soft">
              Actualizado: {fmtDate(updatedAt)}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-dark text-white hover:bg-red-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      {/* Navegación entre dashboards */}
      <div className="flex gap-2 mb-4">
        <button className="px-4 py-1.5 text-xs font-semibold rounded-full bg-accent text-dark border border-accent">
          📊 Ventas & Costos
        </button>
        <button
          onClick={() => router.push('/medios')}
          className="px-4 py-1.5 text-xs font-semibold rounded-full border border-border bg-card text-text-soft hover:bg-surface transition"
        >
          📡 Inversión Medios
        </button>
      </div>

      {/* Barra de filtros */}
      <FilterBar data={data} filters={filters} onChange={setFilters} onLogout={handleLogout} />

      {filtered.length === 0 && (
        <div className="text-center py-16 text-text-soft">
          <p className="text-lg">Sin resultados para los filtros seleccionados</p>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KPICard label="Ventas Totales"   value={fm(ventas)} badge="Ingresos consolidados" badgeType="neutral" />
            <KPICard label="Costos Totales"   value={fm(costos)} badge="Estructura de costos"  badgeType="neutral" />
            <KPICard
              label="Utilidad Bruta" value={fm(margen)}
              badge={margen >= 0 ? 'Saludable ✓' : 'En riesgo'}
              badgeType={margen >= 0 ? 'green' : 'red'}
            />
            <KPICard
              label="% Rentabilidad" value={fp(rentab)}
              badge={rentab >= 30 ? 'Óptimo ✓' : rentab >= 15 ? 'En alerta' : 'Crítico'}
              badgeType={rentab >= 30 ? 'green' : rentab >= 15 ? 'amber' : 'red'}
            />
          </div>

          {/* Gráficos centrales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div ref={chartRef1} className="bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-bold text-text-main mb-3">📈 Tendencia Mensual · Ventas vs Costos vs Margen</p>
              <TrendChart data={filtered} />
            </div>
            <div ref={chartRef2} className="bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-bold text-text-main mb-3">📊 Participación por Departamento</p>
              <DonutChart data={filtered} total={ventas} />
            </div>
          </div>

          {/* Sección inferior */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div ref={chartRef3}><SpecialAccounts data={filtered} projections={projections} /></div>
            <div ref={chartRef4} className="bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-bold text-text-main mb-3">
                📊 Top 10 Clientes Privados{' '}
                <span className="text-xs font-normal text-text-soft">(excl. cuentas especiales)</span>
              </p>
              <TopClientsChart data={filtered} projections={projections} />
            </div>
          </div>

        </>
      )}
    </div>
  )
}
