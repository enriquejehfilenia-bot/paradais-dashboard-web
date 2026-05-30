import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://paradaisddb-ventas-medios.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8000',
  'http://localhost:8765',
]

function applyCors(res: NextResponse, origin: string) {
  res.headers.set('Access-Control-Allow-Origin',      origin)
  res.headers.set('Access-Control-Allow-Methods',     'GET, POST, PATCH, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers',     'Content-Type, Authorization')
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  return res
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

async function getRole(token: string | undefined): Promise<'admin' | 'medios' | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    const role = (payload as { role?: string }).role
    if (role === 'admin' || role === 'medios') return role
    // tokens viejos con role='user' → tratar como admin para no romper sesiones existentes
    if (role === 'user') return 'admin'
    return null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin        = request.headers.get('origin') ?? ''
  const isAllowed     = ALLOWED_ORIGINS.includes(origin)

  // Preflight OPTIONS para rutas API — responder sin tocar auth
  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 200 })
    if (isAllowed) applyCors(res, origin)
    return res
  }

  const token = request.cookies.get('pd_token')?.value
  const role  = await getRole(token)

  // /dashboard → solo admin
  if (pathname.startsWith('/dashboard')) {
    if (!role)            return NextResponse.redirect(new URL('/login',  request.url))
    if (role !== 'admin') return NextResponse.redirect(new URL('/medios', request.url))
  }

  // /medios → admin o medios (cualquier rol válido)
  if (pathname.startsWith('/medios')) {
    if (!role) return NextResponse.redirect(new URL('/login', request.url))
  }

  // /admin → ya no existe, redirigir según rol
  if (pathname.startsWith('/admin')) {
    if (!role) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.redirect(new URL(role === 'admin' ? '/dashboard' : '/medios', request.url))
  }

  // /login → si ya está autenticado, llevar a su dashboard
  if (pathname === '/login' && role) {
    return NextResponse.redirect(new URL(role === 'admin' ? '/dashboard' : '/medios', request.url))
  }

  const res = NextResponse.next()

  // CORS en respuestas normales de API
  if (pathname.startsWith('/api/') && isAllowed) {
    applyCors(res, origin)
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/medios/:path*', '/admin/:path*', '/login', '/api/:path*'],
}
