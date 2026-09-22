export interface Visit {
  id: string
  created_at: string
  rep_name: string
  outcome: 'lead_captured' | 'not_captured'
  business_name?: string | null
  city?: string | null
  state?: string | null
  lat?: number | null
  lng?: number | null
  notes?: string | null
  lead_id?: string | null
}

/** Logged-in rep info passed from the server to client components. */
export interface SessionUserClient {
  name: string
  email: string
  title: string
  role: 'admin' | 'rep'
}

export type TimeSlot = 'Morning' | 'Afternoon' | 'Evening'
export type DateRangeKey = 'today' | 'wtd' | 'mtd' | 'past30' | 'custom'

export interface KpiData {
  total_doors: number
  leads_collected: number
  hot_leads: number
  hot_lead_pct: number
}

export interface RepRow {
  rep: string
  doors: number
  leads: number
  hot_leads: number
  conversion_pct: number
}

export interface BusinessTypeRow {
  type: string
  doors: number
  leads: number
  hot_leads: number
  hot_pct: number
}

export interface AnalyticsData {
  kpi: KpiData
  cities: string[]
  matrix: { slot: TimeSlot; byCityAndTotal: Record<string, number> }[]
  reps: RepRow[]
  businessTypes: BusinessTypeRow[]
}
