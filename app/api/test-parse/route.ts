import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

function nfd(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

const HEADER_KEYS = ['fecha','codigo','cliente','tipo','departamento',
                     'ciudad','venta','base','costo','margen','rentab','total','ingreso']

function findHeaderRow(ws: XLSX.WorkSheet): number {
  const ref = ws['!ref']
  if (!ref) return 0
  const range = XLSX.utils.decode_range(ref)
  for (let r = range.s.r; r <= Math.min(range.e.r, 25); r++) {
    let matches = 0
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell?.v && typeof cell.v === 'string') {
        const v = nfd(cell.v)
        if (HEADER_KEYS.some(k => v.includes(k))) matches++
      }
    }
    if (matches >= 2) return r
  }
  return 0
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const magic  = new Uint8Array(buffer.slice(0, 4))
    const magicHex = Array.from(magic).map(b => b.toString(16).padStart(2,'0')).join('')

    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
    const sheetNames = wb.SheetNames

    const sheetDiag: Record<string, unknown>[] = []
    for (const name of sheetNames) {
      const ws = wb.Sheets[name]
      const ref = ws['!ref'] || 'none'
      const headerRow = findHeaderRow(ws)

      // Get raw first 3 rows
      const raw3 = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]
      const first3 = raw3.slice(0, 4).map(row =>
        (row as unknown[]).slice(0, 10).map(v => String(v).substring(0, 20))
      )

      // Try to get JSON with detected header row
      const jsonRows = XLSX.utils.sheet_to_json<Record<string,unknown>>(ws, {
        raw: false, defval: '', range: headerRow
      })

      const keys = jsonRows.length > 0 ? Object.keys(jsonRows[0]).slice(0, 12) : []
      const sampleRow = jsonRows.length > 0 ? jsonRows[0] : null

      sheetDiag.push({
        name,
        ref,
        headerRow,
        totalJsonRows: jsonRows.length,
        keys,
        first3,
        sampleRow,
      })
    }

    return NextResponse.json({
      size: buffer.byteLength,
      magic: magicHex,
      sheetCount: sheetNames.length,
      sheets: sheetDiag,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? `${e.message}\n${e.stack?.slice(0,600)}` : String(e) }, { status: 500 })
  }
}
