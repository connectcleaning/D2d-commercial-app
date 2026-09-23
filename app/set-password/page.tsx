'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'

function SetPasswordInner() {
  const params = useSearchParams()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setDone(true)
      } else {
        setError(data.error || 'Could not set password.')
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent placeholder-gray-400'
  const labelClass = 'block text-sm font-medium text-gray-600 mb-1'

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 p-6 space-y-4">
      {done ? (
        <div className="space-y-4 text-center">
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm font-medium">
            Password set ✓ You can now sign in.
          </div>
          <Link href="/login" className="inline-block w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors">
            Go to Sign In →
          </Link>
        </div>
      ) : !token ? (
        <div className="text-center space-y-3">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            This link is missing its token. Request a new one.
          </div>
          <Link href="/forgot-password" className="text-blue-900 hover:underline text-sm">Request a reset link</Link>
        </div>
      ) : (
        <>
          <h1 className="text-lg font-bold text-gray-900 text-center">Set your password</h1>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required placeholder="At least 8 characters" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required className={inputClass} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-lg py-4 rounded-xl transition-colors">
              {loading ? 'Saving…' : 'Set Password'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Connect Cleaning" width={200} height={67} priority />
          </div>
          <p className="text-gray-500 text-sm font-medium tracking-wide uppercase">Commercial Lead Capture</p>
        </div>
        <Suspense fallback={<div className="text-center text-gray-400 text-sm">Loading…</div>}>
          <SetPasswordInner />
        </Suspense>
      </div>
    </main>
  )
}
