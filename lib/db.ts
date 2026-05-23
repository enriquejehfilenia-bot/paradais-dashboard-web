/**
 * Capa de almacenamiento — Vercel Env Var + In-Memory Cache
 *
 * Estrategia:
 *  1. Los datos parseados del Excel se comprimen (gzip) y codifican en base64.
 *  2. La cadena comprimida se guarda como variable de entorno en Vercel (≈11 KB).
 *  3. En memoria (módulo-level) se guarda una copia para requests rápidos.
 *  4. En cold start se recupera el env var via la API de Vercel.
 *
 * Env vars requeridas:
 *  VERCEL_TOKEN      — personal/team token de Vercel (encryted)
 *  VERCEL_PROJECT_ID — ID del proyecto Vercel
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
}

/* ── Cache en memoria (persiste mientras la instancia esté caliente) ── */
let memStore: StoredData | null = null

/* ── Constantes ── */
const ENV_KEY = 'DASHBOARD_DATA_GZ'

function getVercelConfig(): { token: string; projectId: string } | null {
  const token = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) return null
  return { token, projectId }
}

/* ── Comprime y codifica datos para almacenarlos como env var ── */
async function compress(data: StoredData): Promise<string> {
  // Omitir excel_b64 para mantener tamaño pequeño (solo records+projections son necesarios para el dashboard)
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

/* ── Descomprime datos recuperados del env var ── */
async function decompress(b64: string): Promise<StoredData | null> {
  try {
    const buf = Buffer.from(b64, 'base64')
    const decompressed = await gunzipAsync(buf)
    const obj = JSON.parse(decompressed.toString('utf-8'))
    return { ...obj, excel_b64: '' } as StoredData
  } catch {
    return null
  }
}

/* ── Elimina el env var existente en Vercel ── */
async function deleteVercelEnv(token: string, projectId: string): Promise<void> {
  // Listar env vars y encontrar el nuestro
  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!listRes.ok) return
  const listData = await listRes.json() as { envs?: { id: string; key: string }[] }
  const existing = listData.envs?.find(e => e.key === ENV_KEY)
  if (existing) {
    await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    )
  }
}

/* ── Guarda datos ── */
export async function saveData(data: StoredData) {
  // Siempre actualizar cache en memoria
  memStore = data

  const cfg = getVercelConfig()
  if (!cfg) {
    // Sin configuración de Vercel: solo memoria (funciona para la instancia actual)
    console.warn('VERCEL_TOKEN/VERCEL_PROJECT_ID not set — using in-memory only')
    return
  }

  try {
    const b64 = await compress(data)
    console.log(`Compressed data: ${b64.length} chars (${(b64.length/1024).toFixed(1)} KB)`)

    // Eliminar env var existente y crear nueva
    await deleteVercelEnv(cfg.token, cfg.projectId)

    const createRes = await fetch(
      `https://api.vercel.com/v9/projects/${cfg.projectId}/env`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key:    ENV_KEY,
          value:  b64,
          type:   'encrypted',
          target: ['production', 'preview', 'development'],
        }),
      }
    )

    if (!createRes.ok) {
      const err = await createRes.text()
      console.error('Failed to save env var:', err)
    } else {
      console.log('Data saved to Vercel env var successfully')
    }
  } catch (e) {
    console.error('saveData error:', e)
    // No relanzar — la memoria ya tiene los datos para esta instancia
  }
}

/* ── Recupera datos ── */
export async function getData(): Promise<StoredData | null> {
  // 1. Cache en memoria (rápido)
  if (memStore) return memStore

  // 2. Env var en proceso (disponible si fue seteada antes del deploy actual)
  const envVal = process.env[ENV_KEY]
  if (envVal) {
    const data = await decompress(envVal)
    if (data) {
      memStore = data
      return data
    }
  }

  // 3. Llamar a la API de Vercel para obtener el valor actual del env var
  const cfg = getVercelConfig()
  if (!cfg) return null

  try {
    const listRes = await fetch(
      `https://api.vercel.com/v9/projects/${cfg.projectId}/env`,
      { headers: { Authorization: `Bearer ${cfg.token}` } }
    )
    if (!listRes.ok) return null
    const listData = await listRes.json() as { envs?: { id: string; key: string }[] }
    const envEntry = listData.envs?.find(e => e.key === ENV_KEY)
    if (!envEntry) return null

    // Obtener el valor desencriptado
    const valRes = await fetch(
      `https://api.vercel.com/v9/projects/${cfg.projectId}/env/${envEntry.id}`,
      { headers: { Authorization: `Bearer ${cfg.token}` } }
    )
    if (!valRes.ok) return null
    const valData = await valRes.json() as { value?: string }
    const b64 = valData.value
    if (!b64) return null

    const data = await decompress(b64)
    if (data) memStore = data
    return data
  } catch (e) {
    console.error('getData error:', e)
    return null
  }
}
