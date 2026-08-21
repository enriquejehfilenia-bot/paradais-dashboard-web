'use client'
import { useEffect, useMemo } from 'react'
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
    return MESES_ORDER[d.getUTCMonth()] ?? null
  } catch { return null }
}

const inputCls = "dark-input w-full text-xs"
const labelCls = "block text-[0.65rem] font-bold text-text-soft uppercase tracking-widest mb-1"

type FilterKey = 'empresa'|'tipo'|'ciudad'|'depto'|'clientes'|'mes'

export default function FilterBar({ data, filters, onChange, onLogout: _onLogout }: Props) {
  // ── Filtro en cascada: cada dropdown se calcula aplicando todos los DEMÁS
  // filtros activos (todos menos el propio), así nunca se arma una
  // combinación sin datos — las opciones que ya no aplicarían desaparecen.
  const filterExcept = useMemo(() => (except: FilterKey) => data.filter(r => {
    if (except !== 'empresa'  && filters.empresa.length  > 0 && !filters.empresa.includes(String(r.empresa ?? '')))              return false
    if (except !== 'tipo'     && filters.tipo.length     > 0 && !filters.tipo.includes(String(r.tipo ?? '')))                    return false
    if (except !== 'ciudad'   && filters.ciudad.length   > 0 && !filters.ciudad.includes(String(r.ciudad ?? '')))                return false
    if (except !== 'depto'    && filters.depto.length    > 0 && !filters.depto.includes(String(r.departamento_limpio ?? '')))    return false
    if (except !== 'clientes' && filters.clientes.length > 0 && !filters.clientes.includes(String(r.cliente ?? '')))             return false
    if (except !== 'mes'      && filters.mes.length      > 0 && !filters.mes.includes(mesDesde(r) ?? ''))                        return false
    return true
  }), [data, filters.empresa, filters.tipo, filters.ciudad, filters.depto, filters.clientes, filters.mes])

  const empresas = useMemo(() => unique(filterExcept('empresa'),  'empresa'),             [filterExcept])
  const tipos    = useMemo(() => unique(filterExcept('tipo'),     'tipo'),                [filterExcept])
  const ciudades = useMemo(() => unique(filterExcept('ciudad'),   'ciudad'),              [filterExcept])
  const deptos   = useMemo(() => unique(filterExcept('depto'),    'departamento_limpio'), [filterExcept])
  const clientes = useMemo(() => unique(filterExcept('clientes'), 'cliente'),             [filterExcept])

  // Meses presentes en los datos, en orden cronológico
  const meses = useMemo(() => {
    const set = new Set<string>()
    filterExcept('mes').forEach(r => { const m = mesDesde(r); if (m) set.add(m) })
    return MESES_ORDER.filter(m => set.has(m))
  }, [filterExcept])

  // Si un valor seleccionado deja de tener datos junto con los demás filtros
  // activos, se quita solo. Compara por contenido para no disparar un
  // onChange en cada render (evitaría loop infinito con el padre).
  useEffect(() => {
    const next: Filters = {
      ...filters,
      empresa:  filters.empresa.filter(v => empresas.includes(v)),
      tipo:     filters.tipo.filter(v => tipos.includes(v)),
      ciudad:   filters.ciudad.filter(v => ciudades.includes(v)),
      depto:    filters.depto.filter(v => deptos.includes(v)),
      clientes: filters.clientes.filter(v => clientes.includes(v)),
      mes:      filters.mes.filter(v => meses.includes(v)),
    }
    const changed = (['empresa','tipo','ciudad','depto','clientes','mes'] as const)
      .some(k => next[k].length !== filters[k].length)
    if (changed) onChange(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresas, tipos, ciudades, deptos, clientes, meses])

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
              className={`press px-2.5 py-1 text-[0.65rem] font-semibold rounded-full border transition ${
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
                className={`press px-2.5 py-1 text-[0.65rem] font-semibold rounded-full border transition ${
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
