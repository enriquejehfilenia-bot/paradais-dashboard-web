'use client'
import { useState, useMemo, useCallback } from 'react'
import KPICard        from './KPICard'
import FilterBar, { Filters } from './FilterBar'
import TrendChart     from './TrendChart'
import DonutChart     from './DonutChart'
import TopClientsChart from './TopClientsChart'
import SpecialAccounts from './SpecialAccounts'

const fm = (n: number) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fp = (n: number) => `${n.toFixed(1)}%`

interface Props {
  data:        Record<string, unknown>[]
  projections: Record<string, number>
  onLogout:    () => void
  onDownload:  () => void
  isAdmin:     boolean
  filename?:   string
  updatedAt?:  string
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

export default function Dashboard({ data, projections, onLogout, onDownload, isAdmin, filename, updatedAt }: Props) {
  const [filters, setFilters] = useState<Filters>({
    tipo: '', ciudad: '', depto: '', cliente: '', desde: '', hasta: '',
  })

  const filtered = useMemo(() => {
    return data.filter(row => {
      if (filters.tipo    && String(row.tipo                 ?? '') !== filters.tipo)    return false
      if (filters.ciudad  && String(row.ciudad               ?? '') !== filters.ciudad)  return false
      if (filters.depto   && String(row.departamento_limpio  ?? '') !== filters.depto)   return false
      if (filters.cliente && String(row.cliente              ?? '') !== filters.cliente) return false
      if (!inDateRange(row, filters.desde, filters.hasta))                               return false
      return true
    })
  }, [data, filters])

  const ventas  = useMemo(() => filtered.reduce((s, r) => s + Number(r.total_venta_real ?? 0), 0), [filtered])
  const costos  = useMemo(() => filtered.reduce((s, r) => s + Number(r.costos          ?? 0), 0), [filtered])
  const margen  = ventas - costos
  const rentab  = ventas > 0 ? (margen / ventas) * 100 : 0

  const handleLogout  = useCallback(onLogout,  [onLogout])
  const handleDownload = useCallback(onDownload, [onDownload])

  function fmtDate(iso?: string) {
    if (!iso) return ''
    try { return new Date(iso).toLocaleString('es-EC') } catch { return iso }
  }

  return (
    <div className="min-h-screen bg-bg px-4 md:px-8 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b-2 border-accent">
        <div className="w-11 h-11 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
            <rect x="10" y="7"  width="6" height="13" rx="1" fill="#EAB308"/>
            <path d="M16 7 H22 Q28 7 28 13.5 Q28 20 22 20 H16 Z" fill="#EAB308"/>
            <rect x="10" y="22" width="6" height="15" rx="1" fill="#EAB308"/>
            <path d="M16 22 H23 Q30 22 30 29.5 Q30 37 23 37 H16 Z" fill="#EAB308"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif font-bold text-xl text-text-main leading-tight">Ventas &amp; Costos</h1>
          <p className="text-xs text-text-soft italic">Paradais DDB · Dashboard Ejecutivo</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
            🟢 {filename ? `${filename}` : 'Conectado'}
          </span>
          {updatedAt && (
            <span className="hidden md:inline text-[0.65rem] text-text-soft">
              Actualizado: {fmtDate(updatedAt)}
            </span>
          )}
          <button onClick={handleDownload}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-accent text-text-main hover:bg-yellow-50 transition">
            ⬇️ Excel
          </button>
          {isAdmin && (
            <button onClick={() => window.location.href = '/admin'}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-border text-text-main hover:bg-gray-50 transition">
              🔑 Admin
            </button>
          )}
          <button onClick={handleLogout}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-dark text-white hover:bg-[#292524] transition">
            🚪
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <FilterBar data={data} filters={filters} onChange={setFilters} onLogout={handleLogout} isAdmin={isAdmin} />

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
            <div className="bg-white rounded-2xl border border-border p-4 shadow-card">
              <p className="text-sm font-bold text-text-main mb-3">📈 Tendencia Mensual · Ventas vs Costos vs Margen</p>
              <TrendChart data={filtered} />
            </div>
            <div className="bg-white rounded-2xl border border-border p-4 shadow-card">
              <p className="text-sm font-bold text-text-main mb-3">🍩 Participación por Departamento</p>
              <DonutChart data={filtered} total={ventas} />
            </div>
          </div>

          {/* Sección inferior */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <SpecialAccounts data={filtered} projections={projections} />
            <div className="bg-white rounded-2xl border border-border p-4 shadow-card">
              <p className="text-sm font-bold text-text-main mb-3">
                📊 Top 10 Clientes Privados{' '}
                <span className="text-xs font-normal text-text-soft">(excl. cuentas especiales)</span>
              </p>
              <TopClientsChart data={filtered} projections={projections} />
            </div>
          </div>

          {/* Tabla expandible */}
          <details className="bg-white rounded-2xl border border-border shadow-card">
            <summary className="px-5 py-4 cursor-pointer text-sm font-bold text-text-main select-none">
              📋 Ver datos filtrados ({filtered.length.toLocaleString()} registros)
            </summary>
            <div className="overflow-x-auto px-4 pb-4">
              <table className="w-full text-xs text-text-main border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-border">
                    {['Fecha','Cliente','Departamento','Tipo','Ciudad','Ventas','Costos','Margen','Rentab%','Mes'].map(h => (
                      <th key={h} className="text-left px-2 py-2 font-semibold text-text-soft whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 500).map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-stone-50">
                      <td className="px-2 py-1.5 whitespace-nowrap">{String(row.fecha ?? '').split('T')[0]}</td>
                      <td className="px-2 py-1.5 max-w-[160px] truncate">{String(row.cliente ?? '')}</td>
                      <td className="px-2 py-1.5">{String(row.departamento_limpio ?? '')}</td>
                      <td className="px-2 py-1.5">{String(row.tipo ?? '')}</td>
                      <td className="px-2 py-1.5">{String(row.ciudad ?? '')}</td>
                      <td className="px-2 py-1.5 text-right">{fm(Number(row.total_venta_real ?? 0))}</td>
                      <td className="px-2 py-1.5 text-right">{fm(Number(row.costos          ?? 0))}</td>
                      <td className="px-2 py-1.5 text-right">{fm(Number(row.margen          ?? 0))}</td>
                      <td className="px-2 py-1.5 text-right">{fp(Number(row.rentabilidad_pct ?? 0))}</td>
                      <td className="px-2 py-1.5">{String(row.mes ?? '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 500 && (
                <p className="text-xs text-text-soft text-center py-2">
                  Mostrando primeros 500 de {filtered.length.toLocaleString()} registros
                </p>
              )}
            </div>
          </details>
        </>
      )}
    </div>
  )
}
