'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SessionUserClient } from '@/lib/types'
import LeadForm from './LeadForm'
import QuickVisitForm from './QuickVisitForm'

type HomeMode = 'home' | 'got_info' | 'no_info' | 'bulk'

export default function HomeScreen({ user }: { user: SessionUserClient }) {
  const [mode, setMode] = useState<HomeMode>('home')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const gpsAttempted = useRef(false)

  // Capture GPS once on mount
  useEffect(() => {
    if (gpsAttempted.current) return
    gpsAttempted.current = true
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude) },
      () => {},
      { timeout: 8000 }
    )
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    window.location.href = '/login'
  }

  if (mode === 'got_info' || mode === 'bulk') {
    return (
      <LeadForm
        user={user}
        lat={lat}
        lng={lng}
        initialMode={mode === 'bulk' ? 'bulk' : 'single'}
        onBack={() => setMode('home')}
      />
    )
  }

  if (mode === 'no_info') {
    return <QuickVisitForm lat={lat} lng={lng} onBack={() => setMode('home')} />
  }

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 p-6 space-y-5">

      {/* Signed-in rep */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Signed in as</p>
          <p className="text-gray-900 font-semibold">{user.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/account" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
            Account
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors disabled:opacity-60"
          >
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </div>

      {/* GPS indicator */}
      {lat !== null && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <span>📍</span> Location captured
        </p>
      )}

      {/* Main action buttons */}
      <div className="space-y-3 pt-1">
        <button
          onClick={() => setMode('got_info')}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xl py-5 rounded-2xl transition-colors flex items-center justify-center gap-3"
        >
          <span className="text-2xl">📋</span>
          <div className="text-left">
            <p>Got Their Info</p>
            <p className="text-sm font-normal text-blue-200">Add lead to pipeline</p>
          </div>
        </button>
        <button
          onClick={() => setMode('no_info')}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xl py-5 rounded-2xl border border-gray-200 transition-colors flex items-center justify-center gap-3"
        >
          <span className="text-2xl">🚪</span>
          <div className="text-left">
            <p>No Lead Info</p>
            <p className="text-sm font-normal text-gray-400">Log the visit only</p>
          </div>
        </button>
      </div>

      {/* Bottom links */}
      <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMode('bulk')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm transition-colors"
        >
          <span>📁</span> Bulk Import
        </button>
        {user.role === 'admin' && (
          <Link
            href="/analytics"
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm transition-colors"
          >
            <span>📊</span> Analytics
          </Link>
        )}
      </div>
    </div>
  )
}
