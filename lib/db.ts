/**
 * Capa de almacenamiento — In-Memory Cache + process.env fallback
 *
 * Estrategia:
 *  1. Los datos parseados del Excel se comprimen (gzip) y codifican en base64.
 *  2. La cadena comprimida se guarda en process.env.DASHBOARD_DATA_GZ mediante el
 *     script local scripts/update-env-data.mjs (que usa Vercel CLI con OAuth).
 *  3. En memoria (módulo-level) se guarda una copia para requests rápidos.
 *  4. En cold start se lee DASHBOARD_DATA_GZ del proceso (baked-in al deploy).
 *
 * No se necesita VERCEL_TOKEN — el env var se gestiona vía CLI local.
 */

import { gzip, gunzip } from 'zlib'
import { promisify } from 'util'

const gzipAsync   = promisify(gzip)
const gunzipAsync = promisify(gunzip)

export interface StoredData {
  records:     string   // JSON array
  projections: string   // JSON object
  excel_b64:   string
  filename:    string
  row_count:   number
  updated_at:  string
  // Pre-computed totals (script-side, IEEE-754 safe)
  total_ventas?: number | null
  total_costos?: number | null
  total_margen?: number | null
}

/* ── Cache en memoria (persiste mientras la instancia esté caliente) ── */
let memStore: StoredData | null = null

/* ── Clave del env var ── */
const ENV_KEY = 'DASHBOARD_DATA_GZ'

/* ── Comprime y codifica datos para almacenarlos ── */
export async function compress(data: StoredData): Promise<string> {
  const slim = {
    records:     data.records,
    projections: data.projections,
    filename:    data.filename,
    row_count:   data.row_count,
    updated_at:  data.updated_at,
  }
  const json = JSON.stringify(slim)
  const compressed = await gzipAsync(Buffer.from(json, 'utf-8'))
  return compressed.toString('base64')
}

/* ── Descomprime datos — soporta formato v2 columnar y v1 legacy ── */
async function decompress(b64: string): Promise<StoredData | null> {
  try {
    const buf = Buffer.from(b64, 'base64')
    const decompressed = await gunzipAsync(buf)
    const obj = JSON.parse(decompressed.toString('utf-8'))

    // Formato v2 columnar: tiene array 'r' con índices a pools
    if (Array.isArray(obj.r)) {
      const pc  = (obj.pc  as string[]) ?? []
      const pd  = (obj.pd  as string[]) ?? []
      const pt  = (obj.pt  as string[]) ?? []
      const pci = (obj.pci as string[]) ?? []
      const pe  = (obj.pe  as string[]) ?? []
      const pm  = (obj.pm  as string[]) ?? []

      const expandedRows = (obj.r as number[][]).map(row => {
        const [ci, di, ti, cii, ei, mi, fd, tv, co] = row
        const total_venta_real = tv ?? 0
        const costos           = co ?? 0
        const margen           = total_venta_real - costos
        const rentabilidad_pct = total_venta_real > 0
          ? Math.round((margen / total_venta_real) * 10000) / 100
          : 0
        const fecha = (fd === -1 || fd == null)
          ? null
          : new Date(fd * 86400000).toISOString()
        return {
          fecha,
          cliente:             pc[ci]  ?? '',
          departamento_limpio: pd[di]  ?? '',
          tipo:                pt[ti]  ?? '',
          ciudad:              pci[cii] ?? '',
          empresa:             pe[ei]  ?? '',
          total_venta_real,
          costos,
          margen,
          rentabilidad_pct,
          mes:                 pm[mi]  ?? '',
        }
      })

      return {
        records:     JSON.stringify(expandedRows),
        projections: JSON.stringify(obj.proj ?? {}),
        excel_b64:   '',
        filename:    obj.fn  ?? '',
        row_count:   obj.rc  ?? expandedRows.length,
        updated_at:  obj.ua  ?? '',
        // Totales pre-calculados por el script (exactos, sin float acumulado)
        total_ventas: obj.tv ?? null,
        total_costos: obj.tc ?? null,
        total_margen: obj.tm ?? null,
      }
    }

    // Formato v1 legacy: tiene clave 'records' con JSON serializado
    return { ...obj, excel_b64: '' } as StoredData
  } catch {
    return null
  }
}

/* ── Guarda datos en memoria ── */
export async function saveData(data: StoredData) {
  memStore = data
  console.log(`Data saved to memory: ${data.row_count} rows, filename: ${data.filename}`)
}

/* ── Recupera datos ── */
export async function getData(): Promise<StoredData | null> {
  // 1. Cache en memoria (rápido, misma instancia caliente)
  if (memStore) return memStore

  // 2. Env var baked-in al deploy (gestionado por scripts/update-env-data.mjs)
  const envVal = process.env[ENV_KEY]
  if (envVal) {
    try {
      const data = await decompress(envVal)
      if (data) {
        memStore = data
        console.log(`Data loaded from env var: ${data.row_count} rows`)
        return data
      }
    } catch (e) {
      console.error('decompress error:', e)
    }
  }

  return null
}
