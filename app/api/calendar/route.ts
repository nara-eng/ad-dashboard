import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { campaign, events } = await req.json()
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({ error: 'Google Calendar 환경변수가 설정되지 않았어요' }, { status: 400 })
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    })
    const { access_token } = await tokenRes.json()
    const created = []
    for (const ev of events) {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `[${campaign.brand || campaign.name}] ${ev.col}`,
          description: `캠페인: ${campaign.name}\n크리에이터: ${campaign.creator || '-'}`,
          start: { date: ev.date }, end: { date: ev.date },
        }),
      })
      const data = await res.json()
      created.push({ col: ev.col, link: data.htmlLink })
    }
    return NextResponse.json({ ok: true, created })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
