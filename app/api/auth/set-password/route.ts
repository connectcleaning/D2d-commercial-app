import { NextRequest, NextResponse } from 'next/server'
import { consumeToken } from '@/lib/tokens'
import { hashPassword, setStoredHash } from '@/lib/credentials'
import { getUserByEmail } from '@/lib/users'

const MIN_LENGTH = 8

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json().catch(() => ({} as any))

  if (typeof newPassword !== 'string' || newPassword.length < MIN_LENGTH) {
    return NextResponse.json(
      { success: false, error: `Password must be at least ${MIN_LENGTH} characters.` },
      { status: 400 }
    )
  }
  if (typeof token !== 'string' || !token) {
    return NextResponse.json({ success: false, error: 'Invalid or missing link.' }, { status: 400 })
  }

  const result = await consumeToken(token)
  if (!result) {
    return NextResponse.json(
      { success: false, error: 'This link is invalid or has expired. Request a new one.' },
      { status: 400 }
    )
  }

  const user = await getUserByEmail(result.email)
  if (!user || !user.active) {
    return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 400 })
  }

  try {
    await setStoredHash(user.email, await hashPassword(newPassword))
  } catch (err) {
    console.error('[set-password]', err)
    return NextResponse.json({ success: false, error: 'Could not save password. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
