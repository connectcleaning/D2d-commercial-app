import { NextRequest, NextResponse } from 'next/server'
import { parseBusinessCard, CardData } from '@/lib/vision'
import { findContactByPhone, createContact, updateContact, addTag, addNote, sendEmail } from '@/lib/ghl'
import { classifyBusinessType } from '@/lib/classify'
import { supabase } from '@/lib/supabase'

const TAG_MAP: Record<string, string> = {
  Cold: 'new-cold-commercial-lead',
  Warm: 'new-warm-commercial-lead',
  Hot: 'new-hot-commercial-lead',
  Networking: 'b2b-network-contact',
}

function clean(obj: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v && v.trim() !== ''))
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const manual = {
      business_name: (formData.get('business_name') as string) || '',
      decision_maker_name: (formData.get('decision_maker_name') as string) || '',
      email: (formData.get('email') as string) || '',
      title: (formData.get('title') as string) || '',
      address: (formData.get('address') as string) || '',
      city: (formData.get('city') as string) || '',
      state: (formData.get('state') as string) || '',
      zip: (formData.get('zip') as string) || '',
      lead_status: (formData.get('lead_status') as string) || 'Cold',
      phone: (formData.get('phone') as string) || '',
      notes: (formData.get('notes') as string) || '',
    }

    const visitMeta = {
      rep_name: (formData.get('rep_name') as string) || 'Unknown',
      script: parseInt(formData.get('script') as string) || 1,
      lat: formData.get('lat') ? parseFloat(formData.get('lat') as string) : null,
      lng: formData.get('lng') ? parseFloat(formData.get('lng') as string) : null,
    }

    const emailData = {
      send_email: formData.get('send_email') === 'true',
      email_subject: (formData.get('email_subject') as string) || '',
      email_body: (formData.get('email_body') as string) || '',
    }

    // Collect all photos (single photo or multiple: photo_0, photo_1, ...)
    const photoFiles: File[] = []
    const single = formData.get('photo') as File | null
    if (single && single.size > 0) photoFiles.push(single)
    for (let i = 0; i < 10; i++) {
      const f = formData.get(`photo_${i}`) as File | null
      if (f && f.size > 0) photoFiles.push(f)
    }

    // Extract from all photos in parallel, merge results (first non-null value wins)
    let ai: CardData = {}
    if (photoFiles.length > 0) {
      const results = await Promise.all(photoFiles.map(async (file) => {
        const bytes = await file.arrayBuffer()
        const base64 = Buffer.from(bytes).toString('base64')
        const mediaType = file.type || 'image/jpeg'
        return parseBusinessCard(base64, mediaType)
      }))
      // Merge: first non-null value across all photos wins
      for (const result of results) {
        for (const key of Object.keys(result) as (keyof CardData)[]) {
          if (!ai[key] && result[key]) ai[key] = result[key]
        }
      }
    }

    const merged = {
      business_name: manual.business_name || ai.business_name || '',
      name: manual.decision_maker_name || ai.decision_maker_name || '',
      email: manual.email || ai.email || '',
      title: manual.title || ai.title || '',
      address: manual.address || ai.address || '',
      city: manual.city || ai.city || '',
      state: manual.state || ai.state || '',
      zip: manual.zip || ai.zip || '',
      phone: manual.phone || ai.phone || '',
      lead_status: manual.lead_status,
      manual_notes: manual.notes,
      ai_notes: (ai.notes as string) || '',
    }

    const nameParts = merged.name.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const contactPayload = {
      fields: clean({
        firstName,
        lastName,
        email: merged.email,
        phone: merged.phone,
        address1: merged.address,
        city: merged.city,
        state: merged.state,
        postalCode: merged.zip,
        companyName: merged.business_name,
      }),
      customFields: merged.title
        ? [{ key: 'contact.title', field_value: merged.title }]
        : [],
    }

    let contactId: string | null = null
    if (merged.phone) {
      contactId = await findContactByPhone(merged.phone)
    }

    if (contactId) {
      await updateContact(contactId, contactPayload)
    } else {
      contactId = await createContact(contactPayload)
    }

    if (contactId) {
      const tag = TAG_MAP[merged.lead_status] || 'new-cold-commercial-lead'
      await addTag(contactId, tag)

      const noteParts: string[] = []
      if (merged.manual_notes) noteParts.push(merged.manual_notes)
      if (merged.ai_notes) noteParts.push(`[From photo] ${merged.ai_notes}`)

      if (noteParts.length > 0) {
        await addNote(contactId, noteParts.join('\n\n'))
      }

      if (emailData.send_email) {
        if (!merged.email) {
          console.warn('[submit] Email send requested but no email address on contact')
        } else if (!process.env.GHL_EMAIL_FROM) {
          console.error('[submit] GHL_EMAIL_FROM env var not set')
        } else {
          await sendEmail({
            contactId,
            fromEmail: process.env.GHL_EMAIL_FROM,
            subject: emailData.email_subject,
            body: emailData.email_body,
          })
        }
      }
    }

    const allNotes = [merged.manual_notes, merged.ai_notes].filter(Boolean).join('\n')

    const { data: leadRow } = await supabase.from('leads').insert({
      business_name: merged.business_name,
      decision_maker_name: merged.name,
      email: merged.email,
      title: merged.title,
      address: merged.address,
      city: merged.city,
      state: merged.state,
      zip: merged.zip,
      lead_status: merged.lead_status,
      phone: merged.phone,
      notes: allNotes,
      ghl_contact_id: contactId,
      status: contactId ? 'success' : 'partial',
    }).select('id').single()

    const business_type = merged.business_name ? await classifyBusinessType(merged.business_name) : 'Other'

    await supabase.from('visits').insert({
      rep_name: visitMeta.rep_name,
      script: visitMeta.script,
      outcome: 'lead_captured',
      business_name: merged.business_name || null,
      business_type,
      city: merged.city || null,
      state: merged.state || null,
      lat: visitMeta.lat,
      lng: visitMeta.lng,
      notes: merged.manual_notes || null,
      lead_id: leadRow?.id ?? null,
    })

    return NextResponse.json({ success: true, contactId })
  } catch (err: any) {
    console.error('[submit]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
