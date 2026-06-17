import { NextRequest, NextResponse } from 'next/server'
import { parseBusinessCard } from '@/lib/vision'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const photoFile = formData.get('photo') as File | null
    if (!photoFile || photoFile.size === 0) return NextResponse.json({})
    const bytes = await photoFile.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = photoFile.type || 'image/jpeg'
    const data = await parseBusinessCard(base64, mediaType)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
