// PreToolUse 훅 — Write · Edit · MultiEdit 직전에 경로를 검사한다.
// 막는 것: CLAUDE.md 의 "절대 수정 금지" 경로. 에이전트가 누구든 상관없이 기계적으로 막는다.
// 종료 코드 2 = 차단. stderr 가 에이전트에게 이유로 전달된다.
import { readFileSync } from "node:fs";
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
const rel = path.relative(cwd, path.resolve(cwd, raw)).split(path.sep).join("/");
const base = path.basename(rel);

const rules = [
  {
    test: () => /^frontend\/src\/mocks\//.test(rel),
    why: "src/mocks 는 직접 수정 금지다 (CLAUDE.md · FRONTEND_GUIDE). 화면 검증용 Mock 은 읽기만 한다.",
  },
  {
    test: () => /^\.env(\.local|\..+\.local)?$/.test(base),
    why: ".env / .env.local 은 커밋 금지·수정 금지다. 신규 변수는 .env.example 에 적는다.",
  },
  {
    test: () => /^frontend\//.test(rel) && /\.(ts|tsx)$/.test(base),
    why: "프론트는 TypeScript 를 쓰지 않는다. .js · .jsx 로 작성한다 (CLAUDE.md · FRONTEND_GUIDE).",
  },
  {
    test: () => /^backend\/prisma\/schema\.prisma$/.test(rel) && /@relation\s*\(/.test(String(input?.tool_input?.new_string ?? input?.tool_input?.content ?? "")),
    why: "외래키를 쓰지 않는다. @relation 을 추가하지 말고 참조 무결성은 백엔드 코드에서 지킨다 (BACKEND_GUIDE · SCHEMA_DESIGN).",
  },
];

for (const r of rules) {
  if (r.test()) {
    process.stderr.write(`[guard-paths] 차단: ${rel}\n${r.why}\n`);
    process.exit(2);
  }
}
process.exit(0);
