/**
 * Almacenamiento para datos de Medios — Vercel Blob (privado).
 *
 * Antes vivía comprimido en process.env.MEDIOS_DATA_GZ, pero Vercel limita a 64KB
 * el total combinado de TODAS las env vars de un environment. Con el libro nuevo
 * (formato ledger detallado, crece cada mes) ese límite ya no alcanza. Blob no
 * tiene ese techo y además no requiere redeploy para reflejar datos nuevos.
 *
 * access: 'private' — el blob NO es accesible por URL pública. Solo se puede leer
 * server-side con get() usando BLOB_READ_WRITE_TOKEN (son datos de facturación real).
 */
import { gzip, gunzip } from 'zlib'
import { promisify } from 'util'
import { put, get } from '@vercel/blob'

const gzipAsync   = promisify(gzip)
const gunzipAsync = promisify(gunzip)

export interface MediosStoredData {
  records:    string  // JSON columnar payload (pm,pc,pme,pt,...,r arrays)
  row_count:  number
  updated_at: string
  filename:   string
}

// Ruta fija — cada actualización sobreescribe el mismo blob (allowOverwrite),
// así el runtime no tiene que rastrear URLs con hash que cambian por upload.
const BLOB_PATHNAME = 'medios-data.json.gz'

const CACHE_TTL_MS = 5 * 60_000 // 5 min: suficiente para no golpear Blob en cada request,
                                  // corto para que una actualización del .bat se refleje pronto
let memStore: MediosStoredData | null = null
let memStoreAt = 0

export async function compressMedios(data: MediosStoredData): Promise<string> {
  const json = JSON.stringify(data)
  const compressed = await gzipAsync(Buffer.from(json, 'utf-8'))
  return compressed.toString('base64')
}

/** Sube el payload (ya comprimido+base64) al Blob store, sobreescribiendo el anterior. */
export async function uploadMediosBlob(b64: string): Promise<string> {
  const { url } = await put(BLOB_PATHNAME, b64, {
    access: 'private',
    contentType: 'text/plain',
    allowOverwrite: true,
  })
  return url
}

async function decompress(b64: string): Promise<MediosStoredData | null> {
  try {
    const buf = Buffer.from(b64, 'base64')
    const decompressed = await gunzipAsync(buf)
    const obj = JSON.parse(decompressed.toString('utf-8'))
    // Formato columnar: { pm, pc, pme, pt, ..., r, rc, ua }
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
  memStoreAt = Date.now()
  console.log(`Medios saved: ${data.row_count} rows`)
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const chunks: Uint8Array[] = []
  const reader = stream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf-8')
}

export async function getMediosData(): Promise<MediosStoredData | null> {
  // 1. Cache en memoria de la instancia caliente — sin round-trip de red mientras
  //    esté vigente (TTL 5 min). Los datos solo cambian cuando Jehf corre
  //    ACTUALIZAR MEDIOS.bat (manual, poco frecuente), así que no hace falta
  //    re-chequear frescura en cada request — eso solo agrega latencia
  //    (~300-1000ms) sin beneficio real. Al vencer el TTL, o en una instancia
  //    fría nueva, se relee el Blob y se recogen los datos actualizados.
  if (memStore && Date.now() - memStoreAt < CACHE_TTL_MS) return memStore

  // 2. Blob store (fuente de verdad). useCache:true (default) deja que el
  //    CDN de Blob sirva rápido en vez de forzar lectura desde origen.
  try {
    const result = await get(BLOB_PATHNAME, { access: 'private' })
    if (result?.statusCode === 200) {
      const b64 = await streamToString(result.stream)
      const data = await decompress(b64)
      if (data) {
        memStore = data
        memStoreAt = Date.now()
        console.log(`Medios loaded from Blob: ${data.row_count} rows`)
        return data
      }
    }
  } catch (e) {
    console.error('medios blob error:', e)
    if (memStore) return memStore // TTL vencido pero Blob falló — mejor servir lo viejo que nada
  }

  // 3. Fallback legacy: env var vieja (por si el blob aún no se subió)
  const envVal = process.env.MEDIOS_DATA_GZ
  if (envVal) {
    try {
      const data = await decompress(envVal)
      if (data) { memStore = data; memStoreAt = Date.now(); return data }
    } catch (e) {
      console.error('medios decompress error:', e)
    }
  }

  return memStore // último recurso: lo que haya, aunque esté vencido
}
