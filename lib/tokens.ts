import { supabase } from './supabase'

// One-time, expiring tokens for invite ("set your password") and password reset.
// The raw token goes in the emailed link; only its SHA-256 hash is stored.

export type TokenPurpose = 'invite' | 'reset'

const enc = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input) as BufferSource)
  return b64url(new Uint8Array(digest))
}

export const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
export const RESET_TTL_MS = 1000 * 60 * 60 // 1 hour

/** Create a token, store its hash, and return the raw token for the email link. */
export async function createToken(email: string, purpose: TokenPurpose, ttlMs: number): Promise<string> {
  const raw = b64url(crypto.getRandomValues(new Uint8Array(32)))
  const token_hash = await sha256(raw)
  const { error } = await supabase.from('app_tokens').insert({
    token_hash,
    email: email.trim().toLowerCase(),
    purpose,
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
  })
  if (error) throw new Error(error.message)
  return raw
}

/**
 * Validate and consume a token. Returns the associated email on success,
 * or null if the token is unknown, expired, or already used. Single-use.
 */
export async function consumeToken(raw: string): Promise<{ email: string; purpose: TokenPurpose } | null> {
  if (!raw) return null
  const token_hash = await sha256(raw)
  const { data, error } = await supabase
    .from('app_tokens')
    .select('email, purpose, expires_at, used_at')
    .eq('token_hash', token_hash)
    .maybeSingle()
  if (error || !data) return null
  if (data.used_at) return null
  if (new Date(data.expires_at).getTime() < Date.now()) return null

  // Mark used (best-effort single-use guard).
  const { error: updErr } = await supabase
    .from('app_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token_hash', token_hash)
    .is('used_at', null)
  if (updErr) return null

  return { email: String(data.email).toLowerCase(), purpose: data.purpose }
}
