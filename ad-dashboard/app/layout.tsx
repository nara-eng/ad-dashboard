import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '광고 프로젝트 대시보드',
  description: '마일스톤 & 소통 관리',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}
