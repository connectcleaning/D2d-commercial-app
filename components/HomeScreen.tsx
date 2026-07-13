'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { RepContext } from '@/lib/types'
import LeadForm from './LeadForm'
import QuickVisitForm from './QuickVisitForm'

type HomeMode = 'home' | 'got_info' | 'no_info' | 'bulk'

const REPS = ['Darius Pyle']

const SCRIPTS: { value: number; label: string; desc: string; full: string }[] = [
  {
    value: 1,
    label: 'Script 1',
    desc: 'Direct Ask',
    full: `"Hi, I'm Darius with Connect Cleaning. We handle commercial cleaning for businesses in the area — janitorial, windows, pressure washing, the works.\n\nI'm not here to sell you anything today, I just wanted to introduce myself and drop off a card. We're rated 5 stars on Google with over 130 reviews.\n\nWho would be the right person to talk to about your cleaning?"`,
  },
  {
    value: 2,
    label: 'Script 2',
    desc: 'Social Proof',
    full: `"Hi, I'm Darius with Connect Cleaning. We work with a lot of businesses right here in the area — medical offices, dental practices, law firms — and we've built a reputation for actually showing up and doing it right.\n\n130-plus five-star Google reviews. I just wanted to stop in personally and see if there's a chance we could earn your business.\n\nIs the owner or manager someone I could leave my info with?"`,
  },
  {
    value: 3,
    label: 'Script 3',
    desc: 'Neighborhood Drop',
    full: `"Hey, I'm Darius with Connect Cleaning. We actually take care of a few businesses right here in this area, so I was already in the neighborhood and wanted to stop in.\n\nWe do commercial cleaning — janitorial, floors, windows, pressure washing. A lot of our clients switched to us because their last company just stopped being consistent.\n\nIs there a manager or owner I could grab their contact info from? I'd love to send over a quick quote."`,
  },
  {
    value: 4,
    label: 'Script 4',
    desc: 'Problem Discovery',
    full: `"Hi, quick question — are you currently happy with your commercial cleaning service?\n\nI'm Darius with Connect Cleaning. We work with businesses all over the area and honestly, most of them came to us because they weren't getting consistent service from their last company.\n\nI'm not here to pressure you at all — I'd just love to do a quick walkthrough and send you a free quote so you have something to compare to. Who makes that call here?"`,
  },
]

const CTX_KEY = 'rep_context_v1'

function loadCtx(): RepContext {
  if (typeof window === 'undefined') return { rep_name: REPS[0], script: null }
  try {
    const raw = localStorage.getItem(CTX_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { rep_name: REPS[0], script: null }
}

function saveCtx(ctx: RepContext) {
  try { localStorage.setItem(CTX_KEY, JSON.stringify(ctx)) } catch {}
}

export default function HomeScreen() {
  const [mode, setMode] = useState<HomeMode>('home')
  const [ctx, setCtx] = useState<RepContext>({ rep_name: REPS[0], script: null })
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [previewScript, setPreviewScript] = useState<number | null>(null)
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
              <div key={s.value} className="relative">
                <button
                  type="button"
                  onClick={() => updateCtx({ script: ctx.script === s.value ? null : s.value })}
                  className={`w-full text-left px-3 py-2.5 pr-8 rounded-lg border transition-colors ${
                    ctx.script === s.value
                      ? 'border-blue-900 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setPreviewScript(s.value) }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 text-xs flex items-center justify-center transition-colors"
                  aria-label={`Preview ${s.label}`}
                >
                  i
                </button>
              </div>
            ))}
          </div>

          {/* Script preview modal */}
          {previewScript !== null && (() => {
            const s = SCRIPTS.find(x => x.value === previewScript)!
            return (
              <div
                className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4"
                onClick={() => setPreviewScript(null)}
              >
                <div
                  className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{s.label}: {s.desc}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Tap anywhere outside to close</p>
                    </div>
                    <button onClick={() => setPreviewScript(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{s.full}</p>
                  </div>
                  <button
                    onClick={() => { updateCtx({ script: s.value }); setPreviewScript(null) }}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                      ctx.script === s.value
                        ? 'bg-blue-900 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {ctx.script === s.value ? '✓ Currently selected' : `Use ${s.label}`}
                  </button>
                </div>
              </div>
            )
          })()}
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
