'use client'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
  PieChart, Pie, Cell, Label,
} from 'recharts'

const fm = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmk = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return fm(n)
}

const MESES_ORDER = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
const MESES_ABBR: Record<string,string> = {
  ENERO:'ENE',FEBRERO:'FEB',MARZO:'MAR',ABRIL:'ABR',MAYO:'MAY',JUNIO:'JUN',
  JULIO:'JUL',AGOSTO:'AGO',SEPTIEMBRE:'SEP',OCTUBRE:'OCT',NOVIEMBRE:'NOV',DICIEMBRE:'DIC',
}
const MEDIO_COLORS: Record<string, string> = {
  DIGITAL: '#6366F1', TV: '#EAB308', RADIO: '#10B981',
  OOH: '#F59E0B', PRENSA: '#475569', REVISTA: '#0EA5E9', OTROS: '#DC2626',
}
const DONUT_COLORS = ['#6366F1','#EAB308','#10B981','#F59E0B','#475569','#0EA5E9','#DC2626','#EC4899']

interface MediosRow {
  mes: string
  cliente: string
  medio: string
  tipo_inversion: string
  proveedor: string
  razon_social: string
  categoria: string
  tipo_compra: string
  marca: string
  grupo_publicitario: string
  pulso: string
  valor_cliente: number
  inversion_bruta: number
  comision_cliente: number
  total_factura: number
}

