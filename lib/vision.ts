import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface CardData {
  [key: string]: string | null | undefined
  business_name?: string | null
  decision_maker_name?: string | null
  title?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  notes?: string | null
}

export async function parseBusinessCard(imageBase64: string, mediaType: string): Promise<CardData> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: `Analyze this image of a business card, sticky note, or handwritten note. Extract all contact information.

Return ONLY a valid JSON object with these exact fields (use null for anything not found):
{
  "business_name": null,
  "decision_maker_name": null,
  "title": null,
  "email": null,
  "phone": null,
  "address": null,
  "city": null,
  "state": null,
  "zip": null,
  "notes": null
}

The "notes" field: include any handwritten text, annotations, or additions that are NOT part of the standard printed contact info.
Return only the JSON object. No markdown fences, no explanation.`,
        },
      ],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {}
  }
}
