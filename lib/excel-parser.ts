import * as XLSX from 'xlsx'

/* ── Utilidades de normalización de strings ── */
function nfd(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/* ── Normaliza departamento según los nombres reales del Excel ──
   Estrategia: includes() para agrupar variantes (Comision, Reembolso, Over, Otros, -)
   NUNCA inventa nombres que no existan en la fuente.
   Retorna '__SKIP__' para filas de cabecera filtradas como dato.
── */
function normalizeDept(raw: string): string {
  if (!raw) return 'Otros'
  const trimmed = raw.trim()
  if (!trimmed) return 'Otros'

  const l = nfd(trimmed)

  // Filtrar filas de encabezado que se cuelan como dato
  if (l === 'departamento') return '__SKIP__'

  // Orden importa: más específico primero
  if (l.includes('medios atl'))        return 'Medios ATL'
  if (l.includes('medios digital'))    return 'Medios Digitales'
  if (l.includes('contenido'))         return 'Contenido Digital'
  if (l.includes('creatividad') ||
      l.includes('creativ'))           return 'Creatividad'
  if (l.includes('producc') ||
      l.includes('produc'))            return 'Producción'
  if (l.includes('influencer'))        return 'Influencers'
  if (l.includes('btl'))               return 'BTL'
  if (l.includes('fee'))               return 'Fee'
  if (l.includes('planif') ||
      l.includes('estrateg'))          return 'Planificación Estratégica'
  if (l.includes('activac'))           return 'Activaciones'
  if (l.includes('event'))             return 'Eventos'
  if (l.includes('trade'))             return 'Trade Marketing'
  if (l.includes('rrpp') ||
      l.includes('relac'))             return 'RRPP'
  // Fallbacks genéricos por tipo de medio
  if (l.includes('atl'))               return 'Medios ATL'
  if (l.includes('digital'))           return 'Medios Digitales'

  // Sin match: devolver el valor original limpio
  return trimmed
}

/* ── Normaliza ciudad ── */
const CIUDAD_MAP: [string, string][] = [
  ['quito',         'Quito'],
  ['guayaquil',     'Guayaquil'],
  ['gye',           'Guayaquil'],
  ['cuenca',        'Cuenca'],
  ['ambato',        'Ambato'],
  ['manta',         'Manta'],
  ['loja',          'Loja'],
  ['machala',       'Machala'],
  ['esmeraldas',    'Esmeraldas'],
  ['santo domingo', 'Santo Domingo'],
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

/* ── Detecta empresa desde nombre de hoja o celda A1 ── */
function detectEmpresa(sheetName: string, a1Val: string): string {
  const sheetL = nfd(sheetName)
  const a1l    = nfd(a1Val)
  // Chequear nombre de hoja primero (más confiable)
  if (sheetL.includes('paramedia') || sheetL.includes('media')) return 'Paradais Media'
  // Luego A1
  if (a1l.includes('paramedia') || a1l.includes('media'))       return 'Paradais Media'
  // Default
  return 'Paradais'
}

/* ── Mapa nombre de hoja → mes (solo mes, sin año para que TrendChart funcione) ── */
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

/*
  Retorna el nombre del mes en MAYÚSCULAS sin año (ej: "ENERO").
  TrendChart agrupa por este valor y lo mapea contra MES_ORD.
  Si no detecta mes en el nombre de hoja, retorna '' (el mes vendrá de la fecha).
*/
function sheetFallbackMes(sheetName: string): string {
  const l = nfd(sheetName)
  for (const [k, m] of Object.entries(SHEET_MES)) {
    if (l.startsWith(k) || l.includes(k)) {
      // Nombre del mes en español, mayúsculas
      return new Date(2000, m - 1, 1)
        .toLocaleString('es-EC', { month: 'long' })
        .toUpperCase()
    }
  }
  return ''
}

/* ── Tipos excluidos del ranking privado ── */
export const TIPOS_EXCL = new Set([
  'PÚBLICO', 'PUBLICO', 'RELACIONADO', 'RELACIONADOS',
  'PÃBLICO', 'PUUBLICO', 'PUBLIC',
])

/* ── Interfaz de fila ── */
export interface DataRow {
  fecha:               string | null
  cliente:             string
  departamento_limpio: string
  tipo:                string
  ciudad:              string
  empresa:             string   // 'Paradais' | 'Paradais Media'
  total_venta_real:    number
  costos:              number
  margen:              number
  rentabilidad_pct:    number
  mes:                 string   // Nombre del mes en MAYÚSCULAS, ej: "ENERO"
}

/* ── Palabras clave de cabecera ── */
const HEADER_KEYS = [
  'fecha','codigo','cliente','tipo','departamento',
  'ciudad','venta','base','costo','margen','rentab','total','ingreso',
]

/* ── Hojas a ignorar ── */
const SKIP_SHEETS = [
  'modelo','resumen','plantilla','template','summary','formato','concili',
]

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

/* ── Retorna el valor RAW de una columna ── */
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
      if (typeof raw === 'number') return isNaN(raw) ? 0 : raw
      const v = String(raw ?? '').replace(/[$,\s]/g, '')
      const n = parseFloat(v)
      return isNaN(n) ? 0 : n
    }
  }
  return 0
}

