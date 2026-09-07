---
name: pitchlog-docs-sync
description: PitchLog 에서 기능이 머지되거나 실 적재 결과가 나온 뒤 문서를 코드와 맞출 때 — 어느 문서를 어떻게 고치고 두 번 검토하는지.
---

# PitchLog 문서 동기화

원칙: **문서는 코드가 바꾼 사실만 갱신한다.** 미래형("~할 것이다", "~에서 다룬다")을 남기지 않는다. 수치는 실측만 쓴다. 결정은 날짜 + 근거를 같이 쓴다.

## 어디를 고치나 — 체크리스트

| 문서 | 고칠 곳 |
|---|---|
| `docs/NEXT_STEPS.md` | 0장 상태표 수치 · 1장 순서표(끝난 번호에 ✅) · 해당 장의 `[ ]`→`[x]` + 실측 결과 소절 · 14장 미결정(정해진 것은 `~~취소선~~` + ✅) |
| `docs/BACKEND_FEATURES.md` | 기능 번호 행 비고에 "✅ MM-DD 구현(파일)" · Phase 표 |
| `backend/README.md` | 상태표(수집·조회 API·테스트 수·남은 것) · CLI 명령 |
| `CLAUDE.md` | 자주 쓰는 명령어 · 로드맵 현황 표 |
| `docs/README.md` | 새 문서가 생기면 표에 등록 |
| `docs/SCHEMA_DESIGN.md` · `DATA_RULES.md` · `INGESTION_STRATEGY.md` | 설계가 바뀐 경우만. 해당 절에 "YYYY-MM-DD 결정/실측" 을 붙이고 12장·8장 미결정 표를 갱신 |
| 프로젝트 문서 (`claude/YYYY-MM-DD-<주제>.md`) | 한 작업 = 한 문서. 왜·무엇·설계에서 지킨 것·함정·남은 것 |

테스트 수는 `grep -cE "^\s*it\(" test/*.e2e-spec.ts src/**/*.spec.ts` 로 세서 쓴다 — 기억으로 쓰지 않는다.

## 실측이 예측을 뒤집었을 때

숨기지 않는다. "예측이 틀렸고 코드가 맞았다" 를 그 절에 남기고, 왜 틀렸는지 한 줄(예: UCL 컷 — 리옹이 Q3 를 치른다). 09-07 에 네 번 있었다(로고·백업·L1 동시 등장·UCL 컷).

## 두 번 검토 — 사용자 요구

1. **키워드 재스캔** — 고친 뒤 옛 표현이 남았는지 grep: 바뀐 절 번호(예: `8-b` 의 뜻이 바뀌면 그걸 가리키던 곳 전부), 무효가 된 용어(BullMQ · Deploy Hook · 배포 PoC), 수치(콜 수·팀 수·테스트 수). 코드 주석(`l2.service.ts` 머리 등)도 문서 절을 가리키므로 같이 본다.
2. **바뀐 절 다시 읽기** — 문서 간 같은 사실을 다르게 말하는 곳(예: 현재 시즌 상세 콜 수 8,800 vs 9,600)을 하나로 맞춘다. 같은 문서 안의 표와 본문이 어긋나는 것도 여기서 잡는다.

## 손대지 않는 것

`API_INVENTORY.md` · `API_FIELDS_FULL.md` · `CUPS_INVENTORY.md` · `api-*.json`(스크립트가 덮어씀) · `RETROSPECTIVE.md` · `FEATURE_PLAN.md` · `*_REVIEW.md`(이력) · `FRONTEND_CLI_PROMPT.md`.

## 커밋

`docs/<주제>` 브랜치, `docs: ...` 커밋. 문서 동기화는 10파일 제한의 예외다. 절차는 `pitchlog-pr-flow`.
