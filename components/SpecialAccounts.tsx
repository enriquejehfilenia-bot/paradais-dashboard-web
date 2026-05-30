'use client'
import TrafficLight from './TrafficLight'

export const BP_RE = /BANCO.*PAC[IÍ]FICO|PAC[IÍ]FICO.*BANCO|^BP$/i

// Filas de resumen que no son clientes reales
const SKIP_RE = /^(TOTAL|OTROS CLIENTES|SUBTOTAL|SUMA|GRAND TOTAL)/i

export function isEspecial(cli: string, tipo: string): boolean {
  if (BP_RE.test(cli)) return true
  const t = tipo.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return t.includes('PUBLIC') || t.includes('RELACION')
}

function normalize(s: string) {
  return s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

interface Props {
  data:        Record<string, unknown>[]
  projections: Record<string, number>
}

export default function SpecialAccounts({ data, projections }: Props) {
  // Ventas reales de cuentas especiales
  const byClient: Record<string, number> = {}
  for (const r of data) {
    const cli  = String(r.cliente ?? '')
    const tipo = String(r.tipo ?? '')
    if (!isEspecial(cli, tipo)) continue
    byClient[cli] = (byClient[cli] ?? 0) + Number(r.total_venta_real ?? 0)
  }

  // Solo mostrar proyecciones que corresponden a cuentas especiales (BP por nombre)
  // + excluir filas de resumen (TOTAL, OTROS CLIENTES, etc.)
  const projEspeciales = Object.entries(projections).filter(([k]) => {
    if (SKIP_RE.test(k.trim())) return false
    return BP_RE.test(k)  // solo BP va a Cuentas Especiales por proyección
  })

  // También incluir clientes especiales reales que tengan ventas pero no estén en proyección
  const allLabels = new Set(projEspeciales.map(([k]) => normalize(k)))
  const sinProy = Object.entries(byClient)
    .filter(([c]) => !Array.from(allLabels).some(pn => {
      const cn = normalize(c)
      return cn.includes(pn) || pn.includes(cn)
    }))
    .sort(([, a], [, b]) => b - a)

  const hasData = projEspeciales.length > 0 || sinProy.length > 0

  if (!hasData) return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <p className="text-xs font-bold text-text-soft uppercase tracking-widest mb-3">⭐ Cuentas Especiales</p>
      <p className="text-sm text-text-soft italic">Sin datos de cuentas especiales</p>
    </div>
  )

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <p className="text-xs font-bold text-text-soft uppercase tracking-widest mb-3">⭐ Cuentas Especiales</p>
      <p className="text-[0.65rem] font-bold text-text-soft uppercase tracking-widest mb-3">
        Semáforos de cumplimiento
      </p>

      {/* Proyectados especiales */}
      {projEspeciales
        .sort(([, a], [, b]) => b - a)
        .map(([projCliente, meta]) => {
          const pn = normalize(projCliente)
          const ventasReal = byClient[
            Object.keys(byClient).find(c => {
              const cn = normalize(c)
              return cn.includes(pn) || pn.includes(cn)
            }) ?? ''
          ] ?? 0
          return <TrafficLight key={projCliente} label={projCliente} real={ventasReal} meta={meta} />
        })
      }

      {/* Especiales sin proyección (solo ventas reales) */}
      {sinProy.map(([cliente, ventas]) => (
        <TrafficLight key={cliente} label={cliente} real={ventas} meta={0} />
      ))}
    </div>
  )
}
