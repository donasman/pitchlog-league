# 수익화 계획 — AdSense US$100

> 작성 2026-10-16. 근거는 두 가지다 — 10-16 딥 리서치(출처 21곳 · 주장 25개 검증 · 21개 통과 · 4개 반박) · 같은 날 사용자 결정(1장 목표 · 2장 표).
> 진행 순서의 기준은 `NEXT_STEPS.md` 1장 16번이고, 이 문서는 그 근거와 판 구성이다.

## 1. 목표

**Google AdSense 지급 기준액 US$100 도달** (2026-10-16 사용자 설정 · 처음 $10 → 같은 날 $100 으로 수정).

## 2. 결정 (2026-10-16 사용자)

| 항목 | 결정 | 근거 · 대가 |
|---|---|---|
| API-Football 구독 | **AdSense 승인까지 갱신** (만료 2026-10-22 — 갱신은 사용자 몫). 직접 입력 기능은 그 뒤 | 방문자는 최신 경기·라이브를 보러 온다 — 데이터가 멈추면 트래픽이 준다. 구독 비용이 수익보다 먼저 나간다 |
| 엠블럼 933개 (`frontend/public/logos`) | **그대로 유지** | 권리자 허가 없는 표시다 (3-2). 위험은 운영자가 진다 — 사용자 판단 |
| 배포 브랜치 | **Cloudflare Pages · EC2 둘 다 `main`** | 릴리즈 = 배포. 프론트·백엔드 버전이 어긋나지 않는다. 5장 C 판 전까지는 지금처럼 `dev` |
| 심사용 콘텐츠 | **글 섹션** — 저장소 마크다운 파일로 글을 쓰고 경기 페이지에 관련 글 링크. 글은 사용자가 쓴다 | 3-3 |
| 도메인 | 사용자가 구매해 Cloudflare 에 연결 | 3-5 · 4장 |

## 3. 확인된 제약 (10-16 리서치 · 3표 검증 통과)

### 3-1. Vercel Hobby 는 광고를 금지한다
Hobby 는 비상업적 개인 용도 전용이고, 공정 사용 가이드라인이 "Google AdSense 같은 광고 삽입" 을 상업적 사용의 예로 든다. 상업적 사용은 Pro·Enterprise 가 필요하다. **후원(donation) 요청은 상업적 사용이 아니라고 명시**한다 (가이드라인 2026-09-14 갱신판).
→ 광고를 붙이기 전에 호스팅을 옮긴다 (5장 C).

### 3-2. API-Sports 약관은 게시 라이선스를 주지 않는다
- 데이터 사용·게시 라이선스를 주지 않는다. 게시 허가는 리그·연맹·대회 주최자 같은 권리자에게 사용자가 직접 받아야 하고, API-Sports 는 대회에 대한 상업적 권리를 주지 않는다. 인정된 권리자가 공식 항의하면 환불 없이 API 접근을 정지·종료할 수 있다. 준거법은 프랑스법.
- 팀·리그·선수·경기장 로고와 이미지는 "식별·설명 목적" 으로만 제공한다. API-Sports 는 그 IP 를 소유·주장하지 않고, 쓰려면 권리자의 별도 허가가 필요할 수 있다. 서비스 국가의 법을 지킬 책임은 사용자에게 있다.
- 출처 한계: 라이브 약관 페이지는 Cloudflare 봇 검사로 403 이라 Wayback 스냅숏(최신 2026-04-15 · "Last updated: Mai 21, 2025")으로 확인했다.
- 반박된 해석: "약관이 자기 사이트의 광고·상업적 표시를 금지하지 않으므로 허용된다" 는 1-2 로 탈락 — 약관이 말하지 않는 부분을 허락으로 읽지 않는다.
→ 광고 사이트에 이 데이터와 엠블럼을 싣는 것은 **허가받은 이용이 아니라 운영자 위험 부담**이다. "유료 구독자라 상업 이용이 허용된다" 고 쓰지 않는다.

### 3-3. AdSense 는 사이트 전체를 심사한다
자동 생성 페이지 · 독자 콘텐츠가 거의 없는 페이지 · 공사 중이거나 템플릿뿐인 사이트는 거절 사유다. 콘텐츠는 "고품질·독창적이며 방문자를 끌어야" 한다. Google 이 스포츠·통계 사이트를 따로 지목하지는 않는다 — "API 템플릿 페이지만 있으면 저가치 콘텐츠 거절 위험이 크다" 는 정책 문구의 해석이다.
→ 빈 대회·시즌 화면을 숨기고, 사람이 쓴 글을 늘린 뒤 신청한다 (5장 A·B).

### 3-4. 지급은 US$100 부터
USD 기준 지급 기준액은 $100 이고, 지급 기준액 표(28개 통화)에 원화는 없다. 미지급 수입이 $100 에 닿고 보류·정책 위반이 없어야 지급된다. 예외로 계정을 해지할 때 잔액이 해지 기준액 $10 을 넘으면 약 90일 안에 최종 지급된다. 본인 인증 기준액은 $0 으로 바뀌었고(2-1 · 지역에 따라 적용), 주소 확인 PIN 은 $10 부터다.

