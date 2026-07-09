import { Suspense } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DateRangeKey, TimeSlot, AnalyticsData } from '@/lib/types'
import DateRangeToggle from '@/components/analytics/DateRangeToggle'

// ── Date helpers ──────────────────────────────────────────────────────────────

function getDateRange(range: DateRangeKey, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (range) {
    case 'today':
      return { start: today, end: now }
    case 'wtd': {
      const start = new Date(today)
      start.setDate(today.getDate() - today.getDay())
      return { start, end: now }
    }
    case 'mtd':
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: now }
    case 'past30': {
      const start = new Date(today)
      start.setDate(today.getDate() - 30)
      return { start, end: now }
    }
    case 'custom':
      return {
        start: from ? new Date(from) : today,
        end: to ? new Date(to + 'T23:59:59') : now,
      }
    default:
      return { start: today, end: now }
  }
}

function timeSlot(isoString: string): TimeSlot {
  const h = new Date(isoString).getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

const SLOTS: TimeSlot[] = ['Morning', 'Afternoon', 'Evening']
const SCRIPTS = [1, 2, 3, 4]
const SCRIPT_NAMES: Record<number, string> = {
  1: 'Cold Introduction',
  2: 'Social Proof Lead',
  3: 'Neighborhood Reference',
  4: 'Problem Discovery',
}

// ── Data fetch ────────────────────────────────────────────────────────────────

async function fetchAnalytics(range: DateRangeKey, from?: string, to?: string): Promise<AnalyticsData> {
  const { start, end } = getDateRange(range, from, to)

  const { data: visits } = await supabase
    .from('visits')
    .select('created_at, outcome, city, script, rep_name, lead_id, business_type')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  const { data: hotLeads } = await supabase
    .from('leads')
    .select('id')
    .eq('lead_status', 'Hot')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  const rows = visits ?? []
  const total_doors = rows.length
  const leads_collected = rows.filter(v => v.outcome === 'lead_captured').length
  const hot_leads = hotLeads?.length ?? 0
  const hot_lead_pct = total_doors > 0 ? Math.round((hot_leads / total_doors) * 1000) / 10 : 0

  // City × time matrix
  const cityCount: Record<string, number> = {}
  for (const v of rows) {
    if (v.city) cityCount[v.city] = (cityCount[v.city] ?? 0) + 1
  }
  const cities = Object.entries(cityCount)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c)
    .slice(0, 6)

  const matrix = SLOTS.map(slot => {
    const slotRows = rows.filter(v => timeSlot(v.created_at) === slot)
    const byCityAndTotal: Record<string, number> = {}
    for (const city of cities) {
      byCityAndTotal[city] = slotRows.filter(v => v.city === city).length
    }
    byCityAndTotal['_total'] = slotRows.length
    return { slot, byCityAndTotal }
  })

  // Script performance
  const scripts = SCRIPTS.map(s => {
    const sRows = rows.filter(v => v.script === s)
    const doors = sRows.length
    const leads = sRows.filter(v => v.outcome === 'lead_captured').length
    return {
      script: s,
      doors,
      leads,
      conversion_pct: doors > 0 ? Math.round((leads / doors) * 1000) / 10 : 0,
    }
  })

  // Business type performance
  const typeMap: Record<string, { doors: number; leads: number; lead_ids: (string | null)[] }> = {}
  for (const v of rows) {
    const t = v.business_type || 'Other'
    if (!typeMap[t]) typeMap[t] = { doors: 0, leads: 0, lead_ids: [] }
    typeMap[t].doors++
    if (v.outcome === 'lead_captured') {
      typeMap[t].leads++
      typeMap[t].lead_ids.push(v.lead_id)
    }
  }

  // Get hot lead counts per business type by joining with leads
  const capturedLeadIds = rows
    .filter(v => v.lead_id && v.outcome === 'lead_captured')
    .map(v => v.lead_id as string)

  let hotLeadIdSet = new Set<string>()
  if (capturedLeadIds.length > 0) {
    const { data: hotLeadRows } = await supabase
      .from('leads')
      .select('id')
      .eq('lead_status', 'Hot')
      .in('id', capturedLeadIds)
    hotLeadIdSet = new Set((hotLeadRows ?? []).map(r => r.id))
  }

  const businessTypes = Object.entries(typeMap)
    .map(([type, stats]) => {
      const hot_leads = stats.lead_ids.filter(id => id && hotLeadIdSet.has(id)).length
      return {
        type,
        doors: stats.doors,
        leads: stats.leads,
        hot_leads,
        hot_pct: stats.doors > 0 ? Math.round((hot_leads / stats.doors) * 1000) / 10 : 0,
      }
    })
    .filter(r => r.doors > 0)
    .sort((a, b) => b.doors - a.doors)

  return { kpi: { total_doors, leads_collected, hot_leads, hot_lead_pct }, cities, matrix, scripts, businessTypes }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string }
}) {
  const range = (searchParams.range as DateRangeKey) || 'today'
  const data = await fetchAnalytics(range, searchParams.from, searchParams.to)
  const { kpi, cities, matrix, scripts, businessTypes } = data

  const colTotals: Record<string, number> = {}
  for (const city of cities) {
    colTotals[city] = matrix.reduce((s, r) => s + (r.byCityAndTotal[city] ?? 0), 0)
  }
  const grandTotal = matrix.reduce((s, r) => s + (r.byCityAndTotal['_total'] ?? 0), 0)

  return (
    <main className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">← Back</Link>
          <h1 className="text-gray-900 font-bold text-lg">Sales Analytics</h1>
          <div className="w-10" />
        </div>

        {/* Date toggle */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4">
          <Suspense>
            <DateRangeToggle />
          </Suspense>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Total Doors" value={kpi.total_doors} />
          <KpiCard label="Leads Collected" value={kpi.leads_collected} />
          <KpiCard label="Hot Leads" value={kpi.hot_leads} accent />
          <KpiCard label="Hot Lead %" value={`${kpi.hot_lead_pct}%`} accent />
        </div>

        {/* City × Time matrix */}
        {cities.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Doors by City & Time of Day</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-gray-500 font-medium py-1.5 pr-3 whitespace-nowrap">Time</th>
                    {cities.map(c => (
                      <th key={c} className="text-center text-gray-700 font-medium py-1.5 px-2 whitespace-nowrap">{c}</th>
                    ))}
                    <th className="text-center text-gray-900 font-bold py-1.5 px-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.map(row => (
                    <tr key={row.slot} className="border-t border-gray-100">
                      <td className="text-gray-500 py-2 pr-3 font-medium whitespace-nowrap">{row.slot}</td>
                      {cities.map(c => (
                        <td key={c} className="text-center py-2 px-2 text-gray-700">
                          {row.byCityAndTotal[c] || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      <td className="text-center py-2 px-2 text-gray-900 font-semibold">{row.byCityAndTotal['_total'] || 0}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="border-t-2 border-gray-200">
                    <td className="text-gray-900 font-bold py-2 pr-3">Total</td>
                    {cities.map(c => (
                      <td key={c} className="text-center py-2 px-2 text-gray-900 font-semibold">{colTotals[c] || 0}</td>
                    ))}
                    <td className="text-center py-2 px-2 text-blue-900 font-bold text-base">{grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-8 text-center text-gray-400 text-sm">
            No visit data yet for this period. Start logging doors to see the matrix.
          </div>
        )}

        {/* Script performance */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Script Performance</h2>
          <div className="space-y-2">
            {scripts.map(s => (
              <div key={s.script} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{s.script}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{SCRIPT_NAMES[s.script]}</p>
                  {s.doors > 0 && (
                    <div className="mt-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-800 h-full rounded-full"
                        style={{ width: `${Math.min(s.conversion_pct, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{s.conversion_pct}%</p>
                  <p className="text-xs text-gray-400">{s.leads}/{s.doors} doors</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Business type performance */}
        {businessTypes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">By Business Type</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="text-gray-500 font-medium pb-2 pr-3">Type</th>
                    <th className="text-gray-500 font-medium pb-2 px-2 text-center">Doors</th>
                    <th className="text-gray-500 font-medium pb-2 px-2 text-center">Leads</th>
                    <th className="text-gray-500 font-medium pb-2 px-2 text-center">🔥 Hot</th>
                    <th className="text-gray-500 font-medium pb-2 pl-2 text-center">% Hot</th>
                  </tr>
                </thead>
                <tbody>
                  {businessTypes.map(row => (
                    <tr key={row.type} className="border-t border-gray-100">
                      <td className="py-2 pr-3 text-gray-700 font-medium whitespace-nowrap">{row.type}</td>
                      <td className="py-2 px-2 text-center text-gray-600">{row.doors}</td>
                      <td className="py-2 px-2 text-center text-gray-600">{row.leads}</td>
                      <td className="py-2 px-2 text-center font-semibold text-orange-600">{row.hot_leads > 0 ? row.hot_leads : <span className="text-gray-300">—</span>}</td>
                      <td className="py-2 pl-2 text-center">
                        <span className={`font-semibold ${row.hot_pct >= 10 ? 'text-green-600' : row.hot_pct >= 5 ? 'text-yellow-600' : 'text-gray-500'}`}>
                          {row.hot_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}

function KpiCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm ring-1 ${accent ? 'bg-blue-900 ring-blue-800 text-white' : 'bg-white ring-gray-200 text-gray-900'}`}>
      <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${accent ? 'text-blue-200' : 'text-gray-400'}`}>{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}
