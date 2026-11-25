// guard-git.mjs 회귀 테스트 — Bash 직전 명령 검사.
// 규칙 근거: docs/AGENT_WORKFLOW.md 7장 · 커밋 71044e6 (토큰 단위 브랜치 판정 · checkout 추적 · 리다이렉션 대상 ·
// 인라인 인터프리터) · 커밋 f2eda5b (--no-verify · reset --hard · clean -f · push --force).
// 브랜치마다 임시 저장소를 따로 둔다 — 훅은 명령을 실행하지 않고 현재 브랜치만 읽으므로 테스트 간 상태가 새지 않는다.
// 실행: 저장소 루트에서 `node --test .claude/hooks/__tests__/*.test.mjs`
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { assertAllowed, assertBlocked, makeRepo, removeRepo, runHook } from "./helpers.mjs";

const HOOK = fileURLToPath(new URL("../guard-git.mjs", import.meta.url));
const TAG = "guard-git";

const repos = {};

before(() => {
  for (const branch of ["dev", "main", "feature/x"]) repos[branch] = makeRepo({ branch });
});

after(() => {
  for (const dir of Object.values(repos)) removeRepo(dir);
});

/** branch 저장소에서 command 를 Bash 로 부르려는 상황 */
const bash = (command, branch = "feature/x") => runHook(HOOK, { tool_input: { command }, cwd: repos[branch] });

describe("guard-git: dev · main 직접 커밋", () => {
  test("dev 에서 git commit → 차단", () => {
    assertBlocked(bash("git commit -m x", "dev"), TAG);
  });

  test("main 에서 git commit → 차단", () => {
    assertBlocked(bash("git commit -m x", "main"), TAG);
  });

  test("feature/x 에서 git commit → 통과", () => {
    assertAllowed(bash("git commit -m x", "feature/x"));
  });

  test("feature/x 에서 git checkout dev && git commit → 차단 — checkout 을 따라간다 (71044e6)", () => {
    assertBlocked(bash("git checkout dev && git commit -m x", "feature/x"), TAG);
  });
});

describe("guard-git: dev · main 으로 push", () => {
  test("git push origin dev → 차단", () => {
    assertBlocked(bash("git push origin dev"), TAG);
  });

  test("git push origin HEAD:dev → 차단 — refspec 목적지", () => {
    assertBlocked(bash("git push origin HEAD:dev"), TAG);
  });

  test("git push origin refs/heads/main → 차단", () => {
    assertBlocked(bash("git push origin refs/heads/main"), TAG);
  });

  test("git push origin fix/dev-tools → 통과 — 브랜치 이름 속 dev 는 안 건드린다 (71044e6)", () => {
    assertAllowed(bash("git push origin fix/dev-tools"));
  });

  test("git push origin --delete feature/x → 통과 — 원격 브랜치 정리", () => {
    assertAllowed(bash("git push origin --delete feature/x"));
  });

  test("dev 에서 인자 없는 git push → 차단", () => {
    assertBlocked(bash("git push", "dev"), TAG);
  });

  test("feature/x 에서 인자 없는 git push → 통과", () => {
    assertAllowed(bash("git push", "feature/x"));
  });
});

describe("guard-git: 보호 경로에 Bash 로 쓰기", () => {
  test("echo x > frontend/src/mocks/a.js → 차단", () => {
    assertBlocked(bash("echo x > frontend/src/mocks/a.js"), TAG);
  });

  test("head frontend/src/mocks/a.js > /tmp/a → 통과 — 리다이렉션 대상만 본다 (71044e6)", () => {
    assertAllowed(bash("head frontend/src/mocks/a.js > /tmp/a"));
  });

  test("sed -i s/a/b/ backend/.env → 차단", () => {
    assertBlocked(bash("sed -i s/a/b/ backend/.env"), TAG);
  });

  test("echo x | tee .env → 차단", () => {
    assertBlocked(bash("echo x | tee .env"), TAG);
  });

  test("cp a frontend/src/mocks/a.js → 차단", () => {
    assertBlocked(bash("cp a frontend/src/mocks/a.js"), TAG);
  });

  test("rm backend/.env → 차단", () => {
    assertBlocked(bash("rm backend/.env"), TAG);
  });

  // .env.example 제외(guard-git.mjs PROTECTED_PATH 의 (?!example))는 쓰기 검사(cp 목적지)를 거쳐야 실행된다.
  // cat 처럼 어떤 쓰기 검사에도 들어가지 않는 명령으로는 제외 규칙이 깨져도 통과해 버린다 — 같은 cp 로 쌍을 둔다
  test("cp a backend/.env.example → 통과 — .env 계열 중 .env.example 만 통과", () => {
    assertAllowed(bash("cp a backend/.env.example"));
  });

  test("cp a backend/.env → 차단 — .env.example 만 통과의 대조군", () => {
    assertBlocked(bash("cp a backend/.env"), TAG);
  });
});

describe("guard-git: pre-commit 우회", () => {
  test("git commit --no-verify → 차단", () => {
    assertBlocked(bash("git commit --no-verify -m x"), TAG);
  });

  test("git commit -n → 차단 — commit 의 -n 은 --no-verify", () => {
    assertBlocked(bash("git commit -n -m x"), TAG);
  });

  test("git push -n origin feature/x → 통과 — push 의 -n 은 --dry-run", () => {
    assertAllowed(bash("git push -n origin feature/x"));
  });
});

describe("guard-git: 되돌릴 수 없는 git", () => {
  test("git reset --hard → 차단", () => {
    assertBlocked(bash("git reset --hard"), TAG);
  });

  test("git clean -fd → 차단", () => {
    assertBlocked(bash("git clean -fd"), TAG);
  });

  test("git push --force origin feature/x → 차단", () => {
    assertBlocked(bash("git push --force origin feature/x"), TAG);
  });

  test("git push --force-with-lease origin feature/x → 차단", () => {
    assertBlocked(bash("git push --force-with-lease origin feature/x"), TAG);
  });

  test("git push -f → 차단", () => {
    assertBlocked(bash("git push -f"), TAG);
  });
});

describe("guard-git: 인라인 인터프리터로 파일 쓰기", () => {
  test("python3 -c 로 open(..., 'w') → 차단", () => {
    assertBlocked(bash(`python3 -c "open('a','w').write('x')"`), TAG);
  });

  test("node -e 로 writeFileSync → 차단", () => {
    assertBlocked(bash(`node -e "require('fs').writeFileSync('a','x')"`), TAG);
  });

  test("python3 heredoc 으로 Path.write_text → 차단", () => {
    const cmd = "python3 - <<'EOF'\nfrom pathlib import Path; Path('a').write_text('x')\nEOF";
    assertBlocked(bash(cmd), TAG);
  });

  test("python3 -c 로 print 만 → 통과 — 읽고 계산만 하는 스크립트", () => {
    assertAllowed(bash(`python3 -c "print(1)"`));
  });

  test("node -e 로 console.log 만 → 통과", () => {
    assertAllowed(bash(`node -e "console.log(1)"`));
  });
});

describe("guard-git: 무관한 명령", () => {
  test("git status → 통과", () => {
    assertAllowed(bash("git status"));
  });

  test("command 빈 문자열 → 통과", () => {
    assertAllowed(bash(""));
  });
});
