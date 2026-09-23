import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getUserByEmail } from '@/lib/users'
import { hashPassword, setStoredHash, generateTempPassword } from '@/lib/credentials'
import { createToken, RESET_TTL_MS } from '@/lib/tokens'
import { sendResetEmail, appBaseUrl } from '@/lib/email'

const MIN_LENGTH = 8

export async function POST(req: NextRequest) {
  const admin = await getSessionUser()
  if (!admin) return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
  if (admin.role !== 'admin') return NextResponse.json({ success: false, error: 'Admins only' }, { status: 403 })

  const { email, newPassword, mode } = await req.json().catch(() => ({} as any))
  const target = await getUserByEmail(typeof email === 'string' ? email : '')
  if (!target) return NextResponse.json({ success: false, error: 'Unknown user' }, { status: 400 })

  // mode 'link' → email a reset link. Otherwise set/generate a password directly.
  if (mode === 'link') {
    try {
      const raw = await createToken(target.email, 'reset', RESET_TTL_MS)
      const link = `${appBaseUrl()}/set-password?token=${encodeURIComponent(raw)}`
      await sendResetEmail(target.email, target.name, link)
    } catch (err: any) {
      console.error('[reset-password] link', err)
      return NextResponse.json({ success: false, error: err?.message || 'Could not send reset email.' }, { status: 500 })
    }
    return NextResponse.json({ success: true, mode: 'link', email: target.email, name: target.name })
  }

  const provided = typeof newPassword === 'string' && newPassword.length > 0
  if (provided && newPassword.length < MIN_LENGTH) {
    return NextResponse.json({ success: false, error: `Password must be at least ${MIN_LENGTH} characters.` }, { status: 400 })
  }

  const password = provided ? newPassword : generateTempPassword()
  try {
    await setStoredHash(target.email, await hashPassword(password))
  } catch (err: any) {
    console.error('[reset-password] set', err)
    return NextResponse.json(
      { success: false, error: 'Could not save password. The credential store may not be set up yet.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, mode: 'set', email: target.email, name: target.name, password, generated: !provided })
}
