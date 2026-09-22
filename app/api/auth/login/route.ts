import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail } from '@/lib/users'
import { signSession, SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/session'

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({} as any))
  const user = findUserByEmail(typeof email === 'string' ? email : '')
  const secret = process.env.SESSION_SECRET
  const expected = user ? process.env[user.passwordEnv] : undefined

  const ok = !!(
    user &&
    secret &&
    expected &&
    typeof password === 'string' &&
    timingSafeEqualStr(password, expected)
  )

  if (!ok) {
    return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
  }

  const token = await signSession({ email: user!.email, exp: Date.now() + SESSION_TTL_MS }, secret!)
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
