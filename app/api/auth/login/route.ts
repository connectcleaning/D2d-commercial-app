import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/users'
import { verifyLogin } from '@/lib/credentials'
import { signSession, SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({} as any))
  const user = await getUserByEmail(typeof email === 'string' ? email : '')
  const secret = process.env.SESSION_SECRET

  const ok = !!(user && user.active && secret && (await verifyLogin(user, password)))

  if (!ok) {
    return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
  }

  const token = await signSession(
    { email: user!.email, role: user!.role, exp: Date.now() + SESSION_TTL_MS },
    secret!
  )
  const res = NextResponse.json({ success: true, name: user!.name, role: user!.role })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
  return res
}
