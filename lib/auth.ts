import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession } from './session'
import { findUserByEmail, AppUser } from './users'

/**
 * Resolve the logged-in rep from the request cookie.
 * For use in server components and route handlers (Node runtime).
 * Returns null when there is no valid session.
 */
export async function getSessionUser(): Promise<AppUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value
  const secret = process.env.SESSION_SECRET
  if (!token || !secret) return null
  const payload = await verifySession(token, secret)
  if (!payload) return null
  return findUserByEmail(payload.email) ?? null
}
