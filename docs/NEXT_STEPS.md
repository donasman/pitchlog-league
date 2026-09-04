# PitchLog 다음 작업 순서

> 갱신: 2026-09-03 · 이전 판(09-02 프론트엔드 중심)을 대체한다.
> 근거 문서: `PRD.md` · `BACKEND_FEATURES.md` · `BACKEND_DESIGN_REVIEW.md` · `API_INVENTORY.md` · `DATA_RULES.md`

---

## ✅ API-Football 구독 — 해결됨 (2026-09-04)

09-22 만료 경고는 해소됐다. Pro 갱신으로 올해는 계속 쓸 수 있다.
만료일은 미확인 — 사용이 막히는 시점이 정해지면 그때 반영한다.

---

## 1. 지금 어디까지 왔나

| 영역 | 상태 |
|---|---|
| 설계 문서 | ✅ 완료 — docs 17개 + 디자인 브리프 9개 |
| 디자인 | ✅ 완료 — 시안 13개, 토큰 1파일, 대비 25쌍 전부 통과 |
| API 검증 | ✅ 완료 — 26-27 시즌·커버리지·필드 실호출 확인 |
| 프론트엔드 | 🚧 Mock 기반 동작. 새 디자인 적용 필요 |
| **백엔드** | ❌ **코드 0줄** |
| CI · 배포 | ❌ 미구성 |

---

## 2. Phase 0 — 남은 것

- [ ] **CI 구성** — `.github/workflows/frontend.yml`, `paths: frontend/**` 필터, `npm run verify`
- [ ] **GitHub 설정** — 기본 브랜치 `dev`, `main`에 PR 필수 + CI 통과 Ruleset (웹에서만 가능)
- [ ] pre-commit 훅 — null byte · 깨진 UTF-8 검사
- [ ] 배포 PoC — 정적 빌드 시간, Deploy Hook 지연, Socket.io 연결 확인
- [x] ~~API-Football 실호출 검증~~ ✅ 2026-09-03, 전수 재조사 2026-09-04 (`API_INVENTORY.md`)

---

## 3. Phase 1 — 착수 순서

**이 순서를 지킨다.** 특히 2번을 3번보다 먼저 한다 —
v1은 보호장치 없이 수집부터 만들었고 회고가 그걸 지목했다.

### 3-1. Prisma 스키마 ★ 첫 코드

아래 7건을 **처음부터** 반영한다. 지금은 비용이 0이고 나중엔 마이그레이션이다.

| 항목 | 근거 |
|---|---|
| `competition_seasons` 분리 | UCL 예선이 리그 개막 전에 시작 — 대회별 현재 시즌 필요 (BACKEND_DESIGN_REVIEW A-1) |
| `player_match_stats.team_id` | 경기의 팀 귀속을 스쿼드로 되짚으면 최대 7일 어긋남 (A-2) |
| `external_ids` 테이블 | `api_team_id` 컬럼 분리 — 2차 소스 도입 시 행 추가로 끝남 (DATA_RULES 1-3) |
| `owner_key` | 푸시 구독에 — 로그인 도입 시 `user_id` 연결 자리 (PRD 8-1) |
| `transfer_type` · `parent_team_id` | 임대와 완전이적 구분. `UNKNOWN`으로 시작 (A-4) |
| `knockout_ties.win_reason` | 합산 / 연장 / 승부차기 (A-5) |
| `left_at IS NULL` partial index | `is_current` 삭제 — 같은 사실을 두 번 말하지 않는다 (A-3) |

### 3-2. 공통 HTTP client

timeout · 호출 제한 · 제한된 retry · exponential backoff.
**수집 기능보다 먼저 만든다.**

⚠ Prisma `upsert`가 실제로 `ON CONFLICT`로 컴파일되는지 쿼리 로그로 확인한다.
아니면 `$executeRaw` 또는 `P2002` 포착 후 재시도. **동시 호출 통합 테스트를 같은 PR에 넣는다.**
(BACKEND_DESIGN_REVIEW B-2)

### 3-3. L0 기준 데이터 — 약 12콜

대회 6개 → 시즌 → 팀 20×6 → 참가관계 → 경기장 → UCL 스테이지.
로고는 이때 내려받아 자체 저장한다 (media URL 직접 링크는 rate limit).

### 3-4. 조회 API 첫 두 개

`GET /competitions` · `GET /teams`.
**여기서 처음 화면에 진짜 데이터가 붙는다.**

⚠ 모든 응답에 `asOf`(데이터 기준 시각)를 포함한다.
프론트 `DataTimestamp`가 이미 기대하고 있고, 나중에 붙이면 전 DTO를 고쳐야 한다.

### 3-5. L1 스쿼드 diff ★ Phase 1의 관문

완료 기준은 "20팀 500선수가 DB에 있다"가 아니라
**"스쿼드 diff 테스트가 이적 시나리오를 통과한다"** 이다.

### 3-6. Localization

Team/Player/Competition Localization 테이블 + `요청 언어 → 영어 → API 원본` fallback.
붙고 나면 프론트의 `i18n/entityNames.js`를 제거한다.

---

## 4. 프론트엔드 — 백엔드와 병렬로 가능

서로 막지 않는다.

- [ ] `design/COMPONENT_SPEC.md` — `exports/` 의 JSX·CSS에서 치수·상태 추출
- [ ] 새 디자인 적용 — `design/exports/pitchlog-league/*.jsx` 를 기반으로 교체
- [ ] Tailwind 팔레트 정리 — 현재 `--primary`가 초록이다. 교체 시 자동 해소 (미결정 #2)
- [ ] 홈 신설 — 제품 앞장 (`design-briefs/03-home.md`)
- [ ] 실 API 연결 — `services/api.js` 의 Mock 반환을 fetch로

---

## 5. Phase 2 이후

| Phase | 핵심 | 검증 |
|---|---|---|
| 2 | L2~L5 + Socket.io Gateway | **실제 라운드 1회 무중단 관측** |
| 3 | 실 API 연결 + 배포 | 백엔드 다운 시 오류 노출 |
| 4 | 6개 대회 + L6 보정 + 푸시 알림 | 최종 API 예산 실측 (6,000콜/일 경고선) |
| 5 | AI 어시스턴트 | 숫자 환각 0건 |

Phase 2에서 **LIVE 윈도우 처리량과 오버랩 락 필요 여부**를 실측한다.
지금까지 계산한 것은 호출 수뿐이고 처리 시간은 미검증이다.

---

## 6. 남은 미결정 4건

전부 진행하면서 정해진다. 지금 붙들지 않는다.

| # | 항목 | 언제 |
|---|---|---|
| 2 | Tailwind 팔레트 통합 | 프론트 교체 시 자동 해소 |
| 4 | 모바일 필터 바 형태 | 경기 탭 모바일 구현 시 |
| 6 | 다크 모드 기본값 | 배포 전 |
| 7 | 팀 엠블럼 없을 때 | 실 API 연결 시 (`TeamBadge` 폴백 이미 있음) |

1(브랜드) · 3(팀명 넘침) · 5(AI 패널) · 8(로그인)은 2026-09-03에 해소·결론.
