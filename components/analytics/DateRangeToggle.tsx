'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DateRangeKey } from '@/lib/types'

const OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'wtd', label: 'Week' },
  { key: 'mtd', label: 'Month' },
  { key: 'past30', label: 'Past 30' },
  { key: 'custom', label: 'Custom' },
]

export default function DateRangeToggle() {
  const router = useRouter()
  const params = useSearchParams()
  const active = (params.get('range') as DateRangeKey) || 'today'
  const from = params.get('from') || ''
  const to = params.get('to') || ''

  function setRange(key: DateRangeKey) {
    const p = new URLSearchParams({ range: key })
    if (key === 'custom') {
      if (from) p.set('from', from)
      if (to) p.set('to', to)
    }
    router.push(`/analytics?${p.toString()}`)
  }

  function setCustom(field: 'from' | 'to', value: string) {
    const p = new URLSearchParams({ range: 'custom' })
    if (field === 'from') {
      p.set('from', value)
      if (to) p.set('to', to)
    } else {
      if (from) p.set('from', from)
      p.set('to', value)
    }
    router.push(`/analytics?${p.toString()}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {OPTIONS.map(o => (
          <button
            key={o.key}
            onClick={() => setRange(o.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              active === o.key
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {active === 'custom' && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={from}
            onChange={e => setCustom('from', e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-800"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={to}
            onChange={e => setCustom('to', e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-800"
          />
        </div>
      )}
    </div>
  )
}