/* ── Convierte un valor de fecha a ISO string ──
   Prioridad:
   1. Date object nativo (cellDates:true) → directo
   2. Número serial de Excel → XLSX.SSF
   3. String DD/MM/YY (formato Ecuador) → regex
   4. String genérico → new Date()
── */
function toIso(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString()
  }

  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val)
      if (parsed && parsed.y > 1900) {
        const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
        return isNaN(d.getTime()) ? null : d.toISOString()
      }
    } catch { /* continuar */ }
    return null
  }

  const s = String(val).trim()
  if (!s) return null

  // DD/MM/YY o DD/MM/YYYY (formato Ecuador — siempre asumir DD/MM primero)
  const ddmm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (ddmm) {
    const dd = parseInt(ddmm[1]), mm = parseInt(ddmm[2])
    let yy = parseInt(ddmm[3])
    if (yy < 100) yy += 2000
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const d = new Date(Date.UTC(yy, mm - 1, dd))
      if (!isNaN(d.getTime())) return d.toISOString()
    }
    // Fallback MM/DD si DD/MM inválido
    if (dd >= 1 && dd <= 12 && mm >= 1 && mm <= 31) {
      const d = new Date(Date.UTC(yy, dd - 1, mm))
      if (!isNaN(d.getTime())) return d.toISOString()
    }
  }

  try {
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch { return null }
}

/* ── Parsea una hoja de datos ── */
function parseSheet(
  ws:        XLSX.WorkSheet,
  sheetName: string = '',
  empresa:   string = 'Paradais',
): DataRow[] {
  const headerRowIdx = findHeaderRow(ws)
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw:    true,   // fechas como Date, números como number
    defval: '',
    range:  headerRowIdx,
  })

  /*
    mes viene del nombre de la hoja cuando es posible (ENERO, FEBRERO…).
    Esto es más confiable que parsear la celda de fecha.
    Formato: MAYÚSCULAS sin año → "ENERO", "FEBRERO", etc.
    TrendChart usa este formato directamente.
  */
  const sheetMes = sheetFallbackMes(sheetName)

  const rows: DataRow[] = []

  for (const raw of rawData) {
    const cliente = colVal(raw, 'cliente','cuenta','client','empresa','razon')
    if (!cliente || /^(total|subtotal|suma)/i.test(cliente.trim())) continue

    // Departamento — filtrar filas de cabecera que se cuelan
    const deptRaw           = colVal(raw, 'departamento','depto','dept','area','servicio','linea')
    const departamento_limpio = normalizeDept(deptRaw)
    if (departamento_limpio === '__SKIP__') continue

    // Ventas = Base Iva + Comisión (ambas son ingresos del cliente)
    const baseIva   = colNum(raw, 'base iva','base_iva','total_venta','venta_real','venta',
                              'ingreso','revenue','facturado','honorario')
    const comision  = colNum(raw, 'comis','commission','comision','comission')
    const totalVenta = baseIva + comision
    if (totalVenta === 0) continue

    const costos = colNum(raw, 'costo real','costo_real','costo','cost','gasto','egreso')
    const margen  = totalVenta - costos

    // % Rentabilidad: siempre recalculada sobre venta real total
    const rentab = totalVenta > 0 ? (margen / totalVenta) * 100 : 0

    // Fecha
    const fechaRaw = colRaw(raw, 'fecha','date')
    const fecha    = toIso(fechaRaw)

    // Mes — prioridad: nombre de hoja (más confiable) → derivado de fecha → vacío
    let mes: string
    if (sheetMes) {
      mes = sheetMes
    } else if (fecha) {
      try {
        mes = new Date(fecha)
          .toLocaleString('es-EC', { month: 'long' })
          .toUpperCase()
      } catch { mes = '' }
    } else {
      mes = ''
    }

    const tipo      = colVal(raw, 'tipo','type','categoria','category').toUpperCase()
    const ciudadRaw = colVal(raw, 'ciudad','city','ubicacion','location','provincia','region','localidad')
    const ciudad    = normalizeCiudad(ciudadRaw)

    rows.push({
      fecha,
      cliente:             cliente.replace(/\s+/g, ' ').trim(),
      departamento_limpio,
      tipo,
      ciudad,
      empresa,
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

    const ws = wb.Sheets[sheetName]

    // Leer celda A1 para detectar empresa (respaldo al nombre de hoja)
    const a1Cell = ws['A1']
    const a1Val  = a1Cell?.v ? String(a1Cell.v).trim() : ''
    const empresa = detectEmpresa(sheetName, a1Val)

    const parsed = parseSheet(ws, sheetName, empresa)

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
