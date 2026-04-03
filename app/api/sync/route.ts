import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!process.env.NOTION_TOKEN) {
    return NextResponse.json({ campaigns: [], error: 'NOTION_TOKEN이 설정되지 않았어요' })
  }

  const notion = new Client({ auth: process.env.NOTION_TOKEN })

  try {
    const dbId = process.env.NOTION_CAMPAIGNS_DB!
    const response = await notion.databases.query({
      database_id: dbId,
      sorts: [{ property: '월', direction: 'descending' }],
      page_size: 100,
    })

    const campaigns = response.results.map((page: any) => {
      const props = page.properties
      return {
        id: page.id,
        url: page.url,
        name: props['캠페인명']?.title?.[0]?.plain_text || '',
        creator: props['크리에이터']?.select?.name || null,
        brand: props['브랜드']?.rich_text?.[0]?.plain_text || null,
        product: props['상품']?.select?.name || null,
        month: props['월']?.select?.name || null,
        upload_date: props['업로드 일자']?.date?.start || null,
        contract: props['계약서']?.select?.name || null,
        manager: props['담당자']?.select?.name || null,
        memo: props['메모']?.rich_text?.[0]?.plain_text || '',
      }
    }).filter((c: any) => c.name || c.brand)

    return NextResponse.json({ campaigns })
  } catch (err: any) {
    return NextResponse.json({ campaigns: [], error: err.message })
  }
}
