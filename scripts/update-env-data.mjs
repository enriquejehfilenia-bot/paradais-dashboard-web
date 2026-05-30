/**
 * Script local para procesar el Excel y actualizar DASHBOARD_DATA_GZ via Vercel CLI.
 * Uso: node scripts/update-env-data.mjs <ruta-excel>
 *
 * Requiere: npm run build previo o que xlsx esté en node_modules
 */

import XLSX from 'xlsx'
import { gzip } from 'zlib'
import { promisify } from 'util'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const gzipAsync = promisify(gzip)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Utilidades ──────────────────────────────────────────────────────────────

function nfd(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function normalizeDept(raw) {
  if (!raw) return 'Otros'
  const t = raw.trim()
  if (!t) return 'Otros'
  const l = nfd(t)
  if (l === 'departamento') return '__SKIP__'
  if (l.includes('medios atl'))     return 'Medios ATL'
  if (l.includes('medios digital')) return 'Medios Digitales'
  if (l.includes('contenido'))      return 'Contenido Digital'
  if (l.includes('creatividad') || l.includes('creativ')) return 'Creatividad'
  if (l.includes('producc') || l.includes('produc'))      return 'Producción'
  if (l.includes('influencer'))     return 'Influencers'
  if (l.includes('btl'))            return 'BTL'
  if (l.includes('fee'))            return 'Fee'
  if (l.includes('planif') || l.includes('estrateg')) return 'Planificación Estratégica'
  if (l.includes('activac'))        return 'Activaciones'
  if (l.includes('event'))          return 'Eventos'
  if (l.includes('trade'))          return 'Trade Marketing'
  if (l.includes('rrpp') || l.includes('relac')) return 'RRPP'
  if (l.includes('atl'))            return 'Medios ATL'
  if (l.includes('digital'))        return 'Medios Digitales'
  return t
}

const CIUDAD_MAP = [
  ['quito','Quito'],['guayaquil','Guayaquil'],['gye','Guayaquil'],
  ['cuenca','Cuenca'],['ambato','Ambato'],['manta','Manta'],
  ['loja','Loja'],['machala','Machala'],['esmeraldas','Esmeraldas'],
  ['santo domingo','Santo Domingo'],
]
function normalizeCiudad(raw) {
  if (!raw) return ''
  const l = raw.trim()
  if (/^(n\/a|#n\/a|na|null|none|-)$/i.test(l)) return ''
  const ll = nfd(l)
  for (const [k,v] of CIUDAD_MAP) {
    if (ll === k || ll.startsWith(k)) return v
  }
  return l
}

const SHEET_MES = {
  enero:1,ene:1,jan:1,january:1,
  febrero:2,feb:2,february:2,
  marzo:3,mar:3,march:3,
  abril:4,abr:4,april:4,
  mayo:5,may:5,
  junio:6,jun:6,june:6,
  julio:7,jul:7,july:7,
  agosto:8,ago:8,august:8,
  septiembre:9,sep:9,sept:9,september:9,
  octubre:10,oct:10,october:10,
  noviembre:11,nov:11,november:11,
  diciembre:12,dic:12,december:12,
}

function sheetFallbackMes(sheetName) {
  const l = nfd(sheetName)
  for (const [k,m] of Object.entries(SHEET_MES)) {
    if (l.startsWith(k) || l.includes(k)) {
      return new Date(2000, m-1, 1).toLocaleString('es-EC', { month: 'long' }).toUpperCase()
    }
  }
  return ''
}

function detectEmpresa(sheetName, a1Val) {
  const sl = nfd(sheetName), al = nfd(a1Val)
  if (sl.includes('paramedia') || sl.includes('media')) return 'Paradais Media'
  if (al.includes('paramedia') || al.includes('media')) return 'Paradais Media'
  return 'Paradais'
}

function colMatch(kl, key) { return kl === key || kl.startsWith(key) }

// Busca por orden de columnas (primera columna que coincida con cualquier clave)
function colVal(row, ...keys) {
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

// Busca por prioridad de clave (prueba cada clave en todas las columnas antes de pasar a la siguiente)
// Usar para campos donde la prioridad de nombre importa más que la posición de columna
function colValPriority(row, ...keys) {
  for (const key of keys) {
    for (const k of Object.keys(row)) {
      if (colMatch(nfd(k), key)) {
        const v = row[k]
        if (v instanceof Date) return v.toISOString()
        const s = String(v ?? '').trim()
        if (s) return s
      }
    }
  }
  return ''
}

function colRaw(row, ...keys) {
  for (const k of Object.keys(row)) {
    const kl = nfd(k)
    if (keys.some(key => colMatch(kl, key))) return row[k]
  }
  return null
}

function colNum(row, ...keys) {
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

function toIso(val) {
  if (val === null || val === undefined || val === '') return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val.toISOString()
  if (typeof val === 'number') {
    try {
      const p = XLSX.SSF.parse_date_code(val)
      if (p && p.y > 1900) {
        const d = new Date(Date.UTC(p.y, p.m-1, p.d))
        return isNaN(d.getTime()) ? null : d.toISOString()
      }
    } catch {}
    return null
  }
  const s = String(val).trim()
  if (!s) return null
  const ddmm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (ddmm) {
    const dd = parseInt(ddmm[1]), mm = parseInt(ddmm[2])
    let yy = parseInt(ddmm[3])
    if (yy < 100) yy += 2000
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const d = new Date(Date.UTC(yy, mm-1, dd))
      if (!isNaN(d.getTime())) return d.toISOString()
    }
    if (dd >= 1 && dd <= 12 && mm >= 1 && mm <= 31) {
      const d = new Date(Date.UTC(yy, dd-1, mm))
      if (!isNaN(d.getTime())) return d.toISOString()
    }
  }
  try { const d = new Date(s); return isNaN(d.getTime()) ? null : d.toISOString() } catch { return null }
}

const HEADER_KEYS = ['fecha','codigo','cliente','tipo','departamento','ciudad','venta','base','costo','margen','rentab','total','ingreso']
const SKIP_SHEETS = ['modelo','resumen','plantilla','template','summary','formato','concili','proyecc','presup','meta','budget','consolidado']

function findHeaderRow(ws) {
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

function parseSheet(ws, sheetName = '', empresa = 'Paradais') {
  const headerIdx = findHeaderRow(ws)
  const rawData = XLSX.utils.sheet_to_json(ws, { raw: true, defval: '', range: headerIdx })
  const sheetMes = sheetFallbackMes(sheetName)
  const rows = []

  for (const raw of rawData) {
    // Prioridad: 'cliente' > 'cuenta' > 'client' > 'razon' > 'empresa'
    // (usamos colValPriority para que 'cliente' gane aunque 'Empresa' esté antes en columnas)
    const cliente = colValPriority(raw, 'cliente','cuenta','client','razon','empresa')
    if (!cliente || /^(total|subtotal|suma)/i.test(cliente.trim())) continue

    const deptRaw = colVal(raw, 'departamento','depto','dept','area','servicio','linea')
    const dept = normalizeDept(deptRaw)
    if (dept === '__SKIP__') continue

    const baseIva  = colNum(raw, 'base iva','base_iva','total_venta','venta_real','venta','ingreso','revenue','facturado','honorario')
    const comision = colNum(raw, 'comis','commission','comision','comission')
    const totalVenta = baseIva + comision
    if (totalVenta === 0) continue

    const costos = colNum(raw, 'costo real','costo_real','costo','cost','gasto','egreso')
    const margen  = totalVenta - costos
    const rentab  = totalVenta > 0 ? (margen / totalVenta) * 100 : 0

    const fechaRaw = colRaw(raw, 'fecha','date')
    const fecha    = toIso(fechaRaw)

    // Leer columna 'Mes' directamente si existe (e.g. "ENERO", "FEBRERO"…)
    const mesCol = colVal(raw, 'mes','month').toUpperCase().trim()
    const MES_NAMES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                       'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
    const mesFromCol = MES_NAMES.find(m => mesCol.startsWith(m.slice(0,3))) ?? ''

    let mes
    if (sheetMes) {
      mes = sheetMes
    } else if (mesFromCol) {
      mes = mesFromCol
    } else if (fecha) {
      try { mes = new Date(fecha).toLocaleString('es-EC', { month: 'long' }).toUpperCase() }
      catch { mes = '' }
    } else {
      mes = ''
    }

    const tipo      = colVal(raw, 'tipo','type','categoria','category').toUpperCase()
    const ciudadRaw = colVal(raw, 'ciudad','city','ubicacion','location','provincia','region','localidad')
    const ciudad    = normalizeCiudad(ciudadRaw)

    rows.push({
      fecha,
      cliente:             cliente.replace(/\s+/g, ' ').trim(),
      departamento_limpio: dept,
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

const PROJ_KEYS    = ['proyecc','presup','meta','budget','objetivo','anual','plan','target']
const CLIENT_KEYS  = ['client','cuenta','empresa','razon','nombre','cli']
const NUMERIC_SKIP = /^(total|subtotal|suma|grand|otros|n\/a|-)/i

function parseProjections(wb) {
  // Buscar hoja por nombre (proyeccion, presupuesto, meta, objetivo, plan, budget…)
  const name = wb.SheetNames.find(n => {
    const l = nfd(n)
    return PROJ_KEYS.some(k => l.includes(k))
  })
  if (!name) {
    console.log('⚠️  No se encontró hoja de proyecciones. Hojas:', wb.SheetNames.join(', '))
    return {}
  }
  console.log(`📋 Leyendo proyecciones de hoja: "${name}"`)

  const ws = wb.Sheets[name]
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // ── Detectar fila de encabezado ──────────────────────────────────────────
  let clientCol = -1, projCol = -1, headerRow = -1

  for (let r = 0; r < Math.min(rawRows.length, 30); r++) {
    const row = rawRows[r]
    let cm = -1, pm = -1
    for (let c = 0; c < row.length; c++) {
      const v = nfd(String(row[c] ?? ''))
      if (cm === -1 && CLIENT_KEYS.some(k => v.includes(k))) cm = c
      if (pm === -1 && PROJ_KEYS.some(k => v.includes(k)))   pm = c
    }
    if (cm >= 0 && pm >= 0) { clientCol = cm; projCol = pm; headerRow = r; break }
    // Encabezado con solo columna cliente (se buscará col numérica después)
    if (cm >= 0 && pm < 0 && headerRow < 0) { clientCol = cm; headerRow = r }
  }

  // Fallback: primera fila como header, col 0 cliente, col 1 proyección
  if (headerRow < 0) {
    console.log('⚠️  No se detectó encabezado en hoja proyecciones → usando col 0/1')
    clientCol = 0; projCol = 1; headerRow = 0
  }

  // Si no encontramos columna de proyección, buscar primera columna numérica tras clientCol
  if (projCol < 0) {
    for (let r = headerRow + 1; r < Math.min(rawRows.length, headerRow + 10); r++) {
      const row = rawRows[r]
      for (let c = 0; c < row.length; c++) {
        if (c === clientCol) continue
        if (typeof row[c] === 'number' && row[c] > 0) { projCol = c; break }
      }
      if (projCol >= 0) break
    }
    if (projCol < 0) projCol = clientCol === 0 ? 1 : 0
    console.log(`⚠️  Columna proyección detectada por posición: col ${projCol}`)
  }

  // ── Leer filas de datos ───────────────────────────────────────────────────
  const result = {}
  for (let r = headerRow + 1; r < rawRows.length; r++) {
    const row = rawRows[r]
    if (!row || row.length === 0) continue

    const client = String(row[clientCol] ?? '').replace(/\s+/g, ' ').trim()
    if (!client || NUMERIC_SKIP.test(client)) continue

    // Valor en columna proyección principal
    let val = typeof row[projCol] === 'number'
      ? row[projCol]
      : parseFloat(String(row[projCol] ?? '').replace(/[$,.\s]/g, '').replace(',', '.'))

    // Fallback: sumar todas las columnas numéricas > 0 de la fila (excluyendo clientCol)
    if (isNaN(val) || val <= 0) {
      val = 0
      for (let c = 0; c < row.length; c++) {
        if (c === clientCol) continue
        const n = typeof row[c] === 'number'
          ? row[c]
          : parseFloat(String(row[c] ?? '').replace(/[$,\s]/g, ''))
        if (!isNaN(n) && n > 0) val += n
      }
    }

    if (client && val > 0) {
      result[client] = (result[client] ?? 0) + val
    }
  }

  console.log(`✅ Proyecciones: ${Object.keys(result).length} clientes →`, Object.keys(result).slice(0, 6).join(', '))
  return result
}

function parseExcel(buffer) {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
  const projections = parseProjections(wb)
  const allRows = []
  let mainSheetName = wb.SheetNames[0]

  for (const sheetName of wb.SheetNames) {
    const l = nfd(sheetName)
    if (SKIP_SHEETS.some(k => l.includes(k))) continue
    if (PROJ_KEYS.some(k => l.includes(k))) continue

    const ws = wb.Sheets[sheetName]
    const a1Cell = ws['A1']
    const a1Val  = a1Cell?.v ? String(a1Cell.v).trim() : ''
    const empresa = detectEmpresa(sheetName, a1Val)

    const parsed = parseSheet(ws, sheetName, empresa)
    if (parsed.length > 0) {
      allRows.push(...parsed)
      if (allRows.length === parsed.length) mainSheetName = sheetName
    }
  }
  return { rows: allRows, projections, filename: mainSheetName }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const excelPath = process.argv[2]
if (!excelPath) {
  console.error('Uso: node scripts/update-env-data.mjs <ruta-excel>')
  process.exit(1)
}

console.log(`📂 Procesando: ${excelPath}`)
const buffer = readFileSync(excelPath)
const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

const { rows, projections, filename } = parseExcel(ab)
console.log(`✅ Filas procesadas: ${rows.length}`)

// Resumen rápido
const empresas = {}
const deptos   = {}
const meses    = {}
for (const r of rows) {
  empresas[r.empresa] = (empresas[r.empresa] || 0) + 1
  deptos[r.departamento_limpio] = (deptos[r.departamento_limpio] || 0) + 1
  meses[r.mes] = (meses[r.mes] || 0) + 1
}
console.log('\n📊 Empresas:', JSON.stringify(empresas))
console.log('📊 Top depts:', Object.entries(deptos).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`${k}:${v}`).join(', '))
console.log('📊 Meses:', JSON.stringify(meses))

const ventas = rows.reduce((s,r) => s + r.total_venta_real, 0)
const costos = rows.reduce((s,r) => s + r.costos, 0)
const margen = ventas - costos
console.log(`\n💰 Ventas: $${ventas.toLocaleString('es-EC', {minimumFractionDigits:0})}`)
console.log(`💰 Costos: $${costos.toLocaleString('es-EC', {minimumFractionDigits:0})}`)
console.log(`💰 Margen: $${margen.toLocaleString('es-EC', {minimumFractionDigits:0})}`)
console.log(`💰 Rentab: ${ventas > 0 ? ((margen/ventas)*100).toFixed(2) : 0}%`)

// ── Formato columnar compacto (v2) ────────────────────────────────────────────
// Pools de strings (cardinalidad baja)
const poolCli = [], poolDept = [], poolTipo = [], poolCiud = [], poolEmp = [], poolMes = []
function idxOf(pool, val) {
  let i = pool.indexOf(val); if (i === -1) { i = pool.length; pool.push(val) } return i
}

// Cada fila: [ci, di, ti, cii, ei, mi, fd, tv, co]
// fd = días desde epoch (1970-01-01), -1 si null
// tv/co = floats exactos del Excel, sin redondeo → la suma total es exacta
const colRows = rows.map(r => [
  idxOf(poolCli,  r.cliente),
  idxOf(poolDept, r.departamento_limpio),
  idxOf(poolTipo, r.tipo),
  idxOf(poolCiud, r.ciudad),
  idxOf(poolEmp,  r.empresa),
  idxOf(poolMes,  r.mes),
  r.fecha ? Math.round(new Date(r.fecha).getTime() / 86400000) : -1,
  r.total_venta_real,
  r.costos,
])

console.log(`\n🏷️  Pools — Clientes: ${poolCli.length}, Depts: ${poolDept.length}, Tipos: ${poolTipo.length}, Ciudades: ${poolCiud.length}, Empresas: ${poolEmp.length}, Meses: ${poolMes.length}`)

// Payload v2 columnar
const slim = {
  pc:   poolCli,
  pd:   poolDept,
  pt:   poolTipo,
  pci:  poolCiud,
  pe:   poolEmp,
  pm:   poolMes,
  r:    colRows,
  proj: projections,
  fn:   filename,
  rc:   rows.length,
  ua:   new Date().toISOString().slice(0, 10),
  // Totales pre-calculados en Node.js (evita error de acumulación float en browser)
  tv:   Math.round(ventas),
  tc:   Math.round(costos),
  tm:   Math.round(margen),
}
const compressed = await gzipAsync(Buffer.from(JSON.stringify(slim), 'utf-8'))
const b64 = compressed.toString('base64')
console.log(`\n📦 Tamaño comprimido: ${(b64.length/1024).toFixed(1)} KB`)

// Guardar en archivo temporal para pasarlo al CLI
const tmpFile = path.join(__dirname, '../.env-data-tmp')
writeFileSync(tmpFile, b64, 'utf-8')

try {
  console.log('\n🔄 Actualizando DASHBOARD_DATA_GZ via Vercel CLI...')

  // Eliminar el env var existente
  try {
    execSync('npx vercel env rm DASHBOARD_DATA_GZ production --yes', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
  } catch {}

  // Agregar el nuevo valor
  execSync(`npx vercel env add DASHBOARD_DATA_GZ production < "${tmpFile}"`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    shell: true,
  })

  console.log('✅ Env var actualizado')
} finally {
  try { unlinkSync(tmpFile) } catch {}
}

console.log('\n🚀 Iniciando redeploy...')
const deployOutput = execSync('npx vercel --prod --yes 2>&1', {
  cwd:      path.join(__dirname, '..'),
  encoding: 'utf-8',
})
console.log(deployOutput)

// Extraer la URL del deploy recién creado y re-asignar el alias de producción principal
const deployUrlMatch = deployOutput.match(/https:\/\/(web-\w+-enriquejehfilenia-bots-projects\.vercel\.app)/)
if (deployUrlMatch) {
  const deployUrl = deployUrlMatch[1]
  console.log(`\n🔗 Actualizando alias paradaisddb-ventas-medios.vercel.app → ${deployUrl}`)
  try {
    execSync(`npx vercel alias set ${deployUrl} paradaisddb-ventas-medios.vercel.app`, {
      stdio: 'inherit', cwd: path.join(__dirname, '..')
    })
    console.log('✅ Alias actualizado')
  } catch (e) {
    console.warn('⚠️  No se pudo actualizar el alias automáticamente:', e.message)
  }
}

console.log('\n✅ LISTO. El dashboard ahora muestra los datos nuevos.')
