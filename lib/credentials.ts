import { supabase } from './supabase'
import { AppUser } from './users'

// PBKDF2 password hashing via Web Crypto (works in the Node route runtime, no deps).
// Stored format: pbkdf2$<iterations>$<saltB64>$<hashB64>

const ITERATIONS = 100_000
const enc = new TextEncoder()

function b64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function unb64(str: string): Uint8Array {
  const bin = atob(str)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password) as BufferSource, 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await derive(password, salt, ITERATIONS)
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(bits)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = parseInt(parts[1], 10)
  if (!Number.isFinite(iterations)) return false
  const salt = unb64(parts[2])
  const expected = unb64(parts[3])
  const actual = await derive(password, salt, iterations)
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]
  return diff === 0
}

/** Human-friendly temporary password, e.g. "Harbor-4821!". */
export function generateTempPassword(): string {
  const words = ['Sunset', 'River', 'Maple', 'Cobalt', 'Harbor', 'Falcon', 'Cedar', 'Orbit', 'Summit', 'Willow', 'Copper', 'Delta']
  const arr = crypto.getRandomValues(new Uint32Array(3))
  const word = words[arr[0] % words.length]
  const num = 1000 + (arr[1] % 9000)
  const sym = '!@#$%'.charAt(arr[2] % 5)
  return `${word}-${num}${sym}`
}

/** Returns the stored password hash for an email, or null if none / table missing. */
export async function getStoredHash(email: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_credentials')
    .select('password_hash')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()
  if (error) return null
  return data?.password_hash ?? null
}

/**
 * Verify a login attempt for a user: prefer the password set in the DB,
 * and fall back to the seed password in the env var until one is set.
 */
export async function verifyLogin(user: AppUser, password: string): Promise<boolean> {
  if (typeof password !== 'string' || password.length === 0) return false
  const stored = await getStoredHash(user.email)
  if (stored) return verifyPassword(password, stored)
  const expected = user.passwordEnv ? process.env[user.passwordEnv] : undefined
  if (!expected) return false
  if (expected.length !== password.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ password.charCodeAt(i)
  return diff === 0
}

/** Upserts the password hash for an email. Throws if the store isn't reachable. */
export async function setStoredHash(email: string, hash: string): Promise<void> {
  const { error } = await supabase
    .from('app_credentials')
    .upsert(
      { email: email.trim().toLowerCase(), password_hash: hash, updated_at: new Date().toISOString() },
      { onConflict: 'email' }
    )
  if (error) throw new Error(error.message)
}
