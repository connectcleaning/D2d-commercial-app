'use client'

import { useState } from 'react'
import { RepContext } from '@/lib/types'

interface Props {
  repContext: RepContext
  lat: number | null
  lng: number | null
  onBack: () => void
}

export default function QuickVisitForm({ repContext, lat, lng, onBack }: Props) {
  const [businessName, setBusinessName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const inputClass = 'w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent placeholder-gray-400'
  const labelClass = 'block text-sm font-medium text-gray-600 mb-1'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData()
    fd.append('rep_name', repContext.rep_name)
    fd.append('script', String(repContext.script))
    fd.append('business_name', businessName)
    fd.append('notes', notes)
    if (lat !== null) fd.append('lat', String(lat))
    if (lng !== null) fd.append('lng', String(lng))

    try {
      const res = await fetch('/api/visit', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || `Server error ${res.status}`)
        return
      }
      setDone(true)
      setTimeout(() => {
        setBusinessName('')
        setNotes('')
        setDone(false)
        onBack()
      }, 1500)
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">← Back</button>
        <h2 className="text-gray-900 font-semibold">Log Visit — No Lead Info</h2>
        <div className="w-10" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {done ? (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-4 text-center font-medium">
          Visit logged ✓
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Business Name <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="e.g. Polar Bear Dental"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Spoke with receptionist, no interest"
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-700 hover:bg-gray-800 disabled:opacity-60 text-white font-semibold text-lg py-4 rounded-xl transition-colors"
          >
            {loading ? 'Logging...' : 'Log Visit →'}
          </button>
        </form>
      )}
    </div>
  )
}
