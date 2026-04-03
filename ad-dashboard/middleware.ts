import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  // API 경로는 별도 인증 처리
  if (req.nextUrl.pathname.startsWith('/api')) return NextResponse.next()

  const cookie = req.cookies.get('auth')?.value
  if (cookie === process.env.TEAM_PASSWORD) return NextResponse.next()

  // 로그인 페이지는 통과
  if (req.nextUrl.pathname === '/login') return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
