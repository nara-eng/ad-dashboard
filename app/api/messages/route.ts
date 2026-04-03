import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const COLS = ['기획안','가편','업로드','가이드','샘플','계약서','광고주 일정 소통','기타']

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았어요' }, { status: 400 })
  }

  const { campaign, milestones } = await req.json()

  const scheduleStr = COLS.map(col => {
    const m = milestones?.[col]
    if (!m) return `${col}: 미정`
    const date = m.date ? formatDate(m.date) : '미정'
    const status = m.status === 'done' ? ' (완료)' : m.status === 'ing' ? ' (진행중)' : ''
    return `${col}: ${date}${status}`
  }).join('\n')

  const prompt = `캠페인 정보:
- 캠페인명: ${campaign.name}
- 크리에이터: ${campaign.creator || '미정'}
- 브랜드: ${campaign.brand || '미정'}
- 상품 유형: ${campaign.product || '미정'}

마일스톤 일정:
${scheduleStr}

아래 3가지 메시지를 JSON으로만 생성해주세요. JSON 외 다른 텍스트 없이:
{"creator_kakao":"크리에이터 카톡(친근)","advertiser_kakao":"광고주 카톡(프로)","advertiser_email":"광고주 이메일(정중)"}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'
    const start = text.indexOf('{'), end = text.lastIndexOf('}')
    const messages = JSON.parse(text.slice(start, end + 1))
    return NextResponse.json({ messages })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function formatDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${+m}월 ${+d}일`
}
