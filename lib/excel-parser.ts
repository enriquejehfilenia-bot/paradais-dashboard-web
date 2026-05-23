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
  ['fee',       'Fee'],
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
  fecha:               string | null
  cliente:             string
  departamento_limpio: string
  tipo:                string
  ciudad:              string
  total_venta_real:    number
  costos:              number
  margen:              number
  rentabilidad_pct:    number
  mes:                 string
}

/* ── Palabras clave de cabecera ── */
const HEADER_KEYS = ['fecha','codigo','codigo','cliente','tipo','departamento',
                     'ciudad','venta','base','costo','margen','rentab','total','ingreso']

/* ── Hojas a ignorar ── */
const SKIP_SHEETS = ['modelo','resumen','plantilla','template','summary','formato']

/* ── Encuentra la fila de encabezado (max 25 rows) ── */
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

/* ── ¿Es una hoja de datos válida? ── */
function isDataSheet(name: string): boolean {
  const l = nfd(name)
  return !SKIP_SHEETS.some(s => l.includes(s))
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

/* ── Convierte un valor de fecha a ISO string ── */
function toIso(val: unknown): string | null {
  if (!val) return null
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString()
  }
  const s = String(val).trim()
  if (!s) return null
  try {
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch { return null }
}

/* ── Parsea una hoja de datos ── */
function parseSheet(ws: XLSX.WorkSheet): DataRow[] {
  const headerRowIdx = findHeaderRow(ws)
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw:    false,
    defval: '',
    range:  headerRowIdx,
  })

  const rows: DataRow[] = []

  for (const raw of rawData) {
    const cliente = colVal(raw, 'cliente','cuenta','client','empresa','razon')
    if (!cliente || cliente.toLowerCase().includes('total') || cliente.toLowerCase().includes('subtotal')) continue

    // Ventas: "Base Iva" | "total_venta" | "venta_real" | "venta" | "ingreso" | "base" | "facturado"
    const totalVenta = colNum(raw, 'base iva','base_iva','total_venta','venta_real','venta',
                               'ingreso','revenue','facturado','base','honorario')
    if (totalVenta === 0) continue

    const costos = colNum(raw, 'costo real','costo_real','costo','cost','gasto','egreso')
    const margen  = totalVenta - costos

    // % Rentabilidad puede estar como 0-1 (decimal) o 0-100
    let rentab = colNum(raw, '% rent','%rent','rentabilidad_pct','rentabilidad','margin','margen_pct')
    if (rentab === 0 && totalVenta > 0) {
      rentab = (margen / totalVenta) * 100
    } else if (Math.abs(rentab) <= 1.0001 && rentab !== 0) {
      // Es decimal (0-1 scale), convertir a porcentaje
      rentab = rentab * 100
    }

    // Fecha
    const fechaVal = colVal(raw, 'fecha','date')
    const fecha    = toIso(fechaVal)

    // Mes
    let mes = colVal(raw, 'mes','month','periodo')
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

  return rows
}

/* ── Parsea la hoja de proyecciones ── */
export function parseProjections(wb: XLSX.WorkBook): Record<string, number> {
  const name = wb.SheetNames.find(n => {
    const l = nfd(n)
    return ['proyecc','presup','meta','budget'].some(k => l.includes(k))
  })
  if (!name) return {}

  const ws = wb.Sheets[name]
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]

  // Detectar columnas de cliente y proyección
  let clientCol = -1, projCol = -1, headerRow = -1

  for (let r = 0; r < Math.min(rawRows.length, 20); r++) {
    const row = rawRows[r] as unknown[]
    let cm = 0, pm = 0
    for (let c = 0; c < row.length; c++) {
      const v = nfd(String(row[c] ?? ''))
      if (v.includes('client') || v.includes('cuenta') || v.includes('empresa')) { clientCol = c; cm++ }
      if (v.includes('proyec') || v.includes('presup') || v.includes('meta') || v.includes('budget')) { projCol = c; pm++ }
    }
    if (cm > 0 && pm > 0) { headerRow = r; break }
  }

  // Si no encontró header, asumir primera columna=cliente, segunda=proyección
  if (headerRow < 0 || clientCol < 0 || projCol < 0) {
    // Detectar automáticamente: primera col texto, segunda col número
    for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
      const row = rawRows[r] as unknown[]
      if (row.length >= 2 && typeof row[0] === 'string' && !isNaN(parseFloat(String(row[1])))) {
        clientCol = 0; projCol = 1; headerRow = r - 1; break
      }
    }
    if (clientCol < 0) { clientCol = 0; projCol = 1; headerRow = 0 }
  }

  const result: Record<string, number> = {}
  for (let r = headerRow + 1; r < rawRows.length; r++) {
    const row = rawRows[r] as unknown[]
    const client = String(row[clientCol] ?? '').trim()
    const val    = parseFloat(String(row[projCol] ?? '').replace(/[$,\s]/g, ''))
    if (client && !isNaN(val) && val > 0) {
      // Usar como clave el cliente limpio (sin espacios múltiples)
      const key = client.replace(/\s+/g, ' ').trim()
      result[key] = (result[key] ?? 0) + val // sumar si hay duplicados
    }
  }
  return result
}

/* ── Parsea el Excel completo ── */
export function parseExcel(buffer: ArrayBuffer): {
  rows:        DataRow[]
  projections: Record<string, number>
  filename:    string
} {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
  const projections = parseProjections(wb)

  const skipProjection = ['proyecc','presup','meta','budget']
  const allRows: DataRow[] = []
  let mainSheetName = wb.SheetNames[0]

  for (const sheetName of wb.SheetNames) {
    const l = nfd(sheetName)

    // Saltar proyecciones, modelos y resúmenes
    if (skipProjection.some(k => l.includes(k))) continue
    if (!isDataSheet(sheetName)) continue

    const ws     = wb.Sheets[sheetName]
    const parsed = parseSheet(ws)

    if (parsed.length > 0) {
      allRows.push(...parsed)
      if (allRows.length === parsed.length) mainSheetName = sheetName // primera hoja con datos
    }
  }

  return {
    rows:        allRows,
    projections,
    filename:    mainSheetName,
  }
}
