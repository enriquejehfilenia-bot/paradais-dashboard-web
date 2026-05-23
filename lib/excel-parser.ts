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

/* ── Normaliza ciudad ── */
const CIUDAD_MAP: [string, string][] = [
  ['quito',        'Quito'],
  ['guayaquil',    'Guayaquil'],
  ['gye',          'Guayaquil'],
  ['cuenca',       'Cuenca'],
  ['ambato',       'Ambato'],
  ['manta',        'Manta'],
  ['loja',         'Loja'],
  ['machala',      'Machala'],
  ['esmeraldas',   'Esmeraldas'],
  ['santo domingo','Santo Domingo'],
]

function normalizeCiudad(raw: string): string {
  if (!raw) return ''
  const l = raw.trim()
  if (/^(n\/a|#n\/a|na|null|none|-)$/i.test(l)) return ''
  const ll = nfd(l)
  for (const [k, v] of CIUDAD_MAP) {
    if (ll === k || ll.startsWith(k)) return v
  }
  return l
}

/* ── Mapa nombre de hoja → mes (para fallback cuando Fecha está vacía) ── */
const SHEET_MES: Record<string, number> = {
  enero:1, ene:1, jan:1, january:1,
  febrero:2, feb:2, february:2,
  marzo:3, mar:3, march:3,
  abril:4, abr:4, april:4,
  mayo:5, may:5,
  junio:6, jun:6, june:6,
  julio:7, jul:7, july:7,
  agosto:8, ago:8, august:8,
  septiembre:9, sep:9, sept:9, september:9,
  octubre:10, oct:10, october:10,
  noviembre:11, nov:11, november:11,
  diciembre:12, dic:12, december:12,
}

function sheetFallbackMes(sheetName: string, year = 2026): string {
  const l = nfd(sheetName)
  for (const [k, m] of Object.entries(SHEET_MES)) {
    if (l.startsWith(k) || l.includes(k)) {
      const d = new Date(year, m - 1, 1)
      return d.toLocaleString('es-EC', { month: 'long', year: 'numeric' })
    }
  }
  return ''
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
const HEADER_KEYS = ['fecha','codigo','cliente','tipo','departamento',
                     'ciudad','venta','base','costo','margen','rentab','total','ingreso']

/* ── Hojas a ignorar ── */
const SKIP_SHEETS = ['modelo','resumen','plantilla','template','summary','formato','concili']

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

/* ── colMatch: usa startsWith para evitar falsos positivos ── */
function colMatch(kl: string, key: string): boolean {
  return kl === key || kl.startsWith(key)
}

/* ── Retorna el valor string de una columna ── */
function colVal(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of Object.keys(row)) {
    const kl = nfd(k)
    if (keys.some(key => colMatch(kl, key))) {
      const v = row[k]
      if (v instanceof Date) return v.toISOString()
      return String(v ?? '').trim()
    }
  }
  return ''
}

/* ── Retorna el valor RAW de una columna (para fechas: Date object) ── */
function colRaw(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of Object.keys(row)) {
    const kl = nfd(k)
    if (keys.some(key => colMatch(kl, key))) return row[k]
  }
  return null
}

/* ── Retorna el valor numérico de una columna ── */
function colNum(row: Record<string, unknown>, ...keys: string[]): number {
  for (const k of Object.keys(row)) {
    const kl = nfd(k)
    if (keys.some(key => colMatch(kl, key))) {
      const raw = row[k]
      // Con raw:true los números ya llegan como number
      if (typeof raw === 'number') return isNaN(raw) ? 0 : raw
      const v = String(raw ?? '').replace(/[$,\s]/g, '')
      const n = parseFloat(v)
      return isNaN(n) ? 0 : n
    }
  }
  return 0
}

/* ── Convierte un valor de fecha a ISO string ── */
function toIso(val: unknown): string | null {
  if (!val) return null
  // Con raw:true SheetJS entrega Date objects nativos — son correctos
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
function parseSheet(ws: XLSX.WorkSheet, sheetName = ''): DataRow[] {
  const headerRowIdx = findHeaderRow(ws)
  // raw:true — los Date cells llegan como Date objects (correctos),
  // los números como number, los strings como string.
  // Esto evita que "05/01/26" (DD/MM/YY) se parsee mal como May 1.
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw:    true,
    defval: '',
    range:  headerRowIdx,
  })

  // Mes de fallback desde nombre de hoja (para filas sin fecha)
  const fallbackMes = sheetFallbackMes(sheetName)

  const rows: DataRow[] = []

  for (const raw of rawData) {
    const cliente = colVal(raw, 'cliente','cuenta','client','empresa','razon')
    if (!cliente || /^(total|subtotal|suma)/i.test(cliente.trim())) continue

    // Ventas — "Base Iva" tiene prioridad por ser la columna exacta del Excel
    const totalVenta = colNum(raw, 'base iva','base_iva','total_venta','venta_real','venta',
                               'ingreso','revenue','facturado','honorario')
    if (totalVenta === 0) continue

    const costos = colNum(raw, 'costo real','costo_real','costo','cost','gasto','egreso')
    const margen  = totalVenta - costos

    // % Rentabilidad:
    //   - Buscar SOLO columnas con "%" para no confundir con "Rentabilidad" (valor absoluto)
    //   - Con raw:true los % de Excel llegan como 0.0–1.0 (decimal); multiplicar × 100
    let rentab = colNum(raw, '% rent','%rent','rentabilidad_pct','margen_pct')
    if (rentab === 0 && totalVenta > 0) {
      rentab = (margen / totalVenta) * 100
    } else if (Math.abs(rentab) <= 1.0001 && rentab !== 0) {
      // Decimal scale (0–1) → convertir a porcentaje
      rentab = rentab * 100
    }

    // Fecha — usar colRaw para obtener el Date object nativo de SheetJS
    const fechaRaw = colRaw(raw, 'fecha','date')
    const fecha    = toIso(fechaRaw)

    // Mes — derivar de fecha; si fecha es null usar el nombre de la hoja
    let mes = ''
    if (fecha) {
      try {
        mes = new Date(fecha).toLocaleString('es-EC', { month: 'long', year: 'numeric' })
      } catch { mes = fallbackMes }
    } else {
      mes = fallbackMes
    }

    const deptRaw   = colVal(raw, 'departamento','depto','dept','area','servicio','linea')
    const tipo      = colVal(raw, 'tipo','type','categoria','category').toUpperCase()
    const ciudadRaw = colVal(raw, 'ciudad','city','ubicacion','location','provincia','region','localidad')
    const ciudad    = normalizeCiudad(ciudadRaw)

    rows.push({
      fecha,
      cliente:             cliente.replace(/\s+/g, ' ').trim(),
      departamento_limpio: normalizeDept(deptRaw),
      tipo,
      ciudad,
      total_venta_real: totalVenta,
      costos,
      margen,
      rentabilidad_pct: Math.round(rentab * 100) / 100,
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

  if (headerRow < 0 || clientCol < 0 || projCol < 0) {
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
    const client = String(row[clientCol] ?? '').replace(/\s+/g, ' ').trim()
    const val    = typeof row[projCol] === 'number'
      ? row[projCol] as number
      : parseFloat(String(row[projCol] ?? '').replace(/[$,\s]/g, ''))
    if (client && !isNaN(val) && val > 0) {
      result[client] = (result[client] ?? 0) + val
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

    if (skipProjection.some(k => l.includes(k))) continue
    if (!isDataSheet(sheetName)) continue

    const ws     = wb.Sheets[sheetName]
    const parsed = parseSheet(ws, sheetName)

    if (parsed.length > 0) {
      allRows.push(...parsed)
      if (allRows.length === parsed.length) mainSheetName = sheetName
    }
  }

  return {
    rows:        allRows,
    projections,
    filename:    mainSheetName,
  }
}
