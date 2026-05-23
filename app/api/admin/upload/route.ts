import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { saveData } from '@/lib/db'
import { parseExcel } from '@/lib/excel-parser'

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.cookies.get('pd_token')?.value ?? null
}

export async function POST(req: NextRequest) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payload = await verifyToken(token)
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  let formData: FormData
  try { formData = await req.formData() } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds 50 MB limit' }, { status: 413 })
  }

  const buffer = await file.arrayBuffer()

  // Validar magic bytes Excel (ZIP PK)
  const magic = new Uint8Array(buffer.slice(0, 4))
  if (!(magic[0] === 0x50 && magic[1] === 0x4B && magic[2] === 0x03 && magic[3] === 0x04)) {
    return NextResponse.json({ error: 'Invalid file type — must be .xlsx' }, { status: 400 })
  }

  let rows, projections, filename: string
  try {
    const parsed = parseExcel(buffer)
    rows        = parsed.rows
    projections = parsed.projections
    filename    = parsed.filename
  } catch (e) {
    console.error('parseExcel:', e)
    return NextResponse.json({ error: 'Error processing Excel file' }, { status: 422 })
  }

  const excel_b64 = Buffer.from(buffer).toString('base64')

  await saveData({
    records:     JSON.stringify(rows),
    projections: JSON.stringify(projections),
    excel_b64,
    filename,
    row_count:   rows.length,
    updated_at:  new Date().toISOString(),
  })

  return NextResponse.json({ message: 'OK', row_count: rows.length, filename })
}

// Vercel: aumentar límite de body para uploads
export const config = {
  api: { bodyParser: false },
}
