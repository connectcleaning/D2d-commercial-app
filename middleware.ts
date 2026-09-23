import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

// Public pages reachable without a session.
const PUBLIC_PATHS = ['/login', '/forgot-password', '/set-password']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Auth endpoints must stay open (login/logout/forgot/set-password).
  if (pathname.startsWith('/api/auth')) return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const secret = process.env.SESSION_SECRET
  const payload = token && secret ? await verifySession(token, secret) : null

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (!payload) {
    if (isPublic) return NextResponse.next()
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Logged in — keep them off the public auth pages.
  if (isPublic) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Admin-only areas. Role comes from the signed token; the API handlers
  // re-check against the DB, which is authoritative.
  const adminOnly = pathname.startsWith('/analytics') || pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  if (adminOnly && payload.role !== 'admin') {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ success: false, error: 'Admins only' }, { status: 403 })
    }
    // Send legacy tokens (no role) or non-admins to log in / home.
    const url = req.nextUrl.clone()
    url.pathname = payload.role ? '/' : '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
