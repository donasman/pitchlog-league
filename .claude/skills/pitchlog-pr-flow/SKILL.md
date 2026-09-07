---
name: pitchlog-pr-flow
description: PitchLog 저장소에서 브랜치 → 검증 → 커밋 → push/PR → 머지 후 정리까지. 커밋·PR·머지 정리를 할 때 쓴다.
---

# PitchLog PR 절차

저장소: `C:\Dev\pitchlog-league` (Cowork 연결 폴더 `~/mnt/pitchlog-league`). 기본 브랜치 `dev`, `main`·`dev` 둘 다 PR 필수 Ruleset.

## 환경 제약 — 먼저 안다

- Cowork 의 연결 폴더 셸은 **리눅스 VM 이고 네트워크가 없다.** 되는 것: `git` 로컬 조작, `npx tsc --noEmit`(백엔드 typecheck), python/sed 로 파일 편집.
  안 되는 것: `git push/pull/fetch`, `npm install`, `prisma validate`, oxlint, vitest(네이티브 바인딩 Windows 전용), `pg_dump`.
- 안 되는 것은 **사용자에게 Windows 터미널 명령을 준다.** Git Bash 에서 경로는 `/c/Dev/pitchlog-league` (백슬래시는 이스케이프로 먹힌다).
- Claude Code CLI 를 저장소에서 직접 열었으면 위 제약이 없다 — 그냥 실행한다.
- 순수 함수(예: `round-scope.ts`, `squad-diff.ts`)는 Cowork 에서 클라우드 컨테이너에 올려 vitest 로 실제로 돌려 확인할 수 있다.
- `l0`·`l1`·`l2` e2e 는 원격 DB(Supabase)를 스스로 거부한다. CI(`backend-verify`, Postgres 컨테이너)가 처음 돌리는 자리다 — "e2e 는 CI 에서 확인된다" 고 말해준다.

## 절차

1. **브랜치** — `dev` 에서 판다. 이름: `feature/<주제>` · `fix/<주제>` · `docs/<주제>`. `dev` 에 직접 커밋하지 않는다.
   실수로 했으면 `git branch -f <새브랜치> HEAD && git reset --hard HEAD~1 && git checkout <새브랜치>` 로 옮긴다.
2. **검증** — 백엔드 `npm run typecheck`(VM 에서는 `npx tsc --noEmit -p tsconfig.json`). 프론트 `npm run verify`. VM 에서 못 하는 것은 사용자에게 부탁한다. 순수 함수는 클라우드 컨테이너에서 vitest.
3. **커밋** — Conventional Commits + 한국어 본문. 제목 `type(scope): 요약`, 본문에 **왜** (실측 수치·바뀐 결정). 커밋 하나에 파일 10개 이하가 목표(문서 동기화는 예외). 세션의 attribution footer(`Co-Authored-By` · `Claude-Session`)를 붙인다. pre-commit 훅(null byte · UTF-8 · .env · API 키)이 돈다.
4. **push / PR** — 사용자에게:
   ```
   git push origin <브랜치>
   ```
   PR base 는 `dev`. CI 2잡(`frontend-verify`·`backend-verify`)이 **항상** 돈다 — `pull_request` 에 paths 필터를 두면 required check 가 영원히 대기하므로 다시 넣지 않는다. 같은 브랜치로 PR 을 두 번 만들지 않는다 — 머지한 브랜치는 지운다.
5. **머지 후 정리** — 사용자에게:
   ```
   git checkout dev
   git fetch origin --prune
   git pull origin dev
   git branch -d <브랜치>
   ```
   `git fetch origin/dev` 는 틀린 문법이다. `-d` 가 거부하면 아직 머지 안 된 것이다 — `-D` 로 밀지 않는다.
6. **실 적재가 필요하면** — 머지 뒤 Windows 에서 `npm run ingest -- <l0|l1|l2|logos|status>`. 결과 JSON 을 받아 문서 수치를 갱신한다(`pitchlog-docs-sync`).

## 자주 걸린 것

- "This branch is out-of-date" 배너: 머지된 브랜치에 다시 커밋한 경우. Update branch 로 해결되지만 애초에 새 브랜치를 판다.
- e2e 파일끼리 데이터가 섞여 l0 의 전역 카운트가 깨짐: 새 e2e 는 `afterAll` 에서 자기 픽스처를 전부 지운다(`pitchlog-e2e-fixture`).
- 실측이 예측을 뒤집으면(09-07 에 네 번) 문서에 "예측이 틀렸고 코드가 맞았다" 를 남긴다 — 숨기지 않는다.
