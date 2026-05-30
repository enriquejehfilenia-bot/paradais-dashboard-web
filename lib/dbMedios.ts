/**
 * Almacenamiento para datos de Medios — espejo de db.ts pero con MEDIOS_DATA_GZ
 */
import { gzip, gunzip } from 'zlib'
import { promisify } from 'util'

const gzipAsync   = promisify(gzip)
const gunzipAsync = promisify(gunzip)

export interface MediosStoredData {
  records:    string  // JSON columnar payload (pm,pc,pme,pt,r arrays)
  row_count:  number
  updated_at: string
  filename:   string
}

let memStore: MediosStoredData | null = null
const ENV_KEY = 'MEDIOS_DATA_GZ'

export async function compressMedios(data: MediosStoredData): Promise<string> {
  const json = JSON.stringify(data)
  const compressed = await gzipAsync(Buffer.from(json, 'utf-8'))
  return compressed.toString('base64')
}

async function decompress(b64: string): Promise<MediosStoredData | null> {
  try {
    const buf = Buffer.from(b64, 'base64')
    const decompressed = await gunzipAsync(buf)
    const obj = JSON.parse(decompressed.toString('utf-8'))
    // Formato columnar: { pm, pc, pme, pt, r, rc, ua }
    // Lo envolvemos en MediosStoredData para que la API lo pueda expandir
    return {
      records:    JSON.stringify(obj),
      row_count:  obj.rc ?? 0,
      updated_at: obj.ua ?? '',
      filename:   'INVERSION 2026 Medios',
    } as MediosStoredData
  } catch {
    return null
  }
}

export async function saveMediosData(data: MediosStoredData) {
  memStore = data
  console.log(`Medios saved: ${data.row_count} rows`)
}

export async function getMediosData(): Promise<MediosStoredData | null> {
  if (memStore) return memStore
  const envVal = process.env[ENV_KEY]
  if (envVal) {
    try {
      const data = await decompress(envVal)
      if (data) { memStore = data; return data }
    } catch (e) {
      console.error('medios decompress error:', e)
    }
  }
  return null
}
