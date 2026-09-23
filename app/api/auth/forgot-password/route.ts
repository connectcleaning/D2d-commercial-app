import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/users'
import { createToken, RESET_TTL_MS } from '@/lib/tokens'
import { sendResetEmail, appBaseUrl } from '@/lib/email'

// Always returns a generic success so this can't be used to probe which
// emails have accounts.
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({} as any))
  const generic = NextResponse.json({ success: true })

  if (typeof email !== 'string' || !email.includes('@')) return generic

  try {
    const user = await getUserByEmail(email)
    if (user && user.active) {
      const raw = await createToken(user.email, 'reset', RESET_TTL_MS)
      const link = `${appBaseUrl()}/set-password?token=${encodeURIComponent(raw)}`
      await sendResetEmail(user.email, user.name, link)
    }
  } catch (err) {
    // Log, but still return generic success to the caller.
    console.error('[forgot-password]', err)
  }

  return generic
}
