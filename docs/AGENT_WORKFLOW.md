# 에이전트 작업 방식 — 역할 분리 · 환각 규칙 · 지시문

> 2026-09-07. 1장 1번 PR(조회 API + 프론트 4화면)부터 적용한다.
> 목적은 속도가 아니라 **틀린 코드가 조용히 들어오는 것을 막는 것**이다 — 회고 4-6 과 같은 결이다.

---

## 1. 역할 분리 — main 은 판단, sub 는 손

| 역할 | 에이전트 | 하는 일 | 하지 않는 일 |
|---|---|---|---|
| 탐색 | `backend-explorer` · `frontend-explorer` | 각 스택의 기존 패턴을 **계약표**로 돌려준다 — 백엔드는 Prisma 모델·DTO·`as-of`/`ref` 규약·계층 소유 컬럼, 프론트는 `live.js`/`normalize.js` 형태·화면이 읽는 shape·i18n 키 | 수정 · 상대 스택 |
| 설계 | `planner` | 계약표 + 문서 절 번호로 설계안. 대안이 있으면 둘 다 | 코드 |
| 구현 A / B | `backend-implementer` · `frontend-implementer` | **겹치지 않는 파일 집합**을 각각 맡는다. 각자 자기 스택의 고정 원칙을 직무기술서로 들고 있다 | 상대 집합의 파일 |
| 검증 | `backend-verifier` · `frontend-verifier` | diff 만 받아 계약표·가이드와 대조, 검증 명령 실행. **문제만** 보고 | 수정 |
| main | — | 설계안을 문서와 대조해 판단 · 지시 · 검증 결과로 되돌림 · 커밋 | 직접 구현 |

병렬의 조건은 하나 — **A 와 B 가 건드리는 파일이 겹치지 않는다.** 같은 폴더를 쓰므로 지시문에 파일 목록을 박는다.
겹치는 파일(예: `api-football.types.ts`)이 있으면 한쪽에 몰거나 순차로 한다.

## 2. 환각 규칙 — 넷

1. **읽지 않은 것은 없는 것이다.** 함수·컬럼·엔드포인트·환경변수를 쓰기 전에 grep/Read 로 존재를 확인하고
   보고에 `파일:줄` 을 인용한다. "아마 있을 것" 으로 쓰지 않는다.
2. **쓴 에이전트가 검증하지 않는다.** 검증은 diff 만 받은 다른 에이전트가 한다.
3. **판단 근거는 문서 절 번호다.** 지시문에 "PRD 4-2 · SCHEMA_DESIGN 3-3 을 따른다" 처럼 절을 박는다.
   에이전트가 규칙을 기억이 아니라 파일에서 읽게 한다.
4. **테스트가 진실이다.** 순수 함수는 클라우드 컨테이너에 올려 실제로 돌린다(L2 `round-scope` 에서 한 방식).
   "통과할 것" 은 보고에 못 쓴다 — **통과한 출력**만 쓴다.

이 프로젝트의 "실측 우선" 과 같은 원칙이다. 09-07 에 실측이 계획을 네 번 뒤집었다.

## 3. 지시문 — 여섯 칸

sub 에게 보내는 지시문은 이 여섯 칸을 전부 채운다. 빈 칸이 있으면 보내지 않는다.

```
목표        한 문장. "무엇이 되면 끝인가"
읽을 것     문서 절 번호 + 파일 경로. 순서대로
건드릴 파일  명시적 목록. 이 밖은 수정 금지 — 필요하면 보고하고 멈춘다
금지        이 작업에서 특히 걸리는 것. 예:
              Mock 파일(src/mocks) 수정 · 오류를 빈 배열로 · 한국어 하드코딩 · 프론트 .ts
              has_*·detail_checked_at·data_version 갱신 · 외래키 추가 · dev 직접 커밋
완료 조건   실행할 명령과 기대 출력. 예: `npm run typecheck` 0 오류 · `vitest run` N passed
보고 형식   바꾼 파일 · 확인한 근거(파일:줄) · 실행한 명령과 출력 · 못 한 것과 이유
```

`IMPLEMENTATION_PLAN.md` 의 "Claude Code 지시문" 을 백엔드까지 넓힌 것이다.

## 4. 이 저장소의 제약 — 지시문에 늘 붙는 것

- 연결된 폴더의 셸은 **리눅스 VM** 이다. `tsc` 는 되지만 `prisma validate` · oxlint · vitest(네이티브 바인딩) · push 는 안 된다.
  → 백엔드 typecheck 는 VM 에서, 나머지 검증은 **Windows 터미널 또는 CI** 에서. 순수 함수 테스트는 클라우드 컨테이너에 올려 돈다
