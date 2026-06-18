const GHL_BASE = 'https://services.leadconnectorhq.com'

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
