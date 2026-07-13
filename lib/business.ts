import { supabase } from './supabase'
import { updateContact } from './ghl'

interface BusinessParams {
  name: string
  business_type?: string | null
  city?: string | null
  state?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
  ghl_contact_id?: string | null
}

export async function findOrCreateBusiness(params: BusinessParams): Promise<string | null> {
  if (!params.name?.trim()) return null

  const nameLower = params.name.trim().toLowerCase()

  // Try to match by name (case-insensitive) + city
  const query = supabase
    .from('businesses')
    .select('id, ghl_contact_id')
    .ilike('name', params.name.trim())

  if (params.city) query.ilike('city', params.city.trim())

  const { data: existing } = await query.limit(1).maybeSingle()

  if (existing) {
    // Update ghl_contact_id if we now have one and didn't before
    if (params.ghl_contact_id && !existing.ghl_contact_id) {
      await supabase
        .from('businesses')
        .update({ ghl_contact_id: params.ghl_contact_id })
        .eq('id', existing.id)
    }
    return existing.id
  }

  // Create new business record
  const { data: created } = await supabase
    .from('businesses')
    .insert({
      name: params.name.trim(),
      business_type: params.business_type || null,
      city: params.city || null,
      state: params.state || null,
      address: params.address || null,
      lat: params.lat ?? null,
      lng: params.lng ?? null,
      ghl_contact_id: params.ghl_contact_id || null,
    })
    .select('id')
    .single()

  return created?.id ?? null
}

export async function updateGhlVisitCount(businessId: string): Promise<void> {
  const ghlFieldKey = process.env.GHL_VISIT_COUNT_FIELD || 'contact.visit_count'

  const { data: business } = await supabase
    .from('businesses')
    .select('ghl_contact_id')
    .eq('id', businessId)
    .single()

  if (!business?.ghl_contact_id) return

  const { count } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)

  if (count === null) return

  await updateContact(business.ghl_contact_id, {
    fields: {},
    customFields: [{ key: ghlFieldKey, field_value: String(count) }],
  })
}
