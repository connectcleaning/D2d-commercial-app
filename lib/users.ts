// App users (reps). This file holds only NON-secret identifiers.
// Passwords live in Vercel env vars named by `passwordEnv` (never in git).
//
// To add a rep later: add a row here (with their GHL user id + a new
// AUTH_PW_* env var in Vercel) and redeploy. Set role: 'admin' to grant
// analytics access.

export type Role = 'admin' | 'rep'

export interface AppUser {
  /** Login username + unique identifier (case-insensitive). */
  email: string
  /** Display name, used as rep_name for tracking and in email signatures. */
  name: string
  /** Shown after the name in email signatures, e.g. "Owner". */
  title: string
  role: Role
  /** GHL user id — the lead's contact + opportunity are assigned to this user. */
  ghlUserId: string
  /** Address GHL sends the lead email from, on this rep's behalf. */
  fromEmail: string
  /** Name of the Vercel env var holding this rep's login password. */
  passwordEnv: string
}

export const USERS: AppUser[] = [
  {
    email: 'hello@connectcleanfl.com',
    name: 'Darius Pyle',
    title: 'Owner',
    role: 'admin',
    ghlUserId: 'j2gz9XCHA2cj4z273JvQ',
    fromEmail: 'hello@connectcleanfl.com',
    passwordEnv: 'AUTH_PW_DARIUS',
  },
  {
    email: 'rick.ley@connectcleaning.com', // login only
    name: 'Rick Ley',
    title: 'Sales Representative',
    role: 'rep',
    ghlUserId: 'nNkZhChhJ8PgDA8Dhty0',
    // Sending from the established domain until connectcleaning.com is warmed up (SPF/DKIM + reputation).
    fromEmail: 'hello@connectcleanfl.com',
    passwordEnv: 'AUTH_PW_RICK',
  },
]

export function findUserByEmail(email: string | null | undefined): AppUser | undefined {
  if (!email) return undefined
  const e = email.trim().toLowerCase()
  return USERS.find(u => u.email.toLowerCase() === e)
}
