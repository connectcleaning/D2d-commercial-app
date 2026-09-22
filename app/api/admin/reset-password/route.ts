import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { findUserByEmail } from '@/lib/users'
import { hashPassword, setStoredHash, generateTempPassword } from '@/lib/credentials'

const MIN_LENGTH = 8

export async function POST(req: NextRequest) {
  const admin = await getSessionUser()
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
  }
  if (admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admins only' }, { status: 403 })
  }

  const { email, newPassword } = await req.json().catch(() => ({} as any))
  const target = findUserByEmail(typeof email === 'string' ? email : '')
  if (!target) {
    return NextResponse.json({ success: false, error: 'Unknown user' }, { status: 400 })
  }

  const provided = typeof newPassword === 'string' && newPassword.length > 0
  if (provided && newPassword.length < MIN_LENGTH) {
    return NextResponse.json(
      { success: false, error: `Password must be at least ${MIN_LENGTH} characters.` },
      { status: 400 }
    )
  }

  const password = provided ? newPassword : generateTempPassword()

  try {
    await setStoredHash(target.email, await hashPassword(password))
  } catch (err: any) {
    console.error('[reset-password]', err)
    return NextResponse.json(
      { success: false, error: 'Could not save password. The credential store may not be set up yet.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    email: target.email,
    name: target.name,
    password,
    generated: !provided,
  })
}