// ── MultiSelect con búsqueda y chips ──────────────────────────────────────
function MultiSelect({
  label, options, selected, onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => { if (open) searchRef.current?.focus() }, [open])

  const visible = useMemo(
    () => options.filter(o => !search || o.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  )

  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val])

  const btnLabel =
    selected.length === 0 ? 'Todos'
    : selected.length === 1 ? selected[0].slice(0, 22)
    : `${selected.length} sel.`

  const active = selected.length > 0

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <p className="text-xs font-semibold text-text-soft mb-1.5">{label}</p>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={`press h-8 min-w-[110px] max-w-[190px] px-2.5 text-xs border rounded-lg bg-surface text-left flex items-center justify-between gap-1 transition focus:outline-none focus:ring-2 focus:ring-accent ${
          active ? 'border-accent text-accent font-semibold' : 'border-border text-text-main hover:border-text-soft'
        }`}
      >
        <span className="truncate">{btnLabel}</span>
        <span className="text-text-soft flex-shrink-0 text-[0.55rem] ml-1">{open ? '▲' : '▼'}</span>
      </button>

      <div
        className="dropdown-panel absolute z-[60] top-full mt-1 left-0 w-64 bg-card border border-border rounded-xl shadow-2xl"
        {...(!open ? { 'data-closed': true } : {})}
      >
        {/* Buscador */}
        <div className="p-2 border-b border-border">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Escribir para buscar..."
            className="w-full text-xs px-2.5 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Lista */}
        <div className="max-h-52 overflow-y-auto">
          {active && (
            <button
              type="button"
              onClick={() => { onChange([]); setSearch('') }}
              className="press w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 font-semibold border-b border-border"
            >
              ✕ Limpiar selección
            </button>
          )}
          {visible.length === 0 && (
            <p className="px-3 py-3 text-xs text-text-soft italic text-center">Sin resultados</p>
          )}
          {visible.map(opt => (
            <label key={opt} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-yellow-400 w-3.5 h-3.5 flex-shrink-0 cursor-pointer"
              />
              <span className="text-xs text-text-main truncate">{opt}</span>
            </label>
          ))}
        </div>

        {/* Tags seleccionados */}
        {active && (
          <div className="p-2 border-t border-border flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {selected.map(s => (
              <span key={s} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-accent rounded-full text-[0.6rem] font-semibold text-dark">
                <span className="max-w-[80px] truncate">{s}</span>
                <button type="button" onClick={() => toggle(s)} className="hover:text-red-600 ml-0.5 leading-none">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────
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

function KPI({
  label, value, sub, color, index = 0, format,
}: {
  label: string; value: number; sub?: string; color?: string; index?: number
  format?: (n: number) => string
}) {
  const shown = useCountUp(value)
  const text = (format ?? ((n: number) => String(Math.round(n))))(shown)
  return (
    <div
      className="bg-card rounded-2xl border border-border p-4 relative overflow-hidden animate-fade-up
        transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)]
        hover:-translate-y-0.5 hover:bg-[#211E1B]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl ${color ?? 'bg-accent'}`} />
      <p className="text-xs font-semibold text-text-soft mb-1">{label}</p>
      <p className="text-xl font-bold font-serif text-text-main leading-tight tabular-nums">{text}</p>
      {sub && <p className="text-[0.65rem] text-text-soft mt-1">{sub}</p>}
    </div>
  )
}

interface Props {
  data: MediosRow[]
  updatedAt?: string
  onLogout: () => void
}

function getRoleFromCookie(): 'admin' | 'medios' | null {
  try {
    const raw = document.cookie.split('; ').find(r => r.startsWith('pd_token='))?.split('=')[1]
    if (!raw) return null
    const payload = JSON.parse(atob(raw.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const r = payload?.role
    if (r === 'admin' || r === 'user') return 'admin'
    if (r === 'medios') return 'medios'
    return null
  } catch { return null }
}

export default function MediosDashboard({ data, updatedAt, onLogout }: Props) {
  const router = useRouter()

  const [userRole, setUserRole] = useState<'admin' | 'medios' | null>(null)
  useEffect(() => { setUserRole(getRoleFromCookie()) }, [])

  // ── Estado de filtros ────────────────────────────────────────────────────
  const [mesFilter,     setMesFilter]     = useState<string[]>([])
  const [medioFilter,   setMedioFilter]   = useState<string[]>([])
  const [tipoFilter,    setTipoFilter]    = useState<string[]>([])
  const [clienteFilter, setClienteFilter] = useState<string[]>([])
  const [pulsoFilter,   setPulsoFilter]   = useState<string[]>([])
  const [provFilter,    setProvFilter]    = useState<string[]>([])
  const [rsFilter,      setRsFilter]      = useState<string[]>([])
  const [catFilter,     setCatFilter]     = useState<string[]>([])
  const [tcFilter,      setTcFilter]      = useState<string[]>([])

  // ── Opciones de filtro EN CASCADA ─────────────────────────────────────────
  // Cada dropdown se calcula aplicando todos los DEMÁS filtros activos (todos
  // menos el propio), así nunca se puede armar una combinación sin datos —
  // las opciones que ya no aplicarían simplemente desaparecen de la lista.
  type FilterKey = 'mes'|'medio'|'tipo_inversion'|'cliente'|'pulso'|'proveedor'|'razon_social'|'categoria'|'tipo_compra'
  const filterExcept = useCallback((except: FilterKey) => data.filter(r => {
    if (except !== 'mes'            && mesFilter.length     > 0 && !mesFilter.includes(r.mes))                 return false
    if (except !== 'medio'          && medioFilter.length   > 0 && !medioFilter.includes(r.medio))             return false
    if (except !== 'tipo_inversion' && tipoFilter.length    > 0 && !tipoFilter.includes(r.tipo_inversion))     return false
    if (except !== 'cliente'        && clienteFilter.length > 0 && !clienteFilter.includes(r.cliente))         return false
    if (except !== 'pulso'          && pulsoFilter.length   > 0 && !pulsoFilter.includes(r.pulso))             return false
    if (except !== 'proveedor'      && provFilter.length    > 0 && !provFilter.includes(r.proveedor))          return false
    if (except !== 'razon_social'   && rsFilter.length      > 0 && !rsFilter.includes(r.razon_social))         return false
    if (except !== 'categoria'      && catFilter.length     > 0 && !catFilter.includes(r.categoria))           return false
    if (except !== 'tipo_compra'    && tcFilter.length      > 0 && !tcFilter.includes(r.tipo_compra))          return false
    return true
  }), [data, mesFilter, medioFilter, tipoFilter, clienteFilter, pulsoFilter, provFilter, rsFilter, catFilter, tcFilter])

  const meses       = useMemo(() => { const rows = filterExcept('mes'); return MESES_ORDER.filter(m => rows.some(r => r.mes === m)) }, [filterExcept])
  const medios      = useMemo(() => [...new Set(filterExcept('medio').map(r => r.medio).filter(Boolean))].sort(), [filterExcept])
  const tipos       = useMemo(() => [...new Set(filterExcept('tipo_inversion').map(r => r.tipo_inversion).filter(Boolean))].sort(), [filterExcept])
  const clientes    = useMemo(() => {
    const rows = filterExcept('cliente')
    return Object.entries(rows.reduce((acc, r) => { acc[r.cliente] = (acc[r.cliente] ?? 0) + r.valor_cliente; return acc }, {} as Record<string,number>))
      .sort(([,a],[,b]) => b - a).map(([c]) => c)
  }, [filterExcept])
  const pulsos       = useMemo(() => [...new Set(filterExcept('pulso').map(r => r.pulso).filter(Boolean))].sort(), [filterExcept])
  const proveedores = useMemo(() => [...new Set(filterExcept('proveedor').map(r => r.proveedor).filter(Boolean))].sort(), [filterExcept])
  const razones     = useMemo(() => [...new Set(filterExcept('razon_social').map(r => r.razon_social).filter(Boolean))].sort(), [filterExcept])
  const categorias  = useMemo(() => [...new Set(filterExcept('categoria').map(r => r.categoria).filter(Boolean))].sort(), [filterExcept])
  const tiposCompra = useMemo(() => [...new Set(filterExcept('tipo_compra').map(r => r.tipo_compra).filter(Boolean))].sort(), [filterExcept])

  // Si un valor seleccionado deja de tener datos junto con los demás filtros
  // activos, se quita solo (evita quedar filtrando por algo que ya no existe).
  // Devolver la MISMA referencia cuando no hay nada que podar es clave: si no,
  // cada recálculo de las listas de opciones dispara un set-state nuevo y
  // vuelve a recalcular las listas -> loop infinito.
  const prune = (opts: string[]) => (p: string[]) => {
    const next = p.filter(v => opts.includes(v))
    return next.length === p.length ? p : next
  }
  useEffect(() => { setMesFilter(prune(meses)) },             [meses])
  useEffect(() => { setMedioFilter(prune(medios)) },          [medios])
  useEffect(() => { setTipoFilter(prune(tipos)) },             [tipos])
  useEffect(() => { setClienteFilter(prune(clientes)) },       [clientes])
  useEffect(() => { setPulsoFilter(prune(pulsos)) },           [pulsos])
  useEffect(() => { setProvFilter(prune(proveedores)) },       [proveedores])
  useEffect(() => { setRsFilter(prune(razones)) },             [razones])
  useEffect(() => { setCatFilter(prune(categorias)) },         [categorias])
  useEffect(() => { setTcFilter(prune(tiposCompra)) },         [tiposCompra])

  // ── Datos filtrados ──────────────────────────────────────────────────────
  const filtered = useMemo(() => data.filter(r => {
    if (mesFilter.length     > 0 && !mesFilter.includes(r.mes))             return false
    if (medioFilter.length   > 0 && !medioFilter.includes(r.medio))         return false
    if (tipoFilter.length    > 0 && !tipoFilter.includes(r.tipo_inversion)) return false
    if (clienteFilter.length > 0 && !clienteFilter.includes(r.cliente))     return false
    if (pulsoFilter.length   > 0 && !pulsoFilter.includes(r.pulso))         return false
    if (provFilter.length    > 0 && !provFilter.includes(r.proveedor))      return false
    if (rsFilter.length      > 0 && !rsFilter.includes(r.razon_social))     return false
    if (catFilter.length     > 0 && !catFilter.includes(r.categoria))       return false
    if (tcFilter.length      > 0 && !tcFilter.includes(r.tipo_compra))      return false
    return true
  }), [data, mesFilter, medioFilter, tipoFilter, clienteFilter, pulsoFilter, provFilter, rsFilter, catFilter, tcFilter])

  const hasFilter = [mesFilter, medioFilter, tipoFilter, clienteFilter, pulsoFilter, provFilter, rsFilter, catFilter, tcFilter]
    .some(f => f.length > 0)

  const activeCount = [mesFilter, medioFilter, tipoFilter, clienteFilter, pulsoFilter, provFilter, rsFilter, catFilter, tcFilter]
    .reduce((s, f) => s + (f.length > 0 ? 1 : 0), 0)

  // ── Transición GSAP de los gráficos al cambiar un filtro ─────────────────
  // Dip sutil + recuperación, escalonado (personalidad Corporate: sin rebote).
  // No corre en el primer render (ese ya lo cubre el fade-up de las tarjetas).
  const chartRefs = useRef<(HTMLDivElement | null)[]>([])
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const els = chartRefs.current.filter((el): el is HTMLDivElement => el !== null)
    if (els.length === 0) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(els,
        { autoAlpha: 0.5, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out', stagger: 0.05 },
      )
    })
    return () => mm.revert()
  }, [filtered])

  // ── KPIs ────────────────────────────────────────────────────────────────
  const invCliente    = useMemo(() => filtered.reduce((s, r) => s + r.valor_cliente,   0), [filtered])
  const invBruta      = useMemo(() => filtered.reduce((s, r) => s + r.inversion_bruta, 0), [filtered])
  const comision      = useMemo(() => filtered.reduce((s, r) => s + r.comision_cliente,0), [filtered])
  const totalFact     = useMemo(() => filtered.reduce((s, r) => s + r.total_factura,   0), [filtered])
  const numClientes   = useMemo(() => new Set(filtered.map(r => r.cliente)).size, [filtered])
  const numMedios     = useMemo(() => new Set(filtered.map(r => r.medio)).size, [filtered])
  const numCampanas   = useMemo(() => new Set(filtered.map(r => r.cliente + '|' + r.medio)).size, [filtered])
  const numMateriales = filtered.length

  // ── Tendencia mensual ────────────────────────────────────────────────────
  const tendencia = useMemo(() => MESES_ORDER
    .filter(m => data.some(r => r.mes === m))
    .map(m => {
      const rows = filtered.filter(r => r.mes === m)
      return {
        mes: MESES_ABBR[m] ?? m.slice(0,3),
        'Inv. Cliente': rows.reduce((s, r) => s + r.valor_cliente,   0),
        'Inv. Bruta':   rows.reduce((s, r) => s + r.inversion_bruta, 0),
        'Comisión':     rows.reduce((s, r) => s + r.comision_cliente, 0),
      }
    }), [filtered, data])

  // ── Por medio ────────────────────────────────────────────────────────────
  const byMedio = useMemo(() => {
    const acc: Record<string, { inv: number; rows: number }> = {}
    for (const r of filtered) {
      if (!acc[r.medio]) acc[r.medio] = { inv: 0, rows: 0 }
      acc[r.medio].inv  += r.valor_cliente
      acc[r.medio].rows += 1
    }
    return Object.entries(acc).sort(([,a],[,b]) => b.inv - a.inv)
      .map(([medio, v]) => ({ medio, inv: v.inv, registros: v.rows, pct: invCliente > 0 ? v.inv / invCliente * 100 : 0 }))
  }, [filtered, invCliente])

  // ── Top clientes ─────────────────────────────────────────────────────────
  const topClientesData = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const r of filtered) acc[r.cliente] = (acc[r.cliente] ?? 0) + r.valor_cliente
    return Object.entries(acc).sort(([,a],[,b]) => b - a).slice(0, 10)
      .map(([cliente, inv]) => ({ cliente: cliente.trim().slice(0,22), inv }))
  }, [filtered])

  // ── Top proveedores ───────────────────────────────────────────────────────
  const topProveedoresData = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const r of filtered) {
      const prov = r.proveedor || 'OTROS'
      if (prov === 'OTROS') continue
      acc[prov] = (acc[prov] ?? 0) + r.valor_cliente
    }
    return Object.entries(acc).sort(([,a],[,b]) => b - a).slice(0, 10)
      .map(([proveedor, inv]) => ({ proveedor: proveedor.trim().slice(0,22), inv }))
  }, [filtered])

  // ── Donut tipo inversión ─────────────────────────────────────────────────
  const byTipo = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const r of filtered) {
      const t = r.tipo_inversion || 'Otro'
      acc[t] = (acc[t] ?? 0) + r.valor_cliente
    }
    return Object.entries(acc).sort(([,a],[,b]) => b - a)
      .map(([name, value]) => ({ name: name.trim(), value, pct: invCliente > 0 ? value / invCliente * 100 : 0 }))
  }, [filtered, invCliente])

  // ── Helpers ──────────────────────────────────────────────────────────────
  function fmtDate(iso?: string) {
    if (!iso) return ''
    try { return new Date(iso).toLocaleString('es-EC') } catch { return iso }
  }

  const handleLogout  = useCallback(onLogout, [onLogout])

  const clearAll = () => {
    setMesFilter([]); setMedioFilter([]); setTipoFilter([]); setClienteFilter([])
    setPulsoFilter([])
    setProvFilter([]); setRsFilter([])
    setCatFilter([]); setTcFilter([])
  }

  const toggleMes = (m: string) =>
    setMesFilter(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const DonutLabel = ({ viewBox }: { viewBox?: { cx?: number; cy?: number } }) => {
    const cx = viewBox?.cx ?? 0
    const cy = viewBox?.cy ?? 0
    return (
      <g>
        <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="middle" fill="#A8A29E" fontSize={9} fontWeight={600}>TOTAL</text>
        <text x={cx} y={cy + 8}  textAnchor="middle" dominantBaseline="middle" fill="#F2F0EE" fontSize={11} fontWeight={700}>{fm(invCliente)}</text>
      </g>
    )
  }

  return (
    <div className="min-h-screen bg-bg px-4 md:px-8 py-4">

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b-2 border-accent">
        <img src="/icon-192.png" alt="Paradais TBWA" className="w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="font-serif font-bold text-xl text-text-main leading-tight">Inversión en Medios</h1>
          <p className="text-xs text-text-soft italic">Paradais TBWA · Dashboard de Medios</p>
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
          <button onClick={handleLogout}
            className="press flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-dark text-white hover:bg-red-700 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {userRole === 'admin' && (
          <button
            onClick={() => router.push('/dashboard')}
            className="press px-4 py-1.5 text-xs font-semibold rounded-full border border-border bg-card text-text-soft hover:bg-surface transition"
          >
            📊 Ventas & Costos
          </button>
        )}
        <button className="px-4 py-1.5 text-xs font-semibold rounded-full bg-accent text-dark border border-accent">
          📡 Inversión Medios
        </button>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-5">

        {/* Cabecera filtros */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-main">🔍 Filtros</span>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 bg-accent rounded-full text-[0.6rem] font-bold text-dark">
                {activeCount} activo{activeCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {hasFilter && (
            <button
              onClick={clearAll}
              className="text-xs text-red-500 hover:text-red-700 font-semibold transition"
            >
              ✕ Limpiar todo
            </button>
          )}
        </div>

        {/* Meses — multiselect chips */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-xs font-semibold text-text-soft">Mes</p>
            {mesFilter.length > 0 && (
              <button onClick={() => setMesFilter([])} className="text-[0.6rem] text-red-400 hover:text-red-600 font-semibold">
                ✕ limpiar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setMesFilter([])}
              className={`press px-2.5 py-1 text-[0.65rem] font-semibold rounded-full border transition ${
                mesFilter.length === 0
                  ? 'bg-accent border-accent text-dark'
                  : 'bg-card border-border text-text-soft hover:bg-surface'
              }`}
            >
              TODOS
            </button>
            {meses.map(m => (
              <button
                key={m}
                onClick={() => toggleMes(m)}
                className={`press px-2.5 py-1 text-[0.65rem] font-semibold rounded-full border transition ${
                  mesFilter.includes(m)
                    ? 'bg-accent border-accent text-dark'
                    : 'bg-card border-border text-text-soft hover:bg-surface'
                }`}
              >
                {MESES_ABBR[m] ?? m.slice(0,3)}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdowns multiselect */}
        <div className="flex flex-wrap gap-3 items-end animate-fade-up">
          <MultiSelect label="Medio"          options={medios}      selected={medioFilter}   onChange={setMedioFilter} />
          <MultiSelect label="Tipo Inversión" options={tipos}       selected={tipoFilter}    onChange={setTipoFilter} />
          <MultiSelect label="Cliente"        options={clientes}    selected={clienteFilter} onChange={setClienteFilter} />
          {pulsos.length      > 0 && <MultiSelect label="Pulso"        options={pulsos}      selected={pulsoFilter}   onChange={setPulsoFilter} />}
          {proveedores.length > 0 && <MultiSelect label="Proveedor"    options={proveedores} selected={provFilter}    onChange={setProvFilter} />}
          {razones.length     > 0 && <MultiSelect label="Razón Social" options={razones}     selected={rsFilter}      onChange={setRsFilter} />}
          {categorias.length  > 0 && <MultiSelect label="Categoría"   options={categorias}  selected={catFilter}     onChange={setCatFilter} />}
          {tiposCompra.length > 0 && <MultiSelect label="Tipo Compra" options={tiposCompra} selected={tcFilter}      onChange={setTcFilter} />}
        </div>

        {/* Resumen de filtros activos */}
        {hasFilter && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1">
            {mesFilter.map(m => (
              <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/20 border border-accent rounded-full text-[0.6rem] font-semibold text-dark">
                📅 {MESES_ABBR[m] ?? m}
                <button onClick={() => setMesFilter(p => p.filter(x => x !== m))} className="hover:text-red-600">×</button>
              </span>
            ))}
            {medioFilter.map(v => (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-900/30 border border-indigo-700 rounded-full text-[0.6rem] font-semibold text-indigo-300">
                📡 {v}
                <button onClick={() => setMedioFilter(p => p.filter(x => x !== v))} className="hover:text-red-600">×</button>
              </span>
            ))}
            {tipoFilter.map(v => (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-900/30 border border-emerald-700 rounded-full text-[0.6rem] font-semibold text-emerald-300">
                🏷 {v.slice(0,20)}
                <button onClick={() => setTipoFilter(p => p.filter(x => x !== v))} className="hover:text-red-600">×</button>
              </span>
            ))}
            {clienteFilter.map(v => (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-900/30 border border-amber-700 rounded-full text-[0.6rem] font-semibold text-amber-300">
                👤 {v.slice(0,20)}
                <button onClick={() => setClienteFilter(p => p.filter(x => x !== v))} className="hover:text-red-600">×</button>
              </span>
            ))}
            {pulsoFilter.map(v => (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-fuchsia-900/30 border border-fuchsia-700 rounded-full text-[0.6rem] font-semibold text-fuchsia-300">
                💓 {v.slice(0,20)}
                <button onClick={() => setPulsoFilter(p => p.filter(x => x !== v))} className="hover:text-red-600">×</button>
              </span>
            ))}
            {provFilter.map(v => (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-900/30 border border-violet-700 rounded-full text-[0.6rem] font-semibold text-violet-300">
                🏭 {v.slice(0,20)}
                <button onClick={() => setProvFilter(p => p.filter(x => x !== v))} className="hover:text-red-600">×</button>
              </span>
            ))}
            {rsFilter.map(v => (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-900/30 border border-sky-700 rounded-full text-[0.6rem] font-semibold text-sky-300">
                🏢 {v.slice(0,20)}
                <button onClick={() => setRsFilter(p => p.filter(x => x !== v))} className="hover:text-red-600">×</button>
              </span>
            ))}
            {catFilter.map(v => (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-900/30 border border-teal-700 rounded-full text-[0.6rem] font-semibold text-teal-300">
                📦 {v.slice(0,20)}
                <button onClick={() => setCatFilter(p => p.filter(x => x !== v))} className="hover:text-red-600">×</button>
              </span>
            ))}
            {tcFilter.map(v => (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-900/30 border border-orange-700 rounded-full text-[0.6rem] font-semibold text-orange-300">
                🛒 {v.slice(0,20)}
                <button onClick={() => setTcFilter(p => p.filter(x => x !== v))} className="hover:text-red-600">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-text-soft">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-lg">Sin resultados para los filtros seleccionados</p>
          <button onClick={clearAll} className="press mt-4 px-4 py-2 bg-accent rounded-lg text-sm font-semibold text-dark">
            Limpiar filtros
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {/* KPIs principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KPI label="Inv. Cliente"    value={invCliente} format={fm} index={0} sub="Valor facturado al cliente"    color="bg-accent" />
            <KPI label="Inv. Bruta"      value={invBruta}   format={fm} index={1} sub="Consumo plataforma proveedor"  color="bg-indigo-400" />
            <KPI label="Comisión"        value={comision}   format={fm} index={2} sub="Comisión cliente"              color="bg-emerald-400" />
            <KPI label="Total Facturado" value={totalFact}  format={fm} index={3} sub="Total factura cliente"         color="bg-amber-400" />
          </div>

          {/* KPIs contadores */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mb-5">
            <KPI label="Clientes Activos" value={numClientes} index={4} color="bg-slate-300" />
            <KPI label="Medios"           value={numMedios}   index={5} color="bg-slate-300" />
          </div>

          {/* Tendencia mensual */}
          <div ref={el => { chartRefs.current[0] = el }} className="bg-card rounded-2xl border border-border p-4 mb-5">
            <p className="text-sm font-bold text-text-main mb-3">📈 Tendencia Mensual · Inv. Cliente vs Bruta vs Comisión</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={tendencia} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2926" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#A8A29E' }} />
                <YAxis tickFormatter={v => fmk(v)} tick={{ fontSize: 10, fill: '#A8A29E' }} width={55} />
                <Tooltip formatter={(v: number) => fm(v)} contentStyle={{ borderRadius: 8, fontSize: 12, background: '#1C1917', border: '1px solid #2C2926', color: '#F2F0EE' }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#A8A29E' }} />
                <Line type="monotone" dataKey="Inv. Cliente" stroke="#EAB308" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Inv. Bruta"   stroke="#6366F1" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="Comisión"     stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="2 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Ranking por Medio + Top Clientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

            <div ref={el => { chartRefs.current[1] = el }} className="bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-bold text-text-main mb-3">📡 Inversión por Medio</p>
              <ResponsiveContainer width="100%" height={Math.max(200, byMedio.length * 40)}>
                <BarChart data={byMedio} layout="vertical" margin={{ top: 2, right: 70, left: 8, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2C2926" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmk(v)} tick={{ fontSize: 9, fill: '#A8A29E' }} />
                  <YAxis type="category" dataKey="medio" tick={{ fontSize: 10, fill: '#F2F0EE' }} width={60} />
                  <Tooltip formatter={(v: number) => fm(v)} contentStyle={{ borderRadius: 8, fontSize: 11, background: '#1C1917', border: '1px solid #2C2926', color: '#F2F0EE' }} />
                  <Bar dataKey="inv" radius={[0, 4, 4, 0]}
                    label={{ position: 'right', formatter: (v: number) => fmk(v), fontSize: 9, fill: '#F2F0EE' }}>
                    {byMedio.map((e, i) => <Cell key={i} fill={MEDIO_COLORS[e.medio] ?? '#94A3B8'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div ref={el => { chartRefs.current[2] = el }} className="bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-bold text-text-main mb-3">🏆 Top 10 Clientes · Inv. Cliente</p>
              <ResponsiveContainer width="100%" height={Math.max(200, topClientesData.length * 40)}>
                <BarChart data={topClientesData} layout="vertical" margin={{ top: 2, right: 70, left: 8, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2C2926" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmk(v)} tick={{ fontSize: 9, fill: '#A8A29E' }} />
                  <YAxis type="category" dataKey="cliente" tick={{ fontSize: 9, fill: '#F2F0EE' }} width={120} />
                  <Tooltip formatter={(v: number) => fm(v)} contentStyle={{ borderRadius: 8, fontSize: 11, background: '#1C1917', border: '1px solid #2C2926', color: '#F2F0EE' }} />
                  <Bar dataKey="inv" fill="#EAB308" radius={[0, 4, 4, 0]}
                    label={{ position: 'right', formatter: (v: number) => fmk(v), fontSize: 9, fill: '#F2F0EE' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Proveedores */}
          {topProveedoresData.length > 0 && (
            <div ref={el => { chartRefs.current[3] = el }} className="bg-card rounded-2xl border border-border p-4 mb-5">
              <p className="text-sm font-bold text-text-main mb-3">🏭 Top 10 Proveedores · Inv. Cliente</p>
              <ResponsiveContainer width="100%" height={Math.max(200, topProveedoresData.length * 40)}>
                <BarChart data={topProveedoresData} layout="vertical" margin={{ top: 2, right: 80, left: 8, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2C2926" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmk(v)} tick={{ fontSize: 9, fill: '#A8A29E' }} />
                  <YAxis type="category" dataKey="proveedor" tick={{ fontSize: 9, fill: '#F2F0EE' }} width={130} />
                  <Tooltip formatter={(v: number) => fm(v)} contentStyle={{ borderRadius: 8, fontSize: 11, background: '#1C1917', border: '1px solid #2C2926', color: '#F2F0EE' }} />
                  <Bar dataKey="inv" fill="#6366F1" radius={[0, 4, 4, 0]}
                    label={{ position: 'right', formatter: (v: number) => fmk(v), fontSize: 9, fill: '#F2F0EE' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Donut + Tabla */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

            <div ref={el => { chartRefs.current[4] = el }} className="bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-bold text-text-main mb-3">📊 Distribución por Tipo de Inversión</p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={byTipo} cx="40%" cy="50%" innerRadius="50%" outerRadius="75%"
                    dataKey="value" paddingAngle={2}>
                    {byTipo.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="#fff" strokeWidth={2} />
                    ))}
                    <Label content={<DonutLabel />} position="center" />
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [`${invCliente>0?((v/invCliente)*100).toFixed(1):0}% · ${fm(v)}`, n]}
                    contentStyle={{ borderRadius: 8, fontSize: 11, background: '#1C1917', border: '1px solid #2C2926', color: '#F2F0EE' }} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle"
                    wrapperStyle={{ fontSize: 10, color: '#A8A29E' }}
                    formatter={(v: string, e: unknown) => {
                      const en = e as { payload?: { pct?: number } }
                      return `${v.trim().slice(0,18)} · ${(en?.payload?.pct ?? 0).toFixed(1)}%`
                    }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-bold text-text-main mb-3">📋 Detalle por Medio</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 text-text-soft font-semibold">Medio</th>
                      <th className="text-right pb-2 text-text-soft font-semibold">Inv. Cliente</th>
                      <th className="text-right pb-2 text-text-soft font-semibold">%</th>
                      <th className="text-right pb-2 text-text-soft font-semibold">Reg.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMedio.map((row, i) => (
                      <tr key={i} className="border-b border-border hover:bg-surface">
                        <td className="py-1.5 font-semibold text-text-main flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                            style={{ background: MEDIO_COLORS[row.medio] ?? '#94A3B8' }} />
                          {row.medio}
                        </td>
                        <td className="py-1.5 text-right font-mono text-text-main">{fm(row.inv)}</td>
                        <td className="py-1.5 text-right text-text-soft">{row.pct.toFixed(1)}%</td>
                        <td className="py-1.5 text-right text-text-soft">{row.registros}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td className="py-2 font-bold text-text-main">TOTAL</td>
                      <td className="py-2 text-right font-bold font-mono text-text-main">{fm(invCliente)}</td>
                      <td className="py-2 text-right font-bold text-text-soft">100%</td>
                      <td className="py-2 text-right font-bold text-text-soft">{numMateriales}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
