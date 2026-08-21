/**
 * Script para procesar INVERSION 2026 Medios.xlsx y subirlo al Vercel Blob store
 * (medios-data.json.gz, privado). Formato columnar compacto con pools de strings.
 * No requiere redeploy — el server lee el blob en el próximo request.
 * Uso: node scripts/update-medios-data.mjs <ruta-excel>
 */

import XLSX from 'xlsx'
import { gzip } from 'zlib'
import { promisify } from 'util'
import { readFileSync, existsSync } from 'fs'
import { put } from '@vercel/blob'
import path from 'path'
import { fileURLToPath } from 'url'

const gzipAsync = promisify(gzip)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

function nfd(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
function clean(s) { return String(s ?? '').replace(/\s+/g, ' ').trim() }

function colNum(row, ...keys) {
  for (const k of Object.keys(row)) {
    const kl = nfd(k)
    if (keys.some(key => kl.includes(nfd(key)))) {
      const raw = row[k]
      if (typeof raw === 'number') return isNaN(raw) ? 0 : raw
      const n = parseFloat(String(raw ?? '').replace(/[$,\s]/g, ''))
      return isNaN(n) ? 0 : n
    }
  }
  return 0
}
function colStr(row, ...keys) {
  for (const k of Object.keys(row)) {
    const kl = nfd(k)
    if (keys.some(key => kl.includes(nfd(key)))) return clean(row[k])
  }
  return ''
}
// Como colNum/colStr matchean por substring, columnas cortas como "Total" quedan
// atrapadas por "SubTotal". colNumExact prueba igualdad exacta de nombre primero.
function colNumExact(row, exactKeys, fuzzyKeys) {
  for (const k of Object.keys(row)) {
    const kl = nfd(k)
    if (exactKeys.some(e => kl === nfd(e))) {
      const raw = row[k]
      if (typeof raw === 'number') return isNaN(raw) ? 0 : raw
      const n = parseFloat(String(raw ?? '').replace(/[$,\s]/g, ''))
      return isNaN(n) ? 0 : n
    }
  }
  return colNum(row, ...fuzzyKeys)
}

const MES_NUM = {1:'ENERO',2:'FEBRERO',3:'MARZO',4:'ABRIL',5:'MAYO',6:'JUNIO',
  7:'JULIO',8:'AGOSTO',9:'SEPTIEMBRE',10:'OCTUBRE',11:'NOVIEMBRE',12:'DICIEMBRE'}

function normalizeMes(val) {
  if (!val && val !== 0) return ''
  if (typeof val === 'number') return MES_NUM[val] ?? ''
  const s = String(val).trim().toUpperCase()
  for (const m of Object.values(MES_NUM)) if (m.startsWith(s.slice(0,3))) return m
  return s
}

function idx(pool, val) {
  let i = pool.indexOf(val)
  if (i === -1) { i = pool.length; pool.push(val) }
  return i
}

function r2(n) { return Math.round(n) }

// ── Main ─────────────────────────────────────────────────────────────────────
const excelPath = process.argv[2]
if (!excelPath) { console.error('Uso: node scripts/update-medios-data.mjs <ruta-excel>'); process.exit(1) }

console.log(`📂 Procesando: ${excelPath}`)
const buffer = readFileSync(excelPath)
const wb = XLSX.read(new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
  { type: 'array', cellDates: true })

const sheetName = wb.SheetNames.find(n => nfd(n).includes('inversion')) ?? wb.SheetNames[0]
console.log(`📄 Leyendo hoja: "${sheetName}"`)
const ws = wb.Sheets[sheetName]

// Excel a veces infla el rango "usado" del sheet (ej. al hacer clic lejos de los
// datos) sin agregar filas reales. sheet_to_json con defval confía en ese rango
// y puede tardar minutos/colgarse si dice millones de filas. Se recorta al rango
// real (última fila con alguna celda) antes de convertir.
const declaredRange = XLSX.utils.decode_range(ws['!ref'])
let lastRealRow = 0
for (const addr of Object.keys(ws)) {
  if (addr[0] === '!') continue
  const r = XLSX.utils.decode_cell(addr).r
  if (r > lastRealRow) lastRealRow = r
}
if (lastRealRow < declaredRange.e.r) {
  console.log(`✂️  Rango declarado hasta fila ${declaredRange.e.r + 1}, datos reales hasta fila ${lastRealRow + 1} — recortando`)
  ws['!ref'] = XLSX.utils.encode_range({ s: declaredRange.s, e: { r: lastRealRow, c: declaredRange.e.c } })
}

const rawRows = XLSX.utils.sheet_to_json(ws, { raw: true, defval: '' })
console.log(`📊 Filas brutas: ${rawRows.length}`)

// ── Primera pasada: contar frecuencias de proveedor y razón social ───────────
const CAP_POOL = 60
const provFreq = {}, rsFreq = {}
for (const raw of rawRows) {
  const prov = (colStr(raw, 'proveedor', 'provider', 'prov') || 'OTROS').slice(0, 50)
  const rs   = (colStr(raw, 'razon social', 'razon_social', 'r.social', 'rs') || 'OTROS').slice(0, 50)
  provFreq[prov] = (provFreq[prov] ?? 0) + 1
  rsFreq[rs]     = (rsFreq[rs]     ?? 0) + 1
}
const topProv = new Set(Object.entries(provFreq).sort((a,b) => b[1]-a[1]).slice(0, CAP_POOL).map(([k]) => k))
const topRS   = new Set(Object.entries(rsFreq).sort((a,b) => b[1]-a[1]).slice(0, CAP_POOL).map(([k]) => k))
console.log(`🏭 Proveedores únicos: ${Object.keys(provFreq).length} → pool cap ${CAP_POOL}`)
console.log(`🏢 Razones Sociales únicas: ${Object.keys(rsFreq).length} → pool cap ${CAP_POOL}`)

// Pools de strings (se almacenan una sola vez)
const poolMes = [], poolCli = [], poolMed = [], poolTi  = []
const poolCat = [], poolTC  = [], poolProv = [], poolRS  = []
const poolGP  = []

// Filas v6: [mes_i, cli_i, med_i, ti_i, prov_i, rs_i, cat_i, tc_i, gp_i, vc, ib, cc, tf]
const rows = []

let skip = 0
for (const raw of rawRows) {
  const cliente = colStr(raw, 'cliente', 'client').slice(0, 50)
  if (!cliente || /^(total|subtotal|gran total|suma)/i.test(cliente)) { skip++; continue }

  const mesEjec = colStr(raw, 'mes de ejecucion', 'mes ejecucion', 'ejecucion')
  const mesNum  = colNum(raw, 'mes creacion', 'mes_creacion', 'mes')
  const mes     = mesEjec ? normalizeMes(mesEjec) : normalizeMes(mesNum)
  const medio   = (colStr(raw, 'medio', 'media').toUpperCase() || 'OTROS').slice(0, 15)
  const ti      = colStr(raw, 'tip inversion', 'tipo inversion', 'tip inv', 'tipo inv').slice(0, 35)
  const cat     = colStr(raw, 'categoria', 'category', 'categ').slice(0, 30)
  const tc      = colStr(raw, 'tipo de compra', 'tipo compra', 'tipo_compra', 'compra').slice(0, 30)
  const gp      = colStr(raw, 'grupo publicitario', 'grupo_publicitario').slice(0, 40)

  const provRaw = (colStr(raw, 'proveedor', 'provider', 'prov') || 'OTROS').slice(0, 50)
  // Nota: NO usar 'rs' como clave — coincide con "inve**rs**ion" de Tip Inversión (col B)
  const rsRaw   = (colStr(raw, 'razon social', 'razon_social', 'r.social', 'razon') || 'OTROS').slice(0, 50)
  const prov    = topProv.has(provRaw) ? provRaw : 'OTROS'
  const rs      = topRS.has(rsRaw)     ? rsRaw   : 'OTROS'

  // Nuevo libro (44 col, formato ledger): Valor Clte / Valor Proveedor / Val. Com. Cliente / Total.
  // "valor clte" y "com. cliente" son substrings únicos (no chocan con %Com.Clte. ni Fact.Com.).
  // "total" sí choca con "SubTotal" por substring → se resuelve por igualdad exacta primero.
  const vc = r2(colNum(raw, 'valor cliente', 'valor_cliente', 'valor clte'))
  const ib = r2(colNum(raw, 'inv. bruta', 'inv bruta', 'inversion bruta', 'consumo plataforma', 'valor proveedor'))
  const cc = r2(colNum(raw, '$ comision cliente', 'comision cliente', 'comision_cliente', 'com. cliente'))
  const tf = r2(colNumExact(raw, ['total'], ['total factura cliente', 'total factura', 'total_factura']))

  if (vc === 0 && tf === 0 && cc === 0) { skip++; continue }

  rows.push([
    idx(poolMes,  mes),
    idx(poolCli,  cliente),
    idx(poolMed,  medio),
    idx(poolTi,   ti),
    idx(poolProv, prov),
    idx(poolRS,   rs),
    idx(poolCat,  cat),
    idx(poolTC,   tc),
    idx(poolGP,   gp),
    vc, ib, cc, tf,
  ])
}

console.log(`✅ Registros: ${rows.length} (omitidos: ${skip})`)
console.log(`🏷️  Pools — Meses: ${poolMes.length}, Clientes: ${poolCli.length}, Medios: ${poolMed.length}, TipoInv: ${poolTi.length}`)
console.log(`   Proveedores: ${poolProv.length}, RS: ${poolRS.length}, Categorías: ${poolCat.length}, TipoCompra: ${poolTC.length}`)

// Resumen
const byMes = {}; const byMed = {}
for (const [mi,,mdi] of rows) {
  byMes[poolMes[mi]] = (byMes[poolMes[mi]]??0)+1
  byMed[poolMed[mdi]] = (byMed[poolMed[mdi]]??0)+1
}
console.log('\n📊 Meses:', JSON.stringify(byMes))
console.log('📊 Medios:', JSON.stringify(byMed))

// v6: [mes_i, cli_i, med_i, ti_i, prov_i, rs_i, cat_i, tc_i, gp_i, vc=9, ib=10, cc=11, tf=12]
const invCliente = rows.reduce((s,r) => s + r[9], 0)
const comision   = rows.reduce((s,r) => s + r[11], 0)
const totalFact  = rows.reduce((s,r) => s + r[12], 0)
console.log(`\n💰 Inv. Cliente:  $${Math.round(invCliente).toLocaleString('es-EC')}`)
console.log(`💰 Comisión:      $${Math.round(comision).toLocaleString('es-EC')}`)
console.log(`💰 Total Factura: $${Math.round(totalFact).toLocaleString('es-EC')}`)

// Formato columnar compacto v6
const payload = {
  pm:   poolMes,
  pc:   poolCli,
  pme:  poolMed,
  pt:   poolTi,
  pp:   poolProv,
  prs:  poolRS,
  pcat: poolCat,
  ptc:  poolTC,
  pgp:  poolGP,
  r:    rows,
  rc:   rows.length,
  ua:   new Date().toISOString().slice(0, 10),
}

const compressed = await gzipAsync(Buffer.from(JSON.stringify(payload), 'utf-8'))
const b64 = compressed.toString('base64')
console.log(`\n📦 Tamaño comprimido: ${(b64.length / 1024).toFixed(1)} KB (sin límite de 64KB — vive en Blob, no en env var)`)

// Vercel Blob — no requiere redeploy: el server lee el blob en caliente en el próximo request.
const envLocalPath = path.join(__dirname, '../.env.local')
if (!process.env.BLOB_READ_WRITE_TOKEN && existsSync(envLocalPath)) {
  const m = readFileSync(envLocalPath, 'utf-8').match(/^BLOB_READ_WRITE_TOKEN="?([^"\n\r]+)"?/m)
  if (m) process.env.BLOB_READ_WRITE_TOKEN = m[1]
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('\n❌ Falta BLOB_READ_WRITE_TOKEN (correr "npx vercel env pull .env.local" primero)')
  process.exit(1)
}

console.log('\n🔄 Subiendo a Vercel Blob (medios-data.json.gz)...')
const { url } = await put('medios-data.json.gz', b64, {
  access: 'private',
  contentType: 'text/plain',
  allowOverwrite: true,
})
console.log(`✅ Blob actualizado: ${url}`)

console.log('\n✅ LISTO — sin redeploy, ya está disponible en el próximo request.')
console.log('🌐 https://paradaisddb-ventas-medios.vercel.app/medios')
