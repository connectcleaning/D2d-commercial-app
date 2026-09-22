import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/session'
import { findUserByEmail } from '@/lib/users'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Auth endpoints must stay open (login/logout).
  if (pathname.startsWith('/api/auth')) return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const secret = process.env.SESSION_SECRET
  const payload = token && secret ? await verifySession(token, secret) : null
  const user = payload ? findUserByEmail(payload.email) : null

  const isLogin = pathname === '/login'

  if (!user) {
    if (isLogin) return NextResponse.next()
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Logged in — keep them out of the login page.
  if (isLogin) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Admin-only areas.
  const adminOnly = pathname.startsWith('/analytics') || pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  if (adminOnly && user.role !== 'admin') {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ success: false, error: 'Admins only' }, { status: 403 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Run on everything except Next internals and static image assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
