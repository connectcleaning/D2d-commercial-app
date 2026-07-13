import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { classifyBusinessType } from '@/lib/classify'
import { findOrCreateBusiness, updateGhlVisitCount } from '@/lib/business'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const rep_name = (formData.get('rep_name') as string) || 'Unknown'
    const script = parseInt(formData.get('script') as string) || 1
    const business_name = (formData.get('business_name') as string) || null
    const notes = (formData.get('notes') as string) || null
    const city = (formData.get('city') as string) || null
    const state = (formData.get('state') as string) || null
    const latRaw = formData.get('lat') as string | null
    const lngRaw = formData.get('lng') as string | null

    const lat = latRaw ? parseFloat(latRaw) : null
    const lng = lngRaw ? parseFloat(lngRaw) : null
    const business_type = business_name ? await classifyBusinessType(business_name) : 'Other'

    const business_id = await findOrCreateBusiness({
      name: business_name || '',
      business_type,
      city,
      state,
      lat,
      lng,
    })

    const { data: visitRow } = await supabase.from('visits').insert({
      rep_name,
      script,
      outcome: 'not_captured',
      business_name,
      business_type,
      business_id,
      notes,
      city,
      state,
      lat,
      lng,
      lead_id: null,
    }).select('id').single()

    if (business_id) await updateGhlVisitCount(business_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[visit]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
