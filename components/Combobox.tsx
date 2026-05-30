'use client'
import { useState, useRef, useEffect } from 'react'

/* ── Modo simple (single value) ── */
interface SingleProps {
  multi?:       false
  options:      string[]
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
}

/* ── Modo multi ── */
interface MultiProps {
  multi:        true
  options:      string[]
  value:        string[]
  onChange:     (v: string[]) => void
  placeholder?: string
}

type Props = SingleProps | MultiProps

export default function Combobox(props: Props) {
  const { options, placeholder = 'Todos' } = props
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const inputRef          = useRef<HTMLInputElement>(null)

  const isMulti    = props.multi === true
  const selected   = isMulti ? (props.value as string[]) : []
  const singleVal  = isMulti ? '' : (props.value as string)

  useEffect(() => { if (!open && !isMulti) setQuery(singleVal) }, [singleVal, open, isMulti])

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  /* ── Handlers multi ── */
  function toggleMulti(opt: string) {
    if (!isMulti) return
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : [...selected, opt]
    ;(props as MultiProps).onChange(next)
  }

  function clearMulti(e: React.MouseEvent, opt: string) {
    e.stopPropagation()
    if (!isMulti) return
    ;(props as MultiProps).onChange(selected.filter(s => s !== opt))
  }

  /* ── Handlers single ── */
  function selectSingle(opt: string) {
    if (isMulti) return
    ;(props as SingleProps).onChange(opt)
    setQuery(opt)
    setOpen(false)
  }

  function clearSingle(e: React.MouseEvent) {
    e.stopPropagation()
    if (isMulti) return
    ;(props as SingleProps).onChange('')
    setQuery('')
    inputRef.current?.focus()
  }

  const handleBlur = () => setTimeout(() => setOpen(false), 150)

  /* ── Chips de seleccionados (multi) ── */
  const chips = isMulti && selected.length > 0 && (
    <div className="flex flex-wrap gap-1 mb-1">
      {selected.map(s => (
        <span key={s}
          className="inline-flex items-center gap-1 bg-accent/20 border border-accent/40 text-accent text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full max-w-[120px]">
          <span className="truncate">{s}</span>
          <button onMouseDown={e => clearMulti(e, s)} className="text-yellow-600 hover:text-red-500 leading-none flex-shrink-0">×</button>
        </span>
      ))}
    </div>
  )

  return (
    <div className="relative w-full">
      {chips}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="dark-input w-full text-xs pr-6"
          placeholder={isMulti
            ? (selected.length === 0 ? placeholder : `${selected.length} seleccionado${selected.length > 1 ? 's' : ''}`)
            : placeholder}
          value={isMulti ? query : (open ? query : singleVal)}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(''); setOpen(true) }}
          onBlur={handleBlur}
        />
        {!isMulti && singleVal && (
          <button onMouseDown={clearSingle}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-soft hover:text-text-main text-sm leading-none">
            ×
          </button>
        )}
        {isMulti && selected.length > 0 && (
          <button onMouseDown={e => { e.stopPropagation(); (props as MultiProps).onChange([]); setQuery('') }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-soft hover:text-text-main text-sm leading-none">
            ×
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-card border border-border rounded-lg shadow-2xl text-xs">
          {!isMulti && (
            <li onMouseDown={() => selectSingle('')}
              className="px-3 py-2 cursor-pointer text-text-soft hover:bg-surface border-b border-border/50">
              {placeholder}
            </li>
          )}
          {filtered.map(opt => {
            const checked = isMulti && selected.includes(opt)
            return (
              <li key={opt}
                onMouseDown={() => isMulti ? toggleMulti(opt) : selectSingle(opt)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface ${
                  checked || opt === singleVal ? 'bg-surface font-semibold' : ''
                }`}>
                {isMulti && (
                  <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[0.55rem] font-bold
                    ${checked ? 'bg-accent border-accent text-dark' : 'border-border'}`}>
                    {checked ? '✓' : ''}
                  </span>
                )}
                <span className="truncate text-text-main">{opt}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
