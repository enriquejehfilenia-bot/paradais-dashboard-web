import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('pd_token')?.value
  const role  = request.cookies.get('pd_role')?.value

  // Rutas protegidas
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
  const isAdminOnly = pathname.startsWith('/admin')
  const isLoginPage = pathname === '/login'

  // Sin token → redirigir a login
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Ruta admin sin rol admin → redirigir a dashboard
  if (isAdminOnly && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Ya autenticado intentando ir a login → redirigir
  if (isLoginPage && token) {
    const dest = role === 'admin' ? '/admin' : '/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
}
