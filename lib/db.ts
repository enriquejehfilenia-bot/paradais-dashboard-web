/**
 * Capa de almacenamiento:
 *  - Si DATABASE_URL está configurada → Supabase Postgres (via pg directo)
 *  - Si no → memoria RAM (se pierde al reiniciar, solo para pruebas)
 */

export interface StoredData {
  records:     string   // JSON array
  projections: string   // JSON object
  excel_b64:   string
  filename:    string
  row_count:   number
  updated_at:  string
}

/* ── In-memory fallback ── */
let memStore: StoredData | null = null

/* ── Pool PostgreSQL lazy ── */
let _pool: import('pg').Pool | null = null

async function getPool() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  if (!_pool) {
    const { Pool } = await import('pg')
    // Parsear URL manualmente para soportar IPv6 con brackets y evitar conflictos SSL
    // Formato: postgresql://user:pass@[ipv6]:port/db  o  postgresql://user:pass@host:port/db
    let poolConfig: import('pg').PoolConfig

    // Regex que captura IPv6 (con brackets) o hostname normal
    const urlMatch = url.match(
      /^(?:postgresql|postgres):\/\/([^:@]+):([^@]+)@(\[([^\]]+)\]|([^\/:]+)):?(\d+)?\/([^?]*)/
    )
    if (urlMatch) {
      const username = decodeURIComponent(urlMatch[1])
      const password = decodeURIComponent(urlMatch[2])
      const ipv6Host = urlMatch[4]   // IPv6 sin brackets (si existe)
      const plainHost = urlMatch[5]  // Host normal (si existe)
      const host = ipv6Host || plainHost
      const port  = parseInt(urlMatch[6] || '5432')
      const database = urlMatch[7] || 'postgres'
      poolConfig = {
        host,
        port,
        user: username,
        password,
        database,
        ssl: { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 30_000,
      }
    } else {
      // Fallback a connectionString si el parsing falla
      const cleanUrl = url.replace(/[?&]sslmode=[^&]*/g, '')
      poolConfig = {
        connectionString: cleanUrl,
        ssl: { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 30_000,
      }
    }
    _pool = new Pool(poolConfig)
  }
  return _pool
}

/* ── Guardar datos ── */
export async function saveData(data: StoredData) {
  const pool = await getPool()
  if (pool) {
    const client = await pool.connect()
    try {
      await client.query(
        `UPDATE dashboard_data SET
           records=$1, projections=$2, excel_b64=$3,
           filename=$4, row_count=$5, updated_at=now()
         WHERE id=1`,
        [data.records, data.projections, data.excel_b64, data.filename, data.row_count]
      )
    } finally {
      client.release()
    }
  } else {
    memStore = { ...data, updated_at: new Date().toISOString() }
  }
}

/* ── Recuperar datos ── */
export async function getData(): Promise<StoredData | null> {
  const pool = await getPool()
  if (pool) {
    const client = await pool.connect()
    try {
      const res = await client.query(
        'SELECT records, projections, excel_b64, filename, row_count, updated_at FROM dashboard_data WHERE id=1'
      )
      return res.rows[0] ?? null
    } finally {
      client.release()
    }
  }
  return memStore
}
