import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const COLS = ['기획안','가편','업로드','가이드','샘플','계약서','광고주 일정 소통','기타']

export async function POST(req: NextRequest) {
  const { campaign, milestones } = await req.json()

  const scheduleStr = COLS.map(col => {
    const m = milestones[col]
    if (!m) return `${col}: 미정`
    const date = m.date ? formatDate(m.date) : '미정'
    const status = m.status === 'done' ? ' (완료)' : m.status === 'ing' ? ' (진행중)' : ''
    return `${col}: ${date}${status}`
  }).join('\n')

  const prompt = `
캠페인 정보:
- 캠페인명: ${campaign.name}
- 크리에이터: ${campaign.creator || '미정'}
- 브랜드: ${campaign.brand || '미정'}
- 상품 유형: ${campaign.product || '미정'}
- 담당자: ${campaign.manager || '미정'}

마일스톤 일정:
${scheduleStr}

위 정보를 바탕으로 아래 3가지 메시지를 JSON으로 생성해주세요.
반드시 JSON만 반환하고 다른 텍스트는 없어야 합니다.

{
  "creator_kakao": "크리에이터에게 보내는 카톡 (친근하고 따뜻한 톤, 전체 일정 포함, 마감일 강조)",
  "advertiser_kakao": "광고주 담당자에게 보내는 카톡 (프로페셔널하고 간결, 핵심 날짜만)",
  "advertiser_email": "광고주 담당자에게 보내는 이메일 본문 (정중하고 격식체, 전체 일정표 포함, 인사말/맺음말 포함)"
}
`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content.find(b => b.type === 'text')?.text || '{}'
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
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
