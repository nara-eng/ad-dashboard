import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { campaign, col, status, date } = await req.json()
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return NextResponse.json({ ok: true, skipped: true })

  const statusEmoji = status === 'done' ? '✅' : status === 'ing' ? '🔄' : '⬜'
  const statusText = status === 'done' ? '완료' : status === 'ing' ? '진행중' : '미정'
  const dateText = date ? ` (${date.split('-')[1]}/${date.split('-')[2]})` : ''

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${statusEmoji} *[${campaign.brand || campaign.name}] ${col}* → ${statusText}${dateText}\n캠페인: ${campaign.name} | 크리에이터: ${campaign.creator || '-'}`,
      }),
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
