'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('비밀번호가 올바르지 않아요')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl mb-3">📊</div>
          <h1 className="text-xl font-semibold text-gray-900">광고 대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">팀 전용 접속</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="팀 비밀번호 입력"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !pw}
            className="w-full py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {loading ? '확인 중...' : '입장하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
