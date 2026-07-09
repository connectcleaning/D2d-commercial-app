export interface Visit {
  id: string
  created_at: string
  rep_name: string
  script: number
  outcome: 'lead_captured' | 'not_captured'
  business_name?: string | null
  city?: string | null
  state?: string | null
  lat?: number | null
  lng?: number | null
  notes?: string | null
  lead_id?: string | null
}

export interface RepContext {
  rep_name: string
  script: number
}

export type TimeSlot = 'Morning' | 'Afternoon' | 'Evening'
export type DateRangeKey = 'today' | 'wtd' | 'mtd' | 'past30' | 'custom'

export interface KpiData {
  total_doors: number
  leads_collected: number
  hot_leads: number
  hot_lead_pct: number
}

export interface ScriptRow {
  script: number
  doors: number
  leads: number
  conversion_pct: number
}

export interface AnalyticsData {
  kpi: KpiData
  cities: string[]
  matrix: { slot: TimeSlot; byCityAndTotal: Record<string, number> }[]
  scripts: ScriptRow[]
}
