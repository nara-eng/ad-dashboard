import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

function getCalendarClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return google.calendar({ version: 'v3', auth })
}

// POST /api/calendar  { campaign, events: [{col, date, note}] }
export async function POST(req: NextRequest) {
  const { campaign, events } = await req.json()

  try {
    const calendar = getCalendarClient()
    const created = []

    for (const ev of events) {
      const event = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `[${campaign.brand || campaign.name}] ${ev.col}`,
          description: [
            `캠페인: ${campaign.name}`,
            `크리에이터: ${campaign.creator || '-'}`,
            `브랜드: ${campaign.brand || '-'}`,
            ev.note ? `메모: ${ev.note}` : '',
          ].filter(Boolean).join('\n'),
          start: { date: ev.date },
          end: { date: ev.date },
          colorId: ev.col === '업로드' ? '5' : ev.col === '계약서' ? '11' : '7',
        },
      })
      created.push({ col: ev.col, eventId: event.data.id, link: event.data.htmlLink })
    }

    return NextResponse.json({ ok: true, created })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
