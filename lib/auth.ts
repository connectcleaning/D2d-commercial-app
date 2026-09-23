import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession } from './session'
import { getUserByEmail, AppUser } from './users'

/**
 * Resolve the logged-in rep from the request cookie.
 * For use in server components and route handlers (Node runtime).
 * Returns null when there is no valid session or the user is inactive.
 */
export async function getSessionUser(): Promise<AppUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value
  const secret = process.env.SESSION_SECRET
  if (!token || !secret) return null
  const payload = await verifySession(token, secret)
  if (!payload) return null
  const user = await getUserByEmail(payload.email)
  if (!user || !user.active) return null
  return user
}
