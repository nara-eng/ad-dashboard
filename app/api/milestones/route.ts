import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const store: Record<string, any> = {}

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids')?.split(',') || []
  const result: Record<string, any> = {}
  for (const id of ids) {
    if (store[id]) result[id] = store[id]
  }
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const { campaignId, col, status, date, note } = await req.json()
  if (!store[campaignId]) store[campaignId] = {}
  store[campaignId][col] = { status, date, note, updatedAt: new Date().toISOString() }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (id) delete store[id]
  return NextResponse.json({ ok: true })
}
