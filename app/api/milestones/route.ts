import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

// GET /api/milestones?ids=id1,id2,...
export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids')?.split(',') || []
  if (!ids.length) return NextResponse.json({})

  const result: Record<string, any> = {}
  for (const id of ids) {
    const data = await kv.get(`ms:${id}`)
    if (data) result[id] = data
  }
  return NextResponse.json(result)
}

// POST /api/milestones  { campaignId, col, status, date, note }
export async function POST(req: NextRequest) {
  const { campaignId, col, status, date, note } = await req.json()
  const key = `ms:${campaignId}`
  const existing: any = (await kv.get(key)) || {}
  existing[col] = { status, date, note, updatedAt: new Date().toISOString() }
  await kv.set(key, existing)
  return NextResponse.json({ ok: true })
}

// DELETE /api/milestones?id=campaignId  (리셋)
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (id) await kv.del(`ms:${id}`)
  return NextResponse.json({ ok: true })
}
