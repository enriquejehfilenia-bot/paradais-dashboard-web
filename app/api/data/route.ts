import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { getData } from '@/lib/db'

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.cookies.get('pd_token')?.value ?? null
}

export async function GET(req: NextRequest) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await verifyToken(token)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  try {
    const row = await getData()
    if (!row?.records) {
      return NextResponse.json({
        data: null, projections: {}, filename: '', updated_at: null, row_count: 0,
      })
    }
    return NextResponse.json({
      data:         JSON.parse(row.records),
      projections:  JSON.parse(row.projections ?? '{}'),
      filename:     row.filename,
      updated_at:   row.updated_at,
      row_count:    row.row_count,
      total_ventas: row.total_ventas ?? null,
      total_costos: row.total_costos ?? null,
      total_margen: row.total_margen ?? null,
    })
  } catch (e) {
    console.error('/api/data', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
