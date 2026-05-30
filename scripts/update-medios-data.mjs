/**
 * Script para procesar INVERSION 2026 Medios.xlsx y actualizar MEDIOS_DATA_GZ en Vercel.
 * Formato columnar compacto con pools de strings para minimizar tamaño del env var.
 * Uso: node scripts/update-medios-data.mjs <ruta-excel>
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

// Filas v5: [mes_i, cli_i, med_i, ti_i, prov_i, rs_i, cat_i, tc_i, vc, ib, cc, tf]
const rows = []

let skip = 0
for (const raw of rawRows) {
  const cliente = colStr(raw, 'cliente', 'client').slice(0, 50)
  if (!cliente || /^(total|subtotal|gran total|suma)/i.test(cliente)) { skip++; continue }

  const mesEjec = colStr(raw, 'mes de ejecucion', 'mes ejecucion', 'ejecucion')
  const mesNum  = colNum(raw, 'mes creacion', 'mes_creacion')
  const mes     = mesEjec ? normalizeMes(mesEjec) : normalizeMes(mesNum)
  const medio   = (colStr(raw, 'medio', 'media').toUpperCase() || 'OTROS').slice(0, 15)
  const ti      = colStr(raw, 'tip inversion', 'tipo inversion', 'tip inv', 'tipo inv').slice(0, 35)
  const cat     = colStr(raw, 'categoria', 'category', 'categ').slice(0, 30)
  const tc      = colStr(raw, 'tipo de compra', 'tipo compra', 'tipo_compra', 'compra').slice(0, 30)

  const provRaw = (colStr(raw, 'proveedor', 'provider', 'prov') || 'OTROS').slice(0, 50)
  // Nota: NO usar 'rs' como clave — coincide con "inve**rs**ion" de Tip Inversión (col B)
  const rsRaw   = (colStr(raw, 'razon social', 'razon_social', 'r.social', 'razon') || 'OTROS').slice(0, 50)
  const prov    = topProv.has(provRaw) ? provRaw : 'OTROS'
  const rs      = topRS.has(rsRaw)     ? rsRaw   : 'OTROS'

  const vc = r2(colNum(raw, 'valor cliente', 'valor_cliente'))
  const ib = r2(colNum(raw, 'inv. bruta', 'inv bruta', 'inversion bruta', 'consumo plataforma'))
  const cc = r2(colNum(raw, '$ comision cliente', 'comision cliente', 'comision_cliente'))
  const tf = r2(colNum(raw, 'total factura cliente', 'total factura', 'total_factura'))

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

// v5: [mes_i, cli_i, med_i, ti_i, prov_i, rs_i, cat_i, tc_i, vc=8, ib=9, cc=10, tf=11]
const invCliente = rows.reduce((s,r) => s + r[8], 0)
const comision   = rows.reduce((s,r) => s + r[10], 0)
const totalFact  = rows.reduce((s,r) => s + r[11], 0)
console.log(`\n💰 Inv. Cliente:  $${Math.round(invCliente).toLocaleString('es-EC')}`)
console.log(`💰 Comisión:      $${Math.round(comision).toLocaleString('es-EC')}`)
console.log(`💰 Total Factura: $${Math.round(totalFact).toLocaleString('es-EC')}`)

// Formato columnar compacto v5
const payload = {
  pm:   poolMes,
  pc:   poolCli,
  pme:  poolMed,
  pt:   poolTi,
  pp:   poolProv,
  prs:  poolRS,
  pcat: poolCat,
  ptc:  poolTC,
  r:    rows,
  rc:   rows.length,
  ua:   new Date().toISOString().slice(0, 10),
}

const compressed = await gzipAsync(Buffer.from(JSON.stringify(payload), 'utf-8'))
const b64 = compressed.toString('base64')
console.log(`\n📦 Tamaño comprimido: ${(b64.length / 1024).toFixed(1)} KB`)

const tmpFile = path.join(__dirname, '../.env-medios-tmp')
writeFileSync(tmpFile, b64, 'utf-8')

try {
  console.log('\n🔄 Actualizando MEDIOS_DATA_GZ via Vercel CLI...')
  try {
    execSync('npx vercel env rm MEDIOS_DATA_GZ production --yes', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
  } catch {}
  execSync(`npx vercel env add MEDIOS_DATA_GZ production < "${tmpFile}"`, {
    stdio: 'inherit', cwd: path.join(__dirname, '..'), shell: true,
  })
  console.log('✅ Env var actualizado')
} finally {
  try { unlinkSync(tmpFile) } catch {}
}

console.log('\n🚀 Iniciando redeploy...')
execSync('npx vercel --prod --yes', { stdio: 'inherit', cwd: path.join(__dirname, '..') })

// Actualizar alias
try {
  execSync('npx vercel alias set web-one-theta-31.vercel.app paradaisddb-ventas-medios.vercel.app 2>nul', {
    cwd: path.join(__dirname, '..'), shell: true, stdio: 'pipe'
  })
} catch {}

console.log('\n✅ LISTO.')
console.log('🌐 https://paradaisddb-ventas-medios.vercel.app/medios')
