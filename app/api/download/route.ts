import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { getData } from '@/lib/db'
import * as XLSX from 'xlsx'
import type { DataRow } from '@/lib/excel-parser'

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

  const row = await getData()
  if (!row?.records) {
    return NextResponse.json({ error: 'No hay datos disponibles' }, { status: 404 })
  }

  const records: DataRow[] = JSON.parse(row.records)

  const sheetData = records.map(r => ({
    'Fecha':          r.fecha ? new Date(r.fecha).toLocaleDateString('es-EC') : '',
    'Cliente':        r.cliente,
    'Empresa':        r.empresa ?? '',
    'Departamento':   r.departamento_limpio,
    'Tipo':           r.tipo,
    'Ciudad':         r.ciudad,
    'Mes':            r.mes,
    'Venta Real':     r.total_venta_real,
    'Costos':         r.costos,
    'Margen':         r.margen,
    '% Rentabilidad': parseFloat(r.rentabilidad_pct.toFixed(2)),
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(sheetData)

  ws['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 35 }, // Cliente
    { wch: 16 }, // Empresa
    { wch: 22 }, // Departamento
    { wch: 12 }, // Tipo
    { wch: 14 }, // Ciudad
    { wch: 12 }, // Mes
    { wch: 14 }, // Venta Real
    { wch: 12 }, // Costos
    { wch: 12 }, // Margen
    { wch: 14 }, // % Rentabilidad
  ]

  XLSX.utils.book_append_sheet(wb, ws, row.filename || 'DATA')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="DATA_LIMPIA_${row.filename ?? 'export'}.xlsx"`,
    },
  })
}
