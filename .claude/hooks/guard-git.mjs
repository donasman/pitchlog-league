// PreToolUse 훅 — Bash 직전에 git 명령을 검사한다.
// 막는 것: dev · main 직접 커밋, dev · main 직접 push, Bash 로 우회하는 보호 경로 쓰기.
// 종료 코드 2 = 차단. stderr 가 에이전트에게 이유로 전달된다.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const cmd = String(input?.tool_input?.command ?? "");
if (!cmd) process.exit(0);
const cwd = input?.cwd ?? process.cwd();

function block(msg) {
  process.stderr.write(`[guard-git] 차단\n${msg}\n`);
  process.exit(2);
}

function currentBranch() {
  const r = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "";
}

// 1. dev · main 에서 직접 커밋
if (/\bgit\s+commit\b/.test(cmd)) {
  const b = currentBranch();
  if (b === "dev" || b === "main") {
    block(`현재 브랜치가 ${b} 다. dev · main 은 직접 커밋 금지 — feature/ · fix/ · chore/ 브랜치를 먼저 만든다.`);
  }
}

// 2. dev · main 으로 직접 push
if (/\bgit\s+push\b[^\n;&|]*\b(origin\s+)?(dev|main)\b/.test(cmd) && !/--delete/.test(cmd)) {
  block("dev · main 으로 직접 push 하지 않는다. feature 브랜치를 push 하고 PR 을 낸다.");
}

// 3. Bash 로 보호 경로에 쓰기 (휴리스틱 — sed -i · 리다이렉션 · tee · cp · mv)
const writes = /(\bsed\s+-i|>{1,2}\s*|\btee\b|\bcp\b|\bmv\b|\brm\b)/;
const protectedPath = /(frontend\/src\/mocks\/|(^|[\s/])\.env(\.local)?\b(?!\.example))/;
if (writes.test(cmd) && protectedPath.test(cmd)) {
  block("src/mocks 와 .env 는 Bash 로도 쓰지 않는다. 읽기(cat · grep) 만 허용.");
}

process.exit(0);
