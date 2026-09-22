import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { verifyLogin, hashPassword, setStoredHash } from '@/lib/credentials'

const MIN_LENGTH = 8

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
  }

  const { currentPassword, newPassword } = await req.json().catch(() => ({} as any))

  if (typeof newPassword !== 'string' || newPassword.length < MIN_LENGTH) {
    return NextResponse.json(
      { success: false, error: `New password must be at least ${MIN_LENGTH} characters.` },
      { status: 400 }
    )
  }

  const currentOk = await verifyLogin(user, typeof currentPassword === 'string' ? currentPassword : '')
  if (!currentOk) {
    return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 400 })
  }

  try {
    await setStoredHash(user.email, await hashPassword(newPassword))
  } catch (err: any) {
    console.error('[change-password]', err)
    return NextResponse.json(
      { success: false, error: 'Could not save password. The credential store may not be set up yet.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