### 3-5. Cloudflare 로 옮길 때 `/api` 연결
- Pages 정적 자산 요청은 모든 플랜에서 무료·무제한. Pages Functions 요청은 무료 플랜에서 Workers 와 하루 10만 요청 쿼터 하나를 나눠 쓴다 (UTC 자정 초기화).
- `_redirects` 의 200 리라이트는 같은 사이트 안의 상대 경로만 된다 — 지금 `frontend/vercel.json` 의 `/api/:path* → http://3.36.159.128:3000/api/:path*` 를 옮길 수 없다.
- **Origin Rules 의 목적지 포트 재정의는 무료 플랜에서도 된다** (규칙 10개). 그래서 자기 도메인의 `api.` 레코드를 프록시(주황 구름)로 두고 3000 으로 포트만 바꿔 EC2 를 HTTPS 뒤에 둘 수 있다. 조건: Cloudflare 에 연결한 자기 도메인 · 방문자는 엣지 포트(보통 443)로 접속 · EC2 보안그룹은 Cloudflare IP 대역에 3000 을 연다. 호스트명·SNI 재정의는 Enterprise 전용이다.
- 반박된 주장: "오리진은 Cloudflare 프록시 포트 목록(80·443 등)에서 들어야 한다" · "목록 밖 포트는 Spectrum(Enterprise)만 된다" 는 둘 다 0-3 — Origin Rule 포트 재정의가 반례다.

### 3-6. 유럽 방문자 동의 도구 (CMP)
EEA·영국·스위스 트래픽은 TCF 연동 Google 인증 CMP 를 거쳐야 개인화 광고를 받는다. 인증 CMP 가 없으면 "지원되는 경우" 비개인화·제한 광고를 받을 수 있다 — 콘텐츠 광고가 전면 차단되지는 않는다(전면 차단은 검색 광고 상품만). "CMP 사용이 반드시 의무" 라는 주장은 0-3 으로 탈락했다.

### 3-7. 카카오 애드핏
사전 승인·초대받은 매체만 받는다. 확정 적립금 5만 원 이상이면 매월 21일~말일에 지급 요청, 익익월 지급. 개인 유형은 원천징수.

## 4. 확인하지 못한 것 (해당 판 전에 따로 확인)

이번 리서치에서 검증을 통과한 근거가 없다:
- 한국법 — 방송을 보며 직접 기록한 경기 사실의 게시, 저작권법 데이터베이스제작자 권리, 부정경쟁방지법 데이터 부정사용, 엠블럼의 상표·저작권 위험
- API-Football 해지 뒤 저장 데이터를 계속 표시해도 되는지(해지 후 의무 조항), 무료 플랜(100콜/일)의 시즌·엔드포인트 범위와 상업 이용
- AdSense 가 `*.pages.dev` 같은 호스팅 하위 도메인을 받는지 · 개인정보처리방침 세부 요건 · SPA(클라이언트 렌더링)가 심사 크롤러에 어떻게 보이는지
- Cloudflare Pages 무료 플랜의 상업 이용 조건 (C 판 선행) · Vercel Pro 요금
- Cloudflare SSL 모드 — Flexible 이면 Cloudflare→EC2 구간이 평문이고, Full 계열은 오리진이 TLS 로 응답해야 한다. EC2 :3000 은 평문 HTTP 라 C 판에서 모드를 정해야 한다 (Flexible 문서의 "443 만 지원" 이 방문자·오리진 포트 중 어느 쪽인지 모호)
- 한국 스포츠 트래픽의 실제 RPM — $100 에 필요한 페이지뷰
- 대체 데이터 소스(football-data.org · TheSportsDB · OpenLigaDB · SportMonks)의 조건
- 무료 인증 CMP 목록 · 애드핏과 AdSense 병행 가능 여부·애드핏 승인 기준 · 본인 인증 $0 의 한국 적용 · Wayback 2026-04-15 이후 API-Sports 약관 변경

## 5. 판 구성

| 판 | 내용 | 선행 |
|---|---|---|
| **A 글 섹션** | `/posts` 목록·글 화면 · 저장소 마크다운으로 글 작성 · 경기 상세에 관련 글 링크 | 없음 |
| **B 심사 기본 페이지** | 개인정보처리방침 · 소개 · 문의 · 데이터가 빈 대회·시즌 화면 정리 · `robots.txt` · `sitemap.xml` | 없음 |
| **C 호스팅 이전** | Cloudflare Pages 빌드 설정(`main`) · `api.도메인` HTTPS(Origin Rule 3000 · SSL 모드 · 보안그룹 Cloudflare IP) · 프론트 `VITE_API_BASE_URL=https://api.도메인`(지금은 비워 둔 same-origin — `frontend/src/services/http.js:15`) · 백엔드 `CORS_ORIGIN` · Supabase Redirect URLs · EC2 `deploy.sh`(기본 `main`) 전환 · Vercel 운영 배포 정리 | 도메인 · Pages 무료 플랜 상업 이용 확인(4장) |
| **D 광고** | `ads.txt` · AdSense 스크립트·광고 슬롯 · 신청 | C · AdSense 계정 |

사용자 몫: 2026-10-22 전 API-Football 갱신 · 도메인 구매 · 글 작성 · AdSense 신청.

## 6. 출처

- Vercel Fair Use Guidelines — https://vercel.com/docs/limits/fair-use-guidelines
- API-Sports Terms (Wayback 2026-04-15) — https://web.archive.org/web/20260415170717/https://api-sports.io/terms
- AdSense 광고 코드 배치 정책 — https://support.google.com/adsense/answer/81904?hl=en
- AdSense 사이트 승인 요건 — https://support.google.com/adsense/answer/9724?hl=en
- AdSense 게시자 정책 — https://support.google.com/adsense/answer/10502938?hl=en
- AdSense 지급 기준액 — https://support.google.com/adsense/answer/1709871?hl=en
- AdSense 유럽 CMP 요건 — https://support.google.com/adsense/answer/13554116?hl=en
- 카카오 애드핏 FAQ — https://kakaobusiness.gitbook.io/main/partner/adfit/faq
- Cloudflare Pages Redirects — https://developers.cloudflare.com/pages/configuration/redirects/
- Cloudflare Pages Functions Pricing — https://developers.cloudflare.com/pages/functions/pricing
- Cloudflare Origin Rules — https://developers.cloudflare.com/rules/origin-rules
