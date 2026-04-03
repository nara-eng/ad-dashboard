# 📊 광고 프로젝트 대시보드 - 설치 가이드

## 전체 구조
```
Notion 현황판 → 대시보드 웹앱 (Vercel) → 구글 캘린더 / 슬랙
                      ↑ AI 멘트 생성 (Claude API)
```

---

## STEP 1. GitHub 업로드

1. https://github.com 가입 (무료)
2. "New repository" 클릭 → 이름: `ad-dashboard` → Create
3. 이 폴더 전체를 업로드

---

## STEP 2. Vercel 배포

1. https://vercel.com 가입 (GitHub 계정으로 로그인)
2. "New Project" → GitHub에서 `ad-dashboard` 선택
3. **Framework Preset: Next.js** 선택 확인
4. Deploy 클릭 → 자동 배포 (3분)

---

## STEP 3. Vercel KV 설정 (마일스톤 데이터 저장)

1. Vercel 대시보드 → 프로젝트 → Storage 탭
2. "Create Database" → **KV** 선택
3. "Connect to project" 클릭
4. 자동으로 환경변수 연결됨 ✅

---

## STEP 4. 환경변수 설정

Vercel 대시보드 → Settings → Environment Variables 에서 아래 값 입력:

### 필수 설정

| 변수 | 값 | 발급 방법 |
|------|-----|---------|
| `TEAM_PASSWORD` | `원하는비밀번호` | 직접 설정 |
| `NOTION_TOKEN` | `secret_xxx...` | notion.so/my-integrations |
| `NOTION_CAMPAIGNS_DB` | `ebbf83a8...` | 노션 DB URL에서 복사 |
| `ANTHROPIC_API_KEY` | `sk-ant-xxx...` | console.anthropic.com |

### Notion 연동 방법
1. https://www.notion.so/my-integrations → "+ New Integration"
2. 이름: "광고 대시보드", 권한: 읽기/쓰기 체크
3. "Internal Integration Token" 복사 → `NOTION_TOKEN`에 입력
4. 노션에서 비즈니스 현황판 → 우측 상단 "..." → "Connections" → 방금 만든 Integration 추가

### 선택 설정 (없어도 기본 기능은 작동)

| 변수 | 용도 |
|------|------|
| `GOOGLE_CLIENT_ID` | 구글 캘린더 자동 추가 |
| `GOOGLE_CLIENT_SECRET` | 구글 캘린더 자동 추가 |
| `GOOGLE_REFRESH_TOKEN` | 구글 캘린더 자동 추가 |
| `SLACK_WEBHOOK_URL` | 완료 시 슬랙 알림 |

---

## STEP 5. 팀원 공유

배포 완료 후 Vercel이 URL을 발급해줘요:
```
https://ad-dashboard-xxx.vercel.app
```

팀원들에게 이 URL + 비밀번호 공유하면 끝!

---

## Google Calendar 설정 (선택)

1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성 → Google Calendar API 활성화
3. OAuth 동의 화면 설정 → 사용자 인증 정보 → OAuth 클라이언트 ID 생성
4. 발급된 Client ID, Secret 환경변수에 입력
5. Refresh Token 발급: https://developers.google.com/oauthplayground

## Slack 설정 (선택)

1. https://api.slack.com/apps → Create App
2. Incoming Webhooks 활성화
3. "Add New Webhook to Workspace" → 알림 받을 채널 선택
4. Webhook URL 복사 → `SLACK_WEBHOOK_URL`에 입력

---

## 수정하고 싶을 때

코드 수정 → GitHub에 업로드 → Vercel이 자동으로 재배포 (2분)

Claude에게 "대시보드에서 이 부분 바꿔줘" 라고 하면 수정 코드 받을 수 있어요.

---

## 문제 해결

- **로그인이 안 돼요**: `TEAM_PASSWORD` 환경변수 확인
- **노션 데이터가 안 불러와져요**: Integration을 노션 DB에 연결했는지 확인
- **멘트 생성이 안 돼요**: `ANTHROPIC_API_KEY` 확인
