import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { getMediosData } from '@/lib/dbMedios'

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.cookies.get('pd_token')?.value ?? null
}

/**
 * Expande el formato columnar compacto a array de objetos.
 *
 * v1 (8 cols):  [mes_i, cli_i, med_i, ti_i, vc, ib, cc, tf]
 * v4 (10 cols): [mes_i, cli_i, med_i, ti_i, cat_i, tc_i, vc, ib, cc, tf]
 * v5 (12 cols): [mes_i, cli_i, med_i, ti_i, prov_i, rs_i, cat_i, tc_i, vc, ib, cc, tf]
 */
function expand(payload: Record<string, unknown>) {
  const pm   = (payload.pm   as string[]) ?? []
  const pc   = (payload.pc   as string[]) ?? []
  const pme  = (payload.pme  as string[]) ?? []
  const pt   = (payload.pt   as string[]) ?? []
  const pp   = (payload.pp   as string[]) ?? []
  const prs  = (payload.prs  as string[]) ?? []
  const pcat = (payload.pcat as string[]) ?? []
  const ptc  = (payload.ptc  as string[]) ?? []
  const r    = (payload.r    as number[][]) ?? []

  return r.map(row => {
    let mi: number, ci: number, mei: number, ti: number
    let provi: number, rsi: number, cati: number, tci: number
    let vc: number, ib: number, cc: number, tf: number

    if (row.length >= 12) {
      // v5
      ;[mi, ci, mei, ti, provi, rsi, cati, tci, vc, ib, cc, tf] = row
    } else if (row.length >= 10) {
      // v4
      ;[mi, ci, mei, ti, cati, tci, vc, ib, cc, tf] = row
      provi = rsi = -1
    } else {
      // v1 backward compat
      ;[mi, ci, mei, ti, vc, ib, cc, tf] = row
      provi = rsi = cati = tci = -1
    }

    return {
      mes:               pm[mi]    ?? '',
      cliente:           pc[ci]    ?? '',
      medio:             pme[mei]  ?? '',
      tipo_inversion:    pt[ti]    ?? '',
      proveedor:         pp[provi]  ?? '',
      razon_social:      prs[rsi]  ?? '',
      categoria:         pcat[cati] ?? '',
      tipo_compra:       ptc[tci]  ?? '',
      marca:             '',
      grupo_publicitario:'',
      valor_cliente:     vc ?? 0,
      inversion_bruta:   ib ?? 0,
      comision_cliente:  cc ?? 0,
      total_factura:     tf ?? 0,
    }
  })
}

export async function GET(req: NextRequest) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { await verifyToken(token) } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  try {
    const row = await getMediosData()
    if (!row?.records) {
      return NextResponse.json({ data: null, row_count: 0, updated_at: null, filename: '' })
    }
    const payload = JSON.parse(row.records)
    const data = expand(payload)
    return NextResponse.json({
      data,
      row_count:  row.row_count,
      updated_at: row.updated_at,
      filename:   row.filename,
    })
  } catch (e) {
    console.error('/api/medios-data', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
