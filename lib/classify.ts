import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const BUSINESS_TYPES = [
  'Medical Office',
  'Dental Office',
  'School / Education',
  'Law Firm',
  'Accountant / CPA',
  'Insurance Company',
  'Local Service Business',
  'Church / Religious',
  'Retail Store',
  'Grocery Store',
  'Vet Clinic',
  'Apartment Complex',
  'Property Management',
  'Restaurant / Food Service',
  'Fitness / Gym',
  'Salon / Spa',
  'Financial Services',
  'Real Estate',
  'Corporate Office',
  'Other',
] as const

export type BusinessType = typeof BUSINESS_TYPES[number]

export async function classifyBusinessType(businessName: string): Promise<BusinessType> {
  if (!businessName?.trim()) return 'Other'

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      messages: [{
        role: 'user',
        content: `Classify this business name into exactly one category from the list below. Reply with ONLY the category name, nothing else.

Business name: "${businessName}"

Categories:
${BUSINESS_TYPES.join('\n')}`,
      }],
    })

    const result = (response.content[0].type === 'text' ? response.content[0].text : '').trim()
    const match = BUSINESS_TYPES.find(t => t.toLowerCase() === result.toLowerCase())
    return match ?? 'Other'
  } catch {
    return 'Other'
  }
}
