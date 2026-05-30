'use client'
import { useMemo } from 'react'
import Combobox from './Combobox'

export interface Filters {
  empresa:   string[]   // multi-select
  tipo:      string[]   // multi-select
  ciudad:    string[]   // multi-select
  depto:     string[]   // multi-select
  clientes:  string[]   // multi-select
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

const inputCls = "dark-input w-full text-xs"
const labelCls = "block text-[0.65rem] font-bold text-text-soft uppercase tracking-widest mb-1"

export default function FilterBar({ data, filters, onChange, onLogout: _onLogout }: Props) {
  const empresas = useMemo(() => unique(data, 'empresa'),             [data])
  const tipos    = useMemo(() => unique(data, 'tipo'),                [data])
  const ciudades = useMemo(() => unique(data, 'ciudad'),              [data])
  const deptos   = useMemo(() => unique(data, 'departamento_limpio'), [data])
  const clientes = useMemo(() => unique(data, 'cliente'),             [data])

  const setDate = (k: 'desde' | 'hasta') =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...filters, [k]: e.target.value })

  return (
    <div className="bg-card rounded-xl border border-border px-4 py-3 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-start">

        {/* Empresa */}
        {empresas.length > 1 && (
          <div>
            <label className={labelCls}>Empresa</label>
            <Combobox
              multi
              options={empresas}
              value={filters.empresa}
              onChange={v => onChange({ ...filters, empresa: v })}
              placeholder="Todas"
            />
          </div>
        )}

        {/* Tipo */}
        <div>
          <label className={labelCls}>Tipo</label>
          <Combobox
            multi
            options={tipos}
            value={filters.tipo}
            onChange={v => onChange({ ...filters, tipo: v })}
            placeholder="Todos"
          />
        </div>

        {/* Ciudad */}
        <div>
          <label className={labelCls}>Ciudad</label>
          <Combobox
            multi
            options={ciudades}
            value={filters.ciudad}
            onChange={v => onChange({ ...filters, ciudad: v })}
            placeholder="Todas"
          />
        </div>

        {/* Departamento */}
        <div className="md:col-span-1 lg:col-span-1">
          <label className={labelCls}>Departamento</label>
          <Combobox
            multi
            options={deptos}
            value={filters.depto}
            onChange={v => onChange({ ...filters, depto: v })}
            placeholder="Todos"
          />
        </div>

        {/* Cliente */}
        <div className="md:col-span-1 lg:col-span-2">
          <label className={labelCls}>Cliente</label>
          <Combobox
            multi
            options={clientes}
            value={filters.clientes}
            onChange={v => onChange({ ...filters, clientes: v })}
            placeholder="Todos"
          />
        </div>

        {/* Desde */}
        <div>
          <label className={labelCls}>Desde</label>
          <input type="date" className={inputCls} value={filters.desde} onChange={setDate('desde')} />
        </div>

        {/* Hasta */}
        <div>
          <label className={labelCls}>Hasta</label>
          <input type="date" className={inputCls} value={filters.hasta} onChange={setDate('hasta')} />
        </div>

      </div>
    </div>
  )
}
