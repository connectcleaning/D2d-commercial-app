import { supabase } from './supabase'

// User directory. Source of truth is the Supabase `app_users` table; the
// SEED_USERS below are a fallback so the two original accounts keep working
// even before the table exists. New reps are added at runtime (admin UI) and
// live only in the DB.

export type Role = 'admin' | 'rep'

export interface AppUser {
  email: string
  name: string
  title: string
  role: Role
  ghlUserId: string
  fromEmail: string
  active: boolean
  /** Only seed users have an env-var seed password fallback. */
  passwordEnv?: string
}

const DEFAULT_FROM_EMAIL = 'hello@connectcleanfl.com'

export const SEED_USERS: AppUser[] = [
  {
    email: 'hello@connectcleanfl.com',
    name: 'Darius Pyle',
    title: 'Owner',
    role: 'admin',
    ghlUserId: 'j2gz9XCHA2cj4z273JvQ',
    fromEmail: 'hello@connectcleanfl.com',
    active: true,
    passwordEnv: 'AUTH_PW_DARIUS',
  },
  {
    email: 'rick.ley@connectcleaning.com',
    name: 'Rick Ley',
    title: 'Sales Representative',
    role: 'rep',
    ghlUserId: 'nNkZhChhJ8PgDA8Dhty0',
    fromEmail: 'hello@connectcleanfl.com',
    active: true,
    passwordEnv: 'AUTH_PW_RICK',
  },
]

function seedByEmail(email: string): AppUser | undefined {
  const e = email.trim().toLowerCase()
  return SEED_USERS.find(u => u.email.toLowerCase() === e)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToUser(row: any): AppUser {
  return {
    email: String(row.email).toLowerCase(),
    name: row.name,
    title: row.title ?? '',
    role: row.role === 'admin' ? 'admin' : 'rep',
    ghlUserId: row.ghl_user_id ?? '',
    fromEmail: row.from_email || DEFAULT_FROM_EMAIL,
    active: row.active !== false,
    passwordEnv: seedByEmail(row.email)?.passwordEnv,
  }
}

/** Look up a user by email — DB first, then seed fallback. */
export async function getUserByEmail(email: string | null | undefined): Promise<AppUser | null> {
  if (!email) return null
  const e = email.trim().toLowerCase()
  const { data, error } = await supabase.from('app_users').select('*').eq('email', e).maybeSingle()
  if (!error && data) return rowToUser(data)
  return seedByEmail(e) ?? null
}

/** List all users — DB, merged with any seed users missing from it. */
export async function listUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase.from('app_users').select('*').order('name')
  if (error || !data) return SEED_USERS
  const users = data.map(rowToUser)
  const emails = new Set(users.map(u => u.email))
  for (const s of SEED_USERS) {
    if (!emails.has(s.email.toLowerCase())) users.push(s)
  }
  return users
}

/** Insert a new user. Throws on conflict or if the store is unreachable. */
export async function createUser(u: {
  email: string
  name: string
  role: Role
  title?: string
  ghlUserId?: string
  fromEmail?: string
}): Promise<AppUser> {
  const email = u.email.trim().toLowerCase()
  const { data, error } = await supabase
    .from('app_users')
    .insert({
      email,
      name: u.name.trim(),
      title: u.title?.trim() || '',
      role: u.role,
      ghl_user_id: u.ghlUserId || '',
      from_email: u.fromEmail?.trim() || DEFAULT_FROM_EMAIL,
      active: true,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return rowToUser(data)
}
