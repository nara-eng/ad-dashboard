'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import clsx from 'clsx'

// ─── 상수 ──────────────────────────────────────────────
const COLS = ['기획안','가편','업로드','가이드','샘플','계약서','광고주 일정 소통','기타'] as const
type Col = typeof COLS[number]

const STATUS = { none: '미정', ing: '진행중', done: '완료' } as const
type Status = keyof typeof STATUS

const COLORS = ['#5DCAA5','#7F77DD','#D85A30','#378ADD','#D4537E','#EF9F27','#63B3ED','#888780','#1D9E75','#BA7517']

interface Campaign {
  id: string; url: string; name: string
  creator?: string; brand?: string; product?: string
  month?: string; upload_date?: string; contract?: string; manager?: string
  color?: string
}
interface MilestoneData { status: Status; date: string; note: string }
type Milestones = Record<string, Record<Col, MilestoneData>>

// ─── 유틸 ──────────────────────────────────────────────
function parseDate(s: string) {
  const n = s.replace(/\D/g,'')
  if (!n) return { valid: false, display: '', iso: '' }
  const now = new Date(), cm = now.getMonth()+1, cy = now.getFullYear()
  let mo: number, d: number
  if (n.length <= 2) { mo = cm; d = +n }
  else if (n.length === 3) { mo = +n[0]; d = +n.slice(1) }
  else if (n.length === 4) { mo = +n.slice(0,2); d = +n.slice(2) }
  else return { valid: false, display: '', iso: '' }
  if (!mo||!d||mo<1||mo>12||d<1||d>31) return { valid: false, display: '', iso: '' }
  const iso = `${cy}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  return { valid: true, display: `${mo}/${d}`, iso }
}

function dispDate(iso: string) {
  if (!iso) return ''
  const [,m,d] = iso.split('-')
  return `${+m}/${+d}`
}

function isoToInput(iso: string) {
  if (!iso) return ''
  const [,m,d] = iso.split('-')
  return `${m}${d}`
}

const DOT: Record<Status, string> = {
  none: 'bg-gray-300',
  ing: 'bg-ing',
  done: 'bg-done',
}
const LABEL_COLOR: Record<Status, string> = {
  none: 'text-gray-400',
  ing: 'text-ing-text',
  done: 'text-done-text',
}
const STATUS_PILL: Record<Status, string> = {
  none: 'bg-gray-100 text-gray-500 border-gray-200',
  ing: 'bg-ing-bg text-ing-text border-ing',
  done: 'bg-done-bg text-done-text border-done',
}

// ─── 메인 컴포넌트 ──────────────────────────────────────
export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [milestones, setMilestones] = useState<Milestones>({})
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState('')
  const [filter, setFilter] = useState('4월')
  const [editing, setEditing] = useState<{pid:string; col:Col} | null>(null)
  const [eDate, setEDate] = useState('')
  const [eNote, setENote] = useState('')
  const [eStat, setEStat] = useState<Status>('none')
  const [panel, setPanel] = useState<{pid:string; tab:string; loading:boolean; messages:any} | null>(null)
  const [calLoading, setCalLoading] = useState<Record<string,boolean>>({})
  const [calDone, setCalDone] = useState<Record<string,boolean>>({})
  const [copyFeedback, setCopyFeedback] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)

  // ── 노션 동기화 ─────────────────────────────────────
  const syncNotion = useCallback(async () => {
    setSyncing(true); setSyncNote('동기화 중...')
    try {
      const res = await fetch('/api/sync')
      const { campaigns: items, error } = await res.json()
      if (error) throw new Error(error)
      setCampaigns(prev => {
        const map: Record<string, Campaign> = Object.fromEntries(prev.map(p => [p.id, p]))
        let ci = prev.length
        items.forEach((item: Campaign) => {
          map[item.id] = { ...map[item.id], ...item, color: map[item.id]?.color || COLORS[ci++ % COLORS.length] }
        })
        return Object.values(map)
      })
      // 마일스톤 데이터 로드
      const ids = items.map((i: Campaign) => i.id).join(',')
      if (ids) {
        const msRes = await fetch(`/api/milestones?ids=${ids}`)
        const msData = await msRes.json()
        setMilestones(prev => {
          const next = { ...prev }
          items.forEach((item: Campaign) => {
            if (!next[item.id]) {
              next[item.id] = Object.fromEntries(COLS.map(c => [c, { status: 'none', date: '', note: '' }])) as Record<Col, MilestoneData>
            }
            if (msData[item.id]) {
              Object.assign(next[item.id], msData[item.id])
            }
            // 노션에서 업로드 일자 자동 반영
            if (item.upload_date && !next[item.id]['업로드']?.date) {
              next[item.id]['업로드'] = { ...next[item.id]['업로드'], date: item.upload_date }
            }
            if (item.contract) {
              const s: Status = item.contract === '완료' ? 'done' : item.contract === '진행중' ? 'ing' : 'none'
              if (s !== 'none') next[item.id]['계약서'] = { ...next[item.id]['계약서'], status: s }
            }
          })
          return next
        })
      }
      setSyncNote(`✓ ${items.length}개 불러옴`)
    } catch (e: any) {
      setSyncNote(`동기화 실패: ${e.message}`)
    }
    setSyncing(false)
    setTimeout(() => setSyncNote(''), 3000)
  }, [])

  // ── 셀 편집 ─────────────────────────────────────────
  const getMil = (pid: string, col: Col): MilestoneData =>
    milestones[pid]?.[col] || { status: 'none', date: '', note: '' }

  const commitEdit = useCallback(async (pid: string, col: Col, stat: Status, dateStr: string, note: string) => {
    const parsed = parseDate(dateStr)
    const data: MilestoneData = { status: stat, date: parsed.valid ? parsed.iso : '', note }
    // 로컬 상태 업데이트
    setMilestones(prev => ({
      ...prev,
      [pid]: { ...(prev[pid] || {}), [col]: data } as Record<Col, MilestoneData>
    }))
    // KV에 저장
    await fetch('/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: pid, col, ...data }),
    })
    // 완료 시 슬랙 알림
    if (stat === 'done') {
      const camp = campaigns.find(c => c.id === pid)
      if (camp) {
        fetch('/api/slack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign: camp, col, status: stat, date: data.date }),
        })
      }
    }
  }, [campaigns])

  const activate = useCallback((pid: string, col: Col) => {
    if (editing) {
      commitEdit(editing.pid, editing.col, eStat, eDate, eNote)
    }
    const m = getMil(pid, col)
    setEditing({ pid, col })
    setEDate(isoToInput(m.date))
    setENote(m.note)
    setEStat(m.status)
    setTimeout(() => { dateInputRef.current?.focus(); dateInputRef.current?.select() }, 20)
  }, [editing, eStat, eDate, eNote, commitEdit])

  const closeEdit = useCallback((save = true) => {
    if (save && editing) commitEdit(editing.pid, editing.col, eStat, eDate, eNote)
    setEditing(null)
  }, [editing, eStat, eDate, eNote, commitEdit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, pid: string, col: Col) => {
    if (e.key === 'Enter') { e.preventDefault(); closeEdit(true); return }
    if (e.key === 'Escape') { setEditing(null); return }
    if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit(pid, col, eStat, eDate, eNote)
      setEditing(null)
      const flat = filteredCampaigns.flatMap(p => COLS.map(c => ({ pid: p.id, col: c as Col })))
      const idx = flat.findIndex(x => x.pid === pid && x.col === col)
      const next = flat[e.shiftKey ? idx - 1 : idx + 1]
      if (next) setTimeout(() => activate(next.pid, next.col), 30)
    }
  }, [eStat, eDate, eNote, commitEdit, closeEdit, activate])

  // ── 메시지 생성 ─────────────────────────────────────
  const openPanel = useCallback(async (pid: string) => {
    if (editing) closeEdit(true)
    setPanel({ pid, tab: 'creator', loading: true, messages: null })
    const camp = campaigns.find(c => c.id === pid)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: camp, milestones: milestones[pid] || {} }),
      })
      const { messages, error } = await res.json()
      if (error) throw new Error(error)
      setPanel(p => p ? { ...p, loading: false, messages } : null)
    } catch (e: any) {
      setPanel(p => p ? { ...p, loading: false, messages: { error: e.message } } : null)
    }
  }, [editing, campaigns, milestones, closeEdit])

  // ── 캘린더 추가 ─────────────────────────────────────
  const addToCalendar = useCallback(async (pid: string, col: Col) => {
    const camp = campaigns.find(c => c.id === pid)
    const m = getMil(pid, col)
    if (!m.date) return
    const key = `${pid}-${col}`
    setCalLoading(prev => ({ ...prev, [key]: true }))
    try {
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: camp, events: [{ col, date: m.date, note: m.note }] }),
      })
      setCalDone(prev => ({ ...prev, [key]: true }))
    } catch {}
    setCalLoading(prev => ({ ...prev, [key]: false }))
  }, [campaigns, getMil])

  const addAllToCalendar = useCallback(async (pid: string) => {
    const cols = COLS.filter(c => getMil(pid, c).date)
    for (const col of cols) await addToCalendar(pid, col)
  }, [getMil, addToCalendar])

  // ── 필터 ────────────────────────────────────────────
  const filteredCampaigns = (() => {
    if (filter === '전체') return campaigns
    if (filter === '진행중') return campaigns.filter(p => COLS.some(c => getMil(p.id, c).status === 'ing'))
    if (filter === '특이사항') return campaigns.filter(p => COLS.some(c => getMil(p.id, c).note))
    const monthMap: Record<string, string> = { '1월':'01','2월':'02','3월':'03','4월':'04','5월':'05','6월':'06','7월':'07','8월':'08','9월':'09','10월':'10','11월':'11','12월':'12' }
    if (monthMap[filter]) return campaigns.filter(p => p.month === filter)
    return campaigns
  })()

  // ── 통계 ────────────────────────────────────────────
  const allMs = Object.values(milestones).flatMap(m => Object.values(m))
  const stats = {
    total: campaigns.length,
    done: allMs.filter(m => m.status === 'done').length,
    ing: allMs.filter(m => m.status === 'ing').length,
  }

  const panelCamp = panel ? campaigns.find(c => c.id === panel.pid) : null
  const msgs = panel?.messages || {}
  const msgKey: Record<string, string> = { creator: 'creator_kakao', kakao: 'advertiser_kakao', email: 'advertiser_email' }

  function copyMsg() {
    const text = msgs[msgKey[panel?.tab || 'creator']] || ''
    navigator.clipboard.writeText(text)
    setCopyFeedback('복사됨!'); setTimeout(() => setCopyFeedback(''), 1500)
  }

  // ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">📊</span>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">광고 프로젝트 대시보드</h1>
              <p className="text-xs text-gray-400">노션 비즈니스 현황판 연동</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{syncNote}</span>
            <button
              onClick={syncNotion}
              disabled={syncing}
              className="btn btn-primary text-xs"
            >
              {syncing ? '동기화 중...' : '🔄 노션 동기화'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-4">
        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: '전체 프로젝트', value: stats.total, color: 'text-gray-900' },
            { label: '완료된 마일스톤', value: stats.done, color: 'text-done-text' },
            { label: '진행중', value: stats.ing, color: 'text-ing-text' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* 힌트 + 필터 */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex gap-3 text-xs text-gray-400">
            {[['클릭','셀 선택'],['15','이번달'],['0430','4월30일'],['Tab','이동'],['Enter','저장'],['💬','멘트']].map(([k,d]) => (
              <span key={k} className="flex items-center gap-1">
                <span className="bg-gray-100 border border-gray-200 rounded px-1 py-0.5 font-mono text-gray-600">{k}</span>
                {d}
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {['4월','3월','2월','1월','전체','진행중','특이사항'].map(v => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 980 }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 text-gray-500 font-medium w-36">캠페인</th>
                  {COLS.map(c => (
                    <th key={c} className="text-left px-2 py-2.5 text-gray-500 font-medium whitespace-nowrap">{c}</th>
                  ))}
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.length === 0 && (
                  <tr>
                    <td colSpan={COLS.length + 2} className="text-center py-12 text-gray-400">
                      {campaigns.length === 0 ? '노션 동기화 버튼을 눌러 프로젝트를 불러오세요' : '해당하는 프로젝트가 없어요'}
                    </td>
                  </tr>
                )}
                {filteredCampaigns.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    {/* 캠페인명 */}
                    <td className="px-3 py-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                        <div>
                          <p className="font-medium text-gray-900 leading-tight truncate max-w-[120px]">
                            {p.name || p.brand}
                          </p>
                          {p.creator && <p className="text-gray-400 leading-tight">{p.creator}</p>}
                        </div>
                      </div>
                    </td>

                    {/* 마일스톤 셀 */}
                    {COLS.map(col => {
                      const m = getMil(p.id, col)
                      const isAct = editing?.pid === p.id && editing?.col === col
                      const pv = isAct ? parseDate(eDate) : null

                      return (
                        <td key={col} className="px-1 py-1">
                          <div
                            className={clsx(
                              'milestone-cell rounded-lg border px-2 py-1.5 cursor-pointer transition-all min-h-[44px]',
                              isAct
                                ? 'active border-brand bg-white shadow-sm'
                                : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                            )}
                            onClick={() => { if (!isAct) activate(p.id, col) }}
                          >
                            {/* 표시 모드 */}
                            {!isAct && (
                              <>
                                <div className="flex items-center gap-1.5">
                                  <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', DOT[m.status])} />
                                  <span className={clsx('text-[10px]', LABEL_COLOR[m.status])}>
                                    {STATUS[m.status]}
                                  </span>
                                </div>
                                {m.date && <p className="text-[10px] text-gray-500 mt-0.5">{dispDate(m.date)}</p>}
                                {m.note && <p className="text-[9px] text-gray-400 mt-0.5 truncate max-w-[80px]">{m.note}</p>}
                              </>
                            )}

                            {/* 편집 모드 */}
                            {isAct && (
                              <div className="space-y-1.5">
                                <input
                                  ref={dateInputRef}
                                  value={eDate}
                                  onChange={e => setEDate(e.target.value)}
                                  onKeyDown={e => handleKeyDown(e, p.id, col)}
                                  placeholder="날짜 (15, 0430)"
                                  maxLength={8}
                                  className="w-full text-xs font-medium bg-transparent text-gray-900 placeholder:text-gray-300 placeholder:text-[10px]"
                                />
                                <p className="text-[9px] text-brand min-h-[10px]">
                                  {pv?.valid ? `→ ${pv.display}` : ''}
                                </p>
                                <div className="flex gap-1">
                                  {(['none','ing','done'] as Status[]).map(s => (
                                    <button
                                      key={s}
                                      onClick={e => { e.stopPropagation(); setEStat(s) }}
                                      className={clsx(
                                        'text-[9px] px-1.5 py-0.5 rounded-full border transition-colors',
                                        eStat === s ? STATUS_PILL[s] : 'border-gray-200 text-gray-400'
                                      )}
                                    >
                                      {STATUS[s]}
                                    </button>
                                  ))}
                                </div>
                                <input
                                  value={eNote}
                                  onChange={e => setENote(e.target.value)}
                                  onKeyDown={e => handleKeyDown(e, p.id, col)}
                                  placeholder="메모"
                                  className="w-full text-[9px] bg-transparent text-gray-500 placeholder:text-gray-300"
                                />
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}

                    {/* 액션 */}
                    <td className="px-1">
                      <button
                        onClick={() => openPanel(p.id)}
                        title="소통 멘트 생성"
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        💬
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 메시지 패널 */}
        {panel && panelCamp && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* 패널 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {panelCamp.name}
                  {panelCamp.creator && <span className="font-normal text-gray-400 ml-2 text-xs">· {panelCamp.creator}</span>}
                </p>
                <p className="text-xs text-gray-400">소통 멘트 자동 생성 <span className="text-done-text ml-2">{copyFeedback}</span></p>
              </div>
              <button
                onClick={() => setPanel(null)}
                className="text-gray-400 hover:text-gray-600 text-lg px-2 py-1 rounded hover:bg-gray-100"
              >✕</button>
            </div>

            {/* 탭 */}
            <div className="flex border-b border-gray-200">
              {[
                { k:'creator', l:'크리에이터 카톡' },
                { k:'kakao', l:'광고주 카톡' },
                { k:'email', l:'광고주 이메일' },
                { k:'cal', l:'📅 캘린더 추가' },
              ].map(t => (
                <button
                  key={t.k}
                  onClick={() => setPanel(p => p ? { ...p, tab: t.k } : null)}
                  className={clsx(
                    'px-4 py-2.5 text-xs border-b-2 transition-colors',
                    panel.tab === t.k
                      ? 'border-brand text-brand font-medium'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  )}
                >
                  {t.l}
                </button>
              ))}
            </div>

            {/* 패널 본문 */}
            <div className="p-5">
              {panel.loading && (
                <div className="text-center py-8 text-sm text-gray-400">AI가 멘트 작성 중...</div>
              )}

              {!panel.loading && panel.tab !== 'cal' && (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[80px] max-h-[200px] overflow-y-auto border border-gray-200">
                    {msgs.error || msgs[msgKey[panel.tab]] || '내용 없음'}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={copyMsg} className="btn btn-ghost text-xs">복사하기</button>
                    <button onClick={() => openPanel(panel.pid)} className="btn btn-ghost text-xs ml-auto">🔄 다시 생성</button>
                  </div>
                </>
              )}

              {!panel.loading && panel.tab === 'cal' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-3">날짜가 입력된 마일스톤을 구글 캘린더에 추가해요</p>
                  {COLS.filter(c => getMil(panel.pid, c).date).map(col => {
                    const key = `${panel.pid}-${col}`
                    const done = calDone[key]
                    const loading = calLoading[key]
                    return (
                      <div key={col} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-100">
                        <div>
                          <p className="text-xs font-medium text-gray-800">[{panelCamp.brand || panelCamp.name}] {col}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{dispDate(getMil(panel.pid, col).date)}</p>
                        </div>
                        <button
                          onClick={() => addToCalendar(panel.pid, col)}
                          disabled={done || loading}
                          className={clsx(
                            'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                            done ? 'bg-done-bg text-done-text border-done cursor-default' : 'btn btn-ghost'
                          )}
                        >
                          {loading ? '추가 중...' : done ? '✓ 추가됨' : '추가'}
                        </button>
                      </div>
                    )
                  })}
                  {COLS.filter(c => getMil(panel.pid, c).date).length === 0 && (
                    <p className="text-xs text-gray-400">날짜가 입력된 마일스톤이 없어요. 먼저 날짜를 입력해주세요.</p>
                  )}
                  {COLS.filter(c => getMil(panel.pid, c).date).length > 1 && (
                    <button
                      onClick={() => addAllToCalendar(panel.pid)}
                      className="btn btn-primary text-xs w-full mt-2"
                    >
                      전체 추가 ({COLS.filter(c => getMil(panel.pid, c).date).length}개)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 클릭 외부 닫기 */}
      {editing && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => closeEdit(true)}
        />
      )}
    </div>
  )
}
