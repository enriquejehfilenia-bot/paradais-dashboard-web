'use client'
import { useMemo } from 'react'

export interface Filters {
  tipo:     string
  ciudad:   string
  depto:    string
  cliente:  string
  desde:    string
  hasta:    string
}

interface Props {
  data:     Record<string, unknown>[]
  filters:  Filters
  onChange: (f: Filters) => void
  onLogout: () => void
  isAdmin:  boolean
}

function unique(data: Record<string, unknown>[], key: string): string[] {
  const vals = data.map(r => String(r[key] ?? '')).filter(v => v && v !== 'nan')
  return Array.from(new Set(vals)).sort()
}

const selectCls = "dark-select w-full text-xs"
const inputCls  = "dark-input w-full text-xs"
const labelCls  = "block text-[0.65rem] font-bold text-text-soft uppercase tracking-widest mb-1"

export default function FilterBar({ data, filters, onChange, onLogout, isAdmin }: Props) {
  const tipos    = useMemo(() => unique(data, 'tipo'),              [data])
  const ciudades = useMemo(() => unique(data, 'ciudad'),           [data])
  const deptos   = useMemo(() => unique(data, 'departamento_limpio'), [data])
  const clientes = useMemo(() => unique(data, 'cliente'),          [data])

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    onChange({ ...filters, [k]: e.target.value })

  return (
    <div className="bg-white rounded-xl border border-border shadow-card px-4 py-3 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
        {/* Tipo */}
        <div>
          <label className={labelCls}>Tipo</label>
          <select className={selectCls} value={filters.tipo} onChange={set('tipo')}>
            <option value="">Todos</option>
            {tipos.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        {/* Ciudad */}
        <div>
          <label className={labelCls}>Ciudad</label>
          <select className={selectCls} value={filters.ciudad} onChange={set('ciudad')}>
            <option value="">Todas</option>
            {ciudades.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        {/* Departamento */}
        <div className="md:col-span-1 lg:col-span-1">
          <label className={labelCls}>Departamento</label>
          <select className={selectCls} value={filters.depto} onChange={set('depto')}>
            <option value="">Todos</option>
            {deptos.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        {/* Cliente */}
        <div className="md:col-span-1 lg:col-span-2">
          <label className={labelCls}>Cliente</label>
          <select className={selectCls} value={filters.cliente} onChange={set('cliente')}>
            <option value="">Todos</option>
            {clientes.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        {/* Desde */}
        <div>
          <label className={labelCls}>Desde</label>
          <input type="date" className={inputCls} value={filters.desde} onChange={set('desde')} />
        </div>
        {/* Hasta */}
        <div>
          <label className={labelCls}>Hasta</label>
          <input type="date" className={inputCls} value={filters.hasta} onChange={set('hasta')} />
        </div>
      </div>
    </div>
  )
}
