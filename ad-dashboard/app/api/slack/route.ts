import { NextRequest, NextResponse } from 'next/server'

// POST /api/slack  { campaign, col, status, date, updatedBy }
export async function POST(req: NextRequest) {
  const { campaign, col, status, date, updatedBy } = await req.json()
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return NextResponse.json({ ok: true, skipped: true })

  const statusEmoji = status === 'done' ? '✅' : status === 'ing' ? '🔄' : '⬜'
  const statusText = status === 'done' ? '완료' : status === 'ing' ? '진행중' : '미정'
  const dateText = date ? ` (${formatDate(date)})` : ''

  const payload = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${statusEmoji} *[${campaign.brand || campaign.name}] ${col}* 상태 업데이트`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*캠페인*\n${campaign.name}` },
          { type: 'mrkdwn', text: `*크리에이터*\n${campaign.creator || '-'}` },
          { type: 'mrkdwn', text: `*마일스톤*\n${col}${dateText}` },
          { type: 'mrkdwn', text: `*상태*\n${statusText}` },
        ],
      },
      updatedBy ? {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `업데이트: ${updatedBy}` }],
      } : null,
    ].filter(Boolean),
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function formatDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${+m}/${+d}`
}
