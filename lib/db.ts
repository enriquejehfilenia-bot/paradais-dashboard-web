/**
 * Capa de almacenamiento:
 *  - Si SUPABASE_URL + SUPABASE_SERVICE_KEY están configuradas → Supabase Postgres
 *  - Si no → memoria RAM (se pierde al reiniciar, solo para pruebas)
 */
import type { DataRow } from './excel-parser'

export interface StoredData {
  records:     string   // JSON
  projections: string   // JSON
  excel_b64:   string
  filename:    string
  row_count:   number
  updated_at:  string
}

/* ── In-memory fallback ── */
let memStore: StoredData | null = null

/* ── Supabase client (lazy) ── */
async function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key, { auth: { persistSession: false } })
}

/* ── Inicializar tabla si no existe ── */
export async function initDB() {
  const sb = await getSupabase()
  if (!sb) return
  // Supabase no tiene CREATE TABLE via JS, la tabla se crea manualmente.
  // Solo insertamos la fila de control si no existe.
  const { error } = await sb
    .from('dashboard_data')
    .upsert({ id: 1 }, { onConflict: 'id', ignoreDuplicates: true })
  if (error && !error.message.includes('does not exist')) {
    console.error('initDB:', error.message)
  }
}

/* ── Guardar datos ── */
export async function saveData(data: StoredData) {
  const sb = await getSupabase()
  if (sb) {
    const { error } = await sb.from('dashboard_data').upsert(
      { id: 1, ...data, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    if (error) throw new Error(error.message)
  } else {
    memStore = { ...data, updated_at: new Date().toISOString() }
  }
}

/* ── Recuperar datos ── */
export async function getData(): Promise<StoredData | null> {
  const sb = await getSupabase()
  if (sb) {
    const { data, error } = await sb
      .from('dashboard_data')
      .select('*')
      .eq('id', 1)
      .single()
    if (error) return null
    return data as StoredData
  }
  return memStore
}
