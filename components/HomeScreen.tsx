'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { RepContext } from '@/lib/types'
import LeadForm from './LeadForm'
import QuickVisitForm from './QuickVisitForm'

type HomeMode = 'home' | 'got_info' | 'no_info' | 'bulk'

const REPS = ['Darius Pyle']

const SCRIPTS: { value: number; label: string; desc: string }[] = [
  { value: 1, label: 'Script 1', desc: 'Cold Introduction' },
  { value: 2, label: 'Script 2', desc: 'Social Proof Lead' },
  { value: 3, label: 'Script 3', desc: 'Neighborhood Reference' },
  { value: 4, label: 'Script 4', desc: 'Problem Discovery' },
]

const CTX_KEY = 'rep_context_v1'

function loadCtx(): RepContext {
  if (typeof window === 'undefined') return { rep_name: REPS[0], script: 1 }
  try {
    const raw = localStorage.getItem(CTX_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { rep_name: REPS[0], script: 1 }
}

function saveCtx(ctx: RepContext) {
  try { localStorage.setItem(CTX_KEY, JSON.stringify(ctx)) } catch {}
}

export default function HomeScreen() {
  const [mode, setMode] = useState<HomeMode>('home')
  const [ctx, setCtx] = useState<RepContext>({ rep_name: REPS[0], script: 1 })
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const gpsAttempted = useRef(false)

  // Load persisted context
  useEffect(() => {
    setCtx(loadCtx())
  }, [])

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

  function updateCtx(updates: Partial<RepContext>) {
    const next = { ...ctx, ...updates }
    setCtx(next)
    saveCtx(next)
  }

  if (mode === 'got_info' || mode === 'bulk') {
    return (
      <LeadForm
        repContext={ctx}
        lat={lat}
        lng={lng}
        initialMode={mode === 'bulk' ? 'bulk' : 'single'}
        onBack={() => setMode('home')}
      />
    )
  }

  if (mode === 'no_info') {
    return <QuickVisitForm repContext={ctx} lat={lat} lng={lng} onBack={() => setMode('home')} />
  }

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 p-6 space-y-5">

      {/* Rep + Script selectors */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Rep</label>
          <select
            value={ctx.rep_name}
            onChange={e => updateCtx({ rep_name: e.target.value })}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-800"
          >
            {REPS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Script</label>
          <div className="grid grid-cols-2 gap-2">
            {SCRIPTS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => updateCtx({ script: s.value })}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  ctx.script === s.value
                    ? 'border-blue-900 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
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
        <Link
          href="/analytics"
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm transition-colors"
        >
          <span>📊</span> Analytics
        </Link>
      </div>
    </div>
  )
}
