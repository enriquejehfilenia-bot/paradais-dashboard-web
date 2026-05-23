import { NextRequest, NextResponse } from 'next/server'
import { parseExcel } from '@/lib/excel-parser'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const magic  = new Uint8Array(buffer.slice(0, 4))
    const magicHex = Array.from(magic).map(b => b.toString(16).padStart(2,'0')).join('')

    let result: Record<string, unknown> = { size: buffer.byteLength, magic: magicHex }

    try {
      const parsed = parseExcel(buffer)
      result = {
        ...result,
        ok:          true,
        rows:        parsed.rows.length,
        filename:    parsed.filename,
        projCount:   Object.keys(parsed.projections).length,
        sample_row:  parsed.rows[0] ?? null,
      }
    } catch (e: unknown) {
      result.parse_error = e instanceof Error ? `${e.message}\n${e.stack?.slice(0,400)}` : String(e)
    }

    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
