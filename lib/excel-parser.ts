import * as XLSX from 'xlsx'

/* ── Mapa de normalización de departamentos ── */
const DEPT_MAP: [string, string][] = [
  ['activac',   'Activaciones'],
  ['btl',       'BTL'],
  ['below',     'BTL'],
  ['digital',   'Digital'],
  ['redes',     'Digital'],
  ['social',    'Digital'],
  ['producc',   'Producción'],
  ['produc',    'Producción'],
  ['event',     'Eventos'],
  ['trade',     'Trade Marketing'],
  ['medios',    'Medios'],
  ['medio',     'Medios'],
  ['media',     'Medios'],
  ['atl',       'ATL'],
  ['above',     'ATL'],
  ['dise',      'Diseño'],
  ['creati',    'Diseño'],
  ['relac',     'RRPP'],
  ['rrpp',      'RRPP'],
  ['consult',   'Consultoría'],
  ['estrat',    'Consultoría'],
]

function nfd(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function normalizeDept(raw: string): string {
  if (!raw) return 'Otros'
  const l = nfd(raw)
  for (const [k, v] of DEPT_MAP) {
    if (l.startsWith(k) || l.includes(k)) return v
  }
  return raw.trim() || 'Otros'
}

/* ── Tipos excluidos del ranking privado ── */
export const TIPOS_EXCL = new Set([
  'PÚBLICO','PUBLICO','RELACIONADO','RELACIONADOS',
  'PÃBLICO','PUUBLICO','PUBLIC','PÚBLICO',
])

/* ── Interfaz de fila ── */
export interface DataRow {
  fecha:              string | null
  cliente:            string
  departamento_limpio: string
  tipo:               string
  ciudad:             string
  total_venta_real:   number
  costos:             number
  margen:             number
  rentabilidad_pct:   number
  mes:                string
}

/* ── Encuentra la fila de encabezado ── */
const HEADER_KEYS = ['cliente','codigo','código','periodo','período','mes',
                     'fecha','total','venta','costo','tipo','ciudad','departamento']

function findHeaderRow(ws: XLSX.WorkSheet): number {
  const ref = ws['!ref']
  if (!ref) return 0
  const range = XLSX.utils.decode_range(ref)
  for (let r = range.s.r; r <= Math.min(range.e.r, 25); r++) {
    let matches = 0
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell?.v && typeof cell.v === 'string') {
        const v = nfd(cell.v)
        if (HEADER_KEYS.some(k => v.includes(k))) matches++
      }
    }
    if (matches >= 2) return r
  }
  return 0
}

/* ── Busca el valor de una columna por palabras clave ── */
function colVal(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of Object.keys(row)) {
    const kl = nfd(k)
    if (keys.some(key => kl.includes(key))) return String(row[k] ?? '').trim()
  }
  return ''
}

function colNum(row: Record<string, unknown>, ...keys: string[]): number {
  for (const k of Object.keys(row)) {
    const kl = nfd(k)
    if (keys.some(key => kl.includes(key))) {
      const v = String(row[k] ?? '').replace(/[$,\s]/g, '')
      const n = parseFloat(v)
      return isNaN(n) ? 0 : n
    }
  }
  return 0
}

/* ── Parsea la hoja de proyecciones ── */
export function parseProjections(wb: XLSX.WorkBook): Record<string, number> {
  const name = wb.SheetNames.find(n => {
    const l = nfd(n)
    return ['proyecc','presup','meta','budget'].some(k => l.includes(k))
  })
  if (!name) return {}

  const ws = wb.Sheets[name]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]

  let clientCol = -1, projCol = -1, headerRow = -1

  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const row = rows[r] as unknown[]
    let cm = 0, pm = 0
    for (let c = 0; c < row.length; c++) {
      const v = nfd(String(row[c] ?? ''))
      if (v.includes('client') || v.includes('cuenta') || v.includes('empresa')) { clientCol = c; cm++ }
      if (v.includes('proyec') || v.includes('presup') || v.includes('meta') || v.includes('budget')) { projCol = c; pm++ }
    }
    if (cm > 0 && pm > 0) { headerRow = r; break }
  }

  if (headerRow < 0 || clientCol < 0 || projCol < 0) return {}

  const result: Record<string, number> = {}
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r] as unknown[]
    const client = String(row[clientCol] ?? '').trim()
    const val = parseFloat(String(row[projCol] ?? '').replace(/[$,\s]/g, ''))
    if (client && !isNaN(val) && val > 0) result[client] = val
  }
  return result
}

/* ── Parsea el Excel completo ── */
export function parseExcel(buffer: ArrayBuffer): {
  rows: DataRow[]
  projections: Record<string, number>
  filename: string
} {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
  const projections = parseProjections(wb)

  // Hoja principal: primera que no sea de proyecciones
  const skipKeys = ['proyecc','presup','meta','budget']
  const mainName = wb.SheetNames.find(n => {
    const l = nfd(n)
    return !skipKeys.some(k => l.includes(k))
  }) ?? wb.SheetNames[0]

  const ws = wb.Sheets[mainName]
  const headerRowIdx = findHeaderRow(ws)

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw:    false,
    defval: '',
    range:  headerRowIdx,
  })

  const rows: DataRow[] = []

  for (const raw of rawData) {
    const cliente = colVal(raw, 'cliente','cuenta','client','empresa','razon')
    if (!cliente) continue

    const totalVenta = colNum(raw, 'total_venta','venta_real','venta','ingreso','revenue','facturado','total')
    if (totalVenta === 0) continue

    const costos  = colNum(raw, 'costo','cost','gasto','egreso')
    const margen  = totalVenta - costos
    const rentab  = totalVenta > 0 ? (margen / totalVenta) * 100 : 0

    // Fecha
    const fechaRaw = colVal(raw, 'fecha','date','periodo','period')
    let fecha: string | null = null
    if (fechaRaw) {
      try { fecha = new Date(fechaRaw).toISOString() } catch { fecha = null }
    }

    // Mes
    let mes = colVal(raw, 'mes','month')
    if (!mes && fecha) {
      try {
        mes = new Date(fecha).toLocaleString('es-EC', { month: 'long', year: 'numeric' })
      } catch { mes = '' }
    }

    const deptRaw = colVal(raw, 'departamento','depto','dept','area','servicio','linea')
    const tipo    = colVal(raw, 'tipo','type','categoria','category').toUpperCase()
    const ciudad  = colVal(raw, 'ciudad','city','ubicacion','location')

    rows.push({
      fecha,
      cliente,
      departamento_limpio: normalizeDept(deptRaw),
      tipo,
      ciudad,
      total_venta_real: totalVenta,
      costos,
      margen,
      rentabilidad_pct: rentab,
      mes,
    })
  }

  return { rows, projections, filename: mainName }
}
