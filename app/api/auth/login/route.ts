import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { signToken } from '@/lib/jwt'

function sha256(s: string) {
  return createHash('sha256').update(s).digest('hex')
}

/* Límite simple de intentos por IP (en memoria) */
const attempts = new Map<string, { count: number; until: number }>()

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const now = Date.now()

  const rec = attempts.get(ip)
  if (rec && now < rec.until) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
  }

  let body: { password?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }

  const { password } = body
  if (!password) return NextResponse.json({ error: 'Missing password' }, { status: 400 })

  const hash       = sha256(password)
  const adminHash  = process.env.ADMIN_PASSWORD_HASH  ?? process.env.USER_PASSWORD_HASH ?? ''
  const mediosHash = process.env.MEDIOS_PASSWORD_HASH ?? ''

  const isAdmin  = adminHash  !== '' && hash === adminHash
  const isMedios = mediosHash !== '' && hash === mediosHash

  if (!isAdmin && !isMedios) {
    const cur   = rec ?? { count: 0, until: 0 }
    const count = cur.count + 1
    attempts.set(ip, { count, until: count >= 5 ? now + 5 * 60_000 : 0 })
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  attempts.delete(ip)
  const role  = isAdmin ? 'admin' : 'medios'
  const token = await signToken(role)

  const res = NextResponse.json({ token, role })
  res.cookies.set('pd_token', token, { httpOnly: false, secure: true, sameSite: 'lax', maxAge: 8 * 3600, path: '/' })
  return res
}
