'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SessionUserClient } from '@/lib/types'

interface RepInfo {
  email: string
  name: string
  role: 'admin' | 'rep'
}

interface Props {
  user: SessionUserClient
  isAdmin: boolean
  reps: RepInfo[]
}

const inputClass =
  'w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent placeholder-gray-400'
const labelClass = 'block text-sm font-medium text-gray-600 mb-1'

export default function AccountForm({ user, isAdmin, reps }: Props) {
  // ── Change own password ──────────────────────────────────────────────────
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleChange(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (next.length < 8) {
      setMsg({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    if (next !== confirm) {
      setMsg({ type: 'error', text: 'New password and confirmation do not match.' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMsg({ type: 'success', text: 'Password updated ✓' })
        setCurrent(''); setNext(''); setConfirm('')
      } else {
        setMsg({ type: 'error', text: data.error || 'Could not update password.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  // ── Admin: reset a rep's password ────────────────────────────────────────
  const [targetEmail, setTargetEmail] = useState(reps[0]?.email ?? '')
  const [resetPw, setResetPw] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState<{ email: string; password: string; generated: boolean } | null>(null)
  const [resetErr, setResetErr] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setResetErr('')
    setResetResult(null)
    if (resetPw && resetPw.length < 8) {
      setResetErr('Password must be at least 8 characters (or leave blank to auto-generate).')
      return
    }
    setResetting(true)
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, newPassword: resetPw || undefined }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResetResult({ email: data.email, password: data.password, generated: data.generated })
        setResetPw('')
      } else {
        setResetErr(data.error || 'Could not reset password.')
      }
    } catch {
      setResetErr('Network error. Try again.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">← Back</Link>
        <p className="text-gray-500 text-sm">{user.name}</p>
        <div className="w-10" />
      </div>

      {/* Change own password */}
      <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 p-6 space-y-4">
        <h2 className="text-gray-900 font-semibold">Change your password</h2>

        {msg && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleChange} className="space-y-4">
          <div>
            <label className={labelClass}>Current password</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>New password</label>
            <input type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" required className={inputClass} placeholder="At least 8 characters" />
          </div>
          <div>
            <label className={labelClass}>Confirm new password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required className={inputClass} />
          </div>
          <button type="submit" disabled={saving} className="w-full bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors">
            {saving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Admin: reset a rep's password */}
      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-gray-900 font-semibold">Reset a rep's password</h2>
            <p className="text-xs text-gray-400 mt-0.5">Leave the field blank to auto-generate a temporary password to share.</p>
          </div>

          {resetErr && (
            <div className="rounded-lg px-4 py-3 text-sm font-medium bg-red-50 border border-red-200 text-red-700">{resetErr}</div>
          )}

          {resetResult && (
            <div className="rounded-lg px-4 py-3 text-sm bg-green-50 border border-green-200 text-green-800 space-y-1">
              <p className="font-medium">Password {resetResult.generated ? 'generated' : 'set'} for {resetResult.email}:</p>
              <p className="font-mono text-base bg-white border border-green-200 rounded px-2 py-1 inline-block">{resetResult.password}</p>
              <p className="text-xs text-green-700">Share this with them — they can change it under Account.</p>
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className={labelClass}>Rep</label>
              <select value={targetEmail} onChange={e => setTargetEmail(e.target.value)} className={inputClass}>
                {reps.map(r => (
                  <option key={r.email} value={r.email}>{r.name} ({r.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>New password <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" value={resetPw} onChange={e => setResetPw(e.target.value)} className={inputClass} placeholder="Leave blank to auto-generate" />
            </div>
            <button type="submit" disabled={resetting} className="w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors">
              {resetting ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
