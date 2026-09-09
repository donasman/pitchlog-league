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
| 2026-09-09 | PR #37 재번호 되돌리기 + 참조 정합성 검사 자동화 (`scripts/check-doc-refs.mjs` · CI 등록 · 스킬 두 곳 · 자동 머지 경계) | `chore/post-player-stats` (#37 · 4판째) | — (파이프라인 아님 · docs-sync + pr-flow) | **✗ docs-sync 두 번 검토(키워드 재스캔)가 같은 파일 10곳 · 다른 파일 10곳을 놓쳤다. 보고는 "11자리 갱신". → `check-doc-refs` 로 기계화.** 신 검사기가 #37 재번호 상태 6건 실패 · 원복 상태 OK 로 잠금 | ✅ 지정 파일 (docs 6 · scripts 1 · workflows 1 · skills 2 · agent-runs 1) | ✅ 사용자 지시 그대로 | 09-08~09 자가체크 PASS 가 세 번 틀렸다(#34 렌더 5건 · #36 totals · #37 참조 20곳). 사람이 잡은 실패를 기계로 옮김 — `pr-flow` 스킬 4번에 "자동 머지 경계" 소절 추가(services·utils·tests 만이면 auto merge 허용 · pages·components·docs 있으면 멈춤). 재번호 유혹 자체를 막기 위해 순서표는 안정 인덱스로 · 새 완료 항목은 번호 없이 `~~—~~` (`docs-sync` 스킬 갱신) |
| 2026-09-09 | assistant 도구 층 (레지스트리 · 10도구 · JSON Schema · description 3상태) + MCP stdio 서버 + golden.json 15건 + e2e (stdio 스모크 포함) + 문서 5곳 | `feature/assistant-tools` | ✅ 04 에서 멈춤 (D5 뒤집힘 — `list_matches` 자동 컷 · M2 실 ref + "obtain via list_* first" · stdio 스모크 e2e 추가 셋 다 사용자 확인에서 추가) | ✅ tsc·lint·e2e **25/25**·check-doc-refs·grep 11항 raw 붙임 | ✅ A 6파일(assistant/ 코어) · B 9파일(mcp.ts · golden · e2e · package.json · app.module · 문서 5) · 이 판 밖(frontend·mocks·prisma·ingestion·workflows·기존 e2e) 안 건드림 | ✅ 견딤 (03 planner P1~P10 을 값으로 옮겨 A/B 지시문) | **LLM 호출·채팅 UI 없음** (V2_DESIGN 5-8 결정적 계층을 MCP 로 노출만). SDK **low-level Server + JSON Schema** — `McpServer.tool()`·zod grep 0건(주석 메모 1건뿐). Case 10 이 `dist/cli/mcp.js` spawn → `client.listTools()` 10개 · `client.callTool('get_standings')` → wrapper `{tool,args,asOf,data}` 왕복 검증(부팅+SIGINT 만으로는 데모 경로 검증 안 된다는 04 지적 반영). B implementer 가 golden c11 을 자체 조정 — 내 15건 초안이 `get_standings` 중복·`get_player` 미커버였음. 사용자 원칙 "도구 10개 각 최소 1회" 준수. **ajv 는 transitive hoist 로 이미 있었지만 명시 dep 로 추가**. `list_matches` 자동 default(KST ±7d) + `truncated`/`total` wrapper 필드로 결정적 필터링 · 5-8 위반 아님. 자동 머지 안 함(docs 5곳 포함) |
| 2026-09-09 | 즐겨찾기 (팀) — `FavoritesContext`(localStorage `pitchlog-favorites`, 상한 5) · `FavoriteToggle` · 홈 `MyTeamsSection`(다음 경기·최근 결과·리그 순위) + 문서/등록법 정비(NEXT_STEPS 8번 완료 · 9번 재정의 · README MCP wrapper 방식 · mcp.cmd 커밋) | `feature/favorite-teams` | ✅ 04 에서 멈춤 | verify 대기 (07 에서 채움 · A 와 병렬 진행) | ✅ 지정 파일 (프 15 · 문 4) | ✅ 견딤 | 알려진 한계: Mock↔Live 전환 시 저장된 팀 id 무효화(선언만 · 별도 마이그레이션 없음) · TeamPage 실 API 헤더 오류 시 별 아이콘 안 보임. MCP 등록 실측 사고(DATABASE_URL 셸 파싱이 `postgres.xxx:pw@host` 사용자명을 `postgres` 로 잘라 인증 실패) → `mcp.cmd` wrapper 방식으로 우회 · Claude Desktop JSON 예시는 삭제(D14). NEXT_STEPS 9번 완료 표기는 PR 번호 확정 후 07 에서 별도 커밋 |
