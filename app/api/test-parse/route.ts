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

function colVal(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of Object.keys(row)) {
    const kl = nfd(k)
    if (keys.some(key => kl.includes(key))) return String(row[k] ?? '').trim()
  }
  return ''
}

function colNum(row: Record<string, unknown>, ...keys: string[]): number {
  for (const k of Object.keys(row)) {
    const kl = nfd(k)
    if (keys.some(key => kl.includes(key))) {
      const v = String(row[k] ?? '').replace(/[$,\s]/g, '')
      const n = parseFloat(v)
      return isNaN(n) ? 0 : n
    }
  }
  return 0
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = await file.arrayBuffer()

    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })

    // Test on first data sheet (ENERO)
    const firstSheet = wb.SheetNames[0]
    const ws = wb.Sheets[firstSheet]
    const headerRow = findHeaderRow(ws)

    const jsonRows = XLSX.utils.sheet_to_json<Record<string,unknown>>(ws, {
      raw: false, defval: '', range: headerRow
    })

    // Trace first few rows
    const trace: unknown[] = []
    let validCount = 0

    for (let i = 0; i < Math.min(jsonRows.length, 500); i++) {
      const raw = jsonRows[i]
      const cliente = colVal(raw, 'cliente','cuenta','client','empresa','razon')
      const totalVenta = colNum(raw, 'base iva','base_iva','total_venta','venta_real','venta',
                                'ingreso','revenue','facturado','base','honorario')

      if (i < 5) {
        // Log ALL key-value pairs for first 5 rows
        const allKeys = Object.keys(raw)
        const keyMap: Record<string,string> = {}
        for (const k of allKeys) keyMap[k] = String(raw[k]).substring(0,30)
        // Also find Base Iva key directly
        const baseIvaKey = allKeys.find(k => k.includes('Base') || k.includes('Iva') || k.includes('base') || k.includes('iva'))
        const baseIvaVal = baseIvaKey ? raw[baseIvaKey] : 'KEY_NOT_FOUND'
        // Also try raw with raw:true
        trace.push({
          i,
          cliente,
          totalVenta,
          baseIvaKey,
          baseIvaVal: String(baseIvaVal).substring(0,30),
          keys_sample: allKeys,
          raw_sample: keyMap,
        })
      }

      if (cliente && !cliente.toLowerCase().includes('total') && totalVenta !== 0) {
        validCount++
      }
    }

    return NextResponse.json({
      sheet: firstSheet,
      headerRow,
      totalJsonRows: jsonRows.length,
      validRowsFound: validCount,
      trace,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? `${e.message}\n${e.stack?.slice(0,800)}` : String(e) }, { status: 500 })
  }
}
