import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('pd_token')
  res.cookies.delete('pd_role')
  return res
}
