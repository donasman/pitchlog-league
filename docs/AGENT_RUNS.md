# 에이전트 파이프라인 실측 기록

> `pitchlog-agent-run` 으로 한 판 돌릴 때마다 한 줄. 구조를 고치는 근거는 이 표에서만 나온다.
> 안 깨졌으면 안 고친다. 세 판 연속 같은 자리가 깨지면 그때 고친다.

## 볼 것 넷

| # | 질문 | 깨지면 고칠 곳 |
|---|---|---|
| ① | main 이 04 에서 스스로 멈췄나, 사용자가 잡아야 했나 | `CLAUDE.md` 에이전트 절 · `pitchlog-agent-run` |
| ② | verifier 가 검증 명령 출력을 실제로 붙였나, "통과할 것" 이라고 썼나 | verifier 직무기술서 · 훅으로 명령 실행 강제 |
| ③ | implementer 가 건드릴 파일 밖을 수정했나, 상대 스택 규칙을 섞었나 | 훅에 경로 규칙 추가 · 직무기술서 |
| ④ | 여섯 칸 지시문을 매번 채우는 게 견딜 만했나 | 자주 반복되는 칸을 직무기술서로 내림 |

## 기록

| 날짜 | 작업 | 브랜치 | ① 멈춤 | ② 검증 출력 | ③ 범위 | ④ 지시문 | 메모 |
|---|---|---|---|---|---|---|---|
| 2026-09-08 | 선수 상세 + 통계 랭킹 실 API 전환 (Player·Statistics 모듈 · live.js 3함수) | `feature/player-stats-live-api` (#34) | ✅ 04 에서 멈춤 | ✅ verify·tsc·e2e raw 출력 붙임 | ✅ 지정 파일만 (백 10 · 프 4) | ✅ 견딤 | R1 훅 판정 오류(mock.js↔mocks/) — 사용자가 잡아 재정의 · e2e afterAll hookTimeout 누락으로 06-A BLOCK → implementer 되돌려 해소 · backend-verifier 가 프론트 diff 를 자기 계약 밖으로 오판(병렬 파이프라인 스코프 오해) · 원안 6함수 → 프론트 grep 으로 3함수만 살아있음 발견 |
| 2026-09-08 | 브라우저 실측 5건 수정 (React key 중복 · 시즌 표기 · totals.assists 3상태 · 도움 breakdown · 안내 문구 중복) | `fix/player-stats-render` | ✅ 04 에서 멈춤 (짧게) | ✅ verify 4단계 raw 출력 · dev 부팅 확인 | ✅ 지정 파일만 (프 3) | ✅ 견딤 | 06 verify 는 통과했는데 브라우저에서 5건 잡음 — 두 판 연속 verifier 가 놓친 자리(#34 도 06 후 브라우저 실측이 5건 냈다). 이 판이 스킬 06 에 "프론트가 바뀐 판은 브라우저 실측을 07 전에 넣는다" 를 추가. 07 순서도 뒤집음 — AGENT_RUNS 는 pr-flow 전에 (첫 판이 커밋 뒤에 쓰다 guard-git 에 걸렸다) |
| 2026-09-09 | totals 과잉 적용 수정 + 구조 개선 (표시 판단을 normalize.js 순수 함수로 · 반례 픽스처 규약) | `fix/player-stats-render` (#36 · 같은 브랜치 3판째) | ✅ 04 에서 멈춤 (미결 2건 사용자 확인: dataStatus 완전 폐기 · 표 필터 반영) | ✅ verify · e2e 11 pass raw · **대조 assert** `playerTotals(allStats)===dto.totals` 잠금 | ✅ 지정 파일 (백 2 · 프 4) | ✅ 견딤 | **같은 브랜치에서 05 를 세 번 돌았다.** 원인은 픽스처가 실 데이터 모양(이적 · null 섞임)을 안 담아 e2e·단위 테스트가 반례를 못 잡음 → 프론트 렌더에서만 잡힘. 이 판이 `pitchlog-e2e-fixture` 스킬에 반례 규약 절 신설(이적·null 섞임·조별리그·같은 rank 4항) + `player-stats.e2e-spec.ts` 에 이적 시드 · `normalize.test.js` 에 대조 assert 로 두 구현 갈라지는 순간 잠금. 표시 판단을 컴포넌트에서 normalize 순수 함수로 이관(`key`·`playerTotals`·`formatStat`) · Mock 도 정규화 통과. dataStatus 컨셉 완전 폐기(4 i18n 키 죽음 · docs-sync 정리 예정) · 표 8→7 컬럼. 신 규약(브라우저 실측 07 전) 처음 지킴 |
