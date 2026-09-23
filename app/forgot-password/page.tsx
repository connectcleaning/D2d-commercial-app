'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {}
    setLoading(false)
    setSent(true)
  }

  const inputClass =
    'w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent placeholder-gray-400'

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Connect Cleaning" width={200} height={67} priority />
          </div>
          <p className="text-gray-500 text-sm font-medium tracking-wide uppercase">Reset Password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 p-6 space-y-4">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
                If an account exists for that email, a reset link is on its way. Check your inbox.
              </div>
              <Link href="/login" className="text-blue-900 hover:underline text-sm">← Back to sign in</Link>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold text-gray-900 text-center">Forgot your password?</h1>
              <p className="text-sm text-gray-500 text-center">Enter your email and we&apos;ll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="username"
                  required
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-lg py-4 rounded-xl transition-colors"
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <div className="text-center">
                <Link href="/login" className="text-gray-400 hover:text-gray-600 text-sm">← Back to sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
