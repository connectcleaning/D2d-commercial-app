// Lightweight signed-cookie sessions. Uses Web Crypto (crypto.subtle) + btoa/atob
// so it runs in BOTH the Edge middleware runtime and Node route handlers with no deps.

const encoder = new TextEncoder()

export const SESSION_COOKIE = 'd2d_session'
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

export interface SessionPayload {
  email: string
  exp: number // epoch ms
}

function base64url(bytes: Uint8Array): string {
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  return atob(padded)
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return base64url(new Uint8Array(sig))
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = base64url(encoder.encode(JSON.stringify(payload)))
  const sig = await hmac(body, secret)
  return `${body}.${sig}`
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = await hmac(body, secret)
  if (!timingSafeEqualStr(sig, expected)) return null
  try {
    const payload = JSON.parse(base64urlDecode(body)) as SessionPayload
    if (!payload?.email || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
