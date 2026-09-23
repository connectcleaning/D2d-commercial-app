import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getUserByEmail, createUser, Role } from '@/lib/users'
import { findUserIdByEmail } from '@/lib/ghl'
import { createToken, INVITE_TTL_MS } from '@/lib/tokens'
import { sendInviteEmail, appBaseUrl } from '@/lib/email'

export async function POST(req: NextRequest) {
  const admin = await getSessionUser()
  if (!admin) return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
  if (admin.role !== 'admin') return NextResponse.json({ success: false, error: 'Admins only' }, { status: 403 })

  const body = await req.json().catch(() => ({} as any))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const role: Role = body.role === 'admin' ? 'admin' : 'rep'
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const fromEmail = typeof body.fromEmail === 'string' ? body.fromEmail.trim() : ''

  if (!email.includes('@') || !name) {
    return NextResponse.json({ success: false, error: 'Name and a valid email are required.' }, { status: 400 })
  }

  const existing = await getUserByEmail(email)
  if (existing) {
    return NextResponse.json({ success: false, error: 'A user with that email already exists.' }, { status: 400 })
  }

  // Best-effort: resolve their GHL user id from the same email so leads assign to them.
  let ghlUserId = typeof body.ghlUserId === 'string' ? body.ghlUserId.trim() : ''
  if (!ghlUserId) {
    try {
      ghlUserId = (await findUserIdByEmail(email)) || ''
    } catch {
      /* non-fatal */
    }
  }

  let created
  try {
    created = await createUser({ email, name, role, title, ghlUserId, fromEmail })
  } catch (err: any) {
    console.error('[admin/users]', err)
    return NextResponse.json(
      { success: false, error: 'Could not create user. The user store may not be set up yet.' },
      { status: 500 }
    )
  }

  // Send the invite / set-password email.
  let emailed = false
  let emailError: string | null = null
  try {
    const raw = await createToken(created.email, 'invite', INVITE_TTL_MS)
    const link = `${appBaseUrl()}/set-password?token=${encodeURIComponent(raw)}`
    await sendInviteEmail(created.email, created.name, link)
    emailed = true
  } catch (err: any) {
    console.error('[admin/users] invite email failed', err)
    emailError = err?.message || 'Invite email failed to send.'
  }

  return NextResponse.json({
    success: true,
    user: { email: created.email, name: created.name, role: created.role, ghlUserId: created.ghlUserId },
    emailed,
    emailError,
  })
}
