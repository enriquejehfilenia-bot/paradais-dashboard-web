import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const hash = createHash('sha256').update(password || '').digest('hex')
  const adminHash = process.env.ADMIN_PASSWORD_HASH ?? 'NOT_SET'
  const userHash  = process.env.USER_PASSWORD_HASH  ?? 'NOT_SET'
  const jwtSet    = !!process.env.JWT_SECRET

  return NextResponse.json({
    computed_hash: hash,
    admin_hash_prefix: adminHash.slice(0, 8),
    user_hash_prefix:  userHash.slice(0, 8),
    jwt_set: jwtSet,
    match_admin: hash === adminHash,
    match_user:  hash === userHash,
  })
}
