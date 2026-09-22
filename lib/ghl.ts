const GHL_BASE = 'https://services.leadconnectorhq.com'

// Commercial Sales pipeline + its "New Leads" stage. Overridable via env.
const COMMERCIAL_PIPELINE_ID = process.env.GHL_COMMERCIAL_PIPELINE_ID || 'k3usaiBss39ESns1bWVj'
const COMMERCIAL_NEW_STAGE_ID = process.env.GHL_COMMERCIAL_STAGE_NEW_ID || '73cdd9b0-1076-483e-b326-3442a82b465f'

function headers() {
  return {
    'Authorization': `Bearer ${process.env.GHL_API_KEY!}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
  }
}

export async function findContactByPhone(phone: string): Promise<string | null> {
  const cleaned = phone.replace(/\D/g, '')
  if (!cleaned) return null
  const url = `${GHL_BASE}/contacts/search/duplicate?locationId=${process.env.GHL_LOCATION_ID}&phone=${encodeURIComponent(cleaned)}`
  const res = await fetch(url, { headers: headers() })
  if (!res.ok) return null
  const data = await res.json()
  return data.contact?.id ?? null
}

interface ContactPayload {
  fields: Record<string, string>
  customFields?: { key: string; field_value: string }[]
}

export async function createContact(payload: ContactPayload): Promise<string | null> {
  const res = await fetch(`${GHL_BASE}/contacts/`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      ...payload.fields,
      locationId: process.env.GHL_LOCATION_ID!,
      ...(payload.customFields?.length ? { customFields: payload.customFields } : {}),
    }),
  })
  const data = await res.json()
  return data.contact?.id ?? null
}

export async function updateContact(id: string, payload: ContactPayload): Promise<void> {
  await fetch(`${GHL_BASE}/contacts/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      ...payload.fields,
      ...(payload.customFields?.length ? { customFields: payload.customFields } : {}),
    }),
  })
}

export async function addTag(contactId: string, tag: string): Promise<void> {
  await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ tags: [tag] }),
  })
}

export async function addNote(contactId: string, body: string): Promise<void> {
  await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ body }),
  })
}

/**
 * Create (or update, if one already exists for this contact) an opportunity in
 * the Commercial Sales pipeline, assigned to the rep who logged the lead.
 * Uses the upsert endpoint so it will not create duplicates.
 */
export async function upsertOpportunity(params: {
  contactId: string
  name: string
  assignedTo?: string | null
}): Promise<void> {
  const body: Record<string, unknown> = {
    pipelineId: COMMERCIAL_PIPELINE_ID,
    pipelineStageId: COMMERCIAL_NEW_STAGE_ID,
    locationId: process.env.GHL_LOCATION_ID!,
    contactId: params.contactId,
    status: 'open',
    name: params.name,
  }
  if (params.assignedTo) body.assignedTo = params.assignedTo

  const res = await fetch(`${GHL_BASE}/opportunities/upsert`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL opportunity upsert failed (${res.status}): ${text}`)
  }
}

export async function sendEmail(params: {
  contactId: string
  fromEmail: string
  subject: string
  body: string
}): Promise<void> {
  const res = await fetch(`${GHL_BASE}/conversations/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      type: 'Email',
      contactId: params.contactId,
      locationId: process.env.GHL_LOCATION_ID!,
      emailFrom: params.fromEmail,
      subject: params.subject,
      html: params.body.replace(/\n/g, '<br>'),
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL email failed (${res.status}): ${text}`)
  }
}
