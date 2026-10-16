// PreToolUse 훅 — Write · Edit · MultiEdit 직전에 경로를 검사한다.
// 막는 것: CLAUDE.md 의 "절대 수정 금지" 경로. 에이전트가 누구든 상관없이 기계적으로 막는다.
// 종료 코드 2 = 차단. stderr 가 에이전트에게 이유로 전달된다.
//
// 경로는 **레포 루트 기준**으로 본다. cwd 기준으로 보면 서브에이전트가 backend/ · frontend/ 에서
// 돌 때 규칙이 통째로 빗나간다 (2026-09-08 실측: cwd=frontend/ 면 mocks 규칙이 안 걸렸다).
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // 입력을 못 읽으면 막지 않는다 — 훅이 작업을 방해하면 안 된다
}

const raw = input?.tool_input?.file_path ?? input?.tool_input?.path ?? "";
if (!raw) process.exit(0);

const cwd = input?.cwd ?? process.cwd();

/** 레포 루트. git 이 없으면 cwd 로 떨어진다 — 그때는 예전처럼 cwd 기준이 된다 */
function repoRoot() {
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" });
  return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : cwd;
}

const abs = path.resolve(cwd, raw);
const rel = path.relative(repoRoot(), abs).split(path.sep).join("/");
const base = path.basename(rel);

/** Write 는 content, Edit 는 new_string, MultiEdit 는 edits[].new_string */
const written = [
  input?.tool_input?.content,
  input?.tool_input?.new_string,
  ...(Array.isArray(input?.tool_input?.edits) ? input.tool_input.edits.map(e => e?.new_string) : []),
]
  .filter(Boolean)
  .join("\n");

const rules = [
  {
    test: () => /^frontend\/src\/mocks\//.test(rel),
    why: "src/mocks 는 직접 수정 금지다 (CLAUDE.md · FRONTEND_GUIDE). 화면 검증용 Mock 은 읽기만 한다.",
  },
  {
    // .env · .env.local · .env.production · .env.test.local … 전부. .env.example 만 통과한다
    test: () => /^\.env($|\.)/.test(base) && !/\.example$/.test(base),
    why: ".env 계열은 커밋 금지·수정 금지다. 신규 변수는 .env.example 에 적는다.",
  },
  {
    test: () => /^frontend\//.test(rel) && /\.(ts|tsx)$/.test(base),
    why: "프론트는 TypeScript 를 쓰지 않는다. .js · .jsx 로 작성한다 (CLAUDE.md · FRONTEND_GUIDE).",
  },
  {
    // ⚠ @relation 을 막지 않는다. 이 레포는 relationMode = "prisma" 라 @relation 이 DDL 을 만들지
    // 않는다 — 지금 스키마에 53개가 정상적으로 들어 있다. 외래키를 실제로 켜는 것은 relationMode 다.
    test: () =>
      /^backend\/prisma\/schema\.prisma$/.test(rel) &&
      /relationMode\s*=\s*"(?!prisma")/.test(written),
    why: 'relationMode 는 "prisma" 로 고정이다. 외래키를 만들지 않고 참조 무결성은 백엔드 코드가 지킨다 (SCHEMA_DESIGN · BACKEND_GUIDE).',
  },
  {
    // 마이그레이션 SQL 이 외래키를 만드는 두 번째 경로다
    test: () =>
      /^backend\/prisma\/migrations\/.+\.sql$/.test(rel) &&
      /\bFOREIGN\s+KEY\b|\bREFERENCES\s+"/i.test(written),
    why: "마이그레이션에 외래키를 넣지 않는다. 참조 무결성은 백엔드 책임이고 integrity.e2e-spec 이 검증한다 (SCHEMA_DESIGN 2-3).",
  },
];

for (const r of rules) {
  if (r.test()) {
    process.stderr.write(`[guard-paths] 차단: ${rel}\n${r.why}\n`);
    process.exit(2);
  }
}
process.exit(0);