- `l0`·`l1`·`l2` e2e 는 원격 DB 를 스스로 거부한다. CI 가 처음 돌리는 자리다
- `dev`·`main` 은 PR 필수. 커밋은 항상 브랜치에서
- 커밋 하나에 파일 10개 이하가 목표. 문서 동기화는 예외

## 5. 파일 위치 — Cowork 와 CLI 가 같은 것을 본다

```
.claude/agents/   backend-explorer · frontend-explorer            ← 탐색 (읽기 전용)
                  planner                                          ← 설계 (읽기 전용)
                  backend-implementer · frontend-implementer       ← 구현 (Edit/Write 있음)
                  backend-verifier · frontend-verifier             ← 검증 (읽기 전용)
                  explorer · implementer · verifier                ← 스택 구분이 없는 작업용 범용 셋
.claude/skills/   pitchlog-pr-flow · pitchlog-e2e-fixture · pitchlog-docs-sync  ← 반복 절차
CLAUDE.md         항상 읽히는 규칙. 이 문서로의 포인터
```

스택별로 나눈 이유는 규칙이 서로 다르기 때문이다 — 백엔드는 TypeScript strict·외래키 없음·서비스 내 외부 호출 금지,
프론트는 `.js`/`.jsx` 만·무음 `catch {}` 금지·오류를 빈 데이터로 바꾸지 않음. 하나의 `implementer` 가 둘을 오가면
지시문의 "금지" 칸을 매번 다시 채워야 한다. 직무기술서로 내리면 지시문이 짧아진다.

`ingest`·CI·문서처럼 스택 구분이 없는 작업은 범용 셋(`explorer`·`implementer`·`verifier`)을 쓴다.

`verifier` 와 `explorer` 는 `tools` 에 Edit/Write 가 없다 — "쓴 에이전트가 검증하지 않는다" 를 파일 수준에서 강제한다.
Claude Code CLI 에서는 `/agents` 로 보이고, 스킬은 `/pitchlog-pr-flow` 처럼 강제 호출할 수 있다. 부르지 않아도
설명(description)이 작업과 맞으면 자동으로 읽힌다.

## 6. 반복 절차는 스킬로

PR 절차 · e2e 픽스처 규칙 · 문서 동기화 — 이 셋은 세션마다 반복돼서 스킬로 저장한다.
스킬이 있으면 지시문의 "읽을 것" 에 스킬 이름을 적는 것으로 끝난다.

## 7. 훅 — 지시문이 아니라 도구 호출에서 막는다

`tools:` 는 verifier 가 고치는 것만 막는다. implementer 는 Write 와 Bash 가 있어 경로만 다르면 어디든 쓸 수 있고,
읽기 전용 에이전트도 Bash 의 `sed -i` 로 쓸 수 있다. 지시문은 부탁이지 자물쇠가 아니다.

그래서 `.claude/settings.json` 의 `PreToolUse` 훅이 도구 호출 직전에 검사한다. 에이전트가 누구든 같다.

| 훅 | 걸리는 도구 | 막는 것 |
|---|---|---|
| `hooks/guard-paths.mjs` | Write · Edit · MultiEdit | `frontend/src/mocks/**` · `.env` `.env.local` · `frontend/**/*.ts(x)` · `schema.prisma` 의 `@relation` |
| `hooks/guard-git.mjs` | Bash | `dev`/`main` 에서 `git commit` · `dev`/`main` 으로 `git push` · Bash 로 `src/mocks`·`.env` 쓰기(휴리스틱) |

차단은 종료 코드 2 + stderr. 에이전트는 그 이유를 받고, **우회하지 않는다.** 막힌 이유가 곧 규칙이다.
훅은 Node 22 로 쓴다 — Windows Git Bash 와 Cowork VM 어느 쪽에서도 같은 코드가 돈다.

훅이 **못** 막는 것: "건드릴 파일" 목록 밖 수정(목록이 작업마다 달라 정적 규칙이 없다) · 검증 명령을 안 돌리고 통과했다고 쓰는 것.
이 둘은 verifier(2층) 와 CI(3층) 가 잡는다. 실측에서 반복되면 그때 훅을 더 건다.

## 8. 실측 기록

`docs/AGENT_RUNS.md`. 한 판마다 한 줄 — 넷 중 무엇이 깨졌나. 구조를 고치는 근거는 여기서만 나온다.
안 깨졌으면 안 고친다. 09-07 에 실측이 계획을 네 번 뒤집은 것과 같은 원칙이다.
