'use client'
import { useMemo } from 'react'
import Combobox from './Combobox'

export interface Filters {
  empresa:   string[]
  tipo:      string[]
  ciudad:    string[]
  depto:     string[]
  clientes:  string[]
  mes:       string[]   // filtro por mes (ENERO, FEBRERO, …)
  desde:     string
  hasta:     string
}

interface Props {
  data:     Record<string, unknown>[]
  filters:  Filters
  onChange: (f: Filters) => void
  onLogout: () => void
}

function unique(data: Record<string, unknown>[], key: string): string[] {
  const vals = data
    .map(r => String(r[key] ?? '').trim())
    .filter(v => v && v !== 'nan' && !/^(n\/a|#n\/a|na|null|none|-)$/i.test(v))
  return Array.from(new Set(vals)).sort()
}

const MESES_ORDER = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                     'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
const MESES_ABBR: Record<string,string> = {
  ENERO:'ENE', FEBRERO:'FEB', MARZO:'MAR', ABRIL:'ABR', MAYO:'MAY', JUNIO:'JUN',
  JULIO:'JUL', AGOSTO:'AGO', SEPTIEMBRE:'SEP', OCTUBRE:'OCT', NOVIEMBRE:'NOV', DICIEMBRE:'DIC',
}

/** Extrae el nombre del mes (ENERO…) desde un campo fecha ISO */
function mesDesde(row: Record<string, unknown>): string | null {
  const raw = String(row.fecha ?? '')
  if (!raw || raw === 'null') return null
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return null
    return MESES_ORDER[d.getMonth()] ?? null
  } catch { return null }
}

const inputCls = "dark-input w-full text-xs"
const labelCls = "block text-[0.65rem] font-bold text-text-soft uppercase tracking-widest mb-1"

export default function FilterBar({ data, filters, onChange, onLogout: _onLogout }: Props) {
  const empresas = useMemo(() => unique(data, 'empresa'),             [data])
  const tipos    = useMemo(() => unique(data, 'tipo'),                [data])
  const ciudades = useMemo(() => unique(data, 'ciudad'),              [data])
  const deptos   = useMemo(() => unique(data, 'departamento_limpio'), [data])
  const clientes = useMemo(() => unique(data, 'cliente'),             [data])

  // Meses presentes en los datos, en orden cronológico
  const meses = useMemo(() => {
    const set = new Set<string>()
    data.forEach(r => { const m = mesDesde(r); if (m) set.add(m) })
    return MESES_ORDER.filter(m => set.has(m))
  }, [data])

  const setDate = (k: 'desde' | 'hasta') =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...filters, [k]: e.target.value })

  const toggleMes = (m: string) =>
    onChange({
      ...filters,
      mes: filters.mes.includes(m)
        ? filters.mes.filter(x => x !== m)
        : [...filters.mes, m],
    })

  return (
    <div className="bg-card rounded-xl border border-border px-4 py-3 mb-4 space-y-3">

      {/* ── Chips de meses ─────────────────────────────────────────────── */}
      {meses.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-[0.65rem] font-bold text-text-soft uppercase tracking-widest">Mes</p>
            {filters.mes.length > 0 && (
              <button
                onClick={() => onChange({ ...filters, mes: [] })}
                className="text-[0.6rem] text-red-400 hover:text-red-600 font-semibold transition"
              >
                ✕ limpiar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => onChange({ ...filters, mes: [] })}
              className={`px-2.5 py-1 text-[0.65rem] font-semibold rounded-full border transition ${
                filters.mes.length === 0
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
                className={`px-2.5 py-1 text-[0.65rem] font-semibold rounded-full border transition ${
                  filters.mes.includes(m)
                    ? 'bg-accent border-accent text-dark'
                    : 'bg-card border-border text-text-soft hover:bg-surface'
                }`}
              >
                {MESES_ABBR[m] ?? m.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Dropdowns ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-start">

        {empresas.length > 1 && (
          <div>
            <label className={labelCls}>Empresa</label>
            <Combobox
              multi options={empresas} value={filters.empresa}
              onChange={v => onChange({ ...filters, empresa: v })}
              placeholder="Todas"
            />
          </div>
        )}

        <div>
          <label className={labelCls}>Tipo</label>
          <Combobox
            multi options={tipos} value={filters.tipo}
            onChange={v => onChange({ ...filters, tipo: v })}
            placeholder="Todos"
          />
        </div>

        <div>
          <label className={labelCls}>Ciudad</label>
          <Combobox
            multi options={ciudades} value={filters.ciudad}
            onChange={v => onChange({ ...filters, ciudad: v })}
            placeholder="Todas"
          />
        </div>

        <div className="md:col-span-1 lg:col-span-1">
          <label className={labelCls}>Departamento</label>
          <Combobox
            multi options={deptos} value={filters.depto}
            onChange={v => onChange({ ...filters, depto: v })}
            placeholder="Todos"
          />
        </div>

        <div className="md:col-span-1 lg:col-span-2">
          <label className={labelCls}>Cliente</label>
          <Combobox
            multi options={clientes} value={filters.clientes}
            onChange={v => onChange({ ...filters, clientes: v })}
            placeholder="Todos"
          />
        </div>

        <div>
          <label className={labelCls}>Desde</label>
          <input type="date" className={inputCls} value={filters.desde} onChange={setDate('desde')} />
        </div>

        <div>
          <label className={labelCls}>Hasta</label>
          <input type="date" className={inputCls} value={filters.hasta} onChange={setDate('hasta')} />
        </div>

      </div>
    </div>
  )
}
